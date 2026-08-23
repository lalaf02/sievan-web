/**
 * Formatting the archive's own records as citations.
 *
 * A researcher who wants to quote a 1951 notice needs a reference they can put in
 * a footnote, and the archive is the only place that reference exists. The awkward
 * part is that the record is often incomplete — 25 of 60 notices have no headline
 * and 23 have no byline — so the formatter has to be explicit about absence rather
 * than quietly closing the gap. `[no headline recorded]` is a usable citation;
 * a silently omitted title is not.
 */
import type { NewsArticle, Publication, Person } from './types';

export const SITE_TITLE = 'The Maurice Sievan Archive';

export interface CitationParts {
  /** The formatted reference. */
  text: string;
  /** True where the record is missing something a full citation would carry. */
  incomplete: boolean;
}

/**
 * Chicago-ish note form, adapted for an archival clipping:
 *   Author. "Headline." Publication, Date. Sievan Archive, MS-AR-00001-A.
 */
export function citeArticle(
  article: NewsArticle,
  publication: Publication | undefined,
  author: Person | undefined,
): CitationParts {
  const parts: string[] = [];
  let incomplete = false;

  const byline = author?.name ?? article.author_raw;
  if (byline) {
    // "P.B.R." and similar are real archival categories, not names — keep them as given.
    parts.push(`${byline}.`);
  } else {
    parts.push('[unattributed].');
    incomplete = true;
  }

  if (article.headline) {
    parts.push(`“${article.headline}.”`);
  } else {
    parts.push('[no headline recorded].');
    incomplete = true;
  }

  const pub = publication?.name ?? article.publication_raw;
  const date = article.date_text ?? (article.date_earliest ? String(article.date_earliest) : null);
  if (pub && date) parts.push(`${pub}, ${article.date_uncertain ? `${date}?` : date}.`);
  else if (pub) { parts.push(`${pub}, [date unknown].`); incomplete = true; }
  else { parts.push('[publication unknown].'); incomplete = true; }

  parts.push(`${SITE_TITLE}, ${article.id}.`);

  return { text: parts.join(' '), incomplete };
}

/**
 * How to cite the archive itself, or one record in it.
 *
 * The access date is left as a bracket for the reader to fill. Baking in the build
 * date would assert that they read it the day the site was compiled, which is false
 * and would silently drift with every deploy.
 */
export function citeArchive(path?: string): string {
  const base = `${SITE_TITLE}. Accessed [date].`;
  return path ? `${base} ${path}` : base;
}
