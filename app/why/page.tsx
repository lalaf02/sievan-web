import type { Metadata } from 'next';
import Link from 'next/link';
import {
  GREENBERG_QUOTE,
  getQuotesByCategory,
  KARP_QUOTES,
  BARNET_QUOTES,
  SOLMAN_QUOTES,
} from '@/lib/quotes';
import {
  MUSEUM_COLLECTIONS,
  CRITICS,
  MAJOR_EXHIBITIONS,
  PEER_NETWORK,
  THESIS,
} from '@/lib/validation';
import { PullQuote, QuoteGrid } from '@/components/PullQuote';
import styles from './why.module.css';

export const metadata: Metadata = {
  title: 'Why Sievan',
  description:
    'The case for Maurice Sievan: critical endorsements, museum holdings, and an independent vision overlooked by the market.',
};

export default function WhyPage() {
  const aestheticQuotes = getQuotesByCategory('aesthetic').slice(0, 4);
  const originalityQuotes = getQuotesByCategory('originality').slice(0, 4);

  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)' }}>
      <div className="measure">
        <p className="eyebrow">The Investment Thesis</p>
        <h1>Why Sievan Matters</h1>

        <p className={styles.intro}>{THESIS.subhead}</p>

        {/* The Greenberg endorsement - lead with strongest validation */}
        <section className={styles.section}>
          <PullQuote quote={GREENBERG_QUOTE} size="large" showSource />
          <p className={styles.context}>
            Clement Greenberg — America's most influential art critic, the voice who
            championed Pollock, de Kooning, and the Abstract Expressionists — called
            Maurice Sievan "the best American artist" of three decades. This endorsement,
            reported by Ivan Karp in his 1991 interview, has been buried in transcript
            until now.
          </p>
        </section>

        {/* Gate 1: The Aesthetic Case */}
        <section className={styles.section}>
          <h2>The Aesthetic Case</h2>
          <p className={styles.sectionIntro}>
            Sievan's peers and critics consistently praised the same qualities: a
            luminous, Rembrandt-like warmth; a mystical, haunted character; technical
            mastery across multiple styles.
          </p>
          <QuoteGrid quotes={aestheticQuotes} columns={2} />
        </section>

        {/* Gate 2: The Originality Case */}
        <section className={styles.section}>
          <h2>The Originality Case</h2>
          <p className={styles.sectionIntro}>
            When Ivan Karp — the dealer who discovered Warhol, Lichtenstein, and Stella —
            tried to describe Sievan's work, he couldn't find a category. The same
            uncategorizable quality that frustrated galleries has become the mark of
            lasting relevance.
          </p>
          <QuoteGrid quotes={originalityQuotes} columns={2} />
        </section>

        {/* Gate 3: The Historical Position */}
        <section className={styles.section}>
          <h2>The Historical Position</h2>
          <p className={styles.sectionIntro}>
            Sievan was not an outsider by failure but by choice. He trained at the
            National Academy and the Salon d'Automne, shared a Provincetown studio with
            Rothko, vacationed with Milton Avery, and exhibited alongside the artists who
            would define postwar American art.
          </p>

          <h3 className={styles.subhead}>The Peer Network</h3>
          <ul className={styles.peerList}>
            {PEER_NETWORK.map((peer) => (
              <li key={peer.name}>
                <strong>{peer.name}</strong>
                <span className={styles.peerNote}>{peer.note}</span>
              </li>
            ))}
          </ul>

          <h3 className={styles.subhead}>Major Exhibitions</h3>
          <ul className={styles.exhibitionList}>
            {MAJOR_EXHIBITIONS.slice(0, 6).map((ex) => (
              <li key={ex.name}>
                <span className={styles.exName}>{ex.name}</span>
                <span className={styles.exYears}>{ex.years}</span>
              </li>
            ))}
          </ul>
          <p>
            <Link href="/exhibitions/">See all {MAJOR_EXHIBITIONS.length + 30}+ exhibitions</Link>
          </p>
        </section>

        {/* Gate 4: The Validation Record */}
        <section className={styles.section}>
          <h2>The Validation Record</h2>
          <p className={styles.sectionIntro}>
            Sievan's work entered major museum collections during his lifetime — a
            distinction most artists never achieve. The critical record, scattered across
            publications and interviews, is now synthesized here for the first time.
          </p>

          <h3 className={styles.subhead}>Museum Collections ({MUSEUM_COLLECTIONS.length})</h3>
          <ul className={styles.museumList}>
            {MUSEUM_COLLECTIONS.map((museum) => (
              <li key={museum.name} className={museum.notable ? styles.notable : ''}>
                <span className={styles.museumName}>{museum.name}</span>
                <span className={styles.museumLocation}>{museum.location}</span>
              </li>
            ))}
          </ul>

          <h3 className={styles.subhead}>Critical Voices</h3>
          <ul className={styles.criticList}>
            {CRITICS.map((critic) => (
              <li key={critic.name}>
                <strong>{critic.name}</strong>
                <span className={styles.criticRole}>{critic.role}</span>
                {critic.note && <span className={styles.criticNote}>{critic.note}</span>}
              </li>
            ))}
          </ul>
        </section>

        {/* The opportunity */}
        <section className={styles.section}>
          <h2>The Opportunity</h2>
          <p>
            Maurice Sievan is one of the few American painters of his generation with
            museum-level validation, critical endorsement from the highest sources, and
            a peer network that includes canonical figures — yet remains almost entirely
            unknown to today's market.
          </p>
          <p>
            The estate is intact. The body of work is nearly complete. The archival
            record — press, interviews, exhibition history — is gathered and accessible.
          </p>
          <p>
            What was missing was synthesis: the evidence existed but was scattered across
            24,000 words of transcript and 60+ clippings. This site makes the case
            explicit for the first time.
          </p>
        </section>

        <section className={styles.cta}>
          <h3>Explore the Evidence</h3>
          <ul>
            <li>
              <Link href="/life/interviews/">Read the interviews</Link> — firsthand
              testimony from those who knew him
            </li>
            <li>
              <Link href="/archive/press/">Browse the press archive</Link> — critical
              reception across four decades
            </li>
            <li>
              <Link href="/life/retrospective/">View the retrospective catalogue</Link> —
              the only illustrated survey of the work
            </li>
            <li>
              <Link href="/exhibitions/">Review the exhibition history</Link> — from the
              Salon d'Automne to MoMA
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
