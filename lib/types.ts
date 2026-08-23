/**
 * Types for the archive. Mirrors DataModel/data_model.schema.json, which remains
 * the source of record — runtime safety comes from ajv validation in
 * scripts/build-data.mjs, not from this file.
 *
 * Nullability here is not decorative: 27 of 60 articles have no headline and 22
 * have no byline, so every consumer must handle it.
 */

/** ISO date truncated to whatever precision the source supports: YYYY, YYYY-MM, YYYY-MM-DD. */
export type PartialDate = string | null;

export type ReviewStatus =
  | 'unreviewed' | 'needs_review' | 'reviewed_confirmed' | 'reviewed_corrected';

export type Confidence = 'high' | 'medium' | 'low';

export interface Collection {
  id: string;
  label_raw: string;
  material_type: 'paper_archive' | 'video_archive' | 'mixed';
  location: string | null;
  notes: string | null;
}

export interface ScanFile {
  filename: string;
  /** "I" / "II" for the one object (MS-AR-00003) split across two files. */
  part_label: string | null;
  /**
   * Added at build time from the file on disk.
   * Null only if build-data.mjs fails to read the file (shouldn't happen in normal operation).
   */
  sizeBytes: number | null;
  /**
   * Added at build time. For PDFs, extracted from the file; for images, always 1.
   * Null only if PDF parsing fails (fallback is 1 in build script).
   */
  pageCount: number | null;
}

export type ObjectType =
  | 'news_clipping_bundle' | 'single_article' | 'exhibition_catalog'
  | 'exhibition_poster' | 'promotional_material' | 'book' | 'other';

export interface ArchiveObject {
  id: string;
  collection_id: string;
  seq: number | null;
  /** String, never an int — the manifest uses compound values such as "4,5". */
  folder_no: string | null;
  raw_title_description: string;
  date_text: string | null;
  date_earliest: number | null;
  date_latest: number | null;
  copies_count: number | null;
  medium: 'photocopy' | 'original' | 'other';
  medium_raw: string | null;
  condition: string | null;
  digital_record_id: string | null;
  /** Zero-to-many. Empty for the 20 objects not yet digitised. */
  scan_files: ScanFile[];
  object_type: ObjectType;
  /** The count the description asserts ("four newspaper clippings"), used to verify the split. */
  stated_item_count: number | null;
  article_ids: string[];
}

export interface NewsArticle {
  id: string;
  archive_object_id: string;
  /** Verbatim manifest line. Never discarded, so any parse can be redone. */
  raw_source_text: string;
  publication_id: string | null;
  publication_raw: string | null;
  headline: string | null;
  /** Null for initials-only bylines — those stay in author_raw until attributed. */
  author_person_id: string | null;
  author_raw: string | null;
  date_text: string | null;
  date_normalized: PartialDate;
  date_earliest: number | null;
  date_latest: number | null;
  /** True when the source itself hedges, e.g. "February (1941?)". */
  date_uncertain: boolean;
  exhibition_id: string | null;
  parse_confidence: Confidence;
  /** True when the item was assembled across a line break, which may have merged a byline into the headline. */
  continuation_joined: boolean;
  review_status: ReviewStatus;
  reviewer: string | null;
  reviewed_at: string | null;
  notes: string | null;
}

export interface Publication {
  id: string;
  name: string;
  aliases: string[];
  type: 'newspaper' | 'magazine' | 'other' | 'unknown';
}

export type PersonRole =
  | 'critic' | 'journalist' | 'gallery_owner' | 'curator' | 'artist'
  | 'interview_subject' | 'historical_figure' | 'family' | 'other';

export interface Person {
  id: string;
  name: string;
  aliases: string[];
  roles: PersonRole[];
  notes: string | null;
}

export interface Exhibition {
  id: string;
  name: string | null;
  gallery_or_venue: string;
  venue_city: string | null;
  start_date: PartialDate;
  end_date: PartialDate;
  date_earliest: number | null;
  date_latest: number | null;
  exhibition_type: 'solo' | 'group' | 'unknown';
  confidence: 'confirmed' | 'inferred';
  source_archive_object_ids: string[];
  source_article_ids: string[];
  notes: string | null;
}

export interface Painting {
  id: string;
  title: string | null;
  date_text: string | null;
  date_earliest: number | null;
  date_latest: number | null;
  medium: string | null;
  dimensions: string | null;
  current_location: string | null;
  image_ref: string | null;
  catalog_status: 'uncatalogued' | 'catalogued' | 'verified';
  notes: string | null;
}

export interface MediaFile {
  filename: string;
  variant: 'raw' | 'edited' | 'subtitled';
  /** Relative to the project root. Masters are never served — this is provenance. */
  path: string;
  size_bytes: number | null;
}

export interface VideoAsset {
  id: string;
  collection_id: string;
  subject_type: 'interview' | 'process_footage' | 'other';
  subject_person_ids: string[];
  title: string;
  physical_tape_no: string | null;
  interview_date: PartialDate;
  date_text: string | null;
  date_earliest: number | null;
  date_latest: number | null;
  location: string | null;
  media_files: MediaFile[];
  transcript_source_file: string | null;
  transcript_text_file: string | null;
  transcript_word_count: number | null;
  transcript_page_count: number | null;
  duration_seconds: number | null;
  topics: string[];
  review_status: 'catalogued_only' | 'transcribed' | 'content_tagged';
  notes: string | null;
}

