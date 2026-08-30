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

/**
 * One rasterised sheet of a scan, produced by scripts/extract-scans.mjs.
 *
 * The scans ship twice: the PDF is the archival object and stays downloadable, but
 * only these images can go in an <img>, so they are what the site actually renders.
 */
export interface ScanPage {
  /** ~1500px. The readable sheet. */
  page: string;
  /** ~600px. Mosaic tiles — a grid of page-tier images would weigh ~24 MB. */
  thumb: string;
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
  /** Rasterised sheets, in page order. Empty only if extract-scans has not been run. */
  pages: ScanPage[];
  /**
   * Added at build time. For PDFs, extracted from the file; for images, always 1.
   * Null only if PDF parsing fails (fallback is 1 in build script).
   */
  pageCount: number | null;
}

export type ObjectType =
  | 'news_clipping_bundle' | 'single_article' | 'exhibition_catalog'
  | 'exhibition_poster' | 'promotional_material' | 'book'
  /** A drawing or sketch by Sievan himself — box 2 onward, not press material. */
  | 'work_on_paper' | 'other';

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
  /**
   * Present only on rows that are themselves works of art. Its presence is what
   * promotes an archive object into a catalogue entry — see lib/data.ts
   * `catalogueWorksOnPaper`. No dimensions: none of these has been measured.
   */
  artwork?: Artwork | null;
}

