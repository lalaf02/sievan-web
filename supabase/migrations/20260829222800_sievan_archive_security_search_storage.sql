create or replace function private.is_curator()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select (select auth.uid()) is not null
     and exists (
       select 1 from public.profiles p
       where p.user_id = (select auth.uid())
         and p.role in ('curator','admin')
     );
$$;
revoke all on function private.is_curator() from public;
grant execute on function private.is_curator() to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select (select auth.uid()) is not null
     and exists (
       select 1 from public.profiles p
       where p.user_id = (select auth.uid())
         and p.role = 'admin'
     );
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

alter table public.archive_objects add column if not exists search_vector tsvector generated always as (
  setweight(to_tsvector('english'::regconfig, coalesce(display_title,'')), 'A') ||
  setweight(to_tsvector('english'::regconfig, coalesce(raw_title_description,'')), 'B') ||
  setweight(to_tsvector('english'::regconfig, coalesce(notes,'')), 'D')
) stored;
create index if not exists archive_objects_search_idx on public.archive_objects using gin(search_vector);

alter table public.paintings add column if not exists search_vector tsvector generated always as (
  setweight(to_tsvector('english'::regconfig, coalesce(title,'')), 'A') ||
  setweight(to_tsvector('english'::regconfig, coalesce(notes,'')), 'D')
) stored;
create index if not exists paintings_search_idx on public.paintings using gin(search_vector);

alter table public.attested_works add column if not exists search_vector tsvector generated always as (
  setweight(to_tsvector('english'::regconfig, coalesce(normalized_title,title_as_written,'')), 'A') ||
  setweight(to_tsvector('english'::regconfig, coalesce(verbatim_quote,'')), 'B') ||
  setweight(to_tsvector('english'::regconfig, coalesce(notes,'')), 'D')
) stored;
create index if not exists attested_works_search_idx on public.attested_works using gin(search_vector);

alter table public.news_articles add column if not exists search_vector tsvector generated always as (
  setweight(to_tsvector('english'::regconfig, coalesce(headline,'')), 'A') ||
  setweight(to_tsvector('english'::regconfig, coalesce(transcript_text,'')), 'B') ||
  setweight(to_tsvector('english'::regconfig, coalesce(notes,'')), 'D')
) stored;
create index if not exists news_articles_search_idx on public.news_articles using gin(search_vector);

create or replace view public.search_documents
with (security_invoker = true)
as
select 'archive_object'::text entity_type, id entity_id,
       coalesce(display_title, raw_title_description) title,
       concat_ws(' ', raw_title_description, notes) body,
       ('/life/archive/' || id || '/')::text url,
       search_vector
from public.archive_objects where publication_status='published'
union all
select 'painting', id, title, concat_ws(' ', medium, support, notes),
       ('/works/paintings/' || id || '/'), search_vector
from public.paintings where publication_status='published'
union all
select 'attested_work', id, coalesce(normalized_title,title_as_written), concat_ws(' ', verbatim_quote, notes),
       ('/works/attested/' || id || '/'), search_vector
from public.attested_works where publication_status='published'
union all
select 'news_article', id, headline, concat_ws(' ', byline_text, transcript_text, notes),
       ('/life/press/' || id || '/'), search_vector
from public.news_articles where publication_status='published';

create or replace view public.period_contents
with (security_invoker = true)
as
select p.id as period_id,
       p.title as period_title,
       'work_on_paper'::text as evidence_type,
       aoa.archive_object_id as entity_id,
       aoa.title as title,
       aoa.date_start_year as year
from public.periods p
join public.archive_object_artworks aoa
  on aoa.date_basis = 'stated_on_source'
 and aoa.date_start_year between p.start_year and p.end_year
join public.archive_objects ao on ao.id=aoa.archive_object_id and ao.publication_status='published'
where p.publication_status='published'
union all
select p.id, p.title, 'attested_work', aw.id, coalesce(aw.normalized_title,aw.title_as_written), aw.date_start_year
from public.periods p
join public.attested_works aw
  on aw.date_basis = 'stated_on_source'
 and aw.date_start_year between p.start_year and p.end_year
 and aw.publication_status='published'
where p.publication_status='published';

grant select on public.search_documents, public.period_contents to anon, authenticated;

insert into storage.buckets (id, name, public)
values
 ('archive-scans','archive-scans',false),
 ('artwork-images','artwork-images',false),
 ('retrospective','retrospective',false),
 ('videos','videos',false),
 ('video-clips','video-clips',false),
 ('transcripts','transcripts',false),
 ('source-documents','source-documents',false)
on conflict (id) do nothing;

do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname='public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;

