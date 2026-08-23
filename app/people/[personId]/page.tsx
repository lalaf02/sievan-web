import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  allPersons, articleTitle, articlesForAuthor, getPerson, getPublication,
  mentionsForPerson, objectLead, videosForPerson, OBJECT_TYPE_LABELS, ROLE_LABELS,
} from '@/lib/data';
import { formatArticleDate } from '@/lib/dates';
import { EditorialNote, Fact, Facts, RecordHeader, RecordList, Section } from '@/components/Record';

export function generateStaticParams() {
  return allPersons.map((p) => ({ personId: p.id }));
}

type Props = { params: Promise<{ personId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { personId } = await params;
  const person = getPerson(personId);
  if (!person) return { title: 'Person not found' };
  const roles = person.roles.map((r) => ROLE_LABELS[r]).join(', ');
  return {
    title: person.name,
    description: `${person.name}${roles ? ` — ${roles}` : ''} in the Maurice Sievan archive.`,
  };
}

export default async function PersonPage({ params }: Props) {
  const { personId } = await params;
  const person = getPerson(personId);
  if (!person) notFound();

  const articles = articlesForAuthor(person.id).sort(
    (a, b) => (a.date_earliest ?? 0) - (b.date_earliest ?? 0),
  );
  const interviews = videosForPerson(person.id);
  const mentions = mentionsForPerson(person.id);

  // Objects already listed as an article byline shouldn't repeat under mentions.
  const bylineObjects = new Set(articles.map((a) => a.archive_object_id));
  const otherMentions = mentions.filter((m) => !bylineObjects.has(m.object.id));

  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)', maxWidth: '50rem' }}>
      <RecordHeader
        backHref="/people/"
        backLabel="People"
        eyebrow={person.roles.map((r) => ROLE_LABELS[r]).join(' · ')}
        title={person.name}
      />

      {person.notes && <EditorialNote label="On this attribution">{person.notes}</EditorialNote>}

      <Facts>
        <Fact label="Also written as">
          {person.aliases.length ? person.aliases.join(' · ') : null}
        </Fact>
        <Fact label="In this archive">
          {[
            articles.length && `${articles.length} signed notice${articles.length === 1 ? '' : 's'}`,
            interviews.length && `${interviews.length} recorded interview${interviews.length === 1 ? '' : 's'}`,
            otherMentions.length && `${otherMentions.length} mention${otherMentions.length === 1 ? '' : 's'}`,
          ]
            .filter(Boolean)
            .join(' · ') || null}
        </Fact>
      </Facts>

      {interviews.length > 0 && (
        <Section title="Recorded testimony">
          <RecordList>
            {interviews.map((v) => (
              <li key={v.id}>
                {v.transcript_text_file ? (
                  <Link href={`/life/interviews/${v.id}/`}>{v.title}</Link>
                ) : (
                  <span>{v.title}</span>
                )}{' '}
                <span className="ui faint">
                  {v.transcript_word_count
                    ? `${v.transcript_word_count.toLocaleString()} words`
                    : 'not transcribed'}
                </span>
              </li>
            ))}
          </RecordList>
        </Section>
      )}

      {articles.length > 0 && (
        <Section title="Notices signed by this writer">
          <RecordList>
            {articles.map((a) => (
              <li key={a.id}>
                <Link href={`/archive/press/${a.id}/`}>{articleTitle(a)}</Link>
                <br />
                <span className="ui faint">
                  {[
                    getPublication(a.publication_id)?.name ?? a.publication_raw,
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

      {/*
        Derived by matching this person's name and aliases against the manifest
        descriptions. It is the only way Ivan Karp's 1960 Barone Gallery essay
        surfaces at all: that object was never split into articles, so no byline
        points at him. Labelled "mentioned", not "authored" — a string match
        cannot prove authorship.
      */}
      {otherMentions.length > 0 && (
        <Section title="Named elsewhere in the archive">
          <RecordList>
            {otherMentions.map(({ object, matchedAs }) => (
              <li key={object.id}>
                <Link href={`/archive/objects/${object.id}/`}>{objectLead(object)}</Link>
                <br />
                <span className="ui faint">
                  {OBJECT_TYPE_LABELS[object.object_type]}
                  {object.date_text ? ` · ${object.date_text}` : ''}
                  {matchedAs !== person.name && ` · named as “${matchedAs}”`}
                </span>
              </li>
            ))}
          </RecordList>
        </Section>
      )}
    </div>
  );
}
