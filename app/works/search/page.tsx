import type { Metadata } from 'next';
import Link from 'next/link';
import { allPlaces, artworkDatingCoverage } from '@/lib/data';
import { PERIODS } from '@/lib/periods';
import { buildArtworkIndex } from '@/lib/artworkIndex';
import { countByGrade, GRADES } from '@/lib/artworkGrades';
import { ArtworkBrowser } from '@/components/ArtworkBrowser';
import styles from './search.module.css';

export const metadata: Metadata = {
  title: 'Find a work — Catalogue Raisonné',
  description:
    'Search every artwork record in the Maurice Sievan archive: the works on paper the '
    + 'estate holds, the reproductions his galleries printed, the plates inside the '
    + 'retrospective typescript, and the paintings his own sheets name.',
};

/**
 * Mode 2: find one work.
 *
 * A route of its own rather than a tab on /works/. A toggle would mean the editorial
 * page existed only once client state said so, which strips it out of the prerendered
 * HTML — the regression CLAUDE.md calls "easy to reintroduce and nearly invisible in
 * review". Two routes, each of which reads with scripting off.
 *
 * The index is built here, at build time, and handed to the browser as props — the
 * same arrangement as app/archive/search/page.tsx. See lib/artworkIndex.ts for why it
 * is not in `derived`.
 */
export default function WorkSearchPage() {
  const rows = buildArtworkIndex();
  const by = countByGrade(rows);
  const coverage = artworkDatingCoverage();

  // Passed in rather than looked up in the client: the gazetteer is server data, and
  // the browser should not need the bundle to render a facet label.
  const placeLabels = Object.fromEntries(allPlaces.map((p) => [p.id, p.name]));
  const periodLabels = Object.fromEntries(PERIODS.map((p) => [p.id, p.name]));

  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)' }}>
      <header className="measure" style={{ marginBottom: 'var(--s-5)' }}>
        <p className="eyebrow">Catalogue Raisonné</p>
        <h1>Find a work</h1>
        <p className={styles.lede}>
          Everything the archive holds evidence of, in one place — searchable by title,
          place, size, medium, price or buyer. For the way through the work rather than
          into it, see <Link href="/works/">the catalogue</Link>.
        </p>
      </header>

      {/*
        The four grades, stated before the rail rather than discovered inside it.
        A reader who filters to "Named on a sheet" and finds no images needs to already
        know why: these are paintings nobody has seen. Counted separately here for the
        same reason they are counted separately everywhere — see lib/artworkIndex.ts.
      */}
      <section className={styles.grades} aria-labelledby="grades">
        <h2 id="grades" className={styles.gradesTitle}>
          Four kinds of evidence, kept apart
        </h2>
        <ol className={styles.gradeList}>
          {GRADES.map((g) => (
            <li key={g.id} className={styles.gradeItem}>
              <span className={`${styles.gradeCount} tnum`}>{by[g.id]}</span>
              <span className={styles.gradeLabel}>{g.label}</span>
              <span className={styles.gradeNote}>{g.note}</span>
            </li>
          ))}
        </ol>
        <p className={styles.gradesNote}>
          These four numbers are never added together. A painting Sievan wrote down on a
          sheet is not a work in the catalogue, and the archive has{' '}
          <strong>no catalogue entry for any finished painting</strong> —{' '}
          <Link href="/works/#the-catalogue-of-paintings">what is still missing</Link>.
          Of all of them,{' '}
          <span className="tnum">{coverage.dated}</span> carry a year and{' '}
          <span className="tnum">{coverage.undated}</span> carry none, so the period
          filter can only reach the first.
        </p>
      </section>

      <ArtworkBrowser
        rows={rows}
        placeLabels={placeLabels}
        periodLabels={periodLabels}
      />
    </div>
  );
}
