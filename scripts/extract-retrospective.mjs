#!/usr/bin/env node
/**
 * Extract the retrospective catalogue (MS-AR-00026) into web-sized page images.
 *
 * Each PDF page is a single flat scan — the plates are not separable objects — so
 * the page is the unit. Run once; the output is committed, so the build never
 * depends on Python, pypdf or macOS.
 *
 *   node scripts/extract-retrospective.mjs
 *
 * Requires python3 + pypdf for the extract, and macOS `sips` for the resize.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..');
// MS-CS-001/ lives inside the repo, not beside it.
const SRC = join(WEB, 'MS-CS-001', 'MSAR00026.pdf');
const OUT = join(WEB, 'public', 'retrospective');
const TMP = join(WEB, '.retrospective-tmp');

if (!existsSync(SRC)) {
  console.error(`  extract-retrospective: ${SRC} not found`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

// Each page holds exactly one embedded image: the scan of the whole sheet.
execFileSync('python3', ['-c', `
from pypdf import PdfReader
r = PdfReader(${JSON.stringify(SRC)})
for i, page in enumerate(r.pages, 1):
    img = page.images[0]
    open(f"${TMP}/p{i:02d}.png", "wb").write(img.data)
print(len(r.pages))
`], { stdio: ['ignore', 'inherit', 'inherit'] });

const pages = readdirSync(TMP).filter((f) => f.endsWith('.png')).sort();
for (const file of pages) {
  const out = join(OUT, file.replace('.png', '.jpg'));
  // ~1500px wide is enough to read the typescript and see the plates clearly.
  execFileSync('sips', [
    '-s', 'format', 'jpeg', '-s', 'formatOptions', '78',
    '-Z', '1500', join(TMP, file), '--out', out,
  ], { stdio: 'ignore' });
}

rmSync(TMP, { recursive: true, force: true });

const total = readdirSync(OUT)
  .filter((f) => f.endsWith('.jpg'))
  .reduce((n, f) => n + statSync(join(OUT, f)).size, 0);
console.log(
  `  extract-retrospective: ${pages.length} pages -> public/retrospective/ ` +
  `(${(total / 1e6).toFixed(1)} MB)`,
);
