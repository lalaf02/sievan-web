import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  allExhibitions, counts,
} from '@/lib/data';
import { THESIS } from '@/lib/validation';
import styles from './home.module.css';

export const metadata: Metadata = {
  title: 'Maurice Sievan (1898–1981) — Archive',
  description:
    'American painter (1898–1981). Work in thirteen museum collections including the Museum '
    + 'of Modern Art and the Hirshhorn. Press notices, oral-history interviews, exhibition '
    + 'records and the catalogue of works.',
};

const studioWorks = [
  { src: '/artworks/home/anchor.jpg', width: 1800, height: 1350, alt: 'Large abstract painting in cobalt blue, earthen red, ochre and deep green, photographed on a gallery wall.', role: 'anchor', priority: true },
  { src: '/artworks/home/veil.jpg', width: 1000, height: 1333, alt: 'Blue-grey abstract painting with a veiled face-like form, photographed against a pale wall.', role: 'veil' },
  { src: '/artworks/home/figures.jpg', width: 1100, height: 1467, alt: 'Muted figurative painting of two closely gathered forms beside dark brushwork.', role: 'figures' },
  { src: '/artworks/home/blue.jpg', width: 1000, height: 1333, alt: 'Vertical abstract painting dominated by deep cobalt blue with flashes of red and white.', role: 'blue' },
  { src: '/artworks/home/umber-figure.jpg', width: 900, height: 1201, alt: 'Dark umber figurative painting in a narrow gold frame, photographed on its hanging rail.', role: 'umber' },
  { src: '/artworks/home/earth.jpg', width: 1100, height: 825, alt: 'Wide earth-toned abstract painting with a pale textured horizon.', role: 'earth' },
] as const;

/**
 * The front page: the man and what this site is.
 */
export default function Home() {
  const years = allExhibitions.map((e) => e.date_earliest ?? 0).filter(Boolean);
  const span = `${Math.min(...years)}–${Math.max(...years)}`;

  return (
    <div className="page pageFlush">

      {/* ═══════════════════════════════════════════════ hero: a threshold into the studio */}
      <section className={styles.hero} aria-labelledby="name">
        <div className={styles.heroTitle}>
          <p className="eyebrow">1898–1981</p>
          <h1 id="name" className={styles.name}>Maurice Sievan</h1>
        </div>
        <div className={styles.studioWall} aria-label="Paintings by Maurice Sievan">
          {studioWorks.map((work) => (
            <figure className={`${styles.work} ${styles[work.role]}`} key={work.src}>
              <Image
                src={work.src}
                alt={work.alt}
                width={work.width}
                height={work.height}
                priority={'priority' in work && work.priority}
                sizes={work.role === 'anchor'
                  ? '(max-width: 860px) 92vw, 56vw'
                  : '(max-width: 620px) 58vw, (max-width: 860px) 38vw, 18vw'}
              />
            </figure>
          ))}
        </div>
        <div className={styles.heroText}>
          <p className={styles.lede}>{THESIS.subhead}</p>
          <p className={styles.heroBody}>
            Born in Ukraine in 1898 and raised in New York, he studied at the National
            Academy of Design and the Art Students League, then in Paris under
            André L’Hôte, exhibiting at the Salon d’Automne in 1931. He painted for
            another fifty years — the harbour, the suburbs, the studio — and kept the
            figure through the decades when New York gave it up.
          </p>
          <p className={styles.heroLinks}>
            <Link href="/life/">His life and the record →</Link>
            <Link href="/works/">The work →</Link>
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════ what this site is */}
      <section className={styles.band} aria-labelledby="about">
        <div className={styles.bandHead}>
          <h2 id="about" className={styles.bandTitle}>What this archive is</h2>
        </div>

        <div className={styles.aboutGrid}>
          <div className={styles.aboutText}>
            <p>
              This is the estate’s record of a painter the histories of his period were
              written without. It exists to be used and checked: the catalogue records
              are published in full, the scans sit beside them, and where the archive
              does not know something it says so rather than filling the gap.
            </p>
            <p>
              The whole of it is public and needs no account. Nothing here is behind a
              login, and every record has a permanent identifier, so a link to a record
              is a citation.
            </p>
            <p className={styles.aboutMore}>
              <Link href="/research/">
                How to use the archive, cite it, and ask for what is not online →
              </Link>
            </p>
          </div>

          <nav className={styles.doors} aria-label="Explore the archive">
            <ul className={styles.doorList}>
              <li>
                <Link href="/life/" className={styles.door}>
                  <span className={styles.doorTitle}>Life and Memory</span>
                  <span className={styles.doorText}>
                    The biography, the chronology, the exhibitions between {span}, and the
                    people who spoke on the record.
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/works/" className={styles.door}>
                  <span className={styles.doorTitle}>Catalogue Raisonné</span>
                  <span className={styles.doorText}>
                    The work: {counts.worksOnPaperCatalogued} sheets in Sievan’s own hand,
                    the reproductions his galleries printed, and{' '}
                    {counts.attestedWorks} more canvases he named himself.
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/archive/" className={styles.door}>
                  <span className={styles.doorTitle}>Archives</span>
                  <span className={styles.doorText}>
                    The documentary record — {counts.newsArticles} press notices from 1940
                    to 1983, the catalogues and posters, and what is not yet digitised.
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/research/" className={styles.door}>
                  <span className={styles.doorTitle}>Research</span>
                  <span className={styles.doorText}>
                    Access, reproduction rights, how to cite a record, and the full
                    bibliography of what has been written.
                  </span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </section>
    </div>
  );
}
