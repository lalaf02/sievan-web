import Link from 'next/link';
import { counts, allExhibitions } from '@/lib/data';
import { FEATURED_QUOTES, GREENBERG_QUOTE } from '@/lib/quotes';
import { THESIS } from '@/lib/validation';
import { PullQuote } from '@/components/PullQuote';
import { ValidationBar } from '@/components/ValidationBar';
import styles from './home.module.css';

export default function Home() {
  const years = allExhibitions.map((e) => e.date_earliest ?? 0).filter(Boolean);
  const span = `${Math.min(...years)}–${Math.max(...years)}`;

  return (
    <div className="page" style={{ paddingTop: 'var(--s-7)' }}>
      <div className={styles.hero}>
        <div>
          <p className="eyebrow">1898–1981</p>
          <h1 className={styles.name}>Maurice Sievan</h1>
          <p className={styles.tagline}>{THESIS.headline}</p>
          <p className={styles.lede}>{THESIS.subhead}</p>
        </div>

        <figure className={styles.portrait}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/retrospective/p01.jpg" alt="Maurice Sievan in his studio" />
          <figcaption>
            Cover of the retrospective catalogue held in the archive.{' '}
            <Link href="/life/retrospective/">See the catalogue</Link>
          </figcaption>
        </figure>
      </div>

      {/* The Greenberg endorsement - visible within 30 seconds */}
      <div className={styles.endorsement}>
        <PullQuote quote={GREENBERG_QUOTE} size="large" showSource />
      </div>

      {/* Validation bar - quick credibility hits */}
      <ValidationBar />

      {/* The case for Sievan */}
      <section className={styles.thesis}>
        <h2>Why Sievan Matters Now</h2>
        <div className={styles.thesisContent}>
          <div className={styles.thesisText}>
            <p>
              Maurice Sievan was excluded from the Abstract Expressionist canon because he
              maintained imagery when pure abstraction was the only path to recognition.
              The same quality that prevented his commercial success — his refusal to
              conform — now makes him a compelling discovery:
            </p>
            <ul className={styles.thesisPoints}>
              {THESIS.points.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
            <p>
              <Link href="/why/" className={styles.thesisLink}>
                Read the full case for Sievan
              </Link>
            </p>
          </div>
          <div className={styles.thesisQuote}>
            <PullQuote quote={FEATURED_QUOTES[1]} />
          </div>
        </div>
      </section>

      {/* Entry points - reframed door cards */}
      <ul className={styles.doors}>
        <li>
          <Link href="/why/" className={styles.door}>
            <span className={styles.doorTitle}>Why Sievan</span>
            <span className={styles.doorText}>
              The evidence for recognition: critical endorsements, museum holdings,
              and an independent vision that anticipated later developments.
            </span>
          </Link>
        </li>
        <li>
          <Link href="/archive/press/" className={styles.door}>
            <span className={styles.doorNum}>{counts.newsArticles}</span>
            <span className={styles.doorTitle}>Press Notices</span>
            <span className={styles.doorText}>
              What the critics said: Dore Ashton, Hilton Kramer, Emily Genauer, and
              {counts.publications} other publications, 1940–1983.
            </span>
          </Link>
        </li>
        <li>
          <Link href="/life/interviews/" className={styles.door}>
            <span className={styles.doorNum}>{counts.transcribedInterviews}</span>
            <span className={styles.doorTitle}>Interviews</span>
            <span className={styles.doorText}>
              Firsthand testimony from Ivan Karp, Joseph Solman, Will Barnet, and others
              who knew the man and his work.
            </span>
          </Link>
        </li>
        <li>
          <Link href="/exhibitions/" className={styles.door}>
            <span className={styles.doorNum}>{counts.exhibitions}</span>
            <span className={styles.doorTitle}>Exhibitions</span>
            <span className={styles.doorText}>
              MoMA, Whitney, Metropolitan, and {counts.exhibitions - 3} other institutions, {span}.
            </span>
          </Link>
        </li>
      </ul>

      <p className={styles.footLinks}>
        <Link href="/life/">Life and Work</Link>
        {' · '}
        <Link href="/life/chronology/">Chronology</Link>
        {' · '}
        <Link href="/life/retrospective/">The retrospective catalogue</Link>
        {' · '}
        <Link href="/about/method/">How this archive was made</Link>
      </p>
    </div>
  );
}
