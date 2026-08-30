create table if not exists public.media_archive_object_candidates (
  media_asset_id uuid primary key references public.media_assets(id) on delete cascade,
  proposed_archive_object_id text not null check (proposed_archive_object_id ~ '^MS-AR-[0-9]{5}$'),
  match_method text not null,
  confidence numeric not null check (confidence between 0 and 1),
  status text not null default 'unresolved' check (status in ('unresolved','confirmed','rejected')),
  explanation text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id)
);

create index if not exists media_archive_object_candidates_proposed_idx
  on public.media_archive_object_candidates(proposed_archive_object_id);

alter table public.media_archive_object_candidates enable row level security;
revoke all on public.media_archive_object_candidates from anon, authenticated;
grant select, insert, update, delete on public.media_archive_object_candidates to authenticated;

create policy "curators manage media archive candidates"
on public.media_archive_object_candidates
for all to authenticated
using ((select private.is_curator()))
with check ((select private.is_curator()));

insert into public.media_assets (
  asset_type,
  storage_bucket,
  storage_path,
  mime_type,
  file_size_bytes,
  provenance_type,
  technical_metadata,
  publication_status
)
select
  case
    when o.name like 'Video Archive/%' then 'transcript_source'
    when coalesce(o.metadata->>'mimetype','') like 'image/%' then 'archive_page_image'
    else 'archive_pdf'
  end as asset_type,
  o.bucket_id,
  o.name,
  o.metadata->>'mimetype',
  nullif(o.metadata->>'size','')::bigint,
  case when o.name like 'Video Archive/%' then 'video_archive' else 'archive_scan' end,
  jsonb_build_object(
    'storage_object_id', o.id,
    'storage_created_at', o.created_at,
    'storage_updated_at', o.updated_at,
    'storage_metadata', o.metadata,
    'legacy_bucket', true
  ),
  'draft'
from storage.objects o
where o.bucket_id in ('Artwork','Articles and Media')
on conflict (storage_bucket, storage_path)
do update set
  asset_type = excluded.asset_type,
  mime_type = excluded.mime_type,
  file_size_bytes = excluded.file_size_bytes,
  provenance_type = excluded.provenance_type,
  technical_metadata = excluded.technical_metadata,
  updated_at = now();

insert into public.media_archive_object_candidates (
  media_asset_id,
  proposed_archive_object_id,
  match_method,
  confidence,
  explanation
)
select
  m.id,
  'MS-AR-' || lpad((regexp_match(m.storage_path, 'MSAR([0-9]{5})'))[1], 5, '0'),
  'storage_path_accession_number',
  0.99,
  'The legacy Storage path contains an MSAR accession number. This is a deterministic filename-to-accession mapping, but remains a derived candidate until the corresponding archive object record is imported and validated.'
from public.media_assets m
where m.storage_bucket in ('Artwork','Articles and Media')
  and m.storage_path ~ 'MSAR[0-9]{5}'
on conflict (media_asset_id)
do update set
  proposed_archive_object_id = excluded.proposed_archive_object_id,
  match_method = excluded.match_method,
  confidence = excluded.confidence,
  explanation = excluded.explanation;

create or replace view public.unresolved_storage_links
with (security_invoker = true) as
select
  c.proposed_archive_object_id,
  c.status,
  c.confidence,
  c.match_method,
  m.id as media_asset_id,
  m.asset_type,
  m.storage_bucket,
  m.storage_path,
  m.mime_type,
  m.file_size_bytes,
  (ao.id is not null) as archive_object_exists,
  (aom.archive_object_id is not null) as linked_to_archive_object
from public.media_archive_object_candidates c
join public.media_assets m on m.id = c.media_asset_id
left join public.archive_objects ao on ao.id = c.proposed_archive_object_id
left join public.archive_object_media aom
  on aom.archive_object_id = c.proposed_archive_object_id
 and aom.media_asset_id = c.media_asset_id
where c.status = 'unresolved' or aom.archive_object_id is null;

grant select on public.unresolved_storage_links to authenticated;
