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

Live at [sievan-archive.vercel.app](https://sievan-archive.vercel.app), the Vercel project
`sievan-archive`, which auto-deploys on push to `main`. The original generated alias
`web-three-olive-55.vercel.app` still resolves to the same deployments.

`the-sievan-experience.vercel.app` is **not** this project — it belongs elsewhere and still
serves the pre-revamp site. A custom domain is planned but not yet attached.

---

**Before changing anything, read [CLAUDE.md](./CLAUDE.md)** — the architecture, the build-time
data pipeline, the conventions this archive is held to, and the several ways this repo can
report a passing build while being broken.

Outstanding work is tracked in [BACKLOG.md](./BACKLOG.md).
