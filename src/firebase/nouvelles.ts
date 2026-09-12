// ─── Le fil Facebook de l'accueil ────────────────────────────────────
// La fonction `nouvellesFacebook` (functions/index.js) recopie chaque
// matin les dernières publications de la page dans un seul document.
// L'accueil s'y abonne : quand le matin passe, la page suit sans
// rechargement.
//
//   /nouvelles/facebook  { publications: Publication[], misAJour, erreur? }

import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export interface Publication {
  id: string;
  texte: string;
  image: string | null;
  images: string[];
  lien: string;
  lienExterne: string | null;
  titreLien: string | null;
  /** ISO 8601, tel que Graph le rend. */
  date: string;
  type: 'photo' | 'album' | 'video' | 'lien' | 'texte';
}

export interface FilFacebook {
  publications: Publication[];
  misAJour: Date | null;
}

export function suivreNouvelles(cb: (fil: FilFacebook | null) => void): () => void {
  if (!db) { cb(null); return () => {}; }
  return onSnapshot(
    doc(db, 'nouvelles', 'facebook'),
    (snap) => {
      const d = snap.data();
      if (!d) { cb(null); return; }
      cb({
        publications: Array.isArray(d.publications) ? d.publications : [],
        misAJour: d.misAJour?.toDate ? d.misAJour.toDate() : null,
      });
    },
    () => cb(null),
  );
}
