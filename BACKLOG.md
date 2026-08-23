# Backlog

Outstanding work on the Maurice Sievan archive. Architecture and conventions are in
[CLAUDE.md](./CLAUDE.md).

Grouped by **what is actually blocking each item**, because most of this is not waiting on
engineering. Figures are from `data/archive.generated.json`; re-derive them rather than
trusting this file after seeds change.

---

## 1. Blocked on content the estate must supply

Nothing here can be built until someone hands over material. These are the highest-value
items in the repo.

### The catalogue of paintings — `seed_paintings.json` has 0 rows
The single biggest gap. `/works/` is titled *Catalogue Raisonné* and contains no paintings,
because none are photographed or catalogued. The archive holds exactly 13 dated plates, all
of them reproduced *inside* scanned catalogue pages rather than as individual images.

**Needs:** a spreadsheet of works (title, year, medium, dimensions, current location) plus a
folder of photographs.
**Then:** write `DataModel/scripts/parse_paintings.py`, modelled on the existing
`parse_manifest.py`, emitting rows against the `Painting` `$def`. **It does not exist yet.**
Record dimensions as `H × W` — `WorksBrowser`'s Scale view enables itself once ≥80% parse.
**Done when:** `/works/` flips from its `Pending` panel to the live browser and
`/works/<id>/` pages generate. Both are already built and tested against fixtures; they need
rows, not code.

### Secondary literature — `seed_scholarship.json` has 0 rows
Schema (`Scholarship`), seed file and the Research page section all exist. No citations have
been gathered. The page states this plainly rather than hiding the section.
**Needs:** the actual references — theses, catalogue essays, articles about Sievan.

### Interview dates — 7 of 7 videos undated
No recording carries a date, so **none of them appear on the chronology at all**; the most
human material in the archive sits outside its own timeline in a separate band. Internal
evidence places them after Sievan's death in 1981 (Ivan Karp mentions not having seen him
"for over 12, 14 years").
**Needs:** a tape label, a letter arranging an interview, or a recollection from anyone
present. One date per tape closes it.

---

## 2. Blocked on the catalogue existing

Real work, correctly deferred: all of it renders through machinery keyed on `painting_id`,
so building it now would produce zero visible change.

### Seed `Commentary` from the 452 unused speaker turns
`DataModel/turns/*.json` holds **452 attributed turns** across the 5 transcripts, each with
`person_id`, `is_subject`, page and character offsets. This is strictly richer than the
paragraph model the site currently ships, and it is the natural raw material for the
`Commentary` entity — which would also retire `lib/quotes.ts` as a parallel hand-maintained
layer.

### `seed_painting_exhibitions.json` — which works hung in which of the 15 shows
Curator data. `ShownInSection` in `components/Relations.tsx` is already written. Every
exhibition page currently carries a `Pending` panel saying this is not recorded.

### A renderer for `CommentaryRelation`
The most distinctive unbuilt thing in the repo. The type
(`lib/types.ts`) defines `corroborates | contradicts | responds_to | elaborates_on |
references_same_event` — a vocabulary for **where the sources disagree with each other** —
and there is **no renderer anywhere**. A "what corroborates what" view is fully specified in
types and completely unimplemented.

---

## 3. Not blocked — nobody has done it

Buildable today.

- **Extend `personMentions` to transcript text and headlines.** It currently substring-matches
  names against object descriptions only. The same approach over the transcripts would connect
  people to what was said about them, and the editorial framing (*mentioned*, not *authored*)
  already exists.
- **Populate `VideoAsset.topics`.** Empty on all 7 videos, and there are no subject tags
  anywhere else either, so **no topical linking is possible** until a curator tags them. The
  field is typed and wired; it needs values.
- **Finish the abandoned timecode alignment.** `DataModel/scripts/timecode/` contains a single
  step (`01_extract_audio.py`) and stops there; its output sits unused in `DataModel/work/audio/`.
  `DataModel/work/durations.json` is now wired in — but with no transcript→
  timecode mapping, interview clips cannot be cut to land on a specific sentence. That is why
  every clip in `public/clips/` is silent process footage. Forced alignment would unlock
  "watch him say it" next to every quote.
- **Digitise the remaining 20 objects.** 30 of 50 are scanned. The other 20 are catalogued
  with everything known about them and marked `Not yet digitised`.
- **OCR the scans.** They have no text layer, so search reaches catalogue records and
  transcripts but never the words printed inside a clipping. Every search box says so. This is
  the single change that would most improve the archive's usefulness to researchers.

---

## 4. Editorial review

The parse was done once, by script, and mostly never checked by a human.

| | |
|---|---:|
| Articles with `review_status: unreviewed` | 51 of 60 |
| Articles not at `high` parse confidence | 41 of 60 |
| Articles with no headline recorded | 25 of 60 |
| Articles with no byline | 23 of 60 |
| Articles bylined with initials only (e.g. "P.B.R.") | 7 |

Initials are a real archival category and a research lead, not a defect — they have their own
facet bucket. The unreviewed count is the one to attack: `parse_manifest.py` is a one-shot
import that **would overwrite curator corrections if re-run**, so corrections must go into the
seed files, not the source spreadsheet.

---

## 5. Open decisions

- **Two public copies of the archive exist.** `the-sievan-experience.vercel.app` sits on a
  Vercel account not reachable from the `laurynfuld2021@gmail.com` login (verified against
  both the team and personal scopes) and still serves the pre-revamp site. Deliberately left
  alone for now — but anyone sent that link sees the old version indefinitely. Resolve when
  the custom domain is set up, ideally by pointing that host at this project.
- **Link `catalog.mauricesievan.com`?** The estate's earlier catalogue site. If this site
  supersedes it, linking would send researchers backwards; if the two coexist, it belongs on
  the Research page. Not yet decided, so not yet linked.
- **Hosting for the 25 GB of video masters.** Currently local-only. Options considered:
  YouTube/Vimeo (cheap, third-party dependency in an archive designed to outlive its host),
  Cloudflare Stream (paid, controlled), or the current answer — short committed excerpts.
- **Should `.claude/` be tracked?** Currently untracked, deliberately left as a local decision.
- **Raise `MIN_PAGES`.** It defaults to 60 against 205 real pages, so it only catches
  catastrophic collapse. See gate #4 in CLAUDE.md.

---

## Recently completed

For context on what the current shape of the site assumes:

- Five-tab IA; `/why` absorbed into Home and Life, `/about` into Research
- The data pipeline unblocked (`ROOT` resolved outside the repo, so all seed edits were no-ops)
- Quote deep links with build-time anchor verification (`scripts/check-quotes.mjs`)
- Site-wide search over every record type and all transcript paragraphs
- Inferred press↔exhibition linking, labelled as inferred
- `Pending` empty states for every known gap
- Estate contact details, replacing a `mailto:` with no address behind it
