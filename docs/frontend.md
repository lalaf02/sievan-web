# How the site is built

Rules about how this site renders and routes. The archive's *editorial* rules — what it is
allowed to claim — are in [editorial.md](./editorial.md). Styling is in
[design-system.md](./design-system.md).

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

**The Catalogue Raisonné has two modes, and they are two routes on purpose.**
`/works/` is the curated way *through* the work; `/works/search/` is the way *to* one
particular work. A tab or toggle on a single route would mean the editorial page existed
only once client state said so, stripping it out of the prerendered HTML — the regression
the no-JavaScript rule exists to prevent. Both routes read with scripting off.
The search route puts all four grades of evidence in one index so a researcher need not
know whether a work is a sheet, a plate or a line on a drawing before looking for it —
which is **not** a merge: `grade` is on every row, it is the first facet in the rail, and
the results head prints counts per grade. Nothing may ever render one total for 98
records. **One grouping is sanctioned and only one:** `/works/` says "16 paintings survive
here as reproductions made by other people", summing the 3 gallery plates and the 13
typescript pages. That groups by *who made the image*, not by grade of evidence, the
sentence decomposes it into 3 and 13 in the same breath, and none of the sixteen is a
sheet the estate holds. Do not "correct" it, and do not read it as licence for any other
total. Medium is a filter there, which is why `/works/` no longer scrolls through five
medium-headed groups; reinstating those without removing the filter makes the page argue
with itself.

**Three dynamic routes, two opposite treatments — do not "simplify" them into one.**
`app/works/[paintingId]/` is *generated and gitignored* because its table is legitimately
empty. `app/places/[placeId]/` and `app/works/periods/[periodId]/` are *committed*, because
their rows ship in the repo — the gazetteer inside the committed bundle, the five periods
inside `lib/periods.ts`, a source file that can never enumerate to nothing. The cost of
committing a route is that an emptied seed becomes an opaque Next error, so `build-data.mjs`
**asserts the places seed is non-empty** and fails with a message saying what to do, instead
of deleting the directory. Generating it for symmetry would put every `/places/…` page
behind a successful data build, surfacing a failure only as dead links in `check-export`.

**Route segment config must be statically analysable.**
Next 16 rejects a re-exported `dynamicParams` ("It mustn't be reexported"). Declare
`export const dynamicParams = false` in the route file itself. This exact bug sat in
`build-data.mjs` undetected, because the route it writes only exists when paintings do.

**Compute cross-links in `build-data.mjs`, not in the client.** Indexes belong in `derived`,
where they are built once and ship inside the prerendered HTML.

**Define components at module scope.** A component created during render is a new type on
every render, so React remounts the subtree and any focus inside it is lost. Lint catches
this (`react-hooks/static-components`), which is why lint warnings are findings — see
[verification.md](./verification.md), trap 14.
