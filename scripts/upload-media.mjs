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
 * Idempotent: anything already present at the same size is left alone.
 */
import { readdirSync, existsSync, statSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { storageList, storageUpload, ensureBucket, requireCredentials, fail } from './supabase.mjs';
import { BUCKETS } from './media.mjs';

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

console.log(`\n  upload-media:${DRY ? ' DRY RUN —' : ''}`);
for (const [k, v] of log) console.log(`    ${k.padEnd(28)} ${v}`);
console.log(DRY ? '\n    nothing written\n' : '\n    done\n');
