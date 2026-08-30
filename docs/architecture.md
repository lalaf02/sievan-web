# Architecture

What this project is, how its files are laid out, where it deploys, and the utilities to
reuse rather than rebuild. The data pipeline has its own chapter:
[data-pipeline.md](./data-pipeline.md).

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
account: `output: 'export'` produces 265 plain HTML pages that will open from a USB stick
in twenty years.

Next 16 (App Router) · React 19 · TypeScript · **zero UI dependencies**. The entire
production dependency list is `next`, `react`, `react-dom`. No Tailwind, no CSS-in-JS, no
component library, no date library, no search library. Styling is hand-written CSS Modules
over design tokens in `app/globals.css` — the scales, the page frames and the type
vocabulary are in [design-system.md](./design-system.md), and a value off those scales is
a finding.

Two facts explain most of the decisions in this codebase:

**The corpus is small and uneven.** 76 archive objects across two boxes (21 never
digitised), 60 press notices, 30 publications, 29 people, 15 exhibitions, 7 videos,
**0 paintings** — plus 57 attested works and 25 places. That is roughly 300 records in
total. Designs that assume volume — dense
dashboards, infinite scroll, "showing 1–20 of many" — make the archive look emptier than
it is. Design for a small, precious, incomplete collection.

**The archive's credibility is the product.** This is the estate's scholarly record of an
artist who was written out of the canon; its whole argument is that the evidence can be
checked. So the site never asserts what it cannot evidence. Gaps are stated rather than
hidden, inferred connections show their working, and nothing is ever fabricated — see
[editorial.md](./editorial.md).

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
                                        the CURATED way through the work — see the two
                                        modes below
    search/                             the other mode: one filter rail over all 98
                                        artwork records, faceted by grade of evidence
    attested/                           the 57 paintings box 2 names, each with its quote
    periods/                            the catalogue's five periods + /works/periods/[periodId]/
                                        — COMMITTED, see frontend.md
  archive/                 /archive/ .. Archives: press, objects, publications
    search/                             + site-wide search
  research/                /research/ . Access, rights, citation, bibliography
  exhibitions/             record routes, reached from within the five
  people/
  places/                  the gazetteer + /places/[placeId]/ — COMMITTED, see frontend.md
  about/method/            how the archive was made
  globals.css              design tokens + layout utilities — the design system
  *.module.css             per-route styles, colocated

components/              28 components; only 10 are client components
  ── server (18) ──
  SiteFooter  Record  Pending  PullQuote  Highlight  ScanViewer
  Relations  RelatedSection  PaintingDetail  AttestedWorkList  Mosaic
  PeriodSpine  PeriodSource  ImageSource  CatalogueEntry  NoTextLayer
  CVSource  MediaTile                     SheetTile/ClipTile/AbsentTile live here
  ── 'use client' (10) ──
  SiteHeader  PressBrowser  WorksBrowser  Chronology  TranscriptReader  SiteSearch
  ArtworkBrowser  ArchiveBrowser  FacetRail    the rail shared by all three browsers
  CatalogueSource                        the only overlay; see editorial.md

lib/                     16 modules, no framework code
  data  types  search  dates  useUrlState  quotes
  citation  contact  validation  retrospective  periods  plates  provenance
  facets  artworkGrades  artworkIndex

scripts/                 the build pipeline and its gates
  ── the four gates ──
  build-data.mjs  check-data.mjs  check-quotes.mjs  check-export.mjs
  ── Supabase, the source of record ──
  fetch-data.mjs  supabase.mjs  media.mjs  upload-media.mjs
  export-seeds.mjs  seed-supabase.mjs      the escape hatch; they are inverses
  check-parity.mjs                         run on ANY schema change
  sync-migrations.mjs
  ── one-offs, output committed ──
  extract-scans.mjs  extract-clips.mjs  extract-retrospective.mjs

data/                    GENERATED, COMMITTED — archive.generated.json + transcripts/
public/scans/            GENERATED, COMMITTED — 171 MB. 56 scans (55 PDFs and one
                         JPG) + 87 page images + 87 thumbs
