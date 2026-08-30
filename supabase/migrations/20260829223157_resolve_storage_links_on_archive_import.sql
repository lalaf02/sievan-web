create table if not exists public.media_video_transcript_candidates (
  media_asset_id uuid primary key references public.media_assets(id) on delete cascade,
  interviewee_name text not null,
  proposed_video_title text not null,
  match_method text not null default 'storage_path_video_archive',
  confidence numeric not null default 0.95 check (confidence between 0 and 1),
  status text not null default 'unresolved' check (status in ('unresolved','confirmed','rejected')),
  explanation text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id)
);

alter table public.media_video_transcript_candidates enable row level security;
revoke all on public.media_video_transcript_candidates from anon, authenticated;
grant select, insert, update, delete on public.media_video_transcript_candidates to authenticated;
create policy "curators manage video transcript candidates"
on public.media_video_transcript_candidates
for all to authenticated
using ((select private.is_curator()))
with check ((select private.is_curator()));

insert into public.media_video_transcript_candidates (
  media_asset_id, interviewee_name, proposed_video_title, explanation
)
select
  m.id,
  split_part(m.storage_path, '/', 2),
  split_part(m.storage_path, '/', 2) || ' interview',
  'The file is stored under Video Archive/<person>/ and is registered as transcript_source. No MS-VI identifier is inferred because Storage does not establish the catalogue video ID.'
from public.media_assets m
where m.storage_bucket = 'Articles and Media'
  and m.storage_path like 'Video Archive/%'
on conflict (media_asset_id) do update set
  interviewee_name = excluded.interviewee_name,
  proposed_video_title = excluded.proposed_video_title,
  explanation = excluded.explanation;

create or replace function private.resolve_archive_media_candidates_for(p_archive_object_id text)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  insert into public.archive_object_media (archive_object_id, media_asset_id, role, sort_order)
  select
    c.proposed_archive_object_id,
    c.media_asset_id,
    case when m.asset_type = 'archive_page_image' then 'source_scan' else 'source_scan' end,
    row_number() over (order by m.storage_path)::integer
  from public.media_archive_object_candidates c
  join public.media_assets m on m.id = c.media_asset_id
  where c.proposed_archive_object_id = p_archive_object_id
    and c.status <> 'rejected'
  on conflict do nothing;

  get diagnostics v_count = row_count;

  update public.media_archive_object_candidates c
  set status = 'confirmed', resolved_at = coalesce(c.resolved_at, now())
  where c.proposed_archive_object_id = p_archive_object_id
    and c.status = 'unresolved'
    and exists (select 1 from public.archive_objects ao where ao.id = p_archive_object_id);

  update public.archive_objects ao
  set digitization_status = 'digitized',
      digitization_note = coalesce(ao.digitization_note, 'Digital source linked from legacy Supabase Storage.')
  where ao.id = p_archive_object_id
    and exists (
      select 1 from public.archive_object_media aom
      where aom.archive_object_id = p_archive_object_id
    )
    and ao.digitization_status in ('unknown','pending_digitization','not_digitized');

  return v_count;
end;
$$;

create or replace function private.resolve_archive_media_after_insert()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  perform private.resolve_archive_media_candidates_for(new.id);
  return new;
end;
$$;

drop trigger if exists trg_resolve_archive_media_after_insert on public.archive_objects;
create trigger trg_resolve_archive_media_after_insert
after insert on public.archive_objects
for each row execute function private.resolve_archive_media_after_insert();

-- Resolve any archive objects that may already exist.
do $$
declare r record;
begin
  for r in select id from public.archive_objects loop
    perform private.resolve_archive_media_candidates_for(r.id);
  end loop;
end $$;
