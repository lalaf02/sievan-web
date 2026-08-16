'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './SiteHeader.module.css';

/**
 * Works is listed but marked "in preparation" rather than hidden: the paintings
 * are being photographed now, and stating that is more useful than a missing nav
 * item that appears one day without explanation.
 */
const NAV = [
  { href: '/why/', label: 'Why Sievan' },
  { href: '/life/', label: 'Life and Work' },
  { href: '/archive/', label: 'The Archive' },
  { href: '/exhibitions/', label: 'Exhibitions' },
  { href: '/works/', label: 'Works', pending: true },
  { href: '/about/', label: 'About' },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <a href="#main" className={styles.skip}>Skip to content</a>
      <div className={`page ${styles.inner}`}>
        <Link href="/" className={styles.wordmark}>
          Maurice Sievan
        </Link>
        <nav aria-label="Main">
          <ul className={styles.nav}>
            {NAV.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`${styles.link} ${isActive ? styles.active : ''}`}
                  >
                    {item.label}
                    {item.pending && (
                      <span className={styles.pending} title="In preparation">
                        in preparation
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
