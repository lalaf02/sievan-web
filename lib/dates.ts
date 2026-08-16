/**
 * Partial-date handling.
 *
 * A date library is the wrong tool here. These are not instants — they are ISO
 * strings truncated to whatever precision the source supported ("1951", "1951-04",
 * "1951-04-15"), sometimes hedged by the source itself ("February (1941?)"). The
 * logic below is about *precision*, which no date library models.
 */
import type { DatePrecision, PartialDate } from './types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** How many components a partial ISO date carries: 3 = day, 2 = month, 1 = year. */
export function componentsOf(iso: PartialDate): number {
  return iso ? iso.split('-').length : 0;
}

export function precisionOf(iso: PartialDate): DatePrecision {
  switch (componentsOf(iso)) {
    case 3: return 'day';
    case 2: return 'month';
    case 1: return 'year';
    default: return 'unknown';
  }
}

/** "1951-04-15" -> "April 15, 1951"; "1951-04" -> "April 1951"; "1951" -> "1951". */
export function formatPartial(iso: PartialDate): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  if (!m) return y;
  const month = MONTHS[Number(m) - 1] ?? m;
  return d ? `${month} ${Number(d)}, ${y}` : `${month} ${y}`;
}

/**
 * Format a date range.
 *
 * 13 of 15 exhibitions carry an end_date *less* precise than their start_date
 * (start "1939-04-01", end "1939"), which naively renders "April 1, 1939 – 1939".
 * A less precise end is not a range — it is the same date restated vaguely, so
 * it is dropped. Only albert-landry-1963 is a genuine range.
 */
export function formatRange(start: PartialDate, end: PartialDate): string | null {
  const from = formatPartial(start);
  if (!from) return formatPartial(end);
  if (!end || componentsOf(end) <= componentsOf(start)) return from;

  // Same month and year: "February 7–28, 1963" rather than repeating the month.
  const [sy, sm] = start!.split('-');
  const [ey, em, ed] = end.split('-');
  if (sy === ey && sm === em && ed) {
    const sd = start!.split('-')[2];
    const month = MONTHS[Number(sm) - 1] ?? sm;
    return `${month} ${Number(sd)}–${Number(ed)}, ${sy}`;
  }
  return `${from} – ${formatPartial(end)}`;
}

/**
 * Display string for an article date, preserving the source's own uncertainty
 * rather than silently resolving it.
 */
export function formatArticleDate(
  iso: PartialDate,
  text: string | null,
  uncertain: boolean,
): string | null {
  const base = formatPartial(iso) ?? text;
  if (!base) return null;
  return uncertain ? `${base} (uncertain in source)` : base;
}

export const decadeOf = (year: number | null): number | null =>
  year == null ? null : Math.floor(year / 10) * 10;

export const decadeLabel = (decade: number | string): string => `${decade}s`;

/** Year span of a set of dated things, for timeline axes. */
export function yearExtent(items: { year: number; yearEnd: number }[]): [number, number] | null {
  if (!items.length) return null;
  let lo = Infinity;
  let hi = -Infinity;
  for (const it of items) {
    if (it.year < lo) lo = it.year;
    if (it.yearEnd > hi) hi = it.yearEnd;
  }
  return [lo, hi];
}
