/**
 * Shared facet machinery for the two filter rails.
 *
 * Extracted verbatim from components/WorksBrowser.tsx rather than reimplemented:
 * that browser is the finished, dormant home for the painting catalogue and turns on
 * with no code change when seed_paintings.json has rows, so it must keep behaving
 * exactly as it did. Everything here is what both rails already needed.
 */

/** Free-text dimensions, e.g. "18 x 24". */
export const DIMS = /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/;

/**
 * Parse a free-text dimension pair.
 *
 * Named `a`/`b`, not `h`/`w`. On an attested work the source wrote "18 x 24" and
 * nothing anywhere records which figure is the height — see AttestedWork.dimensions_stated
 * in lib/types.ts. Callers that need one number must use `largestDimension`, which does
 * not care about the order; nothing may draw a work to scale from this.
 */
export function parseDims(s: string | null | undefined): { a: number; b: number } | null {
  if (!s) return null;
  const m = s.match(DIMS);
  return m ? { a: Number(m[1]), b: Number(m[2]) } : null;
}

/**
 * The longer edge, whichever edge that is.
 *
 * Orientation-independent, and therefore the only size comparison the data actually
 * supports. "Largest recorded size" is honest where "tallest" would not be.
 */
export function largestDimension(s: string | null | undefined): number | null {
  const d = parseDims(s);
  return d ? Math.max(d.a, d.b) : null;
}

/** Count distinct values of one field, as [value, count] pairs. */
export function facetOf<T>(
  rows: T[],
  key: (row: T) => string | null | undefined,
): [string, number][] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const k = key(row);
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()];
}

/** Count a field that yields several values per row, e.g. dispositions or places. */
export function facetOfMany<T>(
  rows: T[],
  keys: (row: T) => string[],
): [string, number][] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const k of new Set(keys(row))) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()];
}

/**
 * The bucket for a record whose source is silent.
 *
 * Medium is unstated on 21 of the 57 attested works. Dropping those rows from the
 * facet would quietly shrink the catalogue every time somebody filtered by medium;
 * giving silence its own bucket keeps them reachable and says why they are there.
 * Same device as `__unattributed__` in components/PressBrowser.tsx.
 */
export const NOT_STATED = '__not_stated__';

/**
 * Raw medium spellings, folded to the medium they name.
 *
 * The attested rows carry seventeen spellings of about five media — "OIL",
 * "oil framed", "Canvas board (oil)", "water color", "PASTEL" — because they are
 * transcriptions of what Sievan wrote on a sheet, not a controlled vocabulary. The
 * raw string stays on the record and is what a record page prints; this fold exists
 * only so the rail can offer a usable facet.
 *
 * Compound media are matched before their parts, or "Ink and watercolour" would
 * fold to Watercolour and lose the ink.
 */
const MEDIUM_RULES: [RegExp, string][] = [
  [/graphite and colou?red pencil/, 'Graphite and coloured pencil'],
  [/ink and watercolou?r/, 'Ink and watercolour'],
  [/graphite/, 'Graphite'],
  [/marker/, 'Marker'],
  [/gouache/, 'Gouache'],
  [/pastel/, 'Pastel'],
  [/oil/, 'Oil'],
  [/water\s*colou?r/, 'Watercolour'],
  [/\bink\b/, 'Ink'],
];

/**
 * Fold a raw medium string to a facet value, or NOT_STATED.
 *
 * Note what does NOT fold: "on canvas board" and "on board" name a support and no
 * medium at all, so they land in NOT_STATED rather than being read as oil. Guessing
 * there would be inventing a record.
 */
export function normaliseMedium(raw: string | null | undefined): string {
  if (!raw) return NOT_STATED;
  const s = raw.toLowerCase();
  for (const [re, label] of MEDIUM_RULES) if (re.test(s)) return label;
  return NOT_STATED;
}

/** Sort a facet by count desc, then alphabetically, with NOT_STATED always last. */
export function byCountThenName(a: [string, number], b: [string, number]): number {
  if (a[0] === NOT_STATED) return 1;
  if (b[0] === NOT_STATED) return -1;
  return b[1] - a[1] || a[0].localeCompare(b[0]);
}
