import type { Metadata } from 'next';
import Link from 'next/link';
import {
  allPaintings, attestationsForObject, byDateUndatedLast, counts, coverFor,
  hasImagery, objectLead, objectsForCollection,
} from '@/lib/data';
import { SheetTile } from '@/components/MediaTile';
import { WorksBrowser } from '@/components/WorksBrowser';
import { RETROSPECTIVE_PAGES, CV } from '@/lib/retrospective';
import { getQuote } from '@/lib/quotes';
import { PullQuote } from '@/components/PullQuote';
import { Pending } from '@/components/Pending';
import { CONTACT, mailtoHref } from '@/lib/contact';
import styles from './works.module.css';

export const metadata: Metadata = {
  title: 'Catalogue Raisonné',
  description:
    'The catalogue of Maurice Sievan’s paintings — in preparation. The five periods of '
    + 'the work, the 57 paintings named in his own hand, the exhibition and collection '
    + 'record, and what is known so far.',
};

/**
 * Sievan's own drawings, and the paintings they record.
 *
 * Rendered in BOTH branches below. When the catalogue opens, the browser must not
 * become the whole page — these sheets are the evidence the catalogue was built
 * from, and dropping them the day the first painting lands would quietly delete
 * the archive's account of its own working.
 */
function WorksOnPaper() {
  // Only sheets with a scan can be shown; the one without is a retired folder and
  // belongs on the archive page, not here.
  const sketches = objectsForCollection('MS-CS-002')
    .filter((o) => o.object_type === 'work_on_paper' && hasImagery(o.id))
    .sort(byDateUndatedLast);

  if (!sketches.length) return null;

  return (
    <section className={styles.section}>
      <h2>Sievan’s own record of his paintings</h2>
      <p className={styles.lede}>
        The archive holds {sketches.length} works in Sievan’s own hand: drawings and
        sketches on envelopes, index cards and note paper, catalogued as box{' '}
        <Link href="/archive/">MS-CS-002</Link>.
      </p>
      <p className={styles.lede}>
        Most of them are drawings <em>of</em> paintings. Sievan sketched a work he had
        finished and wrote its title, size, medium and asking price beside it, and
        sometimes where it went. Read across the box, these sheets name{' '}
        <strong>{counts.attestedWorks} paintings</strong> —{' '}
        {counts.attestedWorksWithDimensions} of them with a size,{' '}
        {counts.attestedWorksWithPrice} with a price — that exist nowhere else in the
        record. They are the strongest evidence the archive has toward the catalogue.
        They are not that catalogue: a sketch records a painting, it does not
        establish one.
      </p>

      <ol className={styles.sketchGrid}>
        {sketches.map((o) => {
          const cover = coverFor(o.id);
          const named = attestationsForObject(o.id).length;
          const href = `/archive/objects/${o.id}/`;
          return (
            <li key={o.id}>
              {cover && (
                <SheetTile
                  sheet={cover}
                  href={href}
                  aspect="4 / 3"
                  alt={`${objectLead(o)} — ${o.id}`}
                  caption={
                    <Link href={href} className={styles.sketchLead}>
                      {objectLead(o)}
                    </Link>
                  }
                  meta={
                    named
                      ? `${o.id} · ${named} painting${named === 1 ? '' : 's'} named`
                      : `${o.id} · ${o.date_text ?? 'undated'}`
                  }
                />
              )}
            </li>
          );
        })}
      </ol>
      <p className={styles.note}>
        Every sheet is transcribed verbatim on its record page, including the
        annotations on the reverse.{' '}
        <Link href="/works/attested/">
          Read the {counts.attestedWorks} paintings they name
        </Link>{' '}
        — each beside the words that name it — or{' '}
        <Link href="/archive/">see the box in full</Link>.
      </p>
    </section>
  );
}

