// ─── Les dés du menteur ─────────────────────────────────────────────
// Le jeu que l'Église défendait : on cache ses dés sous le gobelet, on
// annonce plus haut que le voisin, et le premier qui doute découvre qui
// mentait. Règles dites de Perudo, les plus jouées : l'as est joker,
// sauf dans une annonce d'as.
//
// Ce fichier ne connaît ni la 3D ni React : c'est le règlement, rien
// d'autre, et il se vérifie tout seul (tools/des-check.mjs).

export type Face = 1 | 2 | 3 | 4 | 5 | 6;

export interface Joueur {
  id: string;
  nom: string;
  /** Les dés encore en jeu, tels qu'ils sont tombés. */
  des: Face[];
  /** Un adversaire tenu par la maison. */
  machine: boolean;
  /** Sorti du jeu quand il n'a plus un seul dé. */
  elimine: boolean;
}

export interface Mise {
  quantite: number;
  face: Face;
  /** Qui l'a annoncée. */
  parId: string;
}

export type Phase = 'annonces' | 'devoilement' | 'fini';

export interface Partie {
  joueurs: Joueur[];
  /** Indice du joueur à qui c'est le tour. */
  tour: number;
  mise: Mise | null;
  phase: Phase;
  manche: number;
  /** Ce qui s'est dit à voix haute, pour l'affichage. */
  journal: string[];
  /** Rempli au dévoilement. */
  devoilement?: {
    doutePar: string;
    contre: string;
    mise: Mise;
    compte: number;
    /** Vide quand personne ne perd de dé (un exact réussi). */
    perdantId: string | null;
    /** Qui récupère un dé, s'il y a lieu. */
    gagnantDeId?: string;
    /** L'appel était « c'est exactement ça » et non « menteur ». */
    exact?: boolean;
  };
  gagnantId?: string;
}

export const DES_AU_DEPART = 5;

const hasard = (n: number) => Math.floor(Math.random() * n);
export const lancerUnDe = (): Face => ((hasard(6) + 1) as Face);

export function lancerLesDes(nb: number): Face[] {
  return Array.from({ length: nb }, lancerUnDe);
}

export function nouvellePartie(noms: Array<{ nom: string; machine: boolean }>): Partie {
  const joueurs: Joueur[] = noms.map((n, i) => ({
    id: `j${i}`,
    nom: n.nom,
    des: lancerLesDes(DES_AU_DEPART),
    machine: n.machine,
    elimine: false,
  }));
  return {
    joueurs,
    tour: 0,
    mise: null,
    phase: 'annonces',
    manche: 1,
    journal: [],
  };
}

/** Tous les dés encore sur la table. */
export const desEnJeu = (p: Partie): number =>
  p.joueurs.filter((j) => !j.elimine).reduce((n, j) => n + j.des.length, 0);

/**
 * Compte les dés qui valident une annonce. L'as compte pour toutes les
 * faces, sauf quand l'annonce elle-même porte sur les as.
 */
export function compter(p: Partie, face: Face): number {
  return p.joueurs
    .filter((j) => !j.elimine)
    .reduce(
      (n, j) => n + j.des.filter((d) => d === face || (face !== 1 && d === 1)).length,
      0,
    );
}

/** Une annonce doit monter : plus de dés, ou la même quantité plus haut. */
export function miseValide(precedente: Mise | null, quantite: number, face: Face, total: number): boolean {
  if (quantite < 1 || quantite > total) return false;
  if (face < 1 || face > 6) return false;
  if (!precedente) return true;
  if (quantite > precedente.quantite) return true;
  if (quantite === precedente.quantite && face > precedente.face) return true;
  return false;
}

const suivantVivant = (p: Partie, depuis: number): number => {
  let i = depuis;
  for (let k = 0; k < p.joueurs.length; k++) {
    i = (i + 1) % p.joueurs.length;
    if (!p.joueurs[i].elimine) return i;
  }
  return depuis;
};

