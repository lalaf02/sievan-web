import type { Metadata } from 'next';
import Link from 'next/link';
import {
  allObjects, archive, counts, objectLead, OBJECT_TYPE_LABELS,
} from '@/lib/data';
import styles from './archive.module.css';

export const metadata: Metadata = {
  title: 'The archive',
  description:
    'One bankers box: fifty objects holding sixty press notices, exhibition catalogues, ' +
    'posters and promotional material, 1939–2006.',
};

export default function ArchivePage() {
  const byType = archive.derived.facets.objectType;
  const digitised = counts.objectsWithScans;
  const undigitised = counts.archiveObjects - digitised;

  const objects = [...allObjects].sort((a, b) => (a.date_earliest ?? 0) - (b.date_earliest ?? 0));

  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)' }}>
      <header style={{ marginBottom: 'var(--s-6)' }}>
        <p className="eyebrow">MS-CS-001</p>
        <h1>The archive</h1>
        <p className="measure muted">
          One bankers box, labelled <em>“Reprints of Reviews — Exhibition Catalogs &amp;
          Review Copies”</em>. Fifty catalogued objects: bundles of photocopied clippings,
          exhibition catalogues, posters, two books and assorted promotional material.
        </p>
      </header>

      <div className={styles.stats}>
        <Link href="/archive/press/" className={styles.stat}>
          <span className={styles.statNum}>{counts.newsArticles}</span>
          <span className={styles.statLabel}>press notices</span>
        </Link>
        <div className={styles.stat}>
          <span className={styles.statNum}>{counts.archiveObjects}</span>
          <span className={styles.statLabel}>physical objects</span>
        </div>
        <Link href="/archive/publications/" className={styles.stat}>
          <span className={styles.statNum}>{counts.publications}</span>
          <span className={styles.statLabel}>publications</span>
        </Link>
        {/*
          Stated plainly rather than concealed: a coverage figure reads as rigour,
          the same gap hidden reads as neglect.
        */}
        <div className={styles.stat}>
          <span className={styles.statNum}>
            {digitised}<span className={styles.statOf}>/{counts.archiveObjects}</span>
          </span>
          <span className={styles.statLabel}>digitised</span>
        </div>
      </div>

      <p className="ui muted" style={{ marginBottom: 'var(--s-6)' }}>
        {undigitised} objects — the last {undigitised} rows of the manifest — are
        catalogued but not yet scanned. Their records below are transcribed from the
        manifest.
      </p>

      <h2>What is in the box</h2>
      <ul className={styles.typeList}>
        {Object.entries(byType)
          .sort((a, b) => b[1] - a[1])
          .map(([type, n]) => (
            <li key={type}>
              <span className={styles.typeCount}>{n}</span>{' '}
              {OBJECT_TYPE_LABELS[type] ?? type}
              {n === 1 ? '' : 's'}
            </li>
          ))}
      </ul>

      <h2 style={{ marginTop: 'var(--s-7)' }}>Every object, in date order</h2>
      <ol className={styles.objects}>
        {objects.map((o) => (
          <li key={o.id}>
            <Link href={`/archive/objects/${o.id}/`} className={styles.objectRow}>
              <span className={`${styles.objectYear} tnum`}>{o.date_text ?? '—'}</span>
              <span className={styles.objectLead}>{objectLead(o)}</span>
              <span className={styles.objectMeta}>
                {o.scan_files.length === 0 && (
                  <span className={styles.notScanned}>not digitised</span>
                )}
                <span className={styles.objectId}>{o.id}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
