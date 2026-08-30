#!/usr/bin/env node
/**
 * One-way load of DataModel/seed/*.json into Supabase.
 *
 * Run once to migrate, and kept afterwards so the load is reproducible and reviewable
 * rather than a thing that happened once in a chat window. It is idempotent: every write
 * is an upsert keyed on the record's own id, so re-running corrects rather than duplicates.
 *
 *   node scripts/seed-supabase.mjs [--from <dir>] [--dry-run]
 *
 * After the cutover the seeds are gone and this script has no input. Box 3 arrives through
 * DataModel/scripts/parse_master_sheet.py writing to Supabase directly.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { upsert, requireCredentials, fail } from './supabase.mjs';

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const FROM = args.includes('--from') ? args[args.indexOf('--from') + 1] : 'DataModel/seed';
const TRANSCRIPTS = args.includes('--transcripts')
  ? args[args.indexOf('--transcripts') + 1] : 'DataModel/transcripts';
const DURATIONS = 'DataModel/work/durations.json';

if (!DRY) requireCredentials();
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const seed = (name) => {
  const p = join(FROM, name);
  if (!existsSync(p)) fail(`missing ${p} — pass --from <dir> if the seeds live elsewhere`);
  return read(p);
};

/** Keep only the listed columns, dropping keys the table does not have. */
const pick = (row, cols) => Object.fromEntries(cols.filter((c) => c in row).map((c) => [c, row[c]]));

/**
 * Carry the seed's own row order into sort_order.
 *
 * Two seeds are not id-ordered and the sequence is the curator's: exhibitions run
 * chronologically, places in their own order. It is also load-bearing — build-data.mjs
 * iterates data.exhibitions to build exhibitionsByObject and exhibitionsByPlace, so a
 * reshuffle silently reorders the cross-links on every record page. The api.v_* views
 * order by this column.
 */
const ordered = (rows) => rows.map((r, i) => ({ ...r, sort_order: i }));

const loaded = [];
async function load(table, rows, label = table) {
  if (DRY) { loaded.push([label, rows.length]); return; }
  await upsert(table, rows);
  loaded.push([label, rows.length]);
}

// ------------------------------------------------------------------ read the seeds
const collections  = seed('seed_collections.json');
const publications = seed('seed_publications.json');
const persons      = seed('seed_persons.json');
const places       = seed('seed_places.json');
const exhibitions  = seed('seed_exhibitions.json');
const paintings    = seed('seed_paintings.json');
const objects      = seed('seed_archive_objects.json');
const articles     = seed('seed_news_articles.json');
const attested     = seed('seed_attested_works.json');
const videos       = seed('seed_video_assets.json');

// ------------------------------------------------------------------ flatten the nesting
// scan_files and media_files are arrays of objects and become child tables. `ordinal`
// carries the seed's own order, which is what the views read back: MS-AR-00003's two
// scans are parts I and II and their sequence is the record.
const objectScans = objects.flatMap((o) => (o.scan_files ?? []).map((s, i) => ({
  archive_object_id: o.id, ordinal: i, filename: s.filename, part_label: s.part_label ?? null,
})));

const mediaFiles = videos.flatMap((v) => (v.media_files ?? []).map((m, i) => ({
  video_id: v.id, ordinal: i, filename: m.filename, variant: m.variant,
  path: m.path, size_bytes: m.size_bytes ?? null,
})));

// `certain` is absent on 33 of 37 place_refs and false on the other 4. Absent stays null,
// and the view emits the key only when it is set — the source said nothing either way.
const attestedPlaces = attested.flatMap((w) => (w.place_refs ?? []).map((r, i) => ({
  attested_work_id: w.id, ordinal: i, place_id: r.place_id, role: r.role,
  certain: r.certain ?? null,
})));

// ArchiveObject.artwork inlines into four columns. Its PRESENCE promotes a row into a
// catalogue entry, so absent must stay absent, never {} or a row of nulls.
const objectRows = objects.map((o) => ({
  ...pick(o, ['id', 'collection_id', 'seq', 'folder_no', 'raw_title_description', 'date_text',
    'date_earliest', 'date_latest', 'copies_count', 'medium', 'medium_raw', 'condition',
    'digital_record_id', 'object_type', 'stated_item_count']),
  artwork_medium_stated: o.artwork?.medium_stated ?? null,
  artwork_support:       o.artwork?.support ?? null,
  artwork_signed:        o.artwork?.signed ?? null,
  artwork_sheet_count:   o.artwork?.sheet_count ?? null,
}));

// Real runtimes measured off the masters. Every VideoAsset ships duration_seconds: null,
// and this is the one part of the archive with no sense of scale attached — "4,769 words"
// tells a reader nothing about whether that is ten minutes or an hour. The edited cut is
// canonical; the subtitled variant differs by hundredths of a second.
const durations = existsSync(DURATIONS) ? read(DURATIONS) : {};
const videoRows = videos.map((v) => {
  const row = pick(v, ['id', 'collection_id', 'subject_type', 'subject_person_ids', 'title',
    'physical_tape_no', 'interview_date', 'date_text', 'date_earliest', 'date_latest',
    'location', 'transcript_source_file', 'transcript_text_file', 'transcript_word_count',
    'transcript_page_count', 'duration_seconds', 'topics', 'review_status', 'notes']);
  if (row.duration_seconds == null) {
    for (const variant of ['edited', 'subtitled', 'raw']) {
      const d = durations[`${v.id}:${variant}`];
      if (d != null) { row.duration_seconds = Math.round(d); break; }
    }
  }
  return row;
});

// The transcripts go in as the verbatim extracted text, unparsed. parseTranscript() in
// build-data.mjs holds the knowledge about the dislocated speaker column and the ~100-char
// hard wrap; splitting here would bake one parse into the record and lose the artifact.
const transcripts = videos
  .filter((v) => v.transcript_text_file)
  .map((v) => {
    const p = join(TRANSCRIPTS, v.transcript_text_file.split('/').pop());
    if (!existsSync(p)) fail(`missing transcript ${p} for ${v.id}`);
    return { video_id: v.id, source_file: v.transcript_text_file, text: readFileSync(p, 'utf8') };
  });

// ------------------------------------------------------------------ write, in FK order
await load('collections',  ordered(collections));
await load('publications', ordered(publications));
await load('persons',      ordered(persons));

// places.parent_id is a self-reference, so seed the rows flat and then set the parents.
await load('places', ordered(places).map((p) => ({ ...p, parent_id: null })), 'places (pass 1)');
await load('places', ordered(places), 'places (parents)');

await load('exhibitions',          ordered(exhibitions));
await load('paintings',            ordered(paintings));
await load('archive_objects',      ordered(objectRows));
await load('archive_object_scans', objectScans);
await load('news_articles',        ordered(articles));
// place_refs is the one nested array on an attestation and becomes attested_work_places.
await load('attested_works', ordered(attested.map(
  (w) => Object.fromEntries(Object.entries(w).filter(([k]) => k !== 'place_refs')),
)));
await load('attested_work_places', attestedPlaces);
await load('video_assets',         ordered(videoRows));
await load('video_media_files',    mediaFiles);
await load('transcript_texts',     transcripts);

const words = transcripts.reduce((n, t) => n + t.text.split(/\s+/).filter(Boolean).length, 0);
console.log(`\n  seed-supabase:${DRY ? ' DRY RUN —' : ''}`);
for (const [t, n] of loaded) console.log(`    ${String(n).padStart(4)}  ${t}`);
console.log(`\n    ${transcripts.length} transcripts (~${words.toLocaleString()} words)`);
console.log(DRY ? '    nothing written\n' : '    written\n');
