'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useUrlState } from '@/lib/useUrlState';
import { Highlight } from './Highlight';
import { scoreFields, tokenize } from '@/lib/search';
import { formatArticleDate } from '@/lib/dates';
import styles from './PressBrowser.module.css';

/** Flattened at build time so the client bundle carries no lookup maps. */
export interface PressRow {
  id: string;
  objectId: string;
  headline: string | null;
  raw: string;
  publicationId: string | null;
  publicationName: string | null;
  authorId: string | null;
  authorName: string | null;
  /** Byline present in the source but only as initials — a research lead, not a gap. */
  initialsOnly: boolean;
  year: number | null;
  dateNormalized: string | null;
  dateText: string | null;
  dateUncertain: boolean;
  objectType: string;
  hasScan: boolean;
}

export interface FacetOption { id: string; label: string; count: number }

const SORTS = {
  'date-desc': 'Date, newest first',
  'date-asc': 'Date, oldest first',
  publication: 'Publication A–Z',
} as const;
type SortKey = keyof typeof SORTS;

export function PressBrowser({
  rows, decades, publications, authors,
}: {
  rows: PressRow[];
  decades: FacetOption[];
  publications: FacetOption[];
  authors: FacetOption[];
}) {
  const [showAllPubs, setShowAllPubs] = useState(false);

  // Filters live in the URL so a filtered view is shareable and citable, while the
  // unfiltered list still prerenders into static HTML. See lib/useUrlState.
  const { params, update, toggle, clear } = useUrlState();

  const q = params.get('q') ?? '';
  const selDecades = params.getAll('decade');
  const selPubs = params.getAll('pub');
  const selAuthors = params.getAll('author');
  const scanOnly = params.get('scan') === '1';
  const sort = (params.get('sort') as SortKey) ?? 'date-desc';

  const tokens = useMemo(() => tokenize(q), [q]);

  const results = useMemo(() => {
    const scored = rows
      .map((r) => {
        if (selDecades.length && !selDecades.includes(String(Math.floor((r.year ?? 0) / 10) * 10))) return null;
        if (selPubs.length && (!r.publicationId || !selPubs.includes(r.publicationId))) return null;
        if (selAuthors.length) {
          const key = r.authorId ?? (r.initialsOnly ? '__initials__' : '__unattributed__');
          if (!selAuthors.includes(key)) return null;
        }
        if (scanOnly && !r.hasScan) return null;

        const score = scoreFields(
          [
            { text: r.headline, weight: 6 },
            { text: r.publicationName, weight: 4 },
            { text: r.authorName, weight: 4 },
            { text: r.raw, weight: 1 },
          ],
          tokens,
        );
        return score > 0 ? { row: r, score } : null;
      })
      .filter((x): x is { row: PressRow; score: number } => x !== null);

    scored.sort((a, b) => {
      if (tokens.length && b.score !== a.score) return b.score - a.score;
      if (sort === 'publication') {
        return (a.row.publicationName ?? '').localeCompare(b.row.publicationName ?? '');
      }
      const ay = a.row.year ?? 0;
      const by = b.row.year ?? 0;
      if (ay !== by) return sort === 'date-asc' ? ay - by : by - ay;
      return (a.row.dateNormalized ?? '').localeCompare(b.row.dateNormalized ?? '');
    });
    return scored.map((s) => s.row);
  }, [rows, tokens, selDecades, selPubs, selAuthors, scanOnly, sort]);

  const anyFilter =
    q || selDecades.length || selPubs.length || selAuthors.length || scanOnly;

  // 24 publications have exactly one article; the long tail is collapsed by default.
  const pubsShown = showAllPubs ? publications : publications.filter((p) => p.count > 1);
  const hiddenPubs = publications.length - pubsShown.length;

  return (
    <div className="railLayout">
      <aside className="rail" aria-label="Filters">
        <div className={styles.searchWrap}>
          <label htmlFor="press-q" className={styles.groupTitle}>Search</label>
          <input
            id="press-q"
            type="search"
            className={styles.search}
            placeholder="Headline, critic, publication…"
            defaultValue={q}
            onChange={(e) => update((p) => {
              const v = e.target.value;
              if (v) p.set('q', v); else p.delete('q');
            })}
          />
          <p className={styles.searchCaveat}>
            Searches the catalogue record, not the text of the clippings themselves.
          </p>
        </div>

        <div className={styles.group}>
          <p className={styles.groupTitle}>Decade</p>
          <div className={styles.chips}>
            {decades.map((d) => (
              <button
                key={d.id}
                type="button"
                className={`${styles.chip} ${selDecades.includes(d.id) ? styles.chipOn : ''}`}
                aria-pressed={selDecades.includes(d.id)}
                onClick={() => toggle('decade', d.id)}
              >
                {d.label}<span className={styles.chipCount}>{d.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.group}>
          <p className={styles.groupTitle}>Publication</p>
          <ul className={styles.checkList}>
            {pubsShown.map((p) => (
              <li key={p.id}>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={selPubs.includes(p.id)}
                    onChange={() => toggle('pub', p.id)}
                  />
                  <span>{p.label}</span>
                  <span className={styles.checkCount}>{p.count}</span>
                </label>
              </li>
            ))}
          </ul>
          {hiddenPubs > 0 && !showAllPubs && (
            <button type="button" className={styles.more} onClick={() => setShowAllPubs(true)}>
              Show {hiddenPubs} more with one article each
            </button>
          )}
        </div>

        <div className={styles.group}>
          <p className={styles.groupTitle}>Critic</p>
          <ul className={styles.checkList}>
            {authors.map((a) => (
              <li key={a.id}>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={selAuthors.includes(a.id)}
                    onChange={() => toggle('author', a.id)}
                  />
                  <span>{a.label}</span>
                  <span className={styles.checkCount}>{a.count}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.group}>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={scanOnly}
              onChange={() => update((p) => { if (scanOnly) p.delete('scan'); else p.set('scan', '1'); })}
            />
            <span>Only items with a scan</span>
          </label>
        </div>

        {anyFilter && (
          <button
            type="button"
            className={styles.reset}
            onClick={clear}
          >
            Clear all filters
          </button>
        )}
      </aside>

      <div>
        <div className={styles.resultsHead}>
          <p className={styles.count}>
            {results.length} of {rows.length} press notices
          </p>
          <label className="ui">
            Sort{' '}
            <select
              className={styles.sort}
              value={sort}
              onChange={(e) => update((p) => p.set('sort', e.target.value))}
            >
              {Object.entries(SORTS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </label>
        </div>

        {results.length === 0 ? (
          <p className={styles.empty}>
            No press notices match these filters. Try removing one, or clearing the search.
          </p>
        ) : (
          <ul className={styles.results}>
            {results.map((r) => (
              <li key={r.id}>
                <Link href={`/archive/press/${r.id}/`} className={styles.row}>
                  <div className={styles.rowMeta}>
                    <span className={styles.rowYear}>{r.year ?? 'undated'}</span>
                    {r.publicationName && (
                      <span><Highlight text={r.publicationName} tokens={tokens} /></span>
                    )}
                    {r.hasScan && <span className={`${styles.tag} ${styles.tagScan}`}>scan</span>}
                  </div>

                  {r.headline ? (
                    <p className={styles.rowTitle}>
                      <Highlight text={r.headline} tokens={tokens} />
                    </p>
                  ) : (
                    // 25 of 60 records have no headline; showing the manifest line
                    // keeps the row from being blank.
                    <p className={styles.rowRaw}>
                      <Highlight text={r.raw} tokens={tokens} />
                    </p>
                  )}

                  <p className={styles.rowFoot}>
                    {r.authorName && (
                      <><Highlight text={r.authorName} tokens={tokens} />{' · '}</>
                    )}
                    {formatArticleDate(r.dateNormalized, r.dateText, r.dateUncertain)}
                    {' · '}
                    <span className={styles.rowId}>{r.id}</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
