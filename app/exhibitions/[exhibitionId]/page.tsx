import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { allExhibitions, getExhibition, getObject, objectLead, OBJECT_TYPE_LABELS } from '@/lib/data';
import { formatRange } from '@/lib/dates';
import { Fact, Facts, RecordHeader, RecordList, Section } from '@/components/Record';

export function generateStaticParams() {
  return allExhibitions.map((e) => ({ exhibitionId: e.id }));
}

type Props = { params: Promise<{ exhibitionId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { exhibitionId } = await params;
  const e = getExhibition(exhibitionId);
  if (!e) return {};
  return {
    title: e.name ?? e.gallery_or_venue,
    description: `${e.gallery_or_venue}${e.venue_city ? `, ${e.venue_city}` : ''}, ${e.date_earliest}`,
  };
}

export default async function ExhibitionPage({ params }: Props) {
  const { exhibitionId } = await params;
  const exhibition = getExhibition(exhibitionId);
  if (!exhibition) notFound();

  const sources = exhibition.source_archive_object_ids
    .map((id) => getObject(id))
    .filter((o): o is NonNullable<typeof o> => !!o);

  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)', maxWidth: '50rem' }}>
      <RecordHeader
        backHref="/exhibitions/"
        backLabel="Exhibitions"
        eyebrow={`${exhibition.gallery_or_venue}${exhibition.venue_city ? `, ${exhibition.venue_city}` : ''}`}
        title={exhibition.name ?? exhibition.gallery_or_venue}
      />

      <Facts>
        <Fact label="Venue">{exhibition.gallery_or_venue}</Fact>
        <Fact label="City">{exhibition.venue_city}</Fact>
        {/*
          formatRange drops an end date that is vaguer than the start: 13 of 15
          records carry end_date "1939" against start_date "1939-04-01", which is
          the same date restated, not a range.
        */}
        <Fact label="Dates">{formatRange(exhibition.start_date, exhibition.end_date)}</Fact>
        <Fact label="Type">
          {exhibition.exhibition_type === 'solo' ? 'One-man exhibition'
            : exhibition.exhibition_type === 'group' ? 'Group exhibition' : null}
        </Fact>
        <Fact label="Evidence">
          {exhibition.confidence === 'confirmed'
            ? 'Confirmed by a surviving document in the archive'
            : 'Inferred'}
        </Fact>
      </Facts>

      {sources.length > 0 && (
        <Section title="Documented by">
          <RecordList>
            {sources.map((o) => (
              <li key={o.id}>
                <Link href={`/archive/objects/${o.id}/`}>{objectLead(o)}</Link>
                <br />
                <span className="ui faint">
                  {OBJECT_TYPE_LABELS[o.object_type]} · {o.id}
                  {o.scan_files.length === 0 && ' · not digitised'}
                </span>
              </li>
            ))}
          </RecordList>
        </Section>
      )}

      {/*
        Works shown is deliberately absent rather than an empty panel: no painting
        catalogue exists yet, so there is nothing honest to list. The section
        appears the moment PaintingExhibition rows arrive.
      */}
    </div>
  );
}
