/**
 * Data access. The generated bundle is imported directly so Server Components
 * can read it at build time with no fetch and no runtime dependency.
 */
import bundle from '@/data/archive.generated.json';
import type {
  Archive, ArchiveObject, Exhibition, NewsArticle, Painting, Person,
  Publication, TranscriptPage, VideoAsset,
} from './types';

export const archive = bundle as unknown as Archive;
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
  const { readFileSync, existsSync } = await import('node:fs');
  const { join } = await import('node:path');
  const file = join(process.cwd(), 'data', 'transcripts', `${videoId}.json`);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf8')) as TranscriptPage[];
}

/** Public label for a byline that may be absent or initials-only. */
export function bylineLabel(article: NewsArticle): string | null {
  if (article.author_person_id) {
    return getPerson(article.author_person_id)?.name ?? article.author_raw;
  }
  return article.author_raw;
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
