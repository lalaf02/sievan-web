/**
 * Data access. The generated bundle is imported directly so Server Components
 * can read it at build time with no fetch and no runtime dependency.
 */
import bundle from '@/data/archive.generated.json';
import type {
  Archive, ArchiveObject, AttestedWork, Clip, Exhibition, NewsArticle, Painting,
  Person, Place, PlaceRole, PlaceUsage, Publication, ScanPage, TranscriptPage,
  VideoAsset,
} from './types';
import { PERIODS, pageForPeriod } from './periods';
import type { Period } from './periods';
import { PLATES } from './plates';
import type { Plate } from './plates';

// Runtime validation to catch corrupted bundles early
function validateBundle(data: unknown): asserts data is Archive {
  if (!data || typeof data !== 'object') {
    throw new Error('Archive bundle is invalid: expected object');
  }
  const d = data as Record<string, unknown>;
  const required = ['archiveObjects', 'newsArticles', 'publications', 'persons', 'exhibitions', 'videoAssets', 'paintings', 'derived'];
  for (const key of required) {
    if (!Array.isArray(d[key]) && (key !== 'derived' && typeof d[key] !== 'object')) {
      throw new Error(`Archive bundle missing or invalid: ${key}`);
    }
  }
}

validateBundle(bundle);
export const archive = bundle as Archive;
export const counts = archive.derived.counts;

const index = <T extends { id: string }>(rows: T[]): Map<string, T> =>
  new Map(rows.map((r) => [r.id, r]));

const objects = index(archive.archiveObjects);
const articles = index(archive.newsArticles);
const publications = index(archive.publications);
const persons = index(archive.persons);
const exhibitions = index(archive.exhibitions);
const videos = index(archive.videoAssets);
const paintings = index(archive.paintings);

export const getObject = (id: string): ArchiveObject | undefined => objects.get(id);
export const getArticle = (id: string): NewsArticle | undefined => articles.get(id);
export const getPublication = (id: string | null): Publication | undefined =>
  id ? publications.get(id) : undefined;
export const getPerson = (id: string | null): Person | undefined =>
  id ? persons.get(id) : undefined;
export const getExhibition = (id: string): Exhibition | undefined => exhibitions.get(id);
export const getVideo = (id: string): VideoAsset | undefined => videos.get(id);
export const getPainting = (id: string): Painting | undefined => paintings.get(id);

export const allObjects = archive.archiveObjects;
export const allArticles = archive.newsArticles;
export const allPublications = archive.publications;
export const allPersons = archive.persons;
export const allExhibitions = archive.exhibitions;
export const allVideos = archive.videoAssets;
export const allPaintings = archive.paintings;
export const allScholarship = archive.scholarship;

// ------------------------------------------------------- the catalogue itself

/**
 * Rows that are themselves works of art, not documents about them — box 2's
 * drawings today, box 3's when it arrives. The presence of `artwork` is what
 * promotes an archive object into a catalogue entry.
 */
export const catalogueWorksOnPaper = (): ArchiveObject[] =>
  allObjects.filter((o) => o.artwork && hasImagery(o.id)).sort(byDateUndatedLast);

/**
 * The heading for a catalogued sheet.
 *
 * These carry no title — Sievan gave them none — so each is named by what it
 * records, derived from its attestations and never invented. `objectLead` is wrong
 * here: it returns the raw first line, which is "Graphite sketch on paper of a
 * painting with notes." on fifteen of the twenty-five.
 */
export function entryTitle(object: ArchiveObject): string {
  const works = attestationsForObject(object.id);
  const first = works.find((w) => w.title_stated)?.title_stated;
  // MS-AR-00051 records no painting — it is a landscape drawn for its own sake, so
  // it is named by what it is. The signature clause is dropped because the entry
  // prints the signature verbatim on its own line directly beneath.
  if (!first) return objectLead(object).replace(/,?\s*Signed\b.*$/i, '').replace(/\.$/, '');
  if (works.length === 1) return `Sheet recording ${first}`;
  if (works.length === 2 && works[1].title_stated) {
    return `Sheet recording ${first} and ${works[1].title_stated}`;
  }
  // Count works, not titles: MS-AR-00068 has 8 attestations but only 5 titles.
  return `Sheet recording ${first} and ${works.length - 1} others`;
}

