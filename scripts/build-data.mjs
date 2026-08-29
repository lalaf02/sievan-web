#!/usr/bin/env node
/**
 * The single seam between DataModel/ (source of record) and the website.
 *
 * Reads the seed files, validates every record against data_model.schema.json,
 * derives the indexes the UI needs, and emits one JSON bundle plus per-interview
 * transcript files. Runs on predev/prebuild, so a hand-edit to any seed file that
 * violates the schema fails the build immediately rather than rendering wrong.
 */
import {
  readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, copyFileSync,
  rmSync,
} from 'node:fs';
import { join, dirname, basename, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
// The schema is draft 2020-12; ajv's default export is draft-07.
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = join(HERE, '..');
// DataModel/, MS-CS-001/ and Video Archive/ live inside the repo, not beside it.
const ROOT = WEB;
const DM = join(ROOT, 'DataModel');
const SEED = join(DM, 'seed');
const OUT = join(WEB, 'data');

// Skip generation if data already exists and DataModel is missing (e.g., on Vercel)
if (!existsSync(DM) && existsSync(join(OUT, 'archive.generated.json'))) {
  console.log('  build-data: skipping (DataModel not found, using committed data)');
  process.exit(0);
}

/** seed file -> [schema $def, dataset key] */
const SEEDS = {
  'seed_collections.json': ['Collection', 'collections'],
  'seed_publications.json': ['Publication', 'publications'],
  'seed_persons.json': ['Person', 'persons'],
  'seed_exhibitions.json': ['Exhibition', 'exhibitions'],
  'seed_video_assets.json': ['VideoAsset', 'videoAssets'],
  'seed_paintings.json': ['Painting', 'paintings'],
  'seed_commentary.json': ['Commentary', 'commentary'],
  'seed_commentary_relations.json': ['CommentaryRelation', 'commentaryRelations'],
  'seed_painting_historical_context.json': ['PaintingHistoricalContext', 'paintingHistoricalContext'],
  'seed_painting_exhibitions.json': ['PaintingExhibition', 'paintingExhibitions'],
  'seed_historical_events.json': ['HistoricalEvent', 'historicalEvents'],
  'seed_scholarship.json': ['Scholarship', 'scholarship'],
  'seed_archive_objects.json': ['ArchiveObject', 'archiveObjects'],
  'seed_news_articles.json': ['NewsArticle', 'newsArticles'],
};

const fail = (msg) => {
  console.error(`\n  build-data: ${msg}\n`);
  process.exit(1);
};

const read = (p) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    fail(`failed to parse ${p}: ${e.message}`);
  }
};

// ---------------------------------------------------------------- validation

const schema = read(join(DM, 'data_model.schema.json'));
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(schema, 'model');

function validate(defName, rows, file) {
  const check = ajv.getSchema(`model#/$defs/${defName}`);
  if (!check) fail(`schema has no $defs/${defName}`);
  const problems = [];
  rows.forEach((row, i) => {
    if (!check(row)) {
      for (const e of check.errors) {
        problems.push(`  ${file} [${row.id ?? i}] ${e.instancePath || '/'} ${e.message}`);
      }
    }
  });
  if (problems.length) {
    fail(`${problems.length} schema violation(s):\n${problems.slice(0, 20).join('\n')}`);
  }
}

// ---------------------------------------------------------------- load seeds

const data = {};
for (const [file, [defName, key]] of Object.entries(SEEDS)) {
  const rows = read(join(SEED, file));
  if (!Array.isArray(rows)) fail(`${file} should be an array`);
  validate(defName, rows, file);
  data[key] = rows;
}

/**
 * Archive objects used to live inside seed_news_articles.json as
 * {archive_objects, news_articles}. They now have their own seed, because boxes 2
 * onward hold drawings rather than press and filing them under "news articles" was
 * only ever an accident of which box was catalogued first.
 *
 * parse_manifest.py still writes the old combined shape, so guard against a re-run
 * silently reintroducing all 50 box-1 objects a second time. A duplicate id would
 * otherwise sail through: ajv validates each row on its own and every derived index
 * keys by id, so the bundle would look fine and render each object twice.
 */
