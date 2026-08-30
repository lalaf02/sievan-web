# What the archive is allowed to claim

**The archive's credibility is the product.** This is the estate's scholarly record of an
artist who was written out of the canon; its whole argument is that the evidence can be
checked. The site never asserts what it cannot evidence: gaps are stated rather than
hidden, inferred connections show their working, and nothing is ever fabricated.

These rules apply to any change that produces user-facing text, whatever directory it
lives in. Each exists because of a specific failure. The reason is the point — a rule
without it gets discarded by the next person.

**Never fabricate a record.**
Not a placeholder painting, not a sample citation, not an invented date. In a catalogue
raisonné a fake row is indistinguishable from provenance, and this site is the estate's
public record. Use `Pending` for a missing section and `Absent` for a missing item; both
name what is absent and what would fill it.

**Label inferred edges as inferred, and show the working.**
`articlesByExhibition` displays the venue token that produced the match. If a connection
cannot be evidenced, either label it honestly ("Elsewhere in 1957") or leave it out. Never
present a heuristic as a fact.

**There is no topic vocabulary.** `VideoAsset.topics` is empty on all 7 videos and no subject
tags exist anywhere, so "related by topic" cannot be built. Do not fake it with keyword
overlap.

**Never hand-edit `data/archive.generated.json`.** Edit the seed file and re-run `npm run data`.
The bundle is output.

**The estate photographed this material itself. Never write that it did not.**
The site used to say *"No photograph of a Sievan painting exists in this archive"* and
that every image it held was *"printed inside somebody else's catalogue"*. Both were
false: the estate is this collection's **restorer**, and the sheet images throughout the
site are its own photography, made from the originals in its care. The gap that remains
is narrower — no finished *painting* has yet been photographed, measured and located —
and it is being closed as the works are treated, not merely confessed. Two constants in
`lib/provenance.ts` hold the distinction and must not blur: `IMAGE_SOURCE`
(rendered by `components/ImageSource.tsx`) belongs beside work the estate holds and
photographed; `PLATE_CREDIT` belongs beside the sixteen reproductions other people
printed. Attaching the wrong one replaces one false claim with another.

**No box or folder identifier appears in user-facing text.**
`MS-CS-002`, "box 2", "the first box", the `Box` and `Folder` facts on a record page —
all internal shelving, and all removed. They mean nothing to a reader, and an id like
`MS-CS-002` on a public page reads as a second identifier competing with the object's
own. `/archive/` still groups by `collection_id` internally, but heads each group by what
it holds ("The press record", "Drawings and sketches in Sievan's hand"). Grouping was
kept rather than merged into one list for the reason recorded in `app/archive/page.tsx`:
a single date-ordered sequence stranded the twenty-five undated sheets in an unexplained
clump. Curator `notes` in the seeds are rendered text — they carried "box 2" in thirteen
places and were rewritten in `DataModel/seed/`, not in the bundle.

**The retrospective catalogue is a source, not the narrator.**
It was staged as an authority — a literal `<h2>What the catalogue says</h2>` with its
prose printed underneath — which made one undated working draft the voice of the archive.
It is now quoted: the opening passage as a `blockquote`, a quiet citation, and the page
itself openable in `components/CatalogueSource.tsx`. That component is the repo's only
overlay and its first `<dialog>`; the trigger is a real anchor into
`/life/retrospective/#page-N`, and the click handler pre-empts it only after confirming
`showModal` exists, so the whole thing reads with scripting off.
**Attribution names the document, never Sievan.** Who wrote that prose is not
established — the object record reads *"Sievan: Retrospective, (Lee Sievan?) with article
'A Lost Generation' Paul Waldo Schwartz"* — so crediting him for it would be a
fabrication. `CV_SOURCE`, which does say "Sievan's own account", covers page 8's CV only.

**A caveat that drifts is a caveat nobody trusts.**
Four of these are now single exported constants rendered through a single component,
and none may be retyped at a call site: `CV_SOURCE` (`components/CVSource.tsx`),
`PERIOD_SOURCE` (`components/PeriodSource.tsx`), `IMAGE_SOURCE` / `PLATE_CREDIT`
(`components/ImageSource.tsx`), and `NO_TEXT_LAYER` (`components/NoTextLayer.tsx`).
The last was written out five times in five wordings across `/research/`,
`/about/method/`, the site search, the press browser and the two catalogue browsers
before it was given one home.
