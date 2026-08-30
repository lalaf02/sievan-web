/**
 * The seam. Reads the archive out of Supabase in exactly the shape build-data.mjs used to
 * read off disk, so everything downstream of it — the ajv validation, the transcript
 * parser, all 23 derivations, the scans wiring, the emit — is unchanged.
 *
 * The api.v_* views do the reshaping in SQL: they rebuild scan_files, place_refs,
 * media_files and article_ids from their child tables, and they list their columns
 * explicitly because schema/data_model.schema.json sets additionalProperties:false. A
 * leaked created_at fails ajv on every row of the table, which is the schema working.
 *
 * Row ORDER comes from each view's own ORDER BY sort_order, not from a client-side sort:
 * the curator's sequence for exhibitions and places feeds derived.exhibitionsByObject, so
 * it must survive the round trip.
 */
import { selectAll } from './supabase.mjs';

/** view -> the key build-data.mjs uses for the table. Mirrors its old SEEDS map. */
export const VIEWS = {
  v_collections:                 'collections',
  v_publications:                'publications',
  v_persons:                     'persons',
  v_exhibitions:                 'exhibitions',
  v_video_assets:                'videoAssets',
  v_paintings:                   'paintings',
  // Places load before attestations, which reference them.
  v_places:                      'places',
  v_attested_works:              'attestedWorks',
  v_commentary:                  'commentary',
  v_commentary_relations:        'commentaryRelations',
  v_painting_historical_context: 'paintingHistoricalContext',
  v_painting_exhibitions:        'paintingExhibitions',
  v_historical_events:           'historicalEvents',
  v_scholarship:                 'scholarship',
  v_archive_objects:             'archiveObjects',
  v_news_articles:               'newsArticles',
};

/**
 * Every entity table, plus the interview transcripts as verbatim text.
 *
 * The views are fetched in parallel — sixteen small requests against ~300 rows — but the
 * result is assembled in VIEWS order so the bundle's key order stays stable between runs.
 */
export async function fetchArchive() {
  const names = Object.keys(VIEWS);
  const rows = await Promise.all([
    ...names.map((v) => selectAll(v, { order: '', schema: 'api' })),
    selectAll('v_transcript_texts', { order: 'video_id.asc', schema: 'api' }),
  ]);

  const data = {};
  names.forEach((v, i) => { data[VIEWS[v]] = rows[i]; });

  const transcripts = {};
  for (const t of rows[names.length]) transcripts[t.video_id] = t.text;

  return { data, transcripts };
}

/**
 * Every object in Storage, keyed "<bucket>/<path>", with the size the incremental
 * download compares against. One query, so a build that needs nothing downloads nothing:
 * without it every deploy pulls 182 MB against a 5 GB monthly allowance.
 */
export async function fetchMediaManifest() {
  const rows = await selectAll('v_media_manifest', { order: 'bucket.asc,path.asc', schema: 'api' });
  const manifest = new Map();
  for (const r of rows) manifest.set(`${r.bucket}/${r.path}`, r);
  return manifest;
}