const seenObjectIds = new Set();
for (const o of data.archiveObjects) {
  if (seenObjectIds.has(o.id)) {
    fail(`duplicate archive object id ${o.id} in seed_archive_objects.json — if `
      + 'parse_manifest.py was re-run it may have restored archive_objects into '
      + 'seed_news_articles.json; that file must now hold news articles only');
  }
  seenObjectIds.add(o.id);
}

// ---------------------------------------------------------------- transcripts

/**
 * The extracted .txt is hard-wrapped at ~100 chars and carries two things that
 * must be separated: the dialogue, and a block of speaker labels that PDF
 * extraction dislocated from the margin column to the end of each page.
 */
const SPEAKER = /^(Interviewer|Cameraperson|Unknown|Karp|Solman|Wolins|Wollins|Barnet|Dobkin|Greenberg|Sievan)$/;

function parseTranscript(text) {
  const pages = [];
  for (const chunk of text.split(/^\[page (\d+)\]$/m).slice(1).reduce((acc, v, i, arr) => {
    if (i % 2 === 0) acc.push({ page: Number(v), body: arr[i + 1] ?? '' });
    return acc;
  }, [])) {
    const lines = chunk.body.split('\n').map((l) => l.trimEnd());

    // Trailing run of bare speaker names = the dislocated margin column.
    const speakers = [];
    let end = lines.length;
    while (end > 0) {
      const l = lines[end - 1].trim();
      if (l === '') { end--; continue; }
      if (SPEAKER.test(l)) { speakers.unshift(l); end--; continue; }
      break;
    }

    // Unwrap: join hard-wrapped lines into paragraphs. A line that ends short
    // (or ends a sentence) closes the paragraph.
    const paragraphs = [];
    let buf = '';
    for (const raw of lines.slice(0, end)) {
      const line = raw.trim();
      if (!line) { if (buf) { paragraphs.push(buf); buf = ''; } continue; }
      buf = buf ? `${buf} ${line}` : line;
      if (line.length < 60) { paragraphs.push(buf); buf = ''; }
    }
    if (buf) paragraphs.push(buf);

    pages.push({ page: Number(chunk.page), paragraphs, speakers });
  }
  return pages;
}

/*
 * Real runtimes, measured off the masters by DataModel/work/timecode/. Every
 * VideoAsset ships duration_seconds: null, and the interviews are the one part of
 * the archive with no sense of scale attached — "4,769 words" tells a reader
 * nothing about whether that is ten minutes or an hour.
 *
 * The edited cut is the canonical one; the subtitled variant is the same film and
 * differs by hundredths of a second.
 */
const durationsPath = join(DM, 'work', 'durations.json');
if (existsSync(durationsPath)) {
  const durations = read(durationsPath);
  for (const v of data.videoAssets) {
    if (v.duration_seconds != null) continue;
    for (const variant of ['edited', 'subtitled', 'raw']) {
      const d = durations[`${v.id}:${variant}`];
      if (d != null) { v.duration_seconds = Math.round(d); break; }
    }
  }
}

const transcripts = {};
for (const v of data.videoAssets) {
  if (!v.transcript_text_file) continue;
  const p = join(ROOT, v.transcript_text_file);
  if (!existsSync(p)) fail(`missing transcript ${v.transcript_text_file}`);
  transcripts[v.id] = parseTranscript(readFileSync(p, 'utf8'));
}

// ---------------------------------------------------------------- derivations

const bump = (m, k) => { if (k != null) m[k] = (m[k] ?? 0) + 1; };

/** Publication clusters that are the same masthead spelled differently. */
const norm = (s) => (s ?? '').toLowerCase().replace(/^the\s+/, '').replace(/[^a-z]/g, '');
const mergeGroups = {};
for (const p of data.publications) {
  (mergeGroups[norm(p.name)] ??= []).push(p.id);
}
const publicationMergeGroups = Object.values(mergeGroups).filter((g) => g.length > 1);

