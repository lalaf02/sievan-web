#!/usr/bin/env node
/**
 * Puts the archive's imagery into Supabase Storage, once.
 *
 *   node scripts/upload-media.mjs [--dry-run]
 *
 * Two sources, because the material arrived two ways:
 *   · The 56 scan PDFs are ALREADY in Storage, in the buckets the curator uploaded them
 *     to ("Articles and Media" for box 1, "Artwork" for box 2). They are consolidated
 *     into archive-scans/ with a server-side copy — no download, no re-upload, no egress.
 *   · The derived imagery (page images, thumbs, the retrospective sheets, the clips) only
 *     exists in public/, because it is produced by extract-scans.mjs, extract-clips.mjs
 *     and extract-retrospective.mjs from masters that are not migrating. Those upload.
 *
 * It also REGISTERS what it uploads in media_assets, which is why registration lives
 * here rather than in extract-scans.mjs / extract-clips.mjs as the backlog first proposed.
 * Two reasons. A media_assets row's natural key is (storage_bucket, storage_path) — a
 * partial unique index — and this is the only script that knows a file's storage path. And
 * the extractors are offline one-offs: they need sips, ffmpeg and the 25 GB of masters, and
 * requiring Supabase credentials to re-rasterise a sheet would be the wrong trade. One
 * enumeration of the files, in the place that already had to have it.
 *
 * Idempotent: anything already present at the same size is left alone, and every row's id
 * is derived from the row itself by uuidFor, so a re-run corrects rather than duplicates.
 */
import { readdirSync, existsSync, statSync, readFileSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { storageList, storageUpload, ensureBucket, requireCredentials, upsert, selectAll, fail } from './supabase.mjs';
import { BUCKETS, uuidFor } from './media.mjs';

const DRY = process.argv.includes('--dry-run');
requireCredentials();

// The four buckets the site reads from, created private if absent, so this script sets up
// a fresh project on its own rather than depending on someone remembering a dashboard step.
if (!DRY) for (const name of Object.keys(BUCKETS)) await ensureBucket(name);

/** Where the curator's original uploads sit, and the box each one holds. */
const EXISTING_SCAN_BUCKETS = ['Articles and Media', 'Artwork'];

const MIME = {
  '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.mp4': 'video/mp4', '.json': 'application/json',
};

/** Local directories to mirror: [bucket, local dir, path prefix inside the bucket]. */
const UPLOADS = [
  ['scan-pages',    'public/scans/pages',  'pages/'],
  ['scan-pages',    'public/scans/thumbs', 'thumbs/'],
  ['retrospective', 'public/retrospective', ''],
  ['clips',         'public/clips',         ''],
];

const log = [];

// ------------------------------------------------------ consolidate the existing scans
const target = new Map((await storageList('archive-scans')).map((o) => [o.path, o.size]));
let copied = 0;
let already = 0;

for (const bucket of EXISTING_SCAN_BUCKETS) {
  for (const obj of await storageList(bucket)) {
    // Only the box directories. "Articles and Media" also holds the interview transcript
    // PDFs under Video Archive/, which are provenance for the transcripts and not
    // something the site serves.
    if (!/^MS-CS-\d{3}\//.test(obj.path)) continue;
    if (target.get(obj.path) === obj.size) { already++; continue; }
    if (!DRY) {
      // Server-side copy: the bytes never leave Supabase.
      const { url, key } = requireCredentials();
      const res = await fetch(`${url}/storage/v1/object/copy`, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucketId: bucket, sourceKey: obj.path,
          destinationBucket: 'archive-scans', destinationKey: obj.path,
        }),
      });
      if (!res.ok) fail(`copy ${bucket}/${obj.path} -> archive-scans: ${res.status} ${await res.text()}`);
    }
    copied++;
  }
}
log.push(['archive-scans', `${copied} copied, ${already} already there`]);

// ------------------------------------------------------ upload the derived imagery
for (const [bucket, dir, prefix] of UPLOADS) {
  if (!existsSync(dir)) { log.push([bucket, `SKIPPED — ${dir} does not exist`]); continue; }
  const remote = new Map((await storageList(bucket)).map((o) => [o.path, o.size]));
  let sent = 0;
  let same = 0;
  for (const name of readdirSync(dir).sort()) {
    const local = join(dir, name);
    if (!statSync(local).isFile()) continue;
    const path = `${prefix}${name}`;
    const size = statSync(local).size;
    if (remote.get(path) === size) { same++; continue; }
    if (!DRY) {
      await storageUpload(bucket, path, readFileSync(local), MIME[extname(name).toLowerCase()] ?? 'application/octet-stream');
    }
    sent++;
  }
  log.push([`${bucket}/${prefix || '(root)'}`, `${sent} uploaded, ${same} already there`]);
}

// ------------------------------------------------------ register what the site serves
/*
 * media_assets held 68 rows — the 56 archival scans and the 12 offline video masters —
 * while the site serves 270 Storage objects. Everything above reached the site through
 * v_media_manifest, which is a raw storage.objects listing, so the registry could not
 * answer "what files does the archive hold". These rows close that.
 *
 * The owner FK is INHERITED, never recomputed. Whether an object is an artwork or an
 * article is decided by isArtwork() in seed-supabase.mjs, off a field that only the seed
 * shape carries; rather than keep a second copy of that rule here, each page and thumb
 * takes the artwork_id/article_id of the archival scan it was rasterised from, matched on
 * filename stem. A page whose stem matches no registered scan is reported, not guessed at.
 */
