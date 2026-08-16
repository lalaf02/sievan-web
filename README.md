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

`DataModel/` is the source of record; this site is a consumer. `npm run data` (which
`dev` and `build` run automatically) executes two scripts:

- **`scripts/build-data.mjs`** — reads the seed JSON, **validates every record against
  `data_model.schema.json` with ajv**, derives the indexes the UI needs (facets, the
  unified timeline, person mentions), copies the scans into `public/scans/`, and writes
  `data/archive.generated.json`. Edit a seed file badly and the build fails immediately
  with the offending record id.
- **`scripts/check-data.mjs`** — referential integrity. Every foreign key resolves; every
  scan, media file and transcript referenced actually exists on disk.

`scripts/check-export.mjs` runs after `build` and fails on a dead internal link or a
suspiciously small page count — the two things a passing `next build` will not catch.

Generated output (`data/`, `public/scans/`, `app/works/[paintingId]/`) is gitignored.

## When the painting catalogue arrives

Add rows to `DataModel/seed/seed_paintings.json` and images to `public/works/`. That is
the whole job:

- `/works` swaps its "in preparation" panel for the real browser (list / grid / large,
  plus **Scale** view, which enables itself once ≥80% of `dimensions` values parse as
  `H × W` — capture height and width as separate numbers if you want it).
- `build-data.mjs` mounts `app/works/[paintingId]/` from `components/PaintingDetail.tsx`.
  Static export refuses a dynamic route that enumerates to nothing, which is why the
  route is generated rather than committed.
- `<CommentarySection>`, `<ShownInSection>` and `<HistoricalContextSection>` are already
  wired into the detail page and return `null` until their join tables have rows.

## One-off scripts

`scripts/extract-retrospective.mjs` regenerates `public/retrospective/*.jpg` from
`MS-CS-001/MSAR00026.pdf` (needs `python3` + `pypdf`, and macOS `sips`). The output is
committed, so a normal build never needs it.

## Notes worth knowing

- **The scans have no text layer.** Search covers catalogue records, never the text of
  the clippings. The UI says so under the search box.
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
