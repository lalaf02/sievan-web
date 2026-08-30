@AGENTS.md

# The Maurice Sievan archive

The estate's record of the American painter **Maurice Sievan (1898–1981)**.
Next 16 · React 19 · TypeScript · **zero UI dependencies** (`next`, `react`, `react-dom`).
`output: 'export'` — 265 plain HTML pages that must still open from a USB stick in twenty
years. The archive lives in Supabase and is read once, at build time; the site has no
backend.

**Its credibility is the product.** Sievan was written out of the canon, and the whole
argument here is that the evidence can be checked. When in doubt, state the gap.

## Commands

```bash
npm run data        # Supabase -> data/. Must print the record-count line
npm run typecheck
npm run lint        # warnings are findings
npm run build       # -> out/; postbuild runs check-export
```

## Non-negotiable

Each exists because of a specific failure, and a rule without its reason gets discarded by
the next person. **Read the chapter before working against a rule.**

- **Never fabricate a record** — not a placeholder painting, a sample citation or an
  invented date. Use `Pending` and `Absent`. → [editorial](docs/editorial.md)
- **Never present a heuristic as a fact.** Label inferred edges and show the working.
  → [editorial](docs/editorial.md)
- **`counts.paintings` is 0.** Never add it to `worksOnPaperCatalogued`, and never render
  one total across the four grades of evidence. → [data-pipeline](docs/data-pipeline.md)
- **No box or folder identifier in user-facing text** — no `MS-CS-00N`, no "box 2".
  → [editorial](docs/editorial.md)
- **Caveat text is never retyped at a call site.** One constant, one component.
  → [editorial](docs/editorial.md)
- **Everything must read without JavaScript.** Use `lib/useUrlState.ts`, never
  `useSearchParams`. → [frontend](docs/frontend.md)
- **Never hand-edit `data/archive.generated.json`.** It is output; edit the source and
  re-run. → [data-pipeline](docs/data-pipeline.md)
- **Values off the closed scales are findings.** Type, space, width, and the four
  breakpoints 1020 / 860 / 620 / 560. → [design-system](docs/design-system.md)
- **A green terminal is not verification here.** Fourteen documented ways this repo reports
  a pass while broken. → [verification](docs/verification.md)
- **Stage explicit paths — never `git add -A`.** ~25 GB is gitignored inside this repo.
  → [verification](docs/verification.md)

## Read before you work

| Doing this | Read first |
|---|---|
| Anything at all, first time in | [docs/architecture.md](docs/architecture.md) |
| Writing user-facing text, or curating records | [docs/editorial.md](docs/editorial.md) |
| Editing routes, components or rendering | [docs/frontend.md](docs/frontend.md) |
| Touching any CSS | [docs/design-system.md](docs/design-system.md) |
| Schema, seeds, Supabase, ingesting a box | [docs/data-pipeline.md](docs/data-pipeline.md) |
| **Before reporting anything as working or done** | [docs/verification.md](docs/verification.md) |

`app/`, `components/` and `scripts/` each carry their own `CLAUDE.md` with the rules that
fail silently in that directory. Outstanding work is in [BACKLOG.md](./BACKLOG.md).
