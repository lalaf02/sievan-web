-- The Sievan archive's entity model, mirroring schema/data_model.schema.json 1:1.
--
-- Replaces the simplified six-table model of 2026-08-29, which collapsed ArchiveObject,
-- AttestedWork and Painting into one `artworks` table with artwork_type in
-- (painting, drawing). That distinction is load-bearing: an attested work is a painting a
-- source NAMES, evidence toward a catalogue that does not yet exist, and it must never
-- share an id space or a row count with a work the archive holds.
--
-- Conventions, all deliberate and all documented in CLAUDE.md:
--   · ids are text primary keys carrying the JSON Schema's own patterns. collections is
--     MS-(CS|VA)-### with THREE digits; everything the archive holds is five. Authority
--     terms (persons, publications, exhibitions) are free slugs; places is a slug pattern.
--   · enums are CHECK constraints, not Postgres ENUM types - cheaper to alter as boxes
--     arrive, and ajv already enforces the same vocabulary at build time.
--   · partial dates are text with a precision-preserving CHECK, never `date`. "1941" and
--     "1941-03-08" are different claims and lib/dates.ts is built on the difference.
--   · plain string and id arrays are text[], which preserves order natively. Only arrays
--     of OBJECTS get child tables.
--   · verbatim columns are never normalised, and several are text where a number looks
--     natural: folder_no holds "4,5", artist_number holds "#180".


-- ---------------------------------------------------------------- drop the old model
-- media_assets is dropped with them: its foreign keys point at the discarded tables, and
-- the entity model below carries the filenames itself. profiles and private.is_curator()
-- survive - they are the curator's auth path, not part of the archive.
drop table if exists public.artwork_mentions cascade;
drop table if exists public.media_assets   cascade;
drop table if exists public.interviews     cascade;
drop table if exists public.artworks       cascade;
drop table if exists public.articles       cascade;
drop table if exists public.people         cascade;

-- ---------------------------------------------------------------- shared constraints
-- ISO-8601 truncated to whatever precision the source supports: YYYY, YYYY-MM, YYYY-MM-DD.
create domain public.partial_date as text
  check (value is null or value ~ '^[0-9]{4}(-[0-9]{2}(-[0-9]{2})?)?$');

