/**
 * The retrospective catalogue, MS-AR-00026.
 *
 * A fifteen-page typescript mock-up held in the archive box: a signed cover, an
 * illustrated chronology of Sievan's career in five periods, and a full CV. It is
 * a working draft, not a published book — one page carries a pasted note reading
 * "This page is way off color. Being corrected in expanded typeset brochure in
 * January."
 *
 * The scans have no text layer, so the captions below were transcribed by reading
 * the pages. Only pages that were read are described; the rest are published as
 * images without a summary rather than with a guessed one.
 */

export interface RetrospectivePage {
  page: number;
  image: string;
  /** Section heading as printed on the page. */
  heading: string | null;
  /** Transcribed from the page. Null where the page has not been transcribed. */
  text: string[] | null;
  /** Years printed beside the plates on this page. */
  plateYears: number[];
  caption: string | null;
}

export const RETROSPECTIVE_PAGES: RetrospectivePage[] = [
  {
    page: 1,
    image: '/retrospective/p01.jpg',
    heading: 'Cover',
    text: null,
    plateYears: [],
    caption: 'Sievan’s signature, and a photograph of the painter in his studio.',
  },
  {
    page: 2,
    image: '/retrospective/p02.jpg',
    heading: null,
    text: null,
    plateYears: [],
    caption: null,
  },
  {
    page: 3,
    image: '/retrospective/p03.jpg',
    heading: 'Beginnings (1915–30)',
    text: [
      'Studying in a children’s art class at Brooklyn’s Pratt Institute, Maurice Sievan ' +
      '(at age 15!) was drawing a weekly cartoon for the Jewish Daily Forward.',
      'Eventually, he enrolled in the National Academy of Design. There he was influenced ' +
      'by his teachers, especially by Charles W. Hawthorne who encouraged Sievan to break ' +
      'through the traditional rules of academe.',
      'Later he studied in Paris for a year during which he exhibited his work at the ' +
      'prestigeous Salon D’Automne.',
    ],
    plateYears: [1925, 1930, 1930],
    caption: null,
  },
  {
    page: 4,
    image: '/retrospective/p04.jpg',
    heading: 'Landscapes (1930s and ’40s)',
    text: [
      'From his studio in Greenwich Village, Sievan ventured forth to paint New York’s ' +
      'urban lanscapes.',
      'Moving to Flushing, Sievan painted the scenes of suburbia in his own original style.',
      'Summers he tackled the countryside at Woodstock, Provincetown and elsewhere, moving ' +
      'gradually toward the semi-abstract in depicting nature.',
    ],
    plateYears: [1938, 1945, 1948],
    caption: null,
  },
  {
    page: 5,
    image: '/retrospective/p05.jpg',
    heading: 'A New Freedom (The ’50s and ’60s)',
    text: [
      'After viewing the environment from the air, during a European trip in 1956, Maurice ' +
      'Sievan experienced a new astral view of his world. He abandoned painting from direct ' +
      'observation.',
      'Relying on recollections of what he had painted in the past and on his attention to ' +
      'ongoing experience, Sievan felt liberated to adopt larger formats with greater ' +
      'freedom and abandon.',
      'His paintings became a triple entendre of vision, memory and philosophy.',
    ],
    plateYears: [1954, 1957, 1952],
    caption: 'The middle photograph shows Sievan seated before one of his paintings, 1957.',
  },
  {
    page: 6,
    image: '/retrospective/p06.jpg',
    heading: 'A Larger Scale (The ’60s)',
    text: [
      'Now painting on a larger scale, Sievan skirts the boundaries of abstract expressionism ' +
      'without excluding mysterious imagery.',
      'These impressive works, contemporary in their feeling, were popular wherever shown.',
      'The one shown here to the left was purchased by the Museum of Modern Art in New York.',
      'Collectors acquired others from two exhibitions at New York’s Vanderwoude-Tananbaum ' +
      'Gallery and from a show at the Paule Anglim Gallery in San Francisco.',
    ],
    plateYears: [1963, 1964],
    caption:
      'The 1963 painting is captioned “Museum of Modern Art, New York”. Below, Sievan in ' +
      'his studio before a large canvas, 1964.',
  },
  {
    page: 7,
    image: '/retrospective/p07.jpg',
    heading: 'Summing Up (The ’70s)',
    text: [
      'The ’70s were Maurice Sievan’s last active period.',
      'As in the last stage of a maturing star, condensing all its energies into a powerful ' +
      'quasar, Maurice Sievan compressed all he had ever learned and dreamed into an ' +
      'exquisite series of nearly a thousand gem-like miniatures.',
      'He packed these emotional hand grenades with the most powerful explosives…choosing ' +
      'from a wide spectrum of colors, imaginative concepts and treatments both ' +
      'representative and abstract.',
      'At last we see here a summary of the enormous scope of his skills at artistic ' +
      'expression.',
    ],
    plateYears: [1970, 1975],
    caption:
      'Eight miniatures. A note pasted to this page reads: “This page is way off color. ' +
      'Being corrected in expanded typeset brochure in January.”',
  },
  {
    page: 8,
    image: '/retrospective/p08.jpg',
    heading: 'Maurice Sievan — exhibitions, collections, awards',
    text: null,
    plateYears: [],
    caption:
      'The CV page: one-man and group exhibitions, museum and private collections, awards ' +
      'and studies. Transcribed below.',
  },
  ...Array.from({ length: 7 }, (_, i) => ({
    page: 9 + i,
    image: `/retrospective/p${String(9 + i).padStart(2, '0')}.jpg`,
    heading: null,
    text: null,
    plateYears: [],
    caption: null,
  })),
];

