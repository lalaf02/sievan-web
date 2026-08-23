/**
 * Curated testimony from the interview transcripts.
 *
 * These are hand-transcribed from MS-VI-00001 through MS-VI-00005 — the most
 * compelling passages in 24,000 words that nobody would otherwise read.
 *
 * Every quote carries an `anchor`: a short phrase verified to appear verbatim in
 * the transcript (after `lib/search.ts` normalisation) and the page it appears on.
 * `quoteHref()` turns that into a link that opens the transcript reader scrolled to
 * the page with the passage already highlighted — `TranscriptReader` reads `?q=`
 * on mount. Without the anchor a quote is a dead end; with it, it is a door into
 * the source.
 *
 * If you edit a quote's text, re-verify its anchor still matches the transcript.
 */

export interface Quote {
  /** Stable identifier. Required — FEATURED_QUOTES and any deep link select by it. */
  id: string;
  text: string;
  speaker: string;
  role: string;
  /** The interview page the quote lives on. */
  source: string;
  /** Phrase verified present in the transcript, used to highlight the passage. */
  anchor: string;
  /** Transcript page the anchor was found on. */
  page: number;
  category: 'aesthetic' | 'originality' | 'validation' | 'character';
}

/**
 * Link into the transcript with the passage lit and the page scrolled to.
 * `?q=` is consumed by TranscriptReader; `#p{n}` by its page anchors.
 */
export function quoteHref(q: Quote): string {
  return `${q.source}?q=${encodeURIComponent(q.anchor)}#p${q.page}`;
}

/** Look a quote up by id, so selections survive reordering. */
export function getQuote(id: string): Quote {
  const q = ALL_QUOTES.find((x) => x.id === id);
  if (!q) throw new Error(`unknown quote id: ${id}`);
  return q;
}

/**
 * The Greenberg endorsement, reported by Ivan Karp — the single most important
 * validation in the archive. MS-VI-00001, page 11.
 */
export const GREENBERG_QUOTE: Quote = {
  id: 'greenberg-best',
  text: 'the best American artist in the 20s, 30s, and 40s',
  speaker: 'Clement Greenberg',
  role: 'America’s preeminent art critic, as reported by Ivan Karp',
  source: '/life/interviews/MS-VI-00001/',
  anchor: 'the best american artist in the',
  page: 11,
  category: 'validation',
};

/** Ivan Karp — gallery owner who discovered Warhol and Lichtenstein. MS-VI-00001. */
const KARP = { speaker: 'Ivan Karp', role: 'Gallery owner, discovered Warhol', source: '/life/interviews/MS-VI-00001/' } as const;

export const KARP_QUOTES: Quote[] = [
  {
    id: 'karp-singular',
    text: 'singular and remarkable and mature, totally mature work',
    anchor: 'singular and remarkable and mature totally',
    page: 1,
    category: 'aesthetic',
    ...KARP,
  },
  {
    id: 'karp-innovator',
    text: 'an innovator of a surprisingly private vision',
    anchor: 'an innovator of a surprisingly private',
    page: 1,
    category: 'originality',
    ...KARP,
  },
  {
    id: 'karp-appellation',
    text: 'I couldn’t come up with an appellation… it was a private vision',
    anchor: 'i couldn t come up with',
    page: 6,
    category: 'originality',
    ...KARP,
  },
  {
    id: 'karp-mystical',
    text: 'the paintings had a kind of a mystical, almost a haunted character',
    anchor: 'the paintings had a kind of',
    page: 1,
    category: 'aesthetic',
    ...KARP,
  },
  {
    id: 'karp-contributed',
    text: 'an artist who contributed in a singular way to the American fine arts culture',
    anchor: 'an artist who contributed in a',
    page: 5,
    category: 'validation',
    ...KARP,
  },
  {
    id: 'karp-national-recognition',
    text: 'worthy of national recognition for his remarkable maturity of craftsmanship and the ongoing singular quality of his vision',
    anchor: 'worthy of national recognition for his',
    page: 11,
    category: 'validation',
    ...KARP,
  },
  {
    id: 'karp-no-trends',
    text: 'his work did not distinctly connect up to prevailing trends. It was always singular',
    anchor: 'his work did not distinctly connect',
    page: 5,
    category: 'originality',
    ...KARP,
  },
  {
    id: 'karp-continuity',
    text: 'a very private vision and it has continuity… it can’t be anybody else, it’s Maurice',
    anchor: 'a very private vision and it',
    page: 10,
    category: 'originality',
    ...KARP,
  },
];

