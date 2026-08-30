import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  allPersons, articlesForAuthor, mentionsForPerson, videosForPerson, ROLE_LABELS,
} from '@/lib/data';
import styles from './people.module.css';

export const metadata: Metadata = {
  title: 'People',
  description:
    'The critics who reviewed Maurice Sievan and the painters and dealers who ' +
    'remembered him on tape.',
};

/** Order the groups by how central they are to this archive. */
const GROUPS = ['interview_subject', 'critic', 'gallery_owner', 'artist'] as const;

export default function PeoplePage() {
  const sievan = allPersons.find((p) => p.id === 'maurice-sievan');
  const others = allPersons.filter((p) => p.id !== 'maurice-sievan');

  const counted = others.map((p) => ({
    person: p,
    articles: articlesForAuthor(p.id).length,
    interviews: videosForPerson(p.id).length,
    mentions: mentionsForPerson(p.id).length,
  }));

  return (
    <div className="page">
      <header style={{ marginBottom: 'var(--s-6)' }}>
        <h1>People</h1>
        <p className="measure muted">
          The critics who wrote about Sievan, and the painters and dealers who spoke about
          him on tape. Several appear in more than one capacity — Ivan Karp is both an
          interview subject and the author of a 1960 gallery essay.
        </p>
      </header>

      {sievan && (
        <Link href={`/people/${sievan.id}/`} className={styles.subject}>
          <p className={styles.subjectEyebrow}>The subject of this archive</p>
          <h2 className={styles.subjectName}>{sievan.name}</h2>
          {sievan.notes && <p className={styles.subjectNote}>{sievan.notes}</p>}
        </Link>
      )}

      {GROUPS.map((role) => {
        // roles is multi-valued, so a person appears in each group they qualify for.
        const members = counted
          .filter((c) => c.person.roles.includes(role))
          .sort((a, b) =>
            b.articles + b.interviews - (a.articles + a.interviews) ||
            a.person.name.localeCompare(b.person.name));
        if (!members.length) return null;

        return (
          <section key={role} className={styles.group}>
            <h2 className={styles.groupTitle}>
              {ROLE_LABELS[role]}s <span className={styles.groupCount}>{members.length}</span>
            </h2>
            {/* A group is as wide as it is long: 24 critics take four columns, one gallery owner takes one. */}
            <ul
              className={styles.list}
              style={{ '--columns': columnsFor(members.length) } as CSSProperties}
            >
              {members.map(({ person, articles, interviews, mentions }) => (
                <li key={person.id}>
                  <Link href={`/people/${person.id}/`} className={styles.row}>
                    <span className={styles.name}>{person.name}</span>
                    <span className={styles.meta}>
                      {[
                        articles && `${articles} notice${articles === 1 ? '' : 's'}`,
                        interviews && `${interviews} interview${interviews === 1 ? '' : 's'}`,
                        !articles && !interviews && mentions && `${mentions} mention${mentions === 1 ? '' : 's'}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/**
 * Column count by group size. The four groups here hold 24, 5, 2 and 1 people, and a
 * flat two columns turned "Gallery owners" into a heading over a single name in a
 * two-column box while cramming the 24 critics into a narrow pair.
 */
function columnsFor(n: number): number {
  if (n <= 2) return 1;
  if (n <= 8) return 2;
  if (n <= 16) return 3;
  return 4;
}
