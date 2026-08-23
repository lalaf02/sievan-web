import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="page" style={{ paddingTop: 'var(--s-8)', textAlign: 'center' }}>
      <h1>Page Not Found</h1>
      <p style={{ marginBottom: 'var(--s-5)' }}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <p>
        <Link href="/">Return to the archive home</Link>
      </p>
    </div>
  );
}
