# The design contract — Maurice Sievan Archive

This document governs both `sievan-web` (the public archive) and `sievan-admin2`
(the curator admin). It supersedes the former `sievan-admin2/DESIGN.md` and the
design half of `sievan-web/docs/design-system.md`.

`tokens.css` and `primitives.css` are the implementation; this is the contract.
Every rule below exists because of a specific failure, and the reason is the
point — a rule without one gets discarded by the next person.

**The scales are closed sets. A value off them is a finding.**

---

## What changed, and why

The archive was built on three rules that were defensible when it was written and
are not defensible now. Each is reversed here deliberately, so that no one
reinstates it by reflex.

**"Shadows are forbidden. Hierarchy comes from paper tones, rules, space, and
type."** — The result was measurable: zero `box-shadow` across both repos,
`border-radius: 1px` in two declarations, and roughly twenty-four
`border-*: 1px solid var(--rule)` declarations doing all the structural work.
The dashboard, the record index and the form's section nav were the same visual
object — a stack of hairlines — and a dropdown could overlap the content beneath
it with nothing to separate the two. **Elevation is now a real system**: four
surfaces on dark, true shadows on light, one set of names over both.

**"One accent, and colours derived from paper."** — Held perfectly, and the site
still read as five shades of beige. The admin surfaced around fourteen distinct
status fields as bare grey text with no colour, dot or shape between them.
**There is still exactly one primary accent** — `--oxide` leads and always will —
but it now has a named, bounded set beside it: a cool counterpoint, the gold
review flag, and real semantic status colours. Ad-hoc colour remains a finding.

**"Archives should feel still. This site does not animate to show that it can."**
— Half right, and kept. What the rule actually produced was zero `@keyframes` in
either repo, hover states that changed colour with no transition and therefore
snapped, and a save button whose only feedback was the word "Saving…", so a slow
save and a dead one looked the same. **Stillness means no spectacle** — no
parallax, no scroll animation, no route transitions, and that still holds.
**State may now be legible**: hover, focus, loading, saved.

**One further clause is retired.** The admin's *"The public homepage's image-led
storytelling is not a template for CRUD screens"* directly contradicts a single
shared package and is replaced by the density rule below.

---

## The system

- Genre: an archive that hangs its holdings on a wall
- Default mode: **light, warm paper.** Light is `:root` and carries no attribute
- Dark mode: **a full peer, not a fallback.** It is the evening gallery —
  transcripts, metadata proofing, printing — and it has its own elevation model.
  If it looks like a recolouring of the dark theme it has failed review
- One package, two densities: the public site reads, the admin works

## Colour

- **Warm paper by default; warm charcoal in dark mode.** Neither theme uses
  neutral black or pure white, so the archive's paper remains the visual source.
- `--oxide` is the primary accent and leads. `--accent-cool` is the counterpoint
  and carries secondary actions and data. `--flag` is gold and means *review
  marker* and nothing else — it meant only that before, and still does
- **No hardcoded hex or `rgba()` outside `tokens.css`.** `sievan-web` achieved
  zero across all 42 stylesheets; that record survives this redesign
- **Every foreground/background pair reaches 4.5:1, and every UI boundary 3:1, in
  both themes.** This is not a guideline: `scripts/check-contrast.mjs` asserts it
  over every pair and fails. It is how we learned that the archive's original
  `--ink-faint` (`#948b78`) had been carrying caption text below 4.5:1 on both
  sites all along

## Depth

- Depth on dark is carried by **surface lightness first, shadow second** — a
  surface nearer the reader is lighter. Four surfaces, one step apart:
  `ground`, `raised`, `overlay`, `sunk`
- Depth on light is carried by **real drop shadows**, warm-tinted so they read as
  shadow on paper rather than as grey haze
- `--elevation-1/2/3` name the intent; the mechanism differs per theme and a call
  site never cares which
