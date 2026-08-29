import Link from 'next/link';
import { CONTACT } from '@/lib/contact';
import styles from './SiteFooter.module.css';

/**
 * The site's footer.
 *
 * It used to lead with a running inventory — "76 archive objects · 60 press notices ·
 * 15 exhibitions · 23,969 words of recorded testimony" — on every page of the site.
 * A count of holdings is a fact about the archive's size, not a way into it, and
 * repeating it under the home page's own account of what the archive is made the
 * quantity the last thing a visitor read. The numbers still appear where they mean
 * something: on /archive/, /works/ and /research/, next to the material they count.
 */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`page ${styles.inner}`}>
        <p className={styles.meta}>
          {CONTACT.organisation}
        </p>
        <p className={styles.meta}>
          <Link href="/about/method/">How this archive was made</Link>
          {' · '}
          <Link href="/research/">Access and rights</Link>
        </p>
      </div>
    </footer>
  );
}
