/**
 * Where the images on this site came from.
 *
 * Two statements, each written once. The site used to assert that "no photograph of a
 * Sievan painting exists in this archive" and that every image it held had been
 * "printed inside somebody else's catalogue" — which was false, and damaging in a way
 * a missing fact is not. The estate is the restorer of this material: the sheets are
 * photographed by the estate, from the originals in its own care. What the archive
 * does not yet hold is a photographed, measured and located finished painting, and
 * that gap is being closed rather than merely confessed.
 *
 * The WORD "reproduced" must never appear in IMAGE_SOURCE. It is a defined grade in
 * this archive (lib/artworkGrades.ts): "a plate printed by a gallery that showed the
 * work" — that is, an image someone else made. IMAGE_SOURCE described the estate's own
 * photographs of originals it holds as "the works reproduced here", which is the exact
 * confusion this file exists to prevent, and on /works/ it sat a few hundred pixels
 * above a heading reading "The paintings, in other hands' reproductions".
 *
 * The distinction between the two constants is the whole point and must not blur:
 * IMAGE_SOURCE covers work the estate holds and photographed itself; PLATE_CREDIT
 * covers the sixteen reproductions printed by other people, which the estate did not
 * make and has not checked against the canvas. Attaching the wrong one to a set of
 * images replaces one false claim with another.
 */

/** The works the estate holds and photographed itself. Rendered by components/ImageSource.tsx. */
export const IMAGE_SOURCE =
  'The works shown here were photographed by the estate, directly from the '
  + 'originals in its care. Photography of the remainder is in progress; each work is '
  + 'published as its image arrives.';

/**
 * The credit that must accompany a gallery plate. Was written out twice, verbatim, in
 * app/works/page.tsx and app/works/periods/[periodId]/page.tsx.
 */
export const PLATE_CREDIT =
  'Titles, dates, media and sizes here are the galleries’ own, printed beneath the '
  + 'plate — not the estate’s, and not verified against the canvas.';
