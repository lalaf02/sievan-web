# Backlog

Outstanding work on the Maurice Sievan archive. Architecture and conventions are in
[CLAUDE.md](./CLAUDE.md) and the chapters in [docs/](./docs/).

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

**Box 2 has now been curated into `AttestedWork` rows — done, and deliberately not
`Painting` rows.** Its 25 drawings are Sievan's own records of paintings he had made,
annotated with title, dimensions, medium, year, asking price and sometimes the buyer. A
curator pass over all 24 scanned sheets produced **57 attested works** (50 with a size, 29
with a price, 10 with a year), each carrying the verbatim words it rests on and a link to
the sheet — see `/works/attested/`. `check-quotes.mjs` fails the build if any quote is not
present in its source's own recorded text.

These are **evidence toward the catalogue, not entries in it**, and the separation is
structural: a distinct entity, a distinct id space (`MS-AW-#####`), a distinct URL space, and
counts that are never added to `counts.paintings`. Do not promote them to `Painting` rows
wholesale — a drawing records that a painting existed and what Sievan called it, which is not
the same as establishing the work, its present whereabouts, or that the title stuck.
`AttestedWork.painting_id` is the one-way bridge for when a curator does match a photographed
canvas to a sheet; setting it requires `identification_basis`, enforced in `build-data.mjs`.

**Still needed for the catalogue itself:** a spreadsheet of works (title, year, medium,
dimensions, current location) plus a folder of photographs.
**Then:** write `DataModel/scripts/parse_paintings.py`, modelled on the existing
`parse_manifest.py`, emitting rows against the `Painting` `$def`. **It does not exist yet.**
Record dimensions as `H × W` — `WorksBrowser`'s Scale view enables itself once ≥80% parse.
**Done when:** `/works/` flips from its `Pending` panel to the live browser and
`/works/<id>/` pages generate. Both are already built and tested against fixtures; they need
rows, not code. The attested works and the box-2 sheets stay on the page either way.

**Open questions the curator pass raised, all recorded in `notes` on the rows:**
- `MS-AR-00067` says the dealer Kassner "has 5 of my paintings" and then lists six; the sheet
  marks one "this one is Out / I have it back". The arithmetic suggests which came back, but
  the sheet does not say so.
- "Birchland #1" (`MS-AR-00057`) and "BIRCHLAND BII" (`MS-AR-00066` verso); "a grey day"
  (`MS-AR-00068`) and "Gray Day" (`MS-AR-00070`). One work, two, or a series is not recorded.
  `attestationsByTitleKey` surfaces the collision without resolving it.
- Buyers are named only as Sievan wrote them — ORR, Kassner, Irving Cohn, miss Marsh, Zitners
  House, "Jenns Friends daughter". The retrospective CV lists an "I. David Orr" and a
  "Charles Zitner", which is a lead, not an identification. `counterparty_person_id` is null
  on all 57 rows and should stay null until someone can actually make the link.

### The gallery checklists — ~50 more paintings, from printed sources
**The highest-value ingest the archive can do without anyone supplying anything new.**
Nine exhibition catalogues are already scanned (27 pages) and at least three carry printed
checklists of named paintings — better evidence than box 2's sketches, because a gallery
set them in type:

- **`MS-AR-00028`** (Passedoit) — *"OIL PAINTINGS 1952-1954"*, **19 works with dimensions**:
  Pine Hill Road 28 x 32 · Woodland Forest 20 x 24 · Provincetown Sands · Earth and Sky ·
  The Orchard · Lawnscape · The Brook · **Birchland (REPRODUCED) 20 x 24** · Terrestria ·
  Saugerties · Woodland · Esopus Creek · Rhythmic Landscape · Eventide ·
  **The Etude, *loaned by Mr. and Mrs. Charles Zitner*** · Woodstock Retreat · Red Earth ·
  Shinnecock Bay · The White House.
- **`MS-AR-00023`** (Salpeter) — *"Recent Oils"*, **16 works**, incl. Provincetown Harbor
  (illustrated), Street Scene in Flushing, Head of a Poet, Inlet at Peconic Bay,
  Suburban Retreat, Montauk Point, At Sag Harbor, In Hollis, A Corner in Flushing,
  The Breakwater—Provincetown, Sag Harbor Bay.
