// ─── Le Cul de chouette ─────────────────────────────────────────────
// Le jeu de dés de Kaamelott (Alexandre Astier), tel que les joueurs
// l'ont mis par écrit depuis : trois dés, deux chouettes puis le cul,
// et le premier à 343 points gagne (C-D-C : troisième, quatrième et
// troisième lettres de l'alphabet). Le règlement suivi est celui des
// « Règles du Cul de Chouette » (desmu.fr) recoupé avec Wikilivres.
//
// Ce fichier ne connaît ni la 3D ni React : c'est le règlement, rien
// d'autre, et regles.test.ts le vérifie.

export type Face = 1 | 2 | 3 | 4 | 5 | 6;

export const CIBLE = 343;
export const BEVUE = 10;
/** Le parieur d'un sirotage paie 5 et touche 20 s'il a nommé la bonne face. */
export const MISE_PARI = 5;
export const GAIN_PARI = 20;
/** La grelottine, jouée sur le seul défi autorisé ici : le Cul de chouette, à 16 %. */
export const COEFF_GRELOTTINE = 0.16;

/** Les faces telles qu'on les annonce quand quelqu'un sirote. */
export const OISEAUX: Record<Face, string> = {
  1: 'Linotte', 2: 'Alouette', 3: 'Fauvette', 4: 'Mouette', 5: 'Bergeronnette', 6: 'Chouette',
};

export type TypeCombinaison =
  | 'cul' | 'chouette-velute' | 'velute' | 'chouette' | 'suite' | 'soufflette' | 'neant';

export interface Combinaison {
  type: TypeCombinaison;
  /** La valeur qui compte : celle de la chouette, de la velute ou du cul. */
  valeur: Face;
  /** Ce que le lanceur touche tout de suite. Zéro pour ce qui se joue au réflexe ou au défi. */
  points: number;
  /** La suite 1-2-3 est aussi une velute de 3 : dix-huit points au lanceur. */
  velute?: number;
}

export interface Joueur {
  id: string;
  nom: string;
  machine: boolean;
  score: number;
  /** Gagnée sur un néant, dépensée sur un défi. Une seule à la fois. */
  grelottine: boolean;
}

export type Phase =
  | 'attente'      // à qui de lancer
  | 'sirop'        // le lanceur a une chouette : sirote-t-il ?
  | 'reflexe'      // suite ou chouette-velute : le premier (ou le dernier) à crier
  | 'soufflette'   // 4-2-1 : le lanceur défie quelqu'un, ou passe
  | 'grelottine'   // un néant : un porteur de grelottine peut défier
  | 'fini';

export interface Reflexe {
  type: 'suite' | 'pasmou';
  points: number;
  /** Ceux qui ont déjà crié, dans l'ordre. */
  ordre: string[];
}

export interface Partie {
  joueurs: Joueur[];
  tour: number;
  phase: Phase;
  des: Face[];
  combinaison: Combinaison | null;
  reflexe: Reflexe | null;
  journal: string[];
  gagnantId?: string;
  /** Le nombre de tours joués, pour l'affichage. */
  manche: number;
}

const hasard = (n: number) => Math.floor(Math.random() * n);
export const lancerUnDe = (): Face => ((hasard(6) + 1) as Face);
export const lancerTroisDes = (): Face[] => [lancerUnDe(), lancerUnDe(), lancerUnDe()];

export const pointsChouette = (v: Face) => v * v;
export const pointsVelute = (v: Face) => 2 * v * v;
export const pointsCul = (v: Face) => 40 + 10 * v;

/** Le règlement des trois dés, sans tenir compte de l'ordre du tirage. */
export function combinaison(des: Face[]): Combinaison {
  const [a, b, c] = [...des].sort((x, y) => x - y) as Face[];
  if (a === b && b === c) return { type: 'cul', valeur: a, points: pointsCul(a) };
  const veluteDe = (x: Face, y: Face, z: Face) => (x + y === z ? z : 0);
  const velute = (veluteDe(a, b, c) || 0) as Face | 0;
  const paire: Face | 0 = a === b ? a : b === c ? b : 0;
  if (paire && velute) return { type: 'chouette-velute', valeur: velute, points: pointsVelute(velute) };
  if (b === a + 1 && c === b + 1) {
    return { type: 'suite', valeur: c, points: 0, velute: velute ? pointsVelute(velute) : undefined };
  }
  if (velute) return { type: 'velute', valeur: velute, points: pointsVelute(velute) };
  if (paire) return { type: 'chouette', valeur: paire, points: pointsChouette(paire) };
  if (a === 1 && b === 2 && c === 4) return { type: 'soufflette', valeur: 4, points: 0 };
  return { type: 'neant', valeur: c, points: 0 };
}

