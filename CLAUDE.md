@AGENTS.md

# The Maurice Sievan archive

Read this before changing anything. The repo is small but it has traps that look like
passing builds, and they are documented at the bottom under
[Gates that look like verification but are not](#gates-that-look-like-verification-but-are-not).

Outstanding work lives in [BACKLOG.md](./BACKLOG.md).

---

## Project overview

A static website over the surviving archive of the American painter **Maurice Sievan
(1898–1981)**, published by his estate. It exists so the record outlives any hosting
account: `output: 'export'` produces ~205 plain HTML pages that will open from a USB stick
in twenty years.

Next 16 (App Router) · React 19 · TypeScript · **zero UI dependencies**. The entire
production dependency list is `next`, `react`, `react-dom`. No Tailwind, no CSS-in-JS, no
component library, no date library, no search library. Styling is hand-written CSS Modules
over design tokens in `app/globals.css`.

Two facts explain most of the decisions in this codebase:

**The corpus is small and uneven.** 50 archive objects (20 of them never digitised),
60 press notices, 30 publications, 29 people, 15 exhibitions, 7 videos, **0 paintings**.
That is roughly 190 records in total. Designs that assume volume — dense dashboards, infinite
scroll, "showing 1–20 of many" — make the archive look emptier than it is. Design for a
small, precious, incomplete collection.

**The archive's credibility is the product.** This is the estate's scholarly record of an
artist who was written out of the canon; its whole argument is that the evidence can be
checked. So the site never asserts what it cannot evidence. Gaps are stated rather than
hidden, inferred connections show their working, and nothing is ever fabricated — see
[Development guidelines](#development-guidelines).

Live at [the-sievan-experience.vercel.app](https://the-sievan-experience.vercel.app),
auto-deployed on push to `main`.

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
  archive/                 /archive/ .. Archives: press, objects, publications
    search/                             + site-wide search
  research/                /research/ . Access, rights, citation, bibliography
  exhibitions/             record routes, reached from within the five
  people/
  about/method/            how the archive was made
  globals.css              design tokens + layout utilities — the design system
  *.module.css             per-route styles, colocated

components/              16 components; only 6 are client components
  ── server (10) ──
  SiteFooter  Record  Pending  PullQuote  Highlight  ScanViewer
  Relations  RelatedSection  ValidationBar  PaintingDetail
  ── 'use client' (6) ──
  SiteHeader  PressBrowser  WorksBrowser  Chronology  TranscriptReader  SiteSearch

lib/                     10 modules, no framework code
  data  types  search  dates  useUrlState  quotes
  citation  contact  validation  retrospective

scripts/                 the build pipeline and its gates
  build-data.mjs  check-data.mjs  check-quotes.mjs  check-export.mjs
  extract-clips.mjs  extract-retrospective.mjs        (one-offs, output committed)

data/                    GENERATED, COMMITTED — archive.generated.json + transcripts/
public/scans/            GENERATED, COMMITTED — 88 MB, 31 files
public/retrospective/    committed — 15 catalogue page scans
public/clips/            committed — 1.7 MB of silent video loops

DataModel/               SOURCE OF RECORD — gitignored
MS-CS-001/               the scans it points at — gitignored, 88 MB
Video Archive/           the masters — gitignored, 25 GB
```

**Why generated output is committed.** `DataModel/`, `MS-CS-001/` and `Video Archive/` total
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
MS-CS-001/Manifest/Manifest_MSCS001.xlsx ─┐
Video Archive/**                          ─┤  DataModel/scripts/*.py
                                           │  (one-shot Python import — re-running
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
| `check-data.mjs` | Broken foreign keys; scans, media and transcripts referenced but absent from disk |
| `check-quotes.mjs` | A curated quote whose anchor phrase no longer appears on the transcript page it claims |
| `check-export.mjs` | Dead internal links, and a page count that collapsed |

### The entity model

14 entity tables in the bundle. **Seven are empty**, and everything downstream of them is
dormant rather than broken:

| Populated | | Empty | |
|---|---:|---|---:|
| `archiveObjects` | 50 | `paintings` | 0 |
| `newsArticles` | 60 | `commentary` | 0 |
| `publications` | 30 | `commentaryRelations` | 0 |
| `persons` | 29 | `paintingExhibitions` | 0 |
| `exhibitions` | 15 | `paintingHistoricalContext` | 0 |
| `videoAssets` | 7 | `historicalEvents` | 0 |
| `collections` | 2 | `scholarship` | 0 |

`Painting` is the declared hub of the model. Three tables key on it directly — `Commentary`
(`painting_ids`), `PaintingExhibition` and `PaintingHistoricalContext` — and
`CommentaryRelation` is blocked behind `Commentary`, so four of the seven empty tables cannot
be populated until the catalogue exists. `components/Relations.tsx` renders three sections
that return `null` today for exactly this reason: finished code waiting on rows.

### `derived` — indexes built once, at build time

`facets` (decade / publication / author / objectType) · `articlesByObject` ·
`articlesByPublication` · `articlesByAuthor` · `exhibitionsByObject` ·
**`articlesByExhibition`** and **`exhibitionsByArticle`** (inferred — see below) ·
`personMentions` · `publicationMergeGroups` · `timeline` (125 events) · `undatedVideos` ·
`counts`.

Two of these are heuristics, not facts, and the UI says so:

- **`personMentions`** substring-matches each person's name and aliases against object
  descriptions. Labelled *mentioned*, never *authored* — a string match cannot prove
  authorship.
- **`articlesByExhibition` / `exhibitionsByArticle`** connect press to shows, which are
  **disjoint in the source data**: `NewsArticle.exhibition_id` is set on 0 of 60 articles and
  `Exhibition.source_article_ids` on 0 of 15 exhibitions. A pair is made only when the notice
  falls in the exhibition's year *and* a distinctive token of the venue name appears in the
  clipping's own text. Generic words are excluded, which is why "Contemporary Arts" and
  "National Arts Club" produce no links at all — that is the correct answer, not a bug.
  Currently 21 articles across 5 exhibitions.

### Schema gotchas

- **`seed_news_articles.json` is an object**, not an array, unlike every other seed file.
- Id patterns are enforced: `MS-AR-#####`, `MS-VI-#####`, `MS-PA-#####`, `MS-SC-#####`.
  ajv rejects anything else and names the offending record.
- `MS-AR-00003` has two scan files (`I`/`II`); `MSAR00025` is a JPG not a PDF; `MSAR00026`
  is 29 MB / 15 pages and is linked rather than inlined; 20 objects have no scan at all.

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
| `lib/validation.ts`, `lib/retrospective.ts` | Synthesised evidence (museums, critics, THESIS) and the retrospective catalogue's transcribed pages + CV. |
| `components/Record.tsx` | The record-page vocabulary: `RecordHeader`, `Facts`, `Fact` (renders nothing when empty), `Verbatim`, `Absent`, `EditorialNote`, `Section`, `RecordList`. |
| `components/Pending.tsx` | A stated gap at section scale, for anything not yet in the archive. `PendingLine` for a single empty fact. |
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

**4. `check-export: OK — 205 pages`.**
`MIN_PAGES` defaults to **60** (`scripts/check-export.mjs:33`) against **205** actual pages.
All 60 press pages could vanish and it would still pass.
→ *Compare against the real number*, or raise the floor: `MIN_PAGES=200 npm run build`.

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

**10. Regex tag-stripping invents bugs.**
Stripping `<[^>]+>` from built HTML turns React's `<!-- -->` text separators into spaces, so
`(“passedoit”)` reads as `(“ passedoit ”)`.
→ *Check raw markup before "fixing" a spacing defect* found in stripped text.

**11. `git add -A` would stage ~25 GB.**
`Video Archive/` (25 G), `DataModel/` (307 M) and `MS-CS-001/` (88 M) live inside the repo and
are gitignored. **Keep them that way.** GitHub rejects the push, but only after a long upload.
→ *Stage explicit paths and audit sizes* before committing:
`git diff --cached --name-only | xargs du -h | sort -rh | head`

**12. Lint is load-bearing, not cosmetic.**
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
