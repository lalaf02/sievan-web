/*
 * The theme mechanism, shared by both apps so they cannot drift.
 *
 * Dark is the default and carries no attribute — it is what :root declares. Only
 * light stamps data-theme='light'. That means the correct default renders with
 * no script at all, and the script below exists solely to restore an explicit
 * choice before first paint.
 *
 * A cookie rather than localStorage: the public site is a static export with no
 * server, but a cookie is still the one store readable synchronously in the
 * document head, which is what avoids a flash of the wrong theme.
 */

export type Theme = 'dark' | 'light';

export const THEME_COOKIE = 'sievan-theme';
export const DEFAULT_THEME: Theme = 'dark';

/**
 * Runs before paint, in <head>. Kept to one line and wrapped in try/catch: it
 * executes before anything else on the page and must never be able to throw.
 */
export const themeScript = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);if(m&&decodeURIComponent(m[1])==='light')document.documentElement.setAttribute('data-theme','light')}catch(e){}})()`;

export function readTheme(): Theme {
  if (typeof document === 'undefined') return DEFAULT_THEME;
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function writeTheme(theme: Theme): void {
  if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; SameSite=Lax`;
}
