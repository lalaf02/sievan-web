import type { Metadata } from 'next';
import Link from 'next/link';
import { PERIODS, formatSpan, pageForPeriod } from '@/lib/periods';
import { artworkDatingCoverage, contentsForPeriod, undatedArtwork } from '@/lib/data';
import { PeriodSpine } from '@/components/PeriodSpine';
import { PeriodSource } from '@/components/PeriodSource';
import styles from './periods.module.css';

export const metadata: Metadata = {
  title: 'The five periods',
  description:
    'The retrospective catalogue divides Maurice Sievan’s career into five periods. '
    + 'This is the archive’s artwork placed in them — and the larger part of it that '
    + 'carries no year at all.',
};

/**
 * The per-kind breakdown for one period.
 *
 * Four grades of evidence, never added together: a plate the catalogue printed, a
 * reproduction a gallery printed, a sheet the estate holds, and a painting Sievan
 * named on a sheet. A single total would flatten the difference between a work that
 * survives as an image and one that survives as a line in his handwriting.
 */
function Breakdown({ periodId }: { periodId: (typeof PERIODS)[number]['id'] }) {
  const period = PERIODS.find((p) => p.id === periodId)!;
  const { catalogueYears, plates, worksOnPaper, attested } = contentsForPeriod(period);
  const rows: [string, number][] = [
    ['Plates in the retrospective catalogue', catalogueYears.length],
    ['Reproduced by a gallery', plates.length],
    ['Sheets the estate holds', worksOnPaper.length],
    ['Paintings named, not held', attested.length],
  ];
  return (
    <dl className={styles.breakdown}>
      {rows.map(([label, n]) => (
        <div key={label} className={n === 0 ? `${styles.row} ${styles.zero}` : styles.row}>
          <dt>{label}</dt>
          <dd className="tnum">{n === 0 ? 'none' : n}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function PeriodsPage() {
  const coverage = artworkDatingCoverage();
  const undated = undatedArtwork();

  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)' }}>
      <header className="measure" style={{ marginBottom: 'var(--s-6)' }}>
        <Link href="/works/" className={styles.back}>← Catalogue Raisonné</Link>
        <h1>The five periods</h1>
        <p className={styles.lede}>
          The retrospective catalogue, <Link href="/life/retrospective/">MS-AR-00026</Link>,
          divides Sievan’s career into five periods and prints thirteen dated plates
          across them. This is the route through those periods, and everything else in
          the archive that carries a year placed alongside them.
        </p>
        <p className={styles.lede}>
          <strong>
            <span className="tnum">{coverage.dated}</span> of the archive’s{' '}
            <span className="tnum">{coverage.total}</span> artwork records carry a year.
          </strong>{' '}
          The other <span className="tnum">{coverage.undated}</span> carry none, and
          cannot be placed in a period at all — so what follows is a fifth of the work,
          not a map of the career. Nothing below has been dated by inference.
        </p>
        <PeriodSource />
      </header>

      <PeriodSpine />

      <ol className={styles.periods}>
        {PERIODS.map((period) => {
          const page = pageForPeriod(period);
          const href = `/works/periods/${period.id}/`;
          return (
            <li key={period.id} className={styles.period}>
              {/*
                The catalogue page itself. These plates cannot be lifted out of the
                page they are printed on — that is exactly the gap this catalogue
                exists to close — so the page is the image.
              */}
              <Link href={href} className={styles.periodMedia}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={page.image}
                  alt={`Retrospective catalogue page ${page.page}: ${period.heading}`}
                  loading="lazy"
                  decoding="async"
                />
              </Link>
              <div className={styles.periodBody}>
                <h2 className={styles.periodTitle}>
                  <Link href={href}>{period.name}</Link>
                </h2>
                {/* The catalogue's own heading, verbatim, beside the archive's range. */}
                <p className={styles.periodHeading}>{period.heading}</p>
                <p className={`${styles.periodSpan} tnum`}>{formatSpan(period)}</p>
                <Breakdown periodId={period.id} />
              </div>
            </li>
          );
        })}
      </ol>

      <section className={styles.section}>
        <h2>Outside the chronology</h2>
        <p className={styles.lede}>
          <span className="tnum">{coverage.undated}</span> artwork records carry no year,
          so no period can hold them. They are not a remainder — they are most of what
          the archive has.
        </p>
        <dl className={styles.breakdown}>
          <div className={styles.row}>
            <dt>
              <Link href="/works/#works-on-paper">Sheets the estate holds</Link>
            </dt>
            <dd className="tnum">{undated.worksOnPaper.length}</dd>
          </div>
          <div className={styles.row}>
            <dt><Link href="/works/attested/">Paintings named, not held</Link></dt>
            <dd className="tnum">{undated.attested.length}</dd>
          </div>
          <div className={styles.row}>
            <dt>Reproduced by a gallery</dt>
            <dd className="tnum">{undated.plates.length}</dd>
          </div>
        </dl>
        <p className={styles.note}>
          Twenty-four of the twenty-five sheets the estate holds are undated: Sievan
          wrote a title, a size and a price beside his drawings, and only rarely a year.
          Forty-seven of the fifty-seven paintings he named are undated for the same
          reason. <em>Provincetown Harbor</em> is undated by decision rather than by
          omission — the archive records its catalogue as 1957, the checklist reads
          “April 16 — May 5” with <span className="tnum">1951</span> pencilled at the
          foot, and until that is resolved the archive does not choose between them.
        </p>
      </section>
    </div>
  );
}
