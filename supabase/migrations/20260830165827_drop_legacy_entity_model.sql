-- Retire the 17 tables the seven-table core replaced.
--
-- Run only after the proof: `npm run data` rebuilt the bundle from the new views and
-- scripts/check-parity.mjs reported no difference of any kind against the pre-migration
-- baseline -- every entity row and all 23 derived indexes -- and all 265 exported pages
-- came out byte-identical once the nondeterministic Next build id was normalised.
--
-- Dropped in dependency order and WITHOUT cascade, deliberately. Cascade would silently
-- remove anything still pointing at these tables; an error is the answer we want if
-- something unexpected still does.
--
-- Four tables survive that the seven-table proposal would have deleted -- collections,
-- publications, places and profiles -- because the site renders the first three and the
-- fourth carries the curator role that every RLS policy calls through private.is_curator().

-- children first
drop table public.archive_object_scans;
drop table public.attested_work_places;
drop table public.video_media_files;
drop table public.transcript_texts;
drop table public.commentary_relations;
drop table public.commentary;
drop table public.painting_historical_context;
drop table public.painting_exhibitions;
drop table public.scholarship;

-- then the records that referenced them
drop table public.news_articles;
drop table public.attested_works;
drop table public.archive_objects;
drop table public.video_assets;

-- then the hubs
drop table public.paintings;
drop table public.historical_events;
drop table public.exhibitions;
drop table public.persons;

-- The public domain is now twelve tables: the seven-table core
--   artworks · artwork_mentions · articles · interviews · media_assets · people · events
-- the join table the core needs
--   artwork_mention_places
-- the three authority tables the archive renders
--   collections · publications · places
-- and profiles, which is auth rather than domain.
do $check$
declare n int; leftovers text;
begin
  select count(*), string_agg(tablename, ', ' order by tablename)
    into n, leftovers
  from pg_tables where schemaname = 'public';
  if n <> 12 then
    raise exception 'expected 12 public tables after the migration, found %: %', n, leftovers;
  end if;
  raise notice 'public schema is now 12 tables: %', leftovers;
end $check$;
