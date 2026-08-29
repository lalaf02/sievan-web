/**
 * One entry in the catalogue of works on paper.
 *
 * Defined at module scope and shared by /works/ and /works/periods/<id>/ rather than
 * declared inside either page: a component created during render is a new type on
 * every render, and the two pages would drift apart besides.
 *
 * These sheets carry no title — Sievan gave them none and the archive does not supply
 * one — so each is headed by `entryTitle`, which names it by the paintings it records.
 */
import Link from 'next/link';
import { attestationsForObject, entryTitle, pageOf } from '@/lib/data';
import type { ArchiveObject } from '@/lib/types';
import styles from './CatalogueEntry.module.css';

export function CatalogueEntryList({ children }: { children: React.ReactNode }) {
  return <ol className={styles.entryList}>{children}</ol>;
}

export function CatalogueEntry({ object }: { object: ArchiveObject }) {
  const art = object.artwork!;
  const cover = pageOf(object.id, 1);
  const records = attestationsForObject(object.id).length;
  const href = `/archive/objects/${object.id}/`;
  return (
    <li className={styles.entry}>
      {cover && (
        <Link href={href} className={styles.entryMedia}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover.thumb} alt={entryTitle(object)} loading="lazy" decoding="async" />
        </Link>
      )}
      <div className={styles.entryBody}>
        <h4 className={styles.entryTitle}>
          <Link href={href}>{entryTitle(object)}</Link>
        </h4>
        <p className={styles.entryFacts}>
          <span className={styles.entryId}>{object.id}</span>
          {/* "Graphite on an envelope", not "Graphite on An envelope". */}
          {' · '}{art.medium_stated} on{' '}
          {art.support.charAt(0).toLowerCase() + art.support.slice(1)}
          {art.sheet_count ? ` · ${art.sheet_count} sheets` : ''}
          {object.date_text ? ` · ${object.date_text}` : ''}
        </p>
        {art.signed && <p className={styles.entrySigned}>{art.signed}</p>}
        {records > 0 && (
          <p className={styles.entryRecords}>
            Records {records} painting{records === 1 ? '' : 's'}
          </p>
        )}
      </div>
    </li>
  );
}
