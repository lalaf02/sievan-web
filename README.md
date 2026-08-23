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
serves the old site; see [CLAUDE.md](./CLAUDE.md).

---

**Before changing anything, read [CLAUDE.md](./CLAUDE.md)** — the architecture, the build-time
data pipeline, the conventions this archive is held to, and the several ways this repo can
report a passing build while being broken.

Outstanding work is tracked in [BACKLOG.md](./BACKLOG.md).