- **`MS-AR-00030`** (Passedoit 1957) — a checklist, not yet transcribed.
- `MS-AR-00021`, `00022`, `00025`, `00027`, `00029` — unexamined for lists.

**Two corroborations are already visible** and are the reason to do this:
`BIRCHLAND (REPRODUCED) 20 x 24` matches `MS-AW-00014` from `MS-AR-00057`
(*"Birchland #1"*, 20 x 24) — a gallery printed what Sievan sketched; and
`THE ETUDE ... CHARLES ZITNER` is a **third** independent source on Zitner, beside the CV's
`privateCollections` and `MS-AR-00074`'s *"Zitners House"*.

**Ingest as `AttestedWork` rows** (`source_type: 'archive_object'`), not `Painting` rows —
a checklist proves a painting was exhibited under a title, not where it is now.
**First** transcribe each checklist into that object's `raw_title_description`, because
`check-quotes.mjs` verifies every quote against it; editing a description afterwards breaks
every quote already drawn from it. Separate commit, its own `npm run data`.

**Resolve while there:** `MS-AR-00023` is recorded as 1957 but its checklist reads
*"April 16 — May 5"* with **1951** pencilled at the foot. `/works/` currently gives
*Provincetown Harbor* no year because of it.

### Boxes 3–6 — four physical boxes still outside the archive
`DataModel/Archive Master Sheet.xlsx` has six tabs, one per box. Two are ingested.

- **MS-CS-003** (`MS-AR-00124`–`00189`) is the ready one: **66 rows, fully catalogued**,
  with title, date, medium, folder, condition *and* an `Alternate ID` column of D-numbers
  (`D166`, `D345`…) that the other tabs lack. What is missing is the digital twin — no
  scans have been supplied. Ingesting it would add 66 catalogued-but-undigitised records, a
  pattern the archive already carries for 20 box-1 objects.
  **Needs:** either the scans, or a decision that the records are worth publishing without
  them. Also a decision on where `Alternate ID` goes — there is no schema field for it, and
  `digital_record_id` means something else.
  **This ingest now has somewhere to land.** `/works/periods/` orders the artwork by the
  retrospective catalogue's five periods, and it is thin at the front precisely because
  box 3 is out: *Beginnings* holds 3 records and *Landscapes* 4. Box 3's tab is **60 of 66
  rows dated, 1926–1959** — the only dated artwork in the master sheet, since box 2's
  `Date` column reads `ND` on 25 of its 26 rows. Ingesting it would fill those two periods
  with no code change at all; `contentsForPeriod` reads whatever rows are in the bundle.
- **MS-CS-004, 005, 006** are empty: box titles only, no rows.

**Sheet bug to resolve first:** tab `MS-CS-006` duplicates box 4's title *and* its
`New box ID` cell (`MS-CS-004`), while box 5's own title reads *"This box has been divided
into 2 parts) 1 of 2"*. Tab 6 is almost certainly box 5 part 2, mis-copied. Confirm with the
curator before ingesting either — `parse_master_sheet.py` keys on the tab name, so a wrong
`New box ID` would file records under the wrong physical box.

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
- **61 orphaned objects in Supabase Storage.** The `Articles and Media` (36) and `Artwork`
  (25) buckets are left over from a schema attempt of 2026-08-29 that was reverted the next
  day. Nothing in the database registers them and nothing in the build reads them; the site
  uses 270 objects across `archive-scans`, `scan-pages`, `retrospective` and `clips`.
  Someone should confirm they duplicate material already held and then delete them — **check
  before deleting**, because `Articles and Media` also held the interview transcript PDFs.
- **`media_assets` registers 68 of the 331 Storage objects.** The 56 scans and 12 video
  masters are in the table; the 174 page images, 25 clips and 15 retrospective sheets are
  found by bucket listing in `scripts/media.mjs` and are recorded nowhere. That works, but it
  means the registry is not yet the full answer to "what files does the archive hold". Wire
  `extract-scans.mjs` and `extract-clips.mjs` to register what they produce.
- **The Python ingest still writes `DataModel/seed/*.json`, which nothing reads.**
  `parse_master_sheet.py` predates the move of the source of record into Supabase, so
  ingesting box 3 by the documented recipe would write files the build ignores. It needs to
  write to the database — or to emit seeds that `scripts/seed-supabase.mjs` then loads,
  which already works and is tested by the export/restore round trip.

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

