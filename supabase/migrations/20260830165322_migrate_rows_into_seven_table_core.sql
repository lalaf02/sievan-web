-- Move every row of the entity model into the seven-table core. Nothing is dropped here
-- either; the old tables are still the ones the api.v_* views read until the next
-- migration. Every insert is followed by an assertion, because a migration that loses
-- records silently is the failure this whole sequence is arranged to prevent.

-- ---------------------------------------------------------------- people <- persons
insert into public.people (id, display_name, aliases, roles, notes, sort_order, created_at, updated_at)
select id, name, aliases, roles, notes, sort_order, created_at, updated_at
from public.persons;

-- ---------------------------------------------------------------- artworks
-- The 25 sheets the estate holds. `artwork_medium_stated is not null` is what promoted a
-- row into the catalogue, and it sits on the 25 work_on_paper rows and nothing else.
--
-- object_type is NOT carried across: it is 'work_on_paper' on all 25 by construction, and
-- api.v_archive_objects emits the literal. That turns an invariant the build used to check
-- into one the schema cannot violate.
insert into public.artworks (
  id, archive_id, artwork_type,
  date_display, year_start, year_end,
  medium, support, signed_text, sheet_count,
  catalogue_status, publication_status, raw_description,
  collection_id, seq, folder_no, copies_count,
  object_medium, object_medium_raw, condition, digital_record_id, stated_item_count,
  sort_order, created_at, updated_at)
select o.id, o.id, 'drawing',
       o.date_text, o.date_earliest, o.date_latest,
       o.artwork_medium_stated, o.artwork_support, o.artwork_signed, o.artwork_sheet_count,
       'catalogued', 'published', o.raw_title_description,
       o.collection_id, o.seq, o.folder_no, o.copies_count,
       o.medium, o.medium_raw, o.condition, o.digital_record_id, o.stated_item_count,
       o.sort_order, o.created_at, o.updated_at
from public.archive_objects o
where o.artwork_medium_stated is not null;

-- `paintings` is empty and this is the merge the proposal asks for: a catalogued painting
-- becomes an artwork row typed 'painting'. Written out rather than skipped so the path is
-- exercised the day the catalogue arrives.
insert into public.artworks (
  id, artwork_type, title, date_display, year_start, year_end,
  medium, dimensions_text, current_location, image_ref,
  catalogue_status, publication_status, notes, sort_order, created_at, updated_at)
select p.id, 'painting', p.title, p.date_text, p.date_earliest, p.date_latest,
       p.medium, p.dimensions, p.current_location, p.image_ref,
       p.catalog_status, 'published', p.notes, p.sort_order, p.created_at, p.updated_at
from public.paintings p;

-- ---------------------------------------------------------------- events <- exhibitions
-- Before articles, because a clipping's event_id points here.
insert into public.events (
  id, event_type, name, venue_name, venue_city, venue_place_id,
  start_date, end_date, date_earliest, date_latest,
  exhibition_type, confidence, source_archive_object_ids, source_article_ids,
  notes, sort_order, created_at, updated_at)
select e.id, 'exhibition', e.name, e.gallery_or_venue, e.venue_city, e.venue_place_id,
       e.start_date, e.end_date, e.date_earliest, e.date_latest,
       e.exhibition_type, e.confidence, e.source_archive_object_ids, e.source_article_ids,
       e.notes, e.sort_order, e.created_at, e.updated_at
from public.exhibitions e;

insert into public.events (
  id, event_type, name, date_display, date_earliest, date_latest,
  category, description, source_refs, notes, sort_order, created_at, updated_at)
select h.id, 'historical_context', h.title, h.date_text, h.date_earliest, h.date_latest,
       h.category, h.description, h.source_refs, h.notes, h.sort_order, h.created_at, h.updated_at
from public.historical_events h;

-- ---------------------------------------------------------------- articles: containers
-- The 51 archive objects that are documents rather than art. Inserted before the clippings
-- because parent_article_id points at them.
insert into public.articles (
  id, archive_id, article_type, raw_description,
  date_text, date_earliest, date_latest,
  collection_id, seq, folder_no, copies_count,
  object_medium, object_medium_raw, condition, digital_record_id, stated_item_count,
  publication_status, sort_order, created_at, updated_at)
select o.id, o.id, o.object_type, o.raw_title_description,
       o.date_text, o.date_earliest, o.date_latest,
       o.collection_id, o.seq, o.folder_no, o.copies_count,
       o.medium, o.medium_raw, o.condition, o.digital_record_id, o.stated_item_count,
       'published', o.sort_order, o.created_at, o.updated_at
