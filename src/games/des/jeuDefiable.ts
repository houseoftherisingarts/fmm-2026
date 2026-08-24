// ─── Les dés du menteur, vus par le panneau des amis ────────────────
// Même adaptateur que le tafl, en plus court : une table de dés n'a
// pas de règlement à choisir ni de camp à tenir, tout le monde secoue
// les mêmes cinq dés (Alex, 2026-08-23).

import type { DefiAffiche, JeuDefiable } from '../../components/jeux/PanneauAmis';
import {
  suivreMesPartiesDes, lancerDefiDes, repondreAuDefiDes, ouvrirDefiDesParLien,
  type PartieDes,
} from '../../firebase/desParties';

export function jeuDes(lang: 'FR' | 'EN'): JeuDefiable {
  const fr = lang === 'FR';
  return {
    chemin: '/jeunesse/des',
    defier: (moi, cible) => lancerDefiDes({
      moiUid: moi.uid, moiNom: moi.nom,
      cibleUid: cible.uid, cibleNom: cible.nom,
    }),
    parLien: (moi) => ouvrirDefiDesParLien({ moiUid: moi.uid, moiNom: moi.nom }),
    repondre: repondreAuDefiDes,
    suivre: (uid, cb) => suivreMesPartiesDes(uid, (parties: PartieDes[]) => {
      cb(parties.map((p): DefiAffiche => ({
        id: p.id,
        joueurs: p.joueurs,
        noms: p.noms,
        lancePar: p.lancePar,
        statut: p.statut,
        detail: fr ? 'Cinq dés sous le gobelet' : 'Five dice under the cup',
      })));
    }),
  };
}
