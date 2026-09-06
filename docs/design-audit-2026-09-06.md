# Public website design audit — 2026-09-06

## Coverage and method

The audit covers all 25 page routes, the root layout and not-found state, all shared React
components, and every route/component stylesheet. It checks the rendered public system
against the authoritative contract in `design/DESIGN.md`, in light and dark themes and at
320, 375, 414, 560, 620, 768, 860, 1020, 1024 and 1440 pixels.

The review combines static inspection, automated regression checks, type and lint checks,
the design snapshot and contrast gates, a production static export, and browser inspection
of every route family. Dynamic route families are represented by at least one generated
record and their shared templates are inspected directly.

## Inventory

- Editorial: homepage, Life and Memory, retrospective, Research, and method.
- Catalogue: landing page, search, period index, five period records, and attested works.
- Archive: landing page, archive search, press, publications, object records, article
  records, and publication records.
- Authorities: people, person records, places, place records, exhibitions, and exhibition
  records.
- Shared UI: site chrome, theme control, search, facet rails, browsers, media frames,
  chapter tabs, chronology, transcript and scan readers, records, citations, relationships,
  empty/loading states, and related-content sections.

## Findings and remediation

| Area | Finding | Resolution |
|---|---|---|
| Typography | The implementation correctly loads Source Serif 4, Roboto Condensed and Inter, but the older guide and the contract's closing checklist named an incomplete font set. | Both documents now state the complete semantic font assignment. |
| Type and space | The public guide stopped at `--t-2xl` and `--s-8`, behind the implemented scales. | It now documents `--t-2xs` through `--t-4xl`, the homepage-only `--t-hero`, and `--s-1` through `--s-9`. |
| Page frames | Documented 1400/1500px widths disagreed with the 1440/1600px tokens, and `pageWide` was described as exclusive to `/life/`. | Documentation now matches the tokens and reserves the wide frame for `/life/` and `/works/`. |
| Responsive tiers | Chapter tabs used an undocumented 700px breakpoint. | Folded into the approved 620px tier; automated checks now reject new unapproved max-width tiers. |
| Motion | Several older lists and browsers used literal 150ms transitions. | Replaced by `--dur-short` and `--ease-out`; regression coverage prevents recurrence. |
| Geometry | Search, browser and reader controls repeated literal 2px radii. | Replaced by `--radius`; structural border and focus-ring pixels remain intentional. |
| Spacing | Caption stacks used a literal 2px gap. | Replaced by the smallest spacing token, `--s-1`, in both source and vendored design layers. |
| Heading structure | The interviews page jumped from its `h1` to the generic pending state's `h3`. | The reusable pending state now accepts a semantic heading level and the page uses `h2`. |
| Homepage media | Photographs and a second video competed with the central footage; every tile added descriptive text. | Five paintings now surround a caption-free, silent autoplaying loop with preserved accessible labels. |
| Catalogue hierarchy | The landing page read principally as an index and chronology diagram. | It now follows the Life page's progressive-enhancement chapter model and leads with Sievan's artistic development while keeping evidence grades distinct. |
| Archive introduction | The opening explanation was constrained to prose measure. | It now occupies the full header width. |
| Documentation ownership | The public guide read as a second contract even when stale. | It now identifies the vendored `design/DESIGN.md` as canonical and records public implementation details only. |

## Intentional exceptions

- One- and two-pixel rules, focus outlines and timeline marks are structural rendering
  mechanics, not substitute spacing or radius scales.
- Intrinsic image/video dimensions, aspect ratios, percentage collage placement and
  calculated timeline positions necessarily remain content- or geometry-derived.
- Character measures below `--measure` are retained where a component needs a deliberately
  shorter caption, excerpt or control width; they do not replace a page frame.
- The homepage's rotations and overlap are editorial composition. Other pages continue to
  use the shared frame and elevation vocabulary.
- Autoplay is confined to the single silent homepage film. Other archival footage retains
  visitor-controlled playback.

## Deferred issues

None. Content/data-model expansion, new digitisation, and changes to archival claims were
outside this design audit.

## Verification result

- All 25 route families rendered with an `h1`, valid heading progression, working images,
  meaningful content and no horizontal overflow.
- Fifty-four responsive route/viewport combinations passed across the documented width set.
- The homepage loop was observed actively playing, muted, inline, control-free and above
  five surrounding paintings; no collage captions were rendered.
- Catalogue tabs passed pointer and Arrow-key navigation with matching selected panel and
  URL hash state. All five panels remain in the server-rendered document.
- The archive introduction's computed width matched its header and had no maximum-width
  constraint.
- Theme switching changed the active theme and computed page surface without console errors.
- Type checking, linting, regression tests, contrast checks, production compilation, static
  generation and the internal-link/anchor audit passed.