export function nomCombinaison(c: Combinaison, fr: boolean): string {
  switch (c.type) {
    case 'cul': return fr ? `Cul de chouette de ${c.valeur}` : `Cul de chouette of ${c.valeur}`;
    case 'chouette-velute': return fr ? `Chouette-velute de ${c.valeur}` : `Chouette-velute of ${c.valeur}`;
    case 'velute': return fr ? `Velute de ${c.valeur}` : `Velute of ${c.valeur}`;
    case 'chouette': return fr ? `Chouette de ${c.valeur}` : `Chouette of ${c.valeur}`;
    case 'suite': return fr ? 'Suite' : 'Run';
    case 'soufflette': return fr ? 'Soufflette' : 'Soufflette';
    default: return fr ? 'Néant' : 'Nothing';
  }
}

export function nouvellePartie(noms: Array<{ nom: string; machine: boolean }>): Partie {
  return {
    joueurs: noms.map((n, i) => ({ id: `j${i}`, nom: n.nom, machine: n.machine, score: 0, grelottine: false })),
    tour: 0,
    phase: 'attente',
    des: [],
    combinaison: null,
    reflexe: null,
    journal: [],
    manche: 0,
  };
}

const joueur = (p: Partie, id: string) => p.joueurs.find((j) => j.id === id)!;

function crediter(p: Partie, id: string, points: number) {
  joueur(p, id).score += points;
}

function copie(p: Partie): Partie {
  return { ...p, joueurs: p.joueurs.map((j) => ({ ...j })), journal: [...p.journal], des: [...p.des] };
}

/** La victoire se constate quand un tour est fini, jamais au milieu d'un pari. */
function verifierFin(p: Partie): Partie {
  const g = p.joueurs.find((j) => j.score >= CIBLE);
  if (g) { p.phase = 'fini'; p.gagnantId = g.id; }
  return p;
}

/** Le tour passe au suivant, et la partie se termine si quelqu'un a 343. */
export function tourSuivant(partie: Partie): Partie {
  const p = copie(partie);
  verifierFin(p);
  if (p.phase === 'fini') return p;
  p.tour = (p.tour + 1) % p.joueurs.length;
  p.phase = 'attente';
  p.des = [];
  p.combinaison = null;
  p.reflexe = null;
  p.manche += 1;
  return p;
}

/**
 * Le lanceur jette ses trois dés (les deux chouettes, puis le cul). Les
 * points sûrs se créditent tout de suite; ce qui se joue au réflexe, au
 * sirop ou au défi ouvre la phase correspondante.
 */
export function lancer(partie: Partie, des: Face[] = lancerTroisDes(), fr = true): Partie {
  const p = copie(partie);
  const moi = p.joueurs[p.tour];
  p.des = des;
  const c = combinaison(des);
  p.combinaison = c;
  p.journal.push(`${moi.nom} : ${des.join('-')}, ${nomCombinaison(c, fr).toLowerCase()}.`);
  switch (c.type) {
    case 'cul':
    case 'velute':
      crediter(p, moi.id, c.points);
      p.phase = 'attente';
      break;
    case 'chouette':
      crediter(p, moi.id, c.points);
      p.phase = 'sirop';
      break;
    case 'chouette-velute':
      p.reflexe = { type: 'pasmou', points: c.points, ordre: [] };
      p.phase = 'reflexe';
      break;
    case 'suite':
      if (c.velute) crediter(p, moi.id, c.velute);
      p.reflexe = { type: 'suite', points: BEVUE, ordre: [] };
      p.phase = 'reflexe';
      break;
    case 'soufflette':
      p.phase = 'soufflette';
      break;
    default:
      if (!moi.grelottine) {
        moi.grelottine = true;
        p.journal.push(fr ? `${moi.nom} ramasse une grelottine.` : `${moi.nom} picks up a grelottine.`);
      }
      p.phase = p.joueurs.some((j) => j.id !== moi.id && j.grelottine && j.score > 0) && moi.score > 0
        ? 'grelottine'
        : 'attente';
  }
  return p;
}

/** Le lanceur garde sa chouette : le tour est fini. */
export function garder(partie: Partie): Partie {
  const p = copie(partie);
  p.phase = 'attente';
  return p;
}

export interface ResultatSirop {
  partie: Partie;
  de: Face;
  reussi: boolean;
}