- Anything that floats above content — a dropdown, a sticky save bar, a modal —
  **must** sit on `--surface-overlay` with `--elevation-3`. This is the rule the
  relation typeahead broke

## Typography

- **Source Serif 4, Roboto Condensed and Inter.** Serif carries archive prose,
  condensed type carries graphic headings and labels, and Inter carries controls.
- The hierarchy is **a pair, not a ramp**: display type is large, thin and pulled
  tight (`--w-thin`, `--tracking-display`); label type is small, heavy and opened
  up (`--w-bold`, `--tracking-label`). Everything between them stays quiet
- Long-form measure: `--measure` (68ch). Records: `--measure-record`
- **Monospace is a semantic signal, not decoration.** `.sv-verbatim` marks text
  reproduced verbatim from the archive manifest, unedited. Never use it for
  emphasis, for code that is not archive text, or to make a block look technical
- Form controls never use the display face

## Space and geometry

- Space is `--s-1` … `--s-9`. Type is `--t-2xs` … `--t-4xl`
- Corners are nearly square: `--radius` (2px), `--radius-frame` (3px). The only
  exception is `.sv-badge`, which is a pill because a status marker is one
- **Use the page frames; never set a width at a call site.** Seven record pages
  once hardcoded 48/50/52/54rem inline — four widths for one class of page

## Breakpoints

**1020 / 860 / 620 / 560. Nothing else.** These cannot be custom properties, so
they are a documented scale rather than a token — which is exactly how three
one-off values (1180, 1080, 640) drifted in, each within 60px of a tier and none
justified. The single surviving exception is `/life/`, the one page on
`--page-wide`, and it says so in its own stylesheet.

## Density

`--density-row`, `--density-pad`, `--density-ui` are the **only** three tokens
allowed to differ between the two apps. `[data-density='compact']` is set once,
on the admin shell, and never on a component. A curator must recognise the admin
instantly as the same product and still be able to work fast in it.

## Motion

- Opacity, transform, colour and shadow only
- `--dur-short` 140ms; `--dur-standard` 220ms
- No scroll spectacle, parallax, bouncing, or decorative route transitions
- `prefers-reduced-motion` collapses spatial motion. A spinner that cannot spin
  must still say it is working — it pulses instead of vanishing

## Components

Every interactive component supports default, hover, focus-visible, active,
disabled, loading, error and success. The admin's save bar already emitted five
states and styled two of them; that is the failure this line exists to prevent.

- **Frame** is the mat a reproduction hangs in, and is shared by the public
  tiles and the admin's upload preview so a curator checks an image in exactly
  the frame the public will see. Documents are `contain` — cropping the masthead
  off a clipping destroys the evidence. Pictures are `cover`
- **Absence is designed.** Twenty of the fifty objects are not digitised and they
  stay in every listing; an archive that hides what it does not have is not a
  record
- **Badge** carries status. Never render a status as a bare string again
- Tables are ruled archival indexes, not SaaS data grids
- Destructive actions are separated from the main form and never dominant

## Accessibility

- Keyboard access, semantic labels, error announcements, visible focus
- Verify at 320, 375, 414, 768, 1024 and 1440, and at the four tiers above
- No horizontal page scrolling
- Everything on the public site **must read without JavaScript.** Use
  `lib/useUrlState.ts`, never `useSearchParams`: reading search params during
  render forces client rendering and strips the archive's content out of the
  prerendered HTML. This regression is easy to reintroduce and nearly invisible
  in review
- `overflow-x: clip` on `html`, **never** `hidden` — `hidden` makes `html` a
  scroll container and silently breaks every `position: sticky` on the site

## What must not drift

- Source Serif 4 + Inter
- One primary accent, `--oxide`, and colour derived from the room rather than a
  palette generator
- Editorial restraint and evidence-first language
- Permanent record identifiers, route contracts, Supabase RLS, and the admin's
  explicit-save semantics
- Zero raw colour values outside `tokens.css`
