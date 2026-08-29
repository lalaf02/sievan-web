import type { Metadata } from 'next';
import Link from 'next/link';
import {
  allObjects, counts, coverFor, exhibitionsForObject, objectLead, OBJECT_TYPE_LABELS,
} from '@/lib/data';
import { ArchiveBrowser } from '@/components/ArchiveBrowser';
import type { ArchiveRow } from '@/components/ArchiveBrowser';
import styles from './archive.module.css';

export const metadata: Metadata = {
  title: 'The archive',
  description:
    'The documentary record of Maurice Sievan’s career: sixty press notices, the '
    + 'exhibition catalogues and posters they were cut from, and thirty publications.',
};

/**
 * The archive tab: the documentary record, and only that.
 *
 * It used to hold the drawings as well — the twenty-five sheets that ARE the Catalogue
 * Raisonné — presented in a second grid under their own heading. The same rows were
 * therefore the subject of two tabs under two framings, which is the duplication the
 * estate asked to resolve. They now belong to the Catalogue Raisonné alone, and this
 * page is one thing: what documents the career, as opposed to what the career produced.
 *
 * The RECORD pages do not move. /archive/objects/<id>/ stays canonical for all seventy-
 * six objects, drawings included, and already switches its title and back-link to the
 * Catalogue Raisonné when `artwork` is set. Only this index changed.
 */
function buildRows(): ArchiveRow[] {
  return allObjects
    .filter((o) => !o.artwork)
    .map((o) => {
      const cover = coverFor(o.id);
      const shows = exhibitionsForObject(o.id);
      const year = o.date_earliest;
      return {
        id: o.id,
        href: `/archive/objects/${o.id}/`,
        lead: objectLead(o),
        thumb: cover?.thumb ?? null,
        dateText: o.date_text,
        year,
        decade: year == null ? null : String(Math.floor(year / 10) * 10),
        type: o.object_type,
        typeLabel: OBJECT_TYPE_LABELS[o.object_type] ?? o.object_type,
        scanned: Boolean(cover),
        /*
          Labelled by VENUE and year, not by name. Thirteen of the fifteen shows are
          titled "Maurice Sievan", so a facet keyed on the name offered a reader
          thirteen identical checkboxes. The venue is what identifies a show, and the
          year separates the two that share one (Contemporary Arts, 1939 and 1941).
        */
        exhibitionNames: shows.map(
          (e) => [e.gallery_or_venue ?? e.name ?? 'Untitled exhibition', e.date_earliest]
            .filter(Boolean).join(', '),
        ),
        exhibitionIds: shows.map((e) => e.id),
        // The show's own title stays searchable even though it is not the label.
        body: [o.raw_title_description, ...shows.map((e) => e.name ?? '')]
          .filter(Boolean).join(' '),
      };
    });
}

export default function ArchivePage() {
  const rows = buildRows();
  const digitised = rows.filter((r) => r.scanned).length;
  const undigitised = rows.length - digitised;

  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)' }}>
      <header style={{ marginBottom: 'var(--s-5)' }}>
        <p className="eyebrow">The documentary record</p>
        <h1>The archive</h1>
        <p className="measure muted">
          What followed Sievan around: the reviews, the exhibition catalogues, the
          posters and the promotional material his galleries printed. These are the
          objects that document the career — not the work itself, which is in the{' '}
          <Link href="/works/">Catalogue Raisonné</Link>. Further material is
          catalogued but not yet in this archive.
        </p>
      </header>

      <div className={styles.stats}>
        <Link href="/archive/press/" className={styles.stat}>
          <span className={styles.statNum}>{counts.newsArticles}</span>
          <span className={styles.statLabel}>press notices, filterable by critic</span>
        </Link>
        <Link href="/archive/publications/" className={styles.stat}>
          <span className={styles.statNum}>{counts.publications}</span>
          <span className={styles.statLabel}>publications that carried them</span>
        </Link>
        <Link href="/archive/search/" className={styles.stat}>
          <span className={styles.statNum}>{counts.transcribedInterviews}</span>
          <span className={styles.statLabel}>interviews, searchable in full</span>
        </Link>
        {/*
          Stated plainly rather than concealed: a coverage figure reads as rigour,
          the same gap hidden reads as neglect.
        */}
        <div className={styles.stat}>
          <span className={styles.statNum}>
            {digitised}<span className={styles.statOf}>/{rows.length}</span>
          </span>
          <span className={styles.statLabel}>you can look at</span>
        </div>
      </div>

      <p className="ui muted" style={{ marginBottom: 'var(--s-6)', maxWidth: '68ch' }}>
        {undigitised} of these objects are catalogued but not photographed — twenty
        consecutive rows of the press record, which being consecutive suggests a batch
        that was never photographed rather than material that is lost. Their records are
        transcribed from the catalogue sheet, and they keep their place in the sequence
        below rather than being hidden: an archive that shows only what it has scanned
        looks more complete than it is.
      </p>

      <ArchiveBrowser rows={rows} />
    </div>
  );
}
