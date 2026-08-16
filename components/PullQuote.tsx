import Link from 'next/link';
import type { Quote } from '@/lib/quotes';
import styles from './PullQuote.module.css';

interface PullQuoteProps {
  quote: Quote;
  /** Use larger styling for hero placement */
  size?: 'default' | 'large';
  /** Show the source link */
  showSource?: boolean;
}

/**
 * Displays a testimonial quote prominently.
 *
 * Used on the homepage for rotating endorsements and on the "Why Sievan"
 * page to present curated evidence.
 */
export function PullQuote({ quote, size = 'default', showSource = false }: PullQuoteProps) {
  return (
    <figure className={`${styles.quote} ${size === 'large' ? styles.large : ''}`}>
      <blockquote className={styles.text}>
        "{quote.text}"
      </blockquote>
      <figcaption className={styles.attribution}>
        <span className={styles.speaker}>{quote.speaker}</span>
        <span className={styles.role}>{quote.role}</span>
        {showSource && quote.source && (
          <Link href={quote.source} className={styles.source}>
            Source
          </Link>
        )}
      </figcaption>
    </figure>
  );
}

interface QuoteGridProps {
  quotes: Quote[];
  columns?: 1 | 2 | 3;
}

/**
 * Grid of quotes for presenting multiple testimonials.
 */
export function QuoteGrid({ quotes, columns = 2 }: QuoteGridProps) {
  return (
    <div className={styles.grid} data-columns={columns}>
      {quotes.map((quote, i) => (
        <PullQuote key={i} quote={quote} showSource />
      ))}
    </div>
  );
}
