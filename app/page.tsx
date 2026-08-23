import type { Metadata } from 'next';
import Link from 'next/link';
import {
  counts, allExhibitions, allClips, getClip, coverFor, getObject, pageOf,
} from '@/lib/data';
import { getQuote } from '@/lib/quotes';
import { THESIS, MUSEUM_COLLECTIONS, PEER_NETWORK } from '@/lib/validation';
import { PullQuote } from '@/components/PullQuote';
import { Mosaic, Tile } from '@/components/Mosaic';
import { ClipTile, SheetTile } from '@/components/MediaTile';
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

  const faces = allClips.filter((c) => c.id.startsWith('interview-'));
  // A painting, not another loop: every process clip is already used in the band
  // above, and the page otherwise never shows the work itself.
  const plate = pageOf('MS-AR-00029', 3);

  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)' }}>

      {/* ------------------------------------------------------------ the name */}
      <Mosaic className={styles.top}>
        <Tile col={7} as="section" className={styles.hero}>
          <p className="eyebrow">1898–1981</p>
          <h1 className={styles.name}>Maurice Sievan</h1>
          <p className={styles.tagline}>{THESIS.headline}</p>
          <p className={styles.lede}>{THESIS.subhead}</p>
        </Tile>

        {/* The endorsement, given the weight of a wall text rather than a footnote. */}
        <Tile col={5} as="section" className={styles.creed}>
          {/*
            Not "the verdict" — that tells a reader the question is settled. Greenberg
            said this to Ivan Karp, and what the archive actually holds is Karp's
            account of it. Naming that chain is both less pushy and more accurate.
          */}
          <p className={styles.tileLabel}>Recorded in the Ivan Karp interview</p>
          <PullQuote quote={getQuote('greenberg-best')} size="large" showSource />
        </Tile>
      </Mosaic>

      {/* --------------------------------------------------------- him, working */}
      {/*
        Nine minutes of home-movie footage is the only moving picture of Sievan that
        exists, and until now the site showed twenty-two seconds of it. Six loops run
        edge to edge because this is the most persuasive thing the archive holds.
      */}
      <section className={`bleed ${styles.band}`} aria-labelledby="footage">
        <h2 id="footage" className={styles.bandTitle}>
          The only moving picture of him
          <span className={styles.bandNote}>
            Home-movie footage held in the video archive. Silent, and undated.
          </span>
        </h2>

        <Mosaic>
          {PROCESS_COLUMNS.map((column, c) => (
            <Tile key={column.map((f) => f.id).join()} col={column[0].col}>
              {column.map((f, i) => {
                const clip = getClip(f.id);
                if (!clip) return null;
                return (
                  <ClipTile
                    key={f.id}
                    clip={clip}
                    aspect={f.aspect}
                    priority={c === 0 && i === 0}
                    caption={f.caption}
                  />
                );
              })}
            </Tile>
          ))}
        </Mosaic>
      </section>

      {/* ------------------------------------------------- the case, and the box */}
      <Mosaic className={styles.middle}>
        {/*
          This panel used to be a bulleted argument under the heading "Why he matters
          now". Naming the institutions that hold the work does the same job without
          asking anyone to take a characterisation on trust.
        */}
        <Tile col={4} as="section" className={styles.case} fill>
          <p className={styles.tileLabel}>In these collections</p>
          <ul className={styles.points}>
            {MUSEUM_COLLECTIONS.map((m) => (
              <li key={m.name} className={m.notable ? styles.pointNotable : undefined}>
                <span>{m.name}</span>
                <span className={styles.pointWhere}>{m.location}</span>
              </li>
            ))}
          </ul>
        </Tile>

        <Tile col={3}>
          <SheetTile
            sheet={{ page: '/retrospective/p01.jpg', thumb: '/retrospective/p01.jpg' }}
            alt="Cover of the Maurice Sievan retrospective catalogue."
            href="/life/retrospective/"
            aspect="1137 / 1500"
            caption="The retrospective catalogue."
            meta="Fifteen pages, transcribed"
          />
        </Tile>

        <Tile col={5} as="section">
          <PullQuote quote={getQuote('karp-mystical')} showSource />
          <PullQuote quote={getQuote('barnet-someday')} showSource />
          {plate && (
            <SheetTile
              sheet={plate}
              aspect="4 / 3"
              href="/archive/objects/MS-AR-00029/"
              alt="Maurice Sievan, Eebak, 1962, oil on canvas."
              caption={<><em>Eebak</em>, 1962. Oil on canvas, 86″ × 69″.</>}
              meta="Reproduced in the Vanderwoude Tananbaum catalogue · MS-AR-00029"
            />
          )}
        </Tile>
      </Mosaic>

      {/* ------------------------------------------------------------ the box */}
      <section className={`bleed ${styles.band}`} aria-labelledby="sheets">
        <h2 id="sheets" className={styles.bandTitle}>
          What the box holds
          <span className={styles.bandNote}>
            Fifty catalogued objects — clippings, catalogues, posters. {counts.objectsWithImagery}{' '}
            are scanned and readable here; {counts.archiveObjects - counts.objectsWithImagery} are
            catalogued and not yet digitised.
          </span>
        </h2>

        <Mosaic>
          {SHEET_COLUMNS.map((column) => (
            <Tile key={column.map((f) => f.id).join()} col={3}>
              {column.map((f) => {
                const object = getObject(f.id);
                const cover = coverFor(f.id);
                if (!object || !cover) return null;
                return (
                  <SheetTile
                    key={f.id}
                    sheet={cover}
                    aspect={f.aspect}
                    alt={`${object.raw_title_description.split('\n')[0]} — ${f.id}`}
                    href={`/archive/objects/${f.id}/`}
                    caption={f.caption}
                    meta={`${f.id} · ${object.date_text ?? 'undated'}`}
                  />
                );
              })}
            </Tile>
          ))}
        </Mosaic>

        <p className={styles.bandMore}>
          <Link href="/archive/">Every object in the box →</Link>
        </p>
      </section>

      {/* ---------------------------------------------------- who spoke for him */}
      <section className={`bleed ${styles.band}`} aria-labelledby="voices">
        <h2 id="voices" className={styles.bandTitle}>
          The people who knew him
          <span className={styles.bandNote}>
            Six interviews and a reel of studio footage, recorded on tape by the estate.
            These are silent excerpts — the tapes themselves have sound, and are not
            online.
          </span>
        </h2>

        <Mosaic>
          {faces.map((clip) => (
            <Tile key={clip.id} col={2}>
              <ClipTile
                clip={clip}
                still
                href="/life/interviews/"
                aspect="4 / 3"
                caption={FACE_NAMES[clip.id] ?? 'Unidentified'}
                meta={FACE_NOTES[clip.id]}
              />
            </Tile>
          ))}
        </Mosaic>
      </section>

      {/* ------------------------------------------------------------ the company */}
      <Mosaic className={styles.middle}>
        <Tile col={12} as="section" className={styles.peers}>
          <p className={styles.tileLabel}>The company he kept</p>
          <ul className={styles.peerList}>
            {PEER_NETWORK.map((p) => (
              <li key={p.name}>
                <span className={styles.peerName}>{p.name}</span>
                <span className={styles.peerNote}>{p.note}</span>
              </li>
            ))}
          </ul>
        </Tile>

        {/* --------------------------------------------------------------- doors */}
        <Tile col={12} as="nav" className={styles.doors}>
          <ul className={styles.doorList} aria-label="Explore the archive">
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
                  they were cut from — {counts.objectsWithImagery} of them readable here,
                  and explicit about what is missing.
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
        </Tile>
      </Mosaic>
    </div>
  );
}

