# components/

28 components: **18 server, 10 client.** `'use client'` is a decision, not a default.
Full inventory and the reuse table: [docs/architecture.md](../docs/architecture.md).

Two rules here fail **silently** — every gate stays green and the bug ships.

**A client component must not import `lib/data.ts`, directly or transitively.**
`ArtworkBrowser` imported labels from `lib/artworkIndex.ts`, which imports `lib/data.ts`,
which imports the bundle. Next inlined all 234 KB of `archive.generated.json` into a
browser chunk — including the box identifiers the site does not put in front of a reader.
Typecheck, lint, `check-data` and `check-export` were all green and the page looked right.
Constants a client component needs live in a module that imports nothing:
`lib/artworkGrades.ts` beside `lib/artworkIndex.ts`, `lib/facets.ts` beside `lib/data.ts`.

```bash
grep -rl '"archiveObjects"' out/_next/static/    # must find nothing
```

**Never `useSearchParams`. Use `lib/useUrlState.ts`.**
Reading search params during render forces client rendering, which strips the archive's
content out of the prerendered HTML and replaces it with a spinner. `useUrlState`'s empty
server snapshot is load-bearing: it is what ships the *unfiltered* list in the HTML.

**Define components at module scope.** One created during render is a new type every
render, so React remounts the subtree and focus inside it is lost.
`react-hooks/static-components` catches this — lint warnings are findings.

**Caveat text is never retyped at a call site.** `CV_SOURCE`, `PERIOD_SOURCE`,
`IMAGE_SOURCE` / `PLATE_CREDIT`, `NO_TEXT_LAYER` are single exported constants with a
single rendering component each. See [docs/editorial.md](../docs/editorial.md).
