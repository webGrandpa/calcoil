export type ThemePref = 'system' | 'light' | 'dark';

const META_LIGHT = '#e2e7ea';
const META_DARK = '#071118';

/** Applies the theme to <html> and keeps the browser chrome colour in step. */
export function applyTheme(pref: ThemePref) {
  const root = document.documentElement;
  if (pref === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', pref);
  const dark = pref === 'dark' || (pref === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? META_DARK : META_LIGHT);
}
