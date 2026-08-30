-- api.v_archive_objects leaked sort_order as a 19th column. It is a UNION ALL over the two
-- tables the 76 objects now live in, and ordering the union required the column to be in
-- the select list -- where schema/data_model.schema.json sets additionalProperties:false
-- and would have failed ajv on all 76 rows.
--
-- Wrapping the union in a subquery keeps the ordering and drops the column from the
-- emitted row: ORDER BY may reference a column of the FROM relation without selecting it.
-- This is the exact hazard the 2026-08-30 view migration warns about; it just had no
-- UNION to trip over.

drop view api.v_archive_objects;

create view api.v_archive_objects as
  select id, collection_id, seq, folder_no, raw_title_description,
         date_text, date_earliest, date_latest, copies_count, medium, medium_raw,
         condition, digital_record_id, object_type, stated_item_count,
         scan_files, article_ids, artwork
  from (
    select w.id, w.collection_id, w.seq, w.folder_no,
           w.raw_description as raw_title_description,
           w.date_display as date_text, w.year_start as date_earliest, w.year_end as date_latest,
           w.copies_count, w.object_medium as medium, w.object_medium_raw as medium_raw,
           w.condition, w.digital_record_id,
           -- Literal: 'work_on_paper' on all 25 by construction. build-data.mjs used to
           -- check this; the schema now makes it unfalsifiable.
           'work_on_paper'::text as object_type,
           w.stated_item_count,
           coalesce((select jsonb_agg(jsonb_build_object(
                              'filename', m.filename, 'part_label', m.part_label)
                            order by m.ordinal)
                     from public.media_assets m
                     where m.artwork_id = w.id and m.asset_type = 'archive_scan'), '[]'::jsonb) as scan_files,
           '[]'::jsonb as article_ids,
           -- Presence is the semantic signal: null means "a document about the art",
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
  ) o
  order by o.sort_order, o.id;

grant select on api.v_archive_objects to service_role;
