import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { artworkDatingCoverage, contentsForPeriod, counts } from '@/lib/data';
import { LifeChapter, LifeChapters } from '@/components/LifeChapters';
import { PeriodSource } from '@/components/PeriodSource';
import { PERIODS, formatSpan, pageForPeriod } from '@/lib/periods';
import type { PeriodId } from '@/lib/periods';
import styles from './works.module.css';

export const metadata: Metadata = {
  title: 'Catalogue Raisonné',
  description: 'Maurice Sievan’s work and artistic development across six decades.',
};

const periodNarratives: Record<PeriodId, string> = {
  beginnings:
    'From a teenage cartoonist at the Jewish Daily Forward to study at the National Academy of Design and in Paris, Sievan built the command of drawing that would remain underneath every later experiment.',
  landscapes:
    'New York streets, Flushing suburbs, Woodstock, and Provincetown gave Sievan a world close at hand. Across the 1930s and 1940s, observed landscape opened gradually toward a more personal, semi-abstract language.',
  'new-freedom':
    'A European journey in 1956 changed the terms of the work. Sievan stopped relying on direct observation and began making paintings where remembered places, present experience, and pictorial invention could occupy the same surface.',
  'larger-scale':
    'In the 1960s, the canvases expanded in size and ambition. Sievan approached the force of Abstract Expressionism without surrendering the mysterious figures and fragments of place that made the paintings unmistakably his.',
  'summing-up':
    'The late paintings compressed a lifetime of looking into small, intensely worked surfaces. Representation and abstraction no longer appear as opposites here, but as parts of one accumulated visual language.',
};

export default function WorksPage() {
  const coverage = artworkDatingCoverage();

  return (
    <div className="pageWide">
      <header className={styles.header}>
        <p className="eyebrow">The work</p>
        <h1>Catalogue Raisonné</h1>
        <div className={styles.overview}>
          <p>Maurice Sievan sustained a six-decade practice through enormous changes in American painting, keeping the figure even as New York turned toward pure abstraction.</p>
          <p>His work moved from observed streets and landscapes toward memory, larger scale, and a late synthesis in which representation and abstraction became inseparable.</p>
          <p>This catalogue is both the route through that achievement and the evidence for it: surviving works, reproduced paintings, period documents, and the paintings Sievan recorded in his own hand.</p>
        </div>
        <Link className={styles.search} href="/works/search/">Search the complete catalogue →</Link>
      </header>

      <LifeChapters label="Catalogue career periods">
        {PERIODS.map((period) => {
          const source = pageForPeriod(period);
          const contents = contentsForPeriod(period);
          return (
            <LifeChapter id={period.id} title={period.name} key={period.id}>
              <h2>{period.heading}</h2>
              <figure className={styles.marginMedia}>
                <Link href={`/works/periods/${period.id}/`}>
                  <Image
                    src={source.image}
                    alt={`Retrospective catalogue page for ${period.heading}`}
                    width={1200}
                    height={1600}
                    sizes="(max-width: 860px) 90vw, 22rem"
                  />
                </Link>
                <figcaption>Retrospective catalogue, page {source.page}</figcaption>
              </figure>
              <p className={`${styles.periodSpan} tnum`}>{formatSpan(period)}</p>
              <p>{periodNarratives[period.id]}</p>
              <dl className={styles.evidence} aria-label={`Evidence surviving for ${period.name}`}>
                <div><dt>Catalogue plates</dt><dd>{contents.catalogueYears.length}</dd></div>
                <div><dt>Gallery reproductions</dt><dd>{contents.plates.length}</dd></div>
                <div><dt>Estate-held sheets</dt><dd>{contents.worksOnPaper.length}</dd></div>
                <div><dt>Attested paintings</dt><dd>{contents.attested.length}</dd></div>
              </dl>
              <Link className={styles.periodLink} href={`/works/periods/${period.id}/`}>
                Enter this period and examine its evidence →
              </Link>
            </LifeChapter>
          );
        })}
      </LifeChapters>

      <div className={styles.sourceNote}>
        <p>
          The dated record remains partial: {coverage.dated} of {coverage.total} artwork records state a year.
          The other {coverage.undated} remain available by medium, place, size, and evidence in catalogue search.
        </p>
        <PeriodSource />
      </div>

      <nav className={styles.pathways} aria-label="Continue exploring the Catalogue Raisonné">
        <Link href="/works/search/"><span>Complete index</span>Search every catalogue record</Link>
        <Link href="/works/periods/"><span>Career</span>The five periods in full</Link>
        <Link id="works-on-paper" href="/works/search/?evidence=held"><span>Works on paper</span>{counts.worksOnPaperCatalogued} catalogued sheets</Link>
        <Link id="the-catalogue-of-paintings" href="/works/search/?evidence=reproduced"><span>Paintings</span>Surviving reproductions</Link>
        <Link href="/works/attested/"><span>Documentary evidence</span>{counts.attestedWorks} attested paintings</Link>
      </nav>
    </div>
  );
}
