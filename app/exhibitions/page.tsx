import type { Metadata } from 'next';
import Link from 'next/link';
import { allExhibitions, coverForExhibition, documentingObject } from '@/lib/data';
import { formatRange } from '@/lib/dates';
import { Mosaic, Tile } from '@/components/Mosaic';
import { SheetTile, AbsentTile } from '@/components/MediaTile';
import styles from './exhibitions.module.css';

export const metadata: Metadata = {
  title: 'Exhibitions',
  description: 'Documented exhibitions of Maurice Sievan’s work, 1939–2006.',
};

/** Four columns; the shows fall into them in date order, four then four then four. */
const COLUMNS = 4;

export default function ExhibitionsPage() {
  const shows = [...allExhibitions].sort(
    (a, b) => (a.date_earliest ?? 0) - (b.date_earliest ?? 0),
  );

  const withCovers = shows.filter((e) => coverForExhibition(e)).length;

  // Deal the shows into columns down the page rather than across, so a column is a
  // run of consecutive years and the grid still reads chronologically.
  const perColumn = Math.ceil(shows.length / COLUMNS);
  const columns = Array.from({ length: COLUMNS }, (_, i) =>
    shows.slice(i * perColumn, (i + 1) * perColumn));

  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)' }}>
      <header className={styles.header}>
        <h1>Exhibitions</h1>
        <p className="measure muted">
          Fifteen exhibitions between 1939 and 2006, each documented by a surviving
          catalogue, poster or announcement in the archive. A catalogue is direct
          evidence a show took place, so all fifteen are recorded as confirmed.
        </p>
        <p className="measure muted">
          This is not a complete exhibition history — it lists only the shows this box
          happens to document. {withCovers} of the {shows.length} documenting objects
          have been scanned and are shown here; the rest are catalogued and awaiting
          digitisation.
        </p>
      </header>

      <Mosaic>
        {columns.map((column, i) => (
          <Tile key={i} col={3}>
            {column.map((e) => {
              const found = coverForExhibition(e);
              const source = documentingObject(e);
              const href = `/exhibitions/${e.id}/`;
              const caption = (
                <Link href={href} className={styles.name}>
                  {e.name ?? e.gallery_or_venue}
                </Link>
              );
              const meta = (
                <>
                  {e.gallery_or_venue}
                  {e.venue_city ? `, ${e.venue_city}` : ''}
                  {' · '}
                  {formatRange(e.start_date, e.end_date)}
                </>
              );

              return found ? (
                <SheetTile
                  key={e.id}
                  sheet={found.cover}
                  href={href}
                  aspect="3 / 4"
                  alt={`Documenting object ${found.objectId} for ${e.name ?? e.gallery_or_venue}`}
                  caption={caption}
                  meta={meta}
                />
              ) : (
                <AbsentTile
                  key={e.id}
                  aspect="3 / 4"
                  note={
                    source
                      ? `Documented by ${source.id}, catalogued but not scanned.`
                      : 'No documenting object recorded.'
                  }
                  caption={caption}
                  meta={meta}
                />
              );
            })}
          </Tile>
        ))}
      </Mosaic>
    </div>
  );
}
