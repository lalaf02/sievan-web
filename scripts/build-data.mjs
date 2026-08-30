#!/usr/bin/env node
/**
 * The single seam between Supabase (source of record) and the website.
 *
 * Reads the archive out of the api.v_* views, validates every record against
 * schema/data_model.schema.json, derives the indexes the UI needs, and emits one JSON
 * bundle plus per-interview transcript files. Runs on predev/prebuild, so a curator's
 * edit that violates the schema fails the build immediately rather than rendering wrong.
 *
 * It used to read DataModel/seed/*.json off one laptop, and to exit 0 with
 * "skipping (DataModel not found, using committed data)" when that laptop was not the
 * machine building — a green terminal that had tested nothing. That guard is gone. There
 * is no local source and no fallback: without credentials this fails and says why.
 */
import {
  readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, rmSync,
} from 'node:fs';
import { join, dirname, basename, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
// The schema is draft 2020-12; ajv's default export is draft-07.
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { requireCredentials } from './supabase.mjs';
import { fetchArchive, fetchMediaManifest, VIEWS } from './fetch-data.mjs';
import { syncMedia } from './media.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = join(HERE, '..');
const OUT = join(WEB, 'data');
// The JSON Schema is the contract, not data: it lives in the repo, and it had to, because
// DataModel/ is gone.
const SCHEMA = join(WEB, 'schema', 'data_model.schema.json');

// Fail here rather than anywhere later, and say what is missing. Nothing about this build
// can proceed without the database.
requireCredentials();

/** dataset key -> schema $def. The view each key comes from is VIEWS in fetch-data.mjs. */
const DEFS = {
  collections: 'Collection',
  publications: 'Publication',
  persons: 'Person',
  exhibitions: 'Exhibition',
  videoAssets: 'VideoAsset',
  paintings: 'Painting',
  places: 'Place',
  attestedWorks: 'AttestedWork',
  commentary: 'Commentary',
  commentaryRelations: 'CommentaryRelation',
  paintingHistoricalContext: 'PaintingHistoricalContext',
  paintingExhibitions: 'PaintingExhibition',
  historicalEvents: 'HistoricalEvent',
  scholarship: 'Scholarship',
  archiveObjects: 'ArchiveObject',
  newsArticles: 'NewsArticle',
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

const schema = read(SCHEMA);
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

// ---------------------------------------------------------------- load from Supabase

/*
 * The validation stays exactly as it was, and matters more now than it did. Against a
 * hand-edited seed file it caught a curator's typo. Against the database it also catches
 * a view that leaks a column: schema/data_model.schema.json sets additionalProperties
 * false on every entity, so one stray created_at fails every row of that table at once
 * and names the field. That is the schema working, not a bug in it.
 */
const { data, transcripts: transcriptText } = await fetchArchive();

/**
 * A column is null; the record means the field is absent. Reconcile the two.
 *
 * Postgres has one way to say "no value" and JSON Schema has two, and the difference is
 * load-bearing in exactly one direction. AttestedWork.date_uncertain is declared
 * `type: boolean` — NOT nullable — and is optional, so the only way the model can say
 * "this source does not hedge its date" is to omit the key. 56 of 57 seed rows do. Read
 * straight out of a nullable column it arrives as null and fails ajv on every one of them.
 *
 * So drop a null wherever the schema says the field is optional AND cannot itself be null.
 * That is narrow on purpose: a field the schema declares nullable (date_basis, artwork,
 * every date_text) keeps its null, and a REQUIRED field that arrives null is left alone so
 * validate() still fails on it. This corrects a representation mismatch and hides nothing.
 */
function dropImpossibleNulls(defName, rows) {
  const def = schema.$defs[defName];
  const required = new Set(def.required ?? []);
  const optionalNonNullable = Object.entries(def.properties ?? {})
    .filter(([name, spec]) => {
      if (required.has(name)) return false;
      const type = spec.type ?? (spec.enum ? (spec.enum.includes(null) ? ['null'] : []) : null);
      if (type == null) return false;
      return !(Array.isArray(type) ? type.includes('null') : type === 'null');
    })
    .map(([name]) => name);
  if (!optionalNonNullable.length) return rows;
  for (const row of rows) {
    for (const name of optionalNonNullable) if (row[name] === null) delete row[name];
  }
  return rows;
}

for (const [viewName, key] of Object.entries(VIEWS)) {
  const rows = data[key];
  if (!Array.isArray(rows)) fail(`api.${viewName} did not return an array`);
  validate(DEFS[key], dropImpossibleNulls(DEFS[key], rows), `api.${viewName}`);
}

/**
 * A duplicate object id used to be reachable: the seeds were JSON files, and re-running
 * parse_manifest.py could restore all 50 box-1 objects a second time. It sailed through
 * every other check, because ajv validates each row alone and every derived index keys by
 * id — the bundle looked fine and rendered each object twice.
 *
 * archive_objects.id is a primary key now, so the database refuses it at the source. This
 * stays as a cheap assertion that the view is returning rows and not, say, a cartesian
 * product from a future join.
 */
const seenObjectIds = new Set();
for (const o of data.archiveObjects) {
  if (seenObjectIds.has(o.id)) {
    fail(`api.v_archive_objects returned ${o.id} twice — the primary key makes that `
      + 'impossible in the table, so the view is duplicating rows');
  }
  seenObjectIds.add(o.id);
}

/*
 * `artwork` is what promotes an archive object into a catalogue entry, so it may
 * only sit on a row that is actually a work of art — and everything it claims must
 * still be readable in the row's own verbatim description. Same rule as
 * check-quotes.mjs applies to attestations: a curated layer that cannot be checked
 * against the source it summarises is just an assertion.
 */
const canonArtwork = (t) => t.normalize('NFKC')
  .replace(/[\u2018\u2019\u201b]/g, "'").replace(/[\u201c\u201d]/g, '"')
  .replace(/[\u2010-\u2015]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase();

for (const o of data.archiveObjects) {
  if (!o.artwork) continue;
  if (o.object_type !== 'work_on_paper') {
    fail(`${o.id}: artwork is set but object_type is ${o.object_type} — only a row that `
      + 'is itself a work of art may carry it');
  }
  if (o.artwork.signed
    && !canonArtwork(o.raw_title_description).includes(canonArtwork(o.artwork.signed))) {
    fail(`${o.id}: artwork.signed is not present in raw_title_description\n      wanted: `
      + o.artwork.signed);
  }
}

/*
 * An attestation may only carry a year if a source stated one, and may only claim a
 * Painting if a human says how the match was made. Both are the same rule twice: an
 * inference must be labelled as one, or it silently becomes a fact.
 *
 * These live here rather than in the schema because the schema uses no if/then
 * anywhere, and because a message from here can explain WHY. Resist "doing it
 * properly" in ajv later — the error would name a keyword instead of the problem.
 */
for (const w of data.attestedWorks) {
  if (w.date_earliest != null && !w.date_basis) {
    fail(`${w.id}: date_earliest is set but date_basis is not — say whether the year `
      + 'is stated on the source or inferred by the curator');
  }
  if (w.painting_id && !w.identification_basis) {
    fail(`${w.id}: painting_id ${w.painting_id} is set but identification_basis is not `
      + '— record what made the match, so the match can be argued with');
  }
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
 * Runtimes measured off the masters by DataModel/work/timecode/ used to be back-filled
 * here from a local durations.json. They are now a column on video_assets, written once
 * by scripts/seed-supabase.mjs, so the value is in the record rather than in a scratch
 * file that only existed on one machine.
 */

/*
 * The transcripts arrive as the verbatim extracted text and are parsed here, not in the
 * database. parseTranscript() above holds the knowledge about the speaker column that PDF
 * extraction dislocated to the end of each page and the ~100-char hard wrap; storing pages
 * and paragraphs instead would bake one parse into the record and lose the artifact it
 * was derived from.
 */
const transcripts = {};
for (const v of data.videoAssets) {
  if (!v.transcript_text_file) continue;
  const text = transcriptText[v.id];
  if (text == null) {
    fail(`${v.id} declares transcript_text_file ${v.transcript_text_file} but no row in `
      + 'transcript_texts carries its text');
  }
  transcripts[v.id] = parseTranscript(text);
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
const nameVariants = (person) => [person.name, ...(person.aliases ?? [])].filter(Boolean);

/**
 * The one matching rule, shared by both mention indexes below so they cannot drift.
 *
 * Whole-word, because the transcripts are running prose rather than 50 curated
 * descriptions: an unanchored includes() finds "Orr" inside "corridor". It is a
 * strict rule and returns the FIRST variant that matched, so `matchedAs` says which
 * spelling the archive actually found. Against the object descriptions it reproduces
 * the unanchored match exactly - 80 hits, no difference - so nothing already
 * published moved when this replaced hay.includes(n).
 */
const namedIn = (hay, names) => names.find((n) => new RegExp(
  `\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
).test(hay ?? ''));

const personMentions = {};
for (const person of data.persons) {
  const names = nameVariants(person);
  const hits = [];
  for (const obj of data.archiveObjects) {
    const matched = namedIn(obj.raw_title_description, names);
    if (matched) hits.push({ objectId: obj.id, matchedAs: matched });
  }
  if (hits.length) personMentions[person.id] = hits;
}

/**
 * Person -> the interviews whose transcript names them, and on which pages.
 *
 * HEURISTIC, and the weakest of the four, because this is the only index run over
 * running speech rather than curated text. Two constraints keep it honest:
 *
 * FULL NAMES AND ALIASES ONLY, never surnames. Surnames were tried and are
 * unusable: matching the last token of each person's name finds eight hits and every
 * one is wrong. "Klein" is Franz Kline, spelled Klein by whoever typed the
 * transcript, not Ellen Lee Klein; "Paris" is the city in all four of its
 * occurrences, not Jeanne Paris; "Campbell" is Warhol's soup can, not Lawrence
 * Campbell. Full names lose nothing that mattered - Hilton Kramer is found in the
 * same sentence "Kramer" would have reached - and invent nothing.
 *
 * PARAGRAPHS ONLY, never page.speakers. That array is the margin column PDF
 * extraction dislocated to the foot of each page; it cannot be aligned to the
 * paragraphs (see TranscriptPage in lib/types.ts). Reading it would let the archive
 * imply who said a name, which the source does not record.
 *
 * A video the person is already a subject of is skipped: videosForPerson() carries
 * that edge structurally, and the hit is the title card on page 1.
 *
 * So the claim is only ever "this name occurs on this page" - named, never said.
 */
const personTranscriptMentions = {};
for (const person of data.persons) {
  const names = nameVariants(person);
  const hits = [];
  for (const video of data.videoAssets) {
    if (video.subject_person_ids.includes(person.id)) continue;
    const pages = [];
    let matchedAs = null;
    for (const page of transcripts[video.id] ?? []) {
      const matched = namedIn(page.paragraphs.join(' '), names);
      if (!matched) continue;
      pages.push(page.page);
      matchedAs ??= matched;
    }
    if (pages.length) hits.push({ videoId: video.id, pages, matchedAs });
  }
  if (hits.length) personTranscriptMentions[person.id] = hits;
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

/*
 * Attestations, indexed by the sheet that carries them. Box 2's object pages render
 * this: a reader looking at MS-AR-00067 sees the six paintings its two sheets name,
 * each beside the words that name it.
 */
const attestationsByObject = {};
for (const w of data.attestedWorks) {
  if (w.source_type !== 'archive_object') continue;
  (attestationsByObject[w.source_id] ??= []).push(w.id);
}

/*
 * The gazetteer's spine. Role-typed, so a place page can distinguish "Sievan painted
 * this place" from "Sievan showed work here" — which for Woodstock is both, and that
 * difference is the whole reason to build this.
 */
const attestationsByPlace = {};
for (const w of data.attestedWorks) {
  for (const ref of w.place_refs ?? []) {
    (attestationsByPlace[ref.place_id] ??= [])
      .push({ attestationId: w.id, role: ref.role, certain: ref.certain !== false });
  }
}

const exhibitionsByPlace = {};
for (const e of data.exhibitions) {
  if (e.venue_place_id) (exhibitionsByPlace[e.venue_place_id] ??= []).push(e.id);
}

/** Children, so a settlement page can list the venues inside it. */
const placeChildren = {};
for (const p of data.places) {
  if (p.parent_id) (placeChildren[p.parent_id] ??= []).push(p.id);
}

/*
 * What points at each place, and by which relation. Drives the index's counts AND
 * the orphan gate in check-data.mjs: a place nothing points at is a geography we
 * invented, and this archive does not invent.
 */
const placeUsage = {};
for (const p of data.places) {
  const refs = attestationsByPlace[p.id] ?? [];
  const roles = {};
  for (const r of refs) roles[r.role] = (roles[r.role] ?? 0) + 1;
  const exhibitions = (exhibitionsByPlace[p.id] ?? []).length;
  placeUsage[p.id] = {
    attestations: refs.length,
    exhibitions,
    children: (placeChildren[p.id] ?? []).length,
    roles,
    total: refs.length + exhibitions,
  };
}

/*
 * HEURISTIC, and the UI says so. Two sheets writing the same title are a lead, not a
 * fact: "Birchland #1" (MS-AR-00057) and "BIRCHLAND BII" (MS-AR-00066) may be one
 * painting, two, or a series. Nothing merges rows on this — it only surfaces the
 * coincidence for a curator to adjudicate.
 */
const titleKey = (s) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const attestationsByTitleKey = {};
for (const w of data.attestedWorks) {
  const k = titleKey(w.title_stated);
  if (k.length >= 4) (attestationsByTitleKey[k] ??= []).push(w.id);
}
for (const k of Object.keys(attestationsByTitleKey)) {
  if (attestationsByTitleKey[k].length < 2) delete attestationsByTitleKey[k];
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
/*
 * Only attestations whose year is STATED on the source reach the chronology. An
 * inferred year still renders on the record, labelled, but plotting it here would
 * make a curator's guess indistinguishable from a date Sievan wrote down.
 *
 * A separate kind, never 'painting'. The chronology labels 'painting' as "Works",
 * and a reader must not leave thinking the catalogue has opened.
 */
for (const w of data.attestedWorks) {
  if (w.date_earliest == null || w.date_basis !== 'stated_on_source') continue;
  timeline.push({
    id: w.id, kind: 'attestation',
    year: w.date_earliest, yearEnd: w.date_latest ?? w.date_earliest,
    precision: 'year', uncertain: !!w.date_uncertain,
    title: w.title_stated ?? 'Untitled work',
    subtitle: [w.medium_stated, w.dimensions_stated].filter(Boolean).join(', ') || null,
    href: `/works/attested/#${w.id}`,
  });
}
/*
 * The majority carry no date at all — Sievan dated the painting on a minority of
 * these sheets. They get NO undated band on the chronology: seven undated interviews
 * read as a coda, but forty undated works would read as the main event, on a page
 * about when things happened while saying nothing about when. They live in the
 * catalogue raisonné, and the chronology points at them in one line.
 */
const undatedAttestations = data.attestedWorks
  .filter((w) => w.date_earliest == null).map((w) => w.id);

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

// ---------------------------------------------------------------- media

/**
 * Everything the site renders comes out of Supabase Storage into public/ first, and only
 * then is resolved by the phases below. Doing the transfer in one step up front means the
 * page-resolution logic that follows still just reads the filesystem, exactly as it did
 * when the boxes were local directories.
 *
 * Only what is missing or the wrong size is fetched. Without that, every deploy would pull
 * ~182 MB against a 5 GB monthly allowance — roughly 27 builds — so the skip is not an
 * optimisation, it is the difference between working and not.
 */
const publicScans = join(WEB, 'public', 'scans');
mkdirSync(publicScans, { recursive: true });

const mediaManifest = await fetchMediaManifest();
const synced = await syncMedia(mediaManifest, { root: WEB });

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
for (const o of data.archiveObjects) {
  for (const s of o.scan_files ?? []) {
    if (!isValidFilename(s.filename)) {
      fail(`invalid scan filename in ${o.id}: ${s.filename}`);
    }
    // syncMedia has already put it here, or it is not in Storage at all. The message names
    // the bucket path a curator would have to upload, not a directory on one laptop.
    const file = join(publicScans, s.filename);
    if (!existsSync(file)) {
      missingScans.push(`${o.id} -> ${s.filename} (expected archive-scans/${o.collection_id}/${s.filename})`);
      continue;
    }
    // Enrich the record so the viewer can decide between inlining and linking.
    s.sizeBytes = statSync(file).size;
    s.pageCount = s.filename.toLowerCase().endsWith('.pdf')
      ? pdfPageCount(readFileSync(file))
      : 1;
  }
}
if (missingScans.length) {
  fail(`scan files referenced by a record but absent from Storage:\n  ${missingScans.join('\n  ')}`);
}

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
// An attestation's evidence is the sheet it was read off.
const objectIdForAttestation = Object.fromEntries(
  data.attestedWorks
    .filter((w) => w.source_type === 'archive_object')
    .map((w) => [w.id, w.source_id]),
);

let timelineThumbs = 0;
for (const ev of timeline) {
  const objectId = ev.kind === 'object' ? ev.id
    : ev.kind === 'article' ? objectIdForArticle[ev.id]
      : ev.kind === 'attestation' ? objectIdForAttestation[ev.id]
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
    personTranscriptMentions,
    attestationsByObject,
    attestationsByPlace,
    exhibitionsByPlace,
    placeChildren,
    placeUsage,
    attestationsByTitleKey,
    undatedAttestations,
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
      // Never add these to `paintings`. They are what a source NAMES, not what the
      // catalogue holds, and a combined figure would erase the distinction.
      attestedWorks: data.attestedWorks.length,
      attestedWorksDated: data.attestedWorks.filter((w) => w.date_earliest != null).length,
      attestedWorksWithDimensions:
        data.attestedWorks.filter((w) => w.dimensions_stated).length,
      attestedWorksWithPrice: data.attestedWorks.filter((w) => w.price_stated).length,
      sheetsCarryingAttestations: Object.keys(attestationsByObject).length,
      // Works the estate physically holds. NEVER added to `paintings`, which stays 0
      // and is the archive's one honest statement of what it does not have.
      worksOnPaperCatalogued: data.archiveObjects.filter((o) => o.artwork).length,
      worksOnPaperSheets: data.archiveObjects
        .reduce((n, o) => n + (o.artwork ? (o.artwork.sheet_count ?? 1) : 0), 0),
      places: data.places.length,
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

/*
 * app/places/[placeId]/ is COMMITTED, not generated like the painting route above.
 *
 * Its rows ship inside the committed bundle, so it is never empty on Vercel — where
 * this script exits early because DataModel/ is absent and would therefore never
 * write a generated route file at all, leaving every /places/ link a 404. The cost
 * of committing it is that an emptied seed becomes an opaque Next error, so fail
 * here instead, where the message can say what to do about it.
 */
if (data.places.length === 0
  && existsSync(join(WEB, 'app', 'places', '[placeId]', 'page.tsx'))) {
  fail('seed_places.json is empty but app/places/[placeId]/ is mounted. A static '
    + 'export rejects a dynamic route whose generateStaticParams enumerates to '
    + 'nothing. Either restore the seed or delete the route directory.');
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
  `              ${c.worksOnPaperCatalogued} works on paper catalogued ` +
  `(${c.worksOnPaperSheets} sheets) · ${c.attestedWorks} attested works on ` +
  `${c.sheetsCarryingAttestations} sheets (${c.attestedWorksDated} dated) · ` +
  `${c.places} places\n` +
  `              ${c.objectsWithScans} objects with scans (${c.scanFiles} files) · ` +
  `${c.transcribedInterviews} transcripts (${c.transcriptWords.toLocaleString()} words) · ` +
  `${timeline.length} timeline entries\n` +
  `              ${publicationMergeGroups.length} publication merge groups · ` +
  `${Object.keys(personMentions).length} people named in object descriptions · ` +
  `${Object.keys(personTranscriptMentions).length} named in transcripts `+
  `(${Object.values(personTranscriptMentions).flat().length} interviews)\n` +
  // Say what came down the wire. A build that downloaded nothing is the normal, cached
  // case; a build that downloaded everything is the first one after a media change.
  `              media: ${synced.downloaded} of ${synced.total} file(s) fetched from Storage` +
  (synced.downloaded ? ` (${(synced.bytes / 1e6).toFixed(1)} MB)` : ' (all cached)')
);
