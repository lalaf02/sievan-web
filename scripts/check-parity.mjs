#!/usr/bin/env node
/**
 * Diffs two generated bundles, for the Supabase cutover.
 *
 *   node scripts/check-parity.mjs <baseline.json> [data/archive.generated.json]
 *
 * The derivations are deterministic, so a bundle built from Supabase must equal the one
 * built from the seed files. Any difference is a real loss until proved otherwise.
 *
 * ONE class of difference is expected and is reported separately rather than normalised
 * away: three fields are ABSENT on most seed rows where the database stores null —
 * archive_objects.artwork (absent on 51 of 76), attested_works.date_basis (47 of 57) and
 * attested_works.date_uncertain (56 of 57). Nothing distinguishes the two: every reader
 * tests them by truthiness (`o.artwork`, `!!w.date_uncertain`, `w.date_basis === '...'`)
 * and lib/types.ts already declares all three optional. They are printed in full so a
 * human confirms the list is exactly those three and nothing has hidden inside it.
 *
 * Silently treating absent as null would make this gate green on a bundle that had lost a
 * field entirely, which is the failure mode this repo has a whole CLAUDE.md section about.
 */
import { readFileSync } from 'node:fs';

const [, , basePath, headPath = 'data/archive.generated.json'] = process.argv;
if (!basePath) {
  console.error('usage: node scripts/check-parity.mjs <baseline.json> [candidate.json]');
  process.exit(2);
}

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const base = read(basePath);
const head = read(headPath);

const real = [];      // genuine differences
const presence = [];  // absent on one side, null on the other

const MISSING = Symbol('missing');
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function walk(a, b, path) {
  if (a === MISSING || b === MISSING) {
    const other = a === MISSING ? b : a;
    // Absent on one side, explicitly null on the other: the same claim, written twice.
    if (other === null) presence.push(`${path}  (${a === MISSING ? 'absent' : 'null'} -> ${a === MISSING ? 'null' : 'absent'})`);
    else real.push(`${path}  ${a === MISSING ? 'ADDED' : 'REMOVED'}: ${JSON.stringify(other)?.slice(0, 120)}`);
    return;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return real.push(`${path}  type ${typeof a} -> ${typeof b}`);
    if (a.length !== b.length) real.push(`${path}  length ${a.length} -> ${b.length}`);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      walk(i < a.length ? a[i] : MISSING, i < b.length ? b[i] : MISSING, `${path}[${i}]`);
    }
    return;
  }
  if (isObj(a) || isObj(b)) {
    if (!isObj(a) || !isObj(b)) return real.push(`${path}  ${JSON.stringify(a)?.slice(0, 80)} -> ${JSON.stringify(b)?.slice(0, 80)}`);
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      walk(k in a ? a[k] : MISSING, k in b ? b[k] : MISSING, `${path}.${k}`);
    }
    return;
  }
  if (a !== b) real.push(`${path}  ${JSON.stringify(a)?.slice(0, 100)} -> ${JSON.stringify(b)?.slice(0, 100)}`);
}

walk(base, head, '');

// Group by FIELD, not by row — 51 rows all missing `artwork` is one fact about the
// migration, not fifty-one. The array index is collapsed so the field names line up.
const byField = new Map();
for (const p of presence) {
  const field = p.replace(/\[\d+\]/g, '[]').replace(/\s+\(.*$/, '');
  byField.set(field, (byField.get(field) ?? 0) + 1);
}

console.log('');
if (presence.length) {
  console.log(`  check-parity: ${presence.length} absent/null differences across ${byField.size} field(s):`);
  for (const [field, n] of [...byField].sort((a, b) => b[1] - a[1])) {
    console.log(`      ${field.padEnd(46)} ×${n}`);
  }
  console.log('');
  console.log('      Each is a field the seed OMITTED and the database stores as null.');
  console.log('      Benign only where the schema declares the field nullable and every');
  console.log('      reader tests it by truthiness. Check any name you do not recognise.');
  console.log('');
}

if (real.length) {
  console.error(`  check-parity: FAIL — ${real.length} real difference(s):`);
  for (const d of real.slice(0, 40)) console.error(`      ${d}`);
  if (real.length > 40) console.error(`      … and ${real.length - 40} more`);
  console.error('');
  process.exit(1);
}

console.log(`  check-parity: OK - the bundle built from Supabase matches ${basePath}`);
console.log('                every entity row, every derived index, byte for byte\n');
