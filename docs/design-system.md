# The design system

`app/globals.css` holds the tokens, the utility classes and the reasoning. This section is
the contract; the file is the implementation. Every rule below was drifted from before it
was written down, which is why it is written down.

**The scales are closed sets. A value off them is a finding.**

| | |
|---|---|
| Type | `--t-xs` … `--t-2xl`, a 1.25 ratio. Body is `--t-body` |
| Space | `--s-1` … `--s-8`. Sticky offsets are `--s-5` unless the component states a reason |
| Width | `--measure` (68ch prose) · `--measure-record` (52rem) · `--page` (1400px) · `--page-wide` (1500px, `/life/` only) · `--rail` |
| Breakpoints | **1020 / 860 / 620 / 560**. Nothing else |

Breakpoints cannot be custom properties, so they are a documented scale rather than a
token — which is exactly how three one-off values (1180, 1080, 640) drifted in, each
within 60px of a tier and none of them justified. They were folded back. The single
surviving exception is `/life/`, the one page laid out on `--page-wide`, whose two columns
run out of room a tier early at 1180; it says so in its own stylesheet.

**Use the page frames; never set a width at the call site.**
`.page` (standard), `.pageWide` (`/life/`), `.record` (any record page). All three carry
their own top padding — `padding-top` was written inline as
`style={{ paddingTop: 'var(--s-6)' }}` on 23 of 25 routes, a default dressed as a choice,
and `.pageFlush` / `.pageDeep` are the two real exceptions (the home hero, the 404).
`.record` matters most: seven record pages used to set the width inline at 48rem, 50rem and
52rem — four widths for one class of page. `--measure-record` was introduced to end that
and did not, because nothing applied it. Inline `style` is for genuine one-offs and
computed values (`calc()`, `--aspect`), not for layout.

**The typographic vocabulary, and when each applies.**
`.measure` for prose · `.ui` for interface type (filters, labels, counts, metadata) ·
`.eyebrow` for the small caps line above a heading · `.muted` and `.faint` for the two
recessive greys · `.tnum` wherever digits align in a column or a timeline · `.srOnly` for
labels a sighted reader gets from context · `.railLayout` + `.rail` for every rail-and-
content layout. A route stylesheet composes these; it does not restate them.

**Monospace is a semantic signal, not decoration.**
`.verbatim` marks text reproduced verbatim from the archive manifest, unedited. It is the
typographic form of the same promise the rest of this file makes — that the reader can tell
what the archive transcribed from what it wrote. Do not use mono for emphasis, for code
that is not archive text, or because a block needs to look technical.

**One accent, and colours derived from paper.**
`--oxide` is the only accent. `--flag` is reserved for review markers and nothing else.
Adherence here is currently perfect — **zero hardcoded hex or `rgba()` across all 42
stylesheets** — which is worth knowing before you type the first one.

**Prose stays at `.measure`; sheets do not.**
The archive's imagery is the argument — clippings, catalogue covers, the only moving
picture of Sievan painting — and boxing it inside a text measure is what once made the site
read as mostly paper. This was carried by a `.bleed` utility that ran media bands the full
window width; the class was deleted as dead code, having lost its last call site some time
ago. The principle outlived it. If a media band needs the full width again, rebuild it
deliberately rather than reaching for an inline `100vw`.

**`overflow-x: clip` on `html`, never `hidden`.**
`hidden` makes `html` a scroll container and silently breaks every `position: sticky` on
the site — the transcript rail, the research contents, the chronology's year labels.

**"Archives should feel still."**
A blanket `prefers-reduced-motion` reduction, and a tone: this site does not animate to
show that it can.

**There is no formatter, and that is a decision.**
`eslint.config.mjs` is correctness-only (`next/core-web-vitals` + `typescript`); there is no
Prettier and no stylelint. Consistency is held by this section and by review. Adding a
formatter would reformat every hand-set comment in the repo — the comments are load-bearing
documentation here, not noise — and it could not have caught any of the drift above, all of
which was semantic rather than syntactic.

