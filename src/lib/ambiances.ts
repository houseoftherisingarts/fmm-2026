// ─── Les ambiances du site ──────────────────────────────────────────
// Alex, 2026-08-28 : trois pistes déjà licenciées et déjà dans le
// dépôt (public/audio/, voir CREDITS.txt) servent d'ambiances choisies
// dans l'onglet Profil (MusiquePanel.tsx) et jouées par AudioPlayer.
// Partagé entre les deux pour ne pas dupliquer la liste.

export interface Ambiance {
  id: string;
  titreFR: string;
  titreEN: string;
  fichier: string;
  /** L'attribution exigée par la licence Creative Commons. */
  credit: string;
}

export const AMBIANCES: Ambiance[] = [
  { id: 'festin', titreFR: 'Le festin', titreEN: 'The feast', fichier: '/audio/master-of-the-feast.mp3', credit: 'Master of the Feast · Kevin MacLeod' },
  { id: 'chant', titreFR: 'Chant grégorien', titreEN: 'Gregorian chant', fichier: '/audio/virtutes-vocis.mp3', credit: 'Virtutes Vocis · Kevin MacLeod' },
  { id: 'nordique', titreFR: 'Ambiance nordique', titreEN: 'Nordic ambience', fichier: '/audio/nordic-wist.mp3', credit: 'Nordic Wist · Kevin MacLeod' },
];

export function ambianceParId(id: string | null | undefined): Ambiance | undefined {
  return AMBIANCES.find((a) => a.id === id);
}
