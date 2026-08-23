/**
 * Data access. The generated bundle is imported directly so Server Components
 * can read it at build time with no fetch and no runtime dependency.
 */
import bundle from '@/data/archive.generated.json';
import type {
  Archive, ArchiveObject, Clip, Exhibition, NewsArticle, Painting, Person,
  Publication, ScanPage, TranscriptPage, VideoAsset,
} from './types';

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
  other: 'Other',
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
 * Thirty of the fifty objects have a readable sheet. The other twenty are catalogued
 * but not digitised, and `coverFor` returns undefined for them on purpose — callers
 * are expected to render that absence, not skip the record.
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
