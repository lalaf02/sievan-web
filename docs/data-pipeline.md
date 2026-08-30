# The data pipeline

How the archive gets from Supabase into the committed bundle the site imports, what each
gate catches, and the entity model on both sides of the seam.

---

## Backend architecture

**The published site has no backend.** No API routes, no auth, no runtime data fetching:
`out/` is static HTML that never calls anything. But the archive itself now lives in a
**Supabase project**, read once at build time, and that pipeline is the part of this repo
most worth understanding.

```
                    Supabase project `Sievan`  ← THE SOURCE OF RECORD
                    12 tables + Storage           (curator edits here; no local fallback)
                                           │
                                           │  api.v_* views reshape the tables into the
                                           │  seed shape — THE SEAM. See below.
                                           ▼
                        scripts/fetch-data.mjs  +  scripts/media.mjs
                                           │  · sixteen small view reads, ~300 rows
                                           │  · syncs Storage into public/, size-skipped
                                           ▼
                        scripts/build-data.mjs
                                           │  · ajv (draft 2020-12) against
                                           │    schema/data_model.schema.json
                                           │    additionalProperties: false everywhere
                                           │  · validates every row, fails on the offending id
                                           │  · parses transcripts into pages/paragraphs
                                           │  · derives facets, timeline, cross-link indexes
                                           │  · writes or deletes app/works/[paintingId]/
                                           ▼
        data/archive.generated.json  +  data/transcripts/*.json     ← COMMITTED
                                           │
                                           │  plain `import` at build time. Never fetched.
                                           ▼
                 lib/data.ts → Server Components → static HTML in out/
```

**`api.v_*` is the seam, and it is why the database can be restructured without touching
the site.** `fetch-data.mjs` reads views, never base tables, and each view emits exactly the
shape `build-data.mjs` and the JSON Schema expect. When the 21-table entity model was
consolidated into today's twelve on 2026-08-30, not one line of `app/`, `lib/` or
`components/` changed: the views absorbed the whole reshape and
`scripts/check-parity.mjs` proved the emitted bundle byte-identical. **Run that gate on any
schema change** — it walks every entity row and all 23 derived indexes:

```bash
cp data/archive.generated.json /tmp/baseline.json   # BEFORE
npm run data                                        # after the migration
node scripts/check-parity.mjs /tmp/baseline.json    # must report no difference
```

Two rules the views enforce that are easy to break:

- **Never `select *`.** `additionalProperties: false` means one leaked `created_at` fails
  ajv on every row of that table. Each view lists its columns. A `UNION` is the trap:
  ordering one requires the sort column in the select list, so `api.v_archive_objects`
  wraps the union in a subquery to keep `sort_order` out of the emitted row.
- **`coalesce(jsonb_agg(...), '[]')` everywhere**, because `jsonb_agg` returns NULL for an
  empty set and `scan_files` is required. `jsonb_strip_nulls` is used on `place_refs` and
  nowhere else: `certain` is absent on 33 of 37 rows, which is not the same as false.

**The escape hatch, and it must keep working.** `scripts/export-seeds.mjs` dumps the live
database back out as seed-shaped JSON, and `scripts/seed-supabase.mjs` reads it back in.
Between them the archive can leave this hosting account. They are inverses, so the test is
the round trip — run it after touching either:

```bash
node scripts/export-seeds.mjs --out /tmp/a
node scripts/seed-supabase.mjs --from /tmp/a/seed --transcripts /tmp/a/transcripts
node scripts/export-seeds.mjs --out /tmp/b && diff -rq /tmp/a /tmp/b
```

Then three gates, in order — `npm run data` runs the first two, `npm run build` the third:

| Gate | Catches |
|---|---|
| `check-data.mjs` | Broken foreign keys; scans, media and transcripts referenced but absent from disk; a place nothing points at; a `parent_id` cycle |
| `check-quotes.mjs` | A curated quote whose anchor phrase no longer appears on the transcript page it claims — **and an attested work whose verbatim quote is not in its source's own text** |
| `check-export.mjs` | Dead internal links, and a page count that collapsed |