do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname='public' loop
    execute format('revoke all on table public.%I from anon, authenticated', r.tablename);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array['collections','archive_objects','paintings','persons','places','publications','exhibitions','news_articles','attested_works','video_assets','commentary','scholarship','historical_events','periods','media_assets','transcripts','curated_quotes'] loop
    execute format('grant select on public.%I to anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select to anon using (publication_status = ''published'')', 'anon_read_published_'||t, t);
    execute format('create policy %I on public.%I for select to authenticated using (private.is_curator())', 'curator_read_'||t, t);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.is_curator())', 'curator_insert_'||t, t);
    execute format('create policy %I on public.%I for update to authenticated using (private.is_curator()) with check (private.is_curator())', 'curator_update_'||t, t);
    execute format('create policy %I on public.%I for delete to authenticated using (private.is_curator())', 'curator_delete_'||t, t);
  end loop;
end $$;

grant select on public.archive_object_artworks, public.person_aliases, public.archive_object_media, public.painting_media, public.video_asset_media, public.transcript_pages to anon;
grant select, insert, update, delete on public.archive_object_artworks, public.person_aliases, public.archive_object_media, public.painting_media, public.video_asset_media, public.transcript_pages to authenticated;

create policy anon_read_archive_object_artworks on public.archive_object_artworks for select to anon using (exists (select 1 from public.archive_objects ao where ao.id=archive_object_id and ao.publication_status='published'));
create policy anon_read_person_aliases on public.person_aliases for select to anon using (exists (select 1 from public.persons p where p.id=person_id and p.publication_status='published'));
create policy anon_read_archive_object_media on public.archive_object_media for select to anon using (exists (select 1 from public.archive_objects ao where ao.id=archive_object_id and ao.publication_status='published') and exists (select 1 from public.media_assets m where m.id=media_asset_id and m.publication_status='published'));
create policy anon_read_painting_media on public.painting_media for select to anon using (exists (select 1 from public.paintings p where p.id=painting_id and p.publication_status='published') and exists (select 1 from public.media_assets m where m.id=media_asset_id and m.publication_status='published'));
create policy anon_read_video_asset_media on public.video_asset_media for select to anon using (exists (select 1 from public.video_assets v where v.id=video_asset_id and v.publication_status='published') and exists (select 1 from public.media_assets m where m.id=media_asset_id and m.publication_status='published'));
create policy anon_read_transcript_pages on public.transcript_pages for select to anon using (exists (select 1 from public.transcripts t where t.id=transcript_id and t.publication_status='published'));

do $$
declare t text;
begin
  foreach t in array array['archive_object_artworks','person_aliases','archive_object_media','painting_media','video_asset_media','transcript_pages','attested_work_painting_matches','attested_work_relationships','archive_object_person_relations','archive_object_place_relations','painting_exhibitions','painting_historical_context','commentary_paintings','commentary_relations','scholarship_paintings','derived_person_mentions','derived_article_exhibition_matches','derived_attested_title_matches','painting_revisions','import_runs','source_import_records','validation_issues','profiles'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select to authenticated using (private.is_curator())', 'curator_read_'||t, t);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.is_curator())', 'curator_insert_'||t, t);
    execute format('create policy %I on public.%I for update to authenticated using (private.is_curator()) with check (private.is_curator())', 'curator_update_'||t, t);
    execute format('create policy %I on public.%I for delete to authenticated using (private.is_curator())', 'curator_delete_'||t, t);
  end loop;
end $$;

grant select on public.profiles to authenticated;
create policy profile_self_read on public.profiles for select to authenticated using (user_id=(select auth.uid()));

revoke all on public."Master Art Archive" from anon, authenticated;
revoke all on public."Master Reviews, Media and Publications" from anon, authenticated;

create policy curator_storage_select on storage.objects for select to authenticated using (bucket_id in ('archive-scans','artwork-images','retrospective','videos','video-clips','transcripts','source-documents') and private.is_curator());
create policy curator_storage_insert on storage.objects for insert to authenticated with check (bucket_id in ('archive-scans','artwork-images','retrospective','videos','video-clips','transcripts','source-documents') and private.is_curator());
create policy curator_storage_update on storage.objects for update to authenticated using (bucket_id in ('archive-scans','artwork-images','retrospective','videos','video-clips','transcripts','source-documents') and private.is_curator()) with check (bucket_id in ('archive-scans','artwork-images','retrospective','videos','video-clips','transcripts','source-documents') and private.is_curator());
create policy curator_storage_delete on storage.objects for delete to authenticated using (bucket_id in ('archive-scans','artwork-images','retrospective','videos','video-clips','transcripts','source-documents') and private.is_curator());
