import type { Metadata } from 'next';
import Link from 'next/link';
import {
  allArticles, allObjects, allScholarship, counts,
  getPerson, getPublication,
} from '@/lib/data';
import { citeArticle, citeArchive, SITE_TITLE } from '@/lib/citation';
import { CONTACT, mailtoHref } from '@/lib/contact';
import { Pending } from '@/components/Pending';
import { NoTextLayer } from '@/components/NoTextLayer';
import styles from './research.module.css';

export const metadata: Metadata = {
  title: 'Research',
  description:
    'Using the Maurice Sievan archive: access and reproduction, rights, how to cite, '
    + 'and the bibliography of primary and secondary sources.',
};

export default function ResearchPage() {
  const undigitised = allObjects.filter((o) => o.scan_files.length === 0).length;

  const primary = allArticles
    .map((a) => ({
      article: a,
      ...citeArticle(a, getPublication(a.publication_id), getPerson(a.author_person_id)),
    }))
    .sort((a, b) =>
      (a.article.date_normalized ?? '').localeCompare(b.article.date_normalized ?? ''));

  const incompleteCount = primary.filter((p) => p.incomplete).length;

  return (
    <div className="page">
      <header className="measure" style={{ marginBottom: 'var(--s-6)' }}>
        <h1>Research</h1>
        <p className={styles.lede}>
          This archive exists to be used and checked. Everything below is the apparatus:
          how to get at the originals, what you may do with them, how to cite what you
          find, and the full bibliography of what has been written.
        </p>
      </header>

      <div className={styles.columns}>
        <div className={styles.main}>

          {/* --------------------------------------------------------- access */}
          <section id="access" className={styles.section}>
            <h2>Using this archive</h2>
            <p>
              The whole catalogue is public and needs no account. {counts.archiveObjects}{' '}
              objects are catalogued and {counts.archiveObjects - undigitised} are scanned
              and readable here; the remaining {undigitised} are catalogued but not yet
              digitised, and are listed with everything known about them.
            </p>
            <NoTextLayer size="body">If you need the text of a notice, you must read the scan.</NoTextLayer>
            <p>
              The five transcribed interviews are published in full. The video masters —
              roughly 25 GB — are not served here; short silent excerpts appear on the{' '}
              <Link href="/">front page</Link>. The same goes for the {undigitised} objects
              that have not been scanned. Both can be asked for:{' '}
              <a href={mailtoHref('Sievan archive: access request')}>{CONTACT.email}</a>.
            </p>
            <p>
              <Link href="/archive/search/">Search everything</Link> ·{' '}
              <Link href="/archive/">Browse the archive</Link> ·{' '}
              <Link href="/about/method/">How this archive was made</Link>
            </p>
          </section>

          {/* ------------------------------------------------ where to start */}
          <section id="start" className={styles.section}>
            <h2>Where to start</h2>
            <p>
              The site divides by what you are asking of it, and the divisions are worth
              knowing before you begin, because the same object can appear in two of them
              under two framings.
            </p>
            <dl className={styles.guide}>
              <dt><Link href="/life/">Life and Work</Link></dt>
              <dd>
                The man and the reception: a biography, the chronology of everything the
                archive can date, the exhibition record set against Sievan’s own CV, and
                the five filmed witnesses. Start here for context and for testimony.
              </dd>

              <dt><Link href="/works/">Catalogue Raisonné</Link></dt>
              <dd>
                The art. Two ways in: the five periods of the career, for reading through
                the work; and <Link href="/works/search/">Find a work</Link>, a filter
                over every artwork record the archive holds evidence of, for locating a
                particular one. Note what the catalogue is not — no finished painting has
                yet been photographed, measured and located, and the page says so.
              </dd>

              <dt><Link href="/archive/">Archives</Link></dt>
              <dd>
                The documentary record: the {counts.newsArticles} notices, the catalogues
                and posters they were cut from, and the{' '}
                {counts.publications} publications that carried them. Filter by kind,
                decade, exhibition, or by whether an object has been scanned.
              </dd>

              <dt><Link href="/archive/search/">Everything at once</Link></dt>
              <dd>
                One search across all nine kinds of record, including the full text of the
                transcribed interviews.
              </dd>
            </dl>
            <p>
              <strong>Read the gaps as evidence.</strong> This archive states what it does
              not know rather than closing over it: an undated work, an unattributed
              byline, a heuristic link between a notice and a show. Wherever a connection
              was inferred rather than recorded, the page shows the working. Nothing on
              the site is invented to fill a hole —{' '}
              <Link href="/about/method/">how the archive was made</Link> sets out how the
              material was read and where the judgement calls were.
            </p>
          </section>

          {/* --------------------------------------------------------- rights */}
          <section id="rights" className={styles.section}>
            <h2>Reproduction and rights</h2>
            <p>
              The catalogue records — descriptions, dates, attributions, the structure of
              the archive — are the work of this project and may be quoted freely with
              attribution.
            </p>
            <p>
              The scanned clippings and catalogues are a different matter. Copyright in a
              newspaper review belongs to its publisher or author, not to the estate or to
              this archive; the scans are published here as an archival record. Anyone
              republishing a notice needs to clear it with the rights holder. The archive
              can tell you what it knows about provenance, which is often the hard part.
            </p>
            <p>
              Images of the paintings, and permission to reproduce them, come from the
              estate. To request permission to reproduce images or archive materials,
              write to <a href={mailtoHref('Reproduction request')}>{CONTACT.email}</a>{' '}
              and include:
            </p>
            <ul className={styles.requestList}>
              {CONTACT.reproductionRequirements.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </section>

          {/* ----------------------------------------------------------- cite */}
          <section id="citation" className={styles.section}>
            <h2>How to cite</h2>
            <p>The archive as a whole:</p>
            <p className={styles.cite}>{citeArchive()}</p>
            <p>A single record — use the record’s own identifier, which is stable:</p>
            <p className={styles.cite}>
              {primary[0]?.text ?? `${SITE_TITLE}, MS-AR-00001-A.`}
            </p>
            <p>
              Record identifiers (<code>MS-AR-00001</code>, <code>MS-VI-00003</code>) are
              permanent and will not be reassigned. URLs follow from them, so a link is a
              citation.
            </p>
          </section>

          {/* ------------------------------------------------ beyond the site */}
          <section id="contact" className={styles.section}>
            <h2>When the site is not enough</h2>
            <p>
              Three things the archive holds are not published here, and all three can be
              asked for. The video masters — roughly 25 GB across seven tapes — are not
              served from this site. The {undigitised} objects that have not been scanned
              exist as physical sheets. And the originals themselves are held by the
              estate, which is also this material’s restorer.
            </p>
            <p>
              The estate answers enquiries from researchers, students, curators and anyone
              who holds or has seen a Sievan. Two questions it particularly wants asked:
              whether you know the whereabouts of a painting, and whether you know of any
              scholarly writing on Sievan — the secondary literature below is empty, and
              that is a gap rather than a verdict.
            </p>
            <address className={styles.contactBlock}>
              <span className={styles.contactOrg}>{CONTACT.organisation}</span>
              <a href={mailtoHref('Sievan archive enquiry')}>{CONTACT.email}</a>
              <a href={`tel:${CONTACT.phoneHref}`}>{CONTACT.phone}</a>
              {CONTACT.address.map((line) => <span key={line}>{line}</span>)}
            </address>
          </section>

          {/* --------------------------------------------------- bibliography */}
          <section id="secondary" className={styles.section}>
            <h2>Secondary literature</h2>
            {allScholarship.length > 0 ? (
              <ol className={styles.bib}>
                {allScholarship.map((s) => (
                  <li key={s.id}>
                    {s.url ? <a href={s.url}>{s.citation}</a> : s.citation}
                    {s.notes && <span className={styles.bibNote}>{s.notes}</span>}
                  </li>
                ))}
              </ol>
            ) : (
              <Pending
                eyebrow="Nothing listed yet"
                title="No scholarship on Sievan has been entered into this archive."
                fields={[
                  { name: 'Citation', note: 'The full reference, as it should appear in a footnote.' },
                  { name: 'Kind', note: 'Book, chapter, journal article, thesis, catalogue essay, review.' },
                  { name: 'Year', note: 'Of publication.' },
                  { name: 'Link', note: 'A DOI or URL where the piece can be read.' },
                ]}
              >
                <p>
                  That is not the same as saying none exists. Sievan was reviewed by Dore
                  Ashton, Hilton Kramer and Emily Genauer in his lifetime — the notices are
                  listed below as primary sources — but no later scholarly treatment has
                  been gathered here.
                </p>
                <p>
                  If you know of a thesis, catalogue essay or article about Sievan or his
                  circle, it belongs in this list. Send it to{' '}
                  <a href={mailtoHref('Sievan bibliography: a reference')}>{CONTACT.email}</a>.
                </p>
              </Pending>
            )}
          </section>

          <section id="primary" className={styles.section}>
            <h2>Primary sources</h2>
            <p>
              The {counts.newsArticles} contemporaneous notices held in the archive,
              formatted as references and ordered by date. {incompleteCount} of them are
              incomplete — the clipping was cut without its headline or byline, and the
              gap is shown rather than guessed at.
            </p>
            <ol className={styles.bib}>
              {primary.map(({ article, text, incomplete }) => (
                <li key={article.id} className={incomplete ? styles.bibIncomplete : undefined}>
                  <Link href={`/archive/press/${article.id}/`}>{text}</Link>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* ---------------------------------------------------------- sidebar */}
        <aside className={styles.aside}>
          <nav className={styles.toc} aria-label="On this page">
            <p className={styles.tocLabel}>On this page</p>
            <ul>
              <li><a href="#access">Using this archive</a></li>
              <li><a href="#start">Where to start</a></li>
              <li><a href="#rights">Reproduction and rights</a></li>
              <li><a href="#citation">How to cite</a></li>
              <li><a href="#contact">When the site is not enough</a></li>
              <li><a href="#secondary">Secondary literature</a></li>
              <li><a href="#primary">Primary sources</a></li>
            </ul>
          </nav>

          <div className={styles.contact}>
            <p className={styles.tocLabel}>Enquiries</p>
            <address className={styles.address}>
              <span className={styles.contactOrg}>{CONTACT.organisation}</span>
              <a href={mailtoHref('Sievan archive enquiry')}>{CONTACT.email}</a>
              <a href={`tel:${CONTACT.phoneHref}`}>{CONTACT.phone}</a>
              {CONTACT.address.map((line) => <span key={line}>{line}</span>)}
            </address>
          </div>
        </aside>
      </div>
    </div>
  );
}
