-- The seeds are not all id-ordered, and the order is meaningful: exhibitions run
-- chronologically, places in the curator's own sequence. It is also load-bearing —
-- scripts/build-data.mjs iterates data.exhibitions to build derived.exhibitionsByObject
-- and derived.exhibitionsByPlace, so a reshuffle here silently reorders the cross-links
-- printed on every record page.
--
-- sort_order carries that sequence explicitly, so a curator can reorder deliberately and
-- nothing reorders by accident. The ORDER BY lives INSIDE each view rather than being
-- requested by the client, because the column must not appear in the emitted row:
-- schema/data_model.schema.json sets additionalProperties:false, and one extra key fails
-- ajv on every row of the table.

do $add$
declare t text;
begin
  foreach t in array array[
    'collections','publications','persons','places','exhibitions','paintings',
    'archive_objects','news_articles','attested_works','video_assets',
    'historical_events','commentary','commentary_relations',
    'painting_historical_context','painting_exhibitions','scholarship'
  ]
  loop
    execute format('alter table public.%I add column if not exists sort_order integer not null default 0', t);
  end loop;
end $add$;

create or replace view api.v_collections as
  select id, label_raw, material_type, location, notes
  from public.collections order by sort_order, id;

create or replace view api.v_publications as
  select id, name, to_jsonb(aliases) as aliases, type
  from public.publications order by sort_order, id;

create or replace view api.v_persons as
  select id, name, to_jsonb(aliases) as aliases, to_jsonb(roles) as roles, notes
  from public.persons order by sort_order, id;

create or replace view api.v_places as
  select id, name, kind, parent_id, region, to_jsonb(aliases) as aliases, notes
  from public.places order by sort_order, id;

create or replace view api.v_exhibitions as
  select id, name, gallery_or_venue, venue_city, venue_place_id,
         start_date::text, end_date::text, date_earliest, date_latest,
         exhibition_type, confidence,
         to_jsonb(source_archive_object_ids) as source_archive_object_ids,
         to_jsonb(source_article_ids)        as source_article_ids,
         notes
  from public.exhibitions order by sort_order, id;

create or replace view api.v_paintings as
  select id, title, date_text, date_earliest, date_latest, medium, dimensions,
         current_location, image_ref, catalog_status, notes
  from public.paintings order by sort_order, id;

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
         case when o.artwork_medium_stated is null then null
              else jsonb_build_object(
                'medium_stated', o.artwork_medium_stated,
                'support',       o.artwork_support,
                'signed',        o.artwork_signed,
                'sheet_count',   o.artwork_sheet_count)
         end as artwork
  from public.archive_objects o order by o.sort_order, o.id;

create or replace view api.v_news_articles as
  select id, archive_object_id, raw_source_text, publication_id, publication_raw,
         headline, author_person_id, author_raw, date_text,
         date_normalized::text, date_earliest, date_latest, date_uncertain,
         exhibition_id, parse_confidence, continuation_joined, review_status::text,
         reviewer, reviewed_at, notes
  from public.news_articles order by sort_order, id;

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
  from public.attested_works w order by w.sort_order, w.id;

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
  from public.video_assets v order by v.sort_order, v.id;

create or replace view api.v_historical_events as
  select id, title, date_text, date_earliest, date_latest, category, description,
         to_jsonb(source_refs) as source_refs, notes
  from public.historical_events order by sort_order, id;

create or replace view api.v_commentary as
  select id, source_type, source_id, commentator_person_id, subject_scope,
         to_jsonb(painting_ids) as painting_ids,
         subject_person_id, subject_description_raw, commentary_type, excerpt, stance,
         confidence, review_status::text, notes
  from public.commentary order by sort_order, id;

create or replace view api.v_commentary_relations as
  select id, commentary_a_id, commentary_b_id, relation_type, notes
  from public.commentary_relations order by sort_order, id;

create or replace view api.v_painting_historical_context as
  select id, painting_id, historical_event_id, direction, description,
         to_jsonb(source_refs) as source_refs, confidence, notes
  from public.painting_historical_context order by sort_order, id;

create or replace view api.v_painting_exhibitions as
  select id, painting_id, exhibition_id, confidence, notes
  from public.painting_exhibitions order by sort_order, id;

create or replace view api.v_scholarship as
  select id, citation, kind, to_jsonb(authors) as authors, title, container, year,
         url, doi, to_jsonb(about) as about, notes
  from public.scholarship order by sort_order, id;

grant select on all tables in schema api to service_role;
