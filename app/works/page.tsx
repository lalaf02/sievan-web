import type { Metadata } from 'next';
import Link from 'next/link';
import {
  allPaintings, artworkDatingCoverage, attestationsForObject, catalogueWorksOnPaper,
  contentsForPeriod, counts, pageOf,
} from '@/lib/data';
import type { ScanPage } from '@/lib/types';
import { SheetTile } from '@/components/MediaTile';
import { WorksBrowser } from '@/components/WorksBrowser';
import { CatalogueEntry, CatalogueEntryList } from '@/components/CatalogueEntry';
import { ImageSource } from '@/components/ImageSource';
import { PeriodSpine } from '@/components/PeriodSpine';
import { PeriodSource } from '@/components/PeriodSource';
import { PERIODS, pageForPeriod } from '@/lib/periods';
import { PLATES } from '@/lib/plates';
import { PLATE_CREDIT } from '@/lib/provenance';
import { Pending } from '@/components/Pending';
import { CONTACT, mailtoHref } from '@/lib/contact';
import styles from './works.module.css';

export const metadata: Metadata = {
  title: 'Catalogue Raisonné',
  description:
    'Maurice Sievan’s work, ordered by the five periods of his career: 25 works on '
    + 'paper catalogued in full and photographed by the estate, the reproductions '
    + 'printed by his galleries, and 57 more canvases he named himself.',
};

/**
 * The five periods.
 *
 * These cards used to lead with a full scan of the catalogue page each period is
 * printed on — five book pages, stacked, immediately under the spine. It was the
 * largest thing on a page about paintings, and none of it was a painting. The page
 * images now appear where they belong: one, in context, on each period page, and all
 * fifteen on /life/retrospective/.
 */
