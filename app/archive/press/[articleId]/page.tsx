import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  allArticles, articleTitle, getArticle, getObject, getPerson, getPublication,
  articlesForObject, OBJECT_TYPE_LABELS,
} from '@/lib/data';
import { formatArticleDate } from '@/lib/dates';
import {
  EditorialNote, Fact, Facts, RecordHeader, RecordList, Section, Verbatim,
} from '@/components/Record';

export function generateStaticParams() {
  return allArticles.map((a) => ({ articleId: a.id }));
}

// Next 16: params is a Promise and must be awaited.
type Props = { params: Promise<{ articleId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { articleId } = await params;
  const article = getArticle(articleId);
  if (!article) return {};
  const pub = getPublication(article.publication_id)?.name ?? article.publication_raw;
  return {
    title: articleTitle(article),
    description: [pub, article.date_text].filter(Boolean).join(', '),
  };
}

export default async function ArticlePage({ params }: Props) {
  const { articleId } = await params;
  const article = getArticle(articleId);
  if (!article) notFound();

  const object = getObject(article.archive_object_id);
  const publication = getPublication(article.publication_id);
  const person = getPerson(article.author_person_id);
  const siblings = articlesForObject(article.archive_object_id).filter((a) => a.id !== article.id);

  const date = formatArticleDate(article.date_normalized, article.date_text, article.date_uncertain);
  const corrected = article.review_status === 'reviewed_corrected';

  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)', maxWidth: '52rem' }}>
      <RecordHeader
        backHref="/archive/press/"
        backLabel="Press archive"
        eyebrow={[publication?.name ?? article.publication_raw, article.date_earliest]
          .filter(Boolean)
          .join(' · ')}
        title={articleTitle(article)}
      />

      {/* The record's own note, where a curator has left one worth reading. */}
      {article.notes && (
        <EditorialNote label={corrected ? 'Corrected' : 'Note'}>
          {article.notes}
        </EditorialNote>
      )}

      <Facts>
        <Fact label="Publication">
          {publication ? (
            <Link href={`/archive/publications/${publication.id}/`}>{publication.name}</Link>
          ) : (
            article.publication_raw
          )}
        </Fact>
        <Fact label="Date">{date}</Fact>
        <Fact label="Byline">
          {person ? (
            <Link href={`/people/${person.id}/`}>{person.name}</Link>
          ) : article.author_raw ? (
            <>
              {article.author_raw}{' '}
              <span className="faint ui">
                — initials only, not attributed
              </span>
            </>
          ) : null}
        </Fact>
        <Fact label="Archive object">
          {object && (
            <Link href={`/archive/objects/${object.id}/`}>
              {object.id} · {OBJECT_TYPE_LABELS[object.object_type]}
            </Link>
          )}
        </Fact>
        <Fact label="Record ID">
          <span className="verbatim">{article.id}</span>
        </Fact>
      </Facts>

      {/*
        Always shown: the reader can check every parsed field above against the
        manifest line it came from.
      */}
      <Verbatim text={article.raw_source_text} />

      {siblings.length > 0 && object && (
        <Section title={`Also in ${object.id}`}>
          <p className="ui muted" style={{ marginTop: 0 }}>
            This clipping was photocopied together with {siblings.length} other
            {siblings.length === 1 ? '' : 's'} onto the same sheet.
          </p>
          <RecordList>
            {siblings.map((s) => (
              <li key={s.id}>
                <Link href={`/archive/press/${s.id}/`}>{articleTitle(s)}</Link>{' '}
                <span className="ui faint">
                  {getPublication(s.publication_id)?.name ?? s.publication_raw}
                  {s.date_text ? ` · ${s.date_text}` : ''}
                </span>
              </li>
            ))}
          </RecordList>
        </Section>
      )}
    </div>
  );
}
