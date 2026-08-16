/**
 * Curated endorsement quotes from interviews and critical writing.
 *
 * These quotes are extracted from the video transcripts (MS-VI-00001 through
 * MS-VI-00005) and represent the most compelling testimonials about Sievan's
 * work and character. They surface evidence that was previously buried in
 * 24,000 words of transcript.
 */

export interface Quote {
  text: string;
  speaker: string;
  role: string;
  /** Optional source reference for deep linking */
  source?: string;
  /** Category for filtering */
  category: 'aesthetic' | 'originality' | 'validation' | 'character';
}

/**
 * The Greenberg endorsement - the single most important validation quote.
 * Reported by Ivan Karp in his interview (MS-VI-00001, page 11-12).
 */
export const GREENBERG_QUOTE: Quote = {
  text: 'the best American artist in the 20s, 30s, and 40s',
  speaker: 'Clement Greenberg',
  role: 'America\'s preeminent art critic',
  source: '/life/interviews/MS-VI-00001/',
  category: 'validation',
};

/**
 * Ivan Karp quotes - gallery owner who discovered Warhol, Lichtenstein, and others.
 * From MS-VI-00001.
 */
export const KARP_QUOTES: Quote[] = [
  {
    text: 'singular and remarkable and mature, totally mature work',
    speaker: 'Ivan Karp',
    role: 'Gallery owner, discovered Warhol',
    source: '/life/interviews/MS-VI-00001/',
    category: 'aesthetic',
  },
  {
    text: 'an innovator of a surprisingly private vision',
    speaker: 'Ivan Karp',
    role: 'Gallery owner, discovered Warhol',
    source: '/life/interviews/MS-VI-00001/',
    category: 'originality',
  },
  {
    text: 'I couldn\'t come up with an appellation... it was a private vision',
    speaker: 'Ivan Karp',
    role: 'Gallery owner, discovered Warhol',
    source: '/life/interviews/MS-VI-00001/',
    category: 'originality',
  },
  {
    text: 'the paintings had a kind of a mystical, almost a haunted character',
    speaker: 'Ivan Karp',
    role: 'Gallery owner, discovered Warhol',
    source: '/life/interviews/MS-VI-00001/',
    category: 'aesthetic',
  },
  {
    text: 'an artist who contributed in a singular way to the American fine arts culture',
    speaker: 'Ivan Karp',
    role: 'Gallery owner, discovered Warhol',
    source: '/life/interviews/MS-VI-00001/',
    category: 'validation',
  },
  {
    text: 'worthy of national recognition for his remarkable maturity of craftsmanship and the ongoing singular quality of his vision',
    speaker: 'Ivan Karp',
    role: 'Gallery owner, discovered Warhol',
    source: '/life/interviews/MS-VI-00001/',
    category: 'validation',
  },
  {
    text: 'his work did not distinctly connect up to prevailing trends. It was always singular',
    speaker: 'Ivan Karp',
    role: 'Gallery owner, discovered Warhol',
    source: '/life/interviews/MS-VI-00001/',
    category: 'originality',
  },
  {
    text: 'a very private vision and it has continuity... it can\'t be anybody else, it\'s Maurice',
    speaker: 'Ivan Karp',
    role: 'Gallery owner, discovered Warhol',
    source: '/life/interviews/MS-VI-00001/',
    category: 'originality',
  },
];

/**
 * Will Barnet quotes - major American painter (1911-2012).
 * From MS-VI-00005.
 */