export function annoncer(p: Partie, quantite: number, face: Face): Partie {
  if (p.phase !== 'annonces') return p;
  const joueur = p.joueurs[p.tour];
  if (!miseValide(p.mise, quantite, face, desEnJeu(p))) return p;
  return {
    ...p,
    mise: { quantite, face, parId: joueur.id },
    tour: suivantVivant(p, p.tour),
    journal: [...p.journal, `${joueur.nom} annonce ${quantite} × ${face}`],
  };
}

/** « Menteur ! » : on retourne les gobelets et quelqu'un perd un dé. */
export function douter(p: Partie): Partie {
  if (p.phase !== 'annonces' || !p.mise) return p;
  const douteur = p.joueurs[p.tour];
  const annonceur = p.joueurs.find((j) => j.id === p.mise!.parId)!;
  const compte = compter(p, p.mise.face);
  const menteur = compte < p.mise.quantite;
  const perdant = menteur ? annonceur : douteur;

  const joueurs = p.joueurs.map((j) =>
    j.id === perdant.id ? { ...j, des: j.des.slice(0, -1) } : j,
  );
  const apres = joueurs.map((j) => ({ ...j, elimine: j.des.length === 0 }));
  const restants = apres.filter((j) => !j.elimine);

  return {
    ...p,
    joueurs: apres,
    phase: restants.length <= 1 ? 'fini' : 'devoilement',
    gagnantId: restants.length === 1 ? restants[0].id : undefined,
    devoilement: {
      doutePar: douteur.id,
      contre: annonceur.id,
      mise: p.mise,
      compte,
      perdantId: perdant.id,
    },
    journal: [
      ...p.journal,
      `${douteur.nom} crie « menteur ! »`,
      `La table comptait ${compte} dé${compte > 1 ? 's' : ''} de ${p.mise.face}, `
        + `et ${annonceur.nom} en annonçait ${p.mise.quantite}. ${perdant.nom} perd un dé.`,
    ],
  };
}

/**
 * « C'est exactement ça » : le pari du calzar.
 *
 * Au lieu de crier au menteur, on annonce que la mise tombe pile. Si
 * le compte est exactement celui annoncé, on récupère un dé perdu (le
 * gobelet ne dépasse jamais cinq). Sinon, on en perd un. Règle du
 * Perudo, demandée par Alex le 2026-08-23.
 */
export function exact(p: Partie): Partie {
  if (p.phase !== 'annonces' || !p.mise) return p;
  const appelant = p.joueurs[p.tour];
  const compte = compter(p, p.mise.face);
  const juste = compte === p.mise.quantite;

  const joueurs = p.joueurs.map((j) => {
    if (j.id !== appelant.id) return j;
    if (juste) {
      return j.des.length >= DES_AU_DEPART ? j : { ...j, des: [...j.des, lancerUnDe()] };
    }
    return { ...j, des: j.des.slice(0, -1) };
  });
  const apres = joueurs.map((j) => ({ ...j, elimine: j.des.length === 0 }));
  const restants = apres.filter((j) => !j.elimine);

  return {
    ...p,
    joueurs: apres,
    phase: restants.length <= 1 ? 'fini' : 'devoilement',
    gagnantId: restants.length === 1 ? restants[0].id : undefined,
    devoilement: {
      doutePar: appelant.id,
      contre: p.mise.parId,
      mise: p.mise,
      compte,
      exact: true,
      perdantId: juste ? null : appelant.id,
      gagnantDeId: juste ? appelant.id : undefined,
    },
    journal: [
      ...p.journal,
      `${appelant.nom} annonce « c’est exactement ça ! »`,
      juste
        ? `La table comptait bien ${compte} dé${compte > 1 ? 's' : ''} de ${p.mise.face}. `
            + `${appelant.nom} reprend un dé.`
        : `La table comptait ${compte} dé${compte > 1 ? 's' : ''} de ${p.mise.face}, `
            + `et l'annonce en promettait ${p.mise.quantite}. ${appelant.nom} perd un dé.`,
    ],
  };
}

