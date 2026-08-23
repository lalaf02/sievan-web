# Maurice Sievan archive — website

A static site over the archive in `../DataModel/`. Next.js 16 (App Router, TypeScript),
exported to plain HTML so it can be hosted anywhere and outlive any hosting account.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # -> out/
npx serve out    # check the real artifact, not the dev server
```

## How the data gets in

`DataModel/` is the source of record; this site is a consumer. It lives **inside** this
repo, alongside `MS-CS-001/` and `Video Archive/`. `npm run data` (which `dev` and
`build` run automatically) executes three scripts:

- **`scripts/build-data.mjs`** — reads the seed JSON, **validates every record against
  `data_model.schema.json` with ajv**, derives the indexes the UI needs (facets, the
  unified timeline, person mentions), copies the scans into `public/scans/`, and writes
  `data/archive.generated.json`. Edit a seed file badly and the build fails immediately
  with the offending record id.
- **`scripts/check-data.mjs`** — referential integrity. Every foreign key resolves; every
  scan, media file and transcript referenced actually exists on disk.
- **`scripts/check-quotes.mjs`** — every curated quote in `lib/quotes.ts` claims a
  transcript page and an anchor phrase; this proves both, using the same matcher the UI
  highlights with. Without it the deep links rot silently: a reworded quote still renders
  and still links, and simply highlights nothing when a reader clicks it.

`scripts/check-export.mjs` runs after `build` and fails on a dead internal link or a
suspiciously small page count — the two things a passing `next build` will not catch.

Generated output (`data/`, `public/scans/`, `app/works/[paintingId]/`) is gitignored.

## The five tabs

`/` · `/life/` · `/works/` · `/archive/` · `/research/`, set in `components/SiteHeader.tsx`.
Exhibitions, people, the chronology, the retrospective and the method note are reached
from inside those five rather than competing at the top level.

## When the painting catalogue arrives

Add rows to `DataModel/seed/seed_paintings.json` and images to `public/works/`. That is
the whole job:

- `/works` swaps its period-and-CV panel for the real browser (list / grid / large,
  plus **Scale** view, which enables itself once ≥80% of `dimensions` values parse as
  `H × W` — capture height and width as separate numbers if you want it). Filters live in
  the URL, so a filtered catalogue view is citable.
- Ids must match `^MS-PA-[0-9]{5}$`; ajv rejects anything else with the offending row.
- `build-data.mjs` mounts `app/works/[paintingId]/` from `components/PaintingDetail.tsx`.
  Static export refuses a dynamic route that enumerates to nothing, which is why the
  route is generated rather than committed.
- `<CommentarySection>`, `<ShownInSection>` and `<HistoricalContextSection>` are already
  wired into the detail page and return `null` until their join tables have rows.

## One-off scripts

`scripts/extract-retrospective.mjs` regenerates `public/retrospective/*.jpg` from
`MS-CS-001/MSAR00026.pdf` (needs `python3` + `pypdf`, and macOS `sips`). The output is
committed, so a normal build never needs it.

`scripts/extract-clips.mjs` cuts the short silent loops in `public/clips/` out of the
video masters (needs `ffmpeg`). Also committed, also not part of a normal build. Note
there is no alignment between the transcripts and video timecode, so interview clips
cannot yet be cut to land on a given sentence — everything there is process footage.

## Notes worth knowing

- **The scans have no text layer.** Search covers catalogue records and the interview
  transcripts, never the text of the clippings. The UI says so under every search box.
- **There is no topic vocabulary.** `VideoAsset.topics` is empty on all seven videos and
  no other subject tags exist, so related-record links are labelled by the relation that
  produced them ("Elsewhere in 1957", "Probably reviews") rather than claiming a topical
  similarity nothing in the data supports.
- **Press and exhibitions are disjoint in the source.** `NewsArticle.exhibition_id` is set
  on none of the 60 articles. `build-data.mjs` infers the link from year plus a
  distinctive venue token appearing in the clipping's own text, and the UI marks those
  edges inferred. Venues whose every word is generic ("Contemporary Arts") deliberately
  produce no links at all.
- **Everything must read without JavaScript.** The browsers keep filter state in the URL
  via `lib/useUrlState.ts` (`useSyncExternalStore`, empty on the server) so the full
  unfiltered content is in the prerendered HTML. Using `useSearchParams` here would push
  the content client-side and replace it with a spinner — that regression is easy to
  reintroduce and hard to notice.
- **`seed_news_articles.json` is an object**, not an array, unlike every other seed file.
- **Scan edge cases** that break naive code: `MS-AR-00003` has two files (`I`/`II`),
  `MSAR00025` is a JPG, `MSAR00026` is 29 MB / 15 pages, and 20 objects have no scan.

## Deployment

Live at [the-sievan-experience.vercel.app](https://the-sievan-experience.vercel.app). Auto-deploys on push to `main`.
