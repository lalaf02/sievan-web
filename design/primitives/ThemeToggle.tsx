'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { type Theme, DEFAULT_THEME, readTheme, writeTheme } from '../theme';

/*
 * Subscribers are module-level so that two toggles on one page (the admin rail
 * and a mobile bar, say) stay in step without either owning the other.
 */
const listeners = new Set<() => void>();
function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/*
 * The server snapshot is the default theme, which is what the server actually
 * renders: dark carries no attribute, so the prerendered HTML is always the dark
 * one and only an explicit light choice diverges. The pre-paint script has
 * already corrected the DOM by the time this hydrates.
 */
const getServerSnapshot = () => DEFAULT_THEME;

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, readTheme, getServerSnapshot);

  const toggle = useCallback(() => {
    writeTheme(readTheme() === 'light' ? 'dark' : 'light');
    listeners.forEach((fn) => fn());
  }, []);

  const next: Theme = theme === 'light' ? 'dark' : 'light';

  return (
    <button
      type="button"
      onClick={toggle}
      className={className ?? 'sv-button'}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      <ThemeIcon theme={theme} />
      <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
    </button>
  );
}

/* The project's first real icon: inline SVG, currentColor, no dependency. */
function ThemeIcon({ theme }: { theme: Theme }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" fill="none">
      <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.5" />
      {theme === 'light' ? null : (
        <path d="M8 2.75a5.25 5.25 0 0 0 0 10.5z" fill="currentColor" />
      )}
    </svg>
  );
}
