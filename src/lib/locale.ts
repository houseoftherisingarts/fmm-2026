import type { Lang } from '../content';

// URL is the source of truth for locale.
// `/en` and `/en/...` → EN; everything else → FR.
export function getLocaleFromPath(pathname: string): Lang {
  if (pathname === '/en' || pathname.startsWith('/en/')) return 'EN';
  return 'FR';
}

// FR → EN slug map, extracted from the <Route> table in App.tsx (EN routes
// are registered under translated slugs, e.g. `/marche` ↔ `/en/market`).
// Paths absent from this map are identical in both languages
// (/accueil, /contact, /messages, /backuppage, …) and only gain/lose the
// `/en` prefix. Legacy absorbed slugs (musique, jeunesse, nourriture,
// apprendre, groupes, chevaux) are included so their EN redirects fire.
const FR_TO_EN: Record<string, string> = {
  '/activites': '/activities',
  '/marche/inscription': '/market/registration',
  '/marche': '/market',
  '/histoire': '/history',
  '/mariages': '/weddings',
  '/hebergement': '/lodging',
  '/partenaires': '/partners',
  '/espace-benevole': '/volunteer-space',
  '/benevole': '/volunteer',
  '/compte': '/account',
  '/communaute/equipe': '/community/team',
  '/communaute': '/community',
  '/profil': '/profile',
  '/musique/inscription': '/music/registration',
  '/musique': '/music',
  '/jeunesse/hnefatafl': '/youth/hnefatafl',
  '/jeunesse': '/youth',
  // Les jeux et le lobby des défis, qui manquaient à la table de
  // correspondance : un lien de défi copié depuis la version anglaise
  // tombait sur `/en/defi/...`, une adresse qui n'existe pas.
  '/jeux/des': '/games/dice',
  '/defi': '/challenge',
  '/nourriture': '/food',
  '/apprendre': '/learn',
  '/ressources': '/resources',
  '/politique-de-confidentialite': '/privacy',
  '/groupes': '/groups',
  '/chevaux': '/horses',
};

const EN_TO_FR: Record<string, string> = Object.fromEntries(
  Object.entries(FR_TO_EN).map(([fr, en]) => [en, fr]),
);

// Longest-prefix keys first so `/marche/inscription` wins over `/marche`.
const FR_KEYS = Object.keys(FR_TO_EN).sort((a, b) => b.length - a.length);
const EN_KEYS = Object.keys(EN_TO_FR).sort((a, b) => b.length - a.length);

// Translate the longest matching path prefix (on segment boundaries, so
// `/benevoles` never matches `/benevole`), preserving dynamic suffixes
// like `/profil/:uid` → `/profile/:uid`.
function translatePrefix(pathname: string, keys: string[], map: Record<string, string>): string {
  for (const key of keys) {
    if (pathname === key) return map[key];
    if (pathname.startsWith(key + '/')) return map[key] + pathname.slice(key.length);
  }
  return pathname;
}

// Strip the `/en` prefix from a pathname and translate the slug back to
// its FR canonical form, so we can swap locales while keeping the user
// on the same conceptual page. Returns the FR-side path.
export function stripLocale(pathname: string): string {
  if (pathname === '/en') return '/';
  if (pathname.startsWith('/en/')) {
    return translatePrefix(pathname.slice(3), EN_KEYS, EN_TO_FR);
  }
  return pathname;
}

// From a FR-side pathname, build the path for the requested locale:
// FR returns it untouched; EN translates the slug and adds the `/en` prefix.
export function addLocale(pathname: string, lang: Lang): string {
  if (lang === 'FR') return pathname;
  if (pathname === '/') return '/en';
  return `/en${translatePrefix(pathname, FR_KEYS, FR_TO_EN)}`;
}
