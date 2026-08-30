create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;

create table if not exists public.collections (
  id text primary key,
  title text not null,
  public_description text,
  internal_description text,
  sort_order integer,
  publication_status text not null default 'draft' check (publication_status in ('draft','review','published','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.archive_objects (
  id text primary key check (id ~ '^MS-AR-[0-9]{5}$'),
  collection_id text not null references public.collections(id),
  object_type text not null,
  raw_title_description text not null,
  display_title text,
  date_start_year integer,
  date_end_year integer,
  date_precision text,
  date_basis text,
  date_display text,
  creator_text text,
  notes text,
  internal_note text,
  public_note text,
  digitization_status text not null default 'unknown' check (digitization_status in ('unknown','digitized','not_digitized','intentionally_not_scanned','pending_digitization','unavailable')),
  digitization_note text,
  publication_status text not null default 'draft' check (publication_status in ('draft','review','published','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  check (date_end_year is null or date_start_year is null or date_end_year >= date_start_year)
);

create table if not exists public.archive_object_artworks (
  archive_object_id text primary key references public.archive_objects(id) on delete cascade,
  title text not null,
  medium text,
  support text,
  width_value numeric,
  height_value numeric,
  dimensions_unit text default 'in',
  signed_text text,
  inscription text,
  date_start_year integer,
  date_end_year integer,
  date_basis text,
  catalogue_notes text,
  check (width_value is null or width_value > 0),
  check (height_value is null or height_value > 0),
  check (date_end_year is null or date_start_year is null or date_end_year >= date_start_year)
);

create table if not exists public.paintings (
  id text primary key check (id ~ '^MS-PA-[0-9]{5}$'),
  title text not null,
  alternate_titles text[],
  date_start_year integer,
  date_end_year integer,
  date_precision text,
  date_basis text,
  date_display text,
  medium text,
  support text,
  width_value numeric,
  height_value numeric,
  dimensions_unit text,
  signed_text text,
  current_location text,
  catalogue_status text not null default 'research' check (catalogue_status in ('research','confirmed','attributed','possible','rejected')),
  notes text,
  internal_note text,
  public_note text,
  publication_status text not null default 'draft' check (publication_status in ('draft','review','published','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  check (width_value is null or width_value > 0),
  check (height_value is null or height_value > 0),
  check (date_end_year is null or date_start_year is null or date_end_year >= date_start_year)
);

create table if not exists public.persons (
  id text primary key,
  display_name text not null,
  given_name text,
  family_name text,
  birth_year integer,
  death_year integer,
  biography text,
  notes text,
  publication_status text not null default 'draft' check (publication_status in ('draft','review','published','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.person_aliases (
  id bigint generated always as identity primary key,
  person_id text not null references public.persons(id) on delete cascade,
  alias text not null,
  unique(person_id, alias)
);

create table if not exists public.places (
  id text primary key,
  name text not null,
  place_type text,
  parent_id text references public.places(id),
  latitude numeric,
  longitude numeric,
  coordinate_basis text,
  notes text,
  publication_status text not null default 'draft' check (publication_status in ('draft','review','published','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (latitude is null or latitude between -90 and 90),
  check (longitude is null or longitude between -180 and 180),
  check ((latitude is null) = (longitude is null)),
  check (parent_id is null or parent_id <> id)
);

create table if not exists public.publications (
  id text primary key,
  title text not null,
  publisher text,
  publication_date_start_year integer,
  publication_date_end_year integer,
  date_precision text,
  publication_type text,
  place_id text references public.places(id),
  citation_text text,
  notes text,
  publication_status text not null default 'draft' check (publication_status in ('draft','review','published','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (publication_date_end_year is null or publication_date_start_year is null or publication_date_end_year >= publication_date_start_year)
);

create table if not exists public.exhibitions (
  id text primary key,
  title text not null,
  venue_name text,
  place_id text references public.places(id),
  start_year integer,
  end_year integer,
  date_precision text,
  description text,
  notes text,
  publication_status text not null default 'draft' check (publication_status in ('draft','review','published','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_year is null or start_year is null or end_year >= start_year)
);

create table if not exists public.news_articles (
  id text primary key,
  archive_object_id text references public.archive_objects(id),
  publication_id text references public.publications(id),
  headline text,
  byline_text text,
  publication_date_start_year integer,
  publication_date_end_year integer,
  date_precision text,
  page_reference text,
  transcript_text text,
  notes text,
  publication_status text not null default 'draft' check (publication_status in ('draft','review','published','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (publication_date_end_year is null or publication_date_start_year is null or publication_date_end_year >= publication_date_start_year)
);

create table if not exists public.attested_works (
  id text primary key check (id ~ '^MS-AW-[0-9]{5}$'),
  source_archive_object_id text not null references public.archive_objects(id),
  title_as_written text not null,
  normalized_title text,
  verbatim_quote text not null,
  medium_as_written text,
  dimensions_as_written text,
  price_as_written text,
  buyer_as_written text,
  date_start_year integer,
  date_end_year integer,
  date_basis text,
  place_id text references public.places(id),
  notes text,
  publication_status text not null default 'draft' check (publication_status in ('draft','review','published','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (date_end_year is null or date_start_year is null or date_end_year >= date_start_year)
);

create table if not exists public.video_assets (
  id text primary key check (id ~ '^MS-VI-[0-9]{5}$'),
  title text not null,
  description text,
  recorded_start_year integer,
  recorded_end_year integer,
  date_precision text,
  duration_seconds numeric,
  notes text,
  publication_status text not null default 'draft' check (publication_status in ('draft','review','published','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (duration_seconds is null or duration_seconds >= 0),
  check (recorded_end_year is null or recorded_start_year is null or recorded_end_year >= recorded_start_year)
);

create table if not exists public.commentary (
  id text primary key,
  title text,
  author_person_id text references public.persons(id),
  body text not null,
  publication_id text references public.publications(id),
  publication_year integer,
  notes text,
  publication_status text not null default 'draft' check (publication_status in ('draft','review','published','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scholarship (
  id text primary key,
  title text not null,
  author_text text,
  publication_year integer,
  publication_id text references public.publications(id),
  citation text,
  url text,
  notes text,
  publication_status text not null default 'draft' check (publication_status in ('draft','review','published','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.historical_events (
  id text primary key,
  title text not null,
  description text,
  start_year integer,
  end_year integer,
  date_precision text,
  source_note text,
  publication_status text not null default 'draft' check (publication_status in ('draft','review','published','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_year is null or start_year is null or end_year >= start_year)
);

create table if not exists public.periods (
  id text primary key,
  title text not null,
  start_year integer not null,
  end_year integer not null,
  sort_order integer not null,
  source_note text not null,
  publication_status text not null default 'draft' check (publication_status in ('draft','review','published','withdrawn')),
  check (end_year >= start_year)
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  asset_type text not null check (asset_type in ('archive_pdf','archive_page_image','artwork_photo','catalogue_reproduction','video_master','video_clip','video_poster','transcript_source','retrospective_page','other')),
  storage_bucket text not null,
  storage_path text not null,
  mime_type text,
  file_size_bytes bigint,
  width_px integer,
  height_px integer,
  duration_seconds numeric,
  page_number integer,
  checksum_sha256 text,
  provenance_type text check (provenance_type is null or provenance_type in ('estate_photography','printed_reproduction','archive_scan','video_archive','unknown','other')),
  photographer_credit text,
  source_credit text,
  technical_metadata jsonb,
  publication_status text not null default 'draft' check (publication_status in ('draft','review','published','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(storage_bucket, storage_path),
  check (file_size_bytes is null or file_size_bytes >= 0),
  check (width_px is null or width_px > 0),
  check (height_px is null or height_px > 0),
  check (duration_seconds is null or duration_seconds >= 0),
  check (page_number is null or page_number > 0)
);

create table if not exists public.archive_object_media (
  archive_object_id text references public.archive_objects(id) on delete cascade,
  media_asset_id uuid references public.media_assets(id) on delete cascade,
  role text not null,
  sort_order integer,
  primary key (archive_object_id, media_asset_id, role)
);

create table if not exists public.painting_media (
  painting_id text references public.paintings(id) on delete cascade,
  media_asset_id uuid references public.media_assets(id) on delete cascade,
  role text not null,
  sort_order integer,
  primary key (painting_id, media_asset_id, role)
);

create table if not exists public.video_asset_media (
  video_asset_id text references public.video_assets(id) on delete cascade,
  media_asset_id uuid references public.media_assets(id) on delete cascade,
  role text not null,
  sort_order integer,
  primary key (video_asset_id, media_asset_id, role)
);

create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  archive_object_id text references public.archive_objects(id),
  video_asset_id text references public.video_assets(id),
  transcript_type text not null,
  full_text text,
  publication_status text not null default 'draft' check (publication_status in ('draft','review','published','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(archive_object_id, video_asset_id) = 1)
);

create table if not exists public.transcript_pages (
  id uuid primary key default gen_random_uuid(),
  transcript_id uuid not null references public.transcripts(id) on delete cascade,
  page_number integer not null check (page_number > 0),
  text text not null,
  unique(transcript_id, page_number)
);

create table if not exists public.curated_quotes (
  id text primary key,
  quote_text text not null,
  transcript_page_id uuid not null references public.transcript_pages(id),
  anchor_text text not null,
  display_context text,
  sort_order integer,
  publication_status text not null default 'draft' check (publication_status in ('draft','review','published','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attested_work_painting_matches (
  attested_work_id text references public.attested_works(id) on delete cascade,
  painting_id text references public.paintings(id) on delete cascade,
  relationship_status text not null check (relationship_status in ('confirmed','probable','possible','rejected')),
  evidence_note text,
  determined_by text,
  determined_at timestamptz,
  primary key (attested_work_id, painting_id)
);

create table if not exists public.attested_work_relationships (
  source_attested_work_id text references public.attested_works(id) on delete cascade,
  target_attested_work_id text references public.attested_works(id) on delete cascade,
  relationship_type text not null,
  status text not null default 'research',
  rationale text,
  created_at timestamptz not null default now(),
  primary key (source_attested_work_id, target_attested_work_id, relationship_type),
  check (source_attested_work_id <> target_attested_work_id)
);

create table if not exists public.archive_object_person_relations (
  archive_object_id text references public.archive_objects(id) on delete cascade,
  person_id text references public.persons(id) on delete cascade,
  relation_type text not null,
  evidence_basis text,
  notes text,
  primary key (archive_object_id, person_id, relation_type)
);

create table if not exists public.archive_object_place_relations (
  archive_object_id text references public.archive_objects(id) on delete cascade,
  place_id text references public.places(id) on delete cascade,
  relation_type text not null,
  evidence_basis text,
  notes text,
  primary key (archive_object_id, place_id, relation_type)
);

create table if not exists public.painting_exhibitions (
  painting_id text references public.paintings(id) on delete cascade,
  exhibition_id text references public.exhibitions(id) on delete cascade,
  catalogue_number text,
  evidence_archive_object_id text references public.archive_objects(id),
  evidence_note text,
  primary key (painting_id, exhibition_id)
);

create table if not exists public.painting_historical_context (
  painting_id text references public.paintings(id) on delete cascade,
  historical_event_id text references public.historical_events(id) on delete cascade,
  relation_note text,
  primary key (painting_id, historical_event_id)
);

create table if not exists public.commentary_paintings (
  commentary_id text references public.commentary(id) on delete cascade,
  painting_id text references public.paintings(id) on delete cascade,
  primary key (commentary_id, painting_id)
);

create table if not exists public.commentary_relations (
  source_commentary_id text references public.commentary(id) on delete cascade,
  target_commentary_id text references public.commentary(id) on delete cascade,
  relation_type text not null,
  notes text,
  primary key (source_commentary_id, target_commentary_id, relation_type),
  check (source_commentary_id <> target_commentary_id)
);

create table if not exists public.scholarship_paintings (
  scholarship_id text references public.scholarship(id) on delete cascade,
  painting_id text references public.paintings(id) on delete cascade,
  primary key (scholarship_id, painting_id)
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'curator' check (role in ('curator','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.import_runs (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_checksum text,
  started_at timestamptz not null,
  completed_at timestamptz,
  imported_count integer,
  skipped_count integer,
  error_count integer,
  importer_version text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.source_import_records (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid not null references public.import_runs(id) on delete cascade,
  source_name text not null,
  source_row_identifier text,
  raw_payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.validation_issues (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  severity text not null check (severity in ('info','warning','error')),
  rule_code text not null,
  message text not null,
  validation_details jsonb,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.derived_person_mentions (
  archive_object_id text not null references public.archive_objects(id) on delete cascade,
  person_id text not null references public.persons(id) on delete cascade,
  method text not null,
  algorithm_version text not null,
  explanation text,
  generated_at timestamptz not null default now(),
  primary key (archive_object_id, person_id, method, algorithm_version)
);

create table if not exists public.derived_article_exhibition_matches (
  article_id text not null references public.news_articles(id) on delete cascade,
  exhibition_id text not null references public.exhibitions(id) on delete cascade,
  matched_token text,
  score numeric,
  method text not null default 'venue_token_year_match',
  algorithm_version text not null,
  explanation text,
  generated_at timestamptz not null default now(),
  primary key (article_id, exhibition_id, method, algorithm_version)
);

create table if not exists public.derived_attested_title_matches (
  source_attested_work_id text not null references public.attested_works(id) on delete cascade,
  target_attested_work_id text not null references public.attested_works(id) on delete cascade,
  score numeric,
  method text not null,
  algorithm_version text not null,
  explanation text,
  generated_at timestamptz not null default now(),
  primary key (source_attested_work_id, target_attested_work_id, method, algorithm_version),
  check (source_attested_work_id <> target_attested_work_id)
);

create table if not exists public.painting_revisions (
  id bigint generated always as identity primary key,
  painting_id text not null references public.paintings(id) on delete cascade,
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users(id),
  operation text not null check (operation in ('insert','update','delete')),
  old_record jsonb,
  new_record jsonb
);

create or replace function private.set_updated_at()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.validate_archive_object_artwork_type()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
declare v_type text;
begin
  select object_type into v_type from public.archive_objects where id = new.archive_object_id;
  if v_type is distinct from 'work_on_paper' then
    raise exception 'archive_object_artworks requires archive_objects.object_type = work_on_paper';
  end if;
  return new;
end;
$$;

create or replace function private.capture_painting_revision()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    insert into public.painting_revisions(painting_id, changed_by, operation, new_record)
    values (new.id, auth.uid(), 'insert', to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.painting_revisions(painting_id, changed_by, operation, old_record, new_record)
    values (new.id, auth.uid(), 'update', to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into public.painting_revisions(painting_id, changed_by, operation, old_record)
    values (old.id, auth.uid(), 'delete', to_jsonb(old));
    return old;
  end if;
end;
$$;

create trigger trg_archive_object_artworks_type before insert or update on public.archive_object_artworks for each row execute function private.validate_archive_object_artwork_type();
create trigger trg_painting_revisions after insert or update or delete on public.paintings for each row execute function private.capture_painting_revision();

create trigger trg_collections_updated before update on public.collections for each row execute function private.set_updated_at();
create trigger trg_archive_objects_updated before update on public.archive_objects for each row execute function private.set_updated_at();
create trigger trg_paintings_updated before update on public.paintings for each row execute function private.set_updated_at();
create trigger trg_persons_updated before update on public.persons for each row execute function private.set_updated_at();
create trigger trg_places_updated before update on public.places for each row execute function private.set_updated_at();
create trigger trg_publications_updated before update on public.publications for each row execute function private.set_updated_at();
create trigger trg_exhibitions_updated before update on public.exhibitions for each row execute function private.set_updated_at();
create trigger trg_news_articles_updated before update on public.news_articles for each row execute function private.set_updated_at();
create trigger trg_attested_works_updated before update on public.attested_works for each row execute function private.set_updated_at();
create trigger trg_video_assets_updated before update on public.video_assets for each row execute function private.set_updated_at();
create trigger trg_commentary_updated before update on public.commentary for each row execute function private.set_updated_at();
create trigger trg_scholarship_updated before update on public.scholarship for each row execute function private.set_updated_at();
create trigger trg_historical_events_updated before update on public.historical_events for each row execute function private.set_updated_at();
create trigger trg_media_assets_updated before update on public.media_assets for each row execute function private.set_updated_at();
create trigger trg_transcripts_updated before update on public.transcripts for each row execute function private.set_updated_at();
create trigger trg_curated_quotes_updated before update on public.curated_quotes for each row execute function private.set_updated_at();
create trigger trg_profiles_updated before update on public.profiles for each row execute function private.set_updated_at();

create index if not exists archive_objects_collection_idx on public.archive_objects(collection_id);
create index if not exists archive_objects_type_idx on public.archive_objects(object_type);
create index if not exists attested_works_source_idx on public.attested_works(source_archive_object_id);
create index if not exists attested_works_normalized_title_idx on public.attested_works(normalized_title);
create index if not exists news_articles_publication_idx on public.news_articles(publication_id);
create index if not exists exhibitions_place_idx on public.exhibitions(place_id);
create index if not exists media_assets_storage_idx on public.media_assets(storage_bucket, storage_path);
create index if not exists validation_issues_open_idx on public.validation_issues(resolved_at) where resolved_at is null;
