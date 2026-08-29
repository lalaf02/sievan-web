/**
 * The provenance line for anything transcribed from the retrospective CV.
 *
 * A component rather than a bare string because the markup repeated too, not just
 * the words — three pages had each written their own version, and they had drifted
 * apart. `children` carries whatever local cross-link the calling page needs.
 */
import { CV_SOURCE } from '@/lib/retrospective';
import styles from './CVSource.module.css';

export function CVSource({ children }: { children?: React.ReactNode }) {
  return (
    <p className={styles.source}>
      {CV_SOURCE}
      {children ? <> {children}</> : null}
    </p>
  );
}