/** The CV, and where the gazetteer picks it up. */
function WhereThePaintingsWent() {
  return (
    <section className={styles.section}>
      <h2>Where the paintings went</h2>
      <div className={styles.cvGrid}>
        <div>
          <h3 className={styles.subhead}>
            One-man exhibitions
            <span className={styles.subheadCount}>{CV.oneManExhibitions.length}</span>
          </h3>
          <ul className={styles.cvList}>
            {CV.oneManExhibitions.map(([venue, years]) => (
              <li key={`${venue}-${years}`}>
                <span>{venue}</span>
                <span className={styles.cvYears}>{years}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className={styles.subhead}>
            Museum collections
            <span className={styles.subheadCount}>{CV.museumCollections.length}</span>
          </h3>
          <ul className={styles.cvList}>
            {CV.museumCollections.map((m) => (
              <li key={m}><span>{m}</span></li>
            ))}
          </ul>
          <h3 className={styles.subhead} style={{ marginTop: 'var(--s-5)' }}>
            Awards
            <span className={styles.subheadCount}>{CV.awards.length}</span>
          </h3>
          <ul className={styles.cvList}>
            {CV.awards.map(([award, year]) => (
              <li key={award}>
                <span>{award}</span>
                <span className={styles.cvYears}>{year}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className={styles.note}>
        Transcribed from the CV page of the retrospective catalogue. It is Sievan’s own
        account, not independently verified — the archive separately holds physical
        evidence for {counts.exhibitions} exhibitions, which{' '}
        <Link href="/life/#exhibitions">can be compared against this list</Link>. Where
        the two records name the same place, and where his sheets name a town or a
        gallery, that is gathered in the{' '}
        <Link href="/places/">gazetteer of {counts.places} places</Link>.
      </p>
    </section>
  );
}

export default function WorksPage() {
  const paintings = allPaintings;

  /*
   * The browser is fully built; it simply has nothing to list yet. When
   * seed_paintings.json fills, this page turns on with no code change — and the
   * two sections below it stay, because the evidence does not stop mattering the
   * day the catalogue opens.
   */
  if (paintings.length > 0) {
    return (
      <div className="page" style={{ paddingTop: 'var(--s-6)' }}>
        <header style={{ marginBottom: 'var(--s-5)' }}>
          <h1>Catalogue Raisonné</h1>
          <p className="measure muted">
            {paintings.length} works. Each one carries what is known about it — date,
            medium, dimensions, where it is now — and links to everything the archive
            holds about it.
          </p>
        </header>
        <WorksBrowser paintings={paintings} />
        <WorksOnPaper />
        <WhereThePaintingsWent />
      </div>
    );
  }

  /*
   * With no painting records, the honest thing is not a greyed-out filter rail —
   * that dresses an absence up as a loading state. What the archive does hold is
   * the retrospective catalogue's own account of the work, Sievan's own sheets
   * naming fifty-seven paintings, and a CV of where the work went.
   */
  const periods = RETROSPECTIVE_PAGES.filter((p) => p.plateYears.length > 0);
  const platesKnown = periods.reduce((n, p) => n + p.plateYears.length, 0);

  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)' }}>
      <header className="measure" style={{ marginBottom: 'var(--s-6)' }}>
        <p className="eyebrow">In preparation</p>
        <h1>Catalogue Raisonné</h1>
        <p className={styles.lede}>
          The complete catalogue of Sievan’s paintings is being assembled now — the works
          photographed, measured and dated one at a time. It is not open yet, and this
          page does not pretend otherwise.
        </p>
        <p className={styles.lede}>
          What follows is everything the archive can say about the body of work without
          it: five periods drawn from the retrospective catalogue with {platesKnown}{' '}
          dated plates, {counts.attestedWorks} paintings named in Sievan’s own
          handwriting, and the record of where the work went.
        </p>
      </header>

      {/* ------------------------------------------------------------ the catalogue */}
      {/*
        Moved up from last to first. This is what the page is named for; burying it
        under three sections of secondary material was defensible when there was
        nothing else to show, and stops being so now that there is.
      */}
      <section className={styles.section}>
        <h2>The entries themselves</h2>

        {/*
          The shape of a record, not an example of one. Naming the fields tells a
          visitor exactly what the catalogue will answer without inventing a
          painting to demonstrate it — and in a catalogue raisonné a fabricated
          entry is indistinguishable from provenance.
        */}
        <Pending
          eyebrow="Awaiting photography"
          title="No works are catalogued yet."
          fields={[
            { name: 'Title', note: 'As the estate records it; “Untitled” where there is none.' },
            { name: 'Date', note: 'Year, or the range the evidence supports.' },
            { name: 'Medium', note: 'Oil on canvas, oil on panel, works on paper.' },
            { name: 'Dimensions', note: 'Height × width, so the catalogue can be viewed at true relative scale.' },
            { name: 'Current location', note: 'Museum, private collection, or the estate.' },
            { name: 'Image', note: 'A photograph of the work itself — the thing this archive most lacks.' },
          ]}
          footer={
            <>
              Know the whereabouts of a Sievan, or hold one?{' '}
              <a href={mailtoHref('Sievan catalogue: a work')}>{CONTACT.email}</a> — locating
              works in private hands is the part of a catalogue raisonné that cannot be done
              from an archive box.
            </>
          }
        >
          <p>
            The paintings are being photographed, measured and dated now. Until that
            work arrives this page can describe the body of work only at second hand.
          </p>
          <p>
            The {counts.attestedWorks} paintings Sievan recorded on his own sheets are
            listed separately, as what they are:{' '}
            <Link href="/works/attested/">evidence toward this catalogue, not entries
            in it</Link>. Nobody has seen those paintings; what survives is the artist
            writing down what he had made and what he wanted for it.
          </p>
          <p>
            When the entries land, each one will also carry what was written and said about
            it: the press notices, the exhibitions it hung in, and the passages of interview
            that discuss it. Those connections are already built and waiting on rows.
          </p>
        </Pending>
      </section>

      {/* ------------------------------------------------------------ the periods */}
      <section className={styles.section}>
        <h2>Five periods</h2>
        <ol className={styles.periods}>
          {periods.map((p) => (
            <li key={p.page} className={styles.period}>
              <Link href={`/life/retrospective/#page-${p.page}`} className={styles.periodMedia}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt={`Retrospective catalogue page ${p.page}: ${p.heading}`} />
              </Link>
              <div className={styles.periodBody}>
                <h3 className={styles.periodTitle}>{p.heading}</h3>
                <p className={styles.plateYears}>
                  {p.plateYears.length} plate{p.plateYears.length === 1 ? '' : 's'} ·{' '}
                  <span className="tnum">{p.plateYears.join(', ')}</span>
                </p>
                {p.text && <p className={styles.periodText}>{p.text[0]}</p>}
                {p.caption && <p className={styles.periodCaption}>{p.caption}</p>}
              </div>
            </li>
          ))}
        </ol>
        <p className={styles.note}>
          The plates are reproduced inside the catalogue’s scanned pages, not as separate
          images — which is exactly the gap the catalogue raisonné will close. Titles,
          media and dimensions for these particular works are recorded nowhere in the
          archive.{' '}
          <Link href="/life/retrospective/">Read the catalogue as scanned</Link>.
        </p>
      </section>

      <WorksOnPaper />
      <WhereThePaintingsWent />

      <div className={styles.meanwhile}>
        <p className="ui muted">
          In the meantime the archive documents{' '}
          <Link href="/exhibitions/">{counts.exhibitions} exhibitions</Link>,{' '}
          <Link href="/archive/press/">{counts.newsArticles} press notices</Link>, and{' '}
          <Link href="/life/interviews/">
            {counts.transcriptWords.toLocaleString()} words
          </Link>{' '}
          of recollection from the people who knew him.
        </p>
        <PullQuote quote={getQuote('solman-rehabilitation')} showSource />
      </div>
    </div>
  );
}
