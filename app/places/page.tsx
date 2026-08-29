import type { Metadata } from 'next';
import Link from 'next/link';
import {
  allPlaces, counts, exhibitionsForPlace, getPlace, placeUsage,
} from '@/lib/data';
import styles from './places.module.css';

export const metadata: Metadata = {
  title: 'Places',
  description:
    'The gazetteer of the Sievan archive: where the paintings were made, what they '
    + 'were named after, where they were shown, and where they went.',
};

/** Index order, so the reader meets New York before Monhegan Island. */
const REGION_ORDER = [
  'New York',
  'New England',
  'Elsewhere in the United States',
  'Abroad',
];

export default function PlacesPage() {
  const byRegion = new Map<string, typeof allPlaces>();
  for (const p of allPlaces) {
    const key = p.region ?? 'Unplaced';
    if (!byRegion.has(key)) byRegion.set(key, []);
    byRegion.get(key)!.push(p);
  }

  const regions = [...byRegion.keys()].sort(
    (a, b) => (REGION_ORDER.indexOf(a) + 1 || 99) - (REGION_ORDER.indexOf(b) + 1 || 99),
  );

  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)' }}>
      <header className="measure" style={{ marginBottom: 'var(--s-6)' }}>
        <p className="eyebrow">The archive in space</p>
        <h1>Places</h1>
        <p className={styles.lede}>
          {counts.places} places, and every one of them is here because something in
          the archive points at it. This is a record of where the evidence goes, not
          a directory of geography — a place nothing names does not get a page, and
          the build fails if one slips in.
        </p>
        <p className={styles.lede}>
          Most of these come from box 2, where Sievan titled his paintings after the
          towns and rivers he painted and then noted, in the margin, where the canvas
          went. There is no map: the archive has no coordinates, and{' '}
          <em>“croton?”</em> — his own note, question mark and all — is not a thing
          you can put a pin in.
        </p>
      </header>

      {regions.map((region) => (
        <section key={region} className={styles.region}>
          <h2 className={styles.regionName}>{region}</h2>
          <ul className={styles.list}>
            {byRegion.get(region)!
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((p) => {
                const u = placeUsage(p.id);
                const parent = getPlace(p.parent_id);
                const shows = exhibitionsForPlace(p.id);
                const bits: string[] = [];
                if (u.attestations) {
                  bits.push(
                    `${u.attestations} work${u.attestations === 1 ? '' : 's'} recorded`,
                  );
                }
                if (shows.length) {
                  bits.push(
                    `${shows.length} exhibition${shows.length === 1 ? '' : 's'} documented`,
                  );
                }
                if (u.children) {
                  bits.push(`${u.children} place${u.children === 1 ? '' : 's'} within`);
                }
                return (
                  <li key={p.id} className={styles.item}>
                    <Link href={`/places/${p.id}/`} className={styles.name}>
                      {p.name}
                    </Link>
                    {parent && (
                      <span className={styles.parent}> in {parent.name}</span>
                    )}
                    <span className={styles.tally}>{bits.join(' · ')}</span>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
