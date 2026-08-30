import { notFound } from 'next/navigation';
import { allPaintings, getPainting } from '@/lib/data';
import { Fact, Facts, RecordHeader } from '@/components/Record';
import { CommentarySection, HistoricalContextSection, ShownInSection } from '@/components/Relations';

/**
 * The painting record page — complete, but not yet mounted as a route.
 *
 * Static export refuses a dynamic route whose generateStaticParams returns
 * nothing (Next treats an empty result as missing), and there are no paintings
 * yet. So the page lives here and scripts/build-data.mjs writes
 * app/works/[paintingId]/page.tsx as soon as seed_paintings.json has rows,
 * removing it again if they go away. Dropping the catalogue in really is all
 * that is required.
 */
export const dynamicParams = false;

export async function generateStaticParams() {
  return allPaintings.map((p) => ({ paintingId: p.id }));
}

type Props = { params: Promise<{ paintingId: string }> };

export default async function PaintingDetail({ params }: Props) {
  const { paintingId } = await params;
  const painting = getPainting(paintingId);
  if (!painting) notFound();

  return (
    <div className="record">
      <RecordHeader
        backHref="/works/"
        backLabel="Works"
        eyebrow={painting.date_text ?? undefined}
        title={painting.title ?? 'Untitled'}
      />

      {painting.image_ref && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={painting.image_ref}
          alt={[
            painting.title ?? 'Untitled work',
            painting.date_text,
            painting.medium,
          ].filter(Boolean).join(', ') + ' by Maurice Sievan'}
          style={{ width: '100%', height: 'auto', marginBottom: 'var(--s-5)' }}
        />
      )}

      <Facts>
        <Fact label="Date">{painting.date_text}</Fact>
        <Fact label="Medium">{painting.medium}</Fact>
        <Fact label="Dimensions">{painting.dimensions}</Fact>
        <Fact label="Collection">{painting.current_location}</Fact>
      </Facts>

      {/* Each of these renders nothing until its join table has rows. */}
      <ShownInSection paintingId={painting.id} />
      <CommentarySection paintingId={painting.id} />
      <HistoricalContextSection paintingId={painting.id} />
    </div>
  );
}
