# scripts/

The pipeline between Supabase and the site. Full account:
[docs/data-pipeline.md](../docs/data-pipeline.md).

**There is no local fallback.** `build-data.mjs` calls `requireCredentials()` at module
scope and fails without Supabase. Never reintroduce a "carry on without the source" branch
to a gate — it cannot tell a legitimately absent source from a bug, and that is exactly how
this repo shipped a permanently green gate over nothing.

**`api.v_*` is the seam.** `fetch-data.mjs` reads views, never base tables. Two rules the
views enforce: never `select *` (`additionalProperties: false` means one leaked
`created_at` fails ajv on every row), and `coalesce(jsonb_agg(...), '[]')` everywhere
(`jsonb_agg` returns NULL for an empty set).

**Two round trips must keep working.** After any schema change:

```bash
cp data/archive.generated.json /tmp/baseline.json && npm run data
node scripts/check-parity.mjs /tmp/baseline.json          # must report no difference
```

After touching `export-seeds.mjs` or `seed-supabase.mjs` — they are inverses:

```bash
node scripts/export-seeds.mjs --out /tmp/a
node scripts/seed-supabase.mjs --from /tmp/a/seed --transcripts /tmp/a/transcripts
node scripts/export-seeds.mjs --out /tmp/b && diff -rq /tmp/a /tmp/b
```

**Raise `MIN_PAGES` in `check-export.mjs`** whenever a box is ingested or a route family is
added. It once defaulted to 60 against 205 real pages.
