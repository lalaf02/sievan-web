'use client';

import { useMemo, useState } from 'react';
import { useUrlState } from '@/lib/useUrlState';
import { Highlight } from './Highlight';
import { tokenize } from '@/lib/search';
import type { TranscriptPage } from '@/lib/types';
import styles from './TranscriptReader.module.css';

/**
 * Reads a page-segmented interview transcript.
 *
 * Page markers are a citation device — the source is a paginated PDF — so they
 * render as marginal numbers with anchors rather than headings in the flow.
 */
export function TranscriptReader({ pages }: { pages: TranscriptPage[] }) {
  /**
   * The URL's ?q= seeds the search, so a result elsewhere on the site can deep-link
   * into a transcript with the term already lit. It resolves to empty on the
   * server, which is what keeps the full transcript in the prerendered HTML rather
   * than behind a spinner. Typing updates local state only — the transcript search
   * is a reading aid, not a view worth pushing into the address bar on every
   * keystroke.
   */
  const { params } = useUrlState();
  const [typed, setTyped] = useState<string | null>(null);
  const query = typed ?? params.get('q') ?? '';

  const tokens = useMemo(() => tokenize(query), [query]);

  const matches = useMemo(() => {
    if (!tokens.length) return 0;
    let n = 0;
    for (const page of pages) {
      for (const para of page.paragraphs) {
        const hay = para.toLowerCase();
        for (const t of tokens) {
          let from = 0;
          for (;;) {
            const at = hay.indexOf(t, from);
            if (at === -1) break;
            n++;
            from = at + t.length;
          }
        }
      }
    }
    return n;
  }, [pages, tokens]);

  return (
    <div className="railLayout">
      <aside className="rail" aria-label="Transcript tools">
        <div className={styles.searchGroup}>
          <label htmlFor="t-search" className={styles.railLabel}>Search this transcript</label>
          <input
            id="t-search"
            type="search"
            className={styles.search}
            value={query}
            placeholder="A word or phrase…"
            onChange={(e) => setTyped(e.target.value)}
          />
          {tokens.length > 0 && (
            <p className={styles.matchCount}>
              {matches === 0 ? 'No matches' : `${matches} match${matches === 1 ? '' : 'es'}`}
            </p>
          )}
        </div>

        <nav className={styles.pageNav} aria-label="Pages">
          <p className={styles.railLabel}>Pages</p>
          <ul className={styles.pageList}>
            {pages.map((p) => (
              <li key={p.page}>
                <a href={`#p${p.page}`} className={styles.pageLink}>{p.page}</a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className={styles.body}>
        {pages.map((page) => (
          <section key={page.page} className={styles.page}>
            <span className={styles.pageMark} id={`p${page.page}`} aria-label={`Page ${page.page}`}>
              {page.page}
            </span>

            {page.paragraphs.map((para, i) => (
              <p key={i} className={styles.para}>
                <Highlight text={para} tokens={tokens} />
              </p>
            ))}

            {/*
              The source PDF sets speakers in a margin column that text extraction
              dislocated to the end of each page. They cannot be matched to
              individual paragraphs without the original coordinates, so they are
              presented as a sequence rather than a false alignment.
            */}
            {page.speakers.length > 0 && (
              <details className={styles.speakers}>
                <summary className={styles.speakersSummary}>
                  Speaker sequence for this page ({page.speakers.length} turns)
                </summary>
                <p className={styles.speakersNote}>
                  The source transcript prints speaker names in a margin column, which
                  does not survive text extraction in alignment with the dialogue. The
                  speakers on this page, in order, were:
                </p>
                <ol className={styles.speakerList}>
                  {page.speakers.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </details>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
