# Verification

**Read this before reporting anything in this repo as working or done.** Every trap in the
second half was observed here: the terminal was green and the thing was broken.

---

## UI testing on localhost before committing

This is the step most often skipped, and the one that catches what the automated gates cannot.

**Test the artifact, not the dev server.** `next dev` behaves differently from a static
export; the README's own instruction is to check the real thing.

```bash
npm run build
cd out && python3 -m http.server 8765     # then http://localhost:8765/
```

Screenshot it headlessly — note the flag, because the obvious alternative fails silently:

```bash
# --disable-javascript works.
# --blink-settings=scriptEnabled=false writes NO file and still exits 0.
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
  --hide-scrollbars --screenshot=shot.png --window-size=1440,2000 \
  --virtual-time-budget=6000 http://localhost:8765/
```

Check each changed page three ways: **normal**, **JavaScript disabled**, and **narrow**.
Narrow means **each of the four breakpoints the site actually uses — 1020 / 860 / 620 /
560** — not just 860. CLAUDE.md claimed for a long time that 860 was "the one breakpoint",
which was true of `globals.css` and false of the site: 1020 governs eight stylesheets and
620 five, and both went untested because this line said they did not exist. `/life/` is the
one deliberate exception at 1180 — see the Design system above.

Minimum sweep before a commit that touches the UI:

- [ ] The five tabs: `/`, `/life/`, `/works/`, `/archive/`, `/research/`
- [ ] One record page (`/archive/press/MS-AR-00003-C/`) — related sections render and are labelled
- [ ] A drawing (`/archive/objects/MS-AR-00054/`) — recto **and** verso render the right way up
- [ ] `/archive/objects/MS-AR-00076/` — states its scan is absent by decision, not by backlog
- [ ] `/works/` — opens on the compact spine and the five periods, with `PeriodSource`
      beneath them and the dating denominator in the note under it; three plates render
      (confirm `MSAR00029-p01`, *Oombix*, is not rotated and its printed caption is
      legible at tile size). **Eight** sheets are shown, not 25 — the selection rule
      ("the sheets that record the most paintings") is stated on the page and derivable,
      and all 25 are one link away in the browser. Medium is a FILTER now, not a set of
      scroll-through headings; do not reinstate the five medium groups without also
      removing the filter, or the page argues with itself
- [ ] `/works/search/` — **with JavaScript off it must show the complete unfiltered
      index**, every facet populated with counts. The results head must read
      `25 held · 3 reproduced · 13 printed · 57 named` and **never one total**: the four
      grades are four strengths of evidence and summing them is the rule
      `lib/artworkIndex.ts` is arranged around. The 13 typescript plates must show
      "not separable from the page it is printed on" where their image would be —
      a stated absence, not a broken tile
- [ ] **Read `/works/` cold and ask two questions.** *How many paintings does this archive
      have a catalogue entry for?* — must be **none**; 25 works on paper are catalogued, no
      paintings are. *Does it read as though the estate holds no images of Sievan's work?*
      — must be **no**; it photographed the sheets itself. Every gate is green either way,
      and these are the only checks that catch it
- [ ] A period page — the source reads as a quotation with a quiet citation, never as
      "what the catalogue says"; the page image and the quote both open the overlay, and
      **with JavaScript off** both are links to `/life/retrospective/#page-N`, with no
      stray slab of dialog text in the flow
- [ ] Any record page — no `Box` or `Folder` fact, and no `MS-CS-00N` anywhere on the site
      (`grep -rl "MS-CS-00" out/ | grep -v scans` must be empty)
- [ ] `/` — the hero is the `painting-portrait` clip and shows its **poster with
      JavaScript off**; no unattributed superlative anywhere (the banner reading
      "A Private Vision" is gone — the phrase survives only in Karp's transcript, where
      he actually said it); four sections, and the footer carries no inventory line