/**
 * Transcribed from the CV page (page 8).
 *
 * This is a far fuller record than the fifteen exhibitions the archive box
 * documents with a surviving catalogue — but it is Sievan's own listing, not
 * independently verified, so it is published as a transcription of that page
 * rather than merged into the exhibition records.
 */
/**
 * The one sentence that must accompany every rendering of the CV.
 *
 * Written once because it had been written out three times — in app/works/page.tsx,
 * app/life/page.tsx and app/life/retrospective/page.tsx — in three different
 * wordings. A caveat that drifts is a caveat nobody trusts.
 */
export const CV_SOURCE =
  'Transcribed from page 8 of the retrospective catalogue, MS-AR-00026. It is '
  + 'Sievan\u2019s own account of his career and has not been independently verified '
  + 'against museum or gallery records.';

export const CV = {
  oneManExhibitions: [
    ['Contemporary Arts', '1939, 1941'],
    ['Minnesota State Fair', '1943'],
    ['Mortimer Brandt Gallery', '1945'],
    ['Summit Art Association, NJ', '1945, 1951'],
    ['Salpeter Gallery', '1948, 1949, 1951'],
    ['Passedoit Gallery', '1955, 1957'],
    ['Mint Museum, Charlotte, N.C.', '1955'],
    ['Barone Gallery', '1960'],
    ['HCE Gallery, Provincetown, Mass.', '1961'],
    ['Holland Goldowski Gallery, Chicago', '1961'],
    ['Albert Landry Gallery', '1961, 1963'],
    ['Queens Museum, Flushing, N.Y.', '1974'],
    ['Vanderwoude-Tananbaum Gallery, NY', '1983, 1986'],
    ['Paule Anglim Gallery, San Francisco', '1983'],
  ] as [string, string][],
  groupExhibitions: [
    ['Metropolitan Museum of Art', '1942, 1943'],
    ['Brooklyn Museum', '1941, 1953, 1958'],
    ['Whitney Museum', '1943'],
    ['Museum of Modern Art', '1943, 1956, 1964–65'],
    ['Jewish Museum', '1943'],
    ['National Academy of Design', '1926, 38, 41, 42, 43, 44, 45, 51, 54'],
    ['Finch College', '1962'],
    ['Salon D’Automne, Paris, France', '1931'],
    ['Galeria “Prestes Maia”, São Paulo, Brazil', '1944'],
    ['Museu Nacional de Artes, Rio de Janeiro, Brazil', '1944'],
    ['Carnegie Institute of Fine Arts, Pittsburgh, Pa.', '1943, 1944, 1945'],
    ['Corcoran Gallery, Washington, DC', '1945'],
    ['Virginia Museum of Fine Arts, Richmond, Va.', '1944'],
    ['Pennsylvania Academy, Philadelphia, Pa.', '1944, 1946'],
    ['Art Institute of Chicago', '1941'],
    ['William Farnsworth Art Museum, Rockland, Me.', '1950'],
    ['Dayton Art Institute, Dayton, Ohio', '1940'],
    ['George Walter Vincent Smith Art Gallery, Springfield, Mass.', '1940, 1944'],
    ['Wadsworth Atheneum, Hartford, Conn.', '1944'],
    ['Museum of Fine Arts, Houston, Tex.', '1945'],
    ['Wm. Rockhill Nelson Gallery, Kansas City, Mo.', '1945'],
    ['Rochester Memorial Art Gallery, Rochester, NY', '1945'],
    ['Institute of Modern Art, Boston, Mass.', '1945'],
    ['M. H. de Young Memorial Museum, San Francisco, Cal.', '1943'],
    ['Andrew Dickson White Museum of Art, Cornell Univ., Ithaca, NY', '1961'],
    ['Kenneth Taylor Gallery, Nantucket, Mass.', '1947'],
    ['Wildenstein Galleries, NYC', '1942, 43, 44, 46'],
    ['University of Minnesota, Minneapolis', '1941'],
    ['Roerich Museum, NYC', '1934, 1935, 1936'],
    ['Congress for Jewish Culture — Art Center', '1948, 49, 50'],
  ] as [string, string][],
  museumCollections: [
    'Museum of Modern Art, NYC',
    'Brooklyn Museum, Brooklyn, NY',
    'Baltimore Museum',
    'Butler Institute of Amer. Art, Youngstown, Ohio',
    'Walter Chrysler Museum',
    'Univ. of Arizona, Tucson, Ariz.',
    'Univ. of Georgia, Athens, Ga.',
    'Elmira College Art Collection, NY',
    'Florida Southern College, Lakeland',
    'St. Lawrence Univ., Canton, NY',
    'Queens Museum, Flushing, NY',
    'Wichita State Univ., Wichita, Kan.',
    'Hirshhorn Museum, Washington, DC',
  ],
  privateCollections: [
    'J. Patrick Lannan', 'I. David Orr', 'Mrs. David M. Levy', 'Frederic Ossorio',
    'William P. Marin', 'Albert Landry', 'Ivan Karp', 'Nathan Halper',
    'Charles Zitner', 'Dr. Milton Schlesinger', 'Maurice Vanderwoude',
    'Dr. Carl Hiller', 'Robert Natkin',
  ],
  awards: [
    ['Newhouse Memorial Award / Audubon Artists', '1946'],
    ['First Prize, Queens Botanical Gardens', '1949'],
    ['Invitation Award, Research Studios, Maitland, Fla.', '1953'],
    ['Rothko Foundation Grants', '1973 and 1974'],
  ] as [string, string][],
  studies: 'Nat’l Academy of Design; Art Students League; André L’Hôte in Paris',
};
