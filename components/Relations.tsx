/**
 * The painting-centred relational layer.
 *
 * All four join tables are empty today. Each component returns null on empty
 * input, so nothing appears anywhere on the site until real rows exist — no
 * scattered "nothing here yet" panels, which would only teach a visitor that the
 * site is unfinished. The thesis these tables encode is stated once, on
 * /about/method, as an argument rather than an apology.
 *
 * When seed_commentary.json and friends fill, these light up with no other change.
 */
import Link from 'next/link';
import { archive, getArticle, getExhibition, getPerson, getVideo, articleTitle } from '@/lib/data';
import type { HistoricalEvent } from '@/lib/types';
import { RecordList, Section } from './Record';

export function ShownInSection({ paintingId }: { paintingId: string }) {
  const links = archive.paintingExhibitions.filter((x) => x.painting_id === paintingId);
  if (!links.length) return null;

  return (
    <Section title="Exhibited in">
      <RecordList>
        {links.map((link) => {
          const e = getExhibition(link.exhibition_id);
          if (!e) return null;
          return (
            <li key={link.id}>
              <Link href={`/exhibitions/${e.id}/`}>{e.name ?? e.gallery_or_venue}</Link>{' '}
              <span className="ui faint">{e.date_earliest}</span>
            </li>
          );
        })}
      </RecordList>
    </Section>
  );
}

export function CommentarySection({ paintingId }: { paintingId: string }) {
  const rows = archive.commentary.filter((c) => c.painting_ids.includes(paintingId));
  if (!rows.length) return null;

  return (
    <Section title="What was said">
      <RecordList>
        {rows.map((c) => {
          const person = getPerson(c.commentator_person_id);
          const href =
            c.source_type === 'news_article'
              ? `/archive/press/${c.source_id}/`
              : `/life/interviews/${c.source_id}/`;
          const sourceLabel =
            c.source_type === 'news_article'
              ? (() => {
                  const a = getArticle(c.source_id);
                  return a ? articleTitle(a) : c.source_id;
                })()
              : getVideo(c.source_id)?.title ?? c.source_id;

          return (
            <li key={c.id}>
              {c.excerpt && <blockquote style={{ margin: '0 0 var(--s-2)' }}>{c.excerpt}</blockquote>}
              <span className="ui faint">
                {person && (
                  <>
                    <Link href={`/people/${person.id}/`}>{person.name}</Link>
                    {' · '}
                  </>
                )}
                <Link href={href}>{sourceLabel}</Link>
              </span>
            </li>
          );
        })}
      </RecordList>
    </Section>
  );
}

export function HistoricalContextSection({ paintingId }: { paintingId: string }) {
  const rows = archive.paintingHistoricalContext.filter((x) => x.painting_id === paintingId);
  if (!rows.length) return null;

  const shaped = rows.filter((r) => r.direction === 'event_shaped_painting');
  const changed = rows.filter((r) => r.direction === 'painting_shaped_event_or_society');
  const events: Record<string, HistoricalEvent> = Object.fromEntries(
    archive.historicalEvents.map((e) => [e.id, e] as const)
  );

  return (
    <>
      {shaped.length > 0 && (
        <Section title="Its time">
          <RecordList>
            {shaped.map((r) => (
              <li key={r.id}>
                <strong>{events[r.historical_event_id]?.title}</strong>
                {r.description && <> — {r.description}</>}
                <br />
                <span className="ui faint">{r.confidence}</span>
              </li>
            ))}
          </RecordList>
        </Section>
      )}
      {changed.length > 0 && (
        <Section title="Its effect">
          <RecordList>
            {changed.map((r) => (
              <li key={r.id}>
                <strong>{events[r.historical_event_id]?.title}</strong>
                {r.description && <> — {r.description}</>}
                <br />
                <span className="ui faint">{r.confidence}</span>
              </li>
            ))}
          </RecordList>
        </Section>
      )}
    </>
  );
}
