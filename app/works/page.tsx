import type { Metadata } from 'next';
import Link from 'next/link';
import {
  allPaintings, artworkDatingCoverage, contentsForPeriod, counts, pageOf,
  worksOnPaperByMedium,
} from '@/lib/data';
import type { ScanPage } from '@/lib/types';
import { SheetTile } from '@/components/MediaTile';
import { WorksBrowser } from '@/components/WorksBrowser';
import { CatalogueEntry, CatalogueEntryList } from '@/components/CatalogueEntry';
import { PERIODS, formatSpan, pageForPeriod } from '@/lib/periods';
import { PLATES } from '@/lib/plates';
import { Pending } from '@/components/Pending';
import { CONTACT, mailtoHref } from '@/lib/contact';
import styles from './works.module.css';

export const metadata: Metadata = {
  title: 'Catalogue Raisonné',
  description:
    'Everything the estate holds of Maurice Sievan’s work and everything the record '
    + 'names: 25 works on paper catalogued in full, every surviving reproduction of '
    + 'the paintings, and 57 more canvases he named himself.',
};

/**
 * The catalogue proper: the works the estate physically holds.
 *
 * Rendered in BOTH branches below. When the painting catalogue opens these do not
 * stop being works, and dropping them would delete the archive's account of its own
 * holdings on the day the first photograph arrives.
 */
function WorksOnPaper() {
  const groups = worksOnPaperByMedium();
  if (!groups.length) return null;

  return (
    <section className={styles.section} id="works-on-paper">
      <h2>Works on paper</h2>
      <p className={styles.lede}>
        {counts.worksOnPaperCatalogued} entries, {counts.worksOnPaperSheets} sheets, held
        by the estate in box <Link href="/archive/">MS-CS-002</Link>. These are the only
        works by Sievan the archive physically holds.
      </p>
      <p className={styles.lede}>
        Twenty-four of them are drawings <em>of</em> paintings. Sievan sketched a canvas he
        had finished and wrote its title, size, medium and asking price beside it, sometimes
        where it went. That documentary purpose is not incidental to what these sheets are —
        it is what they are for, and it is why each entry is headed by the paintings it
        records rather than by a title it does not have. The twenty-fifth, a graphite
        landscape on the back of an envelope, records nothing but itself, and is the only
        sheet in the box that carries a date.
      </p>
      <p className={styles.note}>
        <strong>What these entries do not carry.</strong> None has a title — Sievan gave the
        sheets none, and the archive does not supply one. None has been measured.
        Twenty-four of the twenty-five are undated. Where a line is missing below, the
        record is missing, not the page. A catalogue raisonné is normally ordered by year;
        this one cannot be, so it is ordered by medium. The artwork that{' '}
        <em>does</em> carry a year is ordered by year, in{' '}
        <Link href="/works/periods/">the five periods</Link>.
      </p>

      {groups.map(({ medium, works }) => (
        <div key={medium} className={styles.mediumGroup}>
          <h3 className={styles.mediumName}>
            {medium}
            <span className={styles.mediumCount}>{works.length}</span>
          </h3>
          <CatalogueEntryList>
            {works.map((o) => <CatalogueEntry key={o.id} object={o} />)}
          </CatalogueEntryList>
        </div>
      ))}
    </section>
  );
}

