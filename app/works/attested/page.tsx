import type { Metadata } from 'next';
import Link from 'next/link';
import {
  allAttestedWorks, attestationsForObject, counts, coverFor, objectLead,
  objectsWithAttestations,
} from '@/lib/data';
import { AttestedWorkList, type AttestedGroup } from '@/components/AttestedWorkList';
import { ImageSource } from '@/components/ImageSource';
import styles from './attested.module.css';

export const metadata: Metadata = {
  title: 'Works Sievan recorded',
  description:
    'Fifty-seven paintings named in Sievan’s own hand on his own sheets — title, '
    + 'size, medium, price and sometimes the buyer. Attested by a source, not '
    + 'catalogued: the archive holds the sheets, not the paintings.',
};

export default function AttestedWorksPage() {
  const groups: AttestedGroup[] = objectsWithAttestations().map((object) => ({
    object,
    cover: coverFor(object.id),
    lead: objectLead(object),
    works: attestationsForObject(object.id),
  }));

  const withPlaces = allAttestedWorks.filter((w) => w.place_refs.length > 0).length;
  const sold = allAttestedWorks.filter((w) => w.dispositions.length > 0).length;

  return (
    <div className="page">
      <header className="measure" style={{ marginBottom: 'var(--s-6)' }}>
        <p className="eyebrow">
          <Link href="/works/">Catalogue Raisonné</Link> · attested, not catalogued
        </p>
        <h1>Works Sievan recorded</h1>

        {/*
          The load-bearing paragraph on this page, and the one thing no automated
          gate can check. It says what the list is NOT before it says what it is,
          because the failure mode is a reader leaving with "the catalogue has
          about fifty works in it".
        */}
        <div className={styles.disclaimer}>
          <p>
            <strong>What this list is not.</strong> It is not the catalogue raisonné,
            and none of these is a catalogue entry. Nobody has seen these paintings.
            No one has photographed one, measured one, or established where it is.
            What survives is Sievan alone at a table, drawing a canvas he had finished
            and writing beside it what he called it and what he wanted for it. A
            drawing records that a painting existed and what the artist called it on
            the day he drew it — not that the title stuck, not that the sale went
            through, and not that the work survives.
          </p>
          <p>
            Every entry below shows the words it rests on and links to the sheet they
            are written on, so you can check it against the scan. Where a size is
            given it is Sievan’s own notation:{' '}
            <strong>which figure is the height is not recorded</strong>, so the archive
            does not say. He wrote himself a reminder on one sheet —{' '}
            <em>“measure Hight first”</em> — which is a note about one sheet, not a
            convention proved across the box.
          </p>
        </div>
      </header>

      <section className={styles.summary}>
        <h2 className="srOnly">What the sheets record</h2>
        <dl className={styles.figures}>
          <div>
            <dt>Paintings named</dt>
            <dd className="tnum">{counts.attestedWorks}</dd>
          </div>
          <div>
            <dt>Sheets they are named on</dt>
            <dd className="tnum">{counts.sheetsCarryingAttestations}</dd>
          </div>
          <div>
            <dt>With a size written down</dt>
            <dd className="tnum">{counts.attestedWorksWithDimensions}</dd>
          </div>
          <div>
            <dt>With a price</dt>
            <dd className="tnum">{counts.attestedWorksWithPrice}</dd>
          </div>
          <div>
            <dt>With a year</dt>
            <dd className="tnum">{counts.attestedWorksDated}</dd>
          </div>
          <div>
            <dt>Placed somewhere</dt>
            <dd className="tnum">{withPlaces}</dd>
          </div>
        </dl>
        <p className={styles.figuresNote}>
          {sold} of the {counts.attestedWorks} carry a note about what became of the
          painting — sold, consigned, offered, returned or given. Those notes name
          collectors and dealers the archive has no other record of, and the places
          they went are gathered in the{' '}
          <Link href="/places/">gazetteer</Link>. The catalogue of paintings itself is
          still empty, though the {counts.worksOnPaperCatalogued} works on paper are
          catalogued and photographed:{' '}
          <Link href="/works/">see what is and is not in it</Link>.
        </p>
        {/* The sheets these are quoted from are the estate's own photographs. */}
        <ImageSource />
      </section>

      <AttestedWorkList groups={groups} />
    </div>
  );
}
