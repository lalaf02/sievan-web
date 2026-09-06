import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  PERIODS, formatSpan, getPeriod, neighbours, pageForPeriod,
} from '@/lib/periods';
import { contentsForPeriod, coverFor, objectLead } from '@/lib/data';
import { PeriodSpine } from '@/components/PeriodSpine';
import { PeriodSource } from '@/components/PeriodSource';
import { CatalogueSource } from '@/components/CatalogueSource';
import { ImageSource } from '@/components/ImageSource';
import { CatalogueEntry, CatalogueEntryList } from '@/components/CatalogueEntry';
import { AttestedWorkList } from '@/components/AttestedWorkList';
import type { AttestedGroup } from '@/components/AttestedWorkList';
import { SheetTile } from '@/components/MediaTile';
import { Absent } from '@/components/Record';
import { PLATE_CREDIT } from '@/lib/provenance';
import { pageOf, attestationsForObject, getObject } from '@/lib/data';
import styles from './period.module.css';

/*
 * This route is COMMITTED, not generated like app/works/[paintingId]/.
 *
 * Its rows come from lib/periods.ts, a source file that ships in the repo, so it can
 * never enumerate to nothing — unlike the painting route, whose table is legitimately
 * empty. app/places/[placeId]/ is committed for the same reason. Do NOT "simplify"
 * the three into one shape: making this one generated would break Vercel, where
 * build-data.mjs exits early because DataModel/ is absent and would therefore never
 * write the route file at all, 404ing every /works/periods/ link.
 *
 * dynamicParams is declared here in the route file itself because Next 16 rejects a
 * re-exported one ("It mustn't be reexported").
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return PERIODS.map((p) => ({ periodId: p.id }));
}

type Props = { params: Promise<{ periodId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { periodId } = await params;
  const period = getPeriod(periodId);
  if (!period) return { title: 'Period not found' };
  return {
    title: `${period.name} (${formatSpan(period)})`,
    description:
      `${period.heading} — the period as the retrospective catalogue prints it, and `
      + 'everything in the Maurice Sievan archive dated into it.',
  };
}

/**
 * A section that states its own absence.
 *
 * Every period carries all four headings whether or not it has anything under them,
 * because "no gallery ever reproduced a work from these years" is a finding and a
 * silently omitted section is not.
 */
function EvidenceSection({
  title, count, absent, children,
}: {
  title: string;
  count: number;
  absent: string;
  children?: React.ReactNode;
}) {
  return (
    <section className={styles.evidence}>
      <h2 className={styles.evidenceTitle}>
        {title}
        <span className={`${styles.evidenceCount} tnum`}>{count === 0 ? 'none' : count}</span>
      </h2>
      {count === 0 ? <Absent title={absent} /> : children}
    </section>
  );
}

