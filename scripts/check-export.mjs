#!/usr/bin/env node
/**
 * Post-build gate on the exported site.
 *
 * Catches the two failure modes that a passing `next build` will not: a
 * generateStaticParams that silently returned [] (so a whole section vanishes),
 * and internal links pointing at routes that were never emitted.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(WEB, 'out');

if (!existsSync(OUT)) {
  console.error('\n  check-export: no out/ directory - did next build run?\n');
  process.exit(1);
}

const html = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (entry.endsWith('.html')) html.push(p);
  }
})(OUT);

const errors = [];

// A section quietly disappearing is the failure this catches. The floor sat at 60
// against 205 actual pages, so all 60 press pages could have vanished and this still
// passed. Keep it just under the real count — 258 after the gazetteer added 25 place
// pages, its index and the attested-works ledger to box 2's 231.
const MIN_PAGES = Number(process.env.MIN_PAGES ?? 256);
if (html.length < MIN_PAGES) {
  errors.push(`only ${html.length} HTML files emitted, expected at least ${MIN_PAGES}`);
}

/** A route resolves if out/<route>/index.html or out/<route>.html exists. */
const resolves = (route) => {
  const clean = route.split('#')[0].split('?')[0];
  const rel = decodeURIComponent(clean).replace(/^\/+/, '');
  if (rel === '') return existsSync(join(OUT, 'index.html'));
  return (
    existsSync(join(OUT, rel, 'index.html')) ||
    existsSync(join(OUT, `${rel.replace(/\/$/, '')}.html`)) ||
    existsSync(join(OUT, rel)) // static asset (pdf, jpg, txt)
  );
};

const seen = new Set();
for (const file of html) {
  const body = readFileSync(file, 'utf8');
  for (const m of body.matchAll(/href="(\/[^"']*)"/g)) {
    const href = m[1];
    if (href.startsWith('//') || href.startsWith('/_next/')) continue;
    const key = `${href}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!resolves(href)) {
      errors.push(`dead internal link ${href} (first seen in ${relative(OUT, file)})`);
    }
  }
}

if (errors.length) {
  console.error(`\n  check-export: ${errors.length} problem(s):`);
  for (const e of errors.slice(0, 25)) console.error(`    ${e}`);
  console.error('');
  process.exit(1);
}

console.log(`  check-export: OK - ${html.length} pages, ${seen.size} internal links all resolve`);
