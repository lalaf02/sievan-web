import { test } from 'node:test';
import assert from 'node:assert/strict';
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