/**
 * Person -> archive objects whose description names them.
 *
 * This recovers edges that exist only in prose. MS-AR-00040 credits "Ivan C Karp"
 * with an essay but is promotional_material with article_ids: [], so no
 * NewsArticle carries him as author and he appears in zero article records - the
 * dual-role case has nothing to render without this. Same mechanism catches
 * MS-AR-00036 -> maurice-sievan via the misspelling alias "Maurice Seivan".
 */
const personMentions = {};
for (const person of data.persons) {
  const names = [person.name, ...(person.aliases ?? [])].filter(Boolean);
  const hits = [];
  for (const obj of data.archiveObjects) {
    const hay = obj.raw_title_description ?? '';
    const matched = names.find((n) => hay.includes(n));
    if (matched) hits.push({ objectId: obj.id, matchedAs: matched });
  }
  if (hits.length) personMentions[person.id] = hits;
}

/**
 * Press notices and exhibitions are two disjoint graphs in the source data:
 * `NewsArticle.exhibition_id` is set on none of the 60 articles, and every
 * exhibition's `source_archive_object_ids` points at a catalogue or poster, never
 * at a clipping bundle. So nothing in the archive says which show a review reviews,
 * even where it is obvious to a reader.
 *
 * This infers the link, and is deliberately strict about it. A pair is only made
 * when BOTH hold:
 *   - the notice is dated within the exhibition's year (or the year after, since
 *     reviews trail the opening), and
 *   - a distinctive token of the venue name appears in the clipping's own text or
 *     in the description of the sheet it was photocopied onto.
 *
 * Generic words are excluded from matching, which is why "Contemporary Arts" and
 * "National Arts Club" produce no links at all: every token in them is a word that
 * appears in half the archive. An empty result is the correct answer there — a
 * date-only match would connect a 1941 review to a show it has nothing to do with.
 *
 * These edges are inferred, never asserted, and the UI labels them as such.
 */
