'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { Painting } from '@/lib/types';
import { highlightNeedles, scoreFields, tokenize } from '@/lib/search';
import { decadeLabel } from '@/lib/dates';
import { useUrlState } from '@/lib/useUrlState';
import { Highlight } from './Highlight';
import styles from './WorksBrowser.module.css';

type View = 'list' | 'grid-s' | 'grid-l' | 'scale';
type Sort = 'date-asc' | 'date-desc' | 'title';

/** Free-text dimensions, e.g. "24 x 30 in." — used only by Scale view. */
const DIMS = /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/;

function parseDims(s: string | null): { h: number; w: number } | null {
  if (!s) return null;
  const m = s.match(DIMS);
  return m ? { h: Number(m[1]), w: Number(m[2]) } : null;
}

/** Count distinct values of one field, as [value, count] pairs. */
function facetOf(
  paintings: Painting[],
  key: (p: Painting) => string | null | undefined,
): [string, number][] {
  const counts = new Map<string, number>();
  for (const p of paintings) {
    const k = key(p);
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()];
}

/**
 * One facet block. Defined at module scope, not inside WorksBrowser: a component
 * created during render is a new type on every render, so React unmounts and
 * remounts the whole subtree and any focus inside it is lost.
 */
function CheckList({
  label, options, selected, param, onToggle, format,
}: {
  label: string;
  options: [string, number][];
  selected: Set<string>;
  param: string;
  onToggle: (param: string, value: string) => void;
  format?: (v: string) => string;
}) {
  if (options.length < 2) return null;
  return (
    <>
      <p className={styles.label}>{label}</p>
      <ul className={styles.checkList}>
        {options.map(([v, n]) => (
          <li key={v}>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={selected.has(v)}
                onChange={() => onToggle(param, v)}
              />
              <span>{format ? format(v) : v}</span>
              <span className={styles.count}>{n}</span>
            </label>
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * The catalogue browser.
 *
 * Filter state lives in the URL, like the press browser: a filtered view of the
 * catalogue is the kind of thing a researcher cites or mails to someone, and it
 * should survive being pasted. The server snapshot is empty, so the complete
 * unfiltered catalogue is what prerenders and the page reads without JavaScript.
 */
export function WorksBrowser({ paintings }: { paintings: Painting[] }) {
  const { params, update, toggle, clear } = useUrlState();

  const query = params.get('q') ?? '';
  const media = useMemo(() => new Set(params.getAll('medium')), [params]);
  const decades = useMemo(() => new Set(params.getAll('decade')), [params]);
  const collections = useMemo(() => new Set(params.getAll('collection')), [params]);
  const sort = (params.get('sort') as Sort) ?? 'date-asc';

  /**
   * Scale view needs real measurements. If most records have unparseable
   * free-text dimensions the mode is hidden rather than shown drawing a diagram
   * that would be wrong.
   */
  const scaleUsable = useMemo(() => {
    if (!paintings.length) return false;
    const ok = paintings.filter((p) => parseDims(p.dimensions)).length;
    return ok / paintings.length >= 0.8;
  }, [paintings]);

  // List works without images; grids do not. Default to whichever tells the truth.
  const hasImages = useMemo(() => paintings.some((p) => p.image_ref), [paintings]);
  const view = (params.get('view') as View) ?? (hasImages ? 'grid-s' : 'list');

  const mediumFacet = useMemo(
    () => facetOf(paintings, (p) => p.medium?.trim().toLowerCase()).sort((a, b) => b[1] - a[1]),
    [paintings],
  );

  // The ghost rail this page used to show promised Date and Collection alongside
  // Medium; they are the two facets a catalogue is actually browsed by.
  const decadeFacet = useMemo(
    () => facetOf(paintings, (p) => (p.date_earliest == null ? null : String(Math.floor(p.date_earliest / 10) * 10)))
      .sort((a, b) => Number(a[0]) - Number(b[0])),
    [paintings],
  );

  const collectionFacet = useMemo(
    () => facetOf(paintings, (p) => p.current_location?.trim())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    [paintings],
  );

  const tokens = useMemo(() => tokenize(query), [query]);
  const needles = useMemo(() => highlightNeedles(query), [query]);

  const results = useMemo(() => {
    const kept = paintings
      .map((p) => ({
        p,
        score: scoreFields(
          [
            { text: p.title, weight: 6 },
            { text: p.medium, weight: 2 },
            { text: p.current_location, weight: 2 },
            { text: p.date_text, weight: 2 },
          ],
          tokens,
        ),
      }))
      .filter(({ p, score }) => {
        if (score <= 0) return false;
        if (media.size && !(p.medium && media.has(p.medium.trim().toLowerCase()))) return false;
        if (decades.size) {
          const d = p.date_earliest == null ? null : String(Math.floor(p.date_earliest / 10) * 10);
          if (!d || !decades.has(d)) return false;
        }
        if (collections.size && !(p.current_location && collections.has(p.current_location.trim()))) {
          return false;
        }
        return true;
      });

    // A query orders by relevance; without one, by whichever spine was chosen.
    kept.sort((a, b) => {
      if (tokens.length && b.score !== a.score) return b.score - a.score;
      if (sort === 'title') return (a.p.title ?? '').localeCompare(b.p.title ?? '');
      const av = a.p.date_earliest ?? 0;
      const bv = b.p.date_earliest ?? 0;
      return sort === 'date-desc' ? bv - av : av - bv;
    });

    return kept.map(({ p }) => p);
  }, [paintings, media, decades, collections, tokens, sort]);

  const maxDim = useMemo(() => {
    let max = 0;
    for (const p of results) {
      const d = parseDims(p.dimensions);
      if (d) max = Math.max(max, d.h, d.w);
    }
    return max || 1;
  }, [results]);

  const VIEWS: [View, string][] = [
    ['list', 'List'],
    ['grid-s', 'Grid'],
    ['grid-l', 'Large'],
    ...(scaleUsable ? ([['scale', 'Scale']] as [View, string][]) : []),
  ];

  const anyFilter = !!query || media.size > 0 || decades.size > 0 || collections.size > 0;

  return (
    <div className="railLayout">
      <aside className="rail" aria-label="Filters">
        <label htmlFor="works-q" className={styles.label}>Search</label>
        <input
          id="works-q"
          type="search"
          className={styles.search}
          defaultValue={query}
          placeholder="Title, medium, collection…"
          onChange={(e) => update((p) => {
            const v = e.target.value;
            if (v) p.set('q', v); else p.delete('q');
          })}
        />

        <CheckList
          label="Date" options={decadeFacet} selected={decades}
          param="decade" onToggle={toggle} format={decadeLabel}
        />
        <CheckList
          label="Medium" options={mediumFacet} selected={media}
          param="medium" onToggle={toggle}
        />
        <CheckList
          label="Collection" options={collectionFacet} selected={collections}
          param="collection" onToggle={toggle}
        />

        {anyFilter && (
          <button type="button" className={styles.clear} onClick={clear}>
            Clear all filters
          </button>
        )}
      </aside>

      <div>
        <div className={styles.head}>
          <p className={styles.resultCount}>
            {results.length} of {paintings.length} works
          </p>

          <label className={styles.sortLabel}>
            <span className="srOnly">Sort by</span>
            <select
              className={styles.sort}
              value={sort}
              onChange={(e) => update((p) => p.set('sort', e.target.value))}
            >
              <option value="date-asc">Earliest first</option>
              <option value="date-desc">Latest first</option>
              <option value="title">Title</option>
            </select>
          </label>

          <div className={styles.views} role="group" aria-label="View mode">
            {VIEWS.map(([v, label]) => (
              <button
                key={v}
                type="button"
                className={`${styles.viewBtn} ${view === v ? styles.viewOn : ''}`}
                aria-pressed={view === v}
                onClick={() => update((p) => p.set('view', v))}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {results.length === 0 && (
          <p className={styles.empty}>
            No works match. Every word of the search has to appear in the record — the
            catalogue holds titles, dates, media and locations, not descriptions.
          </p>
        )}

        {view === 'list' ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th><th>Date</th><th>Medium</th><th>Dimensions</th><th>Collection</th>
              </tr>
            </thead>
            <tbody>
              {results.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/works/${p.id}/`}>
                      <Highlight text={p.title ?? 'Untitled'} tokens={needles} />
                    </Link>
                  </td>
                  <td className="tnum">{p.date_text ?? p.date_earliest ?? ''}</td>
                  <td><Highlight text={p.medium ?? ''} tokens={needles} /></td>
                  <td>{p.dimensions ?? ''}</td>
                  <td><Highlight text={p.current_location ?? ''} tokens={needles} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <ul className={`${styles.grid} ${view === 'grid-l' ? styles.gridLarge : ''}`}>
            {results.map((p) => {
              const d = parseDims(p.dimensions);
              const scaleStyle =
                view === 'scale' && d
                  ? { width: `${(d.w / maxDim) * 100}%`, aspectRatio: `${d.w} / ${d.h}` }
                  : undefined;
              return (
                <li key={p.id} style={view === 'scale' ? scaleStyle : undefined}>
                  <Link href={`/works/${p.id}/`} className={styles.card}>
                    {p.image_ref ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image_ref}
                        alt={[p.title ?? 'Untitled work', p.date_text, p.medium]
                          .filter(Boolean)
                          .join(', ')}
                        loading="lazy"
                      />
                    ) : (
                      <span className={styles.noImage}>No image</span>
                    )}
                    <span className={styles.cardTitle}>
                      <Highlight text={p.title ?? 'Untitled'} tokens={needles} />
                    </span>
                    <span className={styles.cardMeta}>{p.date_text ?? p.date_earliest}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
