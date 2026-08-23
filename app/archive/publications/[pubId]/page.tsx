import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  allPublications, articleTitle, articlesForPublication, getPerson, getPublication,
} from '@/lib/data';
import { formatArticleDate } from '@/lib/dates';
import { Fact, Facts, RecordHeader, RecordList, Section } from '@/components/Record';

export function generateStaticParams() {
  return allPublications.map((p) => ({ pubId: p.id }));
}

type Props = { params: Promise<{ pubId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pubId } = await params;
  const pub = getPublication(pubId);
  if (!pub) return { title: 'Publication not found' };
  const articles = articlesForPublication(pub.id);
  return {
    title: pub.name,
    description: `${articles.length} article${articles.length !== 1 ? 's' : ''} about Maurice Sievan from ${pub.name}.`,
  };
}

export default async function PublicationPage({ params }: Props) {
  const { pubId } = await params;
  const pub = getPublication(pubId);
  if (!pub) notFound();

  const articles = articlesForPublication(pub.id).sort(
    (a, b) => (a.date_earliest ?? 0) - (b.date_earliest ?? 0),
  );
  const years = articles.map((a) => a.date_earliest).filter((y): y is number => y !== null);

  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)', maxWidth: '48rem' }}>
      <RecordHeader
        backHref="/archive/publications/"
        backLabel="Publications"
        eyebrow={pub.type !== 'unknown' ? pub.type : undefined}
        title={pub.name}
      />

      <Facts>
        <Fact label="Notices held">{articles.length}</Fact>
        <Fact label="Span">
          {years.length ? (years[0] === years[years.length - 1]
            ? String(years[0])
            : `${years[0]}–${years[years.length - 1]}`) : null}
        </Fact>
        {/* Aliases are the manifest's own spellings, kept so a search for the typo works. */}
        <Fact label="Also catalogued as">
          {pub.aliases.length ? pub.aliases.join(' · ') : null}
        </Fact>
      </Facts>

      <Section title={`Notices in ${pub.name}`}>
        <RecordList>
          {articles.map((a) => (
            <li key={a.id}>
              <Link href={`/archive/press/${a.id}/`}>{articleTitle(a)}</Link>
              <br />
              <span className="ui faint">
                {[
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
    </div>
  );
}