const registered = [];
{
  const scans = (await selectAll('media_assets'))
    .filter((a) => a.asset_type === 'archive_scan');
  const ownerByStem = new Map(scans.map((a) => [a.filename.replace(/\.[^.]+$/, ''), a]));

  /** page/thumb file -> the scan it came from. extract-scans.mjs names them <stem>-pNN.jpg. */
  const parentOf = (file) => ownerByStem.get(file.replace(/-p\d+\.jpg$/, ''));
  const pageNo = (file) => Number(file.match(/-p(\d+)\.jpg$/)?.[1] ?? 0);

  const rows = [];
  const orphans = [];

  const sheet = (key, bucket, path, local, parent, page, thumb) => ({
    id: uuidFor(key),
    asset_type: 'scan_page',
    storage_bucket: bucket,
    storage_path: path,
    filename: basename(local),
    ordinal: page,
    page_number: page,
    mime_type: 'image/jpeg',
    file_size_bytes: statSync(local).size,
    provenance_type: 'estate_scan',
    artwork_id: parent.artwork_id,
    article_id: parent.article_id,
    // The variant column is checked against raw|edited|subtitled and does not describe a
    // presentational derivative, so the distinction goes here rather than in a migration.
    // {} and not null: the column is NOT NULL DEFAULT '{}', and upsert() widens every row
    // to the union of the batch's keys, so an omitted key arrives as an explicit null.
    technical_metadata: thumb ? { derivative: 'thumbnail' } : {},
  });

  for (const [dir, kind, bucket, prefix] of [
    ['public/scans/pages', 'page', 'scan-pages', 'pages/'],
    ['public/scans/thumbs', 'thumb', 'scan-pages', 'thumbs/'],
  ]) {
    for (const file of existsSync(dir) ? readdirSync(dir).sort() : []) {
      if (!file.endsWith('.jpg')) continue;
      const parent = parentOf(file);
      if (!parent) { orphans.push(`${dir}/${file}`); continue; }
      const stem = file.replace(/-p\d+\.jpg$/, '');
      const n = pageNo(file);
      rows.push(sheet(`${kind}:${stem}:${n}`, bucket, `${prefix}${file}`,
        join(dir, file), parent, n, kind === 'thumb'));
    }
  }

  /*
   * The retrospective sheets are not a separate kind of thing: they ARE MS-AR-00026's page
   * images. extract-scans.mjs skips that PDF because extract-retrospective.mjs publishes
   * its fifteen pages with transcriptions attached, and build-data.mjs resolves the stem to
   * /retrospective/. Keying them as that object's pages removes the special case.
   */
  const retroParent = ownerByStem.get('MSAR00026');
  for (const file of existsSync('public/retrospective') ? readdirSync('public/retrospective').sort() : []) {
    if (!file.endsWith('.jpg')) continue;
    if (!retroParent) { orphans.push(`public/retrospective/${file}`); continue; }
    const n = Number(file.match(/p(\d+)/)?.[1] ?? 0);
    rows.push(sheet(`page:MSAR00026:${n}`, 'retrospective', file,
      join('public/retrospective', file), retroParent, n, false));
  }

  /*
   * Clips carry their interview, and their measurements come off clips.json rather than
   * being re-probed. clips.json itself is NOT registered: it is a manifest of the assets,
   * not one of them. provenance_type stays null rather than being forced into a category
   * that does not describe a cut from a master — the same call made for the masters.
   */
  const clipsManifest = existsSync('public/clips/clips.json')
    ? JSON.parse(readFileSync('public/clips/clips.json', 'utf8')) : [];
  for (const c of clipsManifest) {
    const mp4 = join('public/clips', basename(c.src));
    const jpg = join('public/clips', basename(c.poster));
    if (existsSync(mp4)) rows.push({
      id: uuidFor(`clip:${c.id}`), asset_type: 'video_clip',
      storage_bucket: 'clips', storage_path: basename(c.src), filename: basename(c.src),
      ordinal: 1, mime_type: 'video/mp4', file_size_bytes: statSync(mp4).size,
      width_px: c.width, height_px: c.height, duration_seconds: c.duration,
      interview_id: c.videoId, notes: c.alt, technical_metadata: {},
    });
    if (existsSync(jpg)) rows.push({
      id: uuidFor(`poster:${c.id}`), asset_type: 'poster_frame',
      storage_bucket: 'clips', storage_path: basename(c.poster), filename: basename(c.poster),
      ordinal: 1, mime_type: 'image/jpeg', file_size_bytes: statSync(jpg).size,
      width_px: c.width, height_px: c.height, interview_id: c.videoId,
      technical_metadata: {},
    });
  }

  if (orphans.length) {
    fail(`${orphans.length} image(s) have no registered archival scan to belong to. Their `
      + 'stem matches no media_assets row, so their owner cannot be inherited and must not '
      + `be guessed:\n  ${orphans.slice(0, 10).join('\n  ')}`);
  }

  // Gate the write, not the work: a dry run has to be able to say what it WOULD register,
  // or it is only testing half the script.
  if (!DRY) await upsert('media_assets', rows);
  const byType = {};
  for (const r of rows) byType[r.asset_type] = (byType[r.asset_type] ?? 0) + 1;
  for (const [t, n] of Object.entries(byType)) {
    registered.push([`media_assets/${t}`, `${n} ${DRY ? 'would be registered' : 'registered'}`]);
  }
}

console.log(`\n  upload-media:${DRY ? ' DRY RUN —' : ''}`);
for (const [k, v] of [...log, ...registered]) console.log(`    ${k.padEnd(28)} ${v}`);
console.log(DRY ? '\n    nothing written\n' : '\n    done\n');
