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
import { mkdirSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = join(HERE, '..');
const OUT = join(WEB, 'public', 'clips');

/**
 * Timecodes were chosen by contact-sheeting the master at 10-20s intervals and then
 * re-sampling each candidate window at 6s to confirm no cut falls inside it. The
 * process reel runs to a "THE END" card at ~485s, so nothing is taken after that.
 *
 * `videoId` links the clip back to the VideoAsset row it was cut from, so the site
 * can say which tape a loop comes from instead of hardcoding paths in JSX.
 */
const CLIPS = [
  // ---------------------------------------------------------- process footage
  // MS-VI-00007, tape #028. The only moving picture of Sievan actually painting.
  {
    id: 'painting-portrait',
    videoId: 'MS-VI-00007',
    src: 'Video Archive/Sievan Painting/SievanPainting#028.mp4',
    start: 144,
    duration: 22,
    // Frame offset into the clip used for the poster still.
    poster: 5,
    alt: 'Maurice Sievan working a brush across the face of a portrait in progress.',
  },
  {
    id: 'painting-landscape',
    videoId: 'MS-VI-00007',
    src: 'Video Archive/Sievan Painting/SievanPainting#028.mp4',
    start: 192,
    duration: 22,
    poster: 9,
    alt: 'Sievan painting outdoors at an easel, working a blue-grey landscape canvas.',
  },
  {
    id: 'drawing-portrait',
    videoId: 'MS-VI-00007',
    src: 'Video Archive/Sievan Painting/SievanPainting#028.mp4',
    start: 41,
    duration: 12,
    poster: 2,
    alt: 'A charcoal portrait on the easel, drawn in line, being worked at the mouth.',
  },
  {
    id: 'mixing-palette',
    videoId: 'MS-VI-00007',
    src: 'Video Archive/Sievan Painting/SievanPainting#028.mp4',
    start: 60,
    duration: 11,
    poster: 2,
    alt: "Sievan's hand drawing colour across a loaded palette with a knife.",
  },
  {
    id: 'painting-outdoors',
    videoId: 'MS-VI-00007',
    src: 'Video Archive/Sievan Painting/SievanPainting#028.mp4',
    start: 246,
    duration: 13,
    poster: 3,
    alt: 'Sievan painting at an easel outdoors while a crowd stands watching behind him.',
  },
  {
    id: 'easel-demonstration',
    videoId: 'MS-VI-00007',
    src: 'Video Archive/Sievan Painting/SievanPainting#028.mp4',
    start: 413,
    duration: 20,
    poster: 4,
    alt: 'A plein-air demonstration: Sievan in a hat at the easel, onlookers gathered round.',
  },

  // -------------------------------------------------------------- interviews
  // Silent excerpts. The tapes have sound and the site says so — these are stripped
  // to loop as portraits, not to stand in for the interview. Cut narrower and at a
  // higher CRF than the process footage to stay inside the 25 MB budget.
  {
    id: 'interview-karp',
    videoId: 'MS-VI-00001',
    src: 'Video Archive/Ivan Karp/Ivan Karp Edited.mp4',
    start: 600,
    duration: 10,
    poster: 2,
    width: 640,
    crf: 29,
    alt: 'Ivan Karp, seated and talking, in the interview held by the estate.',
  },
  {
    id: 'interview-dobkin',
    videoId: 'MS-VI-00002',
    src: 'Video Archive/John Dobkin/Dobkin Interview Edited.mp4',
    start: 240,
    duration: 10,
    poster: 2,
    width: 640,
    crf: 29,
    alt: 'John Dobkin, in a bow tie before a framed landscape, speaking to camera.',
  },
  {
    id: 'interview-solman',
    videoId: 'MS-VI-00003',
    src: 'Video Archive/Joseph Solman/Solman Interview Edited.mp4',
    start: 500,
    duration: 10,
    poster: 2,
    width: 640,
    crf: 29,
    alt: 'Joseph Solman, of The Ten, gesturing as he speaks in his own front room.',
  },
  {
    id: 'interview-wolins',
    videoId: 'MS-VI-00004',
    src: 'Video Archive/Joseph Wolins/Wolins Interview Edited.mp4',
    start: 1350,
    duration: 10,
    poster: 2,
    width: 640,
    crf: 29,
    alt: 'Joseph Wolins speaking, a painting on the wall behind him.',
  },
  {
    // MS-VI-00006. The interviewee is identified only by the filename and by a
    // speaker label in the tape's burned-in subtitles, which look machine-made and
    // are not independent evidence — the archive still records this one as
    // unidentified. The face is published in the hope someone recognises it.
    id: 'interview-unidentified',
    videoId: 'MS-VI-00006',
    src: 'Video Archive/ Subtitles/Greenberg Interview Tape #010.mp4',
    start: 175,
    duration: 8,
    poster: 5,
    width: 640,
    crf: 29,
    alt: 'The unidentified interviewee on tape #010, seated against a plain wall.',
  },
  {
    id: 'interview-barnet',
    videoId: 'MS-VI-00005',
    src: 'Video Archive/Will Barnet/Will Barnet Interview Edited.mp4',
    start: 400,
    duration: 10,
    poster: 2,
    width: 640,
    crf: 29,
    alt: 'Will Barnet, seated, talking about the years he and Sievan both worked in.',
  },
];

const ff = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });

mkdirSync(OUT, { recursive: true });

const manifest = [];
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
    '-vf', `scale=${c.width ?? 720}:-2,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(c.crf ?? 27),
    '-movflags', '+faststart',
    mp4,
  ]);

  ff([
    '-ss', String(c.start + c.poster), '-i', src,
    '-frames:v', '1', '-vf', `scale=${c.width ?? 720}:-2`, '-q:v', '4',
    jpg,
  ]);

  // Poster dimensions travel with the manifest so <img>/<video> can carry width and
  // height attributes — without them ~11 media tiles would each shift the layout.
  const probe = execFileSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height', '-of', 'csv=p=0', mp4,
  ], { encoding: 'utf8' }).trim().split(',');

  manifest.push({
    id: c.id,
    videoId: c.videoId,
    src: `/clips/${c.id}.mp4`,
    poster: `/clips/${c.id}.jpg`,
    width: Number(probe[0]),
    height: Number(probe[1]),
    duration: c.duration,
    alt: c.alt,
  });

  const bytes = statSync(mp4).size + statSync(jpg).size;
  total += bytes;
  console.log(`  ${c.id}: ${(statSync(mp4).size / 1e6).toFixed(1)} MB video + poster`);
}

// Committed alongside the media. build-data.mjs reads it to attach clips to their
// VideoAsset rows, so no component has to hardcode a path.
writeFileSync(join(OUT, 'clips.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`  extract-clips: ${manifest.length} clips, ${(total / 1e6).toFixed(1)} MB written to public/clips/`);
if (total > 25e6) {
  console.error('  extract-clips: over the 25 MB budget — shorten a clip or raise the CRF');
  process.exit(1);
}
