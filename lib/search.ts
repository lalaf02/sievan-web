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

/** Split text into segments so matches can be wrapped in <mark>. */
export function highlightSegments(
  text: string,
  queryTokens: string[],
): { text: string; hit: boolean }[] {
  if (!queryTokens.length) return [{ text, hit: false }];

  const hay = normalize(text);
  const ranges: [number, number][] = [];
  for (const token of queryTokens) {
    let from = 0;
    for (;;) {
      const at = hay.indexOf(token, from);
      if (at === -1) break;
      ranges.push([at, at + token.length]);
      from = at + token.length;
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
