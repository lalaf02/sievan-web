/*
 * Every foreground/background pair in tokens.css, checked to WCAG 2.1.
 * Body text and icons must reach 4.5:1; UI boundaries and large display type 3:1.
 * Run after any colour change. A failure here is a finding, not a preference.
 */
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../tokens.css', import.meta.url), 'utf8');

/* ── colour maths: OKLCH → OKLab → linear sRGB → sRGB → relative luminance ── */
function oklchToRgb(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
const clamp = (v) => Math.min(1, Math.max(0, v));
function luminance(L, C, h) {
  const [r, g, b] = oklchToRgb(L, C, h).map(clamp);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b; // already linear-light
}
const contrast = (a, b) => {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
};

/* ── parse the token blocks ── */
function block(name) {
  const re = new RegExp(`${name}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm');
  const m = src.match(re);
  if (!m) throw new Error(`block not found: ${name}`);
  const out = {};
  for (const [, k, L, C, h] of m[1].matchAll(
    /--([\w-]+):\s*oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)/g,
  )) out[k] = luminance(+L / 100, +C, +h);
  return out;
}
const themes = { dark: block(':root'), light: { ...block(':root'), ...block("\\[data-theme='light'\\]") } };

/* fg, bg, minimum, what it is */
const PAIRS = [
  ['ink', 'surface-ground', 4.5, 'body text on the page'],
  ['ink', 'surface-raised', 4.5, 'body text on a card'],
  ['ink', 'surface-overlay', 4.5, 'body text in a dropdown'],
  ['ink', 'surface-sunk', 4.5, 'body text in a well'],
  ['ink-muted', 'surface-ground', 4.5, 'secondary text'],
  ['ink-muted', 'surface-raised', 4.5, 'secondary text on a card'],
  ['ink-faint', 'surface-ground', 4.5, 'captions and metadata'],
  ['ink-faint', 'surface-raised', 4.5, 'captions on a card'],
  ['oxide', 'surface-ground', 4.5, 'primary link'],
  ['oxide', 'surface-raised', 4.5, 'primary link on a card'],
  ['accent-cool', 'surface-ground', 4.5, 'secondary accent'],
  ['flag', 'surface-ground', 4.5, 'review marker'],
  ['danger', 'surface-ground', 4.5, 'error text'],
  ['success', 'surface-ground', 4.5, 'success text'],
  ['rule-strong', 'surface-ground', 3, 'structural rule'],
  ['oxide', 'surface-sunk', 3, 'focus ring in a well'],
];

let failed = 0;
for (const [theme, t] of Object.entries(themes)) {
  console.log(`\n  ${theme}`);
  for (const [fg, bg, min, what] of PAIRS) {
    if (t[fg] === undefined || t[bg] === undefined) {
      console.log(`  ?  ${fg} on ${bg} — token missing`); failed++; continue;
    }
    const r = contrast(t[fg], t[bg]);
    const ok = r >= min;
    if (!ok) failed++;
    console.log(`  ${ok ? 'ok ' : 'FAIL'} ${r.toFixed(2)}:1 (need ${min})  ${fg} on ${bg} — ${what}`);
  }
}
console.log(failed ? `\n  ${failed} failing pair(s)\n` : '\n  all pairs pass\n');
process.exit(failed ? 1 : 0);
