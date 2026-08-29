'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { NO_TEXT_LAYER, highlightNeedles, scoreFields, tokenize } from '@/lib/search';
import { useUrlState } from '@/lib/useUrlState';
import { byCountThenName, facetOf, facetOfMany } from '@/lib/facets';
import { CheckList, ClearFilters, RailSearch } from './FacetRail';
import { SheetTile, AbsentTile } from './MediaTile';
import { Highlight } from './Highlight';
import styles from './ArchiveBrowser.module.css';

/** One documentary object, flattened at build time so the client carries no lookups. */
export interface ArchiveRow {
  id: string;
  href: string;
  lead: string;
  thumb: string | null;
  dateText: string | null;
  year: number | null;
  decade: string | null;
  type: string;
  typeLabel: string;
  scanned: boolean;
  exhibitionNames: string[];
  exhibitionIds: string[];
  /** Low-weight search text: the verbatim manifest line. */
  body: string;
}

type Sort = 'date-asc' | 'date-desc' | 'type';

/**
 * The documentary record, with ways through it.
 *
 * This replaced two static grids of seventy-six tiles in date order. The estate's
 * complaint was exact — "searching for a needle in a haystack" — and the reason was
 * that the page offered exactly one path through the material, chronology, and no way
 * to ask it anything. Every facet here is a question the catalogue can actually
 * answer: what kind of thing is it, when is it from, can I see it, and does it
 * document a show.
 *
 * Filter state lives in the URL via useUrlState, whose server snapshot is empty, so
 * the COMPLETE unfiltered list is what prerenders and the page works with scripting
 * off. The undigitised objects keep their place among the rest as labelled empty
 * frames: dropping them would make the archive look more complete than it is.
 */
export function ArchiveBrowser({ rows }: { rows: ArchiveRow[] }) {
  const { params, update, toggle, clear } = useUrlState();

  const query = params.get('q') ?? '';
  const kinds = useMemo(() => new Set(params.getAll('kind')), [params]);
  const decades = useMemo(() => new Set(params.getAll('decade')), [params]);
  const shows = useMemo(() => new Set(params.getAll('exhibition')), [params]);
  const scanOnly = params.get('scan') === '1';
  const sort = (params.get('sort') as Sort) ?? 'date-asc';

  const kindFacet = useMemo(
    () => facetOf(rows, (r) => r.type).sort(byCountThenName),
    [rows],
  );

  const decadeFacet = useMemo(
    () => facetOf(rows, (r) => r.decade)
      .sort((a, b) => Number(a[0]) - Number(b[0])),
    [rows],
  );

  const showFacet = useMemo(
    () => facetOfMany(rows, (r) => r.exhibitionIds).sort(byCountThenName),
    [rows],
  );

  const kindLabels = useMemo(
    () => Object.fromEntries(rows.map((r) => [r.type, r.typeLabel])),
    [rows],
  );

  const showLabels = useMemo(() => {
    const out: Record<string, string> = {};
    for (const r of rows) {
      r.exhibitionIds.forEach((id, i) => { out[id] = r.exhibitionNames[i]; });
    }
    return out;
  }, [rows]);

  const tokens = useMemo(() => tokenize(query), [query]);
  const needles = useMemo(() => highlightNeedles(query), [query]);

  const results = useMemo(() => {
    const kept = rows
      .map((r) => ({
        r,
        score: scoreFields(
          [
            { text: r.lead, weight: 6 },
            { text: r.exhibitionNames.join(' '), weight: 3 },
            { text: r.dateText, weight: 2 },
            { text: r.id, weight: 2 },
            { text: r.body, weight: 1 },
          ],
          tokens,
        ),
      }))
      .filter(({ r, score }) => {
        if (score <= 0) return false;
        if (kinds.size && !kinds.has(r.type)) return false;
        if (decades.size && !(r.decade && decades.has(r.decade))) return false;
        if (shows.size && !r.exhibitionIds.some((id) => shows.has(id))) return false;
        if (scanOnly && !r.scanned) return false;
        return true;
      });

    kept.sort((a, b) => {
      if (tokens.length && b.score !== a.score) return b.score - a.score;
      if (sort === 'type') {
        return a.r.typeLabel.localeCompare(b.r.typeLabel) || a.r.id.localeCompare(b.r.id);
      }
      // Undated last, always — sorting them as year 0 put them before 1939.
      const ay = a.r.year;
      const by = b.r.year;
      if (ay == null && by == null) return a.r.id.localeCompare(b.r.id);
      if (ay == null) return 1;
      if (by == null) return -1;
      return sort === 'date-desc' ? by - ay : ay - by;
    });

    return kept.map(({ r }) => r);
  }, [rows, kinds, decades, shows, scanOnly, tokens, sort]);

  const shown = results.length;
  const withScan = results.filter((r) => r.scanned).length;
  const anyFilter = !!query || kinds.size > 0 || decades.size > 0 || shows.size > 0
    || scanOnly;

  return (
    <div className="railLayout">
      <aside className="rail" aria-label="Filters">
        <RailSearch
          id="archive-q"
          label="Search"
          placeholder="A gallery, a year, a description…"
          value={query}
          onChange={(v) => update((p) => { if (v) p.set('q', v); else p.delete('q'); })}
        />

        <CheckList
          label="Kind" options={kindFacet} selected={kinds}
          param="kind" onToggle={toggle} format={(v) => kindLabels[v] ?? v}
        />
        <CheckList
          label="Decade" options={decadeFacet} selected={decades}
          param="decade" onToggle={toggle} format={(v) => `${v}s`}
        />
        <CheckList
          label="Documents an exhibition" options={showFacet} selected={shows}
          param="exhibition" onToggle={toggle} format={(v) => showLabels[v] ?? v}
        />

        <p className={styles.label}>Availability</p>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={scanOnly}
            onChange={() => update((p) => {
              if (scanOnly) p.delete('scan'); else p.set('scan', '1');
            })}
          />
          <span>Only items I can look at</span>
        </label>

        {anyFilter && <ClearFilters onClear={clear} />}
      </aside>

      <div>
        <div className={styles.head}>
          <p className={styles.resultCount}>
            <span className="tnum">{shown}</span>
            {shown === 1 ? ' object' : ' objects'}
            {' · '}
            <span className="tnum">{withScan}</span> you can look at
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
              <option value="type">By kind</option>
            </select>
          </label>
        </div>

        {shown === 0 && (
          <p className={styles.empty}>
            Nothing matches. Every word of the search has to appear in the catalogue
            record. {NO_TEXT_LAYER}
          </p>
        )}

        <ol className={styles.grid}>
          {results.map((r) => {
            const caption = (
              <Link href={r.href} className={styles.tileLead}>
                <Highlight text={r.lead} tokens={needles} />
              </Link>
            );
            const meta = `${r.id} · ${r.dateText ?? 'undated'}`;
            return (
              <li key={r.id}>
                {r.thumb ? (
                  <SheetTile
                    sheet={{ page: r.thumb, thumb: r.thumb }}
                    href={r.href}
                    aspect="3 / 4"
                    alt={`${r.lead} — ${r.id}`}
                    caption={caption}
                    meta={meta}
                  />
                ) : (
                  <AbsentTile
                    aspect="3 / 4"
                    note="Catalogued from the sheet; no scan on file."
                    caption={caption}
                    meta={meta}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
