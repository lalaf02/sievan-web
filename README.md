# Maurice Sievan archive — website

The surviving archive of the American painter **Maurice Sievan (1898–1981)**, published by
his estate: the press record, the exhibition history, the oral-history interviews with the
people who knew him, and — in preparation — the catalogue of works.

Built as a static site so it outlives any hosting account. Next.js 16, TypeScript, no
runtime dependencies beyond React.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # -> out/
```

Live at [sievan-archive.vercel.app](https://sievan-archive.vercel.app) — Vercel project
`sievan-archive` under the team scope `lalas-projects-d5f6f75a`
([dashboard](https://vercel.com/lalas-projects-d5f6f75a/sievan-archive)), auto-deployed on
push to `main`. Note `the-sievan-experience.vercel.app` is a different account and still
serves the old site; see [docs/architecture.md](./docs/architecture.md).

---

**Before changing anything, read [CLAUDE.md](./CLAUDE.md)** — the standing rules, and the
table routing you to the chapter you need:

| | |
|---|---|
| [docs/architecture.md](./docs/architecture.md) | what this is, the file map, deployment, the utilities to reuse |
| [docs/data-pipeline.md](./docs/data-pipeline.md) | Supabase → the committed bundle, the entity model, the gates |
| [docs/frontend.md](./docs/frontend.md) | how the site renders and routes |
| [docs/design-system.md](./docs/design-system.md) | tokens, scales, the typographic vocabulary |
| [docs/editorial.md](./docs/editorial.md) | what the archive is allowed to claim |
| [docs/verification.md](./docs/verification.md) | the UI sweep, and the ways this repo reports a passing build while broken |

Outstanding work is tracked in [BACKLOG.md](./BACKLOG.md).
