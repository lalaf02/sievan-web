import type { Metadata } from 'next';
import Link from 'next/link';
import {
  archive, byDateUndatedLast, counts, coverFor, objectLead, objectsForCollection,
  paperCollections, pluralObjectType,
} from '@/lib/data';
import { SheetTile, AbsentTile } from '@/components/MediaTile';
import styles from './archive.module.css';

export const metadata: Metadata = {
  title: 'The archive',
  description:
    'Seventy-six objects holding sixty press notices, exhibition catalogues, posters, ' +
    'and twenty-five drawings and sketches in Sievan’s own hand.',
};

/**
 * The two groups, named for what they hold rather than for the container they arrived
 * in. Keyed on collection_id because that is how the material actually divides, but no
 * box number reaches the reader: shelving is the archive's own business, and an id like
 * MS-CS-002 on a public page reads as a second identifier competing with the object's.
 *
 * Grouped rather than run together as one sequence for the reason recorded below: the
 * two hold different kinds of thing, and a single date-ordered list buried that
 * distinction while stranding twenty-five undated sheets in an unexplained clump.
 */
const GROUPS: Record<string, { title: string; blurb: string }> = {
  'MS-CS-001': {
    title: 'The press record',
    blurb:
      'Bundles of photocopied clippings, exhibition catalogues, posters, two books '
      + 'and assorted promotional material — the reviews, catalogues and posters that '
      + 'followed the exhibitions.',
  },
  'MS-CS-002': {
    title: 'Drawings and sketches in Sievan’s hand',
    blurb:
      'Drawings and sketches for paintings, on envelopes, index cards and note paper. '
      + 'Sievan drew each painting he had made and wrote its title, size, medium and '
      + 'price beside it — these are his own records of his work.',
  },
};

export default function ArchivePage() {
  const byType = archive.derived.facets.objectType;
  const digitised = counts.objectsWithScans;
  const undigitised = counts.archiveObjects - digitised;

  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)' }}>
      <header style={{ marginBottom: 'var(--s-6)' }}>
        <p className="eyebrow">Papers and drawings</p>
        <h1>The archive</h1>
        <p className="measure muted">
          Everything the estate holds on paper. One part is the press record — the
          reviews, catalogues and posters that followed the exhibitions. The other is{' '}
          {byType.work_on_paper} drawings and sketches in Sievan’s own hand. Further
          material is catalogued but not yet in this archive.
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
        {undigitised} objects are catalogued but not photographed: twenty consecutive
        rows of the press record, and one folder of drawings the curator recorded as
        withdrawn from use and deliberately left unscanned. Their records below are
        transcribed from the catalogue sheet.
      </p>

      <h2>What the archive holds</h2>
      <ul className={styles.typeList}>
        {Object.entries(byType)
          .sort((a, b) => b[1] - a[1])
          .map(([type, n]) => (
            <li key={type}>
              <span className={styles.typeCount}>{n}</span>{' '}
              {pluralObjectType(type, n)}
            </li>
          ))}
      </ul>

      {/*
        Grouped by what the material is, rather than run together as one sequence.
        The two hold different kinds of thing — printed press in one, Sievan's own
        drawings in the other — and a single date-ordered list buried that distinction
        while stranding the twenty-five undated sheets in an unexplained clump at the
        end.
      */}
      {/*
        This was rows of text across the full width, with a long horizontal void
        between each object's one-line description and its right-aligned id. This is
        mostly paper with something on it, so it should look like it. The
        undigitised objects keep their place in the sequence as labelled empty frames —
        dropping them would make the archive look more complete than it is.
      */}
      {paperCollections.map((collection) => {
        const group = GROUPS[collection.id];
        const objects = [...objectsForCollection(collection.id)].sort(byDateUndatedLast);
        if (!objects.length) return null;
        const dated = objects.filter((o) => o.date_earliest != null).length;

        return (
          <section key={group.title}>
            <h2 className={styles.gridHeading}>{group.title}</h2>
            <p className="measure ui muted" style={{ marginBottom: 'var(--s-3)' }}>
              {group.blurb}
            </p>
            <p className="ui muted" style={{ marginBottom: 'var(--s-5)' }}>
              {objects.length} objects
              {dated === objects.length
                ? ', in date order.'
                : `, in date order — ${objects.length - dated} carry no date and come last.`}
              {' '}The sheet itself, where there is one. Everything links to its
              catalogue record.
            </p>

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
                        note="Catalogued from the sheet; no scan on file."
                        caption={caption}
                        meta={meta}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}

    </div>
  );
}