from public.archive_objects o
where o.artwork_medium_stated is null;

-- ---------------------------------------------------------------- articles: clippings
insert into public.articles (
  id, archive_id, article_type, parent_article_id,
  title, raw_description,
  publication_id, publication_raw, author_person_id, author_raw,
  date_text, date_normalized, date_earliest, date_latest, date_uncertain,
  event_id, parse_confidence, continuation_joined,
  review_status, reviewer, reviewed_at, publication_status,
  notes, sort_order, created_at, updated_at)
select a.id, a.id, 'press_notice', a.archive_object_id,
       a.headline, a.raw_source_text,
       a.publication_id, a.publication_raw, a.author_person_id, a.author_raw,
       a.date_text, a.date_normalized, a.date_earliest, a.date_latest, a.date_uncertain,
       a.exhibition_id, a.parse_confidence, a.continuation_joined,
       a.review_status, a.reviewer, a.reviewed_at, 'published',
       a.notes, a.sort_order, a.created_at, a.updated_at
from public.news_articles a;

-- ---------------------------------------------------------------- interviews
-- transcript_texts.source_file and video_assets.transcript_text_file are the same string on
-- all 5 rows (verified), so folding the side table in loses nothing. transcript_source_file
-- is a DIFFERENT fact -- the scanned PDF the text was read off -- and keeps its own column.
insert into public.interviews (
  id, archive_id, collection_id, subject_type, subject_person_ids, title,
  physical_tape_no, interview_date, date_text, date_earliest, date_latest,
  location, duration_seconds,
  transcript_text, transcript_source_file, transcript_text_file,
  transcript_word_count, transcript_page_count,
  topics, review_status, publication_status, notes, sort_order, created_at, updated_at)
select v.id, v.id, v.collection_id, v.subject_type, v.subject_person_ids, v.title,
       v.physical_tape_no, v.interview_date, v.date_text, v.date_earliest, v.date_latest,
       v.location, v.duration_seconds,
       t.text, v.transcript_source_file, v.transcript_text_file,
       v.transcript_word_count, v.transcript_page_count,
       v.topics, v.review_status, 'published', v.notes, v.sort_order, v.created_at, v.updated_at
from public.video_assets v
left join public.transcript_texts t on t.video_id = v.id;

-- ---------------------------------------------------------------- artwork_mentions
-- All 57 have source_type = 'archive_object' and all 57 sources are among the 25 sheets
-- (verified), so every one lands on source_artwork_id. The other two source columns exist
-- for the day a mention is found in a press notice or an interview.
--
-- identification_status is DERIVED, not invented: a mention with no painting_id is
-- 'unresolved', which is exactly what a null artwork_id already meant.
insert into public.artwork_mentions (
  id, source_artwork_id, source_article_id, source_interview_id,
  source_page, sheet_position, quote,
  title_as_written, artist_number, dimensions_as_written, medium_as_written,
  date_as_written, date_earliest, date_latest, date_uncertain, date_basis,
  price_as_written, price_usd, dispositions, buyer_as_written, counterparty_person_id,
  artwork_id, identification_basis, identification_status,
  review_status, notes, sort_order, created_at, updated_at)
select w.id,
       case when w.source_type = 'archive_object'  then w.source_id end,
       case when w.source_type = 'news_article'    then w.source_id end,
       case when w.source_type = 'video_asset'     then w.source_id end,
       w.source_page, w.sheet_position, w.quote,
       w.title_stated, w.artist_number, w.dimensions_stated, w.medium_stated,
       w.date_text, w.date_earliest, w.date_latest, w.date_uncertain, w.date_basis,
       w.price_stated, w.price_usd, w.dispositions, w.counterparty_raw, w.counterparty_person_id,
       w.painting_id, w.identification_basis,
       case when w.painting_id is null then 'unresolved' else 'identified' end,
       w.review_status, w.notes, w.sort_order, w.created_at, w.updated_at
from public.attested_works w;

insert into public.artwork_mention_places (artwork_mention_id, ordinal, place_id, role, certain)
select attested_work_id, ordinal, place_id, role, certain
from public.attested_work_places;

-- ---------------------------------------------------------------- media_assets: scans
-- bucket and path come from a JOIN against storage.objects, not from a string built by
-- hand: all 56 resolve (verified), so every row registers a file that demonstrably exists.
-- Size and mime type come from the same row, so the registry agrees with Storage by
-- construction rather than by assertion.
insert into public.media_assets (
  asset_type, storage_bucket, storage_path, filename, ordinal, part_label,
  mime_type, file_size_bytes, provenance_type, artwork_id, article_id)
