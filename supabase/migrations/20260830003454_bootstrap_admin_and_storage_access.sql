create or replace function private.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  assigned_role text;
begin
  if not exists (select 1 from public.profiles) then
    assigned_role := 'admin';
  else
    assigned_role := 'viewer';
  end if;

  insert into public.profiles (user_id, display_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), assigned_role)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke execute on function private.handle_new_user_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function private.handle_new_user_profile();

-- Keep the existing curator policies but extend storage access to the two legacy source buckets.
drop policy if exists curator_storage_select on storage.objects;
create policy curator_storage_select on storage.objects for select to authenticated
using (bucket_id = any (array['archive-scans','Articles and Media','Artwork','artwork-images','retrospective','videos','video-clips','transcripts','source-documents']) and private.is_curator());

drop policy if exists curator_storage_insert on storage.objects;
create policy curator_storage_insert on storage.objects for insert to authenticated
with check (bucket_id = any (array['archive-scans','Articles and Media','Artwork','artwork-images','retrospective','videos','video-clips','transcripts','source-documents']) and private.is_curator());

drop policy if exists curator_storage_update on storage.objects;
create policy curator_storage_update on storage.objects for update to authenticated
using (bucket_id = any (array['archive-scans','Articles and Media','Artwork','artwork-images','retrospective','videos','video-clips','transcripts','source-documents']) and private.is_curator())
with check (bucket_id = any (array['archive-scans','Articles and Media','Artwork','artwork-images','retrospective','videos','video-clips','transcripts','source-documents']) and private.is_curator());

drop policy if exists curator_storage_delete on storage.objects;
create policy curator_storage_delete on storage.objects for delete to authenticated
using (bucket_id = any (array['archive-scans','Articles and Media','Artwork','artwork-images','retrospective','videos','video-clips','transcripts','source-documents']) and private.is_curator());