- [ ] `/life/` — uses `.pageWide`, narrative left and the record right; no artwork
      imagery; the five witnesses appear **inside the biography** beside the claims they
      support, not as a "Who was there" directory at the foot; **one `CVSource` per
      CV-derived block and no more** — it must not sit under `PEER_NETWORK`, which does
      not come from the CV
- [ ] `/archive/` — the documentary record only. The 25 drawings must NOT be here; they
      are the Catalogue Raisonné's. Their record pages stay at `/archive/objects/<id>/`
      and back-link to `/works/`. With JS off the complete 51-object list prerenders,
      and the undigitised keep their place as `AbsentTile`
- [ ] `/research/` — the fuller account the home page's last section is condensed from;
      "Where to start" and "When the site is not enough" both present
- [ ] `/works/periods/` — five periods in order, per-kind counts, never one total
- [ ] **Read `/works/periods/` cold and ask: is the career mapped?** The answer must be
      **no** — 26 of 98 artwork records carry a year. Every gate is green either way
- [ ] `/works/periods/beginnings/` — the thinnest: 3 catalogue plates and three stated
      gaps. It must read as a stated gap, not as a page that failed to load
- [ ] Walk all five prev/next links end to end — no year range without its `PeriodSource`
- [ ] `/works/attested/` — 57 rows, quotes in mono, every row links to its sheet; and the
      opening paragraph still reads as "the catalogue has none of these"
- [ ] `/places/` and the thinnest place page — a stub that says nothing should be folded
      into its parent
- [ ] `/archive/search/` — with JS off it must show the **complete index**, not an empty box
- [ ] A quote deep link — it must highlight **the phrase**, not every occurrence of "the"
- [ ] The home mosaic at ≤860px collapses to one column; video tiles show their posters
- [ ] Nothing invented anywhere: every empty area is a stated gap

---

## Gates that look like verification but are not

Every item below was observed in this repo. In each case the terminal was green and the thing
was broken.

**1. A gate that silently skips its own work. FIXED — do not reintroduce.**
`build-data.mjs` used to exit 0 printing `skipping (DataModel not found, using committed
data)`. It hid a wrong `ROOT` path while every seed edit was a silent no-op, and the build
stayed green throughout. That fallback is **gone**: `build-data.mjs` calls
`requireCredentials()` at module scope and fails with instructions when Supabase is
unreachable. There is no local source and no fallback, on any machine including Vercel.
→ *Still require the record-count line* (`build-data: 50 objects · 60 articles · …`) before
you believe a green build. And never restore a "carry on without the source" branch to a
gate: it cannot distinguish a legitimately absent source from a bug.

**2. `check-data: OK — all references resolve, all scan/media/transcript files present`.
FIXED — do not reintroduce.**
A single `SKIP_FILE_CHECKS = !existsSync(DataModel)` made this gate report OK having
checked no files at all — and once `DataModel/` was deleted for good it would have been
permanently green over nothing. The checks are now **split by what each file actually
is**: scans, page images and clips are downloaded into `public/` on every machine and are
checked unconditionally; only the 25 GB video masters, which exist on one laptop, are
conditional. See the comment at the top of `scripts/check-data.mjs`.
→ *The word "OK" is only as wide as what the gate agreed to look at.* When you add a file
kind to a gate, check it unconditionally or say in the output what was skipped.

**3. A green `npm run build` with 0 paintings.**
It says nothing about the catalogue. The `dynamicParams` re-export bug only surfaces once
`seed_paintings.json` has rows — a passing build with an empty table is not a test of the
populated path.
→ *Exercise empty code paths with temporary fixture rows*, confirm, then remove them. This is
how that bug was found.

**4. `check-export: OK — 231 pages`.**
`MIN_PAGES` once defaulted to **60** against 205 actual pages: all 60 press pages could
vanish and it still passed. The floor now tracks the real count (`263` against `265`,
`scripts/check-export.mjs`) — *keep raising it* when a box is ingested or a route family is
added, or the same blind spot reopens.

