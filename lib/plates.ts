/**
 * The paintings, as they survive: reproductions printed inside somebody else's
 * catalogue.
 *
 * No photograph of a Sievan painting exists in this archive. These three plates and
 * the thirteen printed inside the retrospective catalogue (lib/retrospective.ts) are
 * the entire visual record of the finished work.
 *
 * Titles, dates, media and sizes here are the galleries' own, set in type beneath the
 * plate — not the estate's, and not verified against the canvas. `year` is null where
 * the source document's own date is in doubt.
 *
 * Lives in lib/ rather than inside app/works/page.tsx because /works/periods/ needs
 * the same three, and a second copy of this list is exactly the kind of parallel
 * record that drifts.
 */
export interface Plate {
  objectId: string;
  /** 1-indexed sheet within the object's scans. */
  page: number;
  title: string;
  /** The gallery's own year. Null where the source is in doubt — never guessed. */
  year: number | null;
  detail: string | null;
  source: string;
}

export const PLATES: Plate[] = [
  {
    objectId: 'MS-AR-00029', page: 3, title: 'Eebak', year: 1962,
    detail: 'Oil on canvas, 86″ × 69″',
    source: 'Reproduced in the Vanderwoude Tananbaum catalogue, 1986',
  },
  {
    objectId: 'MS-AR-00029', page: 1, title: 'Oombix', year: 1962,
    detail: 'Oil on canvas, 69½″ × 60″',
    source: 'Reproduced in the Vanderwoude Tananbaum catalogue, 1986',
  },
  {
    // No year: the archive records the catalogue as 1957, its own checklist reads
    // "April 16 — May 5" with 1951 pencilled at the foot. Until that is resolved
    // the archive does not choose between them — so this plate sits outside the
    // five periods rather than being placed in one of the two it might belong to.
    objectId: 'MS-AR-00023', page: 1, title: 'Provincetown Harbor', year: null,
    detail: null,
    source: 'Cover of the Salpeter Gallery catalogue; its checklist lists the picture '
      + 'as “PROVINCETOWN HARBOR (illustrated)”',
  },
];
