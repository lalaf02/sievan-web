/*
 * Content hash of the vendored design tree.
 *
 * Its own module because check-design.mjs must not import sync-design.mjs:
 * that script does its work at the top level, so importing it would re-run the
 * sync as a side effect of checking it.
 */
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

/* MANIFEST.json holds the hash and README.md is generated, so neither is hashed. */
const EXCLUDE = new Set(['MANIFEST.json', 'README.md']);

export function hashTree(dir) {
  const files = [];
  (function walk(d) {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else files.push(p);
    }
  })(dir);

  const h = createHash('sha256');
  for (const f of files) {
    const rel = relative(dir, f).split('\\').join('/');
    if (EXCLUDE.has(rel)) continue;
    h.update(rel); h.update('\0'); h.update(readFileSync(f)); h.update('\0');
  }
  return h.digest('hex');
}
