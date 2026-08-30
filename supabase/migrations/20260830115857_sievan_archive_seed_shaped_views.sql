-- Views that emit exactly the shape scripts/build-data.mjs already reads.
--
-- The build validates every row against schema/data_model.schema.json, which sets
-- additionalProperties:false on every entity. So each view lists its columns explicitly
-- and NEVER selects * from a base table: one leaked created_at fails ajv on all 302 rows.
--
-- Two shapes matter and both are easy to get wrong:
--   · jsonb_agg returns NULL for an empty set, but scan_files is REQUIRED and an empty
--     dispositions array means "the source is silent". Every array gets coalesce(...,'[]').
--   · place_refs[].certain is absent on 33 of 37 rows rather than false. jsonb_strip_nulls
--     drops it exactly where it is null, and place_id/role are never null so they survive.

create schema if not exists api;

-- ---------------------------------------------------------------- authority terms
create or replace view api.v_collections as
  select id, label_raw, material_type, location, notes from public.collections;

create or replace view api.v_publications as
  select id, name, to_jsonb(aliases) as aliases, type from public.publications;

create or replace view api.v_persons as
  select id, name, to_jsonb(aliases) as aliases, to_jsonb(roles) as roles, notes
  from public.persons;

create or replace view api.v_places as
  select id, name, kind, parent_id, region, to_jsonb(aliases) as aliases, notes
  from public.places;

create or replace view api.v_exhibitions as
  select id, name, gallery_or_venue, venue_city, venue_place_id,
         start_date::text, end_date::text, date_earliest, date_latest,
         exhibition_type, confidence,
         to_jsonb(source_archive_object_ids) as source_archive_object_ids,
         to_jsonb(source_article_ids)        as source_article_ids,
         notes
  from public.exhibitions;

create or replace view api.v_paintings as
  select id, title, date_text, date_earliest, date_latest, medium, dimensions,
         current_location, image_ref, catalog_status, notes
  from public.paintings;

-- ---------------------------------------------------------------- archive objects
-- article_ids is NOT stored: it is the redundant inverse of news_articles.archive_object_id,
-- and check-data.mjs existed only to police that the two agreed. Rebuilding it here removes
-- that whole class of drift. Order by id reproduces the seed's own A, B, C ordering.
create or replace view api.v_archive_objects as
  select o.id, o.collection_id, o.seq, o.folder_no, o.raw_title_description,
         o.date_text, o.date_earliest, o.date_latest, o.copies_count, o.medium,
         o.medium_raw, o.condition, o.digital_record_id, o.object_type, o.stated_item_count,
         coalesce((select jsonb_agg(jsonb_build_object(
                            'filename', s.filename, 'part_label', s.part_label)
                          order by s.ordinal)
                   from public.archive_object_scans s
                   where s.archive_object_id = o.id), '[]'::jsonb) as scan_files,
         coalesce((select jsonb_agg(a.id order by a.id)
                   from public.news_articles a
                   where a.archive_object_id = o.id), '[]'::jsonb) as article_ids,
         -- Presence is the semantic signal: null here means "a document about the art",
         -- an object means "a work of art the archive holds".
         case when o.artwork_medium_stated is null then null
              else jsonb_build_object(
                'medium_stated', o.artwork_medium_stated,
                'support',       o.artwork_support,
                'signed',        o.artwork_signed,
                'sheet_count',   o.artwork_sheet_count)
         end as artwork
  from public.archive_objects o;

create or replace view api.v_news_articles as
  select id, archive_object_id, raw_source_text, publication_id, publication_raw,
         headline, author_person_id, author_raw, date_text,
         date_normalized::text, date_earliest, date_latest, date_uncertain,
         exhibition_id, parse_confidence, continuation_joined, review_status::text,
         reviewer, reviewed_at, notes
  from public.news_articles;

-- ---------------------------------------------------------------- attested works
create or replace view api.v_attested_works as
  select w.id, w.source_type, w.source_id, w.source_page, w.sheet_position, w.quote,
         w.title_stated, w.artist_number, w.dimensions_stated, w.medium_stated,
         w.date_text, w.date_earliest, w.date_latest, w.date_uncertain, w.date_basis,
         w.price_stated, w.price_usd,
         to_jsonb(w.dispositions) as dispositions,
         w.counterparty_raw, w.counterparty_person_id,
         coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                            'place_id', p.place_id, 'role', p.role, 'certain', p.certain))
                          order by p.ordinal)
                   from public.attested_work_places p
                   where p.attested_work_id = w.id), '[]'::jsonb) as place_refs,
         w.painting_id, w.identification_basis, w.review_status::text, w.notes
  from public.attested_works w;

-- ---------------------------------------------------------------- video
create or replace view api.v_video_assets as
  select v.id, v.collection_id, v.subject_type,
         to_jsonb(v.subject_person_ids) as subject_person_ids,
         v.title, v.physical_tape_no, v.interview_date::text, v.date_text,
         v.date_earliest, v.date_latest, v.location,
         coalesce((select jsonb_agg(jsonb_build_object(
                            'filename', m.filename, 'variant', m.variant,
                            'path', m.path, 'size_bytes', m.size_bytes)
                          order by m.ordinal)
                   from public.video_media_files m
                   where m.video_id = v.id), '[]'::jsonb) as media_files,
         v.transcript_source_file, v.transcript_text_file, v.transcript_word_count,
         v.transcript_page_count, v.duration_seconds,
         to_jsonb(v.topics) as topics,
         v.review_status, v.notes
  from public.video_assets v;

create or replace view api.v_transcript_texts as
  select video_id, source_file, text from public.transcript_texts;

-- ---------------------------------------------------------------- the dormant layer
create or replace view api.v_historical_events as
  select id, title, date_text, date_earliest, date_latest, category, description,
         to_jsonb(source_refs) as source_refs, notes
  from public.historical_events;

create or replace view api.v_commentary as
  select id, source_type, source_id, commentator_person_id, subject_scope,
         to_jsonb(painting_ids) as painting_ids,
         subject_person_id, subject_description_raw, commentary_type, excerpt, stance,
         confidence, review_status::text, notes
  from public.commentary;

create or replace view api.v_commentary_relations as
  select id, commentary_a_id, commentary_b_id, relation_type, notes
  from public.commentary_relations;

create or replace view api.v_painting_historical_context as
  select id, painting_id, historical_event_id, direction, description,
         to_jsonb(source_refs) as source_refs, confidence, notes
  from public.painting_historical_context;

create or replace view api.v_painting_exhibitions as
  select id, painting_id, exhibition_id, confidence, notes
  from public.painting_exhibitions;

create or replace view api.v_scholarship as
  select id, citation, kind, to_jsonb(authors) as authors, title, container, year,
         url, doi, to_jsonb(about) as about, notes
  from public.scholarship;

-- ---------------------------------------------------------------- storage manifest
-- One query listing every object the build may need to download, with the size the
-- incremental skip compares against. Without this a deploy pulls 182 MB every time.
create or replace view api.v_media_manifest as
  select b.name as bucket,
         o.name as path,
         (o.metadata->>'size')::bigint as size_bytes,
         o.metadata->>'mimetype'       as mime_type,
         o.updated_at
  from storage.objects o
  join storage.buckets b on b.id = o.bucket_id;

-- Build-time reads only. service_role bypasses RLS; anon is granted nothing anywhere.
grant usage on schema api to service_role;
grant select on all tables in schema api to service_role;
alter default privileges in schema api grant select on tables to service_role;
revoke all on schema api from anon, authenticated;
