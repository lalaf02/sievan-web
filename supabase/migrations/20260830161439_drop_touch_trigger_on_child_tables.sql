-- The three child tables are pure join rows keyed by (parent, ordinal): they carry no
-- created_at/updated_at of their own, because the record that owns them does. The blanket
-- touch_updated_at trigger therefore fails on insert with
--   record "new" has no field "updated_at"
drop trigger if exists archive_object_scans_touch on public.archive_object_scans;
drop trigger if exists attested_work_places_touch on public.attested_work_places;
drop trigger if exists video_media_files_touch    on public.video_media_files;
