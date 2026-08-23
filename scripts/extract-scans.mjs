#!/usr/bin/env node
/**
 * Rasterise every scan in MS-CS-001 into web-sized page images.
 *
 * The scans are the archive's only substantial imagery, and until now they were
 * unusable: 30 of the 31 files are PDFs, so nothing could put them in an `<img>`.
 * Object pages rendered a beige box reading "Open the scan" and the exhibitions
 * index listed fifteen shows as plain text while fifteen catalogue covers sat on
 * disk. This script makes them visible.
 *
 * Every PDF page holds exactly one embedded raster at ~600 dpi with no text layer,
 * so the page is the unit and the extract is mechanical — same recipe as
 * extract-retrospective.mjs, generalised from one hardcoded file to all of them.
 *
 *   node scripts/extract-scans.mjs
 *
 * Two tiers, because a mosaic built from the page tier would weigh ~24 MB:
 *
 *   public/scans/pages/   1500px, q78  — the record page, read the clipping
 *   public/scans/thumbs/   600px, q70  — mosaic tiles
 *
 * Requires python3 + pypdf for the extract and macOS `sips` for the resize. Run
 * once; the output is committed, so the Vercel build never needs any of them.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, readdirSync, rmSync, statSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..');
// DataModel/, MS-CS-001/ and Video Archive/ live inside the repo, not beside it.
const SRC = join(WEB, 'MS-CS-001');
const PAGES = join(WEB, 'public', 'scans', 'pages');
const THUMBS = join(WEB, 'public', 'scans', 'thumbs');
const TMP = join(WEB, '.scans-tmp');

/**
 * MS-AR-00026 is the retrospective catalogue. extract-retrospective.mjs already
 * publishes its fifteen pages to public/retrospective/ with their own transcriptions
 * in lib/retrospective.ts; a second copy here would be the same sheets under a
 * different name.
 */
const SKIP = new Set(['MSAR00026']);

/**
 * Scanner output has no orientation flag and sips cannot infer one, so sheets that
 * went through the feeder sideways come out sideways. Degrees clockwise, keyed by
 * output stem. Populated by eye from the first run — see the console summary, which
 * flags every landscape page as a candidate.
 */
/** Genuinely landscape originals — wide sheets, correctly oriented. Not rotation bugs. */
const LANDSCAPE_OK = new Set([
  'MSAR00021-p02', 'MSAR00022-p02', 'MSAR00023-p01', 'MSAR00023-p03',
]);

const ROTATE = {
  'MSAR00003I-p01': 90,  // Arts / Art News, April 1957
  'MSAR00003II-p01': 90, // Herald Tribune / The New Yorker / NYT, March 1957
  'MSAR00017-p01': 270,  // The Nantucket Town Crier, 1947
  'MSAR00018-p01': 90,   // New York Post, "In the Art Galleries", 1960
  'MSAR00027-p01': 90,   // Albert Landry Gallery invitation, cover
  'MSAR00027-p02': 90,   // ...and its photograph of Sievan
  'MSAR00027-p03': 270,  // ...Kenneth B. Sawyer's essay, recto
  'MSAR00027-p04': 270,  // ...and verso
  'MSAR00028-p02': 270,  // Passedoit Gallery 1955, checklist of oils
  'MSAR00028-p03': 270,  // ...and its gallery hours
  'MSAR00029-p02': 270,  // Vanderwoude Tananbaum, address panel
  'MSAR00030-p02': 270,  // Passedoit Gallery 1957, checklist
};

if (!existsSync(SRC)) {
  console.error(`  extract-scans: ${SRC} not found`);
  process.exit(1);
}

mkdirSync(PAGES, { recursive: true });
mkdirSync(THUMBS, { recursive: true });
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

const sources = readdirSync(SRC)
  .filter((f) => /\.(pdf|jpe?g)$/i.test(f))
  .filter((f) => !SKIP.has(f.replace(/\.[^.]+$/, '')))
  .sort();

/** Pull each PDF page's single embedded image out at full scanner resolution. */
for (const file of sources) {
  const stem = file.replace(/\.[^.]+$/, '');
  if (/\.pdf$/i.test(file)) {
    execFileSync('python3', ['-c', `
from pypdf import PdfReader
r = PdfReader(${JSON.stringify(join(SRC, file))})
for i, page in enumerate(r.pages, 1):
    open(f"${TMP}/${stem}-p{i:02d}.bin", "wb").write(page.images[0].data)
`], { stdio: ['ignore', 'inherit', 'inherit'] });
  } else {
    // MSAR00025 is a JPG, not a PDF — the one scan that was never wrapped.
    copyFileSync(join(SRC, file), join(TMP, `${stem}-p01.bin`));
  }
}

const resize = (from, to, max, quality) => execFileSync('sips', [
  '-s', 'format', 'jpeg', '-s', 'formatOptions', String(quality),
  '-Z', String(max), from, '--out', to,
], { stdio: 'ignore' });

const landscape = [];
const extracted = readdirSync(TMP).filter((f) => f.endsWith('.bin')).sort();

for (const file of extracted) {
  const stem = file.replace(/\.bin$/, '');
  const src = join(TMP, file);

  const turn = ROTATE[stem];
  if (turn) execFileSync('sips', ['-r', String(turn), src], { stdio: 'ignore' });

  resize(src, join(PAGES, `${stem}.jpg`), 1500, 78);
  resize(src, join(THUMBS, `${stem}.jpg`), 600, 70);

  // Report anything wider than it is tall: these sheets are letter-format originals,
  // so landscape almost always means the scan needs a ROTATE entry.
  const dims = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', join(PAGES, `${stem}.jpg`)], { encoding: 'utf8' });
  const [w, h] = [...dims.matchAll(/pixel(?:Width|Height): (\d+)/g)].map((m) => Number(m[1]));
  if (w > h && !turn && !LANDSCAPE_OK.has(stem)) landscape.push(`${stem} (${w}x${h})`);
}

rmSync(TMP, { recursive: true, force: true });

const weigh = (dir) => readdirSync(dir)
  .filter((f) => f.endsWith('.jpg'))
  .reduce((n, f) => n + statSync(join(dir, f)).size, 0);

console.log(
  `  extract-scans: ${extracted.length} pages from ${sources.length} scans -> ` +
  `pages/ (${(weigh(PAGES) / 1e6).toFixed(1)} MB) + thumbs/ (${(weigh(THUMBS) / 1e6).toFixed(1)} MB)`,
);
if (landscape.length) {
  console.log(`  extract-scans: ${landscape.length} landscape page(s) — add to ROTATE if sideways:`);
  for (const l of landscape) console.log(`    ${l}`);
}
