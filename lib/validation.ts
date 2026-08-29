/**
 * The institutional record, pulled out of the retrospective catalogue's CV page
 * (retrospective.ts) into shapes the UI can render.
 *
 * These are lists of things — museums that hold work, critics who wrote about it,
 * venues that showed it, artists he worked alongside. They exist so pages can
 * *exhibit* the record rather than characterise it: naming thirteen institutions
 * says more, and asks less to be taken on trust, than calling him important.
 */
import { CV } from './retrospective';


export interface Museum {
  name: string;
  shortName: string;
  location: string;
  /** Notable for display emphasis */
  notable?: boolean;
  /** The verbatim CV line this was derived from. */
  cvLine?: string;
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

/**
 * Museums holding Sievan's work, DERIVED from the CV transcription rather than
 * duplicating it.
 *
 * `CV.museumCollections` is the verbatim page-8 text and stays the source of truth;
 * this adds the display metadata the UI needs. Keying on the exact CV string and
 * throwing on a miss means correcting the transcription can never silently drop an
 * institution from the site — which is what a second hand-maintained list would
 * eventually have done. No import cycle: lib/retrospective.ts imports nothing.
 */
const MUSEUM_META: Record<string, Omit<Museum, 'cvLine'>> = {
  'Museum of Modern Art, NYC':
    { name: 'Museum of Modern Art', shortName: 'MoMA', location: 'New York', notable: true },
  'Hirshhorn Museum, Washington, DC':
    { name: 'Hirshhorn Museum', shortName: 'Hirshhorn', location: 'Washington, DC', notable: true },
  'Brooklyn Museum, Brooklyn, NY':
    { name: 'Brooklyn Museum', shortName: 'Brooklyn', location: 'New York', notable: true },
  'Baltimore Museum':
    { name: 'Baltimore Museum', shortName: 'Baltimore', location: 'Maryland' },
  'Butler Institute of Amer. Art, Youngstown, Ohio':
    { name: 'Butler Institute of American Art', shortName: 'Butler', location: 'Youngstown, Ohio' },
  'Walter Chrysler Museum':
    { name: 'Walter Chrysler Museum', shortName: 'Chrysler', location: 'Norfolk, Virginia' },
  'Univ. of Arizona, Tucson, Ariz.':
    { name: 'University of Arizona', shortName: 'Arizona', location: 'Tucson' },
  'Univ. of Georgia, Athens, Ga.':
    { name: 'University of Georgia', shortName: 'Georgia', location: 'Athens' },
  'Elmira College Art Collection, NY':
    { name: 'Elmira College Art Collection', shortName: 'Elmira', location: 'New York' },
  'Florida Southern College, Lakeland':
    { name: 'Florida Southern College', shortName: 'FSC', location: 'Lakeland' },
  // The one entry on this list the archive can corroborate from its own holdings.
  'St. Lawrence Univ., Canton, NY':
    { name: 'St. Lawrence University', shortName: 'SLU', location: 'Canton, NY', placeId: 'st-lawrence-university' },
  'Queens Museum, Flushing, NY':
    { name: 'Queens Museum', shortName: 'Queens', location: 'New York' },
  'Wichita State Univ., Wichita, Kan.':
    { name: 'Wichita State University', shortName: 'Wichita', location: 'Kansas' },
};

export const MUSEUM_COLLECTIONS: Museum[] = CV.museumCollections.map((cvLine) => {
  const meta = MUSEUM_META[cvLine];
  if (!meta) {
    throw new Error(
      `lib/validation.ts: no metadata for CV museum line "${cvLine}". Add it to `
      + 'MUSEUM_META — the CV transcription is the source of truth, and an '
      + 'institution must never drop off the site because a line was corrected.',
    );
  }
  return { ...meta, cvLine };
});

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
