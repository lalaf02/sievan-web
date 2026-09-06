/*
 * Fail the build if the vendored design layer has been edited in place.
 *
 * Vendoring's one real hazard is that design/ looks editable, and an edit made
 * here is silently lost the next time it is synced. This makes that loud, and it
 * needs nothing but this repo — so it runs in CI and on Vercel.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { hashTree } from './design-hash.mjs';

const DEST = join(dirname(fileURLToPath(import.meta.url)), '..', 'design');
const manifestPath = join(DEST, 'MANIFEST.json');

if (!existsSync(manifestPath)) {
  console.error('  check-design: design/MANIFEST.json is missing. Run `npm run design:sync`.');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const actual = hashTree(DEST);

if (actual !== manifest.hash) {
  console.error('  check-design: design/ has been edited in place.');
  console.error(`    expected ${manifest.hash.slice(0, 16)}`);
  console.error(`    actual   ${actual.slice(0, 16)}`);
  console.error('  This directory is vendored from lalaf02/sievan-design. Make the change');
  console.error('  there, run `npm run design:sync`, and commit the result.');
  process.exit(1);
}

console.log(`  check-design: OK - matches snapshot ${manifest.commit.slice(0, 8)}${manifest.sourceDirty ? " with local source changes" : ""}`);
// Integrity alone cannot catch a colour change that breaks the design contract.
const contrast = spawnSync(process.execPath, [join(DEST, 'scripts/check-contrast.mjs')], { stdio: 'inherit' });
if (contrast.error) throw contrast.error;
if (contrast.status !== 0) process.exit(contrast.status ?? 1);