function Periods() {
  return (
    <ol className={styles.periods}>
      {PERIODS.map((period) => {
        const page = pageForPeriod(period);
        const { plates: galleryPlates, worksOnPaper, attested } = contentsForPeriod(period);
        return (
          <li key={period.id} className={styles.period}>
            <h3 className={styles.periodTitle}>
              <Link href={`/works/periods/${period.id}/`}>{period.name}</Link>
            </h3>
            {/*
              The catalogue's own heading, verbatim. The archive's year range is NOT
              repeated here: the spine states it directly above, and printing it a
              second time within an inch of the first was the page arguing with itself.
            */}
            <p className={styles.periodHeading}>{period.heading}</p>
            {/*
              Four counts, never one sum: a plate the catalogue printed, a plate a
              gallery printed, a sheet the estate holds and a painting Sievan named are
              four different strengths of evidence. Same rule as contentsForPeriod.
            */}
            <p className={styles.periodText}>
              {page.plateYears.length} plate
              {page.plateYears.length === 1 ? '' : 's'}
              {galleryPlates.length > 0 && `, ${galleryPlates.length} gallery reproduction${galleryPlates.length === 1 ? '' : 's'}`}
              {worksOnPaper.length > 0 && `, ${worksOnPaper.length} sheet${worksOnPaper.length === 1 ? '' : 's'} held`}
              {attested.length > 0 && `, ${attested.length} painting${attested.length === 1 ? '' : 's'} named`}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The works the estate physically holds.
 *
 * Eight entries, not twenty-five. This was five medium-headed groups and a very long
 * scroll, which is the section the estate asked to reconsider: medium is a property to
 * filter by, not a reason to make somebody scroll past twenty-four sheets to reach the
 * twenty-fifth. The selection rule is stated and derivable — the sheets that record the
 * most paintings — rather than a curator's pick presented as one, and all twenty-five
 * are one link away in the browser, where medium IS a filter.
 */
function WorksOnPaper() {
  const all = catalogueWorksOnPaper();
  if (!all.length) return null;

  const featured = [...all]
    .sort((a, b) =>
      attestationsForObject(b.id).length - attestationsForObject(a.id).length
      || a.id.localeCompare(b.id))
    .slice(0, 8);

  return (
    <section className={styles.section} id="works-on-paper">
      <h2>The sheets in his own hand</h2>
      <p className={styles.lede}>
        {counts.worksOnPaperCatalogued} entries across {counts.worksOnPaperSheets} sheets,
        held by the estate and photographed from the originals in its care. These are the
        works by Sievan the archive holds in its own hands.
      </p>
      <p className={styles.lede}>
        Twenty-four of them are drawings <em>of</em> paintings. Sievan sketched a canvas he
        had finished and wrote its title, size, medium and asking price beside it, sometimes
        where it went. That documentary purpose is not incidental to what these sheets are —
        it is what they are for, and it is why each entry is headed by the paintings it
        records rather than by a title it does not have. The twenty-fifth, a graphite
        landscape on the back of an envelope, records nothing but itself, and is the only
        one of them that carries a date.
      </p>
      <ImageSource />
      <p className={styles.note}>
        <strong>What these entries do not carry.</strong> None has a title — Sievan gave the
        sheets none, and the archive does not supply one. None has been measured.
        Twenty-four of the twenty-five are undated. Where a line is missing below, the
        record is missing, not the page.
      </p>

      <h3 className={styles.subhead}>
        The eight sheets that record the most paintings
      </h3>
      <CatalogueEntryList>
        {featured.map((o) => <CatalogueEntry key={o.id} object={o} />)}
      </CatalogueEntryList>

      <p className={styles.note}>
        <Link href="/works/search/?evidence=held">
          All {counts.worksOnPaperCatalogued} sheets, filterable by medium →
        </Link>
      </p>
    </section>
  );
}

/**
 * The paintings as other people reproduced them.
 *
 * Scoped deliberately narrowly. This section used to open by declaring that no
 * photograph of a Sievan painting existed in this archive and that every image it held
 * had been printed inside somebody else's catalogue — which was false: the estate
 * photographs its own holdings, and does so as their restorer. What is true, and is all
 * this section now claims, is that these sixteen particular reproductions are other
 * people's work rather than the estate's.
 */
function Reproductions() {
  const plates = PLATES
    .map((p) => ({ ...p, sheet: pageOf(p.objectId, p.page) }))
    .filter((p): p is typeof p & { sheet: ScanPage } => !!p.sheet);
  const platesKnown = PERIODS.reduce((n, p) => n + pageForPeriod(p).plateYears.length, 0);

  return (
    <section className={styles.section} id="paintings">
      <h2>The paintings, in other hands’ reproductions</h2>
      <p className={styles.lede}>
        {plates.length + platesKnown} paintings survive here as reproductions made by
        other people: {plates.length} as plates in their own right, printed by the
        galleries that showed the work, and {platesKnown} inside the pages of the
        retrospective typescript, where they cannot be lifted out of the page. Unlike
        everything else on this page, these images are not the estate’s own photography,
        and they carry other people’s descriptions with them.
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
        {PLATE_CREDIT} The Salpeter catalogue is undated on its face: the archive records
        it as 1957, its checklist reads “April 16 — May 5” with{' '}
        <span className="tnum">1951</span> pencilled at the foot, so no year is given for{' '}
        <em>Provincetown Harbor</em> until that is resolved.
      </p>

      <p className={styles.note}>
        The other {platesKnown} are photographs of paintings reproduced on a photocopier
        inside a fifteen-page typescript, so the colour is unreliable throughout — one
        page carries a pasted note reading <em>“This page is way off color.”</em> They
        cannot be separated into individual images: each exists only as part of the page
        it is printed on. Titles, media and dimensions for those particular works are
        recorded nowhere in the archive; the years beside them are all that is known.
        They are shown on{' '}
        <Link href="/works/periods/">the five period pages</Link>, and the document
        itself is published in full as{' '}
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
      <header className="measure" style={{ marginBottom: 'var(--s-5)' }}>
        <h1>Catalogue Raisonné</h1>
        {/*
          The page used to open on its own denominator — "26 of the archive's 98
          artwork records carry a year" — which introduced Sievan's work as a
          completeness statistic. The denominator still has to be stated, because five
          period cards read as a mapped career otherwise; it now sits under the spine,
          where it explains the sparseness a reader is actually looking at, and in full
          on /works/search/.
        */}
        <p className={styles.lede}>
          Sievan kept the figure when New York gave it up, and painted the same few
          subjects for fifty years — the harbour, the suburbs, the studio. The work
          divides into the five periods his retrospective catalogue names, and the
          archive can place a work in one only where the work states its own year.
        </p>
        <p className={styles.findLink}>
          <Link href="/works/search/">Looking for a particular work? Search the catalogue →</Link>
        </p>
      </header>

      <PeriodSpine />
      <Periods />
      <PeriodSource />
      <p className={styles.note} style={{ marginTop: 'var(--s-4)' }}>
        The marks on the rail above are every work the archive can date:{' '}
        <span className="tnum">{coverage.dated}</span> of{' '}
        <span className="tnum">{coverage.total}</span> artwork records state a year, and
        the other <span className="tnum">{coverage.undated}</span> state none — so the
        career is not mapped, and the rail is honest about how much of it is missing.
        Undated work is reached by medium, place or size in{' '}
        <Link href="/works/search/">the catalogue browser</Link>. Each period is itself a
        page of the retrospective typescript held in the archive —{' '}
        <Link href="/works/periods/">the five periods, end to end</Link>.
      </p>

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

      <WorksOnPaper />
      <Reproductions />
      <AttestedSummary />

      <section className={styles.section} id="the-catalogue-of-paintings">
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
          title="No finished painting has yet been photographed, measured and located."
          fields={[
            { name: 'Title', note: 'As the estate records it; “Untitled” where there is none.' },
            { name: 'Date', note: 'Year, or the range the evidence supports.' },
            { name: 'Medium', note: 'Oil on canvas, oil on panel, works on paper.' },
            { name: 'Dimensions', note: 'Height × width, so the catalogue can be viewed at true relative scale.' },
            { name: 'Current location', note: 'Museum, private collection, or the estate.' },
            { name: 'Image', note: 'A photograph of the canvas itself, made by the estate as the works are treated.' },
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
            The works on paper above are catalogued and photographed. The paintings are
            not yet: the estate is photographing and cataloguing them as the works are
            treated, and each will be published here as its image arrives. Until then the
            reproductions above stand in for them, and a reproduction is not a record —
            it gives no provenance, no condition, no present whereabouts, and in thirteen
            cases no title.
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
