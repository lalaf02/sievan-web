/**
 * The search caveat, rendered once.
 *
 * A component rather than a bare string for the reason CVSource and PeriodSource are
 * components: the markup repeated as well as the words, and five copies had already
 * drifted into five wordings. `children` carries whatever the calling page adds.
 *
 * Two sizes, because the caveat does two jobs. Under a search box it is a note — the
 * reader is looking at the control it describes. In running prose on /research/ and
 * /about/method/ it is part of the argument and has to hold its own against the
 * paragraphs either side of it; at note size there it read as a footnote somebody had
 * tucked in, which is precisely the weight this particular fact must not have.
 */
import { NO_TEXT_LAYER } from '@/lib/search';
import styles from './NoTextLayer.module.css';

/** The first sentence, which is the claim; the rest qualifies it. */
const [CLAIM, ...REST] = NO_TEXT_LAYER.split(/(?<=\.)\s+/);

export function NoTextLayer({
  size = 'note', children,
}: {
  size?: 'note' | 'body';
  children?: React.ReactNode;
}) {
  if (size === 'body') {
    return (
      <p className={styles.body}>
        <strong>{CLAIM}</strong> {REST.join(' ')}
        {children ? <> {children}</> : null}
      </p>
    );
  }
  return (
    <p className={styles.caveat}>
      {NO_TEXT_LAYER}
      {children ? <> {children}</> : null}
    </p>
  );
}
