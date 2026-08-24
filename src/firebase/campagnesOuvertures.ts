// ─── Les ouvertures d'infolettre ─────────────────────────────────────
// Alex, 2026-08-24 : « Je dois pouvoir tracker qui ouvre les
// infolettres. » Chaque lettre porte au bas du HTML une image d'un
// pixel. Quand le client de courriel va la chercher, la Cloud Function
// `pixel` écrit une ligne ici. Ce fichier ne fait que la relire.
//
// LA LECTURE SEULE, et c'est verrouillé jusque dans les règles
// Firestore : le navigateur ne pose jamais une ouverture. Un taux qui
// se retouche à la main ne vaut plus rien.
//
// AUCUN INDEX COMPOSÉ. La requête ne filtre que sur un champ, et le
// tri se fait ici, sur la liste rendue. Une campagne compte au plus
// quinze cents destinataires, alors trier quelques centaines de lignes
// dans le navigateur ne coûte rien, là où un index composé demanderait
// un déploiement de plus pour la même chose.

import {
  collection, onSnapshot, query, where,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

const COLLECTION = 'campagnesOuvertures';

export interface Ouverture {
  /** `<campagne>__<courriel>`, la clé du document. */
  id: string;
  campagne: string;
  courriel: string;
  /** Combien de fois cette personne a rouvert la lettre. Le taux ne
   *  regarde jamais ce nombre : une personne curieuse compte pour une. */
  fois: number;
  premiereLe?: Timestamp;
  derniereLe?: Timestamp;
}

/**
 * Le taux d'ouverture, en pourcentage entier.
 *
 * Le dénominateur est le nombre de lettres réellement PARTIES, jamais
 * le nombre d'adresses retenues au départ : compter les envois qui ont
 * échoué ferait baisser le taux pour une raison qui n'a rien à voir
 * avec la lettre. Quand ce nombre manque, la base retombe sur les
 * destinataires.
 *
 * Le plafond à cent n'est pas décoratif. Apple charge les images de ses
 * usagers sans que personne ouvre quoi que ce soit, et un relais qui
 * s'emballe peut faire passer le compte au-dessus du nombre d'envois.
 * Un taux de 118 % ferait douter Alex de tout le tableau.
 */
export function tauxOuverture(ouvertures?: number, base?: number): number {
  const o = Math.max(0, Number(ouvertures) || 0);
  const b = Math.max(0, Number(base) || 0);
  if (!b) return 0;
  return Math.min(100, Math.round((o / b) * 100));
}

/**
 * Qui a ouvert une campagne, en direct, du plus récent au plus ancien.
 *
 * Le tri passe par `derniereLe` et retombe sur `premiereLe` : une
 * ligne écrite à la seconde même n'a pas encore reçu son horodatage du
 * serveur, et elle se retrouverait tout au fond sans ce filet.
 */
export function suivreOuvertures(
  campagne: string,
  cb: (ouvertures: Ouverture[]) => void,
): () => void {
  if (!db || !campagne) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, COLLECTION), where('campagne', '==', campagne)),
    (snap) => {
      const liste = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Ouverture, 'id'>),
      }));
      liste.sort((a, b) => quand(b) - quand(a));
      cb(liste);
    },
    (err) => { console.warn('[ouvertures] lecture', err); cb([]); },
  );
}

function quand(o: Ouverture): number {
  const t = o.derniereLe || o.premiereLe;
  return t ? t.toMillis() : 0;
}
