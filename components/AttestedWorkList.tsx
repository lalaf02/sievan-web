/**
 * The ledger of paintings box 2 names but the archive does not hold.
 *
 * A server component on purpose. Fifty-seven rows need no filter rail — the
 * browser's own find-in-page beats anything built here at that size — and rendering
 * on the server satisfies "everything must read without JavaScript" by construction
 * rather than by care. It also means zero client bundle for the page that carries
 * the most text on the site.
 *
 * Grouped by source sheet, because the sheet is the physical unit: one scan serves
 * the six paintings itemised on it, and a reader checking a claim wants the sheet.
 *
 * Every row shows the words it rests on. That is the whole design — see
 * scripts/check-quotes.mjs, which fails the build if a quote is not in its source.
 */
import Link from 'next/link';
import type { AttestedWork, ArchiveObject, ScanPage } from '@/lib/types';
import {
  DISPOSITION_LABELS, PLACE_ROLE_LABELS, getPainting, getPlace, sameTitleElsewhere,
} from '@/lib/data';
import { Facts, Fact } from '@/components/Record';
import { SheetTile, AbsentTile } from '@/components/MediaTile';
import styles from './AttestedWorkList.module.css';

export interface AttestedGroup {
  object: ArchiveObject;
  cover: ScanPage | undefined;
  lead: string;
  works: AttestedWork[];
}

/** "circa 1946 - 47", plus the doubt the source itself carried. */
function dateLine(w: AttestedWork) {
  if (!w.date_text && w.date_earliest == null) return null;
  const text = w.date_text ?? String(w.date_earliest);
  return (
    <>
      <span className="tnum">{text}</span>
      {w.date_basis === 'inferred' && (
        <span className={styles.qualifier}> · inferred, not stated on the sheet</span>
      )}
    </>
  );
}

function dispositionLine(w: AttestedWork) {
  if (!w.dispositions.length) return null;
  const words = w.dispositions.map((d) => DISPOSITION_LABELS[d] ?? d).join(', ');
  return w.counterparty_raw
    ? <>{words} — <span className={styles.party}>{w.counterparty_raw}</span></>
    : <>{words}</>;
}

function placeLine(w: AttestedWork) {
  if (!w.place_refs.length) return null;
  return (
    <ul className={styles.places}>
      {w.place_refs.map((ref) => {
        const place = getPlace(ref.place_id);
        if (!place) return null;
        return (
          <li key={`${ref.place_id}-${ref.role}`}>
            <Link href={`/places/${place.id}/`}>{place.name}</Link>
            <span className={styles.qualifier}>
              {' '}· {PLACE_ROLE_LABELS[ref.role].toLowerCase()}
              {ref.certain === false && ' (the sheet is unsure)'}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function AttestedWorkList({ groups }: { groups: AttestedGroup[] }) {
  return (
    <ol className={styles.sheets}>
      {groups.map(({ object, cover, lead, works }) => {
        const href = `/archive/objects/${object.id}/`;
        return (
          <li key={object.id} className={styles.sheet} id={object.id}>
            <div className={styles.sheetMedia}>
              {cover
                ? (
                  <SheetTile
                    sheet={cover}
                    href={href}
                    aspect="4 / 3"
                    alt={`${lead} — ${object.id}`}
                  />
                )
                : <AbsentTile title="Not scanned" aspect="4 / 3" />}
              <p className={styles.sheetMeta}>
                <Link href={href}>{object.id}</Link>
                {' · '}
                {works.length} painting{works.length === 1 ? '' : 's'} named
              </p>
            </div>

            <ol className={styles.works}>
              {works.map((w) => {
                const others = sameTitleElsewhere(w);
                return (
                  <li key={w.id} id={w.id} className={styles.work}>
                    <h3 className={styles.workTitle}>
                      {w.title_stated
                        ? w.title_stated
                        : <span className={styles.untitled}>No title on the sheet</span>}
                      {w.artist_number && (
                        <span className={styles.artistNo} title="Sievan's own inventory number">
                          {w.artist_number}
                        </span>
                      )}
                    </h3>

                    <Facts>
                      <Fact label="Size as written">
                        {w.dimensions_stated
                          ? <span className="tnum">{w.dimensions_stated}</span>
                          : undefined}
                      </Fact>
                      <Fact label="Medium as written">{w.medium_stated}</Fact>
                      <Fact label="Date">{dateLine(w)}</Fact>
                      <Fact label="Price asked">{w.price_stated}</Fact>
                      <Fact label="What happened">{dispositionLine(w)}</Fact>
                      <Fact label="Places">{placeLine(w)}</Fact>
                    </Facts>

                    {/*
                      Mono, via the site-wide .verbatim class: on every record page
                      that means "the source's words, not ours". Reusing it here
                      costs nothing and is the cheapest honesty affordance available.
                    */}
                    <blockquote className={`verbatim ${styles.quote}`}>{w.quote}</blockquote>
                    <p className={styles.provenance}>
                      {w.sheet_position && <>{w.sheet_position} — </>}
                      in Sievan’s hand on <Link href={href}>{w.source_id}</Link>
                    </p>

                    {/*
                      The bridge, when a curator has matched this sheet to a
                      photographed canvas. It does NOT merge the two: the attestation
                      stays here as the evidence for the entry, and says what made
                      the match so the match can be argued with.
                    */}
                    {(() => {
                      const painting = w.painting_id ? getPainting(w.painting_id) : undefined;
                      if (!painting) return null;
                      return (
                        <p className={styles.matched}>
                          Catalogued as{' '}
                          <Link href={`/works/${painting.id}/`}>
                            {painting.title ?? painting.id}
                          </Link>
                          {w.identification_basis && (
                            <span className={styles.qualifier}>
                              {' '}· matched on{' '}
                              {w.identification_basis.replace(/_/g, ' ')}
                            </span>
                          )}
                        </p>
                      );
                    })()}

                    {w.notes && <p className={styles.note}>{w.notes}</p>}

                    {others.length > 0 && (
                      <p className={styles.collision}>
                        The same title appears on{' '}
                        {others.map((o, i) => (
                          <span key={o.id}>
                            {i > 0 && ', '}
                            <Link href={`#${o.id}`}>{o.source_id}</Link>
                          </span>
                        ))}
                        . Whether that is one painting, two, or a series is not
                        recorded, and the archive does not merge them.
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          </li>
        );
      })}
    </ol>
  );
}
