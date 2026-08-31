// ─── Le dos de carte équipé ─────────────────────────────────────────
// Le tarot de la caravane (récompense quotidienne du jour 4) se gagne
// côté serveur (bourses/{uid}.dosTarot) et s'équipe depuis le coffre du
// profil ou à même le jeu. Le choix vit dans le navigateur, comme celui
// des pièces du hnefatafl. Le dessin lui-même est DosCaravane.tsx.

export const CLE_DOS_TAROT = 'fmm.tarot.dos';
export const DOS_CARAVANE = 'caravane';

export function dosCaravaneEquipe(): boolean {
  try { return localStorage.getItem(CLE_DOS_TAROT) === DOS_CARAVANE; } catch { return false; }
}

export function equiperDosCaravane(oui: boolean): void {
  try { if (oui) localStorage.setItem(CLE_DOS_TAROT, DOS_CARAVANE); else localStorage.removeItem(CLE_DOS_TAROT); } catch { /* navigation privée */ }
}