export default async function PeriodPage({ params }: Props) {
  const { periodId } = await params;
  const period = getPeriod(periodId);
  if (!period) notFound();

  const page = pageForPeriod(period);
  // The opening passage, verbatim, as the quotation. The rest of the page's text is in
  // the overlay — quoting the source is the point, reprinting it wholesale was not.
  const opening = page.text?.[0] ?? null;
  const { catalogueYears, plates, worksOnPaper, attested } = contentsForPeriod(period);
  const { previous, next } = neighbours(period);

  /*
   * Attested works are grouped by the sheet that names them, because the sheet is the
   * physical unit and the reader checking a claim wants it. `namedOnSheet` carries the
   * sheet's full count so a period showing one of six does not report the sheet as
   * naming one.
   */
  const groups: AttestedGroup[] = [...new Set(attested.map((w) => w.source_id))]
    .sort()
    .flatMap((sourceId) => {
      const object = getObject(sourceId);
      if (!object) return [];
      return [{
        object,
        cover: coverFor(object.id),
        lead: objectLead(object),
        works: attested.filter((w) => w.source_id === sourceId),
        namedOnSheet: attestationsForObject(object.id).length,
      }];
    });

  return (
    <div className="page">
      <header className="measure" style={{ marginBottom: 'var(--s-6)' }}>
        <Link href="/works/periods/" className={styles.back}>← The five periods</Link>
        <p className="eyebrow">Period {PERIODS.indexOf(period) + 1} of {PERIODS.length}</p>
        <h1>{period.name}</h1>
        {/* The catalogue's own heading, verbatim, above the archive's own range. */}
        <p className={styles.heading}>{period.heading}</p>
        <p className={`${styles.span} tnum`}>{formatSpan(period)}</p>
        <p className={styles.rationale}>{period.rationale}</p>
        <PeriodSource />
      </header>

      <PeriodSpine current={period.id} />

      {/*
        The typescript quoted, not installed as the narrator. This was headed "What the
        catalogue says" with the page's whole text printed beneath it, which made one
        undated working draft the voice of the archive. It now shows the opening
        passage as a quotation and opens the page itself in an overlay; the rest of the
        text is in there, where a reader who wants the source can consult it.

        The attribution names the document rather than Sievan. Who wrote this prose is
        not established anywhere in the archive — the object record reads "Sievan:
        Retrospective, (Lee Sievan?) with article 'A Lost Generation' Paul Waldo
        Schwartz" — so crediting him for it would be an invention.
      */}
      <figure className={styles.source}>
        <CatalogueSource page={page} className={styles.sourceMedia}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={page.image}
            alt={`Retrospective catalogue page ${page.page}: ${period.heading}`}
          />
          <span className={styles.sourceHint}>See the page</span>
        </CatalogueSource>
        <div>
          {opening && (
            <blockquote className={styles.sourceQuote}>
              <CatalogueSource page={page} className={styles.sourceQuoteLink}>
                “{opening}”
              </CatalogueSource>
            </blockquote>
          )}
          {page.caption && <p className={styles.sourceCaption}>{page.caption}</p>}
          <figcaption className={styles.sourceMeta}>
            From the retrospective typescript held in the archive, page {page.page} —{' '}
            <Link href="/archive/objects/MS-AR-00026/">the archive record</Link>, or{' '}
            <Link href="/life/retrospective/">the document in full</Link>.
          </figcaption>
        </div>
      </figure>

      <EvidenceSection
        title="Plates in the retrospective catalogue"
        count={catalogueYears.length}
        absent="No plate on this page."
      >
        <p className={styles.lede}>
          The catalogue reproduces {catalogueYears.length} painting
          {catalogueYears.length === 1 ? '' : 's'} on the page above, dated{' '}
          <span className="tnum">{catalogueYears.join(', ')}</span>. They cannot be
          separated into individual images: each exists only as part of the page it is
          printed on, photocopied inside a typescript carrying a note reading
          “way off color”. No title, medium or dimension is recorded
          anywhere in the archive for any of them — the year is all that is known.
        </p>
      </EvidenceSection>

      <EvidenceSection
        title="Reproduced by a gallery"
        count={plates.length}
        absent="No gallery reproduction survives from these years."
      >
        <ol className={styles.plateGrid}>
          {plates.map((p) => {
            const sheet = pageOf(p.objectId, p.page);
            if (!sheet) return null;
            return (
              <li key={`${p.objectId}-${p.page}`}>
                <SheetTile
                  sheet={sheet}
                  href={`/archive/objects/${p.objectId}/`}
                  aspect="4 / 5"
                  alt={`${p.title}, ${p.year}, by Maurice Sievan`}
                  caption={<><em>{p.title}</em>, {p.year}{p.detail ? `. ${p.detail}.` : ''}</>}
                  meta={`${p.source} · ${p.objectId}`}
                />
              </li>
            );
          })}
        </ol>
        <p className={styles.note}>{PLATE_CREDIT}</p>
      </EvidenceSection>

      <EvidenceSection
        title="Sheets the estate holds"
        count={worksOnPaper.length}
        absent="No sheet in the archive carries a date in these years."
      >
        <p className={styles.lede}>
          Catalogued works on paper, held by the estate.
        </p>
        <ImageSource />
        <CatalogueEntryList>
          {worksOnPaper.map((o) => <CatalogueEntry key={o.id} object={o} />)}
        </CatalogueEntryList>
      </EvidenceSection>

      <EvidenceSection
        title="Paintings named, not held"
        count={attested.length}
        absent="No painting Sievan named carries a date in these years."
      >
        <p className={styles.lede}>
          Paintings Sievan recorded on his own sheets and dated in his own hand. The
          archive holds the sheet, not the painting: this is evidence toward the
          catalogue of paintings and never an entry in it.
        </p>
        <AttestedWorkList groups={groups} />
      </EvidenceSection>

      {/* The chronological route: five pages you can walk end to end. */}
      <nav className={styles.walk} aria-label="Previous and next period">
        {previous
          ? (
            <Link href={`/works/periods/${previous.id}/`} className={styles.walkPrev}>
              <span className={styles.walkLabel}>← Previous period</span>
              <span className={styles.walkName}>{previous.name}</span>
              <span className={`${styles.walkSpan} tnum`}>{formatSpan(previous)}</span>
            </Link>
          )
          : (
            <p className={styles.walkEnd}>
              <span className={styles.walkLabel}>The first period</span>
              <span className={styles.walkName}>Nothing in the archive predates 1915.</span>
            </p>
          )}
        {next
          ? (
            <Link href={`/works/periods/${next.id}/`} className={styles.walkNext}>
              <span className={styles.walkLabel}>Next period →</span>
              <span className={styles.walkName}>{next.name}</span>
              <span className={`${styles.walkSpan} tnum`}>{formatSpan(next)}</span>
            </Link>
          )
          : (
            <p className={styles.walkEnd}>
              <span className={styles.walkLabel}>The last period</span>
              <span className={styles.walkName}>Sievan died in 1981.</span>
            </p>
          )}
      </nav>
    </div>
  );
}
