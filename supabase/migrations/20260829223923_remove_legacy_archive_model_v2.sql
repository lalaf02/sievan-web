-- Update timestamps on simplified tables.
create trigger trg_artworks_updated before update on public.artworks for each row execute function private.set_updated_at();
create trigger trg_articles_updated before update on public.articles for each row execute function private.set_updated_at();
create trigger trg_interviews_updated before update on public.interviews for each row execute function private.set_updated_at();
create trigger trg_people_updated before update on public.people for each row execute function private.set_updated_at();
create trigger trg_artwork_mentions_updated before update on public.artwork_mentions for each row execute function private.set_updated_at();

-- Replace media public policy before removing its now-redundant publication_status column.
drop policy if exists anon_read_published_media_assets on public.media_assets;
create policy anon_read_linked_published_media on public.media_assets
for select to anon
using (
  (artwork_id is not null and exists (select 1 from public.artworks a where a.id = artwork_id and a.publication_status = 'published'))
  or (article_id is not null and exists (select 1 from public.articles a where a.id = article_id and a.publication_status = 'published'))
  or (interview_id is not null and exists (select 1 from public.interviews i where i.id = interview_id and i.publication_status = 'published'))
);

-- Drop old media join policies that reference media_assets.publication_status; their tables are removed below.
drop policy if exists anon_read_archive_object_media on public.archive_object_media;
drop policy if exists anon_read_painting_media on public.painting_media;
drop policy if exists anon_read_video_asset_media on public.video_asset_media;

-- Simplify media_assets while preserving populated technical metadata.
alter table public.media_assets rename column technical_metadata to metadata;
alter table public.media_assets alter column metadata set default '{}'::jsonb;
update public.media_assets set metadata = '{}'::jsonb where metadata is null;
alter table public.media_assets alter column metadata set not null;

alter table public.media_assets
  drop column width_px,
  drop column height_px,
  drop column duration_seconds,
  drop column page_number,
  drop column checksum_sha256,
  drop column photographer_credit,
  drop column source_credit,
  drop column publication_status;

-- Obsolete projections.
drop view if exists public.search_documents;
drop view if exists public.period_contents;
drop view if exists public.unresolved_storage_links;

-- Remove the old institutional/staging/inference model.
drop table if exists public.archive_object_artworks cascade;
drop table if exists public.archive_object_media cascade;
drop table if exists public.archive_object_person_relations cascade;
drop table if exists public.archive_object_place_relations cascade;
drop table if exists public.attested_work_painting_matches cascade;
drop table if exists public.attested_work_relationships cascade;
drop table if exists public.attested_works cascade;
drop table if exists public.commentary_paintings cascade;
drop table if exists public.commentary_relations cascade;
drop table if exists public.commentary cascade;
drop table if exists public.curated_quotes cascade;
drop table if exists public.derived_article_exhibition_matches cascade;
drop table if exists public.derived_attested_title_matches cascade;
drop table if exists public.derived_person_mentions cascade;
drop table if exists public.painting_exhibitions cascade;
drop table if exists public.painting_historical_context cascade;
drop table if exists public.painting_media cascade;
drop table if exists public.painting_revisions cascade;
drop table if exists public.scholarship_paintings cascade;
drop table if exists public.scholarship cascade;
drop table if exists public.transcript_pages cascade;
drop table if exists public.transcripts cascade;
drop table if exists public.video_asset_media cascade;
drop table if exists public.video_assets cascade;
drop table if exists public.historical_events cascade;
drop table if exists public.exhibitions cascade;
drop table if exists public.publications cascade;
drop table if exists public.person_aliases cascade;
drop table if exists public.persons cascade;
drop table if exists public.places cascade;
drop table if exists public.periods cascade;
drop table if exists public.collections cascade;
drop table if exists public.import_runs cascade;
drop table if exists public.source_import_records cascade;
drop table if exists public.validation_issues cascade;
drop table if exists public.archive_objects cascade;
drop table if exists public.paintings cascade;
drop table if exists public.media_archive_object_candidates cascade;
drop table if exists public.media_video_transcript_candidates cascade;
drop table if exists public."Master Art Archive" cascade;
drop table if exists public."Master Reviews, Media and Publications" cascade;

-- Remove helper functions that existed only for deleted tables.
drop function if exists private.capture_painting_revision();
drop function if exists private.resolve_archive_media_after_insert();
drop function if exists private.resolve_archive_media_candidates_for(text);
drop function if exists private.validate_archive_object_artwork_type();

-- Lightweight indexes for the surviving model.
create index if not exists artworks_type_idx on public.artworks(artwork_type);
create index if not exists artworks_archive_id_idx on public.artworks(archive_id) where archive_id is not null;
create index if not exists articles_archive_id_idx on public.articles(archive_id) where archive_id is not null;
create index if not exists media_assets_bucket_path_idx on public.media_assets(storage_bucket, storage_path);
