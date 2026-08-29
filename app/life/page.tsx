import type { Metadata } from 'next';
import Link from 'next/link';
import {
  archive, counts, getVideo, allExhibitions, allPersons, clipForPerson, pageOf,
} from '@/lib/data';
import { getQuote } from '@/lib/quotes';
import { MUSEUM_COLLECTIONS, CRITICS } from '@/lib/validation';
import { CV } from '@/lib/retrospective';
import { CVSource } from '@/components/CVSource';
import { PullQuote } from '@/components/PullQuote';
import { Chronology } from '@/components/Chronology';
import { ClipTile, SheetTile } from '@/components/MediaTile';
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
  const studio = pageOf('MS-AR-00027', 2);
  const rothko = pageOf('MS-AR-00029', 4);

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
        <p className={styles.lede}>
          The paintings themselves, and the {counts.worksOnPaperCatalogued} works on paper
          the estate holds, are in the{' '}
          <Link href="/works/">Catalogue Raisonné</Link>. This page is about the man, the
          record and its reception.
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
          {/*
            The archive holds two photographs of Sievan, both buried inside gallery
            catalogues, and nothing on the site used either. A life page with no
            picture of the man was the clearest case of imagery going to waste.
          */}
          {studio && (
            <SheetTile
              sheet={studio}
              aspect="4 / 3"
              href="/archive/objects/MS-AR-00027/"
              alt="Maurice Sievan seated by a window in his studio."
              caption="Sievan in the studio."
              meta="From the Albert Landry Gallery catalogue, 1963 · MS-AR-00027"
            />
          )}
        </div>
      </section>

      {/* ------------------------------------------------------- why he vanished */}
      <section className={`${styles.section} ${styles.bio}`}>
        <div className={styles.bioProse}>
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
        </div>

        <div className={styles.quoteRail}>
          {/*
            Solman on the rehabilitation Sievan needs: reception, and the argument
            this section makes. It had been sitting at the foot of the Catalogue
            Raisonné, which is where the art goes, not the reading of it.
          */}
          <PullQuote quote={getQuote('solman-rehabilitation')} showSource />
          {rothko && (
            <SheetTile
              sheet={rothko}
              aspect="3 / 4"
              href="/archive/objects/MS-AR-00029/"
              alt="Maurice Sievan in Mark Rothko's studio, Provincetown, 1961."
              caption="Sievan in Mark Rothko’s studio, Provincetown, 1961."
              meta="Photograph by Lee C. Sievan, from the Vanderwoude Tananbaum catalogue · MS-AR-00029"
            />
          )}
        </div>
      </section>

      {/* ---------------------------------------------------------- the timeline */}
      <section id="chronology" className={styles.section}>
        <h2>Chronology</h2>
        <p className="measure muted" style={{ marginBottom: 'var(--s-5)' }}>
          Everything the archive can date, on one spine — {span}. The record is uneven by
          nature: it thickens around each exhibition and thins to nothing between them.
          Those gaps are shown rather than closed up.
        </p>
        <Chronology
          events={timeline}
          undatedTestimony={testimony}
          undatedAttestations={archive.derived.undatedAttestations.length}
        />
      </section>

      {/* -------------------------------------------------- the institutional record */}
      <section id="exhibitions" className={styles.section}>
        <h2>Where the work was shown</h2>
        <p className="measure muted">
          Two records, and they do not match. Sievan’s own CV lists{' '}
          {CV.oneManExhibitions.length + CV.groupExhibitions.length} exhibitions; the
          archive separately holds physical evidence — a catalogue, a poster, a review —
          for {counts.exhibitions} of them. The first is his account of his career, the
          second is what survives to prove it. The gap between the two numbers is the
          honest shape of the record.
        </p>

        <div className={styles.threeUp}>
          <div>
            <h3 className={styles.subhead}>
              One-man exhibitions
              <span className={styles.subheadCount}>{CV.oneManExhibitions.length}</span>
            </h3>
            <ul className={styles.venueList}>
              {CV.oneManExhibitions.map(([venue, years]) => (
                <li key={`${venue}-${years}`}>
                  <span className={styles.venueName}>{venue}</span>
                  <span className={styles.venueYears}>{years}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={styles.subhead}>
              Group exhibitions
              <span className={styles.subheadCount}>{CV.groupExhibitions.length}</span>
            </h3>
            <ul className={styles.venueList}>
              {CV.groupExhibitions.map(([venue, years]) => (
                <li key={`${venue}-${years}`}>
                  <span className={styles.venueName}>{venue}</span>
                  <span className={styles.venueYears}>{years}</span>
                </li>
              ))}
            </ul>
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

        <CVSource>
          Where the two records name the same place, and where Sievan&rsquo;s own sheets
          name a town or a gallery, that is gathered in the{' '}
          <Link href="/places/">gazetteer of {counts.places} places</Link>.
        </CVSource>
      </section>

      {/* ------------------------------------------------------------- collections */}
      <section className={styles.section}>
        <h2>In permanent collections</h2>
        <div className={styles.twoUp}>
          <div>
            <h3 className={styles.subhead}>
              Museums
              <span className={styles.subheadCount}>{MUSEUM_COLLECTIONS.length}</span>
            </h3>
            <ul className={styles.museumList}>
              {MUSEUM_COLLECTIONS.map((m) => (
                <li key={m.name} className={m.notable ? styles.museumNotable : undefined}>
                  {m.placeId
                    ? (
                      <Link href={`/places/${m.placeId}/`} className={styles.museumName}>
                        {m.name}
                      </Link>
                    )
                    : <span className={styles.museumName}>{m.name}</span>}
                  <span className={styles.museumWhere}>{m.location}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={styles.subhead}>
              Private collections
              <span className={styles.subheadCount}>{CV.privateCollections.length}</span>
            </h3>
            <ul className={styles.museumList}>
              {CV.privateCollections.map((n) => (
                <li key={n}><span className={styles.museumName}>{n}</span></li>
              ))}
            </ul>
            {/*
              Stated as a lead, not an identification. Two of these names resemble
              names Sievan wrote on his own sheets, and resemblance is not proof.
            */}
            <p className={styles.railNote}>
              Two names here — <strong>I. David Orr</strong> and{' '}
              <strong>Charles Zitner</strong> — resemble names Sievan wrote on his own
              sheets, <em>&ldquo;sold to ORR&rdquo;</em> and{' '}
              <em>&ldquo;Zitners House&rdquo;</em>. That is a lead, not an
              identification, and the archive has not made it.
            </p>
          </div>
        </div>

        <h3 className={styles.subhead} style={{ marginTop: 'var(--s-5)' }}>
          Awards
          <span className={styles.subheadCount}>{CV.awards.length}</span>
        </h3>
        <ul className={styles.venueList}>
          {CV.awards.map(([award, year]) => (
            <li key={award}>
              <span className={styles.venueName}>{award}</span>
              <span className={styles.venueYears}>{year}</span>
            </li>
          ))}
        </ul>
        <p className={styles.railNote}>He studied at {CV.studies}.</p>

        <CVSource />
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

        {/*
          Faces, not a list of names. These five are the only people who spoke about
          Sievan on the record, and the page carried them as five links in a four-wide
          auto-fill grid — one full row and an orphan.
        */}
        <ul className={styles.witnessList}>
          {witnesses.map((p) => {
            const clip = clipForPerson(p.id);
            return (
              <li key={p.id}>
                {clip && (
                  <ClipTile
                    clip={clip}
                    still
                    aspect="4 / 3"
                    href={`/people/${p.id}/`}
                  />
                )}
                <Link href={`/people/${p.id}/`} className={styles.witnessName}>{p.name}</Link>
                {p.notes && <span className={styles.witnessNote}>{p.notes}</span>}
              </li>
            );
          })}
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
