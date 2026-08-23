import type { Metadata } from 'next';
import Link from 'next/link';
import { archive, counts, getVideo, allExhibitions, allPersons } from '@/lib/data';
import { getQuote } from '@/lib/quotes';
import { MUSEUM_COLLECTIONS, MAJOR_EXHIBITIONS, CRITICS } from '@/lib/validation';
import { PullQuote } from '@/components/PullQuote';
import { Chronology } from '@/components/Chronology';
import { formatRange } from '@/lib/dates';
import styles from './life.module.css';

export const metadata: Metadata = {
  title: 'Life and Work',
  description:
    'Maurice Sievan (1898–1981) placed in time: a biography in five phases, the full '
    + 'chronology of the archive, the exhibition record, and the people around him.',
};

export default function LifePage() {
  const { timeline, undatedVideos } = archive.derived;

  const testimony = undatedVideos
    .map((id) => getVideo(id))
    .filter((v): v is NonNullable<typeof v> => !!v && !!v.transcript_text_file)
    .map((v) => ({
      id: v.id,
      title: v.title,
      href: `/life/interviews/${v.id}/`,
      words: v.transcript_word_count,
    }));

  const years = timeline.map((t) => t.year);
  const span = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : '';

  const exhibitions = [...allExhibitions].sort(
    (a, b) => (a.date_earliest ?? 0) - (b.date_earliest ?? 0),
  );

  // The five people who sat for a filmed interview are the archive's primary
  // witnesses; everyone else is a byline or a mention.
  const witnesses = allPersons.filter((p) => p.roles.includes('interview_subject'));

  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)' }}>
      <header className="measure" style={{ marginBottom: 'var(--s-6)' }}>
        <p className="eyebrow">1898–1981</p>
        <h1>Life and Work</h1>
        <p className={styles.lede}>
          Born in Ukraine, raised in Brooklyn, trained in Paris, and at work in New York
          for sixty years. This is the record placed in order: the life, everything the
          archive can date, where the work was shown, and who was there to say so.
        </p>
      </header>

      {/* --------------------------------------------------------------- the life */}
      <section className={`${styles.section} ${styles.bio}`}>
        <div className={styles.bioProse}>
          <h2>A career in five phases</h2>

          <p>
            Sievan was drawing a weekly cartoon for the <em>Jewish Daily Forward</em> at
            fifteen, while studying at Pratt Institute. He went on to the National Academy
            of Design — where Charles W. Hawthorne encouraged him “to break through the
            traditional rules of academe” — and then to Paris, where he studied with André
            L’Hôte and exhibited at the Salon d’Automne in 1931.
          </p>

          <p>
            From a studio in Greenwich Village he painted New York’s urban landscapes, and
            after moving to Flushing, the scenes of suburbia. Joseph Solman, a founding
            member of The Ten alongside Rothko and Gottlieb, put the achievement plainly:
            nobody had done the poetry of the suburbs the way he had.
          </p>

          <p>
            The turn came in 1956. After seeing the landscape from the air on a European
            trip, he abandoned painting from direct observation altogether and worked
            instead from recollection — “a triple entendre of vision, memory and
            philosophy.” The paintings grew larger and more abstract through the 1960s;
            one was acquired by the Museum of Modern Art.
          </p>

          <p>
            The 1970s, his final active period, produced what the retrospective catalogue
            calls “an exquisite series of nearly a thousand gem-like miniatures.” He died
            in 1981.
          </p>
        </div>

        <div className={styles.quoteRail}>
          <PullQuote quote={getQuote('solman-suburbs')} showSource />
          <PullQuote quote={getQuote('barnet-rembrandt')} showSource />
        </div>
      </section>

      {/* ------------------------------------------------------- why he vanished */}
      <section className={`${styles.section} measure`}>
        <h2>Why he remained unknown</h2>
        <p>
          Sievan was not an outsider by failure. He was represented by galleries, reviewed
          by major critics, and collected by museums. But he refused to follow Abstract
          Expressionism into pure abstraction — maintaining imagery when images were
          considered reactionary — and he did not pursue the social networking that
          determined which artists rose to prominence.
        </p>
        <p>
          Ivan Karp, the dealer who discovered Warhol and Lichtenstein, explained it as a
          problem of category: his work did not connect up to prevailing trends, and was
          always singular. In the postwar market, singularity was a liability.
        </p>
        <p className="ui muted">
          Quotations here come from the retrospective catalogue and the interview
          transcripts — <Link href="/life/retrospective/">read the catalogue</Link> or{' '}
          <Link href="/life/interviews/">the interviews in full</Link>.
        </p>
      </section>

      {/* ---------------------------------------------------------- the timeline */}
      <section id="chronology" className={styles.section}>
        <h2>Chronology</h2>
        <p className="measure muted" style={{ marginBottom: 'var(--s-5)' }}>
          Everything the archive can date, on one spine — {span}. The record is uneven by
          nature: it thickens around each exhibition and thins to nothing between them.
          Those gaps are shown rather than closed up.
        </p>
        <Chronology events={timeline} undatedTestimony={testimony} />
      </section>

      {/* -------------------------------------------------- the institutional record */}
      <section id="exhibitions" className={styles.section}>
        <h2>Where the work was shown</h2>
        <p className="measure muted">
          Two records, and they do not match. The retrospective catalogue’s CV lists the
          major museum surveys Sievan appeared in; the archive separately holds physical
          evidence — a catalogue, a poster, a review — for {counts.exhibitions} shows. The
          first is his own account, the second is what survives to prove it.
        </p>

        <div className={styles.twoUp}>
          <div>
            <h3 className={styles.subhead}>From the catalogue CV</h3>
            <ul className={styles.venueList}>
              {MAJOR_EXHIBITIONS.map((v) => (
                <li key={v.name}>
                  <span className={styles.venueName}>{v.name}</span>
                  <span className={styles.venueYears}>{v.years}</span>
                </li>
              ))}
            </ul>
            <p className={styles.railNote}>
              Transcribed from the retrospective catalogue held in the archive. Not
              independently verified against museum records.
            </p>
          </div>

          <div>
            <h3 className={styles.subhead}>
              Documented in the archive <span className={styles.subheadCount}>{exhibitions.length}</span>
            </h3>
            <ul className={styles.venueList}>
              {exhibitions.map((e) => (
                <li key={e.id}>
                  <Link href={`/exhibitions/${e.id}/`} className={styles.venueName}>
                    {e.name ?? e.gallery_or_venue ?? 'Untitled exhibition'}
                  </Link>
                  <span className={styles.venueYears}>
                    {formatRange(e.start_date, e.end_date) ?? e.date_earliest}
                  </span>
                </li>
              ))}
            </ul>
            <p className={styles.railNote}>
              Each one backed by an object you can look at.{' '}
              <Link href="/exhibitions/">See the full exhibition record</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- collections */}
      <section className={styles.section}>
        <h2>In permanent collections</h2>
        <ul className={styles.museumList}>
          {MUSEUM_COLLECTIONS.map((m) => (
            <li key={m.name} className={m.notable ? styles.museumNotable : undefined}>
              <span className={styles.museumName}>{m.name}</span>
              <span className={styles.museumWhere}>{m.location}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------------------- the people */}
      <section id="people" className={styles.section}>
        <h2>Who was there</h2>
        <p className="measure muted">
          Five people sat down in front of a camera to talk about Sievan. Their accounts
          are the only first-hand testimony the archive holds, and{' '}
          {counts.transcriptWords.toLocaleString()} words of it are transcribed and
          searchable.
        </p>

        <ul className={styles.witnessList}>
          {witnesses.map((p) => (
            <li key={p.id}>
              <Link href={`/people/${p.id}/`} className={styles.witnessName}>{p.name}</Link>
              {p.notes && <span className={styles.witnessNote}>{p.notes}</span>}
            </li>
          ))}
        </ul>

        <p className={styles.railNote}>
          <Link href="/life/interviews/">Read the interviews</Link> ·{' '}
          <Link href="/people/">All {counts.persons} people in the archive</Link>, including
          the {CRITICS.length} critics who wrote about the work
        </p>
      </section>
    </div>
  );
}
