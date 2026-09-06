/**
 * The shape of an artwork record, and the vocabulary for describing one.
 *
 * SEPARATE FROM lib/artworkIndex.ts, and the separation is load-bearing.
 * ArtworkBrowser is a client component; when it imported these constants from
 * artworkIndex — which imports lib/data — Next bundled the ENTIRE
 * archive.generated.json into a client chunk. That shipped 234 KB of JSON to every
 * visitor and put box identifiers ("MS-CS-002") into the page source, which this
 * archive does not put in front of a reader. Nothing in this file may import ./data,
 * ./periods, ./plates or anything else that reaches the bundle; the builder that does
 * lives next door and is server-only.
 *
 * THE FOUR GRADES ARE NOT ONE POPULATION. A plate the catalogue printed, a
 * reproduction a gallery printed, a sheet the estate physically holds and a painting
 * Sievan merely named are four different strengths of evidence, and CLAUDE.md forbids
 * summing them. `grade` is carried on every row, it is the first facet in the rail,
 * and `describeCounts` is what the results head prints. Nothing here may ever return
 * one total.
 */

export type ArtworkGrade = 'held' | 'reproduced' | 'printed' | 'named';

/**
 * How each grade is described to a reader.
 *
 * `short` is what the results head prints, and it is deliberately a verb phrase
 * rather than a noun: "31 named" cannot be misread as "31 works in the catalogue" the
 * way "31 works" could.
 */
export const GRADES: { id: ArtworkGrade; label: string; short: string; note: string }[] = [
  {
    id: 'held',
    label: 'Held by the estate',
    short: 'held',
    note: 'A sheet the estate physically holds and photographed itself.',
  },
  {
    id: 'reproduced',
    label: 'Reproduced by a gallery',
    short: 'reproduced',
    note: 'A painting surviving as a plate printed by a gallery that showed the work.',
  },
  {
    id: 'printed',
    label: 'Printed in the typescript',
    short: 'printed',
    note: 'A painting reproduced inside the retrospective typescript, where it cannot '
      + 'be lifted out of the page it is printed on.',
  },
  {
    id: 'named',
    label: 'Named on a sheet',
    short: 'named',
    note: 'A painting Sievan wrote down on one of his own sheets; '
      + 'the archive holds the sheet, not the painting.',
  },
];

export const GRADE_LABEL: Record<ArtworkGrade, string> =
  Object.fromEntries(GRADES.map((g) => [g.id, g.label])) as Record<ArtworkGrade, string>;

export const GRADE_SHORT: Record<ArtworkGrade, string> =
  Object.fromEntries(GRADES.map((g) => [g.id, g.short])) as Record<ArtworkGrade, string>;

export type PriceBucket = 'under-200' | '200-499' | '500-plus';

export const PRICE_BUCKETS: { id: PriceBucket; label: string; min: number; max: number }[] = [
  { id: 'under-200', label: 'Under $200', min: 0, max: 199.99 },
  { id: '200-499', label: '$200 – $499', min: 200, max: 499.99 },
  { id: '500-plus', label: '$500 and over', min: 500, max: Infinity },
];

/**
 * One row in the browser. Presentation-shaped on purpose: the four source types have
 * genuinely different fields, and flattening them here is what lets one rail filter
 * all four without the component knowing four schemas.
 *
 * A null field means the record is silent, never that the value is zero or unknown-
 * but-guessable. The browser renders silence rather than skipping the row.
 */
export interface ArtworkRow {
  key: string;
  grade: ArtworkGrade;
  href: string;
  /** Absent where no separable image exists — see the `printed` grade. */
  thumb: string | null;
  title: string;
  /** True where the title is the archive's description, not a title anyone gave it. */
  titleIsDescriptive: boolean;
  year: number | null;
  dateText: string | null;
  periodId: string | null;
  /** Verbatim, as the source spelled it. `mediumFacet` is the folded version. */
  mediumStated: string | null;
  mediumFacet: string;
  dimensionsStated: string | null;
  /** Longest edge, for sorting. Orientation is not recorded — see lib/facets.ts. */
  largestEdge: number | null;
  priceStated: string | null;
  priceBucket: PriceBucket | null;
  dispositions: string[];
  placeIds: string[];
  placeNames: string[];
  /** The line beneath the title: what this record is and where it comes from. */
  meta: string;
  /** Low-weight search text — the quote, the buyer, the inventory number. */
  body: string | null;
}


/**
 * Counts, kept apart by grade.
 *
 * There is no `total` here and there must not be one. A caller that wants a single
 * number for 98 records is about to break the rule this module is arranged around;
 * make them write the four out instead.
 */
export function countByGrade(rows: ArtworkRow[]): Record<ArtworkGrade, number> {
  const out: Record<ArtworkGrade, number> = {
    held: 0, reproduced: 0, printed: 0, named: 0,
  };
  for (const r of rows) out[r.grade] += 1;
  return out;
}

/** "18 held · 2 reproduced · 31 named" — omitting the grades with nothing in them. */
export function describeCounts(rows: ArtworkRow[]): string {
  const by = countByGrade(rows);
  const parts = GRADES
    .filter((g) => by[g.id] > 0)
    .map((g) => `${by[g.id]} ${g.short}`);
  return parts.length ? parts.join(' · ') : 'nothing';
}
