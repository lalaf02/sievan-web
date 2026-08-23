'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './SiteHeader.module.css';

/**
 * Five destinations, ordered by depth: the case, the life, the work, the evidence,
 * the apparatus. Exhibitions, people, the chronology and the retrospective are
 * reached from within Life and Work rather than competing at the top level.
 *
 * Works keeps its "in preparation" badge until seed_paintings.json has rows —
 * naming the gap is more useful than a nav item that changes meaning silently.
 */
const NAV = [
  { href: '/life/', label: 'Life and Work' },
  { href: '/works/', label: 'Catalogue Raisonné', pending: true },
  { href: '/archive/', label: 'Archives' },
  { href: '/research/', label: 'Research' },
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

        {/*
          A plain GET form, not a JS handler: without JavaScript this still navigates
          to the search page, which prerenders the complete index. With JavaScript the
          ?q= is picked up on hydration and narrows the list.
        */}
        <form className={styles.search} action="/archive/search/" method="get" role="search">
          <label htmlFor="nav-q" className={styles.srOnly}>Search the archive</label>
          <input
            id="nav-q"
            type="search"
            name="q"
            className={styles.searchInput}
            placeholder="Search"
            autoComplete="off"
          />
        </form>
      </div>
    </header>
  );
}
