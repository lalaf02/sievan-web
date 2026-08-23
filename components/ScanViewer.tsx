import type { ScanFile } from '@/lib/types';
import { Absent } from './Record';
import styles from './ScanViewer.module.css';

/** Scans live in MS-CS-001/ and are copied into public/scans/ at build time. */
const SCAN_BASE = '/scans';

/** Anything above this is linked rather than embedded — MSAR00026 is 28 MB. */
const INLINE_LIMIT_BYTES = 8 * 1024 * 1024;

export interface ScanInfo extends ScanFile {
  sizeBytes: number | null;
  pageCount: number | null;
}

const isImage = (name: string) => /\.(jpe?g|png|gif|webp)$/i.test(name);
const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

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
        const heavy = scan.sizeBytes !== null && scan.sizeBytes > INLINE_LIMIT_BYTES;
        const label = scan.part_label
          ? `Part ${scan.part_label}`
          : scans.length > 1
            ? `Sheet ${i + 1}`
            : null;

        return (
          <figure key={scan.filename} className={styles.figure}>
            {/* MS-AR-00003 is photocopied across two sheets, I and II. */}
            {label && <figcaption className={styles.partLabel}>{label}</figcaption>}

            {heavy ? (
              // Never inline a 28 MB, 15-page book — state the cost and link out.
              <a className={styles.heavy} href={src}>
                <strong>Open the scan</strong>
                <span>
                  PDF
                  {scan.pageCount ? `, ${scan.pageCount} pages` : ''}
                  {scan.sizeBytes ? `, ${mb(scan.sizeBytes)}` : ''} — large file
                </span>
              </a>
            ) : isImage(scan.filename) ? (
              // MSAR00025 is the one JPG among the PDFs.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className={styles.image}
                src={src}
                alt={
                  label
                    ? `${label} of archival document ${objectId}`
                    : scans.length > 1
                      ? `Page ${i + 1} of ${scans.length} from archival document ${objectId}`
                      : `Scan of archival document ${objectId}`
                }
                loading="lazy"
              />
            ) : (
              <object className={styles.pdf} data={src} type="application/pdf">
                <div className={styles.fallback}>
                  <a href={src}>Open the scan (PDF{scan.sizeBytes ? `, ${mb(scan.sizeBytes)}` : ''})</a>
                </div>
              </object>
            )}

            <figcaption className={styles.caption}>
              <a href={src}>{scan.filename}</a>
              {scan.pageCount ? ` · ${scan.pageCount} page${scan.pageCount === 1 ? '' : 's'}` : ''}
              {scan.sizeBytes ? ` · ${mb(scan.sizeBytes)}` : ''}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
