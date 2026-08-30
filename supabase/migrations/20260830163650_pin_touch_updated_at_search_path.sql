-- A SECURITY-relevant trigger function with a mutable search_path can be redirected by
-- whatever schema happens to be first on the caller's path. Pin it empty and schema-qualify.
create or replace function public.touch_updated_at() returns trigger
language plpgsql
set search_path = ''
as $fn$
begin new.updated_at = now(); return new; end;
$fn$;