/** Nouvelle manche : on relance, et le perdant ouvre les annonces. */
export function mancheSuivante(p: Partie): Partie {
  if (p.phase !== 'devoilement') return p;
  const perdantId = p.devoilement?.perdantId;
  const joueurs = p.joueurs.map((j) =>
    j.elimine ? j : { ...j, des: lancerLesDes(j.des.length) },
  );
  // Un exact réussi ne fait perdre personne : la main revient alors à
  // celui qui a appelé, comme au Perudo.
  const ouvreur = perdantId || p.devoilement?.doutePar;
  let tour = joueurs.findIndex((j) => j.id === ouvreur && !j.elimine);
  if (tour < 0) tour = joueurs.findIndex((j) => !j.elimine);
  return {
    ...p,
    joueurs,
    tour,
    mise: null,
    phase: 'annonces',
    manche: p.manche + 1,
    devoilement: undefined,
    journal: [...p.journal, `Manche ${p.manche + 1} : les gobelets se referment.`],
  };
}

// ─── L'adversaire tenu par la maison ────────────────────────────────
// Il compte ce qu'il voit, estime ce qu'il ne voit pas, et ment juste
// ce qu'il faut. Pas d'omniscience : il ne connaît que ses propres dés.

const probaAuMoins = (inconnus: number, cible: number, chance: number): number => {
  // Probabilité binomiale d'avoir AU MOINS `cible` succès.
  let p = 0;
  for (let k = cible; k <= inconnus; k++) {
    let c = 1;
    for (let i = 0; i < k; i++) c = (c * (inconnus - i)) / (i + 1);
    p += c * Math.pow(chance, k) * Math.pow(1 - chance, inconnus - k);
  }
  return Math.min(1, Math.max(0, p));
};

export interface CoupMachine {
  action: 'annonce' | 'doute';
  quantite?: number;
  face?: Face;
}

export function coupDeLaMachine(p: Partie): CoupMachine {
  const moi = p.joueurs[p.tour];
  const total = desEnJeu(p);
  const inconnus = total - moi.des.length;
  const chance = 1 / 3; // la face visée ou un as

  const compteChezMoi = (face: Face) =>
    moi.des.filter((d) => d === face || (face !== 1 && d === 1)).length;

  if (p.mise) {
    const manquants = Math.max(0, p.mise.quantite - compteChezMoi(p.mise.face));
    const credibilite = probaAuMoins(inconnus, manquants, p.mise.face === 1 ? 1 / 6 : chance);
    // Sous 22 % de chances que l'annonce tienne, on crie au menteur.
    if (credibilite < 0.22) return { action: 'doute' };
  }

  // Sinon on monte, sur la face qu'on a le plus en main.
  const faces: Face[] = [2, 3, 4, 5, 6, 1];
  let meilleure: Face = 2;
  let meilleurCompte = -1;
  for (const f of faces) {
    const c = compteChezMoi(f);
    if (c > meilleurCompte) { meilleurCompte = c; meilleure = f; }
  }

  const plancher = p.mise ? p.mise.quantite : Math.max(1, Math.round(total / 3));
  let quantite = plancher;
  let face = meilleure;
  if (p.mise) {
    if (meilleure > p.mise.face && miseValide(p.mise, p.mise.quantite, meilleure, total)) {
      quantite = p.mise.quantite;
    } else {
      quantite = p.mise.quantite + 1;
      if (quantite > total) return { action: 'doute' };
    }
  }
  if (!miseValide(p.mise, quantite, face, total)) {
    // Dernier recours : une face plus haute à quantité égale, sinon doute.
    const plusHaute = ([6, 5, 4, 3, 2] as Face[]).find((f) =>
      miseValide(p.mise, p.mise ? p.mise.quantite : 1, f, total));
    if (plusHaute) { quantite = p.mise ? p.mise.quantite : 1; face = plusHaute; }
    else return { action: 'doute' };
  }
  return { action: 'annonce', quantite, face };
}
