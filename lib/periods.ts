/**
 * The five periods the retrospective catalogue divides Sievan's career into.
 *
 * The PERIODS are the catalogue's own — page 3 to page 7 of MS-AR-00026, each with a
 * printed section heading and a handful of dated plates beneath it. The YEAR RANGES
 * are not the catalogue's, and the distinction is the whole reason this module exists.
 *
 * The catalogue's divisions overlap. "Beginnings (1915–30)" and "Landscapes (1930s and
 * ’40s)" both claim 1930; "A New Freedom (The ’50s and ’60s)" and "A Larger Scale (The
 * ’60s)" both claim the entire 1960s. Overlapping buckets cannot order a catalogue, so
 * the archive states disjoint ranges of its own and says so on every page that shows
 * one — see PERIOD_SOURCE, and render it through components/PeriodSource.tsx.
 *
 * The ranges are not invented. Each boundary is drawn from the years the catalogue
 * itself printed beside its plates, and `assertPlateYearsAgree` below fails the build
 * if a boundary is ever moved somewhere the catalogue's own plates contradict.
 *
 * Derived FROM RETROSPECTIVE_PAGES rather than restating it, on the same principle as
 * MUSEUM_COLLECTIONS in lib/validation.ts: a parallel list of headings would drift the
 * first time somebody corrected a transcription, and the drift would be silent.
 */
import { RETROSPECTIVE_PAGES } from './retrospective';
import type { RetrospectivePage } from './retrospective';

export type PeriodId =
  | 'beginnings' | 'landscapes' | 'new-freedom' | 'larger-scale' | 'summing-up';

export interface Period {
  id: PeriodId;
  /** Short label, for a rail or a breadcrumb where the full heading will not fit. */
  name: string;
  /** The catalogue's heading, verbatim. Must match a RETROSPECTIVE_PAGES entry. */
  heading: string;
  /** The retrospective catalogue page it is printed on. */
  page: number;
  /** The ARCHIVE's reading, not the catalogue's. Disjoint, and stated as such. */
  from: number;
  to: number;
  /** Why this range, in the archive's own words. Shown on the period page. */
  rationale: string;
}

/**
 * The one sentence that must accompany every rendering of a year range.
 *
 * Written once for the reason CV_SOURCE was written once (lib/retrospective.ts): that
 * caveat had been spelled out three times in three wordings across three files, and a
 * caveat that drifts is a caveat nobody trusts.
 */
export const PERIOD_SOURCE =
  'The five periods are the retrospective catalogue’s own, MS-AR-00026 pages 3–7. '
  + 'The year ranges are not: the catalogue’s divisions overlap at 1930 and across '
  + 'the 1960s, so the archive states disjoint ranges of its own, drawn from the years '
  + 'printed beside the catalogue’s plates.';

/**
 * Sievan died in 1981, which closes the last period. There is no open end here: a
 * range running to the present would collect a year no work of his can carry.
 */
const DEATH_YEAR = 1981;

export const PERIODS: Period[] = [
  {
    id: 'beginnings',
    name: 'Beginnings',
    heading: 'Beginnings (1915–30)',
    page: 3,
    from: 1915,
    to: 1930,
    rationale:
      'The catalogue writes this range out in numerals. “Landscapes” only says '
      + '“1930s” in prose, so the explicit claim takes 1930 — and the plates on '
      + 'this page, 1925 and two of 1930, are printed here rather than there.',
  },
  {
    id: 'landscapes',
    name: 'Landscapes',
    heading: 'Landscapes (1930s and ’40s)',
    page: 4,
    from: 1931,
    to: 1949,
    rationale:
      'Opens where "Beginnings" closes and runs to the end of the decade the heading '
      + 'names. Its plates are 1938, 1945 and 1948.',
  },
  {
    id: 'new-freedom',
    name: 'A New Freedom',
    heading: 'A New Freedom (The ’50s and ’60s)',
    page: 5,
    from: 1950,
    to: 1962,
    rationale:
      'The heading claims the 1960s as well, but every plate on the page is a 1950s '
      + 'work — 1952, 1954, 1957 — and the next page’s begin at 1963. '
      + 'The archive splits the two there, where the catalogue’s own plates do.',
  },
  {
    id: 'larger-scale',
    name: 'A Larger Scale',
    heading: 'A Larger Scale (The ’60s)',
    page: 6,
    from: 1963,
    to: 1969,
    rationale:
      'Takes the second half of the decade the previous heading also claims. Its '
      + 'plates are 1963 and 1964, the earliest years no earlier page claims.',
  },
  {
    id: 'summing-up',
    name: 'Summing Up',
    heading: 'Summing Up (The ’70s)',
    page: 7,
    from: 1970,
    to: DEATH_YEAR,
    rationale:
      'The decade the heading names, closed at Sievan’s death rather than left '
      + 'open. Its plates are 1970 and 1975.',
  },
];

