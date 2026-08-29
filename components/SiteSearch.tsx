'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { highlightNeedles, normalize, scoreFields, tokenize } from '@/lib/search';
import { Highlight } from './Highlight';
import { useUrlState } from '@/lib/useUrlState';
import styles from './SiteSearch.module.css';

/**
 * One search across every record type in the archive.
 *
 * Progressive enhancement, the same bargain the other browsers make: the server
 * snapshot of the URL is empty, so the *complete* index prerenders as grouped,
 * linked HTML. Without JavaScript this page is a full table of contents for the
 * archive; with it, the same list narrows as you type. Nothing is only reachable
 * through the search box.
 */

export type SearchKind =
  | 'article' | 'object' | 'exhibition' | 'person' | 'publication' | 'interview'
  | 'transcript' | 'attested' | 'place';

export interface SearchRow {
  id: string;
  kind: SearchKind;
  title: string;
  /** Byline, venue, publication — whatever names the record's second dimension. */
  subtitle: string | null;
  /** Date or count, shown right-aligned. */
  meta: string | null;
  href: string;
  /** Lower-weight text: manifest lines, transcript paragraphs, aliases. */
  body: string | null;
}

const KIND_LABEL: Record<SearchKind, string> = {
  article: 'Press notices',
  interview: 'Interviews',
  transcript: 'Passages in interviews',
  exhibition: 'Exhibitions',
  object: 'Archive objects',
  person: 'People',
  publication: 'Publications',
  // Named on a sheet, not held. The label has to carry that on its own here,
  // because a search result arrives without the page's framing around it.
  attested: 'Paintings named on a sheet (not held)',
  place: 'Places',
};

/*
 * Records first, then the things records are about, then raw transcript text.
 * A kind missing from this array scores, matches and never renders — with no
 * error anywhere — so it must list every member of SearchKind.
 */
const KIND_ORDER: SearchKind[] = [
  'article', 'interview', 'transcript', 'exhibition', 'object', 'attested',
  'person', 'place', 'publication',
];

export function SiteSearch({ rows }: { rows: SearchRow[] }) {
  const { params, update } = useUrlState();
  const query = params.get('q') ?? '';
  // Scoring wants every word (AND); highlighting wants the phrase the reader typed.
  const tokens = useMemo(() => tokenize(query), [query]);
  const needles = useMemo(() => highlightNeedles(query), [query]);

  const scored = useMemo(() => {
    if (!tokens.length) return rows;
    return rows
      .map((r) => ({
        row: r,
        score: scoreFields(
          [
            { text: r.title, weight: 6 },
            { text: r.subtitle, weight: 4 },
            { text: r.meta, weight: 1 },
            { text: r.body, weight: 1 },
          ],
          tokens,
        ),
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.row);
  }, [rows, tokens]);

  const grouped = useMemo(() => {
    const by = new Map<SearchKind, SearchRow[]>();
    for (const r of scored) {
      const list = by.get(r.kind);
      if (list) list.push(r);
      else by.set(r.kind, [r]);
    }
    return KIND_ORDER.filter((k) => by.has(k)).map((k) => [k, by.get(k)!] as const);
  }, [scored]);

  return (
    <div>
      <div className={styles.box}>
        <label htmlFor="site-q" className={styles.label}>
          Search the archive
        </label>
        <input
          id="site-q"
          type="search"
          name="q"
          className={styles.input}
          placeholder="A name, a publication, a year, a phrase"
          defaultValue={query}
          onChange={(e) => update((p) => {
            const v = e.target.value;
            if (v) p.set('q', v);
            else p.delete('q');
          })}
        />
        <p className={styles.caveat}>
          Searches catalogue records and interview transcripts. The scanned clippings
          have no text layer, so the words printed inside them are not searchable.
        </p>
      </div>

      <p className={styles.count}>
        {query
          ? `${scored.length} ${scored.length === 1 ? 'result' : 'results'} for “${query}”`
          : `${rows.length} records. Type to narrow, or browse below.`}
      </p>

      {grouped.length === 0 && (
        <p className={styles.empty}>
          Nothing matches “{query}”. Every token has to appear somewhere in the record —
          try fewer words.
        </p>
      )}

      {grouped.map(([kind, list]) => (
        <section key={kind} className={styles.group}>
          <h2 className={styles.groupTitle}>
            {KIND_LABEL[kind]} <span className={styles.groupCount}>{list.length}</span>
          </h2>
          <ul className={styles.list}>
            {list.map((r) => (
              <li key={r.id} className={styles.row}>
                <Link href={r.href} className={styles.rowLink}>
                  <span className={styles.rowTitle}>
                    <Highlight text={r.title} tokens={needles} />
                  </span>
                  {r.subtitle && (
                    <span className={styles.rowSub}>
                      <Highlight text={r.subtitle} tokens={needles} />
                    </span>
                  )}
                  {r.meta && <span className={styles.rowMeta}>{r.meta}</span>}
                </Link>
                {r.kind === 'transcript' && r.body && (
                  <p className={styles.excerpt}>
                    <Highlight text={excerpt(r.body, needles)} tokens={needles} />
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * A window of the paragraph around the first hit, so a transcript result shows the
 * sentence you searched for rather than the paragraph's opening words.
 */
function excerpt(text: string, tokens: string[], radius = 130): string {
  if (!tokens.length) return text.length > 220 ? `${text.slice(0, 220)}…` : text;
  // Must match how the needles were built, or a phrase containing punctuation
  // never lines up and the excerpt silently falls back to the paragraph opening.
  const hay = normalize(text);
  let at = -1;
  for (const t of tokens) {
    const i = hay.indexOf(t);
    if (i !== -1 && (at === -1 || i < at)) at = i;
  }
  if (at === -1) return text.length > 220 ? `${text.slice(0, 220)}…` : text;
  const start = Math.max(0, at - radius);
  const end = Math.min(text.length, at + radius);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}
