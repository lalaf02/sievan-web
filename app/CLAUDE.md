# app/

25 routes across five tabs. Full map: [docs/architecture.md](../docs/architecture.md).
Rules and reasons: [docs/frontend.md](../docs/frontend.md).

**The two content tabs divide by subject, and the division is load-bearing.**
`/life/` is the man, the record and its reception. `/works/` is the art itself. Do not put
artwork imagery on `/life/`, and do not put CV or reception material on `/works/`.

**Everything must read without JavaScript.** Never `useSearchParams`; use
`lib/useUrlState.ts`.

**Respect the static export.** No `next/image` optimisation, no route handlers, no
middleware. A dynamic route whose `generateStaticParams` returns `[]` fails the build.

**Route segment config must be statically analysable.** Declare
`export const dynamicParams = false` in the route file itself — Next 16 rejects a
re-exported one ("It mustn't be reexported").

**Three dynamic routes, two opposite treatments — do not unify them.**
`works/[paintingId]/` is generated and gitignored (its table is legitimately empty);
`places/[placeId]/` and `works/periods/[periodId]/` are committed, because their rows ship
in the repo.

**Use the page frames; never set a width at the call site.** `.page`, `.pageWide`
(`/life/` only), `.record`. All three carry their own top padding — do not write
`style={{ paddingTop: … }}`. Breakpoints are 1020 / 860 / 620 / 560 and nothing else.
See [docs/design-system.md](../docs/design-system.md).