export const BARNET_QUOTES: Quote[] = [
  {
    text: 'warm quality in his paint, the way he put the color on... almost Rembrandt-like',
    speaker: 'Will Barnet',
    role: 'Major American painter',
    source: '/life/interviews/MS-VI-00005/',
    category: 'aesthetic',
  },
  {
    text: 'someday will be recognized and be placed in history',
    speaker: 'Will Barnet',
    role: 'Major American painter',
    source: '/life/interviews/MS-VI-00005/',
    category: 'validation',
  },
  {
    text: 'a sense of pathos that you could feel in his work that you don\'t feel really in most expressionist work',
    speaker: 'Will Barnet',
    role: 'Major American painter',
    source: '/life/interviews/MS-VI-00005/',
    category: 'aesthetic',
  },
  {
    text: 'there was a passion... a very strong individual feeling about life',
    speaker: 'Will Barnet',
    role: 'Major American painter',
    source: '/life/interviews/MS-VI-00005/',
    category: 'character',
  },
  {
    text: 'he was basically a very strong individual artist',
    speaker: 'Will Barnet',
    role: 'Major American painter',
    source: '/life/interviews/MS-VI-00005/',
    category: 'originality',
  },
  {
    text: 'luminosity in the work... the way he put layer and layer of tones on each other were very luminous and had a certain kind of inner drama',
    speaker: 'Will Barnet',
    role: 'Major American painter',
    source: '/life/interviews/MS-VI-00005/',
    category: 'aesthetic',
  },
];

/**
 * Joseph Solman quotes - member of The Ten with Rothko, major American painter.
 * From MS-VI-00003.
 */
export const SOLMAN_QUOTES: Quote[] = [
  {
    text: 'nobody had done the poetry of the suburbs just like he had',
    speaker: 'Joseph Solman',
    role: 'The Ten, peer of Rothko',
    source: '/life/interviews/MS-VI-00003/',
    category: 'originality',
  },
  {
    text: 'a perfectly fine artist, unusual artist, an original artist',
    speaker: 'Joseph Solman',
    role: 'The Ten, peer of Rothko',
    source: '/life/interviews/MS-VI-00003/',
    category: 'validation',
  },
  {
    text: 'his gift of putting on paint was remarkable',
    speaker: 'Joseph Solman',
    role: 'The Ten, peer of Rothko',
    source: '/life/interviews/MS-VI-00003/',
    category: 'aesthetic',
  },
  {
    text: 'he certainly needs a rehabilitation... quality so superior to the haphazard work done today',
    speaker: 'Joseph Solman',
    role: 'The Ten, peer of Rothko',
    source: '/life/interviews/MS-VI-00003/',
    category: 'validation',
  },
  {
    text: 'one of the individual, original adventurers of that period',
    speaker: 'Joseph Solman',
    role: 'The Ten, peer of Rothko',
    source: '/life/interviews/MS-VI-00003/',
    category: 'originality',
  },
  {
    text: 'he had quite a variety of techniques. He was technically very resourceful, more than most painters are today',
    speaker: 'Joseph Solman',
    role: 'The Ten, peer of Rothko',
    source: '/life/interviews/MS-VI-00003/',
    category: 'aesthetic',
  },
];

/**
 * Joseph Wolins quotes - WPA artist, National Academy peer.
 * From MS-VI-00004.
 */
export const WOLINS_QUOTES: Quote[] = [
  {
    text: 'he was a much more explorative experimental artist than I was at the time',
    speaker: 'Joseph Wolins',
    role: 'WPA artist, National Academy peer',
    source: '/life/interviews/MS-VI-00004/',
    category: 'originality',
  },
];

/**
 * All quotes combined for iteration.
 */
export const ALL_QUOTES: Quote[] = [
  GREENBERG_QUOTE,
  ...KARP_QUOTES,
  ...BARNET_QUOTES,
  ...SOLMAN_QUOTES,
  ...WOLINS_QUOTES,
];

/**
 * Featured quotes for homepage rotation - the most compelling subset.
 */
export const FEATURED_QUOTES: Quote[] = [
  GREENBERG_QUOTE,
  KARP_QUOTES[0], // singular and remarkable
  KARP_QUOTES[3], // mystical, haunted
  BARNET_QUOTES[0], // Rembrandt-like
  SOLMAN_QUOTES[0], // poetry of the suburbs
  BARNET_QUOTES[1], // someday will be recognized
];

/**
 * Get quotes by category.
 */
export function getQuotesByCategory(category: Quote['category']): Quote[] {
  return ALL_QUOTES.filter((q) => q.category === category);
}
