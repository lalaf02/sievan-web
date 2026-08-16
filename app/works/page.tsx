import type { Metadata } from 'next';
import Link from 'next/link';
import { allPaintings, counts } from '@/lib/data';
import { WorksBrowser } from '@/components/WorksBrowser';
import styles from './works.module.css';

export const metadata: Metadata = {
  title: 'Works',
  description: 'The catalogue of Maurice Sievan’s paintings — in preparation.',
};

export default function WorksPage() {
  const paintings = allPaintings;

  // The browser is fully built; it simply has nothing to list yet. When
  // seed_paintings.json fills, this page turns on with no code change.
  if (paintings.length > 0) {
    return (
      <div className="page" style={{ paddingTop: 'var(--s-6)' }}>
        <header style={{ marginBottom: 'var(--s-5)' }}>
          <h1>Works</h1>
        </header>
        <WorksBrowser paintings={paintings} />
      </div>
    );
  }

  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)' }}>
      <header style={{ marginBottom: 'var(--s-6)' }}>
        <h1>Works</h1>
      </header>

      <div className={styles.pendingLayout}>
        {/*
          The real filter rail, disabled. Showing the chrome tells a visitor
          concretely what is coming, and makes this page a live smoke test the day
          the catalogue arrives.
        */}
        <aside className={styles.ghostRail} aria-hidden="true">
          <p className={styles.ghostLabel}>Search</p>
          <div className={styles.ghostInput} />
          <p className={styles.ghostLabel}>Date</p>
          <div className={styles.ghostChips}>
            <span className={styles.ghostChip} />
            <span className={styles.ghostChip} />
            <span className={styles.ghostChip} />
          </div>
          <p className={styles.ghostLabel}>Medium</p>
          <div className={styles.ghostLine} />
          <div className={styles.ghostLine} />
          <div className={styles.ghostLine} />
          <p className={styles.ghostLabel}>Collection</p>
          <div className={styles.ghostLine} />
          <div className={styles.ghostLine} />
        </aside>

        <div className={styles.pending}>
          <p className="eyebrow">In preparation</p>
          <h2 className={styles.pendingTitle}>The catalogue of works is being assembled.</h2>
          <p className={styles.pendingBody}>
            Sievan’s paintings are being photographed and catalogued now. When the
            catalogue opens, this page will list every known work with its date, medium,
            dimensions and exhibition history — and connect each one to what was written
            and said about it.
          </p>
          <p className={styles.pendingBody}>
            In the meantime the archive documents{' '}
            <Link href="/exhibitions/">{counts.exhibitions} exhibitions</Link> between 1939
            and 2006, <Link href="/archive/press/">{counts.newsArticles} press notices</Link>{' '}
            written between 1940 and 1983, and{' '}
            <Link href="/life/interviews/">
              {counts.transcriptWords.toLocaleString()} words
            </Link>{' '}
            of recollection from the people who knew him.
          </p>
        </div>
      </div>
    </div>
  );
}