/** Catalogue entries grouped by medium, the only spine 1-of-25 dated rows can support. */
export function worksOnPaperByMedium(): { medium: string; works: ArchiveObject[] }[] {
  const groups = new Map<string, ArchiveObject[]>();
  for (const o of catalogueWorksOnPaper()) {
    const m = o.artwork!.medium_stated;
    if (!groups.has(m)) groups.set(m, []);
    groups.get(m)!.push(o);
  }
  return [...groups.entries()]
    .map(([medium, works]) => ({ medium, works }))
    .sort((a, b) => b.works.length - a.works.length || a.medium.localeCompare(b.medium));
}

// ------------------------------------------------- attested works and places

/*
 * Paintings the archive can NAME but does not hold. Kept rigorously apart from
 * `allPaintings` — see lib/types.ts. Nothing here should ever be counted together
 * with the catalogue.
 */
const attestedWorks = index(archive.attestedWorks);
const places = index(archive.places);

export const allAttestedWorks = archive.attestedWorks;
export const allPlaces = archive.places;
export const getAttestedWork = (id: string): AttestedWork | undefined => attestedWorks.get(id);
export const getPlace = (id: string | null): Place | undefined =>
  id ? places.get(id) : undefined;

/** The attestations carried by one sheet, in seed order (Sievan's own numbering). */
export const attestationsForObject = (objectId: string): AttestedWork[] =>
  (archive.derived.attestationsByObject[objectId] ?? [])
    .map((id) => attestedWorks.get(id))
    .filter((w): w is AttestedWork => !!w);

/** Sheets that carry at least one attestation, in id order. */
export const objectsWithAttestations = (): ArchiveObject[] =>
  Object.keys(archive.derived.attestationsByObject)
    .sort()
    .map((id) => objects.get(id))
    .filter((o): o is ArchiveObject => !!o);

export const placeUsage = (placeId: string): PlaceUsage =>
  archive.derived.placeUsage[placeId]
  ?? { attestations: 0, exhibitions: 0, children: 0, roles: {}, total: 0 };

/** Works this place is attached to, grouped by the relation that attached them. */
export const attestationsForPlace = (
  placeId: string,
): { role: PlaceRole; work: AttestedWork; certain: boolean }[] =>
  (archive.derived.attestationsByPlace[placeId] ?? [])
    .map(({ attestationId, role, certain }) => {
      const work = attestedWorks.get(attestationId);
      return work ? { role, work, certain } : null;
    })
    .filter((r): r is { role: PlaceRole; work: AttestedWork; certain: boolean } => !!r);

export const exhibitionsForPlace = (placeId: string): Exhibition[] =>
  (archive.derived.exhibitionsByPlace[placeId] ?? [])
    .map((id) => exhibitions.get(id))
    .filter((e): e is Exhibition => !!e);

export const childPlaces = (placeId: string): Place[] =>
  (archive.derived.placeChildren[placeId] ?? [])
    .map((id) => places.get(id))
    .filter((p): p is Place => !!p);

/**
 * Titles that occur on more than one sheet. A LEAD, not a fact — two sheets
 * writing the same title may be one painting, two, or a series, and nothing here
 * merges them. Returns the other attestations sharing this one's title.
 */
