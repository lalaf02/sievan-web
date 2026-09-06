import Link from 'next/link';
import { archive } from '@/lib/data';
import type { TimelineEvent, TimelineKind } from '@/lib/types';
import styles from './RelatedSection.module.css';

/**
 * "What else is near this record."
 *
 * The archive has no topic vocabulary — `VideoAsset.topics` is empty on every
 * video and there are no subject tags anywhere — so this cannot offer *related by
 * subject*, and does not pretend to. What it can prove is proximity: the same year,
 * the same publication, the same byline, the same sheet of paper.
 *
 * Each group is therefore labelled by the relation that produced it rather than by
 * a vague "related". A reader can tell at a glance whether two things are connected
 * by evidence or merely by a date, which is the distinction the whole archive turns
 * on.
 */

const KIND_LABEL: Record<TimelineKind, string> = {
  article: 'Press notice',
  exhibition: 'Exhibition',
  object: 'Object',
  painting: 'Work',
  attestation: 'Work recorded on a sheet',
  video: 'Interview',
  event: 'Event',
};

/**
 * Everything else the archive can date to the same year.
 *
 * `exclude` must carry every id already shown on the page, not just the record's
 * own — the sibling clippings from the same photocopy sheet are listed directly
 * above this on an article page, and repeating them here makes the section look
 * padded and buries the entries the reader has not already seen.
 */
export function SameYearSection({
  year, exclude, limit = 12,
}: {
  year: number | null;
  exclude: string | string[];
  limit?: number;
}) {
  if (year == null) return null;

  const skip = new Set(Array.isArray(exclude) ? exclude : [exclude]);
  const matches = archive.derived.timeline.filter((e) => e.year === year && !skip.has(e.id));
  if (!matches.length) return null;

  const events = matches.slice(0, limit);
  const total = matches.length;

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>
        Elsewhere in <span className="tnum">{year}</span>
        <span className={styles.count}>{total}</span>
      </h2>
      <ul className={styles.list}>
        {events.map((e) => (
          <Row key={`${e.kind}-${e.id}`} event={e} />
        ))}
      </ul>
      {total > events.length && (
        <p className={styles.more}>
          <Link href={`/life/#chronology`}>
            See all {total} in the chronology
          </Link>
        </p>
      )}
    </section>
  );
}

function Row({ event }: { event: TimelineEvent }) {
  return (
    <li className={styles.row}>
      <Link href={event.href} className={styles.rowLink}>
        <span className={styles.kind}>{KIND_LABEL[event.kind]}</span>
        <span className={styles.rowTitle}>{event.title}</span>
        {event.subtitle && event.subtitle !== event.title && (
          <span className={styles.rowSub}>{event.subtitle}</span>
        )}
      </Link>
    </li>
  );
}

/**
 * The exhibitions a notice appears to review, and vice versa.
 *
 * These edges are inferred (year + a distinctive venue token in the clipping's own
 * text), so the matched token is shown. Nothing in the source data records this
 * relationship, and stating it without showing the working would be asserting more
 * than the archive knows.
 */
export function LikelyReviewsSection({ articleId }: { articleId: string }) {
  const links = archive.derived.exhibitionsByArticle[articleId] ?? [];
  if (!links.length) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Probably reviews</h2>
      <ul className={styles.list}>
        {links.map(({ exhibitionId }) => {
          const e = archive.exhibitions.find((x) => x.id === exhibitionId);
          if (!e) return null;
          const title = e.name ?? e.gallery_or_venue;
          const where = [e.gallery_or_venue, e.venue_city].filter(Boolean).join(', ');
          return (
            <li key={exhibitionId} className={styles.row}>
              <Link href={`/exhibitions/${exhibitionId}/`} className={styles.rowLink}>
                <span className={styles.kind}>Exhibition</span>
                <span className={styles.rowTitle}>{title}</span>
                {where !== title && <span className={styles.rowSub}>{where}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
      <p className={styles.inferred}>
        Inferred, not recorded: the notice is dated to the exhibition’s year and names
        the venue ({[...new Set(links.map((l) => l.matchedAs))].map((t) => `“${t}”`).join(', ')}).
        No source in the archive states the connection.
      </p>
    </section>
  );
}

export function PressForExhibitionSection({ exhibitionId }: { exhibitionId: string }) {
  const links = archive.derived.articlesByExhibition[exhibitionId] ?? [];
  if (!links.length) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>
        Notices that probably cover this show
        <span className={styles.count}>{links.length}</span>
      </h2>
      <ul className={styles.list}>
        {links.map(({ articleId }) => {
          const a = archive.newsArticles.find((x) => x.id === articleId);
          if (!a) return null;
          return (
            <li key={articleId} className={styles.row}>
              <Link href={`/archive/press/${articleId}/`} className={styles.rowLink}>
                <span className={styles.kind}>Press notice</span>
                <span className={styles.rowTitle}>
                  {a.headline ?? a.publication_raw ?? articleId}
                </span>
                <span className={styles.rowSub}>
                  {[a.publication_raw, a.date_text].filter(Boolean).join(' · ')}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className={styles.inferred}>
        Inferred, not recorded: each notice is dated to this exhibition’s year and names
        the venue. The archive holds no record linking a review to a show.
      </p>
    </section>
  );
}
