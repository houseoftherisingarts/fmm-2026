// ─── Les dés du menteur, à plusieurs mains ──────────────────────────
// Alex, 2026-08-23 : le jeu savait déjà tenir tête à la maison, il lui
// manquait de pouvoir défier quelqu'un pour vrai. Ce fichier tient
// l'état d'une partie partagée et rien d'autre. Il ne connaît ni
// Firestore, ni React, ni la table en trois dimensions, ce qui permet
// de le vérifier tout seul (tools/des-en-ligne-check.mjs).
//
// Le règlement lui-même vit dans ./regles. Nous l'appelons, nous ne le
// récrivons pas : le comptage des as, la validité d'une annonce et le
// verdict d'un doute sortent tous du moteur déjà éprouvé.
//
// Deux différences avec la partie locale, et elles commandent tout :
//
//   1. Une partie en ligne ne s'arrête pas quand le premier joueur
//      tombe. Elle dure tant qu'il reste deux gobelets debout, et le
//      dernier assis ramasse la mise. Le moteur local, lui, coupe court
//      dès que le joueur humain n'a plus rien, pour ne pas le laisser
//      regarder la maison finir sans lui.
//
//   2. Personne ne lance les dés de personne. Chaque joueur tire sa
//      main chez lui et la scelle dans un document que les règles de
//      sécurité ferment à son seul propriétaire, jusqu'au dévoilement.
//      C'est pourquoi la manche suivante ne passe pas par
//      `mancheSuivante` du moteur local, qui relancerait toutes les
//      mains au même endroit et les donnerait à lire à tout le monde.

import {
  annoncer as annoncerMoteur,
  douter as douterMoteur,
  exact as exactMoteur,
  miseValide,
  type Face, type Joueur, type Partie,
} from './regles';

export interface MiseEnLigne {
  quantite: number;
  face: Face;
  /** Qui l'a annoncée. */
  parUid: string;
}

export interface DevoilementEnLigne {
  doutePar: string;
  contre: string;
  mise: MiseEnLigne;
  compte: number;
  /** Vide quand personne ne perd de dé (un exact réussi). */
  perdantUid: string | null;
  /** Qui récupère un dé, s'il y a lieu. */
  gagnantDeUid?: string | null;
  /** L'appel était « c'est exactement ça » et non « menteur ». */
  exact?: boolean;
  /** Les mains levées, recopiées pour l'affichage. La sous-collection
   *  des mains scellées reste la source qui fait foi : chaque joueur
   *  peut la relire au dévoilement et refaire le compte lui-même. */
  mainsLevees?: Record<string, Face[]>;
}

export interface EtatDes {
  /** Les uid, dans l'ordre du tour de table. */
  joueurs: string[];
  noms: Record<string, string>;
  /** Combien de dés chacun tient encore. Le total est public : la
   *  table doit pouvoir juger une annonce. */
  des: Record<string, number>;
  /** Ceux qui ont scellé leur main pour la manche en cours. Tant que
   *  la liste est incomplète, personne n'annonce : sans cette barrière,
   *  un retardataire écouterait les annonces avant de choisir sa main. */
  mainsPretes: string[];
  elimines: string[];
  mise: MiseEnLigne | null;
  /** À qui de parler. */
  tour: string;
  phase: 'annonces' | 'devoilement' | 'fini';
  manche: number;
  journal: string[];
  devoilement?: DevoilementEnLigne | null;
  gagnant?: string | null;
  /** Qui a quitté la table, s'il y a lieu. */
  abandon?: string | null;
}

const nomDe = (etat: EtatDes, uid: string): string => etat.noms[uid] || 'Un inconnu';

export const vivants = (etat: EtatDes): string[] =>
  etat.joueurs.filter((u) => !etat.elimines.includes(u));

export const totalDes = (etat: EtatDes): number =>
  vivants(etat).reduce((n, u) => n + (etat.des[u] ?? 0), 0);

