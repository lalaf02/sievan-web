-- Repoint every api.v_* view at the seven-table core, emitting EXACTLY the shape it
-- emitted before. This is the whole safety argument for the migration: scripts/
-- fetch-data.mjs reads these views and never a base table, so if the views hold, the
-- bundle is byte-for-byte identical and not one line of app code changes.
-- scripts/check-parity.mjs is what proves it.
--
-- The three shapes that are easy to get wrong, unchanged from 2026-08-30:
--   · jsonb_agg returns NULL for an empty set, and scan_files is REQUIRED. Every
--     aggregate is coalesce(..., '[]').
--   · place_refs[].certain is absent on 33 of 37 rows rather than false, so
--     jsonb_strip_nulls drops it exactly where it is null. Nowhere else strips.
--   · Each view lists its columns explicitly. schema/data_model.schema.json sets
--     additionalProperties:false, so one leaked created_at fails ajv on every row.
--
-- Dropped rather than replaced, because several views change their source table's column
-- types and CREATE OR REPLACE VIEW cannot do that.

drop view if exists api.v_collections, api.v_publications, api.v_persons, api.v_places,
                    api.v_exhibitions, api.v_paintings, api.v_archive_objects,
                    api.v_news_articles, api.v_attested_works, api.v_video_assets,
                    api.v_transcript_texts, api.v_historical_events, api.v_commentary,
                    api.v_commentary_relations, api.v_painting_historical_context,
                    api.v_painting_exhibitions, api.v_scholarship;

-- ------------------------------------------------- authority terms, unchanged tables
create view api.v_collections as
  select id, label_raw, material_type, location, notes
  from public.collections order by sort_order, id;

create view api.v_publications as
  select id, name, to_jsonb(aliases) as aliases, type
  from public.publications order by sort_order, id;

create view api.v_places as
  select id, name, kind, parent_id, region, to_jsonb(aliases) as aliases, notes
  from public.places order by sort_order, id;

-- persons -> people. `name` is the emitted key; `display_name` is the column.
create view api.v_persons as
  select id, display_name as name, to_jsonb(aliases) as aliases, to_jsonb(roles) as roles, notes
  from public.people order by sort_order, id;

-- exhibitions -> events. The gazetteer key survives: venue_place_id still resolves,
-- because places was not dropped.
create view api.v_exhibitions as
  select id, name, venue_name as gallery_or_venue, venue_city, venue_place_id,
         start_date::text, end_date::text, date_earliest, date_latest,
         exhibition_type, confidence,
         to_jsonb(source_archive_object_ids) as source_archive_object_ids,
         to_jsonb(source_article_ids)        as source_article_ids,
         notes
  from public.events where event_type = 'exhibition'
  order by sort_order, id;

create view api.v_historical_events as
  select id, name as title, date_display as date_text, date_earliest, date_latest,
         category, description, to_jsonb(source_refs) as source_refs, notes
  from public.events where event_type = 'historical_context'
  order by sort_order, id;

-- ------------------------------------------------- the artworks partition
-- artwork_type splits one table into the archive's two irreconcilable counts.
-- counts.paintings reads this view and stays 0; counts.worksOnPaperCatalogued reads the
-- next one and is 25. They are never added together, and the partition is why they cannot
-- be by accident.
create view api.v_paintings as
  select id, title, date_display as date_text, year_start as date_earliest,
         year_end as date_latest, medium, dimensions_text as dimensions,
         current_location, image_ref, catalogue_status as catalog_status, notes
  from public.artworks where artwork_type = 'painting'
  order by sort_order, id;

-- ------------------------------------------------- archive objects
-- The 76 physical objects, rebuilt from the two tables they were split across: the 25
-- sheets that are works of art (now `artworks`) and the 51 that are documents (now
-- `articles`). UNION ALL then one ORDER BY reproduces the original sequence exactly,
-- because both halves kept their sort_order.
--
-- object_type is a LITERAL on the artwork half: it was 'work_on_paper' on all 25 by
-- construction, and build-data.mjs used to check that. The schema now makes it unfalsifiable.
--
-- article_ids and scan_files are still not stored: they are the inverse of
-- articles.parent_article_id and media_assets.article_id, and rebuilding them here is what
-- keeps the two from drifting apart.
create view api.v_archive_objects as
  select w.id, w.collection_id, w.seq, w.folder_no,
         w.raw_description as raw_title_description,
         w.date_display as date_text, w.year_start as date_earliest, w.year_end as date_latest,
         w.copies_count, w.object_medium as medium, w.object_medium_raw as medium_raw,
         w.condition, w.digital_record_id,
         'work_on_paper'::text as object_type,
         w.stated_item_count,
         coalesce((select jsonb_agg(jsonb_build_object(
                            'filename', m.filename, 'part_label', m.part_label)
                          order by m.ordinal)
                   from public.media_assets m
                   where m.artwork_id = w.id and m.asset_type = 'archive_scan'), '[]'::jsonb) as scan_files,
         '[]'::jsonb as article_ids,
         -- Presence is the semantic signal: null here means "a document about the art",
         -- an object means "a work of art the archive holds".
         jsonb_build_object(
           'medium_stated', w.medium,
           'support',       w.support,
           'signed',        w.signed_text,
           'sheet_count',   w.sheet_count) as artwork,
         w.sort_order
  from public.artworks w
  where w.artwork_type = 'drawing'
  union all
  select a.id, a.collection_id, a.seq, a.folder_no,
         a.raw_description as raw_title_description,
         a.date_text, a.date_earliest, a.date_latest,
         a.copies_count, a.object_medium as medium, a.object_medium_raw as medium_raw,
         a.condition, a.digital_record_id,
         a.article_type as object_type,
         a.stated_item_count,
         coalesce((select jsonb_agg(jsonb_build_object(
                            'filename', m.filename, 'part_label', m.part_label)
                          order by m.ordinal)
                   from public.media_assets m
                   where m.article_id = a.id and m.asset_type = 'archive_scan'), '[]'::jsonb) as scan_files,
         coalesce((select jsonb_agg(c.id order by c.id)
                   from public.articles c
                   where c.parent_article_id = a.id), '[]'::jsonb) as article_ids,
         null::jsonb as artwork,
         a.sort_order
  from public.articles a
  where a.article_type <> 'press_notice'
  order by sort_order, id;