/**
 * Le sirotage : le lanceur relance le cul pour transformer sa chouette
 * en cul de chouette. Réussi, il touche le cul; raté, il perd la
 * chouette qu'il venait de gagner. Les autres ont parié cinq points sur
 * une face, et le bon oiseau rapporte vingt.
 */
export function siroter(partie: Partie, paris: Record<string, Face>, de: Face = lancerUnDe(), fr = true): ResultatSirop {
  const p = copie(partie);
  const moi = p.joueurs[p.tour];
  const chouette = p.combinaison!.valeur;
  const reussi = de === chouette;
  if (reussi) {
    crediter(p, moi.id, pointsCul(chouette));
    p.des = [chouette, chouette, chouette];
    p.combinaison = { type: 'cul', valeur: chouette, points: pointsCul(chouette) };
    p.journal.push(fr ? `${moi.nom} sirote ${OISEAUX[de]} : cul de chouette de ${chouette} !` : `${moi.nom} sips ${OISEAUX[de]}: cul de chouette of ${chouette}!`);
  } else {
    crediter(p, moi.id, -pointsChouette(chouette));
    p.des = [chouette, chouette, de];
    p.journal.push(fr ? `${moi.nom} sirote ${OISEAUX[de]} et perd sa chouette de ${chouette}.` : `${moi.nom} sips ${OISEAUX[de]} and loses the chouette of ${chouette}.`);
  }
  for (const [id, face] of Object.entries(paris)) {
    if (id === moi.id) continue;
    crediter(p, id, -MISE_PARI);
    if (face === de) {
      crediter(p, id, GAIN_PARI);
      p.journal.push(fr ? `${joueur(p, id).nom} avait dit ${OISEAUX[face]} : vingt points.` : `${joueur(p, id).nom} called ${OISEAUX[face]}: twenty points.`);
    }
  }
  p.phase = 'attente';
  return { partie: p, de, reussi };
}

/**
 * Quelqu'un crie. Sur une chouette-velute, le premier touche les points.
 * Sur une suite, on attend que tout le monde ait crié : le dernier
 * perd dix. Crier hors de propos est une bévue à dix points.
 */
export function crier(partie: Partie, id: string, quoi: 'suite' | 'pasmou', fr = true): Partie {
  const p = copie(partie);
  const qui = joueur(p, id);
  if (p.phase !== 'reflexe' || !p.reflexe || p.reflexe.type !== quoi) {
    crediter(p, id, -BEVUE);
    p.journal.push(fr ? `${qui.nom} crie sans raison : bévue, dix points.` : `${qui.nom} shouts for nothing: blunder, ten points.`);
    return p;
  }
  if (p.reflexe.ordre.includes(id)) return p;
  p.reflexe.ordre.push(id);
  if (quoi === 'pasmou') {
    crediter(p, id, p.reflexe.points);
    p.journal.push(fr ? `${qui.nom} : « Pas mou le caillou ! » ${p.reflexe.points} points.` : `${qui.nom}: "Pas mou le caillou!" ${p.reflexe.points} points.`);
    p.phase = 'attente';
    p.reflexe = null;
  } else if (p.reflexe.ordre.length === p.joueurs.length) {
    const dernier = joueur(p, p.reflexe.ordre[p.reflexe.ordre.length - 1]);
    crediter(p, dernier.id, -BEVUE);
    p.journal.push(fr ? `${dernier.nom} a crié en dernier : moins dix.` : `${dernier.nom} shouted last: minus ten.`);
    p.phase = 'attente';
    p.reflexe = null;
  }
  return p;
}

/** Sur une suite, ceux qui n'ont pas crié à temps sont réputés derniers : un seul perd dix. */
export function clorReflexe(partie: Partie, fr = true): Partie {
  const p = copie(partie);
  if (p.phase !== 'reflexe' || !p.reflexe) return p;
  if (p.reflexe.type === 'suite') {
    const muets = p.joueurs.filter((j) => !p.reflexe!.ordre.includes(j.id));
    const dernier = muets[muets.length - 1] ?? joueur(p, p.reflexe.ordre[p.reflexe.ordre.length - 1]);
    crediter(p, dernier.id, -BEVUE);
    p.journal.push(fr ? `${dernier.nom} n'a pas crié : moins dix.` : `${dernier.nom} did not shout: minus ten.`);
  } else {
    p.journal.push(fr ? 'Personne n’a crié : la chouette-velute reste sur la table.' : 'Nobody shouted: the chouette-velute stays on the table.');
  }
  p.phase = 'attente';
  p.reflexe = null;
  return p;
}

export const GAINS_SOUFFLETTE = [50, 40, 30] as const;

