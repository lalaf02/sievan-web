-- Grant the anonymous role full read/write on archive content so the admin app
-- can operate without a login. Access control now rests entirely on keeping the
-- admin URL (and the publishable key it ships) private.
-- Reverse with supabase/restore-auth-rls.sql in the sievan-admin repo.

grant insert, update, delete on public.media_assets to anon;

create policy anon_full_access on public.artworks
  for all to anon using (true) with check (true);
create policy anon_full_access on public.articles
  for all to anon using (true) with check (true);
create policy anon_full_access on public.interviews
  for all to anon using (true) with check (true);
create policy anon_full_access on public.people
  for all to anon using (true) with check (true);
create policy anon_full_access on public.media_assets
  for all to anon using (true) with check (true);
create policy anon_full_access on public.artwork_mentions
  for all to anon using (true) with check (true);
