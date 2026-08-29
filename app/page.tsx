import type { Metadata } from 'next';
import Link from 'next/link';
import {
  allExhibitions, counts, getClip, pageOf,
} from '@/lib/data';
import { getQuote } from '@/lib/quotes';
import {
  THESIS, MUSEUM_COLLECTIONS, MARQUEE_EXHIBITIONS, PEER_NETWORK,
} from '@/lib/validation';
import { CV } from '@/lib/retrospective';
import { PLATES } from '@/lib/plates';
import { PLATE_CREDIT } from '@/lib/provenance';
import { PullQuote } from '@/components/PullQuote';
import { CVSource } from '@/components/CVSource';
import { ClipTile, SheetTile } from '@/components/MediaTile';
import styles from './home.module.css';

export const metadata: Metadata = {
  title: 'Maurice Sievan (1898–1981) — Archive',
  description:
    'American painter (1898–1981). Work in thirteen museum collections including the Museum '
    + 'of Modern Art and the Hirshhorn. Press notices, oral-history interviews, exhibition '
    + 'records and the catalogue of works.',
};

/**
 * The front page, in four movements: the man, the work, the record, and what this
 * site is.
 *
 * It was six blocks of a twelve-column mosaic that each argued their own case — a
 * banner reading "A Private Vision" with no speaker attached, a tinted band of
 * footage, a panel of museums, a row of sheets, a row of faces, a row of peers. The
 * quotes stood alone at full width between them, so testimony read as punctuation.
 * Now the quotes sit beside the pictures they bear on, and each section has one job.
 */
