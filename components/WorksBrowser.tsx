'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { Painting } from '@/lib/types';
import { highlightNeedles, scoreFields, tokenize } from '@/lib/search';
import { compareDatesUndatedLast, decadeLabel } from '@/lib/dates';
import { useUrlState } from '@/lib/useUrlState';
import { facetOf, parseDims } from '@/lib/facets';
import { CheckList, ClearFilters, RailSearch } from './FacetRail';
import { Highlight } from './Highlight';
import styles from './WorksBrowser.module.css';

type View = 'list' | 'grid-s' | 'grid-l' | 'scale';
type Sort = 'date-asc' | 'date-desc' | 'title';

/*
 * The rail, the facet counter and the dimension parser now live in lib/facets.ts and
 * components/FacetRail.tsx, shared with the catalogue browser. Behaviour here is
 * unchanged — the only difference is that parseDims returns `a`/`b` rather than
 * `h`/`w`, because on an attested work nothing records which figure is the height.
 * A Painting's `dimensions` IS height-first (see the Pending panel on /works/), so
 * `a` is the height in this component and the scale view is still correct.
 */

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
      return compareDatesUndatedLast(
        a.p.date_earliest?.toString() ?? null,
        b.p.date_earliest?.toString() ?? null,
        sort === 'date-desc' ? 'desc' : 'asc',
      );
    });

    return kept.map(({ p }) => p);
  }, [paintings, media, decades, collections, tokens, sort]);

  const maxDim = useMemo(() => {
    let max = 0;
    for (const p of results) {
      const d = parseDims(p.dimensions);
      if (d) max = Math.max(max, d.a, d.b);
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
        <RailSearch
          id="works-q"
          label="Search"
          placeholder="Title, medium, collection…"
          value={query}
          onChange={(v) => update((p) => { if (v) p.set('q', v); else p.delete('q'); })}
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

        {anyFilter && <ClearFilters onClear={clear} />}
      </aside>

      <div>
        <div className={styles.head}>
          <p className={styles.resultCount} role="status">
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
                  // `a` is height, `b` is width: a Painting's dimensions are recorded
                  // height-first, which is the whole reason Scale view is allowed here
                  // and is NOT offered on the attested works.
                  ? { width: `${(d.b / maxDim) * 100}%`, aspectRatio: `${d.b} / ${d.a}` }
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
