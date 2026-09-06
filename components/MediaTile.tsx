/**
 * Tiles for the two kinds of imagery the archive holds: a scanned sheet and a
 * silent loop cut from a tape.
 *
 * Both are meant to sit inside a Mosaic <Tile>, which sets the size; these fill it.
 * Neither invents anything — an object with no scan renders as a labelled empty
 * frame rather than being dropped from the grid, because twenty-one of the seventy-six
 * objects are catalogued and not digitised and that is part of the record.
 */
import Link from 'next/link';
import type { Clip, ScanPage } from '@/lib/types';
import { Footage } from './Footage';
import styles from './MediaTile.module.css';

/** A rasterised sheet. Documents are shown whole, never cropped to a shape. */
export function SheetTile({
  sheet, alt, href, caption, meta, eager, aspect = '3 / 4',
}: {
  sheet: ScanPage;
  alt: string;
  href?: string;
  caption?: React.ReactNode;
  meta?: React.ReactNode;
  /** Set on the one tile above the fold; everything else lazy-loads. */
  eager?: boolean;
  /** The frame's shape. Sheets default to portrait; the image letterboxes inside. */
  aspect?: string;
}) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={styles.sheet}
      src={sheet.thumb}
      alt={alt}
      loading={eager ? undefined : 'lazy'}
      decoding="async"
    />
  );

  const style = { '--aspect': aspect } as React.CSSProperties;

  return (
    <figure className={styles.item}>
      {href
        ? <Link className={styles.frame} style={style} href={href}>{img}</Link>
        : <span className={styles.frame} style={style}>{img}</span>}
      {(caption || meta) && (
        <figcaption className={styles.caption}>
          {/*
            Wrapped, not bare. The caption is a flex column so the meta line sits under
            the text, which turns any inline markup in the caption — an <em> on a
            painting's title, a link on a record name — into its own flex item on its
            own line.
          */}
          <span>{caption}</span>
          {meta && <span className={styles.captionMeta}>{meta}</span>}
        </figcaption>
      )}
    </figure>
  );
}

/** The empty frame for an object that exists on paper but not in pixels. */
export function AbsentTile({
  title = 'Not yet digitised',
  note,
  caption,
  meta,
  aspect = '3 / 4',
}: {
  title?: string;
  note?: string;
  caption?: React.ReactNode;
  meta?: React.ReactNode;
  aspect?: string;
}) {
  return (
    <figure className={styles.item}>
      <div className={styles.absent} style={{ '--aspect': aspect } as React.CSSProperties}>
        <span className={styles.absentTitle}>{title}</span>
        {note && <span className={styles.absentNote}>{note}</span>}
      </div>
      {(caption || meta) && (
        <figcaption className={styles.caption}>
          {/*
            Wrapped, not bare. The caption is a flex column so the meta line sits under
            the text, which turns any inline markup in the caption — an <em> on a
            painting's title, a link on a record name — into its own flex item on its
            own line.
          */}
          <span>{caption}</span>
          {meta && <span className={styles.captionMeta}>{meta}</span>}
        </figcaption>
      )}
    </figure>
  );
}

/**
 * A silent loop.
 *
 * `priority` decides whether the browser fetches the video at all. Only the tiles a
 * reader lands on should; the rest show their poster and load nothing until asked,
 * because a page carrying eight autoplaying loops is a page nobody waits for.
 *
 * There is no muted-audio track to strip — extract-clips.mjs writes these with -an.
 */
export function ClipTile({
  clip, href, caption, meta, priority, still, aspect,
}: {
  clip: Clip;
  href?: string;
  caption?: React.ReactNode;
  meta?: React.ReactNode;
  priority?: boolean;
  /** Render the poster only. For long lists, where motion everywhere is noise. */
  still?: boolean;
  /** Defaults to the clip's own shape, so footage is never distorted. */
  aspect?: string;
}) {
  const media = still ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={styles.footage}
      src={clip.poster}
      alt={clip.alt}
      width={clip.width}
      height={clip.height}
      loading={priority ? undefined : 'lazy'}
      decoding="async"
    />
  ) : (
    <Footage
      className={styles.footage}
      clip={clip}
      priority={priority}
    />
  );

  const style = {
    '--aspect': aspect ?? `${clip.width} / ${clip.height}`,
  } as React.CSSProperties;

  return (
    <figure className={styles.item}>
      {href && still
        ? <Link className={styles.frame} style={style} href={href}>{media}</Link>
        : <span className={styles.frame} style={style}>{media}</span>}
      {href && !still && <Link href={href}>{caption ?? clip.alt}</Link>}
      {(caption || meta) && (
        <figcaption className={styles.caption}>
          {/*
            Wrapped, not bare. The caption is a flex column so the meta line sits under
            the text, which turns any inline markup in the caption — an <em> on a
            painting's title, a link on a record name — into its own flex item on its
            own line.
          */}
          <span>{caption}</span>
          {meta && <span className={styles.captionMeta}>{meta}</span>}
        </figcaption>
      )}
    </figure>
  );
}
