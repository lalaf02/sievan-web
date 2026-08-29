#!/usr/bin/env node
/**
 * Rasterise every scan in every MS-CS-NNN box into web-sized page images.
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
// DataModel/, the MS-CS-00N/ box directories and Video Archive/ live inside the repo,
// not beside it. One directory per physical box, discovered rather than hardcoded so
// that adding a box needs no edit here.
const SRC_DIRS = readdirSync(WEB)
  .filter((f) => /^MS-CS-\d{3}$/.test(f))
  .filter((f) => existsSync(join(WEB, f)) && statSync(join(WEB, f)).isDirectory())
  .sort()
  .map((f) => join(WEB, f));
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
/**
 * Genuinely landscape originals — wide sheets, correctly oriented. Not rotation bugs.
 * Box 2 adds a lot of them: the drawings are on envelopes, index cards and note cards
 * that are landscape by nature, so the heuristic below flags them every run unless
 * they are listed here. Each was checked by eye.
 */
const LANDSCAPE_OK = new Set([
  'MSAR00021-p02', 'MSAR00022-p02', 'MSAR00023-p01', 'MSAR00023-p03',
  // Box 2 — MS-CS-002
  'MSAR00051-p01', // landscape sketch on an envelope, signed "Sievan 69"
  'MSAR00051-p02', // ...its blank verso
  'MSAR00065-p01', // note card, "Spring Hat 20 x 24"
  'MSAR00065-p02', // ..."Lower Manhattan 22 x 28"
  'MSAR00065-p03', // ..."Winter 16 x 20"
  'MSAR00065-p04', // ..."22 x 28 landscape (on canvas board)"
  'MSAR00069-p01', // "Morning Landscape ... painted 1955, at Passedoit summer show"
  'MSAR00071-p01', // "at Sundown ... Apr 6 1958 16 x 20"
  'MSAR00071-p02', // ...its verso, a reused ledger card; kept in the recto's orientation
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
  /*
   * Box 2. Sievan wrote the title, size and price along the edge of each sheet, so
   * these came off the feeder sideways far more often than box 1 did — and unlike
   * box 1 the sheets are square-ish, so the landscape heuristic below never flagged
   * them. Every entry here was set by reading the annotation in the rendered page.
   */
  'MSAR00052-p01': 90,   // "Woodstock Landscape 12 x 16" / "Studio Interior 12 x 16"
  'MSAR00053-p01': 90,   // "SOUTHAMPTON LANDSCAPE 18 x 24 oil on canvas board" — sheet has one H
  'MSAR00054-p01': 90,   // five numbered paintings, recto
  // The verso is written the other way up from the recto: at 90 it rendered upside
  // down, which the landscape heuristic cannot see because the sheet is square-ish.
  // Found by eye, and it is the page CLAUDE.md's UI sweep names for exactly this.
  'MSAR00054-p02': 270,  // ...and verso, inverted relative to the recto
  'MSAR00055-p01': 90,   // "The Chess Game 10 3/4 x 12 water color [Paris]"
  'MSAR00056-p01': 90,   // "ProvenceTown Landscape 25 x 30 on board 400"
  'MSAR00057-p01': 90,   // "Birchland #1 ... 20 x 24"
  'MSAR00057-p02': 90,   // ...and verso
  'MSAR00059-p01': 90,   // "Scene in Woodstock, oil on paper 15 1/2 x 18"
  'MSAR00060-p01': 90,   // "Early Spring 22 x 28 oil on canvas"
  'MSAR00060-p02': 90,   // ...and verso
  'MSAR00061-p01': 90,   // "at Dusk 9 x 12 oil"
  'MSAR00062-p01': 90,   // "For the Art Students League (Oct 1957) 18 x 24" — INTERIOR (PROVINCETOWN)
  // Also inverted, and also invisible to the heuristic: at 90 the sheet rendered
  // upside down. "Hampton Bays Landscape 25 x 30 $800" / "Siesta 32 x 40 $800".
  'MSAR00066-p01': 270,  // two sketches with notes, recto
  // The verso came off the feeder sideways; the recto did not. Found by eye on the
  // rendered page, which is the only way these box-2 sheets ever surface.
  'MSAR00067-p02': 270,  // "3) THE POOL" / "Landscape #12" / "In my Naborhood" / "Sag Harbor"
  'MSAR00072-p01': 90,   // "Croton Landscape 12 x 16" / "Monhegan Seascape 16 x 20"
  'MSAR00072-p02': 90,   // ...and verso, a used envelope
  'MSAR00073-p01': 180,  // "Sold to Jeans Friends daughter / 22 x 28 oil / The Highway"
  'MSAR00074-p01': 270,  // "Landscape #3 16 x 20"
  'MSAR00075-p01': 180,  // "Shown at Kay's 1970 in Woodstock" — the numbered pastels, recto
  'MSAR00075-p02': 180,  // ...and verso
};

if (!SRC_DIRS.length) {
  console.error('  extract-scans: no MS-CS-NNN box directory found');
  process.exit(1);
}

mkdirSync(PAGES, { recursive: true });
mkdirSync(THUMBS, { recursive: true });
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

/** Every scan across every box, as {dir, file} so the source stays traceable. */
const sources = SRC_DIRS.flatMap((dir) => readdirSync(dir)
  .filter((f) => /\.(pdf|jpe?g)$/i.test(f))
  .filter((f) => !SKIP.has(f.replace(/\.[^.]+$/, '')))
  .sort()
  .map((file) => ({ dir, file })));

/** Pull each PDF page's single embedded image out at full scanner resolution. */
for (const { dir, file } of sources) {
  const stem = file.replace(/\.[^.]+$/, '');
  if (/\.pdf$/i.test(file)) {
    execFileSync('python3', ['-c', `
from pypdf import PdfReader
r = PdfReader(${JSON.stringify(join(dir, file))})
for i, page in enumerate(r.pages, 1):
    open(f"${TMP}/${stem}-p{i:02d}.bin", "wb").write(page.images[0].data)
`], { stdio: ['ignore', 'inherit', 'inherit'] });
  } else {
    // MSAR00025 is a JPG, not a PDF — the one scan that was never wrapped.
    copyFileSync(join(dir, file), join(TMP, `${stem}-p01.bin`));
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
