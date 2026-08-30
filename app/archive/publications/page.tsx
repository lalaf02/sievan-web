import type { Metadata } from 'next';
import Link from 'next/link';
import { allPublications, articlesForPublication } from '@/lib/data';
import styles from './publications.module.css';

export const metadata: Metadata = {
  title: 'Publications',
  description: 'The newspapers and magazines that covered Maurice Sievan, 1940–1983.',
};

const TYPE_LABEL: Record<string, string> = {
  newspaper: 'Newspaper',
  magazine: 'Magazine',
  other: 'Other',
  unknown: '',
};

export default function PublicationsPage() {
  const rows = allPublications
    .map((p) => ({ pub: p, articles: articlesForPublication(p.id) }))
    .sort((a, b) => b.articles.length - a.articles.length || a.pub.name.localeCompare(b.pub.name));

  return (
    <div className="record">
      <header style={{ marginBottom: 'var(--s-5)' }}>
        <p className="eyebrow">The Archive</p>
        <h1>Publications</h1>
        <p className="measure muted">
          Thirty papers and magazines, from the <em>New York Times</em> to the{' '}
          <em>Nantucket Town Crier</em>. Spelling variants in the manifest have been
          merged; the original spellings survive as aliases.
        </p>
      </header>

      <ol className={styles.list}>
        {rows.map(({ pub, articles }) => (
          <li key={pub.id}>
            <Link href={`/archive/publications/${pub.id}/`} className={styles.row}>
              <span className={styles.name}>{pub.name}</span>
              <span className={styles.type}>{TYPE_LABEL[pub.type] ?? ''}</span>
              <span className={`${styles.count} tnum`}>
                {articles.length}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
