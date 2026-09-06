'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { NO_TEXT_LAYER, highlightNeedles, scoreFields, tokenize } from '@/lib/search';
import { useUrlState } from '@/lib/useUrlState';
import { byCountThenName, facetOf, facetOfMany, NOT_STATED } from '@/lib/facets';
/*
 * From artworkGrades, NOT artworkIndex. This is a client component, and artworkIndex
 * imports lib/data — importing it here bundles the whole archive into a client chunk.
 */
import {
  GRADES, GRADE_LABEL, PRICE_BUCKETS, describeCounts,
} from '@/lib/artworkGrades';
import type { ArtworkRow } from '@/lib/artworkGrades';
import { CheckList, ClearFilters, RailSearch } from './FacetRail';
import { Highlight } from './Highlight';
import styles from './ArtworkBrowser.module.css';

type Sort = 'year-asc' | 'year-desc' | 'title' | 'size-desc';

/**
 * Prices are transcribed verbatim from what Sievan wrote, and he was inconsistent:
 * 19 of the 29 carry a dollar sign and 10 do not, but the ten are not simply bare
 * numbers — they include "quoted 350", "approx $150" and "300 (200 marked over)".
 * So the sign is added ONLY to a value that opens with a digit and carries no sign
 * anywhere. Prefixing everything gave "$quoted 350" and "$approx $150"; rewriting the
 * strings to tidy numbers would discard what the sheet actually says.
 */
const withCurrency = (price: string): string => {
  const p = price.trim();
  if (p.includes('$') || !/^\d/.test(p)) return p;
  return `$${p}`;
};

/**
 * Find one work across every kind of evidence the archive holds.
 *
 * The counterpart to /works/, which is the curated way through the material. This is
 * the other one: a researcher who already knows what they are looking for should not
 * have to know whether it is a sheet, a plate or a line on a drawing before they can
 * look for it.
 *
 * Filter state lives in the URL via useUrlState, whose server snapshot is empty — so
 * the COMPLETE unfiltered index is what prerenders, and this page is a usable
 * table of contents with scripting off. Never swap that for useSearchParams.
 *
 * The results head prints counts by grade and never one total, for the reason set out
 * at the top of lib/artworkIndex.ts.
 */
