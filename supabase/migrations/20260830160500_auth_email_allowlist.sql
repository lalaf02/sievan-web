-- Restrict the archive to three named curators.
--
-- Signup stays open in Auth settings deliberately: it is what lets each curator
-- register their own password without a service_role key. This trigger is what
-- makes that safe -- any address outside the allowlist is refused at insert.

create or replace function private.enforce_email_allowlist() returns trigger
language plpgsql security definer set search_path to 'public','pg_temp' as $$
begin
  if lower(coalesce(new.email,'')) not in (
    'laurynfuld2021@gmail.com',
    'gabriel.lewisconservation@gmail.com',
    'diamondsteve7@gmail.com'
  ) then
    raise exception 'This email is not authorised for the Sievan archive.'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists enforce_allowlist on auth.users;
create trigger enforce_allowlist before insert on auth.users
  for each row execute function private.enforce_email_allowlist();

-- Replace the profile trigger. The previous version granted 'admin' to whoever
-- signed up first -- a privilege-escalation hole with signup open -- and
-- 'viewer' to everyone after, a role the CHECK constraint rejects, so their
-- signup errored outright. Roles are now pinned to the address.
create or replace function private.handle_new_user_profile() returns trigger
language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare
  assigned_role text;
begin
  if lower(new.email) = 'laurynfuld2021@gmail.com' then
    assigned_role := 'admin';
  else
    assigned_role := 'curator';
  end if;

  insert into public.profiles (user_id, display_name, role)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)),
          assigned_role)
  on conflict (user_id) do nothing;
  return new;
end $$;