**5. "319 internal links all resolve."**
Resolving is not the same as being useful. That count was identical before and after a change
that added cross-link sections throughout the site.
→ *Link counts are not a coverage metric.* Open the page.

**6. `tsc --noEmit` errors naming `.next/types/validator.ts`.**
After deleting a route you will get `Cannot find module '../../app/why/page.js'`. These are
stale generated types, not real errors.
→ *Rebuild, then re-run typecheck.* Do not "fix" the source.

**7. Every automated check green while the feature is useless.**
Quote deep links all returned 200, highlighted correctly according to the code, and passed the
anchor validator — while displaying **1,116 "matches"** on a single transcript, because
highlighting split the query into tokens and lit up every "the" and "in".
→ *No gate in this repo can tell you whether a feature is good.* Look at it.

**8. Word counts in `<main>` as a proxy for "renders without JS".**
Useful as a smoke test, worthless as proof. A page can be full of words and still be broken.
→ *Actually load it with JavaScript disabled.*

**9. A missing screenshot looks like success.**
`--blink-settings=scriptEnabled=false` writes no file and exits 0. An automation loop that
does not assert the file exists will report a clean run having captured nothing.
→ *Assert on the artifact*, not the exit code.

**10. A blank headless screenshot of a `#fragment` URL is the tool, not the page.**
Chrome headless scrolls to the anchor and then fails to paint the scrolled region, so
`--screenshot` of `/works/attested/#MS-AW-00044` returns a uniformly blank image — and so
does `/life/#chronology`, which has worked since it was written. Confirm against a URL whose
anchor predates your change before believing it.
→ *Screenshot the page without the fragment*, or capture at a taller window and crop.

**11. Regex tag-stripping invents bugs.**
Stripping `<[^>]+>` from built HTML turns React's `<!-- -->` text separators into spaces, so
`(“passedoit”)` reads as `(“ passedoit ”)`.
→ *Check raw markup before "fixing" a spacing defect* found in stripped text.

**12. `git add -A` would stage ~25 GB.**
`Video Archive/` (25 G), `DataModel/` (307 M), `MS-CS-001/` (88 M) and `MS-CS-002/` (44 M)
live inside the repo and are gitignored. **Keep them that way.** GitHub rejects the push,
but only after a long upload. Gitignore a new box *before* copying it in, not after.
→ *Stage explicit paths and audit sizes* before committing:
`git diff --cached --name-only | xargs du -h | sort -rh | head`

**13. A client component importing `lib/data.ts` ships the whole archive to the browser.**
`components/ArtworkBrowser.tsx` imported its labels from `lib/artworkIndex.ts`, which
imports `lib/data.ts`, which imports the bundle. Next duly inlined all 234 KB of
`archive.generated.json` into a client chunk — and with it `MS-CS-001` and `MS-CS-002`,
which the site does not put in front of a reader. Every gate was green: typecheck, lint,
`check-data`, `check-export`, and the page looked and behaved correctly.
→ *Constants a client component needs live in a module that imports nothing* —
`lib/artworkGrades.ts` beside `lib/artworkIndex.ts`, `lib/facets.ts` beside
`lib/data.ts`. Check with
`grep -rl '\"archiveObjects\"' out/_next/static/` — it must find nothing.

**14. Lint is load-bearing, not cosmetic.**
`react-hooks/static-components` caught a component defined during render that would have
remounted a filter rail on every keystroke. The build passes with it; the UI misbehaves
subtly.
→ *Do not blanket-`--fix` and do not ignore warnings.*

---

## Verification checklist

```bash
npm run data        # must print the record-count line; it now FAILS without
                    # Supabase credentials rather than falling back
npm run typecheck
npm run lint        # warnings are findings
npm run build       # postbuild runs check-export
```

Then the [UI sweep](#ui-testing-on-localhost-before-committing). Then commit — with explicit
paths, never `-A`.
