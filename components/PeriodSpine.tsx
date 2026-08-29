/**
 * The chronological spine: five periods laid out to scale across Sievan's career,
 * with every dated work plotted on it as a mark.
 *
 * A SERVER component, and interactive without a line of JavaScript — every period and
 * every mark is a link, so the whole thing works as navigation with scripting off
 * because it *is* navigation. Hover and focus states are CSS. The archive's rule that
 * everything must read without JavaScript is satisfied by construction here rather
 * than by care, which is the same reason AttestedWorkList is a server component.
 *
 * Laid out to scale on purpose. Equal-width periods would draw a career of five even
 * stages; the real shape is a nineteen-year middle period and a seven-year one, and
 * the sparseness of the marks is the honest picture of how little is dated.
 */
import Link from 'next/link';
import { CAREER_SPAN, PERIODS, formatSpan } from '@/lib/periods';
import type { Period, PeriodId } from '@/lib/periods';
import { contentsForPeriod } from '@/lib/data';
import styles from './PeriodSpine.module.css';

interface Mark {
  year: number;
  label: string;
  href: string;
}

/**
 * Several works sharing a year, drawn as one mark.
 *
 * Five of the attested works are dated 1970 and were being drawn as five 3px marks at
 * exactly the same x — indistinguishable from one, and four of them unreachable. They
 * are now one wider mark that names everything at that year.
 */
interface YearMark {
  year: number;
  href: string;
  count: number;
  label: string;
}

function groupByYear(marks: Mark[], fallbackHref: string): YearMark[] {
  const byYear = new Map<number, Mark[]>();
  for (const m of marks) {
    if (!byYear.has(m.year)) byYear.set(m.year, []);
    byYear.get(m.year)!.push(m);
  }
  return [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, ms]) => {
      // One destination only where every work at this year shares it; otherwise the
      // period page, which lists them all. Never an arbitrary pick among them.
      const hrefs = new Set(ms.map((m) => m.href));
      return {
        year,
        href: hrefs.size === 1 ? ms[0].href : fallbackHref,
        count: ms.length,
        label: ms.length === 1 ? ms[0].label : `${year} · ${ms.map((m) => m.label.replace(/^[^·]*·\s*/, '')).join('; ')}`,
      };
    });
}

/**
 * Everything dated inside one period, as marks.
 *
 * The catalogue's own plates carry a year but no title, medium or dimensions — the
 * archive records nothing else about them — so they are marked by year alone and link
 * to the period page rather than pretending to be a record.
 */
function marksFor(period: Period): Mark[] {
  const { catalogueYears, plates, worksOnPaper, attested } = contentsForPeriod(period);
  const href = `/works/periods/${period.id}/`;
  return [
    ...catalogueYears.map((year) => ({
      year,
      label: `${year} · a plate in the retrospective catalogue`,
      href,
    })),
    ...plates.map((p) => ({
      year: p.year as number,
      label: `${p.year} · ${p.title}, reproduced by a gallery`,
      href: `/archive/objects/${p.objectId}/`,
    })),
    ...worksOnPaper.map((o) => ({
      year: o.date_earliest as number,
      label: `${o.date_text} · ${o.id}, a sheet the estate holds`,
      href: `/archive/objects/${o.id}/`,
    })),
    ...attested.map((w) => ({
      year: w.date_earliest as number,
      label: `${w.date_text} · ${w.title_stated ?? 'untitled'}, a painting Sievan named`,
      href: `/works/attested/#${w.id}`,
    })),
  ].sort((a, b) => a.year - b.year);
}

export function PeriodSpine({ current }: { current?: PeriodId }) {
  const [careerStart, careerEnd] = CAREER_SPAN;
  const careerYears = careerEnd - careerStart + 1;

  return (
    <nav className={styles.spine} aria-label="The five periods, in order">
      <ol className={styles.track}>
        {PERIODS.map((period) => {
          const span = period.to - period.from + 1;
          const href = `/works/periods/${period.id}/`;
          const marks = groupByYear(marksFor(period), href);
          const dated = marks.reduce((n, m) => n + m.count, 0);
          const isCurrent = period.id === current;
          return (
            <li
              key={period.id}
              className={isCurrent ? `${styles.band} ${styles.current}` : styles.band}
              /* Width proportional to the years the period covers. */
              style={{ flexGrow: span, flexBasis: `${(span / careerYears) * 100}%` }}
            >
              <Link
                href={href}
                className={styles.bandLink}
                aria-current={isCurrent ? 'page' : undefined}
              >
                <span className={styles.bandName}>{period.name}</span>
                {/* Span and count share one line: the rail was three stacked lines
                    tall and dominated the work it was meant to introduce. */}
                <span className={`${styles.bandMeta} tnum`}>
                  {formatSpan(period)} · {dated} dated
                </span>
              </Link>

              <div className={styles.plot}>
                {marks.map((m) => (
                  <Link
                    key={m.year}
                    href={m.href}
                    className={m.count > 1 ? `${styles.mark} ${styles.markMany}` : styles.mark}
                    style={{ left: `${((m.year - period.from) / span) * 100}%` }}
                    title={m.label}
                    aria-label={m.label}
                  >
                    <span className={styles.markLabel}>{m.label}</span>
                  </Link>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
