#!/usr/bin/env node
/**
 * Dumps the live archive back out of Supabase as seed-shaped JSON.
 *
 *   node scripts/export-seeds.mjs [--out snapshot]
 *
 * This is the escape hatch, and it is the same argument the static export makes for the
 * pages: the record must outlive any one hosting account. `output: 'export'` means the
 * SITE survives; this means the EDITABLE SOURCE does. Without it, moving off Supabase
 * would mean reconstructing 302 records from rendered HTML.
 *
 * Run it before any schema change, and keep the output. The files it writes are exactly
 * what DataModel/seed/*.json held, so scripts/seed-supabase.mjs can load them straight
 * back into an empty database.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { selectAll } from './supabase.mjs';
import { VIEWS } from './fetch-data.mjs';

const args = process.argv.slice(2);
const OUT = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'snapshot';

/** dataset key -> the seed filename it came from, so a restore needs no translation. */
const FILES = {
  collections: 'seed_collections.json',
  publications: 'seed_publications.json',
  persons: 'seed_persons.json',
  exhibitions: 'seed_exhibitions.json',
  videoAssets: 'seed_video_assets.json',
  paintings: 'seed_paintings.json',
  places: 'seed_places.json',
  attestedWorks: 'seed_attested_works.json',
  commentary: 'seed_commentary.json',
  commentaryRelations: 'seed_commentary_relations.json',
  paintingHistoricalContext: 'seed_painting_historical_context.json',
  paintingExhibitions: 'seed_painting_exhibitions.json',
  historicalEvents: 'seed_historical_events.json',
  scholarship: 'seed_scholarship.json',
  archiveObjects: 'seed_archive_objects.json',
  newsArticles: 'seed_news_articles.json',
};

mkdirSync(join(OUT, 'seed'), { recursive: true });
mkdirSync(join(OUT, 'transcripts'), { recursive: true });

let rows = 0;
for (const [view, key] of Object.entries(VIEWS)) {
  const data = await selectAll(view, { order: '', schema: 'api' });
  writeFileSync(join(OUT, 'seed', FILES[key]), `${JSON.stringify(data, null, 2)}\n`);
  rows += data.length;
}

// The transcripts go back out as the plain text they came in as, under the filename the
// video record still names.
const transcripts = await selectAll('v_transcript_texts', { order: 'video_id.asc', schema: 'api' });
for (const t of transcripts) {
  writeFileSync(join(OUT, 'transcripts', `${t.video_id}.txt`), t.text);
}

console.log(`\n  export-seeds: ${rows} records + ${transcripts.length} transcripts -> ${OUT}/`);
console.log('                the archive, in a form that needs no Supabase to read\n');
