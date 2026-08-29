/**
 * The caveat that must accompany every rendering of a period's year range.
 *
 * A component rather than a string at each call site for the reason CVSource is one:
 * the CV's caveat had been written out three times in three wordings before it was
 * given a single home, and a caveat that drifts is a caveat nobody trusts.
 */
import { PERIOD_SOURCE } from '@/lib/periods';
import styles from './PeriodSource.module.css';

export function PeriodSource() {
  return <p className={styles.source}>{PERIOD_SOURCE}</p>;
}