export interface ResultatSoufflette {
  partie: Partie;
  /** Les trois jets du défié, tels qu'ils sont tombés. */
  jets: Face[][];
  reussiAu: number | null;
}

/**
 * La soufflette : le défié a trois jets pour faire 4-2-1 à son tour, en
 * gardant les dés déjà bons. Du premier coup, cinquante; du deuxième,
 * quarante; du troisième, trente, que le défiant perd. Raté, le défié
 * perd trente et le défiant les gagne.
 */
export function soufflette(partie: Partie, defieId: string, jets?: Face[][], fr = true): ResultatSoufflette {
  const p = copie(partie);
  const defiant = p.joueurs[p.tour];
  const defie = joueur(p, defieId);
  const gardes: Face[] = [];
  const tous: Face[][] = [];
  let reussiAu: number | null = null;
  for (let essai = 0; essai < 3 && reussiAu === null; essai++) {
    const manquants = ([4, 2, 1] as Face[]).filter((f) => !gardes.includes(f));
    const nouveaux = jets?.[essai] ?? manquants.map(() => lancerUnDe());
    const jet = [...gardes, ...nouveaux];
    tous.push(jet);
    for (const f of manquants) {
      const k = nouveaux.indexOf(f);
      if (k >= 0) { gardes.push(f); nouveaux.splice(k, 1); }
    }
    if (gardes.length === 3) reussiAu = essai;
  }
  if (reussiAu !== null) {
    const g = GAINS_SOUFFLETTE[reussiAu];
    crediter(p, defie.id, g);
    crediter(p, defiant.id, -g);
    p.journal.push(fr ? `${defie.nom} fait 4-2-1 au jet ${reussiAu + 1} : ${g} points pris à ${defiant.nom}.` : `${defie.nom} makes 4-2-1 on roll ${reussiAu + 1}: ${g} points taken from ${defiant.nom}.`);
  } else {
    crediter(p, defie.id, -30);
    crediter(p, defiant.id, 30);
    p.journal.push(fr ? `${defie.nom} rate la soufflette : trente points à ${defiant.nom}.` : `${defie.nom} fails the soufflette: thirty points to ${defiant.nom}.`);
  }
  p.phase = 'attente';
  return { partie: p, jets: tous, reussiAu };
}

/** Le lanceur d'une soufflette ne défie personne, ou personne ne relève un néant. */
export function passer(partie: Partie): Partie {
  const p = copie(partie);
  p.phase = 'attente';
  return p;
}

/** La mise d'un défi grelottine : 16 % du plus petit des deux scores, arrondi. */
export function miseGrelottine(defiant: Joueur, defie: Joueur): number {
  return Math.max(1, Math.round(Math.min(defiant.score, defie.score) * COEFF_GRELOTTINE));
}

export interface ResultatGrelottine {
  partie: Partie;
  des: Face[];
  reussi: boolean;
}

/**
 * Le défi grelottine, dans sa forme simple : celui qui vient de faire un
 * néant doit sortir un cul de chouette en un jet. Réussi, il touche la
 * mise et le défiant la perd; raté, l'inverse. Le défié garde en plus
 * les points de ce qu'il a réellement fait. Les deux grelottines s'en vont.
 */
export function grelottine(partie: Partie, defiantId: string, des: Face[] = lancerTroisDes(), fr = true): ResultatGrelottine {
  const p = copie(partie);
  const defie = p.joueurs[p.tour];
  const defiant = joueur(p, defiantId);
  const mise = miseGrelottine(defiant, defie);
  const c = combinaison(des);
  const reussi = c.type === 'cul';
  crediter(p, defie.id, c.points + (c.velute ?? 0));
  if (reussi) {
    crediter(p, defie.id, mise);
    crediter(p, defiant.id, -mise);
    p.journal.push(fr ? `${defie.nom} relève la grelottine de ${defiant.nom} : ${des.join('-')}, ${mise} points.` : `${defie.nom} answers ${defiant.nom}'s grelottine: ${des.join('-')}, ${mise} points.`);
  } else {
    crediter(p, defie.id, -mise);
    crediter(p, defiant.id, mise);
    p.journal.push(fr ? `${defie.nom} manque la grelottine : ${des.join('-')}, ${mise} points à ${defiant.nom}.` : `${defie.nom} misses the grelottine: ${des.join('-')}, ${mise} points to ${defiant.nom}.`);
  }
  defie.grelottine = false;
  defiant.grelottine = false;
  p.des = des;
  p.combinaison = c;
  p.phase = 'attente';
  return { partie: p, des, reussi };
}
