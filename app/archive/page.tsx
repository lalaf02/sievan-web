import type { Metadata } from 'next';
import Link from 'next/link';
import {
  allObjects, archive, counts, coverFor, objectLead, OBJECT_TYPE_LABELS,
} from '@/lib/data';
import { SheetTile, AbsentTile } from '@/components/MediaTile';
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

      <h2 className={styles.gridHeading}>Every object, in date order</h2>
      <p className="ui muted" style={{ marginBottom: 'var(--s-5)' }}>
        The sheet itself, where there is one. Everything links to its catalogue record.
      </p>

      {/*
        This was fifty rows of text across the full width, with a long horizontal void
        between each object's one-line description and its right-aligned id. The box
        is mostly paper with something printed on it, so the box should look like it.
        The twenty undigitised objects keep their place in the sequence as labelled
        empty frames — dropping them would make the archive look more complete than it
        is.
      */}
      {/*
        A plain grid, five across, and the fifty objects fill ten rows exactly.
        Deliberately uniform where the rest of the site is not: this is an index of
        fifty like-for-like things and reading order is the point, so the tiles run
        left to right in date order. Stacking them into columns of varying height
        looked better and quietly made "in date order" false — you would have been
        reading down one column and across another.
      */}
      <ol className={styles.objectGrid}>
        {objects.map((o) => {
          const cover = coverFor(o.id);
          const href = `/archive/objects/${o.id}/`;
          const caption = (
            <Link href={href} className={styles.tileLead}>{objectLead(o)}</Link>
          );
          const meta = `${o.id} · ${o.date_text ?? 'undated'}`;

          return (
            <li key={o.id}>
              {cover ? (
                <SheetTile
                  sheet={cover}
                  href={href}
                  aspect="3 / 4"
                  alt={`${objectLead(o)} — ${o.id}`}
                  caption={caption}
                  meta={meta}
                />
              ) : (
                <AbsentTile
                  aspect="3 / 4"
                  note="Catalogued from the manifest; no scan on file."
                  caption={caption}
                  meta={meta}
                />
              )}
            </li>
          );
        })}
      </ol>

    </div>
  );
}
