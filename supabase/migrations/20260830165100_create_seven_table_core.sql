-- The seven-table core: artworks, artwork_mentions, articles, interviews, media_assets,
-- people, events. Created ALONGSIDE the entity model of 2026-08-30; nothing is dropped
-- here. Rows move in the next migration, the api.v_* views swap in the one after that, and
-- the legacy tables go only once scripts/check-parity.mjs proves the emitted bundle is
-- byte-for-byte what it was.
--
-- Four authority tables are deliberately NOT folded in: publications, places, collections
-- and attested_work_places (which becomes artwork_mention_places below). The seven-table
-- proposal has nowhere to put them, and the site renders all four -- /places/* is 26 pages,
-- /archive/publications/* is 31, /archive/ groups by collection, and the 37 role-typed
-- place rows are evidence. Simplification is not licence to delete records.

-- ---------------------------------------------------------------- people
-- The one authority table the proposal keeps, and rightly: people recur across interviews,
-- press, exhibitions and the biography. Created first because articles and artwork_mentions
-- both key on it.
create table public.people (
  id           text primary key,
  display_name text not null,
  given_name   text,
  family_name  text,
  birth_year   integer,
  death_year   integer,

  aliases text[] not null default '{}',
  -- Multi-valued: a person can be both an interview subject and a cited critic. Rendered
  -- on /people/, so it is not decoration.
  roles   text[] not null default '{}'
          check (roles <@ array['critic','journalist','gallery_owner','curator','artist',
                                'interview_subject','historical_figure','family','other']::text[]),

  biography  text,
  notes      text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- artworks
-- One catalogue table for physical works of art, holding what used to be split across
-- `paintings` and the 25 `work_on_paper` rows of `archive_objects`.
--
-- artwork_type PARTITIONS this table and that is load-bearing: api.v_paintings reads
-- 'painting' and api.v_archive_objects reads 'drawing', so counts.paintings stays 0 while
-- counts.worksOnPaperCatalogued is 25. The two are never summed, and keeping them in one
-- table must not make summing them easy.
create table public.artworks (
  id           text primary key check (id ~ '^MS-(AR|PA)-[0-9]{5}$'),
  -- The accession number when the estate holds the object itself. Null for a painting
  -- known only from a catalogue plate.
  archive_id   text unique,
  artwork_type text not null check (artwork_type in ('painting', 'drawing')),

  title            text,
  title_as_written text,

  date_display text,
  year_start   integer,
  year_end     integer,
  date_basis   text check (date_basis in ('stated_on_source', 'inferred')),

  -- The medium of the WORK. Distinct from object_medium below, which records whether the
  -- sheet the archive holds is an original or a photocopy. Collapsing the two would read a
  -- photocopy as a medium.
  medium           text,
  support          text,
  dimensions_text  text,
  signed_text      text,
  inscription      text,
  sheet_count      integer,
  current_location text,
  image_ref        text,

  catalogue_status   text not null default 'uncatalogued'
                     check (catalogue_status in ('uncatalogued', 'catalogued', 'verified')),
  publication_status text not null default 'draft'
                     check (publication_status in ('draft', 'review', 'published', 'withdrawn')),

  -- The manifest's own wording, unedited. Rendered in mono on the record page as the
  -- archive's promise that the reader can tell transcription from description.
  raw_description text,

  -- Where the object sits in the physical archive. Internal shelving: no box or folder
  -- identifier ever reaches user-facing text.
  collection_id     text references public.collections(id),
  seq               integer,
  folder_no         text,
  copies_count      integer,
  object_medium     text check (object_medium in ('photocopy', 'original', 'other')),
  object_medium_raw text,
  condition         text,
  digital_record_id text,
  stated_item_count integer,

  notes      text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (year_end is null or year_start is null or year_end >= year_start),
  -- A work the estate holds is a drawing on a sheet with an accession number; a row typed
  -- 'drawing' without one would vanish from /archive/objects/ with no error anywhere.
  check (artwork_type <> 'drawing' or archive_id is not null)
);

-- ---------------------------------------------------------------- articles
-- Every textual and documentary record: the 51 physical objects that are documents rather
-- than art, and the 60 clippings inside them.
--
-- parent_article_id carries the containment that archive_objects.id -> news_articles held.
-- Verified before the move: 0 of the 60 clippings sit inside an artwork object, so the 76
-- archive objects split 25/51 with no ambiguity.
create table public.articles (
  id         text primary key check (id ~ '^MS-(AR|SC|CM)-[0-9]{5}(-[A-Z])?$'),
  archive_id text unique,

  -- The container types are the manifest's own object_type vocabulary, not a new one.
  -- 'press_notice' marks a clipping; the rest mark the thing that holds it.
  article_type text not null check (article_type in (
    'press_notice', 'news_clipping_bundle', 'single_article', 'exhibition_catalog',
    'exhibition_poster', 'promotional_material', 'book', 'review', 'essay',
    'catalogue', 'scholarship', 'commentary', 'other')),

  parent_article_id text references public.articles(id),

  title            text,
  title_as_written text,

  -- The verbatim wording, whichever level this row is: the manifest's description for a
  -- container, the clipping's own transcribed source line for a notice.
  raw_description text not null,

  -- The publication and author authorities survive as foreign keys, not as flat text:
  -- derived.articlesByPublication and derived.articlesByAuthor are built from them, and
  -- publications.aliases is what folds thirty mastheads onto one record.
  publication_id   text references public.publications(id),
  publication_raw  text,
  author_person_id text references public.people(id),
  author_raw       text,

  date_text       text,
  date_normalized public.partial_date,
  date_earliest   integer,
  date_latest     integer,
  date_uncertain  boolean not null default false,
  page_reference  text,

  -- Wired to events at the bottom of this migration, once that table exists.
  event_id text,

  citation_text text,

  -- Container-only facts, carried over from archive_objects.
  collection_id     text references public.collections(id),
  seq               integer,
  folder_no         text,
  copies_count      integer,
  object_medium     text check (object_medium in ('photocopy', 'original', 'other')),
  object_medium_raw text,
  condition         text,
  digital_record_id text,
  stated_item_count integer,

  parse_confidence    text check (parse_confidence in ('high', 'medium', 'low')),
  continuation_joined boolean not null default false,
  review_status       public.review_status,
  reviewer            text,
  reviewed_at         text,
  publication_status  text not null default 'draft'
                      check (publication_status in ('draft', 'review', 'published', 'withdrawn')),

  notes      text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A clipping is always inside something; a container never is.
  check ((article_type = 'press_notice') = (parent_article_id is not null))
);

-- ---------------------------------------------------------------- interviews
-- The recorded oral-history sources: video_assets with the transcript folded in as text
-- rather than kept in a one-row-per-video side table.
create table public.interviews (
  id            text primary key check (id ~ '^MS-VI-[0-9]{5}$'),
  archive_id    text unique,
  collection_id text not null references public.collections(id),

  subject_type       text not null check (subject_type in ('interview', 'process_footage', 'other')),
  subject_person_ids text[] not null default '{}',
  interviewer_text   text,

  title            text not null,
  physical_tape_no text,
  interview_date   public.partial_date,
  date_text        text,
  date_earliest    integer,
  date_latest      integer,
  location         text,
  duration_seconds integer,

  description text,
  -- The transcript verbatim. build-data.mjs parses it into pages and paragraphs; the
  -- page and word counts beside it are the curator's record of the physical typescript.
  transcript_text        text,
  transcript_source_file text,
  transcript_text_file   text,
  transcript_word_count  integer,
  transcript_page_count  integer,

  -- Empty on all 7. There is no topic vocabulary in this archive, and "related by topic"
  -- must not be faked from keyword overlap.
  topics text[] not null default '{}',

  review_status      text not null check (review_status in ('catalogued_only', 'transcribed', 'content_tagged')),
  publication_status text not null default 'draft'
                     check (publication_status in ('draft', 'review', 'published', 'withdrawn')),

  notes      text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- events
create table public.events (
  id         text primary key,
  event_type text not null check (event_type in (
    'exhibition', 'retrospective', 'award', 'historical_context', 'other')),

  -- Nullable, against the seven-table proposal's `title not null`: several of these shows
  -- are known only by their venue and year. Inventing a title to satisfy a constraint is
  -- the one thing this archive does not do.
  name           text,
  venue_name     text,
  venue_city     text,
  venue_place_id text references public.places(id),
  place_text     text,

  start_date    public.partial_date,
  end_date      public.partial_date,
  date_display  text,
  date_earliest integer,
  date_latest   integer,

  exhibition_type text check (exhibition_type in ('solo', 'group', 'unknown')),
  category        text check (category in ('art_world', 'world_history', 'personal_biography', 'other')),
  confidence      text check (confidence in ('confirmed', 'inferred')),

  source_archive_object_ids text[] not null default '{}',
  source_article_ids        text[] not null default '{}',
  source_refs               text[] not null default '{}',

  description text,
  notes       text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.articles
  add constraint articles_event_id_fkey foreign key (event_id) references public.events(id);

-- ---------------------------------------------------------------- artwork_mentions
-- Evidence that a source NAMES a work, which is not the same as the archive holding it.
-- The whole point of the table: artwork_id stays null until research establishes which
-- catalogued work a mention is, and the verbatim quote it rests on never changes.
--
-- id stays text on the MS-AW-##### pattern rather than becoming a bigint identity: these
-- ids are public deep-link anchors (/works/attested/#MS-AW-00044) and canonical archive
-- identifiers must survive the migration.
create table public.artwork_mentions (
  id text primary key check (id ~ '^MS-AW-[0-9]{5}$'),

  -- What the mention appears ON. Exactly one, replacing the old polymorphic
  -- source_type/source_id pair with real foreign keys.
  source_artwork_id   text references public.artworks(id),
  source_article_id   text references public.articles(id),
  source_interview_id text references public.interviews(id),
  source_page         integer check (source_page is null or source_page >= 1),
  sheet_position      text,

  quote text not null check (length(quote) >= 4),

  title_as_written      text,
  normalized_title      text,
  artist_number         text,
  dimensions_as_written text,
  medium_as_written     text,

  date_as_written text,
  date_earliest   integer,
  date_latest     integer,
  date_uncertain  boolean,
  date_basis      text check (date_basis in ('stated_on_source', 'inferred')),

  price_as_written text,
  price_usd        numeric,
  dispositions     text[] not null default '{}'
                   check (dispositions <@ array['sold','consigned','offered','returned',
                                                'retained','exhibited','donated']::text[]),
  buyer_as_written       text,
  counterparty_person_id text references public.people(id),

  -- The one-way bridge to the catalogue. Setting it requires saying how the
  -- identification was made; build-data.mjs enforces the pair.
  artwork_id            text references public.artworks(id),
  identification_basis  text check (identification_basis in (
                          'title_and_dimensions', 'artist_number', 'photograph', 'curator_judgement')),
  identification_status text not null default 'unresolved'
                        check (identification_status in (
                          'unresolved', 'possible', 'probable', 'identified', 'rejected')),

  review_status public.review_status,
  notes         text,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  check (num_nonnulls(source_artwork_id, source_article_id, source_interview_id) = 1)
);

-- The gazetteer link the seven-table proposal drops. 37 rows, each role-typed: a place a
-- work DEPICTS is not a place it was SHOWN. Flattening these to a text field loses the
-- role, and derived.attestationsByPlace is built from it.
create table public.artwork_mention_places (
  artwork_mention_id text not null references public.artwork_mentions(id) on delete cascade,
  ordinal            integer not null,
  place_id           text not null references public.places(id),
  role               text not null check (role in ('depicted', 'made_at', 'shown_at', 'held_at')),
  -- Null on 33 of 37 rows, and that is not the same as false: the source is silent, it
  -- does not disagree.
  certain            boolean,
  primary key (artwork_mention_id, ordinal)
);

-- ---------------------------------------------------------------- media_assets
-- The registry of files. Supabase Storage holds the bytes; this holds what the archive
-- knows about them.
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),

  asset_type text not null check (asset_type in (
    'archive_scan', 'scan_page', 'estate_photograph', 'printed_reproduction',
    'video_master', 'video_clip', 'poster_frame', 'transcript_document', 'other')),

  -- Nullable, against the proposal's `not null`. A scan is recorded by filename and its
  -- bucket prefix is derived at build time; the 12 video masters live in the curator's
  -- offline Video Archive and are in no bucket at all. A path invented to satisfy a
  -- constraint would be a fabricated record.
  storage_bucket text,
  storage_path   text,

  -- What the build actually addresses the file by.
  filename   text not null,
  ordinal    integer not null default 1,
  part_label text,
  variant    text check (variant in ('raw', 'edited', 'subtitled')),
  local_path text,

  mime_type        text,
  file_size_bytes  bigint,
  width_px         integer,
  height_px        integer,
  duration_seconds numeric,
  page_number      integer,
  checksum_sha256  text,

  -- A scan, a printed reproduction, an estate photograph and a video master are not
  -- interchangeable, and the site says which is which beside the image.
  provenance_type     text check (provenance_type in (
                        'estate_photograph', 'estate_scan', 'printed_reproduction',
                        'third_party', 'unknown')),
  photographer_credit text,
  source_credit       text,

  artwork_id   text references public.artworks(id) on delete cascade,
  article_id   text references public.articles(id) on delete cascade,
  interview_id text references public.interviews(id) on delete cascade,

  technical_metadata jsonb not null default '{}'::jsonb,
  notes              text,
  created_at         timestamptz not null default now(),

  check (num_nonnulls(artwork_id, article_id, interview_id) <= 1)
);

-- Partial, because bucket and path are legitimately null for the offline masters. A real
-- Storage object still cannot be registered twice.
create unique index media_assets_storage_key
  on public.media_assets (storage_bucket, storage_path)
  where storage_bucket is not null and storage_path is not null;

-- ---------------------------------------------------------------- security
-- Same posture as the entity model: there is NO anonymous surface. The published site is
-- static HTML built ahead of time and never queries this database, so `anon` is granted
-- nothing. The proposal's "anonymous readers can access only published material" would be
-- a weaker rule than the one already in force.
do $rls$
declare t text;
begin
  foreach t in array array[
    'artworks','artwork_mentions','artwork_mention_places','articles',
    'interviews','media_assets','people','events'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('create policy %I on public.%I for all to authenticated '
                   'using (private.is_curator()) with check (private.is_curator())',
                   t || '_curator_all', t);
  end loop;
end $rls$;

-- Only the parent tables get the touch trigger; the child tables were deliberately
-- stripped of it on 2026-08-30.
do $touch$
declare t text;
begin
  foreach t in array array[
    'artworks','artwork_mentions','articles','interviews','people','events'
  ]
  loop
    execute format('create trigger %I before update on public.%I '
                   'for each row execute function public.touch_updated_at()',
                   t || '_touch', t);
  end loop;
end $touch$;

create index on public.artworks               (collection_id);
create index on public.artworks               (artwork_type);
create index on public.articles               (parent_article_id);
create index on public.articles               (article_type);
create index on public.articles               (publication_id);
create index on public.articles               (author_person_id);
create index on public.articles               (collection_id);
create index on public.articles               (event_id);
create index on public.artwork_mentions       (source_artwork_id);
create index on public.artwork_mentions       (source_article_id);
create index on public.artwork_mentions       (source_interview_id);
create index on public.artwork_mentions       (artwork_id);
create index on public.artwork_mention_places (place_id);
create index on public.media_assets           (artwork_id);
create index on public.media_assets           (article_id);
create index on public.media_assets           (interview_id);
create index on public.events                 (venue_place_id);
create index on public.interviews             (collection_id);