const VENUE_STOPWORDS = new Set([
  'gallery', 'galleries', 'museum', 'museums', 'art', 'arts', 'fine', 'the', 'of',
  'and', 'inc', 'association', 'institute', 'center', 'centre', 'club', 'national',
  'american', 'contemporary', 'city', 'new', 'york', 'company', 'ltd', 'studio',
  'studios',
]);
const normText = (s) => (s ?? '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const objectsById = new Map(data.archiveObjects.map((o) => [o.id, o]));
const articlesByExhibition = {};
const exhibitionsByArticle = {};
for (const e of data.exhibitions) {
  if (e.date_earliest == null) continue;
  const keys = normText(e.gallery_or_venue)
    .split(' ')
    .filter((t) => t.length >= 4 && !VENUE_STOPWORDS.has(t));
  if (!keys.length) continue;

  const lo = e.date_earliest;
  const hi = (e.date_latest ?? e.date_earliest) + 1;
  const hits = [];
  for (const a of data.newsArticles) {
    if (a.date_earliest == null || a.date_earliest < lo || a.date_earliest > hi) continue;
    const sheet = objectsById.get(a.archive_object_id)?.raw_title_description ?? '';
    const hay = normText(`${a.raw_source_text} ${sheet}`);
    const matched = keys.find((k) => hay.includes(k));
    if (!matched) continue;
    hits.push({ articleId: a.id, matchedAs: matched });
    (exhibitionsByArticle[a.id] ??= []).push({ exhibitionId: e.id, matchedAs: matched });
  }
  if (hits.length) articlesByExhibition[e.id] = hits;
}

const decadeOf = (y) => (y == null ? null : Math.floor(y / 10) * 10);

const facets = {
  decade: {},
  publication: {},
  author: {},
  objectType: {},
};
for (const a of data.newsArticles) {
  bump(facets.decade, decadeOf(a.date_earliest));
  bump(facets.publication, a.publication_id);
  // Initials-only bylines keep author_raw but no person id - a real archival
  // category and a research lead, so they get their own bucket rather than
  // being lumped in with the genuinely unattributed.
  const key = a.author_person_id ?? (a.author_raw ? '__initials__' : '__unattributed__');
  bump(facets.author, key);
}
for (const o of data.archiveObjects) bump(facets.objectType, o.object_type);

const articlesByObject = {};
for (const a of data.newsArticles) (articlesByObject[a.archive_object_id] ??= []).push(a.id);

const articlesByPublication = {};
for (const a of data.newsArticles) {
  if (a.publication_id) (articlesByPublication[a.publication_id] ??= []).push(a.id);
}

const articlesByAuthor = {};
for (const a of data.newsArticles) {
  if (a.author_person_id) (articlesByAuthor[a.author_person_id] ??= []).push(a.id);
}

const exhibitionsByObject = {};
for (const e of data.exhibitions) {
  for (const oid of e.source_archive_object_ids ?? []) (exhibitionsByObject[oid] ??= []).push(e.id);
}

/** Precision drives how a date renders: a soft band vs a hard tick. */
function precisionOf(iso, text) {
  if (!iso) return text ? 'unknown' : 'unknown';
  const parts = iso.split('-').length;
  return parts === 3 ? 'day' : parts === 2 ? 'month' : 'year';
}

// Canonical publication names, so the timeline does not show the manifest's
// pre-merge spellings ("Brookyln Eagle", "The Art News") that the rest of the
// site has already reconciled.
const publicationNames = Object.fromEntries(data.publications.map((p) => [p.id, p.name]));
const publicationName = (a) =>
  (a.publication_id && publicationNames[a.publication_id]) || a.publication_raw || null;

const timeline = [];
for (const a of data.newsArticles) {
  if (a.date_earliest == null) continue;
  timeline.push({
    id: a.id, kind: 'article', year: a.date_earliest, yearEnd: a.date_latest ?? a.date_earliest,
    precision: precisionOf(a.date_normalized, a.date_text),
    uncertain: !!a.date_uncertain,
    title: a.headline ?? publicationName(a) ?? a.id,
    subtitle: publicationName(a),
    href: `/archive/press/${a.id}`,
  });
}
for (const e of data.exhibitions) {
  if (e.date_earliest == null) continue;
  timeline.push({
    id: e.id, kind: 'exhibition', year: e.date_earliest, yearEnd: e.date_latest ?? e.date_earliest,
    precision: precisionOf(e.start_date, null), uncertain: false,
    title: e.name ?? e.gallery_or_venue,
    subtitle: e.gallery_or_venue, href: `/exhibitions/${e.id}`,
  });
}
for (const o of data.archiveObjects) {
  if (o.date_earliest == null) continue;
  timeline.push({
    id: o.id, kind: 'object', year: o.date_earliest, yearEnd: o.date_latest ?? o.date_earliest,
    precision: 'year', uncertain: false,
    title: (o.raw_title_description ?? '').split('\n')[0].trim(),
    subtitle: o.object_type, href: `/archive/objects/${o.id}`,
  });
}
for (const p of data.paintings) {
  if (p.date_earliest == null) continue;
  timeline.push({
    id: p.id, kind: 'painting', year: p.date_earliest, yearEnd: p.date_latest ?? p.date_earliest,
    precision: 'year', uncertain: false,
    title: p.title ?? p.id, subtitle: p.medium ?? null, href: `/works/${p.id}`,
  });
}
for (const h of data.historicalEvents) {
  if (h.date_earliest == null) continue;
  timeline.push({
    id: h.id, kind: 'event', year: h.date_earliest, yearEnd: h.date_latest ?? h.date_earliest,
    precision: 'year', uncertain: false,
    title: h.title, subtitle: h.category, href: `/life/chronology#${h.id}`,
  });
}
// Every video asset has date_earliest: null, so the interviews cannot appear on
// the timeline at all. They surface in an untimed "Testimony" band instead.
const undatedVideos = data.videoAssets.filter((v) => v.date_earliest == null).map((v) => v.id);

const PREC_ORDER = { day: 0, month: 1, year: 2, range: 3, unknown: 4 };
timeline.sort((a, b) =>
  a.year - b.year ||
  PREC_ORDER[a.precision] - PREC_ORDER[b.precision] ||
  a.kind.localeCompare(b.kind) ||
  a.title.localeCompare(b.title));

// ---------------------------------------------------------------- scans

/**
 * Scans live in one directory per physical box, named for the collection:
 * MS-CS-001/, MS-CS-002/, ... So resolve them from the object's own collection_id
 * rather than a hardcoded path, and every further box works without an edit here.
 * Each directory is read once, not once per object.
 */
const scanDirs = new Map();
const boxScans = (collectionId) => {
  if (!scanDirs.has(collectionId)) {
    const dir = join(ROOT, collectionId);
    scanDirs.set(collectionId, {
      dir,
      files: new Set(existsSync(dir) ? readdirSync(dir) : []),
    });
  }
  return scanDirs.get(collectionId);
};
const publicScans = join(WEB, 'public', 'scans');
mkdirSync(publicScans, { recursive: true });

/** Page count without a PDF library: count the page objects in the raw bytes. */
function pdfPageCount(buf) {
  // Verify this looks like a PDF before attempting regex
  const header = buf.slice(0, 8).toString('latin1');
  if (!header.startsWith('%PDF-')) {
    console.warn('  warning: file does not appear to be a valid PDF');
    return 1; // Fallback to 1 page
  }
  const matches = buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 1; // Fallback to 1 if count fails
}

// Validate filename to prevent path traversal attacks
function isValidFilename(filename) {
  if (!filename || typeof filename !== 'string') return false;
  // Reject path separators and traversal patterns
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) return false;
  // Normalize and check it resolves to the same basename
  return normalize(filename) === basename(filename);
}

