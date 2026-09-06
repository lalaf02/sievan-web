import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  allPlaces, attestationsForPlace, childPlaces, exhibitionsForPlace, getPlace,
  PLACE_ROLE_LABELS, placeUsage,
} from '@/lib/data';
import { MUSEUM_COLLECTIONS } from '@/lib/validation';
import { formatRange } from '@/lib/dates';
import { Fact, Facts, RecordHeader, RecordList, Section } from '@/components/Record';
import type { PlaceRole } from '@/lib/types';
import styles from './place.module.css';

/*
 * This route is COMMITTED, not generated like app/works/[paintingId]/.
 *
 * Its rows ship inside data/archive.generated.json, which is checked in, so it is
 * never empty on Vercel — where build-data.mjs exits early because DataModel/ is
 * absent and would never write a generated route file at all. build-data.mjs
 * asserts the seed is non-empty rather than deleting this directory; see the note
 * there before "simplifying" the two routes into the same shape.
 *
 * dynamicParams is declared here in the route file itself because Next 16 rejects
 * a re-exported one.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return allPlaces.map((p) => ({ placeId: p.id }));
}

type Props = { params: Promise<{ placeId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { placeId } = await params;
  const place = getPlace(placeId);
  if (!place) return { title: 'Place not found' };
  return {
    title: place.name,
    description:
      `What the Maurice Sievan archive records about ${place.name}: the works named `
      + 'after it, painted there or shown there, and the exhibitions documented there.',
  };
}

const KIND_LABELS: Record<string, string> = {
  settlement: 'Town or city',
  neighbourhood: 'Neighbourhood',
  region: 'Region',
  landmark: 'Landmark',
  waterway: 'River',
  venue: 'Venue',
  institution: 'Institution',
  country: 'Country',
};

/** Roles in the order a reader wants them: made, named, shown, kept. */
const ROLE_ORDER: PlaceRole[] = ['made_at', 'depicted', 'shown_at', 'held_at'];

export default async function PlacePage({ params }: Props) {
  const { placeId } = await params;
  const place = getPlace(placeId);
  if (!place) notFound();

  const parent = getPlace(place.parent_id);
  const usage = placeUsage(place.id);
  const attestations = attestationsForPlace(place.id);
  const shows = exhibitionsForPlace(place.id);
  const children = childPlaces(place.id);

  // Only where the CV and the archive's own holdings name the same institution.
  const museum = MUSEUM_COLLECTIONS.find((m) => m.placeId === place.id);

  const byRole = new Map<PlaceRole, typeof attestations>();
  for (const row of attestations) {
    if (!byRole.has(row.role)) byRole.set(row.role, []);
    byRole.get(row.role)!.push(row);
  }

  return (
    <div className="record">
      <RecordHeader
        backHref="/places/"
        backLabel="Places"
        eyebrow={parent ? `in ${parent.name}` : (place.region ?? undefined)}
        title={place.name}
      />

      <Facts>
        <Fact label="Kind">{KIND_LABELS[place.kind] ?? place.kind}</Fact>
        <Fact label="Within">
          {parent ? <Link href={`/places/${parent.id}/`}>{parent.name}</Link> : undefined}
        </Fact>
        <Fact label="Region">{place.region}</Fact>
        {/*
          Showing the source's own spellings is how the site declares that it
          normalised something — the reader can see what was changed and by how much.
        */}
        <Fact label="Written in the sources as">
          {place.aliases.length
            ? <span className="verbatim">{place.aliases.join(' · ')}</span>
            : undefined}
        </Fact>
      </Facts>

      {place.notes && <p className={styles.notes}>{place.notes}</p>}

      {/*
        The reason the gazetteer exists. Two independent sources naming the same
        institution is the strongest evidentiary move the archive can make, and it
        happens exactly once — so it gets said out loud rather than implied.
      */}
      {museum && (
        <div className={styles.corroboration}>
          <p className={styles.corroborationHead}>Two sources name this institution</p>
          <p>
            Sievan’s own sheet, and the CV page of the retrospective
            catalogue, which lists <em>“{museum.name}, {museum.location}”</em> among
            the collections holding his work. The dates and independence of these
            two sources have not been established.{' '}
            <Link href="/life/retrospective/">Read the catalogue as scanned</Link>.
          </p>
          <p className={styles.corroborationCaveat}>
            Neither has been checked against the institution’s own records. The
            archive has not seen the painting.
          </p>
        </div>
      )}

      {ROLE_ORDER.filter((role) => byRole.has(role)).map((role) => (
        <Section key={role} title={PLACE_ROLE_LABELS[role]}>
          <RecordList>
            {byRole.get(role)!.map(({ work, certain }) => (
              <li key={work.id}>
                <Link href={`/works/attested/#${work.id}`}>
                  {work.title_stated ?? 'A painting with no title on the sheet'}
                </Link>
                {!certain && (
                  <span className={styles.unsure}> — the sheet is unsure</span>
                )}
                <br />
                <span className={styles.meta}>
                  {[work.dimensions_stated, work.medium_stated, work.price_stated]
                    .filter(Boolean).join(' · ')}
                  {work.dimensions_stated || work.medium_stated || work.price_stated
                    ? ' · ' : ''}
                  recorded on {work.source_id}
                </span>
              </li>
            ))}
          </RecordList>
        </Section>
      ))}

      {shows.length > 0 && (
        <Section title="Exhibitions documented here">
          <RecordList>
            {shows.map((e) => (
              <li key={e.id}>
                <Link href={`/exhibitions/${e.id}/`}>{e.name ?? e.gallery_or_venue}</Link>
                <br />
                <span className={styles.meta}>
                  {e.gallery_or_venue}
                  {e.start_date && ` · ${formatRange(e.start_date, e.end_date)}`}
                </span>
              </li>
            ))}
          </RecordList>
        </Section>
      )}

      {children.length > 0 && (
        <Section title="Places within this one">
          <RecordList>
            {children.map((c) => {
              const u = placeUsage(c.id);
              return (
                <li key={c.id}>
                  <Link href={`/places/${c.id}/`}>{c.name}</Link>
                  <br />
                  <span className={styles.meta}>
                    {u.attestations
                      ? `${u.attestations} work${u.attestations === 1 ? '' : 's'} recorded`
                      : 'nothing recorded directly'}
                    {u.exhibitions
                      ? ` · ${u.exhibitions} exhibition${u.exhibitions === 1 ? '' : 's'}`
                      : ''}
                  </span>
                </li>
              );
            })}
          </RecordList>
        </Section>
      )}

      <p className={styles.footer}>
        {usage.attestations > 0 && (
          <>
            Every work listed here is <Link href="/works/attested/">attested, not
            catalogued</Link>: the archive holds the sheet Sievan wrote, not the
            painting.{' '}
          </>
        )}
        <Link href="/places/">All {allPlaces.length} places</Link>.
      </p>
    </div>
  );
}