export interface HistoricalEvent {
  id: string;
  title: string;
  date_text: string | null;
  date_earliest: number | null;
  date_latest: number | null;
  category: 'art_world' | 'world_history' | 'personal_biography' | 'other';
  description: string | null;
  source_refs: string[];
  notes: string | null;
}

export interface Commentary {
  id: string;
  source_type: 'news_article' | 'video_asset';
  source_id: string;
  commentator_person_id: string | null;
  /** Declared scope — commentary is often about a group of works or the man, not one painting. */
  subject_scope: 'specific_painting' | 'painting_group' | 'artist_biographical' | 'general_context' | 'other';
  painting_ids: string[];
  subject_person_id: string | null;
  /** Free text for an unresolved reference such as "seven canvasses". */
  subject_description_raw: string | null;
  commentary_type: string;
  excerpt: string | null;
  stance: 'positive' | 'negative' | 'neutral' | 'mixed' | null;
  confidence: Confidence;
  review_status: ReviewStatus;
  notes: string | null;
}

export interface CommentaryRelation {
  id: string;
  commentary_a_id: string;
  commentary_b_id: string;
  relation_type: 'corroborates' | 'contradicts' | 'responds_to' | 'elaborates_on' | 'references_same_event' | 'other';
  notes: string | null;
}

export interface PaintingHistoricalContext {
  id: string;
  painting_id: string;
  historical_event_id: string;
  direction: 'event_shaped_painting' | 'painting_shaped_event_or_society';
  description: string | null;
  source_refs: string[];
  confidence: 'documented' | 'inferred' | 'speculative';
  notes: string | null;
}

export interface PaintingExhibition {
  id: string;
  painting_id: string;
  exhibition_id: string;
  confidence?: 'confirmed' | 'inferred';
  notes: string | null;
}

// ------------------------------------------------------------------ derived

export type DatePrecision = 'day' | 'month' | 'year' | 'range' | 'unknown';

export type TimelineKind = 'article' | 'exhibition' | 'object' | 'painting' | 'video' | 'event';

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  year: number;
  yearEnd: number;
  precision: DatePrecision;
  uncertain: boolean;
  title: string;
  subtitle: string | null;
  href: string;
}

/** One page of an interview transcript. */
export interface TranscriptPage {
  page: number;
  /** Unwrapped from the ~100-char hard wraps in the extracted text. */
  paragraphs: string[];
  /**
   * The speaker labels for this page, in order. The source PDF sets these in a
   * margin column which text extraction dislocated to the end of the page, so
   * they cannot be reliably matched to individual paragraphs — they are shown as
   * a sequence rather than pretending to an alignment we do not have.
   */
  speakers: string[];
}

export interface PersonMention {
  objectId: string;
  matchedAs: string;
}

export interface Counts {
  archiveObjects: number;
  newsArticles: number;
  publications: number;
  persons: number;
  exhibitions: number;
  videoAssets: number;
  paintings: number;
  scholarship: number;
  objectsWithScans: number;
  scanFiles: number;
  transcribedInterviews: number;
  transcriptWords: number;
}

export interface Derived {
  facets: {
    decade: Record<string, number>;
    publication: Record<string, number>;
    /** Keys are person ids plus the sentinels __initials__ and __unattributed__. */
    author: Record<string, number>;
    objectType: Record<string, number>;
  };
  articlesByObject: Record<string, string[]>;
  articlesByPublication: Record<string, string[]>;
  articlesByAuthor: Record<string, string[]>;
  exhibitionsByObject: Record<string, string[]>;
  /**
   * Inferred, not asserted: which press notices appear to review which exhibition.
   * `matchedAs` records the venue token that produced the match so the claim can be
   * checked. See scripts/build-data.mjs for the rule and why it is strict.
   */
  articlesByExhibition: Record<string, { articleId: string; matchedAs: string }[]>;
  exhibitionsByArticle: Record<string, { exhibitionId: string; matchedAs: string }[]>;
  personMentions: Record<string, PersonMention[]>;
  publicationMergeGroups: string[][];
  timeline: TimelineEvent[];
  undatedVideos: string[];
  counts: Counts;
}

/**
 * Secondary literature — published writing *about* Sievan.
 *
 * Deliberately separate from NewsArticle: those are the contemporaneous notices
 * physically held in the archive box, catalogued as objects. This is scholarship,
 * which the archive cites but does not hold.
 */
export interface Scholarship {
  id: string;
  citation: string;
  kind: 'book' | 'chapter' | 'journal_article' | 'thesis' | 'catalogue_essay' | 'review' | 'web' | 'other';
  authors?: string[];
  title?: string | null;
  container?: string | null;
  year?: number | null;
  url?: string | null;
  doi?: string | null;
  /** Person ids the work is principally about. */
  about?: string[];
  notes?: string | null;
}

export interface Archive {
  collections: Collection[];
  scholarship: Scholarship[];
  publications: Publication[];
  persons: Person[];
  exhibitions: Exhibition[];
  videoAssets: VideoAsset[];
  paintings: Painting[];
  commentary: Commentary[];
  commentaryRelations: CommentaryRelation[];
  paintingHistoricalContext: PaintingHistoricalContext[];
  paintingExhibitions: PaintingExhibition[];
  historicalEvents: HistoricalEvent[];
  archiveObjects: ArchiveObject[];
  newsArticles: NewsArticle[];
  derived: Derived;
}
