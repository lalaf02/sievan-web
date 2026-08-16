/**
 * Synthesized validation data.
 *
 * This module extracts and organizes the institutional validation evidence from
 * the CV page of the retrospective catalogue (retrospective.ts) and other sources.
 * It transforms raw archival data into compelling proof points.
 */

import { CV } from './retrospective';

export interface Museum {
  name: string;
  shortName: string;
  location: string;
  /** Notable for display emphasis */
  notable?: boolean;
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
 * Awards and recognitions.
 */
export const AWARDS = CV.awards.map(([award, year]) => ({ award, year }));

/**
 * Quick stats for validation bar.
 */
export const VALIDATION_STATS = {
  museumCount: MUSEUM_COLLECTIONS.length,
  notableMuseums: MUSEUM_COLLECTIONS.filter((m) => m.notable).map((m) => m.shortName),
  majorCritics: CRITICS.filter((c) => c.major).length,
  groupExhibitionCount: CV.groupExhibitions.length,
  soloExhibitionCount: CV.oneManExhibitions.length,
};

/**
 * The re-rating thesis - why this artist matters now.
 */
export const THESIS = {
  headline: 'A Private Vision',
  subhead: 'Maurice Sievan maintained imagery when abstraction was everything. The same independence that limited his commercial success makes him a compelling discovery today.',
  points: [
    'MoMA acquisition plus 12 other museum collections',
    'Praised by Clement Greenberg, Dore Ashton, Ivan Karp',
    'Peer network included Rothko, Avery, The Ten',
    'Yet almost entirely unknown to today\'s market',
    'Estate intact with nearly complete body of work',
  ],
};
