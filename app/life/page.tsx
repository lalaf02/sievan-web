import type { Metadata } from 'next';
import Link from 'next/link';
import { counts } from '@/lib/data';
import { BARNET_QUOTES, SOLMAN_QUOTES } from '@/lib/quotes';
import { MUSEUM_COLLECTIONS, PEER_NETWORK } from '@/lib/validation';
import { PullQuote } from '@/components/PullQuote';
import styles from './life.module.css';

export const metadata: Metadata = {
  title: 'Life and Work',
  description:
    'Maurice Sievan (1898–1981): an independent vision that maintained imagery when abstraction was everything.',
};

export default function LifePage() {
  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)' }}>
      <div className="measure">
        <p className="eyebrow">1898–1981</p>
        <h1>Life and Work</h1>

        {/* Lead with impact, not chronology */}
        <p style={{ fontSize: 'var(--t-md)', marginBottom: 'var(--s-5)' }}>
          Maurice Sievan maintained independence when conformity was rewarded. Working
          alongside Rothko, Avery, and the artists who would define postwar American
          painting, he developed a singular vision that resisted categorization — and
          entered the collections of MoMA, the Hirshhorn, and eleven other museums.
        </p>

        <PullQuote
          quote={BARNET_QUOTES[1]}
          showSource
        />

        <section className={styles.archiveGrid}>
          <h2>Explore the Archive</h2>
          <div className={styles.cards}>
            <Link href="/life/retrospective/" className={styles.card}>
              <span className={styles.cardIcon}>◈</span>
              <span className={styles.cardTitle}>The Catalogue</span>
              <span className={styles.cardText}>
                Illustrated survey — the only place to see the paintings
              </span>
            </Link>

            <Link href="/life/chronology/" className={styles.card}>
              <span className={styles.cardNum}>1939–2006</span>
              <span className={styles.cardTitle}>Timeline</span>
              <span className={styles.cardText}>
                Everything dated, on one spine
              </span>
            </Link>

            <Link href="/life/interviews/" className={styles.card}>
              <span className={styles.cardNum}>{counts.transcriptWords.toLocaleString()}</span>
              <span className={styles.cardTitle}>Words of Testimony</span>
              <span className={styles.cardText}>
                Ivan Karp, Joseph Solman, Will Barnet and more
              </span>
            </Link>

            <Link href="/archive/press/" className={styles.card}>
              <span className={styles.cardNum}>{counts.newsArticles}</span>
              <span className={styles.cardTitle}>Press Notices</span>
              <span className={styles.cardText}>
                Dore Ashton, Hilton Kramer, Emily Genauer
              </span>
            </Link>

            <Link href="/exhibitions/" className={styles.card}>
              <span className={styles.cardNum}>{counts.exhibitions}</span>
              <span className={styles.cardTitle}>Exhibitions</span>
              <span className={styles.cardText}>
                MoMA, Whitney, Metropolitan, and more
              </span>
            </Link>

            <Link href="/why/" className={styles.card}>
              <span className={styles.cardIcon}>→</span>
              <span className={styles.cardTitle}>The Case</span>
              <span className={styles.cardText}>
                Why this artist matters now
              </span>
            </Link>
          </div>
        </section>

        <h2 style={{ marginTop: 'var(--s-7)' }}>A Career in Five Phases</h2>

        <p>
          Sievan was drawing a weekly cartoon for the <em>Jewish Daily Forward</em> at
          fifteen, while studying at Pratt Institute. He went on to the National Academy
          of Design — where Charles W. Hawthorne encouraged him "to break through the
          traditional rules of academe" — and then to Paris, where he studied with André
          L'Hôte and exhibited at the Salon d'Automne.
        </p>

        <p>
          From a studio in Greenwich Village he painted New York's urban landscapes, and
          after moving to Flushing, the scenes of suburbia. Joseph Solman, founding member
          of The Ten with Rothko and Gottlieb, observed: "nobody had done the poetry of
          the suburbs just like he had."
        </p>

        <p>
          The turn came in 1956. After seeing the landscape from the air on a European
          trip, he abandoned painting from direct observation altogether and worked
          instead from recollection — "a triple entendre of vision, memory and philosophy."
          The paintings grew larger and more abstract through the 1960s; one was acquired
          by the Museum of Modern Art.
        </p>

        <p>
          Will Barnet, who exhibited alongside Sievan for decades, noted the distinctiveness:
          "warm quality in his paint, the way he put the color on... almost Rembrandt-like."
          The 1970s, his final active period, produced "an exquisite series of nearly a
          thousand gem-like miniatures."
        </p>

        <p className="ui muted">
          Quotations from the retrospective catalogue and interview transcripts held in the
          archive — <Link href="/life/retrospective/">read the full catalogue</Link>.
        </p>

        <h2 style={{ marginTop: 'var(--s-7)' }}>Why He Remained Unknown</h2>

        <p>
          Sievan was not an outsider by failure. He was represented by galleries, reviewed
          by major critics, and collected by museums. But he refused to follow Abstract
          Expressionism into pure abstraction — maintaining imagery when images were
          considered reactionary — and he did not pursue the social networking that
          determined which artists rose to prominence.
        </p>

        <p>
          Ivan Karp, the dealer who discovered Warhol and Lichtenstein, explained:
          "His work did not distinctly connect up to prevailing trends. It was always
          singular." In the postwar market, singularity was a liability. What prevented
          commercial success then is precisely what makes the work compelling now.
        </p>
      </div>
    </div>
  );
}
