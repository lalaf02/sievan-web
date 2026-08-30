/**
 * Where the archive's images live, and how they get between Supabase Storage and public/.
 *
 * The layout is defined ONCE, here, because two scripts have to agree on it exactly:
 * upload-media.mjs puts files in, and build-data.mjs takes them out. A mismatch between
 * the two is invisible until a page renders a broken image, which no gate can see.
 *
 * Every bucket is private. The build authenticates with the secret key and downloads;
 * nothing is publicly readable, so there is no second uncontrolled copy of the archive on
 * the internet and no per-visitor egress. The published site serves its own copies out of
 * out/, which is also what lets the export survive this hosting account.
 */
import { mkdirSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { storageDownload } from './supabase.mjs';

/**
 * The id of a media_assets row, derived from what the row IS.
 *
 * media_assets has a generated uuid primary key, so a natural key has to be derived or
 * every load would duplicate a file rather than correct it. A name-based UUID (RFC 4122
 * v5, SHA-1 over a fixed namespace) makes the id a function of the row, which is what
 * keeps seed-supabase.mjs and upload-media.mjs idempotent.
 *
 * Standard RFC 4122 v5, not a private hashing scheme, so Postgres can compute the same id
 * with uuid_generate_v5(MEDIA_NS, key) — which is how the migration backfilled the rows
 * these scripts now upsert over. It lives HERE, beside the bucket layout, for the reason
 * this file exists: two scripts have to agree exactly, and a second copy of this function
 * that drifted would double every file on the next restore with nothing else noticing.
 *
 * Keys in use, one shape per kind of file:
 *   scan:<objectId>:<ordinal>     the archival PDF          seed-supabase.mjs
 *   video:<interviewId>:<ordinal> the offline master        seed-supabase.mjs
 *   page:<stem>:<n>               a rasterised sheet        upload-media.mjs
 *   thumb:<stem>:<n>              its thumbnail             upload-media.mjs
 *   clip:<clipId> / poster:<clipId>                         upload-media.mjs
 */
export const MEDIA_NS = '6ee23f40-0276-5d37-9e2d-4b3aebe11e13';

export const uuidFor = (key) => {
  const ns = Buffer.from(MEDIA_NS.replace(/-/g, ''), 'hex');
  const h = createHash('sha1').update(ns).update(key, 'utf8').digest();
  h[6] = (h[6] & 0x0f) | 0x50;   // version 5
  h[8] = (h[8] & 0x3f) | 0x80;   // RFC 4122 variant
  const x = h.subarray(0, 16).toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
};

/**
 * bucket -> the directory under the repo root its objects land in.
 *
 * A bucket that is not listed here is not part of the site. That is deliberate and is
 * doing real work: "Articles and Media" also holds the interview transcript PDFs under
 * Video Archive/, which are provenance for the transcripts and not something a page
 * renders, and syncMedia skips them because they have no entry.
 */
export const BUCKETS = {
  /** The archival objects themselves: the PDF a reader can download, one prefix per box. */
  'archive-scans': 'public/scans',
  /** Page images and thumbs from extract-scans.mjs. Only these can go in an <img>. */
  'scan-pages': 'public/scans',
  /** The retrospective catalogue's fifteen transcribed sheets. */
  retrospective: 'public/retrospective',
  /** Silent video loops and their posters, from extract-clips.mjs. */
  clips: 'public/clips',
};

/**
 * Storage path -> path under public/.
 *
 * archive-scans keeps its MS-CS-00N/ prefix in Storage — provenance, and the rule that
 * makes box 3 work without an edit — but flattens on the way out, because the site has
 * always served /scans/MSAR00001.pdf and the box id is shelving that no reader should see.
 */
export function localPathFor(bucket, path) {
  const dir = BUCKETS[bucket];
  if (!dir) return null;
  const rel = bucket === 'archive-scans' ? path.replace(/^MS-[A-Z]{2}-\d{3}\//, '') : path;
  // A box directory is the only nesting archive-scans is allowed; anything deeper is a
  // file that does not belong to the site. This also refuses a path that tries to climb
  // out of public/ — the same guard isValidFilename makes on the record side.
  if (rel.includes('/') && bucket === 'archive-scans') return null;
  if (rel.split('/').some((seg) => seg === '..' || seg === '')) return null;
  return join(dir, rel);
}

/**
 * Bring public/ into line with Storage, downloading only what is missing or the wrong size.
 *
 * Without the skip, every Vercel deploy pulls ~182 MB against a 5 GB monthly allowance —
 * about 27 builds. With it, and with Vercel's build cache over public/, a normal build
 * downloads nothing at all. Size is the comparison because Storage records it on every
 * object; it catches a truncated or replaced file, which is what actually goes wrong.
 */
export async function syncMedia(manifest, { root = process.cwd(), onProgress } = {}) {
  const wanted = [];
  for (const [key, row] of manifest) {
    const slash = key.indexOf('/');
    const bucket = key.slice(0, slash);
    const path = key.slice(slash + 1);
    const local = localPathFor(bucket, path);
    if (local) wanted.push({ bucket, path, local: join(root, local), size: row.size_bytes });
  }

  let downloaded = 0;
  let bytes = 0;
  for (const f of wanted) {
    if (existsSync(f.local) && (f.size == null || statSync(f.local).size === Number(f.size))) continue;
    const buf = await storageDownload(f.bucket, f.path);
    mkdirSync(dirname(f.local), { recursive: true });
    writeFileSync(f.local, buf);
    downloaded++;
    bytes += buf.length;
    onProgress?.(f, downloaded, wanted.length);
  }
  return { total: wanted.length, downloaded, bytes };
}
