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
    'American painter (1898–1981). Work in thirteen museum collections including the Museum '
    + 'of Modern Art and the Hirshhorn. Press notices, oral-history interviews, exhibition '
    + 'records and the catalogue of works.',
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
          {/*
            Not "the verdict" — that tells a reader the question is settled. Greenberg
            said this to Ivan Karp, and what the archive actually holds is Karp's
            account of it. Naming that chain is both less pushy and more accurate.
          */}
          <p className={styles.tileLabel}>Recorded in the Ivan Karp interview</p>
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

        {/*
          This panel used to be a bulleted argument under the heading "Why he matters
          now". Naming the institutions that hold the work does the same job without
          asking anyone to take a characterisation on trust — and it rehouses the
          museum evidence that left with the stat strip.
        */}
        <section className={`${styles.tile} ${styles.case}`}>
          <p className={styles.tileLabel}>In these collections</p>
          <ul className={styles.points}>
            {MUSEUM_COLLECTIONS.map((m) => (
              <li key={m.name} className={m.notable ? styles.pointNotable : undefined}>
                <span>{m.name}</span>
                <span className={styles.pointWhere}>{m.location}</span>
              </li>
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

        {/* --------------------------------------------------------- the voices */}
        <section className={`${styles.tile} ${styles.quoteA}`}>
          <PullQuote quote={getQuote('karp-mystical')} showSource />
        </section>

        <section className={`${styles.tile} ${styles.quoteB}`}>
          <PullQuote quote={getQuote('barnet-someday')} showSource />
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
                <span className={styles.doorNum}>{counts.exhibitions}</span>
                <span className={styles.doorTitle}>Life and Work</span>
                <span className={styles.doorText}>
                  Exhibitions between {span}, the people who knew him, and{' '}
                  {counts.transcriptWords.toLocaleString()} words of recorded testimony,
                  placed on one timeline.
                </span>
              </Link>
            </li>
            <li>
              <Link href="/works/" className={styles.door}>
                <span className={styles.doorNum}>5</span>
                <span className={styles.doorTitle}>Catalogue Raisonné</span>
                <span className={styles.doorText}>
                  Five periods, from the Greenwich Village rooftops of the 1930s to the
                  late miniatures. Being catalogued now.
                </span>
              </Link>
            </li>
            <li>
              <Link href="/archive/" className={styles.door}>
                <span className={styles.doorNum}>{counts.newsArticles}</span>
                <span className={styles.doorTitle}>Archives</span>
                <span className={styles.doorText}>
                  Press notices from 1940 to 1983 and the {counts.archiveObjects} objects
                  they were cut from — searchable, and explicit about what is missing.
                </span>
              </Link>
            </li>
            <li>
              <Link href="/research/" className={styles.door}>
                <span className={styles.doorNum}>{counts.publications}</span>
                <span className={styles.doorTitle}>Research</span>
                <span className={styles.doorText}>
                  Every notice formatted as a citation, across {counts.publications}{' '}
                  publications — with access, reproduction rights, and how the archive was
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
