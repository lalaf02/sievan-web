#!/usr/bin/env node
/**
 * One-off: cut short, silent, web-sized loops out of the video masters.
 *
 * The masters are 25 GB in `Video Archive/` and will never be served — this is a
 * static export, and the whole point of the architecture is that the site outlives
 * any hosting account. Committing a few megabytes of excerpt keeps the archive
 * self-contained; a third-party embed would not.
 *
 * The output is committed, so a normal build never runs this. Re-run it only when
 * changing which moments are shown:
 *
 *   node scripts/extract-clips.mjs
 *
 * Needs ffmpeg on PATH.
 *
 * Note on picking moments: there is no alignment between the transcripts and the
 * video timecode (`DataModel/work/timecode/` was started and not finished), so the
 * interview clips cannot yet be cut to land on a specific sentence. Everything here
 * comes from the process footage, which needs no speech alignment to be worth
 * watching — it is the only moving image of Sievan actually painting.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = join(HERE, '..');
const OUT = join(WEB, 'public', 'clips');

/** Timecodes were chosen by contact-sheeting the master at 10s intervals. */
const CLIPS = [
  {
    id: 'painting-portrait',
    src: 'Video Archive/Sievan Painting/SievanPainting#028.mp4',
    start: 144,
    duration: 22,
    // Frame offset into the clip used for the poster still.
    poster: 5,
    alt: 'Maurice Sievan working a brush across the face of a portrait in progress.',
  },
  {
    id: 'painting-landscape',
    src: 'Video Archive/Sievan Painting/SievanPainting#028.mp4',
    start: 192,
    duration: 22,
    poster: 9,
    alt: 'Sievan painting outdoors at an easel, working a blue-grey landscape canvas.',
  },
];

const ff = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });

mkdirSync(OUT, { recursive: true });

let total = 0;
for (const c of CLIPS) {
  const src = join(WEB, c.src);
  if (!existsSync(src)) {
    console.error(`  extract-clips: master missing, skipping ${c.id} (${c.src})`);
    continue;
  }

  const mp4 = join(OUT, `${c.id}.mp4`);
  const jpg = join(OUT, `${c.id}.jpg`);

  // -ss before -i seeks fast; re-encoding guarantees a keyframe at the cut.
  // No audio: these autoplay as loops, and a muted track is dead weight.
  ff([
    '-ss', String(c.start), '-t', String(c.duration), '-i', src,
    '-an',
    '-vf', 'scale=720:-2,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '27',
    '-movflags', '+faststart',
    mp4,
  ]);

  ff([
    '-ss', String(c.start + c.poster), '-i', src,
    '-frames:v', '1', '-vf', 'scale=720:-2', '-q:v', '4',
    jpg,
  ]);

  const bytes = statSync(mp4).size + statSync(jpg).size;
  total += bytes;
  console.log(`  ${c.id}: ${(statSync(mp4).size / 1e6).toFixed(1)} MB video + poster`);
}

console.log(`  extract-clips: ${(total / 1e6).toFixed(1)} MB written to public/clips/`);
if (total > 25e6) {
  console.error('  extract-clips: over the 25 MB budget — shorten a clip or raise the CRF');
  process.exit(1);
}
