// ─── Les dos de carte du tarot ──────────────────────────────────────
// Le dos du festival est à tous. Les autres se gagnent ou s'obtiennent
// (bourses/{uid}.dosTarot) : le tarot de la caravane (récompense du
// jour 4), le dos William (avec la seconde chance du jour 7), le dos du
// Salon des Inconnus (offert à la boutique). Le dos équipé vit dans le
// navigateur, comme le choix des pièces du hnefatafl (Alex, 2026-08-30).

export const CLE_DOS_TAROT = 'fmm.tarot.dos';
export const DOS_CARAVANE = 'caravane';

export interface DosCarte {
  id: string;
  nomFR: string; nomEN: string;
  /** Comment on l'obtient, pour le coffre et la boutique. */
  origineFR: string; origineEN: string;
  /** Vide pour le dos du festival, servi par /tarot/dos-v2.webp. */
  image: string;
}

export const DOS_CARTES: DosCarte[] = [
  { id: 'festival', nomFR: 'Le dos du festival', nomEN: 'The festival back', origineFR: 'À tous', origineEN: 'For everyone', image: '/tarot/dos-v2.webp' },
  { id: 'caravane', nomFR: 'Tarot de la caravane', nomEN: 'Caravan tarot', origineFR: 'Récompense quotidienne · jour 4', origineEN: 'Daily reward · day 4', image: '/tarot/dos-caravane.webp' },
  { id: 'william', nomFR: 'Dos William J. Walter', nomEN: 'William J. Walter back', origineFR: 'Récompense quotidienne · jour 7', origineEN: 'Daily reward · day 7', image: '/tarot/dos-william.webp' },
  { id: 'salon', nomFR: 'Dos du Salon des Inconnus', nomEN: 'Salon des Inconnus back', origineFR: 'Offert à la boutique', origineEN: 'Free at the shop', image: '/tarot/dos-salon.webp' },
];

export const imageDos = (id: string | null | undefined): string =>
  (DOS_CARTES.find((d) => d.id === id) || DOS_CARTES[0]).image;

/** Le dos équipé (null = celui du festival). */
export function dosEquipe(): string | null {
  try { const v = localStorage.getItem(CLE_DOS_TAROT); return v && v !== 'festival' ? v : null; } catch { return null; }
}

export function equiperDos(id: string | null): void {
  try { if (id && id !== 'festival') localStorage.setItem(CLE_DOS_TAROT, id); else localStorage.removeItem(CLE_DOS_TAROT); } catch { /* navigation privée */ }
}

/** Compatibilité avec les premiers appels (le tarot de la caravane). */
export const dosCaravaneEquipe = () => dosEquipe() === DOS_CARAVANE;
export const equiperDosCaravane = (oui: boolean) => equiperDos(oui ? DOS_CARAVANE : null);