### The npm scripts, in full

| Script | Runs |
|---|---|
| `npm run data` | `build-data` → `check-data` → `check-quotes`. Also `predev` and `prebuild` |
| `npm run build` | `next build`, then `check-export` as `postbuild` |
| `npm run db:seed` | `seed-supabase.mjs` — reads seed-shaped JSON into the live database |
| `npm run db:export` | `export-seeds.mjs` — dumps the live database back out as seeds |
| `npm run db:media` | `upload-media.mjs` — pushes local media into Storage |
| `npm run db:parity` | `check-parity.mjs` — **the gate for any schema change**, above |

`npm run data` **always** reads Supabase. `build-data.mjs` calls `requireCredentials()`
before anything else and fails with instructions if `SUPABASE_URL` or `SUPABASE_SECRET_KEY`
is missing. There is no local source and no committed-bundle fallback — not locally, not on
Vercel. The old fallback is [trap 1](./verification.md).

### The physical boxes

`DataModel/Archive Master Sheet.xlsx` is the collection-wide inventory: **six tabs, one per
physical box**, sharing a header row at row 5. It supersedes `Manifest_MSCS001.xlsx`, whose
tab it reproduces exactly — verified row for row, so ingesting from it is additive and never
revises what is already published.

| Box | Object ids | Catalogued | In the site |
|---|---|---:|---|
| MS-CS-001 | 00001–00050 | 50 | yes |
| MS-CS-002 | 00051–00123 | 26 | yes — 47 rows are bare ids, see below |
| MS-CS-003 | 00124–00189 | 66 | no — catalogued but no digital twin exists |
| MS-CS-004/005/006 | — | 0 | no |

**Ingesting a box** is four commands and a look. Note the third: the parser writes
`DataModel/seed/*.json`, and **`npm run data` no longer reads those files** — it reads
Supabase. Without `db:seed` the parse is a silent no-op, which is exactly the shape of
[trap 1](./verification.md).

```bash
# 1. gitignore /MS-CS-00N/ FIRST, then copy the scans in beside MS-CS-001/
python3 DataModel/scripts/parse_master_sheet.py MS-CS-00N   # merges; never overwrites
node scripts/extract-scans.mjs                              # rasterises every box
npm run db:seed          # DataModel/seed -> Supabase. Defaults to --from DataModel/seed
npm run db:media         # new scans -> Storage, if any
npm run data             # reads Supabase back out into the bundle
```

Take a `db:export` snapshot before `db:seed` so the load can be undone, and run
`check-parity.mjs` after, to see exactly which rows the box added.

`parse_master_sheet.py` maps columns directly and infers nothing — box 2 is drawings, so
there are no bylines to extract and no clippings to split. Register the box's default
`object_type` in its `DEFAULT_OBJECT_TYPE` map or it refuses to run, and add a `Collection`
row to `seed_collections.json`.

Two things that will bite:

- **Rows with an id but no description are skipped, deliberately.** Box 2's tab numbers 73
  slots and catalogues 26; the other 47 (`MS-AR-00077`–`00123`) carry a folder number and
  nothing else. `raw_title_description` is required by the schema, and inventing one to fill
  the gap is the one thing this archive does not do.
- **`extract-scans.mjs`'s landscape heuristic will not catch a sideways box-2 sheet.** These
  sheets are square-ish, so a page rotated 90° is still taller than it is wide and passes
  unflagged. Sievan wrote the title and dimensions along the *edge* of the sheet, so this is
  common — 21 of box 2's 38 pages needed a `ROTATE` entry, found only by looking at every
  page. Render a contact sheet of the new thumbs and read them.

  **A wrong `ROTATE` value looks exactly like a right one to every gate in this repo.**
  Three box-2 pages shipped rotated: `MSAR00054-p02` and `MSAR00066-p01` were 180° out
  (set to 90 where they needed 270 — the verso is written the other way up from the recto),
  and `MSAR00067-p02` had no entry at all. All three passed `check-data`, `check-export` and
  the build. They were caught by opening the page images and reading them, which is the only
  method that works. `MS-AR-00054` is on the UI-sweep list below for exactly this reason —
  and it was the page that was broken.

