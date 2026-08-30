-- media_assets is the one core table with no natural key: it was created with a generated
-- uuid, and the migration inserted 68 random ones.
--
-- That quietly broke the archive's escape hatch. scripts/export-seeds.mjs dumps the record
-- out as seed-shaped JSON and scripts/seed-supabase.mjs reads it back, and every other
-- table upserts on the record's own id, so a restore CORRECTS rather than duplicates.
-- media_assets could not: a random id never matches, so restoring the archive's own backup
-- would have inserted a second copy of all 68 files and doubled every scan_files array on
-- the site. No gate in this repo would have caught it -- the pages would simply have shown
-- each sheet twice.
--
-- So the id becomes a function of the row: RFC 4122 v5 over the owner and ordinal. The
-- namespace below is uuid_generate_v5(uuid_ns_dns(), 'sievan-archive.media-assets'), and
-- uuidFor() in seed-supabase.mjs computes the identical value in JavaScript -- verified
-- against this statement rather than assumed.
update public.media_assets
set id = uuid_generate_v5(
           '6ee23f40-0276-5d37-9e2d-4b3aebe11e13'::uuid,
           case
             when asset_type = 'archive_scan' then 'scan:'  || coalesce(artwork_id, article_id) || ':' || ordinal
             when asset_type = 'video_master' then 'video:' || interview_id                     || ':' || ordinal
           end)
where asset_type in ('archive_scan', 'video_master');

do $verify$
declare n_random int;
begin
  select count(*) into n_random
  from public.media_assets
  where id <> uuid_generate_v5(
                '6ee23f40-0276-5d37-9e2d-4b3aebe11e13'::uuid,
                case
                  when asset_type = 'archive_scan' then 'scan:'  || coalesce(artwork_id, article_id) || ':' || ordinal
                  when asset_type = 'video_master' then 'video:' || interview_id                     || ':' || ordinal
                end);
  if n_random <> 0 then
    raise exception '% media_assets rows still carry an id that is not derived from the row', n_random;
  end if;
  if (select count(*) from public.media_assets) <> 68 then
    raise exception 'media_assets is no longer 68 rows';
  end if;
end $verify$;
