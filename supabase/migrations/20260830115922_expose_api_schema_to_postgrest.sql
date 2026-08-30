-- PostgREST serves only the schemas named here. `api` holds the seed-shaped views the
-- build reads; `public` stays exposed for the curator's authenticated editing session.
--
-- If a Supabase dashboard change ever resets this, the symptom is a 404 from
-- /rest/v1/v_collections and the fix is Settings -> API -> Exposed schemas: add `api`.
alter role authenticator set pgrst.db_schemas = 'public, graphql_public, api';
notify pgrst, 'reload config';
