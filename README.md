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

## Deploying

`@sievan/design` is a **private** GitHub repo consumed as an npm git dependency.
npm records it in `package-lock.json` as an ssh URL however `package.json` spells
it, and asks git for it in the scp short form (`git@github.com:owner/repo`). A
Vercel build container has no SSH key, so the install fails there and only there
— locally it works because the OS keychain quietly supplies credentials.

`vercel.json` rewrites that URL to https with a token at install time. To deploy:

> Vercel → project → Settings → Environment Variables → add `SIEVAN_DESIGN_TOKEN`,
> a fine-grained PAT with **read-only Contents on `lalaf02/sievan-design`** and
> nothing else. Set it for Production **and** Preview.

Three details in that install command are load-bearing:

- **`--add`.** All three URL spellings share one git config key, and `git config`
  replaces rather than appends. Without `--add` only the last survives — and the
  `ssh://` one npm actually asks for is the one that gets dropped.
- **`npm install`, not `npm ci`.** `ci` exits fatally when `package.json` and the
  lockfile disagree on a URL spelling, which npm causes on its own for git
  dependencies. It fails before the fetch, so it looks like a credential error.
- **No comment keys in `vercel.json`.** Its schema sets `additionalProperties:
  false`, so an unknown key (`_comment`) fails validation and kills the deploy
  before the build starts. That is why this note lives here instead.

If `sievan-design` is ever made public, delete `vercel.json` — the dependency
then resolves anonymously and no token is needed.
