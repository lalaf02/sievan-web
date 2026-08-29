/**
 * The provenance note that must accompany every set of works the estate photographed.
 *
 * A component rather than a string at each call site, for the reason PeriodSource and
 * CVSource are components: a caveat written out in three wordings is a caveat nobody
 * trusts. Do not render this beside the gallery plates or the catalogue plates — those
 * are other people's reproductions and take PLATE_CREDIT instead.
 */
import { IMAGE_SOURCE } from '@/lib/provenance';
import styles from './ImageSource.module.css';

export function ImageSource() {
  return <p className={styles.source}>{IMAGE_SOURCE}</p>;
}
