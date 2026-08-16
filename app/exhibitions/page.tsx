import type { Metadata } from 'next';
import Link from 'next/link';
import { allExhibitions } from '@/lib/data';
import { formatRange } from '@/lib/dates';
import styles from './exhibitions.module.css';

export const metadata: Metadata = {
  title: 'Exhibitions',
  description: 'Documented exhibitions of Maurice Sievan’s work, 1939–2006.',
};

export default function ExhibitionsPage() {
  const shows = [...allExhibitions].sort(
    (a, b) => (a.date_earliest ?? 0) - (b.date_earliest ?? 0),
  );

  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)', maxWidth: '52rem' }}>
      <header style={{ marginBottom: 'var(--s-6)' }}>
        <h1>Exhibitions</h1>
        <p className="measure muted">
          Fifteen exhibitions between 1939 and 2006, each documented by a surviving
          catalogue, poster or announcement in the archive. A catalogue is direct
          evidence a show took place, so all fifteen are recorded as confirmed.
        </p>
        <p className="measure muted">
          This is not a complete exhibition history — it lists only the shows this box
          happens to document.
        </p>
      </header>

      <ol className={styles.list}>
        {shows.map((e) => (
          <li key={e.id}>
            <Link href={`/exhibitions/${e.id}/`} className={styles.row}>
              <span className={`${styles.year} tnum`}>{e.date_earliest}</span>
              <span className={styles.body}>
                <span className={styles.name}>{e.name ?? e.gallery_or_venue}</span>
                <span className={styles.venue}>
                  {e.gallery_or_venue}
                  {e.venue_city ? `, ${e.venue_city}` : ''}
                  {' · '}
                  {formatRange(e.start_date, e.end_date)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
