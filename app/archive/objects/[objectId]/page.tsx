import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  allObjects, articleTitle, articlesForObject, attestationsForObject, entryTitle,
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
    <div className="record">
      {/*
        A row carrying `artwork` is a catalogue entry, so it is headed like one and
        sends the reader back to the Catalogue Raisonné rather than to the archive.
        Every other object keeps the archival framing.

        No box or folder number is shown. They are the archive's internal shelving,
        they mean nothing to a reader, and `collection_id` in particular reads as a
        second identifier competing with the object's own.

        An object with no `artwork` is headed by its own accession id, and that is
        deliberate — it is the identifier the object actually has. Sievan gave these
        none, the archive does not invent one, and `objectLead()` prints the
        catalogue's own description immediately beneath. Do not substitute the
        description for the heading: it is a transcription, often long, and on the
        51 non-artwork objects it would read as a title the record does not have.
      */}
      <RecordHeader
        backHref={object.artwork ? '/works/' : '/archive/'}
        backLabel={object.artwork ? 'Catalogue Raisonné' : 'The archive'}
        eyebrow={`${object.id} · ${OBJECT_TYPE_LABELS[object.object_type]}${object.date_text ? ` · ${object.date_text}` : ''}`}
        title={object.artwork ? entryTitle(object) : object.id}
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
        <Fact label="Medium">{object.artwork?.medium_stated}</Fact>
        <Fact label="Support">{object.artwork?.support}</Fact>
        <Fact label="Signed">{object.artwork?.signed}</Fact>
        <Fact label="Sheets">{object.artwork?.sheet_count}</Fact>
        <Fact label="Type">{OBJECT_TYPE_LABELS[object.object_type]}</Fact>
        <Fact label="Date">{object.date_text}</Fact>
        <Fact label="Catalogued as">
          {object.artwork ? undefined : object.medium_raw?.replace(/\s+/g, ' ')}
        </Fact>
        <Fact label="Condition">{object.condition}</Fact>
        <Fact label="Copies held">{object.copies_count}</Fact>
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
