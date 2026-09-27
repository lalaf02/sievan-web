/*
 * The theme mechanism, shared by both apps so they cannot drift.
 *
 * Dark is the default and carries no attribute — it is what :root declares. Only
 * light stamps data-theme='light'. That means the correct default renders with
 * no script at all, and the script below exists solely to restore an explicit
 * choice before first paint.
 *
 * The cookie is primary: the public site is a static export with no server, but
 * a cookie is readable synchronously in the document head, which is what avoids
 * a flash of the wrong theme. localStorage is written beside it and read only
 * when the cookie is absent, because Chrome drops cookies on some origins (a
 * file: page among them) and the choice should survive there too.
 *
 * The script also stamps data-js on <html>. Controls that only work with
 * JavaScript, the theme toggle first among them, key their visibility on it, so
 * a reader without JavaScript never meets a button that does nothing.
 */

export type Theme = 'dark' | 'light';

export const THEME_COOKIE = 'sievan-theme';
export const DEFAULT_THEME: Theme = 'dark';

/**
 * Runs before paint, in <head>. Kept to one line and wrapped in try/catch: it
 * executes before anything else on the page and must never be able to throw.
 */
export const themeScript = `(function(){var d=document.documentElement;d.setAttribute('data-js','');try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);var t=m?decodeURIComponent(m[1]):localStorage.getItem('${THEME_COOKIE}');if(t==='light')d.setAttribute('data-theme','light')}catch(e){}})()`;

export function readTheme(): Theme {
  if (typeof document === 'undefined') return DEFAULT_THEME;
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function writeTheme(theme: Theme): void {
  if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; SameSite=Lax`;
  /* Storage can throw in a private window or on a blocked origin; the cookie
   * above has already done the main job. */
  try { localStorage.setItem(THEME_COOKIE, theme); } catch { /* cookie only */ }
}