/** The paintings, as they survive — in other people's catalogues. */
function Reproductions() {
  const plates = PLATES
    .map((p) => ({ ...p, sheet: pageOf(p.objectId, p.page) }))
    .filter((p): p is typeof p & { sheet: ScanPage } => !!p.sheet);
  const platesKnown = PERIODS.reduce((n, p) => n + pageForPeriod(p).plateYears.length, 0);

  return (
    <section className={styles.section} id="paintings">
      <h2>The paintings, as they survive in reproduction</h2>
      <p className={styles.lede}>
        No photograph of a Sievan painting exists in this archive. What survives instead is{' '}
        {plates.length + platesKnown} reproductions, made by galleries who had the work in
        front of them: {plates.length} are plates in their own right, and the other{' '}
        {platesKnown} are printed inside the pages of a single retrospective catalogue,
        where they cannot be lifted out of the page.
      </p>

      <ol className={styles.plateGrid}>
        {plates.map((p) => (
          <li key={`${p.objectId}-${p.page}`}>
            <SheetTile
              sheet={p.sheet}
              href={`/archive/objects/${p.objectId}/`}
              aspect="4 / 5"
              alt={`${p.title}${p.year ? `, ${p.year}` : ''}, by Maurice Sievan`}
              caption={
                <>
                  <em>{p.title}</em>{p.year ? `, ${p.year}` : ''}
                  {p.detail ? `. ${p.detail}.` : ''}
                </>
              }
              meta={`${p.source} · ${p.objectId}`}
            />
          </li>
        ))}
      </ol>
      <p className={styles.note}>
        Titles, dates, media and sizes here are the galleries’ own, printed beneath the
        plate — not the estate’s, and not verified against the canvas. The Salpeter
        catalogue is undated on its face: the archive records it as 1957, its checklist
        reads “April 16 — May 5” with <span className="tnum">1951</span> pencilled at the
        foot, so no year is given for <em>Provincetown Harbor</em> until that is resolved.
      </p>

      <h3 className={styles.subhead}>
        Inside the retrospective catalogue
        <span className={styles.subheadCount}>{platesKnown}</span>
      </h3>
      <p className={styles.lede}>
        The catalogue divides Sievan’s career into five periods and prints these plates
        across them. Each period below is a page of that document, and a route into
        everything else the archive dates into those years —{' '}
        <Link href="/works/periods/">the five periods, end to end</Link>.
      </p>
      <ol className={styles.periods}>
        {PERIODS.map((period) => {
          const page = pageForPeriod(period);
          const { plates: galleryPlates, worksOnPaper, attested } = contentsForPeriod(period);
          const href = `/works/periods/${period.id}/`;
          return (
            <li key={period.id} className={styles.period}>
              {/* The catalogue page, which is the only form these plates exist in. */}
              <Link href={href} className={styles.periodMedia}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={page.image}
                  alt={`Retrospective catalogue page ${page.page}: ${period.heading}`}
                  loading="lazy"
                  decoding="async"
                />
              </Link>
              <div className={styles.periodBody}>
                <h4 className={styles.periodTitle}>
                  <Link href={href}>{period.name}</Link>
                </h4>
                {/* The catalogue's own heading, verbatim; the archive's span beneath. */}
                <p className={styles.periodHeading}>{period.heading}</p>
                <p className={styles.plateYears}>
                  <span className="tnum">{formatSpan(period)}</span>
                </p>
                <p className={styles.periodText}>
                  {page.plateYears.length} plate
                  {page.plateYears.length === 1 ? '' : 's'}
                  {galleryPlates.length > 0 && `, ${galleryPlates.length} gallery reproduction${galleryPlates.length === 1 ? '' : 's'}`}
                  {worksOnPaper.length > 0 && `, ${worksOnPaper.length} sheet${worksOnPaper.length === 1 ? '' : 's'} held`}
                  {attested.length > 0 && `, ${attested.length} painting${attested.length === 1 ? '' : 's'} named`}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <p className={styles.note}>
        These are photographs of paintings reproduced on a photocopier inside a fifteen-page
        typescript, so the colour is unreliable throughout — one page carries Sievan’s own
        pasted note, <em>“This page is way off color.”</em> They cannot be separated into
        individual images: each plate exists only as part of the page it is printed on, which
        is exactly the gap this catalogue will close. Titles, media and dimensions for these
        particular works are recorded nowhere in the archive; the years beside them are all
        that is known. The document itself is published in full as{' '}
        <Link href="/life/retrospective/">the retrospective catalogue</Link>.
      </p>
    </section>
  );
}

/** The 57 paintings the sheets name but the archive does not hold. */
function AttestedSummary() {
  return (
    <section className={styles.section}>
      <h2>Paintings Sievan recorded, that the archive does not hold</h2>
      <p className={styles.lede}>
        Read across the drawings above, Sievan’s annotations name{' '}
        <strong>{counts.attestedWorks} further paintings</strong> —{' '}
        {counts.attestedWorksWithDimensions} of them with a size,{' '}
        {counts.attestedWorksWithPrice} with a price — that exist nowhere else in the
        record. Nobody has seen them. They are the strongest evidence the archive has
        toward the catalogue of paintings, and they are not that catalogue: a sketch
        records a painting, it does not establish one.
      </p>
      <p className={styles.note}>
        <Link href="/works/attested/">
          Read all {counts.attestedWorks}, each beside the words that name it
        </Link>{' '}
        — or see where they went, in the{' '}
        <Link href="/places/">gazetteer of {counts.places} places</Link>.
      </p>
    </section>
  );
}

export default function WorksPage() {
  const paintings = allPaintings;
  const coverage = artworkDatingCoverage();

  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)' }}>
      <header className="measure" style={{ marginBottom: 'var(--s-6)' }}>
        <h1>Catalogue Raisonné</h1>
        <p className={styles.lede}>
          Everything the estate holds of the work itself, and everything the record names.{' '}
          <strong>
            {counts.worksOnPaperCatalogued} works on paper are catalogued here in full.
          </strong>{' '}
          The paintings are not: none has been photographed, measured or located. Every
          image of a Sievan painting this archive contains is on this page — every one of
          them printed inside somebody else’s catalogue.
        </p>
        <p className={styles.lede}>
          Where a field is empty below, the record is empty. Nothing here is estimated.
        </p>
        {/*
          The chronological way in. Stated with its denominator, because five period
          pages read as a mapped career unless the page says how little is dated.
        */}
        <p className={styles.lede}>
          The retrospective catalogue divides the career into{' '}
          <Link href="/works/periods/">five periods</Link>. They order the{' '}
          <span className="tnum">{coverage.dated}</span> artwork records that carry a
          year; the other <span className="tnum">{coverage.undated}</span> carry none.
        </p>
      </header>

      {/*
        The browser is fully built and turns on with no code change when
        seed_paintings.json has rows — but see the note on the Pending panel first:
        filling that table also requires flipping app/works/[paintingId]/ from
        generated-and-gitignored to committed, or the Vercel deploy 404s.
      */}
      {paintings.length > 0 && (
        <section className={styles.section}>
          <h2>Paintings</h2>
          <p className={styles.lede}>
            {paintings.length} works. Each carries what is known about it — date, medium,
            dimensions, where it is now — and links to everything the archive holds about it.
          </p>
          <WorksBrowser paintings={paintings} />
        </section>
      )}

      <Reproductions />
      <WorksOnPaper />
      <AttestedSummary />

      <section className={styles.section}>
        <h2>The catalogue of paintings</h2>
        {/*
          Do NOT fill seed_paintings.json to "turn the catalogue on".
          app/works/[paintingId]/ is written by build-data.mjs and gitignored, and
          build-data.mjs exits early on Vercel because DataModel/ is absent — so the
          route would never be written there and every /works/MS-PA-…/ link would
          404, failing check-export. Flipping it to committed, as
          app/places/[placeId]/ and app/works/periods/[periodId]/ already are, is a
          separate change.
        */}
        <Pending
          eyebrow="The gap this catalogue still has"
          title="Not one painting has been photographed, measured or located."
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
            The works on paper above are catalogued. The paintings are not, and the reason is
            simple: nobody has photographed them. The reproductions above are all the
            images this archive holds, and a reproduction is not a record — it
            gives no provenance, no condition, no present whereabouts, and in thirteen cases
            no title.
          </p>
          <p>
            When the entries land, each will also carry what was written and said about it:
            the press notices, the exhibitions it hung in, and the passages of interview that
            discuss it. Those connections are already built and waiting on rows.
          </p>
        </Pending>
      </section>
    </div>
  );
}
