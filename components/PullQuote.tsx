import Link from 'next/link';
import { quoteHref, type Quote } from '@/lib/quotes';
import styles from './PullQuote.module.css';

interface PullQuoteProps {
  quote: Quote;
  /**
   * `small` is the homepage's default: quotes there sit beside and between the
   * pictures rather than interrupting them, which is what "large" was doing — a
   * standalone slab of italic between two images reads as a pause, not as evidence.
   */
  size?: 'small' | 'default' | 'large';
  /** Show the link back into the transcript */
  showSource?: boolean;
}

const SIZE_CLASS: Record<'small' | 'default' | 'large', string> = {
  small: styles.small,
  default: '',
  large: styles.large,
};

/**
 * A piece of testimony, presented as a door rather than an ornament.
 *
 * The whole figure is a link into the transcript at the page the words were
 * spoken on, with the passage highlighted — see `quoteHref`. A quote that cannot
 * be checked against its source is just an assertion, and this archive's argument
 * rests on being checkable.
 */
export function PullQuote({ quote, size = 'default', showSource = false }: PullQuoteProps) {
  const href = quoteHref(quote);
  return (
    <figure className={`${styles.quote} ${SIZE_CLASS[size]}`}>
      <blockquote className={styles.text}>
        <Link href={href} className={styles.textLink}>
          “{quote.text}”
        </Link>
      </blockquote>
      <figcaption className={styles.attribution}>
        <span className={styles.speaker}>{quote.speaker}</span>
        <span className={styles.role}>{quote.role}</span>
        {showSource && (
          <Link href={href} className={styles.source}>
            Hear it in context
          </Link>
        )}
      </figcaption>
    </figure>
  );
}