const missingScans = [];
let copied = 0;
for (const o of data.archiveObjects) {
  const box = boxScans(o.collection_id);
  for (const s of o.scan_files ?? []) {
    if (!isValidFilename(s.filename)) {
      fail(`invalid scan filename in ${o.id}: ${s.filename}`);
    }
    if (!box.files.has(s.filename)) {
      missingScans.push(`${o.id} -> ${s.filename} (expected in ${o.collection_id}/)`);
      continue;
    }
    const src = join(box.dir, s.filename);
    const dest = join(publicScans, s.filename);
    // Enrich the record so the viewer can decide between inlining and linking.
    s.sizeBytes = statSync(src).size;
    s.pageCount = s.filename.toLowerCase().endsWith('.pdf')
      ? pdfPageCount(readFileSync(src))
      : 1;
    if (!existsSync(dest) || statSync(dest).size !== s.sizeBytes) {
      copyFileSync(src, dest);
      copied++;
    }
  }
}
if (missingScans.length) fail(`scan files referenced but not on disk:\n  ${missingScans.join('\n  ')}`);

// ------------------------------------------------------- rasterised scan pages

/**
 * The scans ship twice: as the original PDF (the archival object, downloadable) and
 * as page images produced by scripts/extract-scans.mjs. Only the images can go in an
 * <img>, so they are what the record pages and the mosaics actually render.
 *
 * Resolving them here rather than in a component keeps the "does this page exist on
 * disk" question on the build side, where check-data can fail on it.
 */
const pagesDir = join(publicScans, 'pages');
const thumbsDir = join(publicScans, 'thumbs');
const pageFiles = existsSync(pagesDir) ? readdirSync(pagesDir).filter((f) => f.endsWith('.jpg')).sort() : [];

const pagesByStem = new Map();
for (const f of pageFiles) {
  const stem = f.replace(/-p\d+\.jpg$/, '');
  if (!pagesByStem.has(stem)) pagesByStem.set(stem, []);
  pagesByStem.get(stem).push(f);
}