**Box 2 transcription check — done for every sheet that carries an attested work.**
Proofed page by page against the scans before the quotes became load-bearing, because
`check-quotes.mjs` means a later correction breaks every quote drawn from a corrected line.
Four transcription fixes landed in `seed_archive_objects.json`: `MS-AR-00053`
*SOUTHHAMPTON* → **SOUTHAMPTON**; `MS-AR-00058` *FEIGN* → **FEIGIN** (Dorothy Feigin, a real
painter); `MS-AR-00067` *Kasner* → **Kassner**, legible on the scan and matching
`MS-AR-00071`'s own spelling; and `MS-AR-00067` #5 *oil on canvas* → **oil on canvas board**.
Three rotation defects were found the same way — see the ROTATE note in
[docs/data-pipeline.md](./docs/data-pipeline.md).

Still unproofed: the sheets that carry no attested work, and the sheets' finer details
(`MS-AR-00058`'s *"Buds Budsworth"* is a guess at a courier's name). Corrections go in
`seed_archive_objects.json`, not the master sheet — and re-run `npm run data`, which will
tell you immediately if a correction broke a quote.

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
  catastrophic collapse. See trap #4 in [docs/verification.md](./docs/verification.md).

---

## Recently completed

For context on what the current shape of the site assumes:

- **`personMentions` extended to the transcripts** (2026-08-30): `personTranscriptMentions`
  connects three people to seven interviews — Sievan across all five transcripts (34 pages),
  Hilton Kramer in Solman's, Ivan Karp in Barnet's, where Barnet says Sievan showed *"with
  HCE, with Ivan Karp"*. Karp's page now carries all three of his roles at once: subject of
  his own interview, named in another's, author of the Barone Gallery essay. **Full names
  and aliases only.** Surnames were tried first and all eight hits were false positives —
  "Klein" is Franz Kline, "Paris" is the city, "Campbell" is Warhol's soup can — and are
  recorded as unusable in `build-data.mjs` so the next reader does not repeat the attempt.
  **Headlines were dropped, and this is the measurement:** all 15 hits are Sievan and all 15
  already appear verbatim in the parent object's description, because `parse_manifest.py`
  builds both fields off the same manifest line. A headline index would have shipped empty
  after deduplication, so it was not built.

- **Supabase consolidated from 21 tables to 12** (2026-08-30): the seven-table core
  `artworks · artwork_mentions · articles · interviews · media_assets · people · events`,
  plus `publications`, `places`, `collections` and `artwork_mention_places`, which the
  proposal that prompted the work had nowhere to put and the site renders. `profiles` is
  untouched. Every one of ~370 rows kept a home, the `api.v_*` views absorbed the entire
  reshape, and no application code changed — `check-parity.mjs` reported the bundle
  byte-identical and all 265 exported pages came out the same. Seven empty tables were
  retired; six bundle keys survive as typed empty views. Two defects surfaced on the way:
  the export/restore round trip was broken (transcripts were written under one filename and
  looked for under another), and `media_assets` had no natural key, so restoring the
  archive's own backup would have doubled every scan. Both fixed

- **The catalogue's five periods** (`/works/periods/` + five committed period routes):
  the artwork ordered chronologically for the first time. Periods derive from
  `RETROSPECTIVE_PAGES`; the disjoint year ranges are the archive's own reading, because
  the catalogue's overlap at 1930 and across the '60s. **26 of 98 artwork records carry a
  year**, and every page says so — the other 72 are stated, not hidden

- **Box 2 ingested** (`MS-CS-002`, 26 objects, 25 scans): archive objects moved out of
  `seed_news_articles.json` into their own seed, scan resolution keyed on `collection_id`
  so further boxes need no code change, and a *Works on paper* section on `/works/`
- Five-tab IA; `/why` absorbed into Home and Life, `/about` into Research
- The data pipeline unblocked (`ROOT` resolved outside the repo, so all seed edits were no-ops)
- Quote deep links with build-time anchor verification (`scripts/check-quotes.mjs`)
- Site-wide search over every record type and all transcript paragraphs
- Inferred press↔exhibition linking, labelled as inferred
- `Pending` empty states for every known gap
- Estate contact details, replacing a `mailto:` with no address behind it
