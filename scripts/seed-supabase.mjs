#!/usr/bin/env node
/**
 * Loads seed-shaped JSON into Supabase's seven-table core.
 *
 * This is the RESTORE half of the archive's escape hatch. export-seeds.mjs dumps the live
 * database back out as seed-shaped JSON so the record can leave this hosting account; this
 * reads that dump back into an empty database. The two must stay inverses of each other,
 * and the round trip is the test: export, restore, export again, diff.
 *
 *   node scripts/seed-supabase.mjs --from snapshot/seed --transcripts snapshot/transcripts
 *   node scripts/seed-supabase.mjs [--from <dir>] [--dry-run]
 *
 * The seed files keep the OLD entity shape on purpose -- it is the portable format, and it
 * is what the api.v_* views still emit. Translating it into artworks / artwork_mentions /
 * articles / interviews / media_assets / people / events happens here, and this file is
 * the exact inverse of those views. Change one and you must change the other.
 *
 * It is idempotent: every write is an upsert keyed on the record's own id, so re-running
 * corrects rather than duplicates. media_assets has no natural id, so one is derived --
 * see uuidFor below.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
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
// The seed files keep the OLD entity shape, deliberately. They are the portable copy of
// the archive -- the thing that outlives this hosting account -- and export-seeds.mjs
// still writes them in exactly that shape, because the api.v_* views still emit it. This
// script is where the two shapes meet: it translates the seed's entities into the
// seven-table core, and it is the exact inverse of the views.
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

// ------------------------------------------------------------------ people
const peopleRows = persons.map((p) => ({
  id: p.id, display_name: p.name, aliases: p.aliases, roles: p.roles, notes: p.notes ?? null,
}));

// ------------------------------------------------------------------ events
const eventRows = exhibitions.map((e) => ({
  id: e.id, event_type: 'exhibition', name: e.name ?? null,
  venue_name: e.gallery_or_venue, venue_city: e.venue_city ?? null,
  venue_place_id: e.venue_place_id ?? null,
  start_date: e.start_date ?? null, end_date: e.end_date ?? null,
  date_earliest: e.date_earliest ?? null, date_latest: e.date_latest ?? null,
  exhibition_type: e.exhibition_type ?? null, confidence: e.confidence,
  source_archive_object_ids: e.source_archive_object_ids,
  source_article_ids: e.source_article_ids,
  notes: e.notes ?? null,
}));

// ------------------------------------------------------------------ artworks
// ArchiveObject.artwork is what promotes a row into the catalogue. Its PRESENCE is the
// signal -- absent means "a document about the art" -- so it is what splits the 76 objects
// between artworks and articles here, exactly as it split them in the migration.
const isArtwork = (o) => o.artwork != null;

// The 76 objects are split across two tables now, but api.v_archive_objects UNIONs them
// back together and orders the result by sort_order. So the two halves must share ONE
// sequence: numbering artworks 0..24 and containers 0..50 independently interleaves them
// and silently reorders /archive/. That is what happened the first time this ran, and the
// only thing that caught it was diffing an export against the backup it was restored from.
const objectOrder = new Map(objects.map((o, i) => [o.id, i]));

// The object's own `medium` is photocopy/original: a fact about the sheet in the box, not
// about the work drawn on it. It goes to object_medium so that `medium` can mean what the
// catalogue means by it.
const artworkRows = objects.filter(isArtwork).map((o) => ({
  id: o.id, archive_id: o.id, artwork_type: 'drawing',
  date_display: o.date_text ?? null,
  year_start: o.date_earliest ?? null, year_end: o.date_latest ?? null,
  medium: o.artwork.medium_stated ?? null, support: o.artwork.support ?? null,
  signed_text: o.artwork.signed ?? null, sheet_count: o.artwork.sheet_count ?? null,
  catalogue_status: 'catalogued', publication_status: 'published',
  raw_description: o.raw_title_description,
  collection_id: o.collection_id, seq: o.seq ?? null, folder_no: o.folder_no ?? null,
  copies_count: o.copies_count ?? null,
  object_medium: o.medium ?? null, object_medium_raw: o.medium_raw ?? null,
  condition: o.condition ?? null, digital_record_id: o.digital_record_id ?? null,
  stated_item_count: o.stated_item_count ?? null,
  sort_order: objectOrder.get(o.id),
}));

// A catalogued painting is an artwork typed 'painting'. Empty today; written out so the
// path is exercised rather than discovered the day the catalogue arrives.
const paintingRows = paintings.map((p, i) => ({
  id: p.id, artwork_type: 'painting', title: p.title ?? null,
  date_display: p.date_text ?? null,
  year_start: p.date_earliest ?? null, year_end: p.date_latest ?? null,
  medium: p.medium ?? null, dimensions_text: p.dimensions ?? null,
  current_location: p.current_location ?? null, image_ref: p.image_ref ?? null,
  catalogue_status: p.catalog_status, publication_status: 'published',
  // A different view (api.v_paintings) filters these, so they order among themselves.
  sort_order: i, notes: p.notes ?? null,
}));

// ------------------------------------------------------------------ articles
// The 51 objects that are documents become container articles; the 60 clippings become
// press notices pointing at them through parent_article_id.
const containerRows = objects.filter((o) => !isArtwork(o)).map((o) => ({
  id: o.id, archive_id: o.id, article_type: o.object_type,
  raw_description: o.raw_title_description,
  date_text: o.date_text ?? null,
  date_earliest: o.date_earliest ?? null, date_latest: o.date_latest ?? null,
  collection_id: o.collection_id, seq: o.seq ?? null, folder_no: o.folder_no ?? null,
  copies_count: o.copies_count ?? null,
  object_medium: o.medium ?? null, object_medium_raw: o.medium_raw ?? null,
  condition: o.condition ?? null, digital_record_id: o.digital_record_id ?? null,
  stated_item_count: o.stated_item_count ?? null,
  publication_status: 'published',
  sort_order: objectOrder.get(o.id),
}));

const noticeRows = articles.map((a) => ({
  id: a.id, archive_id: a.id, article_type: 'press_notice',
  parent_article_id: a.archive_object_id,
  title: a.headline ?? null, raw_description: a.raw_source_text,
  publication_id: a.publication_id ?? null, publication_raw: a.publication_raw ?? null,
  author_person_id: a.author_person_id ?? null, author_raw: a.author_raw ?? null,
  date_text: a.date_text ?? null, date_normalized: a.date_normalized ?? null,
  date_earliest: a.date_earliest ?? null, date_latest: a.date_latest ?? null,
  date_uncertain: a.date_uncertain,
  event_id: a.exhibition_id ?? null,
  parse_confidence: a.parse_confidence, continuation_joined: a.continuation_joined,
  review_status: a.review_status, reviewer: a.reviewer ?? null,
  reviewed_at: a.reviewed_at ?? null, publication_status: 'published',
  notes: a.notes ?? null,
}));

// ------------------------------------------------------------------ artwork mentions
// `certain` is absent on 33 of 37 place_refs and false on the other 4. Absent stays null,
// and the view emits the key only when it is set -- the source said nothing either way.
const mentionPlaces = attested.flatMap((w) => (w.place_refs ?? []).map((r, i) => ({
  artwork_mention_id: w.id, ordinal: i, place_id: r.place_id, role: r.role,
  certain: r.certain ?? null,
})));

// source_type/source_id was one polymorphic pair; it is three real foreign keys now, and
// the table's check constraint enforces that exactly one is set.
const SOURCE_COLUMN = {
  archive_object: 'source_artwork_id',
  news_article:   'source_article_id',
  video_asset:    'source_interview_id',
};

const mentionRows = attested.map((w) => {
  const col = SOURCE_COLUMN[w.source_type];
  if (!col) fail(`${w.id}: unknown source_type ${w.source_type}`);
  return {
    id: w.id,
    source_artwork_id: null, source_article_id: null, source_interview_id: null,
    [col]: w.source_id,
    source_page: w.source_page ?? null, sheet_position: w.sheet_position ?? null,
    quote: w.quote,
    title_as_written: w.title_stated ?? null, artist_number: w.artist_number ?? null,
    dimensions_as_written: w.dimensions_stated ?? null,
    medium_as_written: w.medium_stated ?? null,
    date_as_written: w.date_text ?? null,
    date_earliest: w.date_earliest ?? null, date_latest: w.date_latest ?? null,
    date_uncertain: w.date_uncertain ?? null, date_basis: w.date_basis ?? null,
    price_as_written: w.price_stated ?? null, price_usd: w.price_usd ?? null,
    dispositions: w.dispositions,
    buyer_as_written: w.counterparty_raw ?? null,
    counterparty_person_id: w.counterparty_person_id ?? null,
    artwork_id: w.painting_id ?? null,
    identification_basis: w.identification_basis ?? null,
    // Derived, not invented: no identified artwork is exactly what 'unresolved' means.
    identification_status: w.painting_id == null ? 'unresolved' : 'identified',
    review_status: w.review_status, notes: w.notes ?? null,
  };
});

// ------------------------------------------------------------------ interviews
// Real runtimes measured off the masters. Every VideoAsset ships duration_seconds: null,
// and this is the one part of the archive with no sense of scale attached — "4,769 words"
// tells a reader nothing about whether that is ten minutes or an hour. The edited cut is
// canonical; the subtitled variant differs by hundredths of a second.
const durations = existsSync(DURATIONS) ? read(DURATIONS) : {};
const durationFor = (id, stated) => {
  if (stated != null) return stated;
  for (const variant of ['edited', 'subtitled', 'raw']) {
    const d = durations[`${id}:${variant}`];
    if (d != null) return Math.round(d);
  }
  return null;
};

// The transcripts go in as the verbatim extracted text, unparsed. parseTranscript() in
// build-data.mjs holds the knowledge about the dislocated speaker column and the ~100-char
// hard wrap; splitting here would bake one parse into the record and lose the artifact.
//
// Two filenames are accepted, and both are real. export-seeds.mjs writes `<id>.txt`,
// because the video id is the only name it can know from the database; the original
// DataModel/transcripts/ used `<id>_<slug>.txt`. Looking for only one of them silently
// broke the export -> restore round trip that the escape hatch depends on, which is how
// this was found: restoring the archive's own backup failed on the first transcript.
const transcriptFor = (v) => {
  if (!v.transcript_text_file) return null;
  const names = [`${v.id}.txt`, v.transcript_text_file.split('/').pop()];
  const found = names.map((n) => join(TRANSCRIPTS, n)).find(existsSync);
  if (!found) fail(`no transcript for ${v.id} in ${TRANSCRIPTS}/ (looked for ${names.join(' or ')})`);
  return readFileSync(found, 'utf8');
};

const interviewRows = videos.map((v) => ({
  id: v.id, archive_id: v.id, collection_id: v.collection_id,
  subject_type: v.subject_type, subject_person_ids: v.subject_person_ids,
  title: v.title, physical_tape_no: v.physical_tape_no ?? null,
  interview_date: v.interview_date ?? null, date_text: v.date_text ?? null,
  date_earliest: v.date_earliest ?? null, date_latest: v.date_latest ?? null,
  location: v.location ?? null,
  duration_seconds: durationFor(v.id, v.duration_seconds),
  transcript_text: transcriptFor(v),
  transcript_source_file: v.transcript_source_file ?? null,
  transcript_text_file: v.transcript_text_file ?? null,
  transcript_word_count: v.transcript_word_count ?? null,
  transcript_page_count: v.transcript_page_count ?? null,
  topics: v.topics, review_status: v.review_status,
  publication_status: 'published', notes: v.notes ?? null,
}));

// ------------------------------------------------------------------ media assets
// media_assets has a generated uuid primary key, so a natural key has to be derived or
// re-running this script would duplicate every file rather than correct it. A name-based
// UUID (RFC 4122 v5, SHA-1 over a fixed namespace) makes the id a function of the row, so
// the load stays idempotent like every other table here.
// Standard RFC 4122 v5, not a private hashing scheme, so Postgres can compute the same id
// with uuid_generate_v5(MEDIA_NS, key) -- which is how the migration backfilled the rows
// this script now upserts over. If the two ever disagree, a restore doubles every file
// instead of correcting it, and nothing else would notice.
const MEDIA_NS = '6ee23f40-0276-5d37-9e2d-4b3aebe11e13';
const uuidFor = (key) => {
  const ns = Buffer.from(MEDIA_NS.replace(/-/g, ''), 'hex');
  const h = createHash('sha1').update(ns).update(key, 'utf8').digest();
  h[6] = (h[6] & 0x0f) | 0x50;   // version 5
  h[8] = (h[8] & 0x3f) | 0x80;   // RFC 4122 variant
  const s = h.subarray(0, 16).toString('hex');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
};

// The archive-scans bucket keeps its MS-CS-00N/ prefix in Storage — provenance, and the
// rule that makes the next box work without an edit. media.mjs owns that layout; this
// mirrors it, and every one of the 56 paths it builds was verified against storage.objects
// during the migration.
const scanAssets = objects.flatMap((o) => (o.scan_files ?? []).map((s, i) => ({
  id: uuidFor(`scan:${o.id}:${i}`),
  asset_type: 'archive_scan',
  storage_bucket: 'archive-scans',
  storage_path: `${o.collection_id}/${s.filename}`,
  filename: s.filename, ordinal: i, part_label: s.part_label ?? null,
  provenance_type: 'estate_scan',
  artwork_id: isArtwork(o) ? o.id : null,
  article_id: isArtwork(o) ? null : o.id,
})));

// The masters are 25 GB on the curator's own disk and are in no bucket, so bucket and path
// stay null and the offline location goes in local_path. provenance_type is left null
// rather than forced into a category that does not describe a video master.
const videoAssets = videos.flatMap((v) => (v.media_files ?? []).map((m, i) => ({
  id: uuidFor(`video:${v.id}:${i}`),
  asset_type: 'video_master',
  filename: m.filename, ordinal: i, variant: m.variant,
  local_path: m.path, file_size_bytes: m.size_bytes ?? null,
  interview_id: v.id,
})));

// ------------------------------------------------------------------ write, in FK order
await load('collections',  ordered(collections));
await load('publications', ordered(publications));
await load('people',       ordered(peopleRows));

// places.parent_id is a self-reference, so seed the rows flat and then set the parents.
await load('places', ordered(places).map((p) => ({ ...p, parent_id: null })), 'places (pass 1)');
await load('places', ordered(places), 'places (parents)');

await load('events',   ordered(eventRows));
// NOT ordered(): artworks and articles both carry a sort_order set above, because the
// drawings and the containers share the sequence api.v_archive_objects orders by.
await load('artworks', [...artworkRows, ...paintingRows]);

// Containers before notices: parent_article_id points backwards into the same table.
// The notices are filtered into their own view, so they order among themselves.
await load('articles', containerRows,        'articles (containers)');
await load('articles', ordered(noticeRows),  'articles (press notices)');

await load('interviews',             ordered(interviewRows));
await load('artwork_mentions',       ordered(mentionRows));
await load('artwork_mention_places', mentionPlaces);
await load('media_assets',           [...scanAssets, ...videoAssets]);

const words = interviewRows
  .filter((v) => v.transcript_text)
  .reduce((n, v) => n + v.transcript_text.split(/\s+/).filter(Boolean).length, 0);
const withText = interviewRows.filter((v) => v.transcript_text).length;
console.log(`\n  seed-supabase:${DRY ? ' DRY RUN —' : ''}`);
for (const [t, n] of loaded) console.log(`    ${String(n).padStart(4)}  ${t}`);
console.log(`\n    ${withText} transcripts (~${words.toLocaleString()} words)`);
console.log(DRY ? '    nothing written\n' : '    written\n');
