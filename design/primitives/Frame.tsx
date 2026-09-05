import type { ReactNode } from 'react';

/*
 * The mat a reproduction hangs in.
 *
 * This is the object the whole redesign turns on, and the clearest expression of
 * one shared package: the public site's tiles and the admin's upload preview are
 * the same component, so a curator checks an image in exactly the frame the
 * public will see it in.
 *
 * `fit` is a real distinction and not a style preference. Documents — scanned
 * sheets, catalogue pages, press clippings — are 'contain', because cropping the
 * masthead off a clipping destroys the evidence. Pictures are 'cover'.
 *
 * A plain <img> on purpose: the public site is a static export with
 * `images: { unoptimized: true }`, so next/image buys nothing and needs a server.
 */

export type FrameFit = 'contain' | 'cover';

export function Frame({
  src, alt, aspect, fit = 'contain', href, caption, meta, absent, absentNote,
}: {
  src?: string | null;
  alt?: string;
  /** Any CSS aspect-ratio value, e.g. "4 / 5". Defaults to the footage's 720/486. */
  aspect?: string;
  fit?: FrameFit;
  href?: string;
  caption?: ReactNode;
  meta?: ReactNode;
  /** Force the not-digitised state even when a src exists. */
  absent?: boolean;
  absentNote?: string;
}) {
  const style = aspect ? ({ ['--aspect' as string]: aspect }) : undefined;

  /*
   * Twenty of the fifty objects are not digitised and they stay in every
   * listing — an archive that hides what it does not have is not a record. So
   * absence gets a designed state rather than an empty box.
   */
  if (absent || !src) {
    return (
      <figure className="sv-frame-item">
        <div className="sv-frame-absent" style={style}>
          <span className="sv-label">Not digitised</span>
          {absentNote ? <span className="sv-frame-caption">{absentNote}</span> : null}
        </div>
        <FrameCaption caption={caption} meta={meta} />
      </figure>
    );
  }

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? ''}
      className={fit === 'cover' ? 'sv-frame-cover' : 'sv-frame-contain'}
      loading="lazy"
    />
  );

  return (
    <figure className="sv-frame-item">
      {href
        ? <a className="sv-frame" style={style} href={href}>{img}</a>
        : <span className="sv-frame" style={style}>{img}</span>}
      <FrameCaption caption={caption} meta={meta} />
    </figure>
  );
}

function FrameCaption({ caption, meta }: { caption?: ReactNode; meta?: ReactNode }) {
  if (!caption && !meta) return null;
  return (
    <figcaption className="sv-frame-caption">
      {caption ? <span>{caption}</span> : null}
      {meta ? <span className="sv-faint">{meta}</span> : null}
    </figcaption>
  );
}