### The entity model

**The database and the bundle are shaped differently on purpose**, and `api.v_*` maps
between them. Read this table left to right: it is also the map from any older document
that still describes 21 tables.

| Supabase table | Rows | The bundle keys it feeds |
|---|---:|---|
| `artworks` | 25 | `archiveObjects` (the 25 drawings) **and** `paintings` (0) |
| `articles` | 111 | `archiveObjects` (the 51 documents) **and** `newsArticles` (60) |
| `artwork_mentions` | 57 | `attestedWorks` |
| `artwork_mention_places` | 37 | `attestedWorks[].place_refs` |
| `media_assets` | 281 | `archiveObjects[].scan_files`, `videoAssets[].media_files` — the other 213 rows feed nothing, see below |
| `interviews` | 7 | `videoAssets` + the transcripts |
| `events` | 15 | `exhibitions` (+ `historicalEvents`, 0) |
| `people` | 29 | `persons` |
| `publications` | 30 | `publications` |
| `places` | 25 | `places` |
| `collections` | 3 | `collections` |
| `profiles` | 1 | none — auth. Every RLS policy calls `private.is_curator()`, which reads it |

### `media_assets` is a registry, not an input

**The build does not read it.** Imagery reaches `public/` through `v_media_manifest`, which
is a `select` straight off `storage.objects` — a bucket listing. `media_assets` answers a
different question, and the one the estate actually gets asked: *what files does the archive
hold*. So the right test of a change to it is that the bundle does not move.

It held 68 rows against 270 Storage objects the site serves — only the 56 archival scans and
the 12 offline video masters, both written by `seed-supabase.mjs` from the seeds. The 87 page
images, 87 thumbs, 15 retrospective sheets, 12 clips and 12 posters were recorded nowhere.
`upload-media.mjs` now registers them as it uploads them: 281 rows, and the four buckets the
site reads are fully accounted for.

Three things to know before touching it:

- **Registration lives in `upload-media.mjs`, not the extractors.** A row's natural key is
  `(storage_bucket, storage_path)` and that script is the only one that knows a storage path.
  The extractors are offline one-offs needing `sips`, `ffmpeg` and the 25 GB of masters;
  making them require credentials would be the wrong trade.
- **`uuidFor` is in `media.mjs`**, imported by both writers. Every id is RFC 4122 v5 over the
  row's own key, so a re-run corrects instead of duplicating. Two copies that drifted would
  double every file on the next restore and nothing else would notice — which is why it sits
  beside the bucket layout, in the file that exists to be the single definition.
- **A page's owner is inherited, never recomputed.** Whether an object is an artwork or an
  article is decided by `isArtwork()` in `seed-supabase.mjs`, off a field only the seed shape
  carries. Pages and thumbs take the `artwork_id`/`article_id` of the scan they were
  rasterised from, matched on filename stem; a stem matching no registered scan fails the
  script rather than being guessed. The retrospective sheets are `MS-AR-00026`'s pages, not a
  separate kind.

Two deliberate omissions. `clips.json` is a manifest of the assets, not one of them. And the
61 objects in the leftover `Articles and Media` and `Artwork` buckets stay unregistered —
they are the reverted schema attempt of 2026-08-29 and are pending deletion, not adoption;
see BACKLOG.md, and check before deleting.

`npm run db:seed` writes only the 68 seed-derived rows. `upsert` merges and never deletes, so
a restore leaves the other 213 alone — but on a *fresh* project it will not recreate them.
`npm run db:media` is what puts those files in Storage in the first place, so the two stay
paired: run it after a restore.

Six bundle keys are now **typed empty views over no table at all**: `commentary`,
`commentaryRelations`, `paintingExhibitions`, `paintingHistoricalContext`,
`historicalEvents`, `scholarship`. They held 0 rows, and the tables were retired rather
than kept as furniture. The keys survive so `DEFS` in `build-data.mjs` and the dormant
sections of `components/Relations.tsx` resolve unchanged. When the archive actually has
commentary or scholarship to record, the table comes back as a real one — introduced
because content requires it, not in advance of it.