export function ArtworkBrowser({
  rows, placeLabels, periodLabels,
}: {
  rows: ArtworkRow[];
  placeLabels: Record<string, string>;
  periodLabels: Record<string, string>;
}) {
  const { params, update, toggle, clear } = useUrlState();

  const query = params.get('q') ?? '';
  const grades = useMemo(() => new Set(params.getAll('evidence')), [params]);
  const periods = useMemo(() => new Set(params.getAll('period')), [params]);
  const media = useMemo(() => new Set(params.getAll('medium')), [params]);
  const places = useMemo(() => new Set(params.getAll('place')), [params]);
  const events = useMemo(() => new Set(params.getAll('happened')), [params]);
  const prices = useMemo(() => new Set(params.getAll('price')), [params]);
  const sort = (params.get('sort') as Sort) ?? 'year-asc';

  // ------------------------------------------------------------------ facets
  const gradeFacet = useMemo(
    () => facetOf(rows, (r) => r.grade)
      .sort((a, b) => GRADES.findIndex((g) => g.id === a[0]) - GRADES.findIndex((g) => g.id === b[0])),
    [rows],
  );

  const periodFacet = useMemo(
    () => facetOf(rows, (r) => r.periodId ?? NOT_STATED)
      .sort((a, b) => {
        // Chronological, with the undated bucket last — it is the largest by far,
        // and sorting it to the top would bury the five periods under it.
        if (a[0] === NOT_STATED) return 1;
        if (b[0] === NOT_STATED) return -1;
        return Object.keys(periodLabels).indexOf(a[0]) - Object.keys(periodLabels).indexOf(b[0]);
      }),
    [rows, periodLabels],
  );

  const mediumFacet = useMemo(
    () => facetOf(rows, (r) => r.mediumFacet).sort(byCountThenName),
    [rows],
  );

  const placeFacet = useMemo(
    () => facetOfMany(rows, (r) => r.placeIds).sort(byCountThenName),
    [rows],
  );

  const eventFacet = useMemo(
    () => facetOfMany(rows, (r) => r.dispositions).sort(byCountThenName),
    [rows],
  );

  const priceFacet = useMemo(
    () => facetOf(rows, (r) => r.priceBucket)
      .sort((a, b) => PRICE_BUCKETS.findIndex((p) => p.id === a[0])
        - PRICE_BUCKETS.findIndex((p) => p.id === b[0])),
    [rows],
  );

  // ----------------------------------------------------------------- results
  const tokens = useMemo(() => tokenize(query), [query]);
  const needles = useMemo(() => highlightNeedles(query), [query]);

  const results = useMemo(() => {
    const kept = rows
      .map((r) => ({
        r,
        score: scoreFields(
          [
            { text: r.title, weight: 6 },
            { text: r.placeNames.join(' '), weight: 3 },
            { text: r.mediumStated, weight: 2 },
            { text: r.dimensionsStated, weight: 2 },
            { text: r.dateText, weight: 2 },
            { text: r.body, weight: 1 },
          ],
          tokens,
        ),
      }))
      .filter(({ r, score }) => {
        if (score <= 0) return false;
        if (grades.size && !grades.has(r.grade)) return false;
        if (periods.size && !periods.has(r.periodId ?? NOT_STATED)) return false;
        if (media.size && !media.has(r.mediumFacet)) return false;
        if (places.size && !r.placeIds.some((p) => places.has(p))) return false;
        if (events.size && !r.dispositions.some((d) => events.has(d))) return false;
        if (prices.size && !(r.priceBucket && prices.has(r.priceBucket))) return false;
        return true;
      });

    kept.sort((a, b) => {
      if (tokens.length && b.score !== a.score) return b.score - a.score;
      if (sort === 'title') return a.r.title.localeCompare(b.r.title);
      if (sort === 'size-desc') {
        // Works with no recorded size sort last rather than sorting as zero: the
        // archive not measuring a work is not the same as the work being small.
        const av = a.r.largestEdge;
        const bv = b.r.largestEdge;
        if (av == null && bv == null) return a.r.title.localeCompare(b.r.title);
        if (av == null) return 1;
        if (bv == null) return -1;
        return bv - av;
      }
      // Undated last, for the same reason byDateUndatedLast exists in lib/data.ts.
      const ay = a.r.year;
      const by = b.r.year;
      if (ay == null && by == null) return a.r.title.localeCompare(b.r.title);
      if (ay == null) return 1;
      if (by == null) return -1;
      return sort === 'year-desc' ? by - ay : ay - by;
    });

    return kept.map(({ r }) => r);
  }, [rows, grades, periods, media, places, events, prices, tokens, sort]);

  const anyFilter = !!query || grades.size > 0 || periods.size > 0 || media.size > 0
    || places.size > 0 || events.size > 0 || prices.size > 0;

  return (
    <div className="railLayout">
      <aside className="rail" aria-label="Filters">
        <RailSearch
          id="artwork-q"
          label="Search"
          placeholder="A title, a place, a size, a buyer…"
          value={query}
          onChange={(v) => update((p) => { if (v) p.set('q', v); else p.delete('q'); })}
        />

        {/*
          Evidence first, and deliberately so. The four grades are the one thing a
          reader must understand before any count on this page means anything, and
          putting the facet at the top of the rail teaches it by use.
        */}
        <CheckList
          label="Evidence" options={gradeFacet} selected={grades}
          param="evidence" onToggle={toggle} format={(v) => GRADE_LABEL[v as never]}
        />
        <CheckList
          label="Period" options={periodFacet} selected={periods}
          param="period" onToggle={toggle}
          format={(v) => (v === NOT_STATED ? 'Undated' : periodLabels[v] ?? v)}
        />
        <CheckList
          label="Medium" options={mediumFacet} selected={media}
          param="medium" onToggle={toggle}
          format={(v) => (v === NOT_STATED ? 'Not stated' : v)}
        />
        <CheckList
          label="Place named" options={placeFacet} selected={places}
          param="place" onToggle={toggle} format={(v) => placeLabels[v] ?? v}
        />
        <CheckList
          label="What happened to it" options={eventFacet} selected={events}
          param="happened" onToggle={toggle}
          format={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
        />
        <CheckList
          label="Asking price" options={priceFacet} selected={prices}
          param="price" onToggle={toggle}
          format={(v) => PRICE_BUCKETS.find((p) => p.id === v)?.label ?? v}
        />

        {anyFilter && <ClearFilters onClear={clear} />}
      </aside>

      <div>
        <div className={styles.head}>
          {/*
            Counts by grade, never one total. Four different strengths of evidence
            added together would be exactly the number CLAUDE.md forbids.
          */}
          <p className={styles.resultCount} role="status">
            <span className="tnum">{describeCounts(results)}</span>
          </p>

          <label className={styles.sortLabel}>
            <span className="srOnly">Sort by</span>
            <select
              className={styles.sort}
              value={sort}
              onChange={(e) => update((p) => p.set('sort', e.target.value))}
            >
              <option value="year-asc">Earliest first</option>
              <option value="year-desc">Latest first</option>
              <option value="title">Title A–Z</option>
              <option value="size-desc">Largest recorded size</option>
            </select>
          </label>
        </div>

        {results.length === 0 && (
          <p className={styles.empty}>
            Nothing matches. Every word of the search has to appear in the record, and
            these records are short — a title, a size, a medium, sometimes a buyer.{' '}
            {NO_TEXT_LAYER}
          </p>
        )}

        <ol className={styles.grid}>
          {results.map((r) => (
            <li key={r.key} className={styles.card}>
              <Link href={r.href} className={styles.cardLink}>
                <span className={styles.cardMedia}>
                  {r.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.thumb} alt={r.title} loading="lazy" decoding="async" />
                  ) : (
                    /*
                      No image, and the reason matters. A plate inside the typescript
                      exists only as part of the page it is printed on, so there is no
                      separable picture of it to show — that is a fact about the source,
                      not a file that failed to load.
                    */
                    <span className={styles.noImage}>
                      {r.grade === 'printed'
                        ? 'Not separable from the page it is printed on'
                        : 'No scan on file'}
                    </span>
                  )}
                </span>
                <span className={styles.cardBody}>
                  <span className={`${styles.badge} ${styles[r.grade]}`}>
                    {GRADE_LABEL[r.grade]}
                  </span>
                  <span
                    className={r.titleIsDescriptive ? styles.cardTitleQuiet : styles.cardTitle}
                  >
                    <Highlight text={r.title} tokens={needles} />
                  </span>
                  <span className={styles.cardFacts}>
                    {r.dateText ? <span className="tnum">{r.dateText}</span> : 'Undated'}
                    {r.dimensionsStated ? ` · ${r.dimensionsStated}` : ''}
                    {r.priceStated ? ` · ${withCurrency(r.priceStated)}` : ''}
                  </span>
                  <span className={styles.cardMeta}>{r.meta}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
