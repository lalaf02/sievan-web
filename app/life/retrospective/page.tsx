import type { Metadata } from 'next';
import Link from 'next/link';
import { CV, RETROSPECTIVE_PAGES } from '@/lib/retrospective';
import { CatalogueSource } from '@/components/CatalogueSource';
import styles from './retrospective.module.css';

export const metadata: Metadata = {
  title: 'The retrospective catalogue',
  description:
    'MS-AR-00026: a fifteen-page illustrated retrospective of Maurice Sievan’s career, ' +
    'with a full exhibition history and list of collections.',
};

function CVList({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <section className={styles.cvSection}>
      <h3 className={styles.cvTitle}>{title}</h3>
      <dl className={styles.cvList}>
        {rows.map(([name, years]) => (
          <div key={name + years} className={styles.cvRow}>
            <dt>{name}</dt>
            <dd className="tnum">{years}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function RetrospectivePage() {
  const described = RETROSPECTIVE_PAGES.filter((p) => p.text || p.caption);

  return (
    <div className="page">
      <header className="measure" style={{ marginBottom: 'var(--s-6)' }}>
        <p className="eyebrow">Life and Work · MS-AR-00026</p>
        <h1>The retrospective catalogue</h1>
        <p className="muted">
          A fifteen-page typescript held in the archive box: a signed cover, an illustrated
          account of Sievan’s career in five periods, and a full list of exhibitions,
          collections and awards. It is the single richest document in the archive: thirteen
          of its plates are reproductions of paintings, and they are read as works in the{' '}
          <Link href="/works/">Catalogue Raisonné</Link>. This page publishes the document
          itself, page by page, as the archive holds it.
        </p>
        <p className="muted">
          It is a working draft rather than a published book. One page carries a pasted
          note reading <em>“This page is way off color. Being corrected in expanded typeset
          brochure in January.”</em> The plates are photographs of paintings reproduced on a
          photocopier, so the colour is unreliable throughout.
        </p>
        <p className="ui muted">
          <Link href="/archive/objects/MS-AR-00026/">See the archive record</Link>
        </p>
      </header>

      <h2>The account of his career</h2>
      {described.filter((p) => p.text).map((p) => (
        <section key={p.page} className={styles.spread} id={`page-${p.page}`}>
          <figure className={styles.figure}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image} alt={`Retrospective catalogue, page ${p.page}`} loading="lazy" />
            <figcaption className={styles.pageNo}>Page {p.page}</figcaption>
          </figure>
          <div className={styles.text}>
            <h3 className={styles.heading}>{p.heading}</h3>
            {p.text?.map((para, i) => <p key={i}>{para}</p>)}
            {p.plateYears.length > 0 && (
              <p className={styles.plates}>
                Plates dated {p.plateYears.join(', ')}
              </p>
            )}
            {p.caption && <p className={styles.caption}>{p.caption}</p>}
          </div>
        </section>
      ))}

      <h2 style={{ marginTop: 'var(--s-8)' }}>Exhibitions, collections and awards</h2>
      <p className="measure muted">
        Transcribed from page 8. This is Sievan’s own listing and is far fuller than the{' '}
        <Link href="/exhibitions/">fifteen exhibitions</Link> the archive box can document
        with a surviving catalogue. It is reproduced here as a transcription of that page,
        not merged into the exhibition records, because it has not been independently
        verified.
      </p>

      <div className={styles.cvGrid}>
        <CVList title="One-man exhibitions" rows={CV.oneManExhibitions} />
        <CVList title="Group exhibitions" rows={CV.groupExhibitions} />

        <section className={styles.cvSection}>
          <h3 className={styles.cvTitle}>Museum collections</h3>
          <ul className={styles.plain}>
            {CV.museumCollections.map((c) => <li key={c}>{c}</li>)}
          </ul>
        </section>

        <section className={styles.cvSection}>
          <h3 className={styles.cvTitle}>Private collections</h3>
          <ul className={styles.plain}>
            {CV.privateCollections.map((c) => (
              <li key={c}>
                {/* The dealer who also gave an interview to this archive. */}
                {c === 'Ivan Karp'
                  ? <Link href="/people/ivan-karp/">Ivan Karp</Link>
                  : c}
              </li>
            ))}
          </ul>
        </section>

        <CVList title="Awards" rows={CV.awards} />

        <section className={styles.cvSection}>
          <h3 className={styles.cvTitle}>Studies</h3>
          <p>{CV.studies}</p>
        </section>
      </div>

      <h2 style={{ marginTop: 'var(--s-8)' }}>Every page</h2>
      <p className="measure muted">
        The catalogue in full. Pages without a transcription above are published as scans
        only.
      </p>
      <ul className={styles.contact}>
        {RETROSPECTIVE_PAGES.map((p) => (
          <li key={p.page}>
            {/*
              Each thumbnail used to be a bare link to the raw JPG, which navigated the
              reader out of the archive and left them on a bitmap with no way back.
            */}
            <CatalogueSource page={p}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt={`Page ${p.page}`} loading="lazy" />
              <span className={styles.contactNo}>{p.page}</span>
            </CatalogueSource>
          </li>
        ))}
      </ul>
    </div>
  );
}