/** Le joueur suivant qui tient encore un dé. */
export function suivantVivant(etat: EtatDes, depuis: string): string {
  const i = etat.joueurs.indexOf(depuis);
  for (let k = 1; k <= etat.joueurs.length; k++) {
    const u = etat.joueurs[(i + k) % etat.joueurs.length];
    if (!etat.elimines.includes(u)) return u;
  }
  return depuis;
}

/** Les places autour de la table, la mienne en premier. La rotation
 *  garde l'ordre du tour intact : chacun voit ses voisins tourner dans
 *  le même sens, assis devant sa propre place. */
export function sieges(etat: EtatDes, moi: string): string[] {
  const i = etat.joueurs.indexOf(moi);
  if (i < 0) return etat.joueurs;
  return [...etat.joueurs.slice(i), ...etat.joueurs.slice(0, i)];
}

export const toutLeMondeAScelle = (etat: EtatDes): boolean =>
  vivants(etat).every((u) => etat.mainsPretes.includes(u));

/**
 * Traduit l'état partagé dans la langue du moteur local, qui raisonne
 * par indice et par tableau de dés.
 *
 * Sans les mains, les faces sont bouchées avec des six : seule la
 * LONGUEUR compte pour valider une annonce, et les faces ne sont
 * jamais lues sur ce chemin.
 */
function versMoteur(etat: EtatDes, mains?: Record<string, Face[]>): Partie {
  const joueurs: Joueur[] = etat.joueurs.map((uid) => ({
    id: uid,
    nom: nomDe(etat, uid),
    des: mains
      ? (mains[uid] ?? [])
      : (Array.from({ length: etat.des[uid] ?? 0 }, () => 6 as Face)),
    machine: false,
    elimine: etat.elimines.includes(uid),
  }));
  return {
    joueurs,
    tour: Math.max(0, etat.joueurs.indexOf(etat.tour)),
    mise: etat.mise
      ? { quantite: etat.mise.quantite, face: etat.mise.face, parId: etat.mise.parUid }
      : null,
    phase: 'annonces',
    manche: etat.manche,
    journal: [],
  };
}

export function peutAnnoncer(etat: EtatDes, uid: string, quantite: number, face: Face): boolean {
  if (etat.phase !== 'annonces' || etat.tour !== uid) return false;
  if (!toutLeMondeAScelle(etat)) return false;
  return miseValide(etat.mise, quantite, face, totalDes(etat));
}

export function apresAnnonce(etat: EtatDes, quantite: number, face: Face): EtatDes {
  if (!peutAnnoncer(etat, etat.tour, quantite, face)) return etat;
  const apres = annoncerMoteur(versMoteur(etat), quantite, face);
  return {
    ...etat,
    mise: { quantite, face, parUid: etat.tour },
    tour: etat.joueurs[apres.tour],
    journal: [...etat.journal, ...apres.journal],
  };
}

/**
 * Range le verdict rendu par le moteur dans l'état partagé.
 *
 * Le moteur décide qui perd un dé; nous décidons seulement quand la
 * partie s'arrête, et ce n'est plus la même condition qu'en solo.
 */
function verdict(
  etat: EtatDes,
  apres: Partie,
  mains: Record<string, Face[]>,
): EtatDes {
  const d = apres.devoilement;
  if (!d || !etat.mise) return etat;

  const des = { ...etat.des };
  apres.joueurs.forEach((j) => {
    // Un joueur dont la main manque garde son compte : il ne doit pas
    // être éliminé par une absence de document. La barrière des mains
    // scellées rend le cas très improbable, la prudence ne coûte rien.
    if (mains[j.id]) des[j.id] = j.des.length;
  });
  const elimines = etat.joueurs.filter((u) => (des[u] ?? 0) === 0);
  const debout = etat.joueurs.filter((u) => !elimines.includes(u));

  return {
    ...etat,
    des,
    elimines,
    phase: debout.length <= 1 ? 'fini' : 'devoilement',
    gagnant: debout.length === 1 ? debout[0] : null,
    devoilement: {
      doutePar: d.doutePar,
      contre: d.contre,
      mise: etat.mise,
      compte: d.compte,
      perdantUid: d.perdantId,
      gagnantDeUid: d.gagnantDeId ?? null,
      exact: !!d.exact,
      mainsLevees: mains,
    },
    journal: [...etat.journal, ...apres.journal],
  };
}

