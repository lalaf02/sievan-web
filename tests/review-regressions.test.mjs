import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { formatRange, compareDatesUndatedLast } from '../lib/dates.ts';
import { excerptAroundMatch, highlightNeedles, highlightSegments, scoreFields, tokenize } from '../lib/search.ts';

test('exhibition endpoints retain day, month and year ranges', () => {
  assert.equal(formatRange('1963-02-07', '1963-02-28'), 'February 7–28, 1963');
  assert.equal(formatRange('1951-04', '1951-05'), 'April 1951 – May 1951');
  assert.equal(formatRange('1939', '1940'), '1939 – 1940');
  assert.equal(formatRange('1939-04-01', '1940'), 'April 1, 1939 – 1940');
});
test('redundant vague endpoints and missing dates remain honest', () => {
  assert.equal(formatRange('1939-04-01', '1939'), 'April 1, 1939');
  assert.equal(formatRange('1939-04-01', '1939-04'), 'April 1, 1939');
  assert.equal(formatRange('1939', '1939'), '1939');
  assert.equal(formatRange(null, '1939'), '1939');
  assert.equal(formatRange(null, null), null);
});
test('latest first reverses dates within the same year and keeps undated last', () => {
  const dates = [null, '1951-02-01', '1951-11-01', '1940'];
  assert.deepEqual([...dates].sort((a,b) => compareDatesUndatedLast(a,b,'desc')), ['1951-11-01','1951-02-01','1940',null]);
  assert.deepEqual([...dates].sort(compareDatesUndatedLast), ['1940','1951-02-01','1951-11-01',null]);
});
test('phrases highlight as phrases while scoring still requires every word', () => {
  const text = 'The painter was individual, original in the work.';
  const segments = highlightSegments(text, highlightNeedles('individual original'));
  assert.deepEqual(segments.filter(s => s.hit).map(s => s.text), ['individual, original']);
  assert.equal(segments.map(s=>s.text).join(''),text);
  assert.ok(scoreFields([{text,weight:1}],tokenize('original painter')) > 0);
  assert.equal(scoreFields([{text,weight:1}],tokenize('original missing')), 0);
});
test('source offsets survive ligatures, decomposed accents and astral characters', () => {
  for (const [text,query,expected] of [['A ﬁne painter','painter','painter'],['Cafe\u0301 painter','painter','painter'],['Cafe\u0301 painter','cafe','Cafe\u0301'],['🎨 ﬁne','fine','ﬁne']]) {
    const segments=highlightSegments(text,highlightNeedles(query));
    assert.deepEqual(segments.filter(s=>s.hit).map(s=>s.text),[expected]);
    assert.equal(segments.map(s=>s.text).join(''),text);
  }
});
test('a punctuation-separated phrase is visible in the result excerpt', () => {
  const text='An opening sentence. '.repeat(30)+'He was individual, original in his work.';
  const excerpt=excerptAroundMatch(text,highlightNeedles('individual original'));
  assert.ok(excerpt.includes('individual, original'));
  assert.ok(excerpt.startsWith('…'));
});


test('mixed-fraction dimensions preserve recorded edges without assigning orientation', async () => {
  const { parseDims, largestDimension } = await import('../lib/facets.ts');
  assert.deepEqual(parseDims('15 1/2 x 18'), { a: 15.5, b: 18 });
  assert.deepEqual(parseDims('10 x 12 1/2'), { a: 10, b: 12.5 });
  assert.deepEqual(parseDims('6 3/4 x 13'), { a: 6.75, b: 13 });
  assert.equal(largestDimension('10 x 12 1/2'), 12.5);
  assert.equal(parseDims('22 28'), null);
  assert.equal(parseDims('1/0 x 12'), null);
});

test('homepage collage uses five paintings around an accessible autoplaying loop', () => {
  const home = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  const footage = readFileSync(new URL('../components/Footage.tsx', import.meta.url), 'utf8');
  for (const name of ['figures.jpg', 'veil.jpg', 'earth.jpg', 'blue.jpg', 'umber-figure.jpg']) {
    assert.ok(home.includes(`/artworks/home/${name}`), `${name} must appear in the collage`);
  }
  assert.ok(home.includes('autoPlay loop controls={false}'));
  assert.ok(!home.includes('<figcaption>{item.caption}</figcaption>'));
  assert.ok(footage.includes('muted={autoPlay}'));
  assert.ok(footage.includes('poster={clip.poster}'));
});

test('catalogue keeps all evidence grades separate inside five server-rendered chapters', () => {
  const works = readFileSync(new URL('../app/works/page.tsx', import.meta.url), 'utf8');
  assert.ok(works.includes('label="Catalogue career periods"'));
  assert.ok(works.includes('PERIODS.map'));
  for (const label of ['Catalogue plates', 'Gallery reproductions', 'Estate-held sheets', 'Attested paintings']) {
    assert.ok(works.includes(label));
  }
  for (const href of ['/works/search/', '/works/periods/', '/works/attested/']) {
    assert.ok(works.includes(href));
  }
});

test('public styles use the documented breakpoint, radius, motion and colour contracts', () => {
  const roots = ['app', 'components'];
  const css = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.css')) css.push([path, readFileSync(path, 'utf8')]);
    }
  };
  roots.forEach(walk);
  const approvedBreakpoints = new Set(['1020', '860', '620', '560']);
  for (const [path, source] of css) {
    for (const match of source.matchAll(/@media \(max-width: (\d+)px\)/g)) {
      assert.ok(approvedBreakpoints.has(match[1]), `${path} uses undocumented breakpoint ${match[1]}px`);
    }
    assert.doesNotMatch(source, /(?:transition[^;]*|transition-duration:)\s*[^;]*150ms/, `${path} uses legacy 150ms motion`);
    assert.doesNotMatch(source, /border-radius:\s*2px/, `${path} bypasses --radius`);
    assert.doesNotMatch(source, /(?:^|[;{]\s*)(?:color|background(?:-color)?|border(?:-color)?):\s*(?:#[0-9a-f]{3,8}|rgba\()/im, `${path} contains a raw colour`);
  }
});
