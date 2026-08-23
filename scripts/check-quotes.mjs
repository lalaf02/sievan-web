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

const { ALL_QUOTES } = await import('../lib/quotes.ts');
const { needleRegex } = await import('../lib/search.ts');

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

if (errors.length) {
  console.error(`\n  check-quotes: ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  ${e}`);
  console.error('');
  process.exit(1);
}

console.log(`  check-quotes: OK - ${ALL_QUOTES.length} quotes anchor to real transcript passages`);
