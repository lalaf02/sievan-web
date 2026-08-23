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
  if (!iso) return 0;
  // Validate basic ISO date format
  const parts = iso.split('-');
  // Ensure each part is numeric (allows for proper date validation)
  if (parts.some((p) => p && isNaN(Number(p)))) return 0;
  return Math.min(parts.length, 3); // Cap at 3 components
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
  const parts = iso.split('-');
  const [y, m, d] = parts;
  if (!m) return y;
  const monthNum = Number(m);
  // Validate month is in range 1-12
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    console.warn(`Invalid month in date: ${iso}`);
    return iso; // Return raw string for invalid dates
  }
  const month = MONTHS[monthNum - 1];
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
  const startParts = start!.split('-');
  const endParts = end.split('-');
  const [sy, sm, sd] = startParts;
  const [ey, em, ed] = endParts;

  // Only collapse to range format if both dates have all required parts
  if (sy && sm && sd && ey && em && ed && sy === ey && sm === em) {
    const monthNum = Number(sm);
    const month = (monthNum >= 1 && monthNum <= 12) ? MONTHS[monthNum - 1] : sm;
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

/** Runtime as "45 min" / "1 hr 12 min" — precision below the minute is noise here. */
export function formatDuration(seconds: number | null): string | null {
  if (seconds == null || seconds <= 0) return null;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}