/**
 * The footage band, as three columns of stacked loops: 4 + 5 + 3 across.
 *
 * Heights follow from the aspects, not from a row count, so the columns end at
 * different depths on purpose and none of them can strand a hole. The wide column
 * carries the two closest shots; the narrow one carries the two most distant.
 */
const PROCESS_COLUMNS: { id: string; col: number; aspect: string; caption: string }[][] = [
  [
    { id: 'painting-portrait', col: 4, aspect: '4 / 3', caption: 'At the easel, working a brush across a portrait.' },
    { id: 'drawing-portrait', col: 4, aspect: '16 / 9', caption: 'A portrait drawn in charcoal line.' },
  ],
  [
    { id: 'mixing-palette', col: 5, aspect: '16 / 9', caption: 'Colour drawn across a loaded palette.' },
    { id: 'painting-landscape', col: 5, aspect: '4 / 3', caption: 'A landscape canvas going down in real time.' },
  ],
  [
    { id: 'painting-outdoors', col: 3, aspect: '4 / 3', caption: 'Painting outdoors, a crowd gathered behind him.' },
    { id: 'easel-demonstration', col: 3, aspect: '4 / 3', caption: 'A plein-air demonstration, in a hat, at the easel.' },
  ],
];

/**
 * Eight sheets from the box, in four columns of two. Portrait sheets and landscape
 * sheets are mixed down each column so no two columns end level.
 */
const SHEET_COLUMNS: { id: string; aspect: string; caption: string }[][] = [
  [
    { id: 'MS-AR-00027', aspect: '4 / 3', caption: 'Albert Landry Gallery, 1963.' },
    { id: 'MS-AR-00025', aspect: '3 / 4', caption: 'Harry Salpeter Gallery, 1948.' },
  ],
  [
    { id: 'MS-AR-00001', aspect: '3 / 4', caption: 'Four notices photocopied onto one sheet, 1951.' },
    { id: 'MS-AR-00028', aspect: '3 / 4', caption: 'Passedoit Gallery, 1955.' },
  ],
  [
    { id: 'MS-AR-00029', aspect: '3 / 4', caption: 'Vanderwoude Tananbaum — the paintings in colour.' },
    { id: 'MS-AR-00019', aspect: '3 / 4', caption: 'Four notices on one sheet, 1945.' },
  ],
  [
    { id: 'MS-AR-00023', aspect: '4 / 3', caption: 'Salpeter Gallery, Provincetown Harbor.' },
    { id: 'MS-AR-00021', aspect: '3 / 4', caption: 'Contemporary Arts, 1939 — the first one-man show.' },
  ],
];

const FACE_NAMES: Record<string, string> = {
  'interview-karp': 'Ivan Karp',
  'interview-barnet': 'Will Barnet',
  'interview-solman': 'Joseph Solman',
  'interview-wolins': 'Joseph Wolins',
  'interview-dobkin': 'John Dobkin',
  'interview-unidentified': 'Unidentified',
};

const FACE_NOTES: Record<string, string> = {
  'interview-karp': 'Dealer, discovered Warhol',
  'interview-barnet': 'Painter',
  'interview-solman': 'The Ten, peer of Rothko',
  'interview-wolins': 'Painter',
  'interview-dobkin': 'Director, National Academy',
  'interview-unidentified': 'Tape #010 — who is this?',
};
