#!/usr/bin/env node
/**
 * Every curated quote claims a transcript page and an anchor phrase. This proves
 * both: the anchor must appear on that page of that transcript, after the same
 * normalisation `lib/search.ts` applies when it highlights.
 *
 * Without this the deep links rot silently — a reworded quote still renders, still
 * links, and simply highlights nothing when a reader clicks it. That failure is
 * invisible in a build and obvious to the one person who checks a citation.
 *
 * Runs after build-data.mjs, which writes data/transcripts/*.json.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = join(HERE, '..');

// Mirrors normalize() in lib/search.ts.
const normalize = (s) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ');

/*
 * These are .ts imports from a .mjs script, which relies on Node's TypeScript
 * stripping (unflagged from 22.18 / 23.6). package.json pins `engines.node`
 * accordingly. If that pin is ever lost the raw failure is an opaque
 * ERR_UNKNOWN_FILE_EXTENSION during `prebuild`, which on a CI host means the
 * build never runs and the previous deployment quietly stays live — so say
 * plainly what is wrong rather than letting the stack trace speak.
 */
let ALL_QUOTES, needleRegex;
try {
  ({ ALL_QUOTES } = await import('../lib/quotes.ts'));
  ({ needleRegex } = await import('../lib/search.ts'));
} catch (err) {
  if (err?.code === 'ERR_UNKNOWN_FILE_EXTENSION') {
    console.error(
      `\n  check-quotes: this Node (${process.version}) cannot import TypeScript.\n`
      + '  Needs Node >= 22.18 (see engines.node in package.json).\n',
    );
    process.exit(1);
  }
  throw err;
}

const errors = [];
const seen = new Set();
const cache = new Map();

function pagesFor(videoId) {
  if (cache.has(videoId)) return cache.get(videoId);
  const p = join(WEB, 'data', 'transcripts', `${videoId}.json`);
  const pages = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
  cache.set(videoId, pages);
  return pages;
}

for (const q of ALL_QUOTES) {
  if (seen.has(q.id)) errors.push(`duplicate quote id: ${q.id}`);
  seen.add(q.id);

  const videoId = /MS-VI-\d+/.exec(q.source)?.[0];
  if (!videoId) {
    errors.push(`${q.id}: source is not an interview route (${q.source})`);
    continue;
  }

  const pages = pagesFor(videoId);
  if (!pages) {
    errors.push(`${q.id}: no transcript generated for ${videoId}`);
    continue;
  }

  const page = pages.find((p) => p.page === q.page);
  if (!page) {
    errors.push(`${q.id}: ${videoId} has no page ${q.page}`);
    continue;
  }

  // Exactly what highlightNeedles() will search for at runtime.
  const anchor = normalize(q.anchor).trim();
  if (anchor.split(' ').length < 3) {
    errors.push(`${q.id}: anchor "${q.anchor}" is too short to identify a passage`);
    continue;
  }

  const hits = (hay) => needleRegex(anchor).test(hay);
  if (!hits(normalize(page.paragraphs.join(' ')))) {
    // Say where it actually is, so the fix is a one-line page change.
    const elsewhere = pages.find((p) => hits(normalize(p.paragraphs.join(' '))));
    errors.push(
      `${q.id}: anchor "${q.anchor}" not on ${videoId} page ${q.page}`
      + (elsewhere ? ` — found on page ${elsewhere.page}` : ' — not found in this transcript at all'),
    );
  }
}

/*
 * Every attested work rests on words from a source the archive holds, and this is
 * the gate that makes that claim mean something: a row may not assert a title, a
 * size or a buyer unless the source's own recorded text contains the quote it cites.
 *
 * Without it "attested" is just a label. With it, a reader can click through from
 * any row to the sheet and read the same words — which is the only reason this
 * archive is allowed to name forty-odd paintings it does not hold.
 *
 * Normalises whitespace, quote glyphs and dashes only, because the transcriptions
 * mix straight and curly quotes and carry trailing spaces from the spreadsheet.
 * Deliberately NOT the search normaliser: this must still notice a changed word.
 */
const canon = (s) => s.normalize('NFKC')
  .replace(/[‘’‛]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/[‐-―]/g, '-')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const bundlePath = join(WEB, 'data', 'archive.generated.json');
let attested = 0;
if (existsSync(bundlePath)) {
  const d = JSON.parse(readFileSync(bundlePath, 'utf8'));
  const objects = new Map(d.archiveObjects.map((o) => [o.id, o]));
  const articles = new Map(d.newsArticles.map((a) => [a.id, a]));

  for (const w of d.attestedWorks ?? []) {
    attested++;
    const src = w.source_type === 'archive_object'
      ? objects.get(w.source_id)?.raw_title_description
      : w.source_type === 'news_article'
        ? articles.get(w.source_id)?.raw_source_text
        : null; // a video_asset quote would verify against its transcript
    if (src == null) continue;
    if (!canon(src).includes(canon(w.quote))) {
      errors.push(
        `${w.id}: quote not found in ${w.source_id}\n      wanted: ${w.quote}`,
      );
    }
  }
}

if (errors.length) {
  console.error(`\n  check-quotes: ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  ${e}`);
  console.error('');
  process.exit(1);
}

console.log(
  `  check-quotes: OK - ${ALL_QUOTES.length} quotes anchor to real transcript passages`
  + (attested ? `\n                ${attested} attested works quote their source verbatim` : ''),
);