export default function Home() {
  const years = allExhibitions.map((e) => e.date_earliest ?? 0).filter(Boolean);
  const span = `${Math.min(...years)}–${Math.max(...years)}`;

  // The one moving image of Sievan himself, and the page's opening frame.
  const atTheEasel = getClip('painting-portrait');
  const plates = PLATES
    .map((p) => ({ ...p, sheet: pageOf(p.objectId, p.page) }))
    .filter((p): p is typeof p & { sheet: NonNullable<typeof p.sheet> } => !!p.sheet);

  return (
    <div className="page">

      {/* ═══════════════════════════════════════════════ hero: the man, painting */}
      <section className={styles.hero} aria-labelledby="name">
        <div className={styles.heroMedia}>
          {atTheEasel && (
            <ClipTile
              clip={atTheEasel}
              aspect="4 / 3"
              priority
              caption="Sievan at the easel, working a brush across a portrait."
              meta="Silent home-movie footage held by the estate"
            />
          )}
        </div>
        <div className={styles.heroText}>
          <p className="eyebrow">1898–1981</p>
          <h1 id="name" className={styles.name}>Maurice Sievan</h1>
          {/*
            The banner that used to sit here read "A Private Vision" with no speaker
            and no source. It was Ivan Karp's phrase; unattributed, it read as a slogan
            the project had written about itself. See the note on THESIS.
          */}
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

      {/* ═════════════════════════════════════════════════ 1. Sievan as a person */}
      <section className={styles.band} aria-labelledby="person">
        <div className={styles.bandHead}>
          <h2 id="person" className={styles.bandTitle}>The only footage the archive holds</h2>
          <p className={styles.bandNote}>
            {/*
              Scoped to the archive. This heading read "The only moving picture of him",
              which is a claim about every reel of film in the world and not one the
              archive can make. What it can say is what it holds: seven tapes, six of
              them people talking about him, one of him painting.
            */}
            Of the seven tapes the estate recorded, six are people talking about Sievan
            and one is Sievan himself. It is silent, and undated.
          </p>
        </div>

        <div className={styles.personGrid}>
          {PROCESS_FRAMES.map((f) => {
            const clip = getClip(f.id);
            if (!clip) return null;
            return (
              <ClipTile
                key={f.id}
                clip={clip}
                /* The reel's own 3:2. A tile spanning two columns at 4:3 stood six
                   hundred pixels tall and made the other four look like thumbnails. */
                aspect="3 / 2"
                still={f.motion === 'still'}
                caption={f.caption}
              />
            );
          })}
          <div className={styles.personQuote}>
            <PullQuote quote={getQuote('barnet-passion')} size="small" showSource />
            <PullQuote quote={getQuote('solman-resourceful')} size="small" showSource />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════ 2. the work, and what was said */}
      <section className={styles.band} aria-labelledby="work">
        <div className={styles.bandHead}>
          <h2 id="work" className={styles.bandTitle}>The paintings that survive in reproduction</h2>
          <p className={styles.bandNote}>
            Three canvases, as the galleries that showed them printed them.
          </p>
        </div>

        <div className={styles.workGrid}>
          {plates.map((p, i) => (
            <figure key={`${p.objectId}-${p.page}`} className={styles.work}>
              <SheetTile
                sheet={p.sheet}
                href={`/archive/objects/${p.objectId}/`}
                aspect="4 / 5"
                alt={`${p.title}${p.year ? `, ${p.year}` : ''}, by Maurice Sievan`}
                caption={<><em>{p.title}</em>{p.year ? `, ${p.year}` : ''}</>}
                meta={p.detail ?? undefined}
              />
              {/* One quote per painting, set beneath it rather than between them. */}
              <div className={styles.workQuote}>
                <PullQuote quote={getQuote(WORK_QUOTES[i])} size="small" showSource />
              </div>
            </figure>
          ))}
        </div>

        <p className={styles.bandFoot}>
          {PLATE_CREDIT}{' '}
          <Link href="/works/">Everything the archive holds of the work →</Link>
        </p>
      </section>

      {/* ═══════════════════════════════════════════ 3. recognition and legacy */}
      <section className={styles.band} aria-labelledby="record">
        <div className={styles.bandHead}>
          <h2 id="record" className={styles.bandTitle}>What the record shows</h2>
          <p className={styles.bandNote}>
            Naming the institutions that hold the work says more, and asks less to be
            taken on trust, than calling him important.
          </p>
        </div>

        <div className={styles.recordGrid}>
          <div className={styles.recordCol}>
            <h3 className={styles.recordTitle}>
              In {MUSEUM_COLLECTIONS.length} museum collections
            </h3>
            <ul className={styles.points}>
              {MUSEUM_COLLECTIONS.map((m) => (
                <li key={m.name} className={m.notable ? styles.pointNotable : undefined}>
                  <span>{m.name}</span>
                  <span className={styles.pointWhere}>{m.location}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.recordCol}>
            <h3 className={styles.recordTitle}>Shown in these museums</h3>
            <ul className={styles.points}>
              {MARQUEE_EXHIBITIONS.map((e) => (
                <li key={e.venue}>
                  <span>{e.venue}</span>
                  <span className={`${styles.pointWhere} tnum`}>{e.years}</span>
                </li>
              ))}
            </ul>
            <p className={styles.recordAside}>
              Eight of the {CV.groupExhibitions.length} group exhibitions his CV lists.
            </p>

            <h3 className={styles.recordTitle}>Awards</h3>
            <ul className={styles.points}>
              {CV.awards.map(([name, when]) => (
                <li key={name}>
                  <span>{name}</span>
                  <span className={`${styles.pointWhere} tnum`}>{when}</span>
                </li>
              ))}
            </ul>
          </div>

          {/*
            The witnesses, beside the record rather than in a row of their own. These
            six faces were a separate band that read as a cast list; here they are the
            evidence for the claims to their left.
          */}
          <div className={styles.recordCol}>
            <h3 className={styles.recordTitle}>The people who said so</h3>
            <PullQuote quote={getQuote('greenberg-best')} size="small" showSource />
            <PullQuote quote={getQuote('karp-national-recognition')} size="small" showSource />
            <PullQuote quote={getQuote('solman-rehabilitation')} size="small" showSource />
            <div className={styles.faces}>
              {FACES.map((f) => {
                const clip = getClip(f.id);
                if (!clip) return null;
                return (
                  <ClipTile
                    key={f.id}
                    clip={clip}
                    still
                    href="/life/interviews/"
                    aspect="4 / 3"
                    caption={f.name}
                    meta={f.note}
                  />
                );
              })}
            </div>
            <p className={styles.recordAside}>
              Five interviews, transcribed in full — {counts.transcriptWords.toLocaleString()}{' '}
              words. <Link href="/life/interviews/">Read them →</Link>
            </p>
          </div>
        </div>

        {/*
          The caveat belongs here, closing the three CV-derived columns above it. It
          was below the peer network, which reads as crediting PEER_NETWORK to page 8
          of the retrospective — those six names come from lib/validation.ts, not from
          the CV, and the misattribution is exactly the kind this archive cannot make.
        */}
        <CVSource />

        <div className={styles.peers}>
          <p className={styles.tileLabel}>The company he kept</p>
          <ul className={styles.peerList}>
            {PEER_NETWORK.map((p) => (
              <li key={p.name}>
                <span className={styles.peerName}>{p.name}</span>
                <span className={styles.peerNote}>{p.note}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════ 4. what this site is */}
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
                  <span className={styles.doorTitle}>Life and Work</span>
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

/**
 * The rest of the reel.
 *
 * `motion` is explicit per frame because the mix is the point: six concurrent loops of
 * grainy 16mm read as static, and the eye settles nowhere. The hero frame moves, one
 * more moves here, and the rest are posters. Aspects stay near the footage's own 3:2 —
 * a portrait crop on a landscape frame throws away most of the shot.
 *
 * All five remaining clips are used. Two of them, `drawing-portrait` and
 * `painting-outdoors`, had been cut and committed and then never put on any page.
 */
const PROCESS_FRAMES: {
  id: string; motion: 'play' | 'still'; caption: string;
}[] = [
  { id: 'painting-landscape', motion: 'play', caption: 'A landscape canvas going down in real time.' },
  { id: 'easel-demonstration', motion: 'still', caption: 'A plein-air demonstration, in a hat, at the easel.' },
  { id: 'painting-outdoors', motion: 'still', caption: 'Painting outdoors while a crowd stands watching behind him.' },
  { id: 'drawing-portrait', motion: 'still', caption: 'A charcoal portrait on the easel, worked at the mouth.' },
  { id: 'mixing-palette', motion: 'still', caption: 'Colour drawn across a loaded palette.' },
];

/**
 * One quote per plate, in the order PLATES declares them: Eebak, Oombix, Provincetown
 * Harbor. Chosen by id, never by index into a speaker's quotes, for the reason
 * FEATURED_QUOTES is — reordering lib/quotes.ts must not silently change the front page.
 */
const WORK_QUOTES = ['karp-mystical', 'barnet-luminosity', 'solman-gift'];

const FACES: { id: string; name: string; note: string }[] = [
  { id: 'interview-karp', name: 'Ivan Karp', note: 'Dealer, discovered Warhol' },
  { id: 'interview-barnet', name: 'Will Barnet', note: 'Painter' },
  { id: 'interview-solman', name: 'Joseph Solman', note: 'The Ten, peer of Rothko' },
  { id: 'interview-wolins', name: 'Joseph Wolins', note: 'Painter' },
  { id: 'interview-dobkin', name: 'John Dobkin', note: 'Director, National Academy' },
  { id: 'interview-unidentified', name: 'Unidentified', note: 'Who is this?' },
];