/** « Menteur ! » : les gobelets se lèvent et quelqu'un perd un dé. */
export function apresDoute(etat: EtatDes, mains: Record<string, Face[]>): EtatDes {
  if (etat.phase !== 'annonces' || !etat.mise) return etat;
  return verdict(etat, douterMoteur(versMoteur(etat, mains)), mains);
}

/** « C'est exactement ça » : le pari du calzar, qui rend un dé perdu. */
export function apresExact(etat: EtatDes, mains: Record<string, Face[]>): EtatDes {
  if (etat.phase !== 'annonces' || !etat.mise) return etat;
  return verdict(etat, exactMoteur(versMoteur(etat, mains)), mains);
}

/** Nouvelle manche : les gobelets se referment et chacun relance chez
 *  lui. Le perdant de la manche précédente ouvre les annonces, et un
 *  exact réussi rend la main à celui qui l'a appelé. */
export function apresManche(etat: EtatDes): EtatDes {
  if (etat.phase !== 'devoilement') return etat;
  const d = etat.devoilement;
  const debout = (u?: string | null) => !!u && !etat.elimines.includes(u);
  const ouvreur = debout(d?.perdantUid) ? d!.perdantUid!
    : debout(d?.doutePar) ? d!.doutePar
    : vivants(etat)[0];
  return {
    ...etat,
    mise: null,
    phase: 'annonces',
    manche: etat.manche + 1,
    mainsPretes: [],
    devoilement: null,
    tour: ouvreur,
    journal: [...etat.journal, `Manche ${etat.manche + 1} : les gobelets se referment.`],
  };
}

/**
 * Le sablier a coulé jusqu'au bout.
 *
 * Deux silences possibles. Ou bien quelqu'un n'a pas encore scellé sa
 * main, et la manche entière attend après lui : sa place se libère et
 * la partie repart sans lui. Ou bien tout le monde a scellé et c'est
 * le joueur du tour qui s'est tu : il laisse passer son tour et la
 * parole va à son voisin.
 */
export function apresAbsence(etat: EtatDes): EtatDes {
  if (etat.phase === 'fini') return etat;

  const muets = vivants(etat).filter((u) => !etat.mainsPretes.includes(u));
  if (muets.length > 0) {
    const des = { ...etat.des };
    muets.forEach((u) => { des[u] = 0; });
    const elimines = [...etat.elimines, ...muets];
    const debout = etat.joueurs.filter((u) => !elimines.includes(u));
    return {
      ...etat,
      des,
      elimines,
      phase: debout.length <= 1 ? 'fini' : etat.phase,
      gagnant: debout.length === 1 ? debout[0] : null,
      tour: elimines.includes(etat.tour) ? (debout[0] ?? etat.tour) : etat.tour,
      journal: [
        ...etat.journal,
        ...muets.map((u) => `${nomDe(etat, u)} a quitté la table.`),
      ],
    };
  }

  if (etat.phase !== 'annonces') return etat;
  const suivant = suivantVivant(etat, etat.tour);
  return {
    ...etat,
    tour: suivant,
    journal: [...etat.journal, `${nomDe(etat, etat.tour)} laisse passer son tour.`],
  };
}

/** Quitter la partie de son plein gré. */
export function apresAbandon(etat: EtatDes, uid: string): EtatDes {
  if (etat.elimines.includes(uid)) return etat;
  const des = { ...etat.des, [uid]: 0 };
  const elimines = [...etat.elimines, uid];
  const debout = etat.joueurs.filter((u) => !elimines.includes(u));
  return {
    ...etat,
    des,
    elimines,
    abandon: uid,
    phase: debout.length <= 1 ? 'fini' : etat.phase,
    gagnant: debout.length === 1 ? debout[0] : null,
    tour: etat.tour === uid ? (debout[0] ?? etat.tour) : etat.tour,
    journal: [...etat.journal, `${nomDe(etat, uid)} quitte la partie.`],
  };
}
