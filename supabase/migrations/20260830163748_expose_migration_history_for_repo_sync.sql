-- The schema is part of the record and belongs in git, not only in this project's
-- migration history. This view lets scripts/sync-migrations.mjs write the applied SQL
-- back into supabase/migrations/ so the repo can rebuild the database from scratch —
-- the same argument export-seeds.mjs makes for the rows.
create or replace view api.v_migrations as
  select version, name, array_to_string(statements, E';\n\n') as sql
  from supabase_migrations.schema_migrations;

grant select on api.v_migrations to service_role;
