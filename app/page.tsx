import type { Metadata } from 'next';
import Link from 'next/link';
import { counts, allExhibitions } from '@/lib/data';
import { getQuote } from '@/lib/quotes';
import { THESIS, MUSEUM_COLLECTIONS, PEER_NETWORK } from '@/lib/validation';
import { PullQuote } from '@/components/PullQuote';
import styles from './home.module.css';

export const metadata: Metadata = {
  title: 'Maurice Sievan (1898–1981) — Archive',
  description:
    'American painter praised by Clement Greenberg, collected by MoMA and the Hirshhorn, and '
    + 'almost entirely forgotten. Press notices, oral-history interviews, exhibition records '
    + 'and the catalogue of works.',
};

export default function Home() {
  const years = allExhibitions.map((e) => e.date_earliest ?? 0).filter(Boolean);
  const span = `${Math.min(...years)}–${Math.max(...years)}`;

  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)' }}>
      <div className={styles.mosaic}>

        {/* ---------------------------------------------------------- the name */}
        <section className={`${styles.tile} ${styles.hero}`}>
          <p className="eyebrow">1898–1981</p>
          <h1 className={styles.name}>Maurice Sievan</h1>
          <p className={styles.tagline}>{THESIS.headline}</p>
          <p className={styles.lede}>{THESIS.subhead}</p>
        </section>

        {/* The endorsement, given the weight of a wall text rather than a footnote. */}
        <section className={`${styles.tile} ${styles.creed}`}>
          <p className={styles.tileLabel}>The verdict</p>
          <PullQuote quote={getQuote('greenberg-best')} size="large" showSource />
        </section>

        {/* ------------------------------------------------------- him, working */}
        <figure className={`${styles.tile} ${styles.clip}`}>
          <video
            className={styles.video}
            src="/clips/painting-portrait.mp4"
            poster="/clips/painting-portrait.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="Maurice Sievan at the easel, working a brush across a portrait in progress."
          />
          <figcaption className={styles.caption}>
            The only moving picture of Sievan at work — home-movie footage held in the video
            archive, silent, undated.
          </figcaption>
        </figure>

        <section className={`${styles.tile} ${styles.case}`}>
          <p className={styles.tileLabel}>Why he matters now</p>
          <ul className={styles.points}>
            {THESIS.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>

        <figure className={`${styles.tile} ${styles.plate}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/retrospective/p01.jpg" alt="Cover of the Maurice Sievan retrospective catalogue." />
          <figcaption className={styles.caption}>
            The retrospective catalogue.{' '}
            <Link href="/life/retrospective/">Read it page by page</Link>
          </figcaption>
        </figure>

        {/* ----------------------------------------------------------- evidence */}
        <section className={`${styles.tile} ${styles.stats}`}>
          <dl className={styles.statList}>
            <div className={styles.stat}>
              <dt>Museum collections</dt>
              <dd>{MUSEUM_COLLECTIONS.length}</dd>
              <p>MoMA, the Hirshhorn, Brooklyn, Baltimore and nine more.</p>
            </div>
            <div className={styles.stat}>
              <dt>Press notices</dt>
              <dd>{counts.newsArticles}</dd>
              <p>1940–1983, across {counts.publications} publications.</p>
            </div>
            <div className={styles.stat}>
              <dt>Exhibitions</dt>
              <dd>{counts.exhibitions}</dd>
              <p>Documented in the archive, {span}.</p>
            </div>
            <div className={styles.stat}>
              <dt>Words of testimony</dt>
              <dd>{counts.transcriptWords.toLocaleString()}</dd>
              <p>From {counts.transcribedInterviews} filmed interviews with those who knew him.</p>
            </div>
          </dl>
        </section>

        {/* --------------------------------------------------------- the voices */}
        <section className={`${styles.tile} ${styles.quoteA}`}>
          <PullQuote quote={getQuote('karp-mystical')} showSource />
        </section>

        <section className={`${styles.tile} ${styles.quoteB}`}>
          <PullQuote quote={getQuote('solman-suburbs')} showSource />
        </section>

        <figure className={`${styles.tile} ${styles.clipSmall}`}>
          <video
            className={styles.video}
            src="/clips/painting-landscape.mp4"
            poster="/clips/painting-landscape.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            aria-label="Sievan painting outdoors at an easel, working a blue-grey landscape canvas."
          />
          <figcaption className={styles.caption}>
            Outdoors, at the easel. A canvas going down in real time.
          </figcaption>
        </figure>

        {/* ------------------------------------------------------- the company */}
        <section className={`${styles.tile} ${styles.peers}`}>
          <p className={styles.tileLabel}>The company he kept</p>
          <ul className={styles.peerList}>
            {PEER_NETWORK.map((p) => (
              <li key={p.name}>
                <span className={styles.peerName}>{p.name}</span>
                <span className={styles.peerNote}>{p.note}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ------------------------------------------------------------- doors */}
        <nav className={`${styles.tile} ${styles.doors}`} aria-label="Explore the archive">
          <ul className={styles.doorList}>
            <li>
              <Link href="/life/" className={styles.door}>
                <span className={styles.doorTitle}>Life and Work</span>
                <span className={styles.doorText}>
                  A painter placed in his time — the chronology, the exhibitions, the people,
                  and the five phases of the work.
                </span>
              </Link>
            </li>
            <li>
              <Link href="/works/" className={styles.door}>
                <span className={styles.doorTitle}>Catalogue Raisonné</span>
                <span className={styles.doorText}>
                  The body of work, being catalogued now. Five decades from the early
                  landscapes to the late abstractions.
                </span>
              </Link>
            </li>
            <li>
              <Link href="/archive/" className={styles.door}>
                <span className={styles.doorTitle}>Archives</span>
                <span className={styles.doorText}>
                  All {counts.archiveObjects} objects that survive on paper: clippings, catalogues,
                  posters and the interviews — searchable, and honest about its gaps.
                </span>
              </Link>
            </li>
            <li>
              <Link href="/research/" className={styles.door}>
                <span className={styles.doorTitle}>Research</span>
                <span className={styles.doorText}>
                  Access, rights and citation, the bibliography, and how this archive was
                  assembled.
                </span>
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
