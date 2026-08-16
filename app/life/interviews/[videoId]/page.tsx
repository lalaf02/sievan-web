import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { allVideos, getPerson, getVideo, loadTranscript } from '@/lib/data';
import { EditorialNote, Fact, Facts, RecordHeader } from '@/components/Record';
import { TranscriptReader } from '@/components/TranscriptReader';

/** Only the transcribed interviews get a reader page. */
export function generateStaticParams() {
  return allVideos
    .filter((v) => v.transcript_text_file)
    .map((v) => ({ videoId: v.id }));
}

type Props = { params: Promise<{ videoId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { videoId } = await params;
  const video = getVideo(videoId);
  return video ? { title: video.title } : {};
}

export default async function InterviewPage({ params }: Props) {
  const { videoId } = await params;
  const video = getVideo(videoId);
  if (!video) notFound();

  const pages = await loadTranscript(video.id);
  if (!pages) notFound();

  const person = video.subject_person_ids.map((id) => getPerson(id)).find(Boolean);
  const totalBytes = video.media_files.reduce((n, m) => n + (m.size_bytes ?? 0), 0);

  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)' }}>
      <div style={{ maxWidth: '52rem' }}>
        <RecordHeader
          backHref="/life/interviews/"
          backLabel="Interviews"
          eyebrow={video.physical_tape_no ? `Tape #${video.physical_tape_no}` : 'Interview'}
          title={video.title}
        />

        {/*
          Carried straight from the record's notes. The Dobkin transcript opens with
          a recollection that does not fit his biography, and saying so is what makes
          the rest trustworthy.
        */}
        {video.notes && <EditorialNote>{video.notes}</EditorialNote>}

        <Facts>
          <Fact label="Speaking">
            {person ? <Link href={`/people/${person.id}/`}>{person.name}</Link> : null}
          </Fact>
          <Fact label="Transcript">
            {video.transcript_word_count?.toLocaleString()} words across{' '}
            {video.transcript_page_count} pages
          </Fact>
          <Fact label="Recorded">{video.interview_date ?? 'Date unknown'}</Fact>
          {/*
            No video player: the masters are 25 GB and not yet hosted. Stating the
            provenance is more useful than an empty "coming soon" frame.
          */}
          <Fact label="Source">
            {(totalBytes / 1e9).toFixed(1)} GB master
            {video.media_files.length > 1 ? 's' : ''}, held by the estate — not yet online
          </Fact>
        </Facts>
      </div>

      <hr />

      <TranscriptReader pages={pages} />
    </div>
  );
}
