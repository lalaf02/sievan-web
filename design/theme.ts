/*
 * The theme mechanism, shared by both apps so they cannot drift.
 *
 * Light is the default and carries no attribute. Only an explicit dark choice
 * stamps data-theme='dark', and the script restores that choice before paint.
 *
 * A cookie rather than localStorage: the public site is a static export with no
 * server, but a cookie is still the one store readable synchronously in the
 * document head, which is what avoids a flash of the wrong theme.
 */

export type Theme = 'light' | 'dark';

export const THEME_COOKIE = 'sievan-theme';
export const DEFAULT_THEME: Theme = 'light';

/**
 * Runs before paint, in <head>. Kept to one line and wrapped in try/catch: it
 * executes before anything else on the page and must never be able to throw.
 */
export const themeScript = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);if(m&&decodeURIComponent(m[1])==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}})()`;

export function readTheme(): Theme {
  if (typeof document === 'undefined') return DEFAULT_THEME;
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function writeTheme(theme: Theme): void {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.cookie = `${THEME_COOKIE}=dark; path=/; max-age=31536000; SameSite=Lax`;
  } else {
    document.documentElement.removeAttribute('data-theme');
    document.cookie = `${THEME_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  }
}
