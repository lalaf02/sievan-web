import type { Metadata } from 'next';
import Link from 'next/link';
import { counts } from '@/lib/data';

export const metadata: Metadata = {
  title: 'About',
  description: 'About the Maurice Sievan archive.',
};

export default function AboutPage() {
  return (
    <div className="page" style={{ paddingTop: 'var(--s-6)' }}>
      <div className="measure">
        <h1>About this archive</h1>
        <p>
          This site publishes the surviving paper and tape record around the painter
          Maurice Sievan: {counts.archiveObjects} catalogued objects from a single
          archive box, {counts.newsArticles} press notices, {counts.exhibitions}{' '}
          documented exhibitions, and {counts.transcribedInterviews} recorded interviews
          with people who knew him.
        </p>
        <p>
          The catalogue of paintings is still in preparation. Until it opens, the archive
          leads: what was written about the work, where it was shown, and what was
          remembered about the man.
        </p>
        <p>
          <Link href="/about/method/">How this archive was made</Link> — the sources, the
          method, and what is still missing.
        </p>
      </div>
    </div>
  );
}
