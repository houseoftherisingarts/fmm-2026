import type { Lang } from '../content';

// URL is the source of truth for locale.
// `/en` and `/en/...` → EN; everything else → FR.
export function getLocaleFromPath(pathname: string): Lang {
  if (pathname === '/en' || pathname.startsWith('/en/')) return 'EN';
  return 'FR';
}

// Strip the `/en` prefix from a pathname so we can swap locales while
// keeping the user on the same conceptual page. Returns the FR-side path.
export function stripLocale(pathname: string): string {
  if (pathname === '/en') return '/';
  if (pathname.startsWith('/en/')) return pathname.slice(3);
  return pathname;
}

// Add the `/en` prefix to a FR-side pathname.
export function addLocale(pathname: string, lang: Lang): string {
  if (lang === 'FR') return pathname;
  if (pathname === '/') return '/en';
  return `/en${pathname}`;
}
