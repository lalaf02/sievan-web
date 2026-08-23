import type { Metadata } from 'next';
import Link from 'next/link';
import { allVideos, counts, getPerson } from '@/lib/data';
import styles from './interviews.module.css';
import { formatDuration } from '@/lib/dates';
import { CONTACT, mailtoHref } from '@/lib/contact';
import { Pending } from '@/components/Pending';

export const metadata: Metadata = {
  title: 'Interviews',
  description:
    'Recorded testimony from the painters and dealers who knew Maurice Sievan — ' +
    'five transcribed interviews, some 24,000 words.',
};

const gb = (bytes: number) => `${(bytes / 1e9).toFixed(1)} GB`;

export default function InterviewsPage() {
  const interviews = allVideos.filter((v) => v.subject_type === 'interview');
  const other = allVideos.filter((v) => v.subject_type !== 'interview');

  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)' }}>
      <header style={{ marginBottom: 'var(--s-6)' }}>
        <p className="eyebrow">Life and Work</p>
        <h1>Interviews</h1>
        <p className="measure muted">
          Six interviews and one reel of studio footage, recorded on tape and held by the
          estate. Five are transcribed here in full — {counts.transcriptWords.toLocaleString()}{' '}
          words of first-hand recollection from the painters and dealers who knew Sievan.
          The video itself is not yet online.
        </p>
      </header>

      <Pending
        eyebrow="A gap in the record"
        title="None of the seven recordings is dated."
        footer={
          <>
            Were you there, or do you know when these were filmed?{' '}
            <a href={mailtoHref('Sievan archive: interview dates')}>{CONTACT.email}</a>
          </>
        }
      >
        <p>
          Because no recording carries a date, none of them can be placed on the{' '}
          <Link href="/life/#chronology">chronology</Link> — the most human material in the
          archive sits outside its timeline, in a band of its own. Internal evidence puts
          them after Sievan’s death in 1981: Ivan Karp mentions not having seen him “for
          over 12, 14 years”.
        </p>
        <p>
          A date on the tape label, a letter arranging the interview, or a recollection
          from anyone present would close this.
        </p>
      </Pending>

      <ul className={styles.grid}>
        {[...interviews, ...other].map((v) => {
          const person = v.subject_person_ids.map((id) => getPerson(id)).find(Boolean);
          const readable = !!v.transcript_text_file;
          const totalBytes = v.media_files.reduce((n, m) => n + (m.size_bytes ?? 0), 0);

          const card = (
            <>
              <p className={styles.cardEyebrow}>
                {v.subject_type === 'process_footage' ? 'Studio footage' : 'Interview'}
                {v.physical_tape_no && ` · Tape #${v.physical_tape_no}`}
              </p>
              <h2 className={styles.cardTitle}>{v.title}</h2>

              {readable ? (
                <p className={styles.cardMeta}>
                  {formatDuration(v.duration_seconds) ?? 'Runtime unknown'} ·{' '}
                  {v.transcript_word_count?.toLocaleString()} words ·{' '}
                  {v.transcript_page_count} pages
                </p>
              ) : (
                <p className={styles.cardMeta}>
                  {formatDuration(v.duration_seconds) ?? 'Runtime unknown'} · No transcript
                </p>
              )}

              {/*
                The notes on these two records are genuinely interesting — an
                unidentified interviewee is an open research question, not an
                apology — so they are shown rather than hidden.
              */}
              {!readable && v.notes && <p className={styles.cardNote}>{v.notes}</p>}

              <p className={styles.cardSource}>
                Source: {gb(totalBytes)} master{v.media_files.length > 1 ? 's' : ''}, held by
                the estate
              </p>
            </>
          );

          return (
            <li key={v.id} className={styles.item}>
              {readable ? (
                <Link href={`/life/interviews/${v.id}/`} className={styles.card}>
                  {card}
                  <span className={styles.cardRead}>Read the transcript →</span>
                </Link>
              ) : (
                <div className={`${styles.card} ${styles.cardMuted}`}>
                  {card}
                  {v.id === 'MS-VI-00006' && (
                    <a className={styles.help} href={mailtoHref('Sievan archive: tape #010')}>
                      Can you help identify this interview?
                    </a>
                  )}
                </div>
              )}
              {person && (
                <p className={styles.cardPerson}>
                  <Link href={`/people/${person.id}/`}>{person.name}</Link>
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
