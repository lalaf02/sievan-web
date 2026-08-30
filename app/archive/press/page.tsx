import type { Metadata } from 'next';
import { allArticles, archive, getPerson, getPublication, getObject } from '@/lib/data';
import { decadeLabel } from '@/lib/dates';
import { PressBrowser, type FacetOption, type PressRow } from '@/components/PressBrowser';

export const metadata: Metadata = {
  title: 'The press archive',
  description:
    'Sixty press notices on Maurice Sievan, 1940–1983, drawn from thirty publications.',
};

function rows(): PressRow[] {
  return allArticles.map((a) => {
    const pub = getPublication(a.publication_id);
    const person = getPerson(a.author_person_id);
    const object = getObject(a.archive_object_id);
    return {
      id: a.id,
      objectId: a.archive_object_id,
      headline: a.headline,
      raw: a.raw_source_text,
      publicationId: a.publication_id,
      publicationName: pub?.name ?? a.publication_raw,
      authorId: a.author_person_id,
      authorName: person?.name ?? a.author_raw,
      initialsOnly: !a.author_person_id && !!a.author_raw,
      year: a.date_earliest,
      dateNormalized: a.date_normalized,
      dateText: a.date_text,
      dateUncertain: a.date_uncertain,
      objectType: object?.object_type ?? 'other',
      hasScan: (object?.scan_files.length ?? 0) > 0,
    };
  });
}

export default function PressPage() {
  const data = rows();
  const { facets } = archive.derived;

  const decades: FacetOption[] = Object.entries(facets.decade)
    .map(([id, count]) => ({ id, label: decadeLabel(id), count }))
    .sort((a, b) => Number(a.id) - Number(b.id));

  const publications: FacetOption[] = Object.entries(facets.publication)
    .map(([id, count]) => ({ id, label: getPublication(id)?.name ?? id, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  // Initials-only bylines get their own bucket rather than being folded into
  // "unattributed" — "P.B.R." is a real archival category and a research lead.
  const authors: FacetOption[] = Object.entries(facets.author)
    .map(([id, count]) => ({
      id,
      label:
        id === '__initials__' ? 'Initials only'
          : id === '__unattributed__' ? 'Unattributed'
            : getPerson(id)?.name ?? id,
      count,
    }))
    .sort((a, b) => {
      const rank = (x: string) => (x === 'Unattributed' ? 2 : x === 'Initials only' ? 1 : 0);
      return rank(a.label) - rank(b.label) || b.count - a.count || a.label.localeCompare(b.label);
    });

  return (
    <div className="page">
      <header style={{ marginBottom: 'var(--s-6)' }}>
        <p className="eyebrow">The Archive</p>
        <h1>Press</h1>
        <p className="measure muted">
          Sixty notices, reviews and mentions published between 1940 and 1983, catalogued
          from the reprints Sievan kept. Most survive only as photocopies bound together
          in bundles — one archive object often holds several clippings.
        </p>
      </header>
      <PressBrowser
        rows={data}
        decades={decades}
        publications={publications}
        authors={authors}
      />
    </div>
  );
}