-- Curatorial review state. Records produced by heuristic parsing must never ship as
-- reviewed_confirmed.
create domain public.review_status as text
  check (value in ('unreviewed', 'needs_review', 'reviewed_confirmed', 'reviewed_corrected'));

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- ---------------------------------------------------------------- collections
create table public.collections (
  id            text primary key check (id ~ '^MS-(CS|VA)-[0-9]{3}$'),
  label_raw     text not null,
  material_type text not null check (material_type in ('paper_archive','video_archive','mixed')),
  location      text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------- publications
create table public.publications (
  id         text primary key,
  name       text not null,
  aliases    text[] not null default '{}',
  type       text check (type in ('newspaper','magazine','other','unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- persons
create table public.persons (
  id         text primary key,
  name       text not null,
  aliases    text[] not null default '{}',
  -- Multi-valued: a person can be both an interview subject and a cited critic.
  roles      text[] not null default '{}'
             check (roles <@ array['critic','journalist','gallery_owner','curator','artist',
                                   'interview_subject','historical_figure','family','other']::text[]),
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- places
-- A gazetteer of the towns, rivers, galleries and institutions the evidence names.
-- No coordinates and no map: "croton?", Sievan's own note, is not a thing you can pin.
create table public.places (
  id         text primary key check (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name       text not null,
  kind       text not null check (kind in ('settlement','neighbourhood','region','landmark',
                                           'waterway','venue','institution','country')),
  -- The containing place. Kay's -> Woodstock; Passedoit Gallery -> New York.
  -- Self-reference and longer cycles are rejected by scripts/check-data.mjs, which a
  -- foreign key cannot express.
  parent_id  text references public.places(id),
  region     text,
  -- Every spelling that occurs in a source, verbatim: "SOUTHHAMPTON", "ProvenceTown".
  aliases    text[] not null default '{}',
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint places_no_self_parent check (parent_id is null or parent_id <> id)
);

-- ---------------------------------------------------------------- exhibitions
create table public.exhibitions (
  id                        text primary key,
  name                      text,
  gallery_or_venue          text not null,
  venue_city                text,
  venue_place_id            text references public.places(id),
  start_date                public.partial_date,
  end_date                  public.partial_date,
  date_earliest             integer,
  date_latest               integer,
  exhibition_type           text check (exhibition_type in ('solo','group','unknown')),
  confidence                text not null check (confidence in ('confirmed','inferred')),
  source_archive_object_ids text[] not null default '{}',
  source_article_ids        text[] not null default '{}',
  notes                     text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- ---------------------------------------------------------------- paintings
-- The declared hub of the model, and deliberately empty: the archive holds no painting.
-- counts.paintings staying 0 is the archive's one honest statement of what it lacks.
create table public.paintings (
  id               text primary key check (id ~ '^MS-PA-[0-9]{5}$'),
  title            text,
  date_text        text,
  date_earliest    integer,
  date_latest      integer,
  medium           text,
  dimensions       text,
  current_location text,
  image_ref        text,
  catalog_status   text not null check (catalog_status in ('uncatalogued','catalogued','verified')),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------- archive_objects
create table public.archive_objects (
  id                    text primary key check (id ~ '^MS-AR-[0-9]{5}$'),
  collection_id         text not null references public.collections(id),
  seq                   integer,
  -- String, not integer: the manifest uses compound values such as "4,5".
  folder_no             text,
  -- Verbatim Title/Description cell including newlines. Source of truth for any re-parse.
  raw_title_description text not null,
  date_text             text,
  date_earliest         integer,
  date_latest           integer,
  copies_count          integer,
  medium                text check (medium in ('photocopy','original','other')),
  medium_raw            text,
  condition             text,
  digital_record_id     text,
  object_type           text not null check (object_type in ('news_clipping_bundle','single_article',
                          'exhibition_catalog','exhibition_poster','promotional_material','book',
                          'work_on_paper','other')),
  stated_item_count     integer,
  -- ArchiveObject.artwork, inlined. Its PRESENCE is what promotes a row from an archive
  -- object into a catalogue entry, so these four are a unit: a 1:0..1 child table would
  -- let a row exist with every half null and mean nothing. Deliberately carries no
  -- dimensions - none of these has been measured, and a field that is null everywhere
  -- invites a guess.
  artwork_medium_stated text,
  artwork_support       text,
  artwork_signed        text,
  artwork_sheet_count   integer,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- Only a work of art may carry artwork_*, and medium_stated/support are jointly required.
  constraint archive_objects_artwork_is_work_on_paper check (
    artwork_medium_stated is null or object_type = 'work_on_paper'),
  constraint archive_objects_artwork_complete check (
    (artwork_medium_stated is null and artwork_support is null)
    or (artwork_medium_stated is not null and artwork_support is not null))
);

-- Zero-to-many: MS-AR-00003 has two scans (I/II); box-1 rows 31-50 have none on disk, and
-- MS-AR-00076 is a retired folder the curator recorded as deliberately NOT scanned. Those
-- absences are content - the site states them - so never infer a row's existence from media.
create table public.archive_object_scans (
  archive_object_id text not null references public.archive_objects(id) on delete cascade,
  ordinal           integer not null,
  filename          text not null,
  part_label        text,
  primary key (archive_object_id, ordinal)
);

-- ---------------------------------------------------------------- news_articles
create table public.news_articles (
  id                  text primary key check (id ~ '^MS-AR-[0-9]{5}-[A-Z]$'),
  archive_object_id   text not null references public.archive_objects(id),
  -- Verbatim clipping line. Never discarded, so any parse can be redone or corrected.
  raw_source_text     text not null,
  publication_id      text references public.publications(id),
  publication_raw     text,
  headline            text,
  -- Null for initials-only bylines ("P.B.R.") - those stay in author_raw until a human
  -- attributes them.
  author_person_id    text references public.persons(id),
  author_raw          text,
  date_text           text,
  date_normalized     public.partial_date,
  date_earliest       integer,
  date_latest         integer,
  date_uncertain      boolean not null default false,
  -- Left null unless a human confirms which show the review covers. 0 of 60 today; the
  -- press-to-exhibition links the site shows are inferred at build time and labelled so.
  exhibition_id       text references public.exhibitions(id),
  parse_confidence    text not null check (parse_confidence in ('high','medium','low')),
  continuation_joined boolean not null default false,
  review_status       public.review_status not null,
  reviewer            text,
  reviewed_at         text,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------- attested_works
-- A painting a source NAMES. The archive holds the sheet, not the painting, so these are
-- evidence toward the catalogue and never entries in it: separate id space, separate URL
-- space, and counts that are never added to worksOnPaperCatalogued.
create table public.attested_works (
  id                     text primary key check (id ~ '^MS-AW-[0-9]{5}$'),
  -- Polymorphic, like commentary. Every row today is archive_object (the box-2 sheets),
  -- but a press notice or an interview naming a work is the same kind of claim and must
  -- not need a schema change. Referential integrity is checked by scripts/check-data.mjs.
  source_type            text not null check (source_type in ('archive_object','news_article','video_asset')),
  source_id              text not null,
  -- 1-indexed into the source's rasterised sheets, so the record links the exact image.
  source_page            integer check (source_page is null or source_page >= 1),
  sheet_position         text,
  -- VERBATIM, and gated: scripts/check-quotes.mjs fails the build unless this string
  -- occurs inside the source's own recorded text.
  quote                  text not null check (length(quote) >= 4),
  -- The title exactly as the source writes it, Sievan's spelling and casing included
  -- ("SOUTHAMPTON LANDSCAPE", "In my Naborhood"). Never normalise; never invent.
  title_stated           text,
  artist_number          text,
  -- Verbatim, unparsed: "20 x 24", "10 3/4 x 12". Deliberately NOT split into height and
  -- width - nothing on the sheet records which figure is which.
  dimensions_stated      text,
  medium_stated          text,
  date_text              text,
  date_earliest          integer,
  date_latest            integer,
  date_uncertain         boolean,
  date_basis             text check (date_basis in ('stated_on_source','inferred')),
  price_stated           text,
  price_usd              numeric,
  -- Empty means the source is SILENT, and there is deliberately no 'unknown' member.
  dispositions           text[] not null default '{}'
                         check (dispositions <@ array['sold','consigned','offered','returned',
                                                      'retained','exhibited','donated']::text[]),
  counterparty_raw       text,
  counterparty_person_id text references public.persons(id),
  painting_id            text references public.paintings(id),
  identification_basis   text check (identification_basis in ('title_and_dimensions','artist_number',
                                                              'photograph','curator_judgement')),
  review_status          public.review_status not null,
  notes                  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  -- Ported from scripts/build-data.mjs: an inferred year is shown on the record and
  -- labelled there, but only stated_on_source may reach the chronology, so a year with no
  -- basis is not a fact anyone can argue with.
  constraint attested_works_date_basis_required check (date_earliest is null or date_basis is not null),
  -- Record what made the match, so the match can be argued with.
  constraint attested_works_identification_basis_required check (painting_id is null or identification_basis is not null)
);

create table public.attested_work_places (
  attested_work_id text not null references public.attested_works(id) on delete cascade,
  ordinal          integer not null,
  place_id         text not null references public.places(id),
  role             text not null check (role in ('depicted','made_at','shown_at','held_at')),
  -- Null on 33 of 37 rows, where the source says nothing either way. Emitted only when set.
  certain          boolean,
  primary key (attested_work_id, ordinal)
);

-- ---------------------------------------------------------------- video_assets
create table public.video_assets (
  id                     text primary key check (id ~ '^MS-VI-[0-9]{5}$'),
  collection_id          text not null references public.collections(id),
  subject_type           text not null check (subject_type in ('interview','process_footage','other')),
  subject_person_ids     text[] not null default '{}',
  title                  text not null,
  physical_tape_no       text,
  interview_date         public.partial_date,
  date_text              text,
  date_earliest          integer,
  date_latest            integer,
  location               text,
  transcript_source_file text,
  transcript_text_file   text,
  transcript_word_count  integer,
  transcript_page_count  integer,
  duration_seconds       integer,
  topics                 text[] not null default '{}',
  -- A DIFFERENT vocabulary from public.review_status, deliberately: a video is catalogued,
  -- then transcribed, then tagged.
  review_status          text not null check (review_status in ('catalogued_only','transcribed','content_tagged')),
  notes                  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table public.video_media_files (
  video_id   text not null references public.video_assets(id) on delete cascade,
  ordinal    integer not null,
  filename   text not null,
  variant    text not null check (variant in ('raw','edited','subtitled')),
  path       text not null,
  size_bytes bigint,
  primary key (video_id, ordinal)
);

-- The interview transcripts, as the verbatim extracted plain text. Stored unparsed:
-- parseTranscript() in scripts/build-data.mjs carries documented knowledge about the
-- speaker column that PDF extraction dislocated to the end of each page and the ~100-char
-- hard wrap, and the text is the artifact.
create table public.transcript_texts (
  video_id    text primary key references public.video_assets(id) on delete cascade,
  source_file text,
  text        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- the dormant layer
-- Seven tables with no rows. Everything downstream of them is dormant, not broken:
-- components/Relations.tsx renders three sections that return null today for exactly this
-- reason. They are created so the shape survives the migration.
create table public.historical_events (
  id            text primary key check (id ~ '^MS-HE-[0-9]{5}$'),
  title         text not null,
  date_text     text,
  date_earliest integer,
  date_latest   integer,
  category      text not null check (category in ('art_world','world_history','personal_biography','other')),
  description   text,
  source_refs   text[] not null default '{}',
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.commentary (
  id                      text primary key check (id ~ '^MS-CM-[0-9]{5}$'),
  source_type             text not null check (source_type in ('news_article','video_asset')),
  source_id               text not null,
  commentator_person_id   text references public.persons(id),
  subject_scope           text not null check (subject_scope in ('specific_painting','painting_group',
                            'artist_biographical','general_context','other')),
  painting_ids            text[] not null default '{}',
  subject_person_id       text references public.persons(id),
  subject_description_raw text,
  commentary_type         text check (commentary_type in ('review','critique','biographical_anecdote',
                            'technical_note','historical_context','influence_note','other')),
  excerpt                 text,
  stance                  text check (stance in ('positive','negative','neutral','mixed')),
  confidence              text check (confidence in ('high','medium','low')),
  review_status           public.review_status not null,
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create table public.commentary_relations (
  id              text primary key,
  commentary_a_id text not null references public.commentary(id),
  commentary_b_id text not null references public.commentary(id),
  relation_type   text not null check (relation_type in ('corroborates','contradicts','responds_to',
                    'elaborates_on','references_same_event','other')),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.painting_historical_context (
  id                  text primary key,
  painting_id         text not null references public.paintings(id),
  historical_event_id text not null references public.historical_events(id),
  direction           text not null check (direction in ('event_shaped_painting','painting_shaped_event_or_society')),
  description         text,
  source_refs         text[] not null default '{}',
  confidence          text not null check (confidence in ('documented','inferred','speculative')),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.painting_exhibitions (
  id            text primary key,
  painting_id   text not null references public.paintings(id),
  exhibition_id text not null references public.exhibitions(id),
  confidence    text check (confidence in ('confirmed','inferred')),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.scholarship (
  id         text primary key check (id ~ '^MS-SC-[0-9]{5}$'),
  citation   text not null,
  kind       text not null check (kind in ('book','chapter','journal_article','thesis',
                                           'catalogue_essay','review','web','other')),
  authors    text[] not null default '{}',
  title      text,
  container  text,
  year       integer,
  url        text,
  doi        text,
  about      text[] not null default '{}',
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- row-level security
--
-- There is no anonymous surface. The published site is static HTML built ahead of time;
-- it never queries this database, so `anon` needs nothing and gets nothing. This replaces
-- the `anon_full_access` policies of 2026-08-30, which granted ALL with USING (true) -
-- anyone holding the publishable key could rewrite the archive.
--
-- Reads happen at build time with the secret key, which bypasses RLS as service_role.
-- Writes happen through the curator's authenticated session.

do $$
declare t text;
begin
  foreach t in array array[
    'collections','publications','persons','places','exhibitions','paintings',
    'archive_objects','archive_object_scans','news_articles','attested_works',
    'attested_work_places','video_assets','video_media_files','transcript_texts',
    'historical_events','commentary','commentary_relations',
    'painting_historical_context','painting_exhibitions','scholarship'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('create policy %I on public.%I for all to authenticated '
                   'using (private.is_curator()) with check (private.is_curator())',
                   t || '_curator_all', t);
    execute format('create trigger %I before update on public.%I '
                   'for each row execute function public.touch_updated_at()',
                   t || '_touch', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- indexes
-- The corpus is ~300 rows, so these serve the curator's editing views and the foreign
-- keys, not any query speed the site will ever need.
create index on public.archive_objects      (collection_id);
create index on public.archive_object_scans (archive_object_id);
create index on public.news_articles        (archive_object_id);
create index on public.news_articles        (publication_id);
create index on public.news_articles        (author_person_id);
create index on public.attested_works       (source_type, source_id);
create index on public.attested_work_places (place_id);
create index on public.places               (parent_id);
create index on public.exhibitions          (venue_place_id);
create index on public.video_media_files    (video_id);

