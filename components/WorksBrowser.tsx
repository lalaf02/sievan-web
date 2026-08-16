'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Painting } from '@/lib/types';
import { scoreFields, tokenize } from '@/lib/search';
import styles from './WorksBrowser.module.css';

type View = 'list' | 'grid-s' | 'grid-l' | 'scale';

/** Free-text dimensions, e.g. "24 x 30 in." — used only by Scale view. */
const DIMS = /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/;

function parseDims(s: string | null): { h: number; w: number } | null {
  if (!s) return null;
  const m = s.match(DIMS);
  return m ? { h: Number(m[1]), w: Number(m[2]) } : null;
}

export function WorksBrowser({ paintings }: { paintings: Painting[] }) {
  const [query, setQuery] = useState('');
  const [media, setMedia] = useState<Set<string>>(new Set());

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
  const [view, setView] = useState<View>(hasImages ? 'grid-s' : 'list');

  const mediumFacet = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of paintings) {
      if (!p.medium) continue;
      const key = p.medium.trim().toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [paintings]);

  const tokens = useMemo(() => tokenize(query), [query]);

  const results = useMemo(
    () =>
      paintings.filter((p) => {
        if (media.size && !(p.medium && media.has(p.medium.trim().toLowerCase()))) return false;
        return scoreFields(
          [
            { text: p.title, weight: 6 },
            { text: p.medium, weight: 2 },
            { text: p.current_location, weight: 2 },
          ],
          tokens,
        ) > 0;
      }),
    [paintings, media, tokens],
  );

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

  return (
    <div className="railLayout">
      <aside className="rail" aria-label="Filters">
        <label htmlFor="works-q" className={styles.label}>Search</label>
        <input
          id="works-q"
          type="search"
          className={styles.search}
          value={query}
          placeholder="Title, medium, collection…"
          onChange={(e) => setQuery(e.target.value)}
        />

        {mediumFacet.length > 0 && (
          <>
            <p className={styles.label}>Medium</p>
            <ul className={styles.checkList}>
              {mediumFacet.map(([m, n]) => (
                <li key={m}>
                  <label className={styles.check}>
                    <input
                      type="checkbox"
                      checked={media.has(m)}
                      onChange={() =>
                        setMedia((prev) => {
                          const next = new Set(prev);
                          if (next.has(m)) next.delete(m); else next.add(m);
                          return next;
                        })
                      }
                    />
                    <span>{m}</span>
                    <span className={styles.count}>{n}</span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>

      <div>
        <div className={styles.head}>
          <p className={styles.resultCount}>
            {results.length} of {paintings.length} works
          </p>
          <div className={styles.views} role="group" aria-label="View mode">
            {VIEWS.map(([v, label]) => (
              <button
                key={v}
                type="button"
                className={`${styles.viewBtn} ${view === v ? styles.viewOn : ''}`}
                aria-pressed={view === v}
                onClick={() => setView(v)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

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
                  <td><Link href={`/works/${p.id}/`}>{p.title ?? 'Untitled'}</Link></td>
                  <td className="tnum">{p.date_text ?? p.date_earliest ?? ''}</td>
                  <td>{p.medium ?? ''}</td>
                  <td>{p.dimensions ?? ''}</td>
                  <td>{p.current_location ?? ''}</td>
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
                      <img src={p.image_ref} alt={p.title ?? 'Untitled'} loading="lazy" />
                    ) : (
                      <span className={styles.noImage}>No image</span>
                    )}
                    <span className={styles.cardTitle}>{p.title ?? 'Untitled'}</span>
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
