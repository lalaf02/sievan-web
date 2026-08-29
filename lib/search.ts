/**
 * Field-weighted token search.
 *
 * Deliberately not a search library: the corpus is 60 articles and 5 transcripts,
 * and what matters is controlling *which* field a hit came from — a headline match
 * should outrank a match buried in the verbatim manifest line.
 *
 * Important limit, surfaced in the UI: the scan PDFs have no text layer, so this
 * searches the catalogue record, never the text of the clippings themselves.
 */

/**
 * The limit, in one wording.
 *
 * It had been written out five times in five wordings — /research/, /about/method/,
 * the site search, the press browser and the two catalogue browsers — which is how the
 * CV caveat and the plate credit went wrong before them. Same fix: one string, one
 * component (components/NoTextLayer.tsx), and never retyped. A caveat that drifts is a
 * caveat nobody trusts.
 *
 * It is the most important thing a researcher can be told about a search box here, so
 * it is stated rather than implied: a query that returns nothing may mean the archive
 * does not hold the thing, or may mean the words are only inside a scan.
 */
export const NO_TEXT_LAYER =
  'The scans have no text layer. Search reaches the catalogue records and the '
  + 'interview transcripts, never the words printed inside a clipping.';

export const normalize = (s: string): string =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ');

export const tokenize = (s: string): string[] => normalize(s).split(/\s+/).filter(Boolean);

export interface Field {
  text: string | null | undefined;
  weight: number;
}

/**
 * Score a record against a query. Every query token must appear somewhere
 * (AND semantics) or the record scores 0 — with a corpus this small, an OR match
 * returns almost everything and is useless.
 */
export function scoreFields(fields: Field[], queryTokens: string[]): number {
  if (queryTokens.length === 0) return 1;

  const prepared = fields
    .filter((f) => f.text)
    .map((f) => ({ text: normalize(f.text as string), weight: f.weight }));
  if (!prepared.length) return 0;

  let total = 0;
  for (const token of queryTokens) {
    let best = 0;
    for (const f of prepared) {
      const at = f.text.indexOf(token);
      if (at === -1) continue;
      // Whole-word and prefix matches beat a match inside a longer word.
      const before = at === 0 ? ' ' : f.text[at - 1];
      const boundary = before === ' ';
      best = Math.max(best, f.weight * (boundary ? 1 : 0.4));
    }
    if (best === 0) return 0;
    total += best;
  }
  return total;
}

/**
 * What to light up for a query.
 *
 * Scoring splits a query into tokens and requires all of them (AND). Highlighting
 * must NOT do the same: a reader who follows a link for the phrase "the best
 * american artist in the" wants that phrase, not every "the" and "in" in 4,769
 * words. Token-wise highlighting on a common word marks most of the page and tells
 * them nothing.
 *
 * So a multi-word query is treated as one contiguous needle. Single words behave
 * exactly as before.
 *
 * Note the needle is normalised but not whitespace-collapsed: `normalize` maps each
 * character to exactly one character, which is what lets `highlightSegments` index
 * back into the original string with offsets found in the normalised one.
 */
export function highlightNeedles(query: string): string[] {
  const needle = normalize(query).trim();
  return needle ? [needle] : [];
}

/**
 * Match a needle allowing extra whitespace between its words.
 *
 * `normalize` maps each punctuation character to a single space rather than
 * deleting it, so "individual, original" becomes "individual  original" — two
 * spaces. A plain `indexOf` for "individual original" then finds nothing. Since
 * every character still maps 1:1, matching with `\s+` between words keeps the
 * offsets usable for slicing the original text.
 */
export function needleRegex(needle: string): RegExp {
  const words = needle.trim().split(/\s+/)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(words.join('\\s+'), 'g');
}

/** Split text into segments so matches can be wrapped in <mark>. */
export function highlightSegments(
  text: string,
  queryTokens: string[],
): { text: string; hit: boolean }[] {
  if (!queryTokens.length) return [{ text, hit: false }];

  const hay = normalize(text);
  const ranges: [number, number][] = [];
  for (const token of queryTokens) {
    const re = needleRegex(token);
    for (let m = re.exec(hay); m; m = re.exec(hay)) {
      if (m[0].length === 0) break;
      ranges.push([m.index, m.index + m[0].length]);
    }
  }
  if (!ranges.length) return [{ text, hit: false }];

  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r] as [number, number]);
  }

  const out: { text: string; hit: boolean }[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) out.push({ text: text.slice(cursor, start), hit: false });
    out.push({ text: text.slice(start, end), hit: true });
    cursor = end;
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor), hit: false });
  return out;
}