/** Will Barnet — major American painter, 1911–2012. MS-VI-00005. */
const BARNET = { speaker: 'Will Barnet', role: 'Major American painter', source: '/life/interviews/MS-VI-00005/' } as const;

export const BARNET_QUOTES: Quote[] = [
  {
    id: 'barnet-rembrandt',
    text: 'warm quality in his paint, the way he put the color on… almost Rembrandt-like',
    anchor: 'warm quality in his paint the',
    page: 2,
    category: 'aesthetic',
    ...BARNET,
  },
  {
    id: 'barnet-someday',
    text: 'someday will be recognized and be placed in history',
    anchor: 'someday will be recognized and be',
    page: 12,
    category: 'validation',
    ...BARNET,
  },
  {
    id: 'barnet-pathos',
    text: 'a sense of pathos that you could feel in his work that you don’t feel really in most expressionist work',
    anchor: 'a sense of pathos that you',
    page: 2,
    category: 'aesthetic',
    ...BARNET,
  },
  {
    id: 'barnet-passion',
    text: 'there was a passion… a very strong individual feeling about life',
    anchor: 'there was a passion',
    page: 8,
    category: 'character',
    ...BARNET,
  },
  {
    id: 'barnet-individual',
    text: 'he was basically a very strong individual artist',
    anchor: 'was basically a very strong individual',
    page: 8,
    category: 'originality',
    ...BARNET,
  },
  {
    id: 'barnet-luminosity',
    text: 'luminosity in the work… the way he put layer and layer of tones on each other were very luminous and had a certain kind of inner drama',
    anchor: 'luminosity in the work',
    page: 12,
    category: 'aesthetic',
    ...BARNET,
  },
];

/** Joseph Solman — member of The Ten with Rothko. MS-VI-00003. */
const SOLMAN = { speaker: 'Joseph Solman', role: 'The Ten, peer of Rothko', source: '/life/interviews/MS-VI-00003/' } as const;

export const SOLMAN_QUOTES: Quote[] = [
  {
    id: 'solman-suburbs',
    text: 'nobody had done the poetry of the suburbs just like he had',
    anchor: 'had done the poetry of the',
    page: 2,
    category: 'originality',
    ...SOLMAN,
  },
  {
    id: 'solman-original',
    text: 'a perfectly fine artist, unusual artist, an original artist',
    anchor: 'a perfectly fine artist unusual artist',
    page: 14,
    category: 'validation',
    ...SOLMAN,
  },
  {
    id: 'solman-gift',
    text: 'his gift of putting on paint was remarkable',
    anchor: 'his gift of putting on paint',
    page: 4,
    category: 'aesthetic',
    ...SOLMAN,
  },
  {
    id: 'solman-rehabilitation',
    text: 'he certainly needs a rehabilitation… quality so superior to the haphazard work done today',
    anchor: 'he certainly needs a rehabilitation',
    page: 14,
    category: 'validation',
    ...SOLMAN,
  },
  {
    id: 'solman-adventurers',
    text: 'one of the individual, original adventurers of that period',
    anchor: 'one of the individual original adventurers',
    page: 14,
    category: 'originality',
    ...SOLMAN,
  },
  {
    id: 'solman-resourceful',
    text: 'he had quite a variety of techniques. He was technically very resourceful, more than most painters are today',
    anchor: 'he had quite a variety of',
    page: 11,
    category: 'aesthetic',
    ...SOLMAN,
  },
];

/** Joseph Wolins — WPA artist, National Academy peer. MS-VI-00004. */
export const WOLINS_QUOTES: Quote[] = [
  {
    id: 'wolins-explorative',
    text: 'he was a much more explorative experimental artist than I was at the time',
    speaker: 'Joseph Wolins',
    role: 'WPA artist, National Academy peer',
    source: '/life/interviews/MS-VI-00004/',
    anchor: 'explorative experimental artist than i was',
    page: 2,
    category: 'originality',
  },
];

export const ALL_QUOTES: Quote[] = [
  GREENBERG_QUOTE,
  ...KARP_QUOTES,
  ...BARNET_QUOTES,
  ...SOLMAN_QUOTES,
  ...WOLINS_QUOTES,
];

/**
 * The homepage and Life pages select from here. Selected by id, not array index,
 * so reordering a speaker's quotes cannot silently change what the front page says.
 */
export const FEATURED_QUOTES: Quote[] = [
  'greenberg-best',
  'karp-singular',
  'karp-mystical',
  'barnet-rembrandt',
  'solman-suburbs',
  'barnet-someday',
].map((id) => getQuote(id));

export function getQuotesByCategory(category: Quote['category']): Quote[] {
  return ALL_QUOTES.filter((q) => q.category === category);
}
