#!/usr/bin/env node
/**
 * Referential integrity gate. Everything here passes today, so this is a
 * regression detector, not a discovery tool: it fails the build if an edit to
 * DataModel/ breaks a link the site renders.
 *
 * Run after build-data.mjs (it reads the generated bundle).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = join(HERE, '..');
const ROOT = join(WEB, '..');

const bundlePath = join(WEB, 'data', 'archive.generated.json');
if (!existsSync(bundlePath)) {
  console.error('\n  check-data: run build-data.mjs first\n');
  process.exit(1);
}
const d = JSON.parse(readFileSync(bundlePath, 'utf8'));

const ids = (rows) => new Set(rows.map((r) => r.id));
const O = ids(d.archiveObjects);
const P = ids(d.publications);
const PE = ids(d.persons);
const C = ids(d.collections);
const E = ids(d.exhibitions);
const A = ids(d.newsArticles);
const PA = ids(d.paintings);
const HE = ids(d.historicalEvents);
const CM = ids(d.commentary);

const errors = [];
const need = (cond, msg) => { if (!cond) errors.push(msg); };

for (const a of d.newsArticles) {
  need(O.has(a.archive_object_id), `${a.id}: archive_object_id ${a.archive_object_id} not found`);
  need(!a.publication_id || P.has(a.publication_id), `${a.id}: publication_id ${a.publication_id} not found`);
  need(!a.author_person_id || PE.has(a.author_person_id), `${a.id}: author_person_id ${a.author_person_id} not found`);
  need(!a.exhibition_id || E.has(a.exhibition_id), `${a.id}: exhibition_id ${a.exhibition_id} not found`);
}

for (const o of d.archiveObjects) {
  need(C.has(o.collection_id), `${o.id}: collection_id ${o.collection_id} not found`);
  for (const aid of o.article_ids ?? []) {
    need(A.has(aid), `${o.id}: article_ids -> ${aid} not found`);
    const art = d.newsArticles.find((x) => x.id === aid);
    need(!art || art.archive_object_id === o.id, `${o.id}: ${aid} does not back-reference it`);
  }
  for (const s of o.scan_files ?? []) {
    need(existsSync(join(ROOT, 'MS-CS-001', s.filename)), `${o.id}: scan ${s.filename} missing on disk`);
  }
}

for (const v of d.videoAssets) {
  need(C.has(v.collection_id), `${v.id}: collection_id ${v.collection_id} not found`);
  for (const pid of v.subject_person_ids ?? []) {
    need(PE.has(pid), `${v.id}: subject_person_ids -> ${pid} not found`);
  }
  for (const m of v.media_files ?? []) {
    need(existsSync(join(ROOT, m.path)), `${v.id}: media ${m.path} missing on disk`);
  }
  for (const key of ['transcript_source_file', 'transcript_text_file']) {
    if (v[key]) need(existsSync(join(ROOT, v[key])), `${v.id}: ${key} ${v[key]} missing on disk`);
  }
}

for (const e of d.exhibitions) {
  for (const oid of e.source_archive_object_ids ?? []) {
    need(O.has(oid), `${e.id}: source_archive_object_ids -> ${oid} not found`);
  }
  for (const aid of e.source_article_ids ?? []) {
    need(A.has(aid), `${e.id}: source_article_ids -> ${aid} not found`);
  }
}

// The painting-centred layer is empty today; these loops are the gate that keeps
// it honest the moment it fills.
const V = ids(d.videoAssets);
for (const c of d.commentary) {
  const pool = c.source_type === 'news_article' ? A : V;
  need(pool.has(c.source_id), `${c.id}: source_id ${c.source_id} not found for source_type ${c.source_type}`);
  need(!c.commentator_person_id || PE.has(c.commentator_person_id), `${c.id}: commentator not found`);
  need(!c.subject_person_id || PE.has(c.subject_person_id), `${c.id}: subject_person_id not found`);
  for (const pid of c.painting_ids ?? []) need(PA.has(pid), `${c.id}: painting_ids -> ${pid} not found`);
}
for (const r of d.commentaryRelations) {
  need(CM.has(r.commentary_a_id), `${r.id}: commentary_a_id not found`);
  need(CM.has(r.commentary_b_id), `${r.id}: commentary_b_id not found`);
}
for (const x of d.paintingHistoricalContext) {
  need(PA.has(x.painting_id), `${x.id}: painting_id not found`);
  need(HE.has(x.historical_event_id), `${x.id}: historical_event_id not found`);
  for (const s of x.source_refs ?? []) need(CM.has(s), `${x.id}: source_refs -> ${s} not found`);
}
for (const x of d.paintingExhibitions) {
  need(PA.has(x.painting_id), `${x.id}: painting_id not found`);
  need(E.has(x.exhibition_id), `${x.id}: exhibition_id not found`);
}

// Every route the site generates must have a resolvable target.
for (const t of d.derived.timeline) {
  need(typeof t.href === 'string' && t.href.startsWith('/'), `timeline ${t.id}: bad href`);
}

if (errors.length) {
  console.error(`\n  check-data: ${errors.length} referential error(s):`);
  for (const e of errors.slice(0, 30)) console.error(`    ${e}`);
  console.error('');
  process.exit(1);
}

console.log(`  check-data: OK - all references resolve, all scan/media/transcript files present`);