/**
 * MS-AR-00026 is the retrospective catalogue. extract-scans skips it because
 * extract-retrospective.mjs already publishes its fifteen pages with transcriptions
 * attached; point at those rather than duplicating 15 sheets under a second name.
 */
const RETROSPECTIVE_STEM = 'MSAR00026';
const retrospectiveDir = join(WEB, 'public', 'retrospective');
const retrospectivePages = existsSync(retrospectiveDir)
  ? readdirSync(retrospectiveDir).filter((f) => f.endsWith('.jpg')).sort()
  : [];

let pageImages = 0;
for (const o of data.archiveObjects) {
  for (const sf of o.scan_files ?? []) {
    const stem = sf.filename.replace(/\.[^.]+$/, '');
    if (stem === RETROSPECTIVE_STEM) {
      sf.pages = retrospectivePages.map((f) => ({
        page: `/retrospective/${f}`,
        thumb: `/retrospective/${f}`,
      }));
    } else {
      sf.pages = (pagesByStem.get(stem) ?? []).map((f) => ({
        page: `/scans/pages/${f}`,
        thumb: existsSync(join(thumbsDir, f)) ? `/scans/thumbs/${f}` : `/scans/pages/${f}`,
      }));
    }
    // The extracted images are the authoritative page count. The regex fallback above
    // over-counts /Type/Page in some files — it read MSAR00003I and II as 2 pages each
    // when both are single sheets.
    if (sf.pages.length) sf.pageCount = sf.pages.length;
    pageImages += sf.pages.length;
  }
}

/** Objects whose sheets can actually be shown, for the imagery-led listings. */
const objectsWithImagery = data.archiveObjects
  .filter((o) => (o.scan_files ?? []).some((sf) => (sf.pages ?? []).length > 0))
  .map((o) => o.id);

/** First readable sheet per object — the tile face used by every mosaic. */
const coverByObject = {};
for (const o of data.archiveObjects) {
  const first = (o.scan_files ?? []).flatMap((sf) => sf.pages ?? [])[0];
  if (first) coverByObject[o.id] = first;
}

/**
 * Hang each timeline event off the sheet that evidences it.
 *
 * NOTHING RENDERS THIS TODAY. The chronology tried it and the thumbnails were
 * removed: at the size a 125-row timeline allows, a photocopied clipping is an
 * illegible grey rectangle, and only 82 of the 125 events have one, so the rows that
 * did carry a sheet left the rest looking broken.
 *
 * The index is kept because it is correct, costs one pass at build time, and is the
 * obvious raw material for any view that shows evidence at a size worth looking at.
 */
const objectIdForArticle = Object.fromEntries(
  data.newsArticles.map((a) => [a.id, a.archive_object_id]),
);
const objectIdForExhibition = Object.fromEntries(
  data.exhibitions.map((e) => [e.id, (e.source_archive_object_ids ?? [])[0]]),
);

let timelineThumbs = 0;
for (const ev of timeline) {
  const objectId = ev.kind === 'object' ? ev.id
    : ev.kind === 'article' ? objectIdForArticle[ev.id]
      : objectIdForExhibition[ev.id];
  const cover = objectId ? coverByObject[objectId] : undefined;
  if (cover) {
    ev.thumb = cover.thumb;
    ev.thumbObjectId = objectId;
    timelineThumbs++;
  }
}

// ------------------------------------------------------------------- clips

/**
 * Silent web loops cut from the masters by scripts/extract-clips.mjs. The masters are
 * 25 GB and are never served; these are excerpts and the UI says so.
 */
const clipsManifest = join(WEB, 'public', 'clips', 'clips.json');
const clips = existsSync(clipsManifest)
  ? JSON.parse(readFileSync(clipsManifest, 'utf8'))
  : [];

const videoIds = new Set(data.videoAssets.map((v) => v.id));
for (const c of clips) {
  if (c.videoId && !videoIds.has(c.videoId)) {
    fail(`clip ${c.id} references unknown videoId ${c.videoId}`);
  }
}

