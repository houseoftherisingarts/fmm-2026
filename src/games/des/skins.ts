// ─── Les parures de la table des dés ────────────────────────────────
// Alex, 2026-08-23 : « on doit avoir des skins de dés différents […] les
// dés du festival où le 1 est remplacé par le logo du festival, et un
// autre set où le 1 est remplacé par le logo du salon des inconnus.
// Même chose pour la table […] comme si c'était gravé dans le bois. »
//
// Une parure ne change qu'une chose : l'emblème frappé sur la face du un
// pour les dés, et l'emblème brûlé au centre du plateau pour la table.
// Le reste du décor ne bouge pas.

export type IdSkinDe = 'os' | 'festival' | 'inconnus';
export type IdSkinTable = 'chene' | 'festival' | 'inconnus';

export interface Parure<T extends string> {
  id: T;
  nomFR: string;
  nomEN: string;
  /** Silhouette à graver. Rien pour la parure ordinaire. */
  embleme?: string;
}

export const SKINS_DE: Array<Parure<IdSkinDe>> = [
  { id: 'os',        nomFR: 'Les dés d’os',        nomEN: 'The bone dice' },
  { id: 'festival',  nomFR: 'Les dés du festival', nomEN: 'The festival dice',
    embleme: '/fmm-logo-white.png' },
  { id: 'inconnus',  nomFR: 'Les dés des Inconnus', nomEN: 'The Strangers’ dice',
    embleme: '/salon/salon-logo.png' },
];

export const SKINS_TABLE: Array<Parure<IdSkinTable>> = [
  { id: 'chene',     nomFR: 'Le chêne nu',            nomEN: 'Bare oak' },
  { id: 'festival',  nomFR: 'La table du festival',   nomEN: 'The festival table',
    embleme: '/fmm-logo-white.png' },
  { id: 'inconnus',  nomFR: 'La table des Inconnus',  nomEN: 'The Strangers’ table',
    embleme: '/salon/salon-logo.png' },
];

// ── Les silhouettes, chargées une seule fois ────────────────────────
const cache = new Map<string, HTMLImageElement>();

export function emblemePret(url?: string): HTMLImageElement | null {
  if (!url) return null;
  return cache.get(url) ?? null;
}

/** Charge une silhouette et rappelle quand elle est prête. La scène se
 *  reconstruit alors avec la gravure en place. */
export function chargerEmbleme(url: string | undefined, quandPret: () => void): void {
  if (!url || cache.has(url)) { quandPret(); return; }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => { cache.set(url, img); quandPret(); };
  img.onerror = () => quandPret();
  img.src = url;
}

// ── La parure en cours, lue par la scène au moment de bâtir ─────────
export const parures: { de?: string; table?: string } = {};

export function choisirParures(de?: string, table?: string): void {
  parures.de = de;
  parures.table = table;
}