select 'archive_scan',
       'archive-scans',
       ob.name,
       s.filename, s.ordinal, s.part_label,
       ob.metadata->>'mimetype',
       (ob.metadata->>'size')::bigint,
       'estate_scan',
       case when o.artwork_medium_stated is not null then o.id end,
       case when o.artwork_medium_stated is null     then o.id end
from public.archive_object_scans s
join public.archive_objects o on o.id = s.archive_object_id
left join storage.objects ob
  on ob.bucket_id = (select id from storage.buckets where name = 'archive-scans')
 and ob.name = o.collection_id || '/' || s.filename;

-- ---------------------------------------------------------------- media_assets: video
-- The masters are 25 GB on the curator's own disk and are in no bucket, so bucket and path
-- stay null and the offline location goes in local_path. provenance_type is left null
-- rather than forced into a category that does not describe a video master.
insert into public.media_assets (
  asset_type, filename, ordinal, variant, local_path, file_size_bytes, interview_id)
select 'video_master', m.filename, m.ordinal, m.variant, m.path, m.size_bytes, m.video_id
from public.video_media_files m;

-- ---------------------------------------------------------------- reconciliation
-- Assert, in the same transaction, that nothing was lost. A raise here rolls the whole
-- migration back.
do $verify$
declare
  n_people    int; n_artworks int; n_paintings int; n_articles_c int; n_articles_p int;
  n_events    int; n_interviews int; n_transcripts int;
  n_mentions  int; n_mention_places int; n_scans int; n_video int; n_linked int;
begin
  select count(*) into n_people          from public.people;
  select count(*) into n_artworks        from public.artworks where artwork_type = 'drawing';
  select count(*) into n_paintings       from public.artworks where artwork_type = 'painting';
  select count(*) into n_articles_c      from public.articles where article_type <> 'press_notice';
  select count(*) into n_articles_p      from public.articles where article_type =  'press_notice';
  select count(*) into n_events          from public.events;
  select count(*) into n_interviews      from public.interviews;
  select count(*) into n_transcripts     from public.interviews where transcript_text is not null;
  select count(*) into n_mentions        from public.artwork_mentions;
  select count(*) into n_mention_places  from public.artwork_mention_places;
  select count(*) into n_scans           from public.media_assets where asset_type = 'archive_scan';
  select count(*) into n_video           from public.media_assets where asset_type = 'video_master';
  select count(*) into n_linked          from public.media_assets
                                         where storage_bucket is not null and storage_path is not null;

  if n_people        <> (select count(*) from public.persons)              then raise exception 'people: % <> persons', n_people; end if;
  if n_artworks      <> (select count(*) from public.archive_objects where artwork_medium_stated is not null) then raise exception 'artworks(drawing): %', n_artworks; end if;
  if n_paintings     <> (select count(*) from public.paintings)            then raise exception 'artworks(painting): %', n_paintings; end if;
  if n_articles_c    <> (select count(*) from public.archive_objects where artwork_medium_stated is null)     then raise exception 'articles(container): %', n_articles_c; end if;
  if n_articles_p    <> (select count(*) from public.news_articles)        then raise exception 'articles(notice): %', n_articles_p; end if;
  if n_events        <> (select count(*) from public.exhibitions) + (select count(*) from public.historical_events) then raise exception 'events: %', n_events; end if;
  if n_interviews    <> (select count(*) from public.video_assets)         then raise exception 'interviews: %', n_interviews; end if;
  if n_transcripts   <> (select count(*) from public.transcript_texts)     then raise exception 'transcripts: %', n_transcripts; end if;
  if n_mentions      <> (select count(*) from public.attested_works)       then raise exception 'mentions: %', n_mentions; end if;
  if n_mention_places<> (select count(*) from public.attested_work_places) then raise exception 'mention_places: %', n_mention_places; end if;
  if n_scans         <> (select count(*) from public.archive_object_scans) then raise exception 'scans: %', n_scans; end if;
  if n_video         <> (select count(*) from public.video_media_files)    then raise exception 'video files: %', n_video; end if;
  if n_linked        <> n_scans then raise exception 'only % of % scans resolved to a Storage object', n_linked, n_scans; end if;

  raise notice 'migrated: % people, % drawings, % paintings, % containers, % notices, % events, % interviews (% transcripts), % mentions, % place refs, % media (% linked to Storage)',
    n_people, n_artworks, n_paintings, n_articles_c, n_articles_p, n_events,
    n_interviews, n_transcripts, n_mentions, n_mention_places, n_scans + n_video, n_linked;
end $verify$;
