/**
 * Building the artwork index. SERVER ONLY — this reads the archive bundle.
 *
 * The types and labels live in ./artworkGrades, which imports nothing, because the
 * client browser needs those and must not drag the bundle across with them. See the
 * note at the top of that file for what happened when it did.
 *
 * Built here at build time and passed into the browser as props, the same way
 * app/archive/search/page.tsx builds its index — NOT added to `derived` in
 * scripts/build-data.mjs. Two reasons. It is presentation-shaped (hrefs, thumbs,
 * badge labels), so it does not belong in the archive bundle; and build-data.mjs
 * exits early on Vercel because DataModel/ is absent, so anything new in `derived`
 * would exist only if the bundle happened to be regenerated and recommitted.
 *
 * THE FOUR GRADES ARE NOT ONE POPULATION. A plate the catalogue printed, a
 * reproduction a gallery printed, a sheet the estate physically holds and a painting
 * Sievan merely named are four different strengths of evidence, and CLAUDE.md forbids
 * summing them. Putting them in one index does not merge them: `grade` is carried on
 * every row, it is the first facet in the rail, and `countByGrade` is what the results
 * head prints. Nothing here may ever return one total.
 */
import {
  allAttestedWorks, attestationsForObject, catalogueWorksOnPaper, entryTitle,
  getPlace, pageOf,
} from './data';
import { PERIODS, pageForPeriod, periodOf } from './periods';
import { PLATES } from './plates';
import { largestDimension, normaliseMedium, NOT_STATED } from './facets';
import type { ScanPage } from './types';
import type { ArtworkRow, PriceBucket } from './artworkGrades';
import { PRICE_BUCKETS } from './artworkGrades';

/**
 * Drop inch and quote marks so a dimension can be parsed.
 *
 * The gallery plates print sizes as `86″ × 69″`. The mark sits between the number and
 * the separator, so the pair does not parse until it is removed. The displayed string
 * is never touched — only the copy the sort reads.
 */
const stripInchMarks = (s: string | null): string | null =>
  s == null ? null : s.replace(/[\u2033\u2032"']/g, '');

const priceBucketOf = (usd: number | null): PriceBucket | null => {
  if (usd == null) return null;
  return PRICE_BUCKETS.find((b) => usd >= b.min && usd <= b.max)?.id ?? null;
};

/** Every artwork record, in one array. Grade is carried, never dissolved. */
export function buildArtworkIndex(): ArtworkRow[] {
  const rows: ArtworkRow[] = [];

  // ---------------------------------------------------- held: the 25 sheets
  for (const o of catalogueWorksOnPaper()) {
    const art = o.artwork!;
    const cover: ScanPage | undefined = pageOf(o.id, 1);
    const records = attestationsForObject(o.id).length;
    rows.push({
      key: o.id,
      grade: 'held',
      href: `/archive/objects/${o.id}/`,
      thumb: cover?.thumb ?? null,
      title: entryTitle(o),
      // Sievan titled none of these; entryTitle names them by what they record.
      titleIsDescriptive: true,
      year: o.date_earliest,
      dateText: o.date_text,
      periodId: periodOf(o.date_earliest)?.id ?? null,
      mediumStated: art.medium_stated,
      mediumFacet: normaliseMedium(art.medium_stated),
      // None of these has been measured. Not a gap in this index — a gap in the record.
      dimensionsStated: null,
      largestEdge: null,
      priceStated: null,
      priceBucket: null,
      dispositions: [],
      placeIds: [],
      placeNames: [],
      meta: records > 0
        ? `${art.medium_stated} on ${art.support.toLowerCase()} · records ${records} painting${records === 1 ? '' : 's'}`
        : `${art.medium_stated} on ${art.support.toLowerCase()}`,
      body: [o.raw_title_description, art.signed].filter(Boolean).join(' '),
    });
  }

  // -------------------------------------------- reproduced: the gallery plates
  for (const p of PLATES) {
    const sheet = pageOf(p.objectId, p.page);
    rows.push({
      key: `plate-${p.objectId}-${p.page}`,
      grade: 'reproduced',
      href: `/archive/objects/${p.objectId}/`,
      thumb: sheet?.thumb ?? null,
      title: p.title,
      titleIsDescriptive: false,
      year: p.year,
      dateText: p.year ? String(p.year) : null,
      periodId: periodOf(p.year)?.id ?? null,
      mediumStated: p.detail,
      mediumFacet: normaliseMedium(p.detail),
      dimensionsStated: p.detail,
      largestEdge: largestDimension(stripInchMarks(p.detail)),
      priceStated: null,
      priceBucket: null,
      dispositions: [],
      placeIds: [],
      placeNames: [],
      meta: p.source,
      body: p.detail,
    });
  }

  // ------------------------------- printed: the plates inside the typescript
  /*
   * Thirteen reproductions on five pages. The archive records a year for each and
   * NOTHING else — no title, no medium, no size — and they cannot be separated into
   * individual images, because each exists only as part of the page it is printed on.
   * So these rows carry no thumb: showing the whole page as the work's face would be
   * showing a page of a book and calling it a painting.
   */
  for (const period of PERIODS) {
    const page = pageForPeriod(period);
    const years = [...page.plateYears].sort((a, b) => a - b);
    years.forEach((year, i) => {
      rows.push({
        key: `catalogue-${period.id}-${year}-${i}`,
        grade: 'printed',
        href: `/works/periods/${period.id}/`,
        thumb: null,
        title: `A painting of ${year}`,
        titleIsDescriptive: true,
        year,
        dateText: String(year),
        periodId: period.id,
        mediumStated: null,
        mediumFacet: NOT_STATED,
        dimensionsStated: null,
        largestEdge: null,
        priceStated: null,
        priceBucket: null,
        dispositions: [],
        placeIds: [],
        placeNames: [],
        meta: `Reproduced on page ${page.page} of the retrospective typescript, under “${period.heading}”`,
        body: period.heading,
      });
    });
  }

  // ------------------------------------- named: the 57 works the sheets attest
  for (const w of allAttestedWorks) {
    const sheet = w.source_page ? pageOf(w.source_id, w.source_page) : pageOf(w.source_id, 1);
    const places = w.place_refs
      .map((r) => ({ id: r.place_id, name: getPlace(r.place_id)?.name }))
      .filter((p): p is { id: string; name: string } => Boolean(p.name));
    // Only a year the source itself stated places a work; an inferred one does not.
    const placedYear = w.date_basis === 'stated_on_source' ? w.date_earliest : null;
    rows.push({
      key: w.id,
      grade: 'named',
      href: `/works/attested/#${w.id}`,
      thumb: sheet?.thumb ?? null,
      title: w.title_stated ?? 'Untitled',
      titleIsDescriptive: !w.title_stated,
      year: placedYear,
      dateText: w.date_text,
      periodId: periodOf(placedYear)?.id ?? null,
      mediumStated: w.medium_stated,
      mediumFacet: normaliseMedium(w.medium_stated),
      dimensionsStated: w.dimensions_stated,
      largestEdge: largestDimension(w.dimensions_stated),
      priceStated: w.price_stated,
      priceBucket: priceBucketOf(w.price_usd),
      dispositions: w.dispositions,
      placeIds: places.map((p) => p.id),
      placeNames: places.map((p) => p.name),
      meta: `Named on a sheet the estate holds${w.artist_number ? ` · Sievan’s number ${w.artist_number}` : ''}`,
      body: [w.quote, w.counterparty_raw, w.artist_number, w.notes]
        .filter(Boolean).join(' '),
    });
  }

  return rows;
}
