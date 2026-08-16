import type { Metadata } from 'next';
import { archive, getVideo } from '@/lib/data';
import { Chronology } from '@/components/Chronology';

export const metadata: Metadata = {
  title: 'Chronology',
  description:
    'Everything in the Sievan archive on one timeline, 1939–2006: exhibitions, press ' +
    'notices and the objects that record them.',
};

export default function ChronologyPage() {
  const { timeline, undatedVideos } = archive.derived;

  const testimony = undatedVideos
    .map((id) => getVideo(id))
    .filter((v): v is NonNullable<typeof v> => !!v && !!v.transcript_text_file)
    .map((v) => ({
      id: v.id,
      title: v.title,
      href: `/life/interviews/${v.id}/`,
      words: v.transcript_word_count,
    }));

  const years = timeline.map((t) => t.year);
  const span = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : '';

  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)', maxWidth: '54rem' }}>
      <header style={{ marginBottom: 'var(--s-6)' }}>
        <p className="eyebrow">Life and Work</p>
        <h1>Chronology</h1>
        <p className="measure muted">
          Everything the archive can date, on one spine — {span}. The record is uneven by
          nature: it thickens around each exhibition and thins to nothing between them.
          Those gaps are shown rather than closed up.
        </p>
      </header>

      <Chronology events={timeline} undatedTestimony={testimony} />
    </div>
  );
}
