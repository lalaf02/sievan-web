@AGENTS.md

# The Maurice Sievan archive

Read this before changing anything. The repo is small but it has traps that look like
passing builds, and they are documented at the bottom under
[Gates that look like verification but are not](#gates-that-look-like-verification-but-are-not).

Outstanding work lives in [BACKLOG.md](./BACKLOG.md).

---

## Project overview

A static website over the surviving archive of the American painter **Maurice Sievan
(1898–1981)**, published by his estate.

**The two content tabs divide by subject, and the division is load-bearing.**
`/life/` is the man, the record and its **reception** — biography, chronology, the
exhibition and collection record, the witnesses. `/works/` is **the art itself** — the
25 catalogued works on paper, every surviving reproduction of a painting, and the 57
paintings the sheets name. The site once had this backwards: `/life/retrospective/`
described itself as *"the only place in [the archive] where the paintings themselves can
be seen"*, and `/works/` said *"No works are catalogued yet"* while showing 25 of Sievan's
drawings. Do not put artwork imagery on `/life/`, and do not put CV or reception material
on `/works/`. It exists so the record outlives any hosting
account: `output: 'export'` produces ~231 plain HTML pages that will open from a USB stick
in twenty years.

Next 16 (App Router) · React 19 · TypeScript · **zero UI dependencies**. The entire
production dependency list is `next`, `react`, `react-dom`. No Tailwind, no CSS-in-JS, no
component library, no date library, no search library. Styling is hand-written CSS Modules
over design tokens in `app/globals.css`.

Two facts explain most of the decisions in this codebase:

**The corpus is small and uneven.** 76 archive objects across two boxes (21 never
digitised), 60 press notices, 30 publications, 29 people, 15 exhibitions, 7 videos,
**0 paintings**. That is roughly 215 records in total. Designs that assume volume — dense
dashboards, infinite scroll, "showing 1–20 of many" — make the archive look emptier than
it is. Design for a small, precious, incomplete collection.

**The archive's credibility is the product.** This is the estate's scholarly record of an
artist who was written out of the canon; its whole argument is that the evidence can be
checked. So the site never asserts what it cannot evidence. Gaps are stated rather than
hidden, inferred connections show their working, and nothing is ever fabricated — see
[Development guidelines](#development-guidelines).

### Where it deploys

| | |
|---|---|
| Live | [sievan-archive.vercel.app](https://sievan-archive.vercel.app) |
| Vercel project | `sievan-archive` (called `web` until Aug 2026) |
| Scope | team `lalas-projects-d5f6f75a` — **not** a personal scope |
| Dashboard | [vercel.com/lalas-projects-d5f6f75a/sievan-archive](https://vercel.com/lalas-projects-d5f6f75a/sievan-archive) |
| Git | `lalaf02/sievan-web`, auto-deploys on push to `main` |
| Node on Vercel | 24.x |
| Legacy alias | `web-three-olive-55.vercel.app` — still resolves to the same deployments |

Two things that have already cost an afternoon between them:

- **The dashboard hides it if you are in the wrong scope.** The project sits under the team,
  and it was named `web` until recently, so searching for "sievan" found nothing. If you
  cannot see the project, check the scope switcher before assuming a deploy failed.
- **`the-sievan-experience.vercel.app` is a different Vercel account** and still serves the
  pre-revamp site. It is not reachable from the `laurynfuld2021@gmail.com` login — querying
  both the team and personal scopes returns only `sievan-archive`, `penn-advisor` and
  `frontend`. Two public copies of this archive therefore exist; see BACKLOG.md.

**Renaming a Vercel project does not change its URL.** The generated alias is fixed at
creation, so `sievan-archive.vercel.app` had to be added explicitly as a project domain after
the rename.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # -> out/
```

---

## Architecture — file structure

```
app/                     Five tabs, plus record routes beneath them
  page.tsx                 / .......... Home: the asymmetric landing mosaic
  life/                    /life/ ..... Life and Work: biography, chronology,
    interviews/                         exhibitions, people
    retrospective/
  works/                   /works/ .... Catalogue Raisonné (no paintings yet)
    attested/                           the 57 paintings box 2 names, each with its quote
    periods/                            the catalogue's five periods + /works/periods/[periodId]/
                                        — COMMITTED, see below
  archive/                 /archive/ .. Archives: press, objects, publications
    search/                             + site-wide search
  research/                /research/ . Access, rights, citation, bibliography
  exhibitions/             record routes, reached from within the five
  people/
  places/                  the gazetteer + /places/[placeId]/ — COMMITTED, see below
  about/method/            how the archive was made
  globals.css              design tokens + layout utilities — the design system
  *.module.css             per-route styles, colocated

components/              17 components; only 6 are client components
  ── server (10) ──
  SiteFooter  Record  Pending  PullQuote  Highlight  ScanViewer
  Relations  RelatedSection  ValidationBar  PaintingDetail  AttestedWorkList
  PeriodSpine  PeriodSource  CatalogueEntry
  ── 'use client' (6) ──
  SiteHeader  PressBrowser  WorksBrowser  Chronology  TranscriptReader  SiteSearch

lib/                     12 modules, no framework code
  data  types  search  dates  useUrlState  quotes
  citation  contact  validation  retrospective  periods  plates

scripts/                 the build pipeline and its gates
  build-data.mjs  check-data.mjs  check-quotes.mjs  check-export.mjs
  extract-scans.mjs  extract-clips.mjs  extract-retrospective.mjs
                                                     (one-offs, output committed)

data/                    GENERATED, COMMITTED — archive.generated.json + transcripts/
public/scans/            GENERATED, COMMITTED — 150 MB, 56 PDFs + 102 page images
public/retrospective/    committed — 15 catalogue page scans
public/clips/            committed — 1.7 MB of silent video loops

DataModel/               SOURCE OF RECORD — gitignored
MS-CS-001/               box 1's scans — gitignored, 88 MB
MS-CS-002/               box 2's scans — gitignored, 44 MB
Video Archive/           the masters — gitignored, 25 GB
```

**Why generated output is committed.** `DataModel/`, the `MS-CS-00N/` boxes and
`Video Archive/` total
~25 GB and never leave the curator's machine. `data/` and `public/scans/` are the build's
output *and* are checked in, which is what lets Vercel build without any source material —
`build-data.mjs` detects the missing `DataModel/` and falls through to the committed bundle.

**One route is generated.** `app/works/[paintingId]/` is written by `build-data.mjs` when
`seed_paintings.json` has rows and deleted when it does not, because a static export refuses
a dynamic route whose `generateStaticParams` enumerates to nothing. It is gitignored, and
its body lives in `components/PaintingDetail.tsx`.

---

## Backend architecture

**There is no backend.** No server, no database, no API routes, no auth, no runtime data
fetching. The word "backend" here means a build-time pipeline, and that pipeline is the part
of this repo most worth understanding.

```
DataModel/Archive Master Sheet.xlsx       ─┐  (six tabs, one per physical box)
MS-CS-001/Manifest/Manifest_MSCS001.xlsx  ─┤  DataModel/scripts/*.py
Video Archive/**                          ─┤  (one-shot Python import — re-running
                                           │   OVERWRITES curator corrections)
                                           ▼
                        DataModel/seed/*.json          ← THE SOURCE OF RECORD
                                           │
                                           │  ajv (draft 2020-12) against
                                           │  DataModel/data_model.schema.json
                                           │  additionalProperties: false everywhere
                                           ▼
                        scripts/build-data.mjs
                                           │  · validates every row, fails on the offending id
                                           │  · parses transcripts into pages/paragraphs
                                           │  · derives facets, timeline, cross-link indexes
                                           │  · stats + copies scans into public/scans/
                                           │  · writes or deletes app/works/[paintingId]/
                                           ▼
        data/archive.generated.json  +  data/transcripts/*.json     ← COMMITTED
                                           │
                                           │  plain `import` at build time. Never fetched.
                                           ▼
                 lib/data.ts → Server Components → static HTML in out/
```

Then three gates, in order — `npm run data` runs the first two, `npm run build` the third:

| Gate | Catches |
|---|---|
| `check-data.mjs` | Broken foreign keys; scans, media and transcripts referenced but absent from disk; a place nothing points at; a `parent_id` cycle |
| `check-quotes.mjs` | A curated quote whose anchor phrase no longer appears on the transcript page it claims — **and an attested work whose verbatim quote is not in its source's own text** |
| `check-export.mjs` | Dead internal links, and a page count that collapsed |

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

**Ingesting a box** is three commands and a look:

```bash
# 1. gitignore /MS-CS-00N/ FIRST, then copy the scans in beside MS-CS-001/
python3 DataModel/scripts/parse_master_sheet.py MS-CS-00N   # merges; never overwrites
node scripts/extract-scans.mjs                              # rasterises every box
npm run data
```

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

16 entity tables in the bundle. **Seven are empty**, and everything downstream of them is
dormant rather than broken:

| Populated | | Empty | |
|---|---:|---|---:|
| `archiveObjects` | 76 | `paintings` | 0 |
| `newsArticles` | 60 | `commentary` | 0 |
| `attestedWorks` | 57 | `commentaryRelations` | 0 |
| `publications` | 30 | `paintingExhibitions` | 0 |
| `persons` | 29 | `paintingHistoricalContext` | 0 |
| `places` | 25 | `historicalEvents` | 0 |
| `exhibitions` | 15 | `scholarship` | 0 |
| `videoAssets` | 7 | | |
| `collections` | 3 | | |

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
`personMentions` · `attestationsByObject` · `attestationsByPlace` (role-typed) ·
`exhibitionsByPlace` · `placeChildren` · `placeUsage` · **`attestationsByTitleKey`**
(heuristic — see below) · `undatedAttestations` · `publicationMergeGroups` ·
`timeline` (136 events) · `undatedVideos` · `objectsWithImagery` · `coverByObject` ·
`clips` · `clipsByVideo` · `counts`.

Three of these are heuristics, not facts, and the UI says so:

- **`personMentions`** substring-matches each person's name and aliases against object
  descriptions. Labelled *mentioned*, never *authored* — a string match cannot prove
  authorship.
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

---

## Key utilities — reuse these, do not rebuild them

| Module | What it is for |
|---|---|
| `lib/data.ts` | Every accessor: `getObject`, `allArticles`, `articlesForPublication`, `loadTranscript()`… **Nothing else should read the bundle directly.** |
| `lib/search.ts` | `normalize` · `tokenize` · `scoreFields` (weighted, AND semantics) · `highlightNeedles` · `needleRegex` · `highlightSegments`. **Do not add a search library** — the corpus is ~190 records and what matters is controlling which field a hit came from. |
| `lib/useUrlState.ts` | Filter state in the URL via `useSyncExternalStore`. The empty server snapshot is load-bearing; see the JS rule below. |
| `lib/dates.ts` | Models *precision*, not instants — `formatPartial`, `formatRange`, `decadeOf`, `formatDuration`. Dates here are often just a year, or a range, or unknown. No date library. |
| `lib/quotes.ts` | 22 curated quotes, each with a verified transcript `page` and `anchor`. `quoteHref()` builds a link that opens the reader with the passage highlighted. |
| `lib/citation.ts` | Formats archive records as footnote-ready references, explicit about missing headlines and bylines. |
| `lib/contact.ts` | The estate's contact details, in one place. `mailtoHref(subject)`. |
| `lib/retrospective.ts` `CV` + `CV_SOURCE` | The catalogue's page-8 CV, verbatim, and **the one caveat that must accompany every rendering of it** — render it with `components/CVSource.tsx`, never by writing the sentence again. It had been written out three times in three wordings. |
| `lib/validation.ts` `MUSEUM_COLLECTIONS` | **Derived from `CV.museumCollections`**, not a parallel list — keyed on the exact CV string and throwing at module scope on a miss, so correcting the transcription can never silently drop an institution. |
| `lib/validation.ts`, `lib/retrospective.ts` | Synthesised evidence (museums, critics, THESIS) and the retrospective catalogue's transcribed pages + CV. |
| `lib/periods.ts` `PERIODS` | The catalogue's five career periods, **derived from `RETROSPECTIVE_PAGES`** and keyed on each heading verbatim — same discipline as `MUSEUM_COLLECTIONS`, and it throws at module scope on a miss. The **year ranges are the archive's, not the catalogue's**, whose divisions overlap at 1930 and across the '60s; `PERIOD_SOURCE` is the one caveat that must accompany every range, rendered via `components/PeriodSource.tsx` and never retyped. Two more module-scope gates: every plate year must fall inside its own period, and the five ranges must tile the career with no gap and no overlap. |
| `lib/plates.ts` `PLATES` | The three free-standing gallery reproductions. Lived inside `app/works/page.tsx` until `/works/periods/` needed the same three. |
| `components/Record.tsx` | The record-page vocabulary: `RecordHeader`, `Facts`, `Fact` (renders nothing when empty), `Verbatim`, `Absent`, `EditorialNote`, `Section`, `RecordList`. |
| `components/Pending.tsx` | A stated gap at section scale, for anything not yet in the archive. `PendingLine` for a single empty fact. |
| `components/CatalogueEntry.tsx` | One catalogue entry, shared by `/works/` and the period pages. Module scope, not declared in either page — see the static-components rule. |
| `components/PeriodSpine.tsx` | The career to scale: five bands sized by the years they cover, every dated work plotted on one as a link. A **server** component with no JavaScript at all — it is navigation, so it works with scripting off by construction. |
| `components/AttestedWorkList.tsx` | The ledger of paintings box 2 names, grouped by sheet. A **server** component: 57 rows need no filter rail, and rendering on the server satisfies the no-JavaScript rule by construction. There is deliberately no per-attestation route — each row carries `id="MS-AW-#####"` and is deep-linked as `/works/attested/#MS-AW-…`. |
| `components/RelatedSection.tsx` | Cross-links, each labelled by the relation that produced it. |
| `components/Highlight.tsx` | Wraps matches in `<mark>`. Feed it `highlightNeedles(query)`, not `tokenize(query)`. |

---

## Development guidelines

Each rule exists because of a specific failure. The reason is the point — a rule without it
gets discarded by the next person.

**Everything must read without JavaScript.**
Use `lib/useUrlState.ts`, never `useSearchParams`. Reading search params during render forces
the component to be client-rendered, which strips the archive's content out of the prerendered
HTML and replaces it with a spinner. The server snapshot in `useUrlState` is deliberately
empty so the *unfiltered* list is what ships in the HTML. This regression is easy to
reintroduce and nearly invisible in review.

**Respect the static export.**
No `next/image` optimisation (needs a server), no route handlers, no middleware. A dynamic
route whose `generateStaticParams` returns `[]` fails the build — that is why the painting
route is generated rather than committed.

**Three dynamic routes, two opposite treatments — do not "simplify" them into one.**
`app/works/[paintingId]/` is *generated and gitignored* because its table is legitimately
empty. `app/places/[placeId]/` and `app/works/periods/[periodId]/` are *committed*, because
their rows ship in the repo — the gazetteer inside the committed bundle, the five periods
inside `lib/periods.ts`, a source file that can never enumerate to nothing. Making places generated for symmetry would break Vercel: `build-data.mjs` exits
early there (no `DataModel/`), so the route file would never be written and every
`/places/…` link would 404 — surfacing only as dead links in `check-export`. `build-data.mjs`
asserts the places seed is non-empty instead of deleting the directory.

**Route segment config must be statically analysable.**
Next 16 rejects a re-exported `dynamicParams` ("It mustn't be reexported"). Declare
`export const dynamicParams = false` in the route file itself. This exact bug sat in
`build-data.mjs` undetected, because the route it writes only exists when paintings do.

**Never fabricate a record.**
Not a placeholder painting, not a sample citation, not an invented date. In a catalogue
raisonné a fake row is indistinguishable from provenance, and this site is the estate's
public record. Use `Pending` for a missing section and `Absent` for a missing item; both
name what is absent and what would fill it.

**Label inferred edges as inferred, and show the working.**
`articlesByExhibition` displays the venue token that produced the match. If a connection
cannot be evidenced, either label it honestly ("Elsewhere in 1957") or leave it out. Never
present a heuristic as a fact.

**There is no topic vocabulary.** `VideoAsset.topics` is empty on all 7 videos and no subject
tags exist anywhere, so "related by topic" cannot be built. Do not fake it with keyword
overlap.

**Never hand-edit `data/archive.generated.json`.** Edit the seed file and re-run `npm run data`.
The bundle is output.

**Compute cross-links in `build-data.mjs`, not in the client.** Indexes belong in `derived`,
where they are built once and ship inside the prerendered HTML.

**Define components at module scope.** A component created during render is a new type on
every render, so React remounts the subtree and any focus inside it is lost. Lint catches
this — see below.

---

## UI testing on localhost before committing

This is the step most often skipped, and the one that catches what the automated gates cannot.

**Test the artifact, not the dev server.** `next dev` behaves differently from a static
export; the README's own instruction is to check the real thing.

```bash
npm run build
cd out && python3 -m http.server 8765     # then http://localhost:8765/
```

Screenshot it headlessly — note the flag, because the obvious alternative fails silently:

```bash
# --disable-javascript works.
# --blink-settings=scriptEnabled=false writes NO file and still exits 0.
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
  --hide-scrollbars --screenshot=shot.png --window-size=1440,2000 \
  --virtual-time-budget=6000 http://localhost:8765/
```

Check each changed page three ways: **normal**, **JavaScript disabled**, and **narrow**
(≤860px, the one breakpoint in `globals.css`).

Minimum sweep before a commit that touches the UI:

- [ ] The five tabs: `/`, `/life/`, `/works/`, `/archive/`, `/research/`
- [ ] One record page (`/archive/press/MS-AR-00003-C/`) — related sections render and are labelled
- [ ] A drawing (`/archive/objects/MS-AR-00054/`) — recto **and** verso render the right way up
- [ ] `/archive/objects/MS-AR-00076/` — states its scan is absent by decision, not by backlog
- [ ] `/works/` — three plates render (confirm `MSAR00029-p01`, *Oombix*, is not rotated
      and its printed caption is legible at tile size), 25 entries across 5 medium groups,
      every entry title distinct
- [ ] **Read `/works/` cold and ask: how many paintings does this archive have a catalogue
      entry for?** The answer must be **none** — 25 works on paper are catalogued, no
      paintings are. Every gate is green either way; this is the only check that catches it
- [ ] `/life/` — no artwork imagery, the CV in three columns, one `CVSource` caveat
- [ ] `/works/periods/` — five periods in order, per-kind counts, never one total
- [ ] **Read `/works/periods/` cold and ask: is the career mapped?** The answer must be
      **no** — 26 of 98 artwork records carry a year. Every gate is green either way
- [ ] `/works/periods/beginnings/` — the thinnest: 3 catalogue plates and three stated
      gaps. It must read as a stated gap, not as a page that failed to load
- [ ] Walk all five prev/next links end to end — no year range without its `PeriodSource`
- [ ] `/works/attested/` — 57 rows, quotes in mono, every row links to its sheet; and the
      opening paragraph still reads as "the catalogue has none of these"
- [ ] `/places/` and the thinnest place page — a stub that says nothing should be folded
      into its parent
- [ ] `/archive/search/` — with JS off it must show the **complete index**, not an empty box
- [ ] A quote deep link — it must highlight **the phrase**, not every occurrence of "the"
- [ ] The home mosaic at ≤860px collapses to one column; video tiles show their posters
- [ ] Nothing invented anywhere: every empty area is a stated gap

---

## Gates that look like verification but are not

Every item below was observed in this repo. In each case the terminal was green and the thing
was broken.

**1. `npm run data` printing `skipping (DataModel not found, using committed data)`.**
Exit code 0. Looks like a pass; tested nothing. It hid a wrong `ROOT` path while every edit to
`DataModel/seed/*.json` was a silent no-op — and the build stayed green throughout.
→ *Require the record-count line* (`build-data: 50 objects · 60 articles · …`) before you
believe any later green build. The guard is still correct for Vercel, where `DataModel/` is
genuinely absent — it just cannot distinguish that from a bug.

**2. `check-data: OK — all references resolve, all scan/media/transcript files present`.**
`SKIP_FILE_CHECKS` is `!existsSync(DM)` (`scripts/check-data.mjs:20`). When `DataModel/` is
missing it reports OK having checked no files at all.
→ *The word "OK" is conditional.* Confirm the pipeline actually ran first.

**3. A green `npm run build` with 0 paintings.**
It says nothing about the catalogue. The `dynamicParams` re-export bug only surfaces once
`seed_paintings.json` has rows — a passing build with an empty table is not a test of the
populated path.
→ *Exercise empty code paths with temporary fixture rows*, confirm, then remove them. This is
how that bug was found.

**4. `check-export: OK — 231 pages`.**
`MIN_PAGES` once defaulted to **60** against 205 actual pages: all 60 press pages could
vanish and it still passed. The floor now tracks the real count (`262` against `264`,
`scripts/check-export.mjs`) — *keep raising it* when a box is ingested or a route family is
added, or the same blind spot reopens.

**5. "319 internal links all resolve."**
Resolving is not the same as being useful. That count was identical before and after a change
that added cross-link sections throughout the site.
→ *Link counts are not a coverage metric.* Open the page.

**6. `tsc --noEmit` errors naming `.next/types/validator.ts`.**
After deleting a route you will get `Cannot find module '../../app/why/page.js'`. These are
stale generated types, not real errors.
→ *Rebuild, then re-run typecheck.* Do not "fix" the source.

**7. Every automated check green while the feature is useless.**
Quote deep links all returned 200, highlighted correctly according to the code, and passed the
anchor validator — while displaying **1,116 "matches"** on a single transcript, because
highlighting split the query into tokens and lit up every "the" and "in".
→ *No gate in this repo can tell you whether a feature is good.* Look at it.

**8. Word counts in `<main>` as a proxy for "renders without JS".**
Useful as a smoke test, worthless as proof. A page can be full of words and still be broken.
→ *Actually load it with JavaScript disabled.*

**9. A missing screenshot looks like success.**
`--blink-settings=scriptEnabled=false` writes no file and exits 0. An automation loop that
does not assert the file exists will report a clean run having captured nothing.
→ *Assert on the artifact*, not the exit code.

**10. A blank headless screenshot of a `#fragment` URL is the tool, not the page.**
Chrome headless scrolls to the anchor and then fails to paint the scrolled region, so
`--screenshot` of `/works/attested/#MS-AW-00044` returns a uniformly blank image — and so
does `/life/#chronology`, which has worked since it was written. Confirm against a URL whose
anchor predates your change before believing it.
→ *Screenshot the page without the fragment*, or capture at a taller window and crop.

**11. Regex tag-stripping invents bugs.**
Stripping `<[^>]+>` from built HTML turns React's `<!-- -->` text separators into spaces, so
`(“passedoit”)` reads as `(“ passedoit ”)`.
→ *Check raw markup before "fixing" a spacing defect* found in stripped text.

**12. `git add -A` would stage ~25 GB.**
`Video Archive/` (25 G), `DataModel/` (307 M), `MS-CS-001/` (88 M) and `MS-CS-002/` (44 M)
live inside the repo and are gitignored. **Keep them that way.** GitHub rejects the push,
but only after a long upload. Gitignore a new box *before* copying it in, not after.
→ *Stage explicit paths and audit sizes* before committing:
`git diff --cached --name-only | xargs du -h | sort -rh | head`

**13. Lint is load-bearing, not cosmetic.**
`react-hooks/static-components` caught a component defined during render that would have
remounted a filter rail on every keystroke. The build passes with it; the UI misbehaves
subtly.
→ *Do not blanket-`--fix` and do not ignore warnings.*

---

## Verification checklist

```bash
npm run data        # must print record counts, not "skipping"
npm run typecheck
npm run lint        # warnings are findings
npm run build       # postbuild runs check-export
```

Then the [UI sweep](#ui-testing-on-localhost-before-committing). Then commit — with explicit
paths, never `-A`.
