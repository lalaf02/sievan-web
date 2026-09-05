import type { Metadata } from 'next';
import Link from 'next/link';
import {
  archive, counts, getVideo, allExhibitions, getPerson, clipForPerson, pageOf, getClip,
} from '@/lib/data';
import { getQuote } from '@/lib/quotes';
import { MUSEUM_COLLECTIONS, CRITICS } from '@/lib/validation';
import { CV } from '@/lib/retrospective';
import { CVSource } from '@/components/CVSource';
import { PullQuote } from '@/components/PullQuote';
import { Chronology } from '@/components/Chronology';
import { ClipTile, SheetTile } from '@/components/MediaTile';
import { FootageCarousel } from '@/components/FootageCarousel';
import { formatRange } from '@/lib/dates';
import styles from './life.module.css';
import homeStyles from '../home.module.css';

export const metadata: Metadata = {
  title: 'Life and Memory',
  description:
    'Maurice Sievan (1898–1981) placed in time: a biography in five phases, the full '
    + 'chronology of the archive, the exhibition record, and the people around him.',
};

function Witness({
  personId, quoteId, role,
}: {
  personId: string;
  quoteId?: string;
  role: string;
}) {
  const person = getPerson(personId);
  const clip = clipForPerson(personId);
  if (!person) return null;
  return (
    <aside className={styles.witness}>
      {clip && (
        <ClipTile clip={clip} still aspect="4 / 3" href={`/people/${person.id}/`} />
      )}
      <div className={styles.witnessBody}>
        {quoteId
          ? <PullQuote quote={getQuote(quoteId)} size="small" showSource />
          : (
            <p className={styles.witnessPlain}>
              <Link href={`/people/${person.id}/`} className={styles.witnessName}>
                {person.name}
              </Link>
              <span className={styles.witnessNote}>{role}</span>
              <Link href="/life/interviews/" className={styles.witnessLink}>
                Read the interview
              </Link>
            </p>
          )}
      </div>
    </aside>
  );
}

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

  const studio = pageOf('MS-AR-00027', 2);
  const rothko = pageOf('MS-AR-00029', 4);

  const footageSlides = PROCESS_FRAMES.flatMap((frame) => {
    const clip = getClip(frame.id);
    return clip ? [{ id: frame.id, clip, caption: frame.caption }] : [];
  });

  return (
    <div className="pageWide">
      <header className="measure" style={{ marginBottom: 'var(--s-6)' }}>
        <p className="eyebrow">1898–1981</p>
        <h1>Life and Memory</h1>
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

      <section className={homeStyles.band} aria-labelledby="person">
        <div className={homeStyles.bandHead}>
          <h2 id="person" className={homeStyles.bandTitle}>The only footage the archive holds</h2>
          <p className={homeStyles.bandNote}>
            Of the seven tapes the estate recorded, six are people talking about Sievan
            and one is Sievan himself. It is silent, and undated. Use the arrows to move
            through the surviving footage.
          </p>
        </div>

        <FootageCarousel slides={footageSlides} />

        <div className={homeStyles.personQuote} style={{ marginTop: 'var(--s-5)' }}>
          <PullQuote quote={getQuote('barnet-passion')} size="small" showSource />
          <PullQuote quote={getQuote('solman-resourceful')} size="small" showSource />
        </div>
      </section>

      <div className={styles.split}>
        <div className={styles.narrative}>
          <section className={styles.section}>
            <h2>A career in five phases</h2>

            <p>
              Sievan was drawing a weekly cartoon for the <em>Jewish Daily Forward</em> at
              fifteen, while studying at Pratt Institute. He went on to the National Academy
              of Design — where Charles W. Hawthorne encouraged him “to break through the
              traditional rules of academe” — and then to Paris, where he studied with André
              L’Hôte and exhibited at the Salon d’Automne in 1931.
            </p>

            <Witness personId="john-dobkin" role="Director of the National Academy of Design" />

            {studio && (
              <figure className={styles.plate}>
                <SheetTile
                  sheet={studio}
                  aspect="4 / 3"
                  href="/archive/objects/MS-AR-00027/"
                  alt="Maurice Sievan seated by a window in his studio."
                  caption="Sievan in the studio."
                  meta="From the Albert Landry Gallery catalogue, 1963 · MS-AR-00027"
                />
              </figure>
            )}

            <p>
              From a studio in Greenwich Village he painted New York’s urban landscapes, and
              after moving to Flushing, the scenes of suburbia. Joseph Solman, a founding
              member of The Ten alongside Rothko and Gottlieb, put the achievement plainly:
              nobody had done the poetry of the suburbs the way he had.
            </p>

            <Witness personId="joseph-solman" quoteId="solman-suburbs" role="The Ten, peer of Rothko" />

            <p>
              The turn came in 1956. After seeing the landscape from the air on a European
              trip, he abandoned painting from direct observation altogether and worked
              instead from recollection — “a triple entendre of vision, memory and
              philosophy.” The paintings grew larger and more abstract through the 1960s;
              one was acquired by the Museum of Modern Art.
            </p>

            <Witness personId="will-barnet" quoteId="barnet-rembrandt" role="Major American painter" />

            <p>
              The 1970s, his final active period, produced what the retrospective catalogue
              calls “an exquisite series of nearly a thousand gem-like miniatures.” He died
              in 1981.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Why he remained unknown</h2>

            <p>
              Sievan was not an outsider by failure. He was represented by galleries, reviewed
              by major critics, and collected by museums. But he refused to follow Abstract
              Expressionism into pure abstraction — maintaining imagery when images were
              considered reactionary — and he did not pursue the social networking that
              determined which artists rose to prominence.
            </p>

            <Witness personId="joseph-wolins" quoteId="wolins-explorative" role="WPA artist, National Academy peer" />

            {rothko && (
              <figure className={styles.plate}>
                <SheetTile
                  sheet={rothko}
                  aspect="3 / 4"
                  href="/archive/objects/MS-AR-00029/"
                  alt="Maurice Sievan in Mark Rothko's studio, Provincetown, 1961."
                  caption="Sievan in Mark Rothko’s studio, Provincetown, 1961."
                  meta="Photograph by Lee C. Sievan, from the Vanderwoude Tananbaum catalogue · MS-AR-00029"
                />
              </figure>
            )}

            <p>
              Ivan Karp, the dealer who discovered Warhol and Lichtenstein, explained it as a
              problem of category: his work did not connect up to prevailing trends, and was
              always singular. In the postwar market, singularity was a liability.
            </p>

            <Witness personId="ivan-karp" quoteId="karp-no-trends" role="Gallery owner, discovered Warhol" />

            <p>
              Joseph Solman, writing him back into the period, put the case for what should
              happen next.
            </p>

            <PullQuote quote={getQuote('solman-rehabilitation')} showSource />

            <p className={styles.sourceLine}>
              The five people above are the only first-hand witnesses the archive holds.
              Each sat for a filmed interview, and{' '}
              {counts.transcriptWords.toLocaleString()} words of their testimony are
              transcribed and searchable —{' '}
              <Link href="/life/interviews/">read the interviews in full</Link>, or see{' '}
              <Link href="/people/">all {counts.persons} people in the archive</Link>,
              including the {CRITICS.length} critics who wrote about the work.
              Quotations from the catalogue come from{' '}
              <Link href="/life/retrospective/">the retrospective typescript</Link>.
            </p>
          </section>
        </div>

        <aside className={styles.rail} aria-label="The record">
          <section>
            <h2 className={styles.railTitle}>In permanent collections</h2>
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
          </section>

          <section>
            <h2 className={styles.railTitle}>Awards</h2>
            <ul className={styles.venueList}>
              {CV.awards.map(([award, year]) => (
                <li key={award}>
                  <span className={styles.venueName}>{award}</span>
                  <span className={`${styles.venueYears} tnum`}>{year}</span>
                </li>
              ))}
            </ul>
            <p className={styles.railNote}>He studied at {CV.studies}.</p>
          </section>

          <section>
            <h2 className={styles.railTitle}>
              Exhibitions the archive can prove
              <span className={styles.subheadCount}>{exhibitions.length}</span>
            </h2>
            <ul className={styles.venueList}>
              {exhibitions.map((e) => (
                <li key={e.id}>
                  <Link href={`/exhibitions/${e.id}/`} className={styles.venueName}>
                    {e.gallery_or_venue ?? e.name ?? 'Untitled exhibition'}
                  </Link>
                  <span className={`${styles.venueYears} tnum`}>
                    {formatRange(e.start_date, e.end_date) ?? e.date_earliest}
                  </span>
                </li>
              ))}
            </ul>
            <p className={styles.railNote}>
              Each backed by an object you can look at — a catalogue, a poster, a review.
              His own CV lists {CV.oneManExhibitions.length + CV.groupExhibitions.length};{' '}
              <a href="#exhibitions">the two records side by side</a>.
            </p>
          </section>

          <CVSource />
        </aside>
      </div>

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

        <div className={styles.twoUp}>
          <div>
            <h3 className={styles.subhead}>
              One-man exhibitions
              <span className={styles.subheadCount}>{CV.oneManExhibitions.length}</span>
            </h3>
            <ul className={styles.venueList}>
              {CV.oneManExhibitions.map(([venue, years]) => (
                <li key={`${venue}-${years}`}>
                  <span className={styles.venueName}>{venue}</span>
                  <span className={`${styles.venueYears} tnum`}>{years}</span>
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
                  <span className={`${styles.venueYears} tnum`}>{years}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <CVSource>
          Where the two records name the same place, and where Sievan&rsquo;s own sheets
          name a town or a gallery, that is gathered in the{' '}
          <Link href="/places/">gazetteer of {counts.places} places</Link>.
        </CVSource>
      </section>

      <section className={styles.section}>
        <h2>Private collections</h2>
        <p className="measure muted">
          {CV.privateCollections.length} names, as Sievan’s own CV lists them.
        </p>
        <ul className={styles.privateList}>
          {CV.privateCollections.map((n) => (
            <li key={n}><span className={styles.museumName}>{n}</span></li>
          ))}
        </ul>
        <p className={styles.railNote}>
          Two names here — <strong>I. David Orr</strong> and{' '}
          <strong>Charles Zitner</strong> — resemble names Sievan wrote on his own
          sheets, <em>&ldquo;sold to ORR&rdquo;</em> and{' '}
          <em>&ldquo;Zitners House&rdquo;</em>. That is a lead, not an
          identification, and the archive has not made it.
        </p>
        <CVSource />
      </section>
    </div>
  );
}

const PROCESS_FRAMES: { id: string; caption: string }[] = [
  { id: 'painting-landscape', caption: 'A landscape canvas going down in real time.' },
  { id: 'easel-demonstration', caption: 'A plein-air demonstration, in a hat, at the easel.' },
  { id: 'painting-outdoors', caption: 'Painting outdoors while a crowd stands watching behind him.' },
  { id: 'drawing-portrait', caption: 'A charcoal portrait on the easel, worked at the mouth.' },
  { id: 'mixing-palette', caption: 'Colour drawn across a loaded palette.' },
];