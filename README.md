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

Live at [web-three-olive-55.vercel.app](https://web-three-olive-55.vercel.app) —
the production URL of the linked Vercel project (`web`), which auto-deploys on push to
`main`. Note `the-sievan-experience.vercel.app` is **not** this project and still serves
the pre-revamp site; no custom domain is attached here yet.

---

**Before changing anything, read [CLAUDE.md](./CLAUDE.md)** — the architecture, the build-time
data pipeline, the conventions this archive is held to, and the several ways this repo can
report a passing build while being broken.

Outstanding work is tracked in [BACKLOG.md](./BACKLOG.md).
