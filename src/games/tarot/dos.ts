// ─── Le dos de carte équipé ─────────────────────────────────────────
// Le dos royal (roue des sept jours, jour 4) se gagne côté serveur
// (bourses/{uid}.dosTarot) et s'équipe depuis le coffre du profil. Le
// choix vit dans le navigateur, comme celui des pièces du hnefatafl.
// Module minuscule, pour que le profil n'embarque pas tout le tapis.

export const CLE_DOS_TAROT = 'fmm.tarot.dos';

export function dosRoyalEquipe(): boolean {
  try { return localStorage.getItem(CLE_DOS_TAROT) === 'royal'; } catch { return false; }
}

/** Le même relèvement à l'or, sur le tapis et dans le coffre. */
export const FILTRE_DOS_ROYAL = 'sepia(0.9) saturate(1.6) hue-rotate(-12deg) brightness(1.08)';