export interface Artwork {
  medium_stated: string;
  support: string;
  /** Verbatim from raw_title_description; build-data.mjs verifies it occurs there. */
  signed: string | null;
  /** Only where one entry is more than one sheet. */
  sheet_count: number | null;
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

/** Where a place sits in relation to a work the source names. */
export type PlaceRole = 'depicted' | 'made_at' | 'shown_at' | 'held_at';

export interface PlaceRef {
  place_id: string;
  role: PlaceRole;
  /** False where the source itself hedges — MS-AR-00068 writes "croton?". */
  certain?: boolean;
}

/**
 * A painting a source NAMES but the archive does not hold.
 *
 * Deliberately not a `Painting`. A drawing records that a work existed and what
 * Sievan called it on the day he drew it — not that the title stuck, not that the
 * sale went through, not that the work survives. Every row carries the verbatim
 * words it rests on and the source they come from, so any claim can be checked
 * against a scan; `check-quotes.mjs` fails the build if `quote` is not present in
 * the source's own recorded text.
 */
export interface AttestedWork {
  id: string;
  source_type: 'archive_object' | 'news_article' | 'video_asset';
  source_id: string;
  /** 1-indexed into the source's rasterised sheets. */
  source_page: number | null;
  /** Where on the sheet, in the transcription's own words: "Verso", "Top left". */
  sheet_position: string | null;
  quote: string;
  /** Exactly as the source writes it — spelling and casing preserved. */
  title_stated: string | null;
  /** Sievan's own inventory number: "925", "#180", circled "118". */
  artist_number: string | null;
  /** Verbatim and unparsed — which figure is the height is not recorded. */
  dimensions_stated: string | null;
  medium_stated: string | null;
  date_text: string | null;
  date_earliest: number | null;
  date_latest: number | null;
  date_uncertain?: boolean;
  /** Only `stated_on_source` reaches the chronology. */
  date_basis?: 'stated_on_source' | 'inferred' | null;
  price_stated: string | null;
  price_usd: number | null;
  /** Empty means the source is silent. There is no `unknown` member by design. */
  dispositions: Disposition[];
  counterparty_raw: string | null;
  counterparty_person_id: string | null;
  place_refs: PlaceRef[];
  /** One-way bridge to a catalogue entry. Null on every row today. */
  painting_id: string | null;
  identification_basis?:
    | 'title_and_dimensions' | 'artist_number' | 'photograph' | 'curator_judgement' | null;
  review_status: ReviewStatus;
  notes: string | null;
}

export type Disposition =
  | 'sold' | 'consigned' | 'offered' | 'returned' | 'retained' | 'exhibited' | 'donated';

export type PlaceKind =
  | 'settlement' | 'neighbourhood' | 'region' | 'landmark'
  | 'waterway' | 'venue' | 'institution' | 'country';

/**
 * A gazetteer entry. Places exist only because something in the archive points at
 * one — `check-data.mjs` fails on an orphan — so this is a record of where the
 * evidence goes, not a directory of geography. No coordinates by design.
 */
export interface Place {
  id: string;
  name: string;
  kind: PlaceKind;
  parent_id: string | null;
  region: string | null;
  /** Every spelling that occurs in a source, verbatim: "SOUTHHAMPTON". */
  aliases: string[];
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

/**
 * `attestation` is deliberately distinct from `painting`: the chronology labels
 * `painting` as "Works", and a reader must not come away thinking the catalogue
 * has opened because a sheet named a canvas.
 */
export type TimelineKind =
  | 'article' | 'exhibition' | 'object' | 'painting' | 'attestation' | 'video' | 'event';

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
  /**
   * The sheet that evidences this event, where the archive holds one — 82 of the 125
   * events have been digitised. Resolved in build-data.mjs, not here.
   *
   * Currently unrendered; see the note in build-data.mjs for why the chronology does
   * not use it.
   */
  thumb?: string;
  thumbObjectId?: string;
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

/**
 * A person named in an interview transcript, and the pages naming them.
 *
 * `pages` are the transcript reader's own `#p{n}` anchors, so a mention is a link.
 * It records that the name occurs on the page and nothing more — the speaker column
 * cannot be aligned to paragraphs (see `TranscriptPage.speakers`), so the archive
 * cannot say who said it.
 */
export interface TranscriptMention {
  videoId: string;
  pages: number[];
  matchedAs: string;
}

export interface PlaceUsage {
  attestations: number;
  exhibitions: number;
  children: number;
  roles: Partial<Record<PlaceRole, number>>;
  /** attestations + exhibitions. A place with 0 and no children is an orphan. */
  total: number;
}

export interface Counts {
  archiveObjects: number;
  newsArticles: number;
  publications: number;
  persons: number;
  exhibitions: number;
  videoAssets: number;
  paintings: number;
  /** Paintings the archive can NAME from a source. Never added to `paintings`. */
  attestedWorks: number;
  attestedWorksDated: number;
  attestedWorksWithDimensions: number;
  attestedWorksWithPrice: number;
  /** How many box-2 sheets carry at least one attestation. */
  sheetsCarryingAttestations: number;
  /** Works the estate physically holds. Never added to `paintings`. */
  worksOnPaperCatalogued: number;
  worksOnPaperSheets: number;
  places: number;
  scholarship: number;
  objectsWithScans: number;
  /** Objects with at least one rasterised sheet the site can display. */
  objectsWithImagery: number;
  scanFiles: number;
  scanPageImages: number;
  clips: number;
  transcribedInterviews: number;
  transcriptWords: number;
}

/**
 * A silent web loop cut from a video master by scripts/extract-clips.mjs.
 *
 * The masters are ~25 GB and are never served. These are excerpts, and anything
 * displaying one has to say so — a loop is not the interview.
 */
export interface Clip {
  id: string;
  /** The VideoAsset this was cut from. */
  videoId: string;
  src: string;
  poster: string;
  width: number;
  height: number;
  /** Seconds. */
  duration: number;
  alt: string;
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
  /**
   * HEURISTIC: whose name occurs in the recorded testimony, and where.
   * Full names and aliases only — surnames were tried and every hit was a false
   * positive. Labelled *named*, never *said*. See scripts/build-data.mjs.
   */
  personTranscriptMentions: Record<string, TranscriptMention[]>;
  /** Attested works keyed by the sheet that carries them. */
  attestationsByObject: Record<string, string[]>;
  attestationsByPlace: Record<string, { attestationId: string; role: PlaceRole; certain: boolean }[]>;
  exhibitionsByPlace: Record<string, string[]>;
  placeChildren: Record<string, string[]>;
  /** What points at each place, and by which relation. Drives the orphan gate. */
  placeUsage: Record<string, PlaceUsage>;
  /**
   * HEURISTIC: normalised titles that occur on more than one sheet. Two sheets
   * writing the same title are a lead, not a fact — nothing merges rows on this,
   * it only surfaces the coincidence for a curator to adjudicate.
   */
  attestationsByTitleKey: Record<string, string[]>;
  /** The majority. They carry no year, so they cannot go on the chronology. */
  undatedAttestations: string[];
  publicationMergeGroups: string[][];
  timeline: TimelineEvent[];
  undatedVideos: string[];
  /** Object ids with at least one rasterised sheet — 30 of 50. */
  objectsWithImagery: string[];
  /** First readable sheet per object: the tile face used by the mosaics. */
  coverByObject: Record<string, ScanPage>;
  clips: Clip[];
  clipsByVideo: Record<string, Clip[]>;
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
  attestedWorks: AttestedWork[];
  places: Place[];
  commentary: Commentary[];
  commentaryRelations: CommentaryRelation[];
  paintingHistoricalContext: PaintingHistoricalContext[];
  paintingExhibitions: PaintingExhibition[];
  historicalEvents: HistoricalEvent[];
  archiveObjects: ArchiveObject[];
  newsArticles: NewsArticle[];
  derived: Derived;
}
