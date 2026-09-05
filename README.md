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

## The design layer

`design/` is **vendored** from [lalaf02/sievan-design](https://github.com/lalaf02/sievan-design),
which is where it is authored and reviewed, and which the public site and the
curator admin both consume so they cannot drift apart.

It is copied in rather than installed as a dependency. That repo is private, and
a private git dependency cannot be fetched inside a Vercel build container
without a token — a setup whose failure modes are all invisible locally: npm
rewrites git URLs on its own, `npm ci` treats the resulting mismatch as fatal,
`git config` silently keeps only the last of several same-key rewrites, and
`vercel.json` rejects any key outside its schema. Vendoring removes every one of
them. There is no token, and no `vercel.json`.

To change the design: edit it in `sievan-design`, then here run

```bash
npm run design:sync    # copy it in and re-stamp design/MANIFEST.json
```

and commit the result. `npm run design:check` runs on every build and **fails**
if `design/` has been edited in place — which is vendoring's one real hazard,
since an edit made there is silently lost on the next sync.
