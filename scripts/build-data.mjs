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
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// The schema is draft 2020-12; ajv's default export is draft-07.
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = join(HERE, '..');
const ROOT = join(WEB, '..');
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
};

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const fail = (msg) => {
  console.error(`\n  build-data: ${msg}\n`);
  process.exit(1);
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

// seed_news_articles.json is the one seed that is an object, not an array.
// Any loader written by glob-and-parse breaks on exactly this file.
const newsFile = read(join(SEED, 'seed_news_articles.json'));
if (Array.isArray(newsFile) || !newsFile.archive_objects || !newsFile.news_articles) {
  fail('seed_news_articles.json must be {archive_objects, news_articles}');
}
validate('ArchiveObject', newsFile.archive_objects, 'seed_news_articles.json');
validate('NewsArticle', newsFile.news_articles, 'seed_news_articles.json');
data.archiveObjects = newsFile.archive_objects;
data.newsArticles = newsFile.news_articles;

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

const scanDir = join(ROOT, 'MS-CS-001');
const scansOnDisk = new Set(existsSync(scanDir) ? readdirSync(scanDir) : []);
const publicScans = join(WEB, 'public', 'scans');
mkdirSync(publicScans, { recursive: true });

/** Page count without a PDF library: count the page objects in the raw bytes. */
function pdfPageCount(buf) {
  const matches = buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : null;
}

const missingScans = [];
let copied = 0;
for (const o of data.archiveObjects) {
  for (const s of o.scan_files ?? []) {
    if (!scansOnDisk.has(s.filename)) {
      missingScans.push(`${o.id} -> ${s.filename}`);
      continue;
    }
    const src = join(scanDir, s.filename);
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

// ---------------------------------------------------------------- emit

const bundle = {
  ...data,
  derived: {
    facets,
    articlesByObject,
    articlesByPublication,
    articlesByAuthor,
    exhibitionsByObject,
    personMentions,
    publicationMergeGroups,
    timeline,
    undatedVideos,
    counts: {
      archiveObjects: data.archiveObjects.length,
      newsArticles: data.newsArticles.length,
      publications: data.publications.length,
      persons: data.persons.length,
      exhibitions: data.exhibitions.length,
      videoAssets: data.videoAssets.length,
      paintings: data.paintings.length,
      objectsWithScans: data.archiveObjects.filter((o) => (o.scan_files ?? []).length > 0).length,
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
    '// Generated by scripts/build-data.mjs when seed_paintings.json has rows.\n' +
    "export { default, generateStaticParams, dynamicParams } from '@/components/PaintingDetail';\n",
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