**Two tables are partitioned, and the partitions are load-bearing.** `artworks.artwork_type`
splits `'drawing'` (25, → `archiveObjects`) from `'painting'` (0, → `paintings`), and
`articles.article_type` splits the containers from `'press_notice'`. That is what keeps
`counts.worksOnPaperCatalogued = 25` and `counts.paintings = 0` from ever being added
together — the merge into one table must not make summing them easy.

**Do not "finish" the consolidation by deleting `publications`, `places` or `collections`.**
A seven-table proposal in circulation says to; it has nowhere to put them and did not
account for what the site renders. `/places/*` is 26 pages, `/archive/publications/*` is 31,
`/archive/` groups by collection, and `artwork_mention_places` carries 37 role-typed
attestations — a place a work *depicts* is not a place it was *shown*. `profiles` is not
mentioned in that document at all, and dropping it locks every curator out.

**`AttestedWork` is not `Painting`, and the distinction is the point.** An attested work is a
painting a source *names* — box 2 is Sievan's own sketches of finished canvases, annotated
with title, size, medium, price and sometimes the buyer. 57 of them across 24 sheets. The
archive holds the sheets, not the paintings, so these are evidence toward the catalogue and
never entries in it: separate id space (`MS-AW-#####`), separate URL space, and counts that
are never added together. Each row carries the verbatim words it rests on, and
`check-quotes.mjs` fails the build if a quote is not present in its source's own text.

**`ArchiveObject.artwork` is what promotes a row into a catalogue entry.** Present on the
25 box-2 drawings and nothing else; `build-data.mjs` fails if it sits on a row whose
`object_type` is not `work_on_paper`, and fails if `artwork.signed` is not verbatim in that
row's `raw_title_description`. These rows are works of art *and* archive objects — they get
one canonical URL (`/archive/objects/<id>/`), which switches its title and back-link to the
Catalogue Raisonné when `artwork` is set. `counts.worksOnPaperCatalogued` is 25;
**`counts.paintings` stays 0** and is the archive's one honest statement of what it lacks.
Never add the two together.

**The five periods place 26 of 98 artwork records, and the other 72 are the point.**
`/works/periods/` orders four *different grades of evidence* — a plate the catalogue
printed, a reproduction a gallery printed, a sheet the estate holds, and a painting
Sievan merely named — and `contentsForPeriod` returns them as four fields for exactly
that reason. **Never sum them into one number**; it is the same rule as above. Only
`date_basis: 'stated_on_source'` places a work: an inferred year is shown on its record
and labelled there, but it is not evidence and does not enter a period. Box 2's sheets
are 24-of-25 undated, so the *medium* grouping on `/works/` stays — it is the only spine
those rows support, and the period route is the second way in, not a replacement.

`Place` is a gazetteer of the towns, rivers, galleries and institutions the evidence names.
Slug ids, like `Person` and `Exhibition`, because it is an authority term the archive
normalises rather than a thing it holds. **A place nothing points at fails `check-data.mjs`
as an orphan** — the gazetteer is a record of where the evidence goes, not a directory of
geography. No coordinates and no map: `"croton?"`, Sievan's own note, is not a thing you can
put a pin in.

`Painting` is the declared hub of the model. Three tables key on it directly — `Commentary`
(`painting_ids`), `PaintingExhibition` and `PaintingHistoricalContext` — and
`CommentaryRelation` is blocked behind `Commentary`, so four of the seven empty tables cannot
be populated until the catalogue exists. `components/Relations.tsx` renders three sections
that return `null` today for exactly this reason: finished code waiting on rows.

### `derived` — indexes built once, at build time