public/retrospective/    committed — 15 catalogue page scans
public/clips/            committed — 12 silent video loops (4.8 MB) + their posters

DataModel/               staging + parsers — gitignored. NOT the source of record;
                         Supabase is. Only seed-supabase.mjs reads it, as its default
                         --from path
MS-CS-001/               box 1's scans — gitignored, 88 MB
MS-CS-002/               box 2's scans — gitignored, 44 MB
Video Archive/           the masters — gitignored, 25 GB
```

**Why generated output is committed.** The `MS-CS-00N/` boxes and `Video Archive/` total
~25 GB and never leave the curator's machine. `data/` and `public/scans/` are the build's
output *and* are checked in: they are the archive's durable copy in version control, they
let the repo be read and diffed without database access, and every change to the record
shows up as a reviewable diff. **They are not a fallback.** `build-data.mjs` requires
Supabase credentials and fails without them, on Vercel as everywhere else — see
[trap 1](./verification.md).

**One route is generated.** `app/works/[paintingId]/` is written by `build-data.mjs` when
`seed_paintings.json` has rows and deleted when it does not, because a static export refuses
a dynamic route whose `generateStaticParams` enumerates to nothing. It is gitignored, and
its body lives in `components/PaintingDetail.tsx`.


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
| `lib/facets.ts` | The facet machinery both filter rails share: `facetOf` · `facetOfMany` · `parseDims` · `largestDimension` · `normaliseMedium` · `NOT_STATED`. **`parseDims` returns `a`/`b`, not `h`/`w`** — on an attested work nothing records which figure is the height, so only `largestDimension` (orientation-independent) may drive a comparison. `normaliseMedium` folds 17 raw spellings to about 5 media; "on canvas board" names a support and no medium, so it folds to `NOT_STATED` rather than being read as oil. |
| `lib/artworkIndex.ts` | One `ArtworkRow[]` over all 98 artwork records, built at build time and passed to `ArtworkBrowser` as props — **not** in `derived`, because it is presentation-shaped. `grade` is carried on every row and `countByGrade`/`describeCounts` are what the UI prints. **There is deliberately no `total`.** |
| `lib/plates.ts` `PLATES` | The three free-standing gallery reproductions. Lived inside `app/works/page.tsx` until `/works/periods/` needed the same three. |
| `lib/provenance.ts` `IMAGE_SOURCE` + `PLATE_CREDIT` | Who made which images. `IMAGE_SOURCE` (via `components/ImageSource.tsx`) goes beside work the estate holds and photographed itself; `PLATE_CREDIT` beside the sixteen other people printed. **The boundary is the point** — see the rule in Development guidelines. `PLATE_CREDIT` had been written out verbatim in two files. |
| `components/CatalogueSource.tsx` | The retrospective typescript, quoted and openable. The repo's only `<dialog>`; degrades to an anchor into `/life/retrospective/#page-N`. |
| `components/Record.tsx` | The record-page vocabulary: `RecordHeader`, `Facts`, `Fact` (renders nothing when empty), `Verbatim`, `Absent`, `EditorialNote`, `Section`, `RecordList`. |
| `components/Pending.tsx` | A stated gap at section scale, for anything not yet in the archive. `PendingLine` for a single empty fact. |
| `components/CatalogueEntry.tsx` | One catalogue entry, shared by `/works/` and the period pages. Module scope, not declared in either page — see the static-components rule. |
| `components/PeriodSpine.tsx` | The career to scale: five bands sized by the years they cover, every dated work plotted on one as a link. A **server** component with no JavaScript at all — it is navigation, so it works with scripting off by construction. |
| `components/AttestedWorkList.tsx` | The ledger of paintings box 2 names, grouped by sheet. A **server** component: 57 rows need no filter rail, and rendering on the server satisfies the no-JavaScript rule by construction. There is deliberately no per-attestation route — each row carries `id="MS-AW-#####"` and is deep-linked as `/works/attested/#MS-AW-…`. |
| `components/RelatedSection.tsx` | Cross-links, each labelled by the relation that produced it. |
| `components/Highlight.tsx` | Wraps matches in `<mark>`. Feed it `highlightNeedles(query)`, not `tokenize(query)`. |

