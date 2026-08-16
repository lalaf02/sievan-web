import Link from 'next/link';
import { counts } from '@/lib/data';
import styles from './SiteFooter.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`page ${styles.inner}`}>
        <p className={styles.counts}>
          <span className="tnum">{counts.archiveObjects}</span> archive objects ·{' '}
          <span className="tnum">{counts.newsArticles}</span> press notices ·{' '}
          <span className="tnum">{counts.exhibitions}</span> exhibitions ·{' '}
          <span className="tnum">{counts.transcriptWords.toLocaleString()}</span> words of
          recorded testimony
        </p>
        <p className={styles.meta}>
          <Link href="/about/method/">How this archive was made</Link>
        </p>
      </div>
    </footer>
  );
}
