'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { TimelineEvent, TimelineKind } from '@/lib/types';
import { useUrlState } from '@/lib/useUrlState';
import styles from './Chronology.module.css';

const KIND_LABELS: Record<TimelineKind, string> = {
  article: 'Press',
  exhibition: 'Exhibitions',
  object: 'Physical items',
  painting: 'Works',
  // Distinct from 'Works' on purpose: a painting a sheet NAMES is not a catalogue
  // entry, and the chip is the only thing labelling it on this page.
  attestation: 'Works recorded',
  video: 'Interviews',
  event: 'Events',
};

/**
 * Physical objects are mostly containers for the articles already shown, so they
 * are off by default — leaving them on doubles the timeline's length without
 * adding information.
 */
const DEFAULT_OFF: TimelineKind[] = ['object'];

export function Chronology({
  events, undatedTestimony, undatedAttestations = 0,
}: {
  events: TimelineEvent[];
  undatedTestimony: { id: string; title: string; href: string; words: number | null }[];
  /**
   * How many paintings box 2 names without a year. They deliberately get no band
   * of their own: seven undated interviews read as a coda, but forty-odd undated
   * works would read as the main event on a page about when things happened,
   * while saying nothing about when. One line and a link instead.
   */
  undatedAttestations?: number;
}) {
  const kinds = useMemo(() => {
    const present = new Set(events.map((e) => e.kind));
    return (Object.keys(KIND_LABELS) as TimelineKind[]).filter((k) => present.has(k));
  }, [events]);

  /**
   * Which kinds are showing lives in the URL, so a filtered timeline is a citable
   * link rather than a state a reader has to reconstruct. The server snapshot is
   * empty, so the default set is what prerenders.
   *
   * Semantics: no `kind` param at all means the default set. Once the param exists
   * it is the complete, explicit list — including the empty case, which is why
   * deselecting everything writes an empty value rather than dropping the key.
   */
  const { params, update } = useUrlState();
  const on = useMemo<Set<TimelineKind>>(() => {
    if (!params.has('kind')) return new Set(kinds.filter((k) => !DEFAULT_OFF.includes(k)));
    return new Set(params.getAll('kind').filter(Boolean) as TimelineKind[]);
  }, [params, kinds]);

  const shown = useMemo(() => events.filter((e) => on.has(e.kind)), [events, on]);

  /**
   * Decade bands, not a flat year axis. The archive is spiky — 1951, 1955, 1957
   * and 1983 are dense, 1964–1978 is nearly empty — and a linear axis would be
   * mostly dead corridor.
   */
  const decades = useMemo(() => {
    const map = new Map<number, TimelineEvent[]>();
    for (const e of shown) {
      const d = Math.floor(e.year / 10) * 10;
      const list = map.get(d);
      if (list) list.push(e); else map.set(d, [e]);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [shown]);

  const counts = useMemo(() => {
    const c: Partial<Record<TimelineKind, number>> = {};
    for (const e of events) c[e.kind] = (c[e.kind] ?? 0) + 1;
    return c;
  }, [events]);

  const toggle = (k: TimelineKind) =>
    update((p) => {
      const next = new Set(on);
      if (next.has(k)) next.delete(k); else next.add(k);
      p.delete('kind');
      if (next.size === 0) p.append('kind', '');
      else for (const kind of kinds) if (next.has(kind)) p.append('kind', kind);
    });

  return (
    <>
      <div className={styles.filters} role="group" aria-label="Filter the timeline">
        {kinds.map((k) => (
          <button
            key={k}
            type="button"
            className={`${styles.chip} ${on.has(k) ? styles.chipOn : ''}`}
            aria-pressed={on.has(k)}
            onClick={() => toggle(k)}
          >
            {KIND_LABELS[k]}<span className={styles.chipCount}>{counts[k]}</span>
          </button>
        ))}
      </div>

      <div className={styles.timeline}>
        {decades.map(([decade, items], i) => {
          const prev = decades[i - 1];
          // An empty stretch is information about both the career and the archive,
          // so it is labelled rather than silently closed up.
          const gapFrom = prev ? prev[0] + 10 : null;
          const gapTo = decade - 10;
          const gap = gapFrom !== null && gapTo >= gapFrom;

          const byYear = new Map<number, TimelineEvent[]>();
          for (const e of items) {
            const list = byYear.get(e.year);
            if (list) list.push(e); else byYear.set(e.year, [e]);
          }

          return (
            <div key={decade}>
              {gap && (
                <p className={styles.gap}>
                  {gapFrom}–{gapTo + 9} · nothing in the archive
                </p>
              )}
              <section className={styles.decade}>
                <h3 className={styles.decadeTitle}>
                  <span className="tnum">{decade}s</span>
                  <span className={styles.decadeCount}>
                    {items.length} item{items.length === 1 ? '' : 's'}
                  </span>
                </h3>

                {[...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, list]) => (
                  <div key={year} className={styles.year}>
                    <p className={`${styles.yearLabel} tnum`}>{year}</p>
                    <ul className={styles.entries}>
                      {list.map((e) => (
                        <li key={`${e.kind}-${e.id}`}>
                          <Link
                            href={e.href}
                            className={`${styles.entry} ${styles[e.kind]} ${
                              e.uncertain ? styles.uncertain : ''
                            } ${e.precision === 'year' ? styles.vague : ''}`}
                          >
                            <span className={styles.entryTitle}>{e.title}</span>
                            {e.subtitle && (
                              <span className={styles.entrySub}>{e.subtitle}</span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            </div>
          );
        })}
      </div>

      {undatedAttestations > 0 && (
        <p className={styles.undatedNote}>
          A further {undatedAttestations} paintings are named on Sievan’s own sheets
          with no year attached, so they cannot be placed on this spine at all. They
          are listed in the{' '}
          <Link href="/works/attested/">catalogue raisonné</Link>.
        </p>
      )}

      {/*
        None of the interviews carry a date, so they cannot sit on the timeline at
        all. Rather than lose the most human material in the archive, they get
        their own untimed band.
      */}
      {undatedTestimony.length > 0 && (
        <section className={styles.testimony}>
          <h3 className={styles.decadeTitle}>
            <span>Testimony, undated</span>
          </h3>
          <p className={styles.testimonyNote}>
            None of the recordings carry a date, so they cannot be placed on the timeline.
            They were made after Sievan’s death in 1981 — Ivan Karp mentions not having
            seen him “for over 12, 14 years”.
          </p>
          <ul className={styles.entries}>
            {undatedTestimony.map((t) => (
              <li key={t.id}>
                <Link href={t.href} className={`${styles.entry} ${styles.video}`}>
                  <span className={styles.entryTitle}>{t.title}</span>
                  {t.words && (
                    <span className={styles.entrySub}>{t.words.toLocaleString()} words</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
