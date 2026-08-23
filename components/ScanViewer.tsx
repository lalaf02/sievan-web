import type { ScanFile } from '@/lib/types';
import { Absent } from './Record';
import styles from './ScanViewer.module.css';

/** The original PDFs, copied into public/scans/ at build time. Kept downloadable. */
const SCAN_BASE = '/scans';

export interface ScanInfo extends ScanFile {
  sizeBytes: number | null;
  pageCount: number | null;
}

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/**
 * The sheets of a catalogued object.
 *
 * This used to embed the PDF in an <object> and, above 8 MB, show nothing at all but
 * a link reading "Open the scan" — so the archive's most visual material, the
 * catalogues and posters, appeared as an empty beige box. It now renders the page
 * images produced by scripts/extract-scans.mjs, and the PDF stays as a download
 * beside them: the image is what you read, the PDF is the archival object.
 */
export function ScanViewer({ scans, objectId }: { scans: ScanInfo[]; objectId: string }) {
  if (scans.length === 0) {
    // A stated gap, not a broken frame. These are exactly objects 31–50.
    return (
      <Absent title="Not yet digitised">
        This item is catalogued in the archive manifest but has no scan on file. The
        record below is transcribed from the manifest.
      </Absent>
    );
  }

  return (
    <div className={styles.wrap}>
      {scans.map((scan, i) => {
        const src = `${SCAN_BASE}/${scan.filename}`;
        const pages = scan.pages ?? [];
        // MS-AR-00003 is photocopied across two sheets, I and II.
        const label = scan.part_label
          ? `Part ${scan.part_label}`
          : scans.length > 1
            ? `Sheet ${i + 1}`
            : null;

        return (
          <figure key={scan.filename} className={styles.figure}>
            {label && <figcaption className={styles.partLabel}>{label}</figcaption>}

            {pages.length > 0 ? (
              <div className={styles.sheets}>
                {pages.map((pg, n) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={pg.page}
                    className={styles.sheet}
                    src={pg.page}
                    alt={
                      pages.length > 1
                        ? `Page ${n + 1} of ${pages.length} of archival document ${objectId}`
                        : `Scan of archival document ${objectId}`
                    }
                    loading={n === 0 ? undefined : 'lazy'}
                  />
                ))}
              </div>
            ) : (
              // Only reachable if extract-scans has not been run for this file.
              <a className={styles.heavy} href={src}>
                <strong>Open the scan</strong>
                <span>
                  PDF
                  {scan.pageCount ? `, ${scan.pageCount} pages` : ''}
                  {scan.sizeBytes ? `, ${mb(scan.sizeBytes)}` : ''}
                </span>
              </a>
            )}

            <figcaption className={styles.caption}>
              <a href={src}>{scan.filename}</a>
              {scan.pageCount ? ` · ${scan.pageCount} page${scan.pageCount === 1 ? '' : 's'}` : ''}
              {scan.sizeBytes ? ` · ${mb(scan.sizeBytes)}` : ''}
              {' · the original, as scanned'}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
