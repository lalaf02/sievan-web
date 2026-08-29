import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  allObjects, articleTitle, articlesForObject, attestationsForObject,
  exhibitionsForObject, getObject, getPerson, getPublication, objectLead,
  OBJECT_TYPE_LABELS,
} from '@/lib/data';
import { formatArticleDate } from '@/lib/dates';
import { Fact, Facts, RecordHeader, RecordList, Section, Verbatim } from '@/components/Record';
import { ScanViewer, type ScanInfo } from '@/components/ScanViewer';
import { SameYearSection } from '@/components/RelatedSection';

export function generateStaticParams() {
  return allObjects.map((o) => ({ objectId: o.id }));
}

type Props = { params: Promise<{ objectId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { objectId } = await params;
  const object = getObject(objectId);
  if (!object) return { title: 'Object not found' };
  const typeLabel = OBJECT_TYPE_LABELS[object.object_type];
  return {
    title: `${object.id} · ${typeLabel}`,
    description: `${typeLabel}${object.date_text ? ` (${object.date_text})` : ''} from the Maurice Sievan archive.`,
  };
}

export default async function ObjectPage({ params }: Props) {
  const { objectId } = await params;
  const object = getObject(objectId);
  if (!object) notFound();

  const articles = articlesForObject(object.id);
  const attestations = attestationsForObject(object.id);
  const exhibitions = exhibitionsForObject(object.id);
  const scans = object.scan_files as ScanInfo[];

  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)', maxWidth: '52rem' }}>
      <RecordHeader
        backHref="/archive/"
        backLabel="The archive"
        eyebrow={`${OBJECT_TYPE_LABELS[object.object_type]}${object.date_text ? ` · ${object.date_text}` : ''}`}
        title={object.id}
      />

      <p className="measure" style={{ marginTop: 'calc(-1 * var(--s-3))' }}>
        {objectLead(object)}
      </p>

      <ScanViewer
        scans={scans}
        objectId={object.id}
        withheld={/not scanned/i.test(object.raw_title_description)}
      />

      <Facts>
        <Fact label="Type">{OBJECT_TYPE_LABELS[object.object_type]}</Fact>
        <Fact label="Date">{object.date_text}</Fact>
        <Fact label="Medium">{object.medium_raw?.replace(/\s+/g, ' ')}</Fact>
        <Fact label="Condition">{object.condition}</Fact>
        <Fact label="Copies held">{object.copies_count}</Fact>
        {/* Folder is a string because the manifest uses compound values like "4,5". */}
        <Fact label="Folder">{object.folder_no}</Fact>
        <Fact label="Box">
          <Link href="/archive/">{object.collection_id}</Link>
        </Fact>
        <Fact label="Clippings held">
          {articles.length > 0
            ? `${articles.length}${
                object.stated_item_count
                  ? ` (manifest states ${object.stated_item_count})`
                  : ''
              }`
            : null}
        </Fact>
      </Facts>

      <Verbatim label="Catalogue description" text={object.raw_title_description} />

      {/*
        Placed straight after the verbatim description, so the reader meets the
        sheet's own words first and then what was drawn out of them — and can see
        that the second is contained in the first.
      */}
      {attestations.length > 0 && (
        <Section title={`Paintings named on this sheet (${attestations.length})`}>
          <p className="ui muted" style={{ marginTop: 0 }}>
            Works Sievan names here that the archive does not hold. Each is the
            sheet’s own words and nothing more — evidence toward the catalogue, not
            an entry in it.
          </p>
          <RecordList>
            {attestations.map((w) => (
              <li key={w.id}>
                <Link href={`/works/attested/#${w.id}`}>
                  {w.title_stated ?? 'A painting with no title on the sheet'}
                </Link>
                {w.artist_number && (
                  <span className="ui faint"> · his no. {w.artist_number}</span>
                )}
                <br />
                <span className="ui faint">
                  {[w.dimensions_stated, w.medium_stated, w.price_stated, w.date_text]
                    .filter(Boolean).join(' · ')}
                </span>
              </li>
            ))}
          </RecordList>
        </Section>
      )}

      {articles.length > 0 && (
        <Section title={`Clippings on this sheet (${articles.length})`}>
          <RecordList>
            {articles.map((a) => (
              <li key={a.id}>
                <Link href={`/archive/press/${a.id}/`}>{articleTitle(a)}</Link>
                <br />
                <span className="ui faint">
                  {[
                    getPublication(a.publication_id)?.name ?? a.publication_raw,
                    getPerson(a.author_person_id)?.name ?? a.author_raw,
                    formatArticleDate(a.date_normalized, a.date_text, a.date_uncertain),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </li>
            ))}
          </RecordList>
        </Section>
      )}

      {exhibitions.length > 0 && (
        <Section title="Documents an exhibition">
          <RecordList>
            {exhibitions.map((e) => (
              <li key={e.id}>
                <Link href={`/exhibitions/${e.id}/`}>{e.name ?? e.gallery_or_venue}</Link>{' '}
                <span className="ui faint">
                  {e.gallery_or_venue}
                  {e.venue_city ? `, ${e.venue_city}` : ''}
                </span>
              </li>
            ))}
          </RecordList>
        </Section>
      )}

      <SameYearSection year={object.date_earliest} exclude={[object.id, ...object.article_ids]} />
    </div>
  );
}
