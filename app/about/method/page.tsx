import type { Metadata } from 'next';
import Link from 'next/link';
import { allArticles, allObjects, counts } from '@/lib/data';

export const metadata: Metadata = {
  title: 'How this archive was made',
  description:
    'The sources behind the Sievan archive, how the clippings were read, what is ' +
    'uncertain, and what is still missing.',
};

export default function MethodPage() {
  const confidence = { high: 0, medium: 0, low: 0 } as Record<string, number>;
  const reviewed = { unreviewed: 0, needs_review: 0, reviewed_confirmed: 0, reviewed_corrected: 0 } as Record<string, number>;
  for (const a of allArticles) {
    confidence[a.parse_confidence]++;
    reviewed[a.review_status]++;
  }
  const noHeadline = allArticles.filter((a) => !a.headline).length;
  const noByline = allArticles.filter((a) => !a.author_raw).length;
  const initials = allArticles.filter((a) => a.author_raw && !a.author_person_id).length;
  const undigitised = allObjects.filter((o) => o.scan_files.length === 0).length;
  const stated = allObjects.filter((o) => o.stated_item_count).length;
  const worksOnPaper = allObjects.filter((o) => o.object_type === 'work_on_paper').length;

  return (
    /*
      A prose page, so the container is the measure rather than the full page width.
      It used to be a 1180px container wrapping a 68ch column, which left the widest
      unused gutter on the site for the whole length of the page.
    */
    <div className="record" style={{ paddingTop: 'var(--s-6)' }}>
      <div>
        <p className="eyebrow">About</p>
        <h1>How this archive was made</h1>
        <p>
          Everything here comes from two boxes of paper and one folder of videotape. This
          page describes what was in them, how the contents were read, and — as
          importantly — what is uncertain or absent.
        </p>

        <h2>What is in the boxes</h2>
        <p>
          The first box is labelled <em>“Reprints of Reviews — Exhibition Catalogs &amp;
          Review Copies”</em>. The second is a small archival box of{' '}
          <em>“Drawings and Sketches for Paintings Various Years”</em>. Between them they
          hold {counts.archiveObjects} catalogued objects: bundles of
          photocopied clippings, exhibition catalogues, posters, two books, assorted
          promotional material, and {worksOnPaper} drawings in Sievan’s own hand. From
          these come {counts.newsArticles} individual press notices published between
          1940 and 1983 across {counts.publications} publications, and{' '}
          {counts.exhibitions} exhibitions documented by a surviving catalogue or poster.
        </p>
        <p>
          Separately, the estate holds {counts.videoAssets} videotapes:{' '}
          {counts.transcribedInterviews} transcribed interviews totalling{' '}
          {counts.transcriptWords.toLocaleString()} words, an unidentified interview, and
          a reel of Sievan painting in his studio.
        </p>

        <h2>How the clippings were read</h2>
        <p>
          Most objects in the first box are not single clippings but sheets with several
          photocopied together — one holds six. The catalogue sheet describes each of them
          in a single free-text cell, written by hand over many years, with no consistent
          order and frequently missing fields. A short heuristic splits those cells into
          individual records: take the trailing date, treat the first comma segment as
          the publication, and decide whether what remains is a headline, a byline, or
          both.
        </p>
        <p>
          It is a reading, not a transcription, so every record carries a confidence
          grade and keeps the original manifest line verbatim. On any{' '}
          <Link href="/archive/press/">press record</Link> you can see the source text
          under <em>“As catalogued”</em> and judge the parse yourself.
        </p>

        <table style={{ borderCollapse: 'collapse', width: '100%', margin: 'var(--s-4) 0 var(--s-5)' }}>
          <tbody>
            {[
              ['Parsed with high confidence', confidence.high],
              ['Parsed with medium confidence', confidence.medium],
              ['Parsed with low confidence', confidence.low],
              ['Corrected by hand after review', reviewed.reviewed_corrected],
              ['Still flagged for review', reviewed.needs_review],
            ].map(([label, n]) => (
              <tr key={label as string}>
                <td style={{ padding: '0.3em 0', borderBottom: '1px solid var(--rule)' }}>{label}</td>
                <td className="tnum" style={{ textAlign: 'right', borderBottom: '1px solid var(--rule)' }}>
                  {n as number}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p>
          One check is worth stating: {stated} of the manifest entries announce their own
          contents (<em>“Photocopy of four newspaper clippings”</em>). All {stated} match
          the number of records extracted. Nothing was dropped or duplicated.
        </p>

        <h2>What we don’t know</h2>
        <ul>
          <li>
            <strong>{undigitised} of {counts.archiveObjects} objects are not
            scanned</strong> — the last twenty rows of box 1, which being consecutive
            suggests a batch that was never photographed rather than material that is
            lost, and one folder in box 2 the curator withdrew from use and recorded as
            deliberately unscanned.
          </li>
          <li>
            <strong>The scans have no text layer.</strong> Search here covers the
            catalogue records, never the text of the clippings themselves. Reading the
            clippings requires opening the scans.
          </li>
          <li>
            <strong>{noHeadline} notices have no recorded headline and {noByline} no
            byline at all.</strong> A further {initials} are signed only with initials —{' '}
            <em>P.B.R.</em>, <em>J.W.L.</em>, <em>G.B.</em> Those are left unattributed
            rather than guessed at; each is a research lead.
          </li>
          <li>
            <strong>None of the recordings carry a date</strong>, which is why the
            interviews cannot be placed on the{' '}
            <Link href="/life/#chronology">chronology</Link>.
          </li>
          <li>
            <strong>One interviewee is unidentified</strong> — named only “Greenberg” by a
            filename, and untranscribed.
          </li>
          <li>
            <strong>Two attributions are doubtful and kept as written.</strong> A 1979
            byline reads <em>John Ruskin</em>, though the Victorian critic died in 1900;
            another is spelled <em>Sam Fienstien</em>, probably the critic Sam Feinstein.
            Where a correction cannot be verified it belongs in a note, not in the data.
          </li>
        </ul>

        <h2>What comes next</h2>
        <p>
          The paintings themselves. They are being photographed and catalogued now, and
          the data model behind this site is already built to receive them — every work
          linked to the shows it hung in, to the notices written about it, and to the
          events around it.
        </p>
        <p>
          The layer after that is commentary: not simply <em>which</em> critic mentioned
          a painting, but what they claimed, whether other voices corroborated or
          contradicted them, and whether a remark concerns one canvas, a whole show, or
          the man himself. The distinction matters — much of what survives here is about
          Sievan rather than about any particular picture, and flattening the two would
          misrepresent the record. The structure exists and is empty; it is a research
          programme, not an oversight.
        </p>
      </div>
    </div>
  );
}
