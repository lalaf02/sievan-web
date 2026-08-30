-- Simplified Sievan model: artworks, articles, interviews, people, artwork_mentions, media_assets.

create table public.people (
  id text primary key,
  display_name text not null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.artworks (
  id text primary key,
  archive_id text unique,
  artwork_type text not null check (artwork_type in ('painting','drawing')),
  title text,
  title_as_written text,
  date_text text,
  year_start integer,
  year_end integer,
  date_basis text,
  medium text,
  support text,
  dimensions_text text,
  signed_text text,
  inscription text,
  catalogue_status text not null default 'identified' check (catalogue_status in ('identified','research','confirmed','attributed','rejected')),
  publication_status text not null default 'draft' check (publication_status in ('draft','review','published','withdrawn')),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (year_end is null or year_start is null or year_end >= year_start)
);

create table public.articles (
  id text primary key,
  archive_id text unique,
  article_type text not null default 'unclassified',
  title text,
  author_text text,
  publication_text text,
  publication_date_text text,
  year_start integer,
  year_end integer,
  body_text text,
  citation_text text,
  notes text,
  publication_status text not null default 'draft' check (publication_status in ('draft','review','published','withdrawn')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (year_end is null or year_start is null or year_end >= year_start)
);

create table public.interviews (
  id text primary key,
  interviewee_id text references public.people(id),
  title text not null,
  recorded_date_text text,
  year_start integer,
  year_end integer,
  transcript_text text,
  notes text,
  publication_status text not null default 'draft' check (publication_status in ('draft','review','published','withdrawn')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (year_end is null or year_start is null or year_end >= year_start)
);

create table public.artwork_mentions (
  id uuid primary key default gen_random_uuid(),
  source_article_id text references public.articles(id) on delete cascade,
  source_media_id uuid references public.media_assets(id) on delete cascade,
  artwork_id text references public.artworks(id) on delete set null,
  title_as_written text not null,
  medium_as_written text,
  dimensions_as_written text,
  price_as_written text,
  buyer_as_written text,
  verbatim_quote text,
  status text not null default 'unresolved' check (status in ('unresolved','possible','identified','rejected')),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(source_article_id, source_media_id) >= 1)
);

-- Preserve curator access helper and apply a minimal RLS model.
alter table public.people enable row level security;
alter table public.artworks enable row level security;
alter table public.articles enable row level security;
alter table public.interviews enable row level security;
alter table public.artwork_mentions enable row level security;

grant select on public.people, public.artworks, public.articles, public.interviews, public.artwork_mentions to anon;
grant select, insert, update, delete on public.people, public.artworks, public.articles, public.interviews, public.artwork_mentions to authenticated;

create policy people_public_read on public.people for select to anon using (true);
create policy artworks_public_read on public.artworks for select to anon using (publication_status = 'published');
create policy articles_public_read on public.articles for select to anon using (publication_status = 'published');
create policy interviews_public_read on public.interviews for select to anon using (publication_status = 'published');
create policy artwork_mentions_public_read on public.artwork_mentions for select to anon using (
  exists (select 1 from public.articles a where a.id = source_article_id and a.publication_status = 'published')
);

create policy people_curator_all on public.people for all to authenticated using (private.is_curator()) with check (private.is_curator());
create policy artworks_curator_all on public.artworks for all to authenticated using (private.is_curator()) with check (private.is_curator());
create policy articles_curator_all on public.articles for all to authenticated using (private.is_curator()) with check (private.is_curator());
create policy interviews_curator_all on public.interviews for all to authenticated using (private.is_curator()) with check (private.is_curator());
create policy artwork_mentions_curator_all on public.artwork_mentions for all to authenticated using (private.is_curator()) with check (private.is_curator());

-- Seed 25 drawing records from the strongly typed Artwork bucket.
insert into public.artworks (id, archive_id, artwork_type, catalogue_status, metadata)
select distinct
  c.proposed_archive_object_id,
  c.proposed_archive_object_id,
  'drawing',
  'identified',
  jsonb_build_object('derived_from_storage_bucket','Artwork','match_method',c.match_method,'confidence',c.confidence)
from public.media_archive_object_candidates c
join public.media_assets m on m.id = c.media_asset_id
where m.storage_bucket = 'Artwork'
on conflict (id) do nothing;

-- Seed 30 broad article/archive-document records from MS-CS-001 without inventing titles.
insert into public.articles (id, archive_id, article_type, metadata)
select distinct
  c.proposed_archive_object_id,
  c.proposed_archive_object_id,
  'unclassified',
  jsonb_build_object('derived_from_storage_bucket','Articles and Media','collection_path','MS-CS-001','match_method',c.match_method,'confidence',c.confidence)
from public.media_archive_object_candidates c
join public.media_assets m on m.id = c.media_asset_id
where m.storage_bucket = 'Articles and Media'
  and m.storage_path like 'MS-CS-001/%'
on conflict (id) do nothing;

-- Seed people and interview records from named transcript paths.
insert into public.people (id, display_name)
select distinct lower(regexp_replace(interviewee_name, '[^a-zA-Z0-9]+', '-', 'g')), interviewee_name
from public.media_video_transcript_candidates
on conflict (id) do nothing;

insert into public.interviews (id, interviewee_id, title, metadata)
select distinct
  'interview-' || lower(regexp_replace(interviewee_name, '[^a-zA-Z0-9]+', '-', 'g')),
  lower(regexp_replace(interviewee_name, '[^a-zA-Z0-9]+', '-', 'g')),
  proposed_video_title,
  jsonb_build_object('match_method',match_method,'confidence',confidence)
from public.media_video_transcript_candidates
on conflict (id) do nothing;

-- Link each existing media asset directly to one primary content record.
alter table public.media_assets
  add column artwork_id text references public.artworks(id) on delete set null,
  add column article_id text references public.articles(id) on delete set null,
  add column interview_id text references public.interviews(id) on delete set null,
  add column media_role text,
  add constraint media_assets_single_primary_owner check (num_nonnulls(artwork_id, article_id, interview_id) <= 1);

update public.media_assets m
set artwork_id = c.proposed_archive_object_id,
    media_role = 'source_scan'
from public.media_archive_object_candidates c
where c.media_asset_id = m.id
  and m.storage_bucket = 'Artwork';

update public.media_assets m
set article_id = c.proposed_archive_object_id,
    media_role = 'source_scan'
from public.media_archive_object_candidates c
where c.media_asset_id = m.id
  and m.storage_bucket = 'Articles and Media'
  and m.storage_path like 'MS-CS-001/%';

update public.media_assets m
set interview_id = 'interview-' || lower(regexp_replace(c.interviewee_name, '[^a-zA-Z0-9]+', '-', 'g')),
    media_role = 'transcript'
from public.media_video_transcript_candidates c
where c.media_asset_id = m.id;

create index media_assets_artwork_id_idx on public.media_assets(artwork_id) where artwork_id is not null;
create index media_assets_article_id_idx on public.media_assets(article_id) where article_id is not null;
create index media_assets_interview_id_idx on public.media_assets(interview_id) where interview_id is not null;
create index interviews_interviewee_id_idx on public.interviews(interviewee_id);
create index artwork_mentions_artwork_id_idx on public.artwork_mentions(artwork_id) where artwork_id is not null;
create index artwork_mentions_source_article_id_idx on public.artwork_mentions(source_article_id) where source_article_id is not null;
create index artwork_mentions_source_media_id_idx on public.artwork_mentions(source_media_id) where source_media_id is not null;
