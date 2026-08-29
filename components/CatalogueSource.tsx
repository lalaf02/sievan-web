'use client';

import { useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import type { RetrospectivePage } from '@/lib/retrospective';
import styles from './CatalogueSource.module.css';

/**
 * A quotation from the retrospective typescript, which opens the page it is printed on.
 *
 * The site used to head this material "What the catalogue says" and print its prose
 * underneath, which made a single undated working draft the narrating voice of the
 * archive. The catalogue is a source the archive reads, not the authority it speaks
 * with: so it is quoted, cited quietly, and made openable.
 *
 * Two rules hold this together:
 *
 * 1. It must read without JavaScript. The trigger is a real anchor into
 *    /life/retrospective/, where the transcribed pages already carry #page-N ids, and
 *    the click handler only pre-empts that navigation once it has confirmed the
 *    browser actually has <dialog>. A <dialog> without `open` is display:none under
 *    the UA stylesheet, so the panel ships inside the prerendered HTML and stays
 *    invisible with scripting off rather than dumping a slab of text into the page.
 *
 * 2. Attribution names the document, not Sievan. Who wrote this prose is not
 *    established anywhere in the archive — the object record reads "Sievan:
 *    Retrospective, (Lee Sievan?) with article 'A Lost Generation' Paul Waldo
 *    Schwartz" — so crediting him for it would be a fabrication. The CV on page 8 is
 *    a separate matter and is attributed to him, in CV_SOURCE.
 */
export function CatalogueSource({
  page,
  children,
  className,
}: {
  page: RetrospectivePage;
  children: ReactNode;
  /** Applied to the trigger, so a caller can style the quote or the thumbnail it wraps. */
  className?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Untranscribed pages have no anchor on /life/retrospective/, so they fall back to
  // the scan itself — still a real destination with scripting off.
  const href = page.text ? `/life/retrospective/#page-${page.page}` : page.image;

  const open = useCallback((e: React.MouseEvent) => {
    const dialog = dialogRef.current;
    // Feature-detected, not assumed: without showModal the anchor must still navigate.
    if (!dialog || typeof dialog.showModal !== 'function') return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    dialog.showModal();
  }, []);

  // The backdrop is part of the dialog element, so a click lands on the dialog itself
  // rather than on any child — that is what distinguishes it from a click inside.
  const onBackdrop = useCallback((e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) dialogRef.current?.close();
  }, []);

  return (
    <>
      <a href={href} onClick={open} className={className}>
        {children}
      </a>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        onClick={onBackdrop}
        aria-label={`Retrospective catalogue, page ${page.page}`}
      >
        <div className={styles.panel}>
          <form method="dialog" className={styles.closeRow}>
            <button className={styles.close} aria-label="Close">Close</button>
          </form>

          <div className={styles.body}>
            <figure className={styles.figure}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={page.image}
                alt={
                  page.heading
                    ? `Retrospective catalogue page ${page.page}: ${page.heading}`
                    : `Retrospective catalogue, page ${page.page}`
                }
                loading="lazy"
                decoding="async"
              />
              <figcaption className={styles.pageNo}>Page {page.page}</figcaption>
            </figure>

            <div className={styles.text}>
              {page.heading && <h2 className={styles.heading}>{page.heading}</h2>}
              {page.text?.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
              {page.caption && <p className={styles.caption}>{page.caption}</p>}
              <p className={styles.meta}>
                From the retrospective typescript held in the archive, page {page.page}.{' '}
                <Link href={href}>Read it in the document</Link> ·{' '}
                <Link href="/archive/objects/MS-AR-00026/">the archive record</Link>
              </p>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
