import type { Metadata } from 'next';
import Link from 'next/link';
import { artworkDatingCoverage, counts } from '@/lib/data';
import { PeriodSpine } from '@/components/PeriodSpine';
import { PeriodSource } from '@/components/PeriodSource';
import styles from './works.module.css';

export const metadata: Metadata = {
  title: 'Catalogue Raisonné',
  description: 'Maurice Sievan’s work, arranged along the five periods named by his retrospective catalogue.',
};

const doors = [
  { id: 'periods', href: '/works/periods/', eyebrow: 'Career', title: 'The five periods', text: 'Read the retrospective’s account and see every dated work in its period.' },
  { id: 'works-on-paper', href: '/works/search/?evidence=held', eyebrow: 'Works on paper', title: `${counts.worksOnPaperCatalogued} catalogued sheets`, text: 'The drawings held and photographed by the estate, filterable by medium.' },
  { id: 'the-catalogue-of-paintings', href: '/works/search/?evidence=reproduced', eyebrow: 'Paintings', title: 'Surviving reproductions', text: 'Paintings reproduced in gallery catalogues and the retrospective typescript.' },
  { id: 'attested', href: '/works/attested/', eyebrow: 'Documentary evidence', title: `${counts.attestedWorks} attested paintings`, text: 'Works Sievan named on his sheets that the archive does not hold.' },
] as const;

export default function WorksPage() {
  const coverage = artworkDatingCoverage();
  return (
    <div className="page">
      <header className={styles.header}>
        <p className="eyebrow">The work</p>
        <h1>Catalogue Raisonné</h1>
        <p className={styles.lede}>Sievan kept the figure when New York gave it up and returned for fifty years to the harbour, the suburbs, and the studio. The retrospective catalogue understood that career as five connected periods; this page is the way into them and into the records that survive.</p>
        <Link className={styles.search} href="/works/search/">Search the complete catalogue →</Link>
      </header>

      <PeriodSpine />
      <p className={styles.timelineNote}>
        Every mark is a dated work: {coverage.dated} of {coverage.total} artwork records state a year.
        The remaining {coverage.undated} can be found by medium, place, size, or evidence in the catalogue search.
      </p>
      <PeriodSource />

      <nav className={styles.doors} aria-label="Browse the catalogue">
        {doors.map((door) => <Link id={door.id} key={door.href} href={door.href}>
          <span className={styles.eyebrow}>{door.eyebrow}</span>
          <strong>{door.title}</strong>
          <span>{door.text}</span>
        </Link>)}
      </nav>
    </div>
  );
}
