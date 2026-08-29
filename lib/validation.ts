/**
 * The institutional record, pulled out of the retrospective catalogue's CV page
 * (retrospective.ts) into shapes the UI can render.
 *
 * These are lists of things — museums that hold work, critics who wrote about it,
 * venues that showed it, artists he worked alongside. They exist so pages can
 * *exhibit* the record rather than characterise it: naming thirteen institutions
 * says more, and asks less to be taken on trust, than calling him important.
 */

export interface Museum {
  name: string;
  shortName: string;
  location: string;
  /** Notable for display emphasis */
  notable?: boolean;
  /**
   * Place.id, set ONLY where the archive independently points at the same
   * institution — which today means St. Lawrence University, named both here (from
   * the retrospective CV) and in Sievan's own hand on MS-AR-00058. It is what lets
   * a place page say that two sources agree. Do not mint places to fill this in:
   * a place nothing else references fails check-data.mjs as an orphan.
   */
  placeId?: string;
}

export interface Critic {
  name: string;
  role: string;
  /** Key quote or description of their endorsement */
  note?: string;
  /** Whether this is a particularly important endorsement */
  major?: boolean;
}

export interface ExhibitionVenue {
  name: string;
  location?: string;
  years: string;
  /** Major museum vs gallery */
  type: 'museum' | 'gallery' | 'institution';
}

/**
 * Museums with Sievan works in their permanent collections.
 * Synthesized from CV.museumCollections with added metadata.
 */
export const MUSEUM_COLLECTIONS: Museum[] = [
  {
    name: 'Museum of Modern Art',
    shortName: 'MoMA',
    location: 'New York',
    notable: true,
  },
  {
    name: 'Hirshhorn Museum',
    shortName: 'Hirshhorn',
    location: 'Washington, DC',
    notable: true,
  },
  {
    name: 'Brooklyn Museum',
    shortName: 'Brooklyn',
    location: 'New York',
    notable: true,
  },
  {
    name: 'Baltimore Museum',
    shortName: 'Baltimore',
    location: 'Maryland',
  },
  {
    name: 'Butler Institute of American Art',
    shortName: 'Butler',
    location: 'Youngstown, Ohio',
  },
  {
    name: 'Walter Chrysler Museum',
    shortName: 'Chrysler',
    location: 'Norfolk, Virginia',
  },
  {
    name: 'University of Arizona',
    shortName: 'Arizona',
    location: 'Tucson',
  },
  {
    name: 'University of Georgia',
    shortName: 'Georgia',
    location: 'Athens',
  },
  {
    name: 'Elmira College Art Collection',
    shortName: 'Elmira',
    location: 'New York',
  },
  {
    name: 'Florida Southern College',
    shortName: 'FSC',
    location: 'Lakeland',
  },
  {
    name: 'St. Lawrence University',
    shortName: 'SLU',
    location: 'Canton, NY',
    // The one entry on this list the archive can corroborate from its own holdings.
    placeId: 'st-lawrence-university',
  },
  {
    name: 'Queens Museum',
    shortName: 'Queens',
    location: 'New York',
  },
  {
    name: 'Wichita State University',
    shortName: 'Wichita',
    location: 'Kansas',
  },
];

/**
 * Critics who wrote about or endorsed Sievan.
 */
export const CRITICS: Critic[] = [
  {
    name: 'Clement Greenberg',
    role: 'America\'s preeminent art critic',
    note: 'Called Sievan "the best American artist in the 20s, 30s, and 40s"',
    major: true,
  },
  {
    name: 'Dore Ashton',
    role: 'Art critic, New York Times',
    major: true,
  },
  {
    name: 'Hilton Kramer',
    role: 'Art critic, New York Times',
    major: true,
  },
  {
    name: 'Emily Genauer',
    role: 'Art critic, Pulitzer Prize winner',
    major: true,
  },
  {
    name: 'Ivan Karp',
    role: 'Gallery owner, discovered Warhol',
    note: 'Called his work "singular and remarkable"',
    major: true,
  },
];

/**
 * Major exhibition venues from the CV.
 */
export const MAJOR_EXHIBITIONS: ExhibitionVenue[] = [
  { name: 'Museum of Modern Art', years: '1943, 1956, 1964–65', type: 'museum' },
  { name: 'Metropolitan Museum of Art', years: '1942, 1943', type: 'museum' },
  { name: 'Whitney Museum', years: '1943', type: 'museum' },
  { name: 'Brooklyn Museum', years: '1941, 1953, 1958', type: 'museum' },
  { name: 'Carnegie Institute', location: 'Pittsburgh', years: '1943, 1944, 1945', type: 'museum' },
  { name: 'Corcoran Gallery', location: 'Washington, DC', years: '1945', type: 'museum' },
  { name: 'Art Institute of Chicago', years: '1941', type: 'museum' },
  { name: 'Salon d\'Automne', location: 'Paris', years: '1931', type: 'institution' },
];

/**
 * Peer network - artists Sievan knew and worked alongside.
 */
export const PEER_NETWORK = [
  { name: 'Mark Rothko', note: 'Shared Provincetown studio' },
  { name: 'Milton Avery', note: 'Vacationed together' },
  { name: 'Will Barnet', note: 'Fellow Federation member' },
  { name: 'Joseph Solman', note: 'The Ten, Federation member' },
  { name: 'Adolph Gottlieb', note: 'Federation colleague' },
  { name: 'Stuart Davis', note: 'Federation colleague' },
];

/**
 * The two lines the homepage opens with.
 *
 * `headline` is Ivan Karp's phrase, not ours — he calls the work "a surprisingly
 * private vision" and "a very private vision" in MS-VI-00001. Using a quotation as
 * the banner is deliberate: the first characterisation a visitor reads should come
 * from someone who was there.
 *
 * `subhead` states what is on the record and stops. The counts are the CV's own
 * (14 one-man shows, 30 group exhibitions, 13 museum collections); the last clause
 * is the observable fact that follows from them. No adjective is asked to carry an
 * argument that the numbers already carry.
 */
export const THESIS = {
  headline: 'A Private Vision',
  subhead:
    'He kept the figure when New York gave it up. Fourteen one-man shows, thirty group '
    + 'exhibitions, thirteen museum collections — and then the histories of the period '
    + 'were written without him.',
};