const clipsByVideo = {};
for (const v of data.videoAssets) {
  const own = clips.filter((c) => c.videoId === v.id);
  if (own.length) clipsByVideo[v.id] = own;
}


// ---------------------------------------------------------------- emit

const bundle = {
  ...data,
  derived: {
    facets,
    articlesByObject,
    articlesByPublication,
    articlesByAuthor,
    exhibitionsByObject,
    articlesByExhibition,
    exhibitionsByArticle,
    personMentions,
    publicationMergeGroups,
    timeline,
    undatedVideos,
    objectsWithImagery,
    coverByObject,
    clips,
    clipsByVideo,
    counts: {
      archiveObjects: data.archiveObjects.length,
      newsArticles: data.newsArticles.length,
      publications: data.publications.length,
      persons: data.persons.length,
      exhibitions: data.exhibitions.length,
      videoAssets: data.videoAssets.length,
      paintings: data.paintings.length,
      scholarship: data.scholarship.length,
      objectsWithScans: data.archiveObjects.filter((o) => (o.scan_files ?? []).length > 0).length,
      objectsWithImagery: objectsWithImagery.length,
      scanPageImages: pageImages,
      timelineThumbs,
      clips: clips.length,
      scanFiles: data.archiveObjects.reduce((n, o) => n + (o.scan_files ?? []).length, 0),
      transcribedInterviews: Object.keys(transcripts).length,
      transcriptWords: data.videoAssets.reduce((n, v) => n + (v.transcript_word_count ?? 0), 0),
    },
  },
};

/**
 * Mount the painting detail route only when there are paintings to put in it.
 *
 * Static export rejects a dynamic route that enumerates to nothing, so with an
 * empty catalogue app/works/[paintingId]/ must not exist. The page component
 * itself is real, reviewed code in components/PaintingDetail.tsx — this only
 * decides whether it is wired up as a route.
 */
const worksRouteDir = join(WEB, 'app', 'works', '[paintingId]');
const worksRouteFile = join(worksRouteDir, 'page.tsx');
if (data.paintings.length > 0) {
  mkdirSync(worksRouteDir, { recursive: true });
  writeFileSync(
    worksRouteFile,
    '// Generated by scripts/build-data.mjs when seed_paintings.json has rows.\n'
    // Route segment config has to be statically analysable in the route file
    // itself — Next 16 rejects a re-exported `dynamicParams` ("It mustn't be
    // reexported"), so it is declared here and only the component and its params
    // come from PaintingDetail.
    + "export { default, generateStaticParams } from '@/components/PaintingDetail';\n"
    + 'export const dynamicParams = false;\n',
  );
} else if (existsSync(worksRouteFile)) {
  rmSync(worksRouteDir, { recursive: true, force: true });
}

mkdirSync(OUT, { recursive: true });
mkdirSync(join(OUT, 'transcripts'), { recursive: true });
writeFileSync(join(OUT, 'archive.generated.json'), JSON.stringify(bundle));
for (const [id, pages] of Object.entries(transcripts)) {
  writeFileSync(join(OUT, 'transcripts', `${id}.json`), JSON.stringify(pages));
}

const c = bundle.derived.counts;
console.log(
  `  build-data: ${c.archiveObjects} objects · ${c.newsArticles} articles · ` +
  `${c.publications} publications · ${c.persons} people · ${c.exhibitions} exhibitions · ` +
  `${c.videoAssets} videos · ${c.paintings} paintings\n` +
  `              ${c.objectsWithScans} objects with scans (${c.scanFiles} files) · ` +
  `${c.transcribedInterviews} transcripts (${c.transcriptWords.toLocaleString()} words) · ` +
  `${timeline.length} timeline entries\n` +
  `              ${publicationMergeGroups.length} publication merge groups · ` +
  `${Object.keys(personMentions).length} people mentioned in object descriptions` +
  (copied ? `\n              copied ${copied} scan file(s) into public/scans/` : '')
);