// ------------------------------------------------------- gates, at module scope

/**
 * Every heading must occur verbatim in the catalogue's own transcription.
 *
 * This is what makes the list above a derivation rather than a copy: correct a
 * transcription in lib/retrospective.ts and this throws until the correction is
 * carried across, instead of the two quietly disagreeing.
 */
function assertHeadingsExist(): Map<PeriodId, RetrospectivePage> {
  const byHeading = new Map(
    RETROSPECTIVE_PAGES.filter((p) => p.heading).map((p) => [p.heading as string, p]),
  );
  const pages = new Map<PeriodId, RetrospectivePage>();
  for (const period of PERIODS) {
    const page = byHeading.get(period.heading);
    if (!page) {
      throw new Error(
        `lib/periods.ts: no retrospective page carries the heading ${JSON.stringify(period.heading)} `
        + `(period "${period.id}"). The catalogue transcription in lib/retrospective.ts is the `
        + 'source; update the heading here to match it rather than the other way round.',
      );
    }
    if (page.page !== period.page) {
      throw new Error(
        `lib/periods.ts: period "${period.id}" claims catalogue page ${period.page}, but `
        + `${JSON.stringify(period.heading)} is printed on page ${page.page}.`,
      );
    }
    pages.set(period.id, page);
  }
  return pages;
}

/**
 * Every plate year must fall inside its own period's range.
 *
 * The ranges are the archive's, so they need something to be checkable against, and
 * the catalogue's own plate placement is exactly that: thirteen works the catalogue
 * itself filed under a heading. Move a boundary somewhere those thirteen contradict
 * and the build dies here rather than shipping a chronology the source disagrees with.
 */
function assertPlateYearsAgree(pages: Map<PeriodId, RetrospectivePage>): void {
  for (const period of PERIODS) {
    for (const year of pages.get(period.id)!.plateYears) {
      if (year < period.from || year > period.to) {
        throw new Error(
          `lib/periods.ts: the catalogue prints a ${year} plate under `
          + `${JSON.stringify(period.heading)}, but the archive's range for that period is `
          + `${period.from}–${period.to}. The catalogue's own placement is the evidence `
          + 'these ranges are drawn from; a boundary it contradicts is wrong.',
        );
      }
    }
  }
}

/** The ranges must tile the career with no gap and no overlap. That is the point. */
function assertRangesAreDisjoint(): void {
  for (let i = 0; i < PERIODS.length; i += 1) {
    const p = PERIODS[i];
    if (p.from > p.to) {
      throw new Error(`lib/periods.ts: period "${p.id}" runs backwards.`);
    }
    const next = PERIODS[i + 1];
    if (next && next.from !== p.to + 1) {
      throw new Error(
        `lib/periods.ts: "${p.id}" ends ${p.to} and "${next.id}" begins ${next.from}. `
        + 'The archive publishes these as disjoint and contiguous; a gap would silently '
        + 'drop every work dated inside it, and an overlap would place one work twice.',
      );
    }
  }
}

const PERIOD_PAGES = assertHeadingsExist();
assertPlateYearsAgree(PERIOD_PAGES);
assertRangesAreDisjoint();

// ------------------------------------------------------------------- accessors

const byId = new Map(PERIODS.map((p) => [p.id, p]));

export const getPeriod = (id: string): Period | undefined => byId.get(id as PeriodId);

/** The catalogue page a period is printed on, with its transcribed text and plates. */
export const pageForPeriod = (period: Period): RetrospectivePage =>
  PERIOD_PAGES.get(period.id)!;

/** The period a year falls in, or null for a year outside Sievan's working life. */
export function periodOf(year: number | null | undefined): Period | null {
  if (year == null) return null;
  return PERIODS.find((p) => year >= p.from && year <= p.to) ?? null;
}

/** The period before and after this one, for walking the five end to end. */
export function neighbours(period: Period): { previous: Period | null; next: Period | null } {
  const i = PERIODS.findIndex((p) => p.id === period.id);
  return { previous: PERIODS[i - 1] ?? null, next: PERIODS[i + 1] ?? null };
}

/** "1915–1930". Never rendered without PERIOD_SOURCE beside it. */
export const formatSpan = (period: Period): string =>
  `${period.from}–${period.to}`;

/** The full span the five periods cover, for laying the spine out to scale. */
export const CAREER_SPAN: [number, number] = [PERIODS[0].from, PERIODS[PERIODS.length - 1].to];
