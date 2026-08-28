// ─── Les ambiances du site ──────────────────────────────────────────
// Alex, 2026-08-28 : trois pistes déjà licenciées et déjà dans le
// dépôt (public/audio/, voir CREDITS.txt) servent d'ambiances choisies
// dans l'onglet Profil (MusiquePanel.tsx) et jouées par AudioPlayer.
// Partagé entre les deux pour ne pas dupliquer la liste.
//
// Une quatrième piste (« menestrel ») s'ajoute en test : achetable à
// la boutique pour 1 Montpellois (voir PRIX_AMBIANCE, montpellois.ts),
// au lieu d'être offerte d'office comme les trois premières. `gratuite`
// distingue les deux : MusiquePanel ne propose que les ambiances
// gratuites plus celles que bourse.ambiances confirme achetées.

export interface Ambiance {
  id: string;
  titreFR: string;
  titreEN: string;
  fichier: string;
  /** L'attribution exigée par la licence Creative Commons. */
  credit: string;
  /** Offerte à tous dès l'arrivée sur le site. Une ambiance non
   *  gratuite s'achète à la boutique (BoutiqueMontpellois.tsx). */
  gratuite: boolean;
}

export const AMBIANCES: Ambiance[] = [
  { id: 'festin', titreFR: 'Le festin', titreEN: 'The feast', fichier: '/audio/master-of-the-feast.mp3', credit: 'Master of the Feast · Kevin MacLeod (incompetech.com), CC BY 4.0', gratuite: true },
  { id: 'chant', titreFR: 'Chant grégorien', titreEN: 'Gregorian chant', fichier: '/audio/virtutes-vocis.mp3', credit: 'Virtutes Vocis · Kevin MacLeod (incompetech.com), CC BY 4.0', gratuite: true },
  { id: 'nordique', titreFR: 'Ambiance nordique', titreEN: 'Nordic ambience', fichier: '/audio/nordic-wist.mp3', credit: 'Nordic Wist · Kevin MacLeod (incompetech.com), CC BY 4.0', gratuite: true },
  {
    id: 'menestrel', titreFR: 'Le ménestrel', titreEN: 'The minstrel',
    fichier: '/audio/pippin-the-hunchback.mp3',
    credit: 'Pippin the Hunchback · Kevin MacLeod (incompetech.com), CC BY 4.0 — https://incompetech.com/music/royalty-free/music.html',
    gratuite: false,
  },
];

export function ambianceParId(id: string | null | undefined): Ambiance | undefined {
  return AMBIANCES.find((a) => a.id === id);
}