export const sameTitleElsewhere = (work: AttestedWork): AttestedWork[] => {
  const key = (work.title_stated ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (key.length < 4) return [];
  return (archive.derived.attestationsByTitleKey[key] ?? [])
    .filter((id) => id !== work.id)
    .map((id) => attestedWorks.get(id))
    .filter((w): w is AttestedWork => !!w);
};

/** How a place relates to a work, in the site's words rather than the schema's. */
export const PLACE_ROLE_LABELS: Record<PlaceRole, string> = {
  depicted: 'Named as the subject',
  made_at: 'Painted here',
  shown_at: 'Shown here',
  held_at: 'Went into a collection here',
};

export const DISPOSITION_LABELS: Record<string, string> = {
  sold: 'sold',
  consigned: 'left with a dealer',
  offered: 'offered',
  returned: 'came back to him',
  retained: 'kept',
  exhibited: 'exhibited',
  donated: 'given',
};

/**
 * The paper boxes, in id order. One Collection per physical box; MS-VA-001 is the
 * video archive and is excluded here because it holds no ArchiveObjects.
 */
export const paperCollections = archive.collections
  .filter((c) => c.material_type === 'paper_archive')
  .sort((a, b) => a.id.localeCompare(b.id));

export const objectsForCollection = (collectionId: string): ArchiveObject[] =>
  allObjects.filter((o) => o.collection_id === collectionId);

/**
 * Date order, undated last. Sorting on `date_earliest ?? 0` puts every undated
 * object *before* 1939 — which was harmless while all 50 objects carried a date,
 * and wrong the moment box 2 arrived with 25 undated drawings.
 */
export const byDateUndatedLast = (a: ArchiveObject, b: ArchiveObject): number => {
  const ay = a.date_earliest;
  const by = b.date_earliest;
  if (ay == null && by == null) return a.id.localeCompare(b.id);
  if (ay == null) return 1;
  if (by == null) return -1;
  return ay - by || a.id.localeCompare(b.id);
};

export const articlesForObject = (objectId: string): NewsArticle[] =>
  (archive.derived.articlesByObject[objectId] ?? [])
    .map((id) => articles.get(id))
    .filter((a): a is NewsArticle => !!a);

export const articlesForPublication = (pubId: string): NewsArticle[] =>
  (archive.derived.articlesByPublication[pubId] ?? [])
    .map((id) => articles.get(id))
    .filter((a): a is NewsArticle => !!a);

export const articlesForAuthor = (personId: string): NewsArticle[] =>
  (archive.derived.articlesByAuthor[personId] ?? [])
    .map((id) => articles.get(id))
    .filter((a): a is NewsArticle => !!a);

export const exhibitionsForObject = (objectId: string): Exhibition[] =>
  (archive.derived.exhibitionsByObject[objectId] ?? [])
    .map((id) => exhibitions.get(id))
    .filter((e): e is Exhibition => !!e);

export const videosForPerson = (personId: string): VideoAsset[] =>
  archive.videoAssets.filter((v) => v.subject_person_ids.includes(personId));

/**
 * Archive objects whose description names this person. Recovers edges that exist
 * only in prose — notably Ivan Karp's essay credit on MS-AR-00040, which has no
 * structural link because that object was never split into articles.
 */
export const mentionsForPerson = (personId: string) =>
  (archive.derived.personMentions[personId] ?? [])
    .map((m) => ({ object: objects.get(m.objectId), matchedAs: m.matchedAs }))
    .filter((m): m is { object: ArchiveObject; matchedAs: string } => !!m.object);

/**
 * Transcripts live in their own files so a reader page carries only its own text
 * rather than all 24,000 words. Read from disk at build time — a dynamic import
 * with a computed path is unreliable under static export.
 */
export async function loadTranscript(videoId: string): Promise<TranscriptPage[] | null> {
  // Validate videoId to prevent path traversal attacks
  if (!/^[a-zA-Z0-9_-]+$/.test(videoId)) {
    console.error(`Invalid videoId: ${videoId}`);
    return null;
  }

  const { readFileSync, existsSync } = await import('node:fs');
  const { join } = await import('node:path');
  const file = join(process.cwd(), 'data', 'transcripts', `${videoId}.json`);
  if (!existsSync(file)) return null;

  try {
    return JSON.parse(readFileSync(file, 'utf8')) as TranscriptPage[];
  } catch (e) {
    console.error(`Failed to parse transcript ${videoId}:`, e);
    return null;
  }
}

/** The heading for a record that may have no headline (27 of 60 articles). */
export function articleTitle(article: NewsArticle): string {
  return article.headline ?? article.publication_raw ?? article.id;
}

/**
 * A readable one-line label for an archive object.
 *
 * The first line of the manifest description is often only a type word
 * ("Promotional Material", "Exhibition Catalog"), which says nothing on its own —
 * MS-AR-00040 would read just "Promotional Material" rather than naming the
 * Barone Gallery show. Where the lead is a bare label, the first content line is
 * appended.
 */
export function objectLead(object: ArchiveObject): string {
  const lines = object.raw_title_description
    .split('\n')
    .map((l) => l.replace(/^\s*-\s*/, '').trim())
    .filter(Boolean);
  if (!lines.length) return object.id;

  const lead = lines[0];
  const isBareLabel = lead.split(/\s+/).length <= 3 && !/\d/.test(lead);
  if (isBareLabel && lines[1]) return `${lead}: ${lines[1]}`;
  return lead;
}

export const OBJECT_TYPE_LABELS: Record<string, string> = {
  news_clipping_bundle: 'Clipping bundle',
  single_article: 'Article',
  exhibition_catalog: 'Exhibition catalogue',
  exhibition_poster: 'Exhibition poster',
  promotional_material: 'Promotional material',
  book: 'Book',
  work_on_paper: 'Work on paper',
  other: 'Other',
};

/**
 * Plurals, because appending "s" produced "Work on papers". Only the irregular
 * ones need an entry; `pluralObjectType` falls back to label + "s".
 */
const OBJECT_TYPE_PLURALS: Record<string, string> = {
  work_on_paper: 'Works on paper',
};

export const pluralObjectType = (type: string, n: number): string => {
  const label = OBJECT_TYPE_LABELS[type] ?? type;
  if (n === 1) return label;
  return OBJECT_TYPE_PLURALS[type] ?? `${label}s`;
};

export const ROLE_LABELS: Record<string, string> = {
  critic: 'Critic',
  journalist: 'Journalist',
  gallery_owner: 'Gallery owner',
  curator: 'Curator',
  artist: 'Artist',
  interview_subject: 'Interview subject',
  historical_figure: 'Historical figure',
  family: 'Family',
  other: 'Other',
};

// ------------------------------------------------------------------- imagery

/**
 * Scans and clips, resolved in scripts/build-data.mjs and read only through here.
 *
 * Fifty-five of the seventy-six objects have a readable sheet. The other twenty-one
 * are catalogued but not digitised, and `coverFor` returns undefined for them on
 * purpose — callers are expected to render that absence, not skip the record.
 */

/** Every rasterised sheet of an object, in page order across its scan files. */
export const pagesForObject = (object: ArchiveObject): ScanPage[] =>
  (object.scan_files ?? []).flatMap((s) => s.pages ?? []);

/** The tile face for an object, or undefined when nothing has been digitised. */
export const coverFor = (id: string): ScanPage | undefined =>
  archive.derived.coverByObject[id];

export const hasImagery = (id: string): boolean => Boolean(coverFor(id));

/** Objects with a readable sheet, in the archive's own date order. */
export const objectsWithImagery = (): ArchiveObject[] =>
  archive.derived.objectsWithImagery
    .map((id) => objects.get(id))
    .filter((o): o is ArchiveObject => Boolean(o));

/** Silent loops cut from a tape. Empty for any video that has not been clipped. */
export const clipsForVideo = (videoId: string): Clip[] =>
  archive.derived.clipsByVideo[videoId] ?? [];

export const clipFor = (videoId: string): Clip | undefined =>
  clipsForVideo(videoId)[0];

export const allClips: Clip[] = archive.derived.clips;

const clipsById = new Map(archive.derived.clips.map((c) => [c.id, c]));

/** Look a clip up by its own id, for the places that choose a specific moment. */
export const getClip = (id: string): Clip | undefined => clipsById.get(id);

/**
 * The tile face for an exhibition: the cover of an object the archive actually
 * records as documenting it.
 *
 * Only `source_archive_object_ids` counts. Eight of the fifteen shows are documented
 * by an object in the undigitised tail, so eight have no cover — and the right answer
 * there is to say so, not to reach for another sheet from the same year. The archive
 * holds a 1963 Albert Landry catalogue, for instance, but what is recorded as
 * documenting the 1963 Albert Landry show is a poster that has not been scanned.
 */
export const coverForExhibition = (
  exhibition: Exhibition,
): { cover: ScanPage; objectId: string } | undefined => {
  for (const objectId of exhibition.source_archive_object_ids ?? []) {
    const cover = coverFor(objectId);
    if (cover) return { cover, objectId };
  }
  return undefined;
};

/** The documenting object, whether or not it has been digitised. */
export const documentingObject = (exhibition: Exhibition): ArchiveObject | undefined =>
  (exhibition.source_archive_object_ids ?? [])
    .map((id) => objects.get(id))
    .find((o): o is ArchiveObject => Boolean(o));

/** The clip of a person speaking, where their interview has been cut into one. */
export const clipForPerson = (personId: string): Clip | undefined =>
  videosForPerson(personId).map((v) => clipFor(v.id)).find(Boolean);

/** A specific sheet of an object, 1-indexed. For the few places that cite one page. */
export const pageOf = (objectId: string, page: number): ScanPage | undefined => {
  const object = objects.get(objectId);
  return object ? pagesForObject(object)[page - 1] : undefined;
};

// ------------------------------------------------------- the five periods

/*
 * The artwork, placed in the retrospective catalogue's five periods.
 *
 * Four kinds of thing are placed, and they are kept apart on purpose because they are
 * four different grades of evidence: a plate the catalogue printed, a reproduction a
 * gallery printed, a sheet the estate physically holds, and a painting Sievan merely
 * named. NEVER sum them into one number — it is the same rule that keeps
 * counts.worksOnPaperCatalogued out of counts.paintings.
 *
 * Placement is on `date_earliest`, and only where the source stated the year. An
 * inferred date is shown on its own record and labelled there, but it is not evidence
 * and does not put a work in a period — the same line the chronology draws.
 */

/** Attested works carrying a year their source actually stated. */
export const datedAttestedWorks = (): AttestedWork[] =>
  allAttestedWorks.filter(
    (w) => w.date_earliest != null && w.date_basis === 'stated_on_source',
  );

export interface PeriodContents {
  /** Years printed beside the plates on the catalogue's own page for this period. */
  catalogueYears: number[];
  /** Free-standing gallery reproductions dated into this period. */
  plates: Plate[];
  /** Catalogued sheets the estate holds, dated into this period. */
  worksOnPaper: ArchiveObject[];
  /** Paintings named on a sheet but not held, dated into this period. */
  attested: AttestedWork[];
}

const inPeriod = (period: Period, year: number | null | undefined): boolean =>
  year != null && year >= period.from && year <= period.to;

export function contentsForPeriod(period: Period): PeriodContents {
  return {
    catalogueYears: [...pageForPeriod(period).plateYears].sort((a, b) => a - b),
    plates: PLATES.filter((p) => inPeriod(period, p.year)),
    worksOnPaper: catalogueWorksOnPaper().filter((o) => inPeriod(period, o.date_earliest)),
    attested: datedAttestedWorks().filter((w) => inPeriod(period, w.date_earliest)),
  };
}

/**
 * The artwork that carries no year, and so sits outside the chronology entirely.
 *
 * The larger half by far — 72 records against 26 — and the periods page is dishonest
 * without it. A reader who sees five populated periods and no statement of what could
 * not be placed comes away thinking the career is mapped.
 */
export function undatedArtwork(): {
  plates: Plate[];
  worksOnPaper: ArchiveObject[];
  attested: AttestedWork[];
} {
  return {
    plates: PLATES.filter((p) => p.year == null),
    worksOnPaper: catalogueWorksOnPaper().filter((o) => o.date_earliest == null),
    attested: allAttestedWorks.filter(
      (w) => w.date_earliest == null || w.date_basis !== 'stated_on_source',
    ),
  };
}

/**
 * How much of the artwork carries a year at all.
 *
 * Returned as parts, not a ratio, so a caller cannot render "26%" and lose which
 * kinds of record the 26 are. The retrospective plates count once per plate: thirteen
 * reproductions on five pages, each with its own printed year.
 */
export function artworkDatingCoverage(): { dated: number; undated: number; total: number } {
  const cataloguePlates = PERIODS.reduce(
    (n, p) => n + pageForPeriod(p).plateYears.length, 0,
  );
  const undated = undatedArtwork();
  const dated = cataloguePlates
    + PLATES.filter((p) => p.year != null).length
    + catalogueWorksOnPaper().filter((o) => o.date_earliest != null).length
    + datedAttestedWorks().length;
  const undatedTotal = undated.plates.length
    + undated.worksOnPaper.length
    + undated.attested.length;
  return { dated, undated: undatedTotal, total: dated + undatedTotal };
}