`facets` (decade / publication / author / objectType) · `articlesByObject` ·
`articlesByPublication` · `articlesByAuthor` · `exhibitionsByObject` ·
**`articlesByExhibition`** and **`exhibitionsByArticle`** (inferred — see below) ·
`personMentions` · **`personTranscriptMentions`** (heuristic — see below) ·
`attestationsByObject` · `attestationsByPlace` (role-typed) ·
`exhibitionsByPlace` · `placeChildren` · `placeUsage` · **`attestationsByTitleKey`**
(heuristic — see below) · `undatedAttestations` · `publicationMergeGroups` ·
`timeline` (136 events) · `undatedVideos` · `objectsWithImagery` · `coverByObject` ·
`clips` · `clipsByVideo` · `counts`.

Four of these are heuristics, not facts, and the UI says so:

- **`personMentions`** matches each person's name and aliases against object
  descriptions, whole-word. Labelled *mentioned*, never *authored* — a string match cannot
  prove authorship.
- **`personTranscriptMentions`** runs the same matcher over the transcript paragraphs, and
  is the weakest of the four because it is the only one over running speech. Two limits
  keep it honest. **Full names and aliases only, never surnames** — surnames were tried and
  all eight hits were wrong: "Klein" is Franz Kline, spelled Klein by whoever typed the
  transcript, not the critic Ellen Lee Klein; "Paris" is the city in all four occurrences,
  not Jeanne Paris; "Campbell" is Warhol's soup can. Full names lose nothing, finding Hilton
  Kramer in the same sentence "Kramer" would have reached. And **paragraphs only, never
  `page.speakers`** — that is the margin column PDF extraction dislocated to the foot of the
  page and cannot be aligned to the text, so the claim is *named on this page* and never
  *said this*. A person already carried as the interview's `subject_person_ids` is skipped.
  Three people, seven interviews: Sievan across all five transcripts, Hilton Kramer in
  Solman's, Ivan Karp in Barnet's.

  Headlines were examined for the same treatment and deliberately left out. All 15 hits are
  Sievan and every one already appears verbatim in the parent object's
  `raw_title_description`, because `parse_manifest.py` builds both fields from the same
  manifest line — so `personMentions` already carries them and a headline index would only
  duplicate rows.
- **`articlesByExhibition` / `exhibitionsByArticle`** connect press to shows, which are
  **disjoint in the source data**: `NewsArticle.exhibition_id` is set on 0 of 60 articles and
  `Exhibition.source_article_ids` on 0 of 15 exhibitions. A pair is made only when the notice
  falls in the exhibition's year *and* a distinctive token of the venue name appears in the
  clipping's own text. Generic words are excluded, which is why "Contemporary Arts" and
  "National Arts Club" produce no links at all — that is the correct answer, not a bug.
  (Sievan's own sheet `MS-AR-00068` names Contemporary outright, which the heuristic could
  never have done; that link comes from a curated attestation, not from this index.)
- **`attestationsByTitleKey`** groups normalised titles that occur on more than one sheet.
  Presented as an open question, never a merge: "Birchland #1" on `MS-AR-00057` and
  "BIRCHLAND BII" on `MS-AR-00066` may be one painting, two, or a series, and nothing in the
  pipeline decides. Only a curator may, in a `notes` field.
  Currently 21 articles across 5 exhibitions.

### Schema gotchas

- **Archive objects live in `seed_archive_objects.json`**, covering every box. They used
  to sit inside `seed_news_articles.json` as `{archive_objects, news_articles}`; both are
  now plain arrays like every other seed. `parse_manifest.py` still writes the old
  combined shape, so `build-data.mjs` fails on a duplicate object id rather than
  silently ingesting box 1 twice.
- Id patterns are enforced: `MS-AR-#####`, `MS-VI-#####`, `MS-PA-#####`, `MS-SC-#####`.
  ajv rejects anything else and names the offending record.
- `MS-AR-00003` has two scan files (`I`/`II`); `MSAR00025` is a JPG not a PDF; `MSAR00026`
  is 29 MB / 15 pages and is linked rather than inlined; 21 objects have no scan at all
  (box-1 rows 31–50, plus `MS-AR-00076`, which the curator recorded as deliberately not
  scanned rather than merely pending).