-- The 60 clippings. parent_article_id is the containment that used to be
-- news_articles.archive_object_id; event_id is what used to be exhibition_id.
create view api.v_news_articles as
  select id, parent_article_id as archive_object_id, raw_description as raw_source_text,
         publication_id, publication_raw, title as headline,
         author_person_id, author_raw, date_text,
         date_normalized::text, date_earliest, date_latest, date_uncertain,
         event_id as exhibition_id, parse_confidence, continuation_joined,
         review_status::text, reviewer, reviewed_at, notes
  from public.articles where article_type = 'press_notice'
  order by sort_order, id;

-- ------------------------------------------------- artwork mentions
-- source_type/source_id are RECOMPUTED from the three real foreign keys that replaced the
-- polymorphic pair. The check constraint guarantees exactly one is set, so the coalesce
-- can never pick the wrong one.
create view api.v_attested_works as
  select m.id,
         case when m.source_artwork_id   is not null then 'archive_object'
              when m.source_article_id   is not null then 'news_article'
              when m.source_interview_id is not null then 'video_asset'
         end as source_type,
         coalesce(m.source_artwork_id, m.source_article_id, m.source_interview_id) as source_id,
         m.source_page, m.sheet_position, m.quote,
         m.title_as_written as title_stated, m.artist_number,
         m.dimensions_as_written as dimensions_stated, m.medium_as_written as medium_stated,
         m.date_as_written as date_text, m.date_earliest, m.date_latest,
         m.date_uncertain, m.date_basis,
         m.price_as_written as price_stated, m.price_usd,
         to_jsonb(m.dispositions) as dispositions,
         m.buyer_as_written as counterparty_raw, m.counterparty_person_id,
         coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                            'place_id', p.place_id, 'role', p.role, 'certain', p.certain))
                          order by p.ordinal)
                   from public.artwork_mention_places p
                   where p.artwork_mention_id = m.id), '[]'::jsonb) as place_refs,
         m.artwork_id as painting_id, m.identification_basis, m.review_status::text, m.notes
  from public.artwork_mentions m
  order by m.sort_order, m.id;

-- ------------------------------------------------- interviews
create view api.v_video_assets as
  select v.id, v.collection_id, v.subject_type,
         to_jsonb(v.subject_person_ids) as subject_person_ids,
         v.title, v.physical_tape_no, v.interview_date::text, v.date_text,
         v.date_earliest, v.date_latest, v.location,
         coalesce((select jsonb_agg(jsonb_build_object(
                            'filename', m.filename, 'variant', m.variant,
                            'path', m.local_path, 'size_bytes', m.file_size_bytes)
                          order by m.ordinal)
                   from public.media_assets m
                   where m.interview_id = v.id and m.asset_type = 'video_master'), '[]'::jsonb) as media_files,
         v.transcript_source_file, v.transcript_text_file, v.transcript_word_count,
         v.transcript_page_count, v.duration_seconds,
         to_jsonb(v.topics) as topics,
         v.review_status, v.notes
  from public.interviews v
  order by v.sort_order, v.id;

-- transcript_texts is gone: the text is a column on the interview now. source_file is
-- transcript_text_file, which was the same string on all five rows.
create view api.v_transcript_texts as
  select id as video_id, transcript_text_file as source_file, transcript_text as text
  from public.interviews where transcript_text is not null;

-- ------------------------------------------------- the dormant layer
-- commentary, scholarship and the two painting join tables held 0 rows and are retired.
-- These typed empty views keep DEFS in build-data.mjs and the dormant sections of
-- components/Relations.tsx resolving with no app change. When the archive actually has
-- commentary or scholarship to record, the table comes back as a real one -- introduced
-- because content requires it, not in advance of it.
create view api.v_commentary as
  select null::text as id, null::text as source_type, null::text as source_id,
         null::text as commentator_person_id, null::text as subject_scope,
         '[]'::jsonb as painting_ids, null::text as subject_person_id,
         null::text as subject_description_raw, null::text as commentary_type,
         null::text as excerpt, null::text as stance, null::text as confidence,
         null::text as review_status, null::text as notes
  where false;

create view api.v_commentary_relations as
  select null::text as id, null::text as commentary_a_id, null::text as commentary_b_id,
         null::text as relation_type, null::text as notes
  where false;

create view api.v_painting_historical_context as
  select null::text as id, null::text as painting_id, null::text as historical_event_id,
         null::text as direction, null::text as description,
         '[]'::jsonb as source_refs, null::text as confidence, null::text as notes
  where false;

create view api.v_painting_exhibitions as
  select null::text as id, null::text as painting_id, null::text as exhibition_id,
         null::text as confidence, null::text as notes
  where false;

create view api.v_scholarship as
  select null::text as id, null::text as citation, null::text as kind,
         '[]'::jsonb as authors, null::text as title, null::text as container,
         null::integer as year, null::text as url, null::text as doi,
         '[]'::jsonb as about, null::text as notes
  where false;

-- Build-time reads only. service_role bypasses RLS; anon is granted nothing anywhere.
grant usage on schema api to service_role;
grant select on all tables in schema api to service_role;
revoke all on schema api from anon, authenticated;
