import type { Metadata } from 'next';
import Link from 'next/link';
import {
  allArticles, allObjects, allExhibitions, allPersons, allPublications, allVideos,
  articleTitle, objectLead, getPerson, getPublication, loadTranscript,
  OBJECT_TYPE_LABELS, ROLE_LABELS, counts,
} from '@/lib/data';
import { formatArticleDate, formatRange } from '@/lib/dates';
import { SiteSearch, type SearchRow } from '@/components/SiteSearch';

export const metadata: Metadata = {
  title: 'Search the archive',
  description:
    'One search across every press notice, archive object, exhibition, publication, person '
    + 'and interview transcript in the Maurice Sievan archive.',
};

/**
 * The index is built here, at build time, and handed to the client component as
 * props — so the complete list is in the prerendered HTML and the page is a usable
 * table of contents with JavaScript switched off.
 */
async function buildIndex(): Promise<SearchRow[]> {
  const rows: SearchRow[] = [];

  for (const a of allArticles) {
    const pub = getPublication(a.publication_id);
    const person = getPerson(a.author_person_id);
    const byline = person?.name ?? a.author_raw;
    rows.push({
      id: a.id,
      kind: 'article',
      title: articleTitle(a),
      subtitle: [pub?.name ?? a.publication_raw, byline].filter(Boolean).join(' · ') || null,
      meta: formatArticleDate(a.date_normalized, a.date_text, a.date_uncertain),
      href: `/archive/press/${a.id}/`,
      body: a.raw_source_text,
    });
  }

  for (const v of allVideos) {
    const people = v.subject_person_ids.map((id) => getPerson(id)?.name).filter(Boolean);
    rows.push({
      id: v.id,
      kind: 'interview',
      title: v.title,
      subtitle: people.length ? people.join(', ') : null,
      meta: v.transcript_word_count ? `${v.transcript_word_count.toLocaleString()} words` : null,
      href: v.transcript_text_file ? `/life/interviews/${v.id}/` : '/life/interviews/',
      body: null,
    });
  }

  // Transcript paragraphs are the only full text the archive actually holds, so they
  // are indexed individually and deep-link into the reader with the term already lit.
  for (const v of allVideos) {
    if (!v.transcript_text_file) continue;
    const pages = await loadTranscript(v.id);
    if (!pages) continue;
    for (const page of pages) {
      page.paragraphs.forEach((text, i) => {
        if (text.trim().length < 40) return;
        rows.push({
          id: `${v.id}-p${page.page}-${i}`,
          kind: 'transcript',
          title: v.title,
          subtitle: `Page ${page.page}`,
          meta: null,
          href: `/life/interviews/${v.id}/#p${page.page}`,
          body: text,
        });
      });
    }
  }

  for (const e of allExhibitions) {
    rows.push({
      id: e.id,
      kind: 'exhibition',
      title: e.name ?? e.gallery_or_venue ?? 'Untitled exhibition',
      subtitle: [e.gallery_or_venue, e.venue_city].filter(Boolean).join(', ') || null,
      meta: formatRange(e.start_date, e.end_date),
      href: `/exhibitions/${e.id}/`,
      body: e.notes,
    });
  }

  for (const o of allObjects) {
    rows.push({
      id: o.id,
      kind: 'object',
      title: objectLead(o),
      subtitle: OBJECT_TYPE_LABELS[o.object_type] ?? o.object_type,
      meta: o.date_text,
      href: `/archive/objects/${o.id}/`,
      body: o.raw_title_description,
    });
  }

  for (const p of allPersons) {
    rows.push({
      id: p.id,
      kind: 'person',
      title: p.name,
      subtitle: p.roles.map((r) => ROLE_LABELS[r] ?? r).join(', ') || null,
      meta: null,
      href: `/people/${p.id}/`,
      body: [p.aliases.join(' '), p.notes].filter(Boolean).join(' ') || null,
    });
  }

  for (const p of allPublications) {
    rows.push({
      id: p.id,
      kind: 'publication',
      title: p.name,
      subtitle: p.type === 'unknown' ? null : p.type,
      meta: null,
      href: `/archive/publications/${p.id}/`,
      body: p.aliases.join(' ') || null,
    });
  }

  return rows;
}

export default async function SearchPage() {
  const rows = await buildIndex();

  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)' }}>
      <header style={{ marginBottom: 'var(--s-5)' }}>
        <p className="eyebrow">
          <Link href="/archive/">The Archive</Link>
        </p>
        <h1>Search</h1>
        <p className="muted" style={{ maxWidth: 'var(--measure)' }}>
          Everything the archive holds in one list — {counts.newsArticles} press notices,{' '}
          {counts.archiveObjects} objects, {counts.exhibitions} exhibitions,{' '}
          {counts.publications} publications, {counts.persons} people, and every paragraph of
          the {counts.transcribedInterviews} transcribed interviews.
        </p>
      </header>

      <SiteSearch rows={rows} />
    </div>
  );
}
