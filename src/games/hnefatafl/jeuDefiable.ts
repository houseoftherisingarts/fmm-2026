// ─── Le tafl, vu par le panneau des amis ────────────────────────────
// Le panneau ne connaît aucun jeu en particulier : chaque page lui
// tend un adaptateur qui sait ouvrir un défi, y répondre et suivre les
// parties. Voici celui du hnefatafl (Alex, 2026-08-23).

import type { DefiAffiche, JeuDefiable } from '../../components/jeux/PanneauAmis';
import { REGLES } from './gameLogic';
import {
  suivreMesParties, lancerDefi, repondreAuDefi, ouvrirDefiParLien,
  type PartieTafl, type CampTafl,
} from '../../firebase/tafl';

export function jeuTafl(opts: {
  lang: 'FR' | 'EN';
  /** Le règlement courant de la page : le défi part avec celui-là. */
  regleId: string;
  /** Le camp courant : l'ami défié prend le camp opposé. */
  camp: CampTafl;
}): JeuDefiable {
  const fr = opts.lang === 'FR';
  const nomRegle = (id: string) =>
    REGLES.find((r) => r.id === id)?.[fr ? 'nomFR' : 'nomEN'] ?? id;

  return {
    chemin: '/jeunesse/hnefatafl',
    defier: (moi, cible) => lancerDefi({
      moiUid: moi.uid, moiNom: moi.nom,
      cibleUid: cible.uid, cibleNom: cible.nom,
      regleId: opts.regleId, monCamp: opts.camp,
    }),
    parLien: (moi) => ouvrirDefiParLien({
      moiUid: moi.uid, moiNom: moi.nom,
      regleId: opts.regleId, monCamp: opts.camp,
    }),
    repondre: repondreAuDefi,
    suivre: (uid, cb) => suivreMesParties(uid, (parties: PartieTafl[]) => {
      cb(parties.map((p): DefiAffiche => ({
        id: p.id,
        joueurs: p.joueurs,
        noms: p.noms,
        lancePar: p.lancePar,
        statut: p.statut,
        detail: `${nomRegle(p.regleId)} · ${
          p.camps.attacker === uid
            ? (fr ? 'vous menez les assaillants' : 'you lead the raiders')
            : (fr ? 'vous défendez le roi' : 'you defend the king')
        }`,
      })));
    }),
  };
}
