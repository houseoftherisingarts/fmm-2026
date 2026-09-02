// ─── Les dés du menteur : l'adversaire qui compte et qui ment ───────
// Alex, 2026-09-01 : « l'IA qui contrôle les jeux est vraiment très
// mauvaise. » Aux dés, le défaut avait un nom. La maison criait au
// menteur sous 22 % de crédibilité, un seuil fixe qui ne regardait ni
// le nombre de joueurs, ni le nombre de dés encore sur la table, ni ce
// qu'elle risquait en se trompant. Et elle n'appelait jamais le
// calzar, le seul coup du jeu qui rend un dé déjà perdu.
//
// Il n'y a pas d'arbre à explorer ici : personne ne voit la main du
// voisin, et le moteur commun de `moteur/recherche.ts` ne sert donc à
// rien. Ce qui remplace la recherche, c'est la loi binomiale sur les
// dés inconnus, une valeur posée sur chacune des trois options, et le
// choix de la meilleure des trois. L'échelle de force, elle, reste
// celle des trois plateaux : les dix marches nommées de
// `moteur/niveaux.ts` donnent la bévue et le flou, pour qu'un Sergent
// aux dés vaille à peu près un Sergent à la mérelle.
//
// Le règlement de la maison ne connaît pas le palifico : aucune manche
// à un dé ne change le compte des as, et ce fichier n'invente pas la
// règle. L'as reste joker partout, sauf quand l'annonce porte sur les
// as (voir `compter` dans ./regles).

import {
  DES_AU_DEPART, desEnJeu, miseValide,
  type Face, type Partie,
} from './regles';
import { auHasard, piocher, type Alea } from '../moteur/hasard';
import { NIVEAUX, NIVEAUX_POSSIBLES, nomNiveau, type Niveau } from '../moteur/niveaux';

// ─── La loi binomiale sur les dés que je ne vois pas ────────────────

/** La chance qu'un dé inconnu valide une annonce sur cette face. L'as
 *  est joker, sauf quand c'est lui qu'on annonce. */
export const chanceDe = (face: Face): number => (face === 1 ? 1 / 6 : 1 / 3);

const combinaison = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0;
  let c = 1;
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1);
  return c;
};

// Le banc d'essai redemande la même probabilité des dizaines de
// milliers de fois, sur une poignée de valeurs. Nous la gardons.
const tableProba = new Map<string, number>();

/** Probabilité que EXACTEMENT `k` des `inconnus` dés valident la face. */
export function probaExactement(inconnus: number, k: number, chance: number): number {
  if (k < 0 || k > inconnus) return 0;
  return combinaison(inconnus, k) * Math.pow(chance, k) * Math.pow(1 - chance, inconnus - k);
}

/** Probabilité qu'AU MOINS `k` des `inconnus` dés valident la face.
 *  Un besoin nul ou négatif veut dire que je tiens l'annonce à moi
 *  seul : elle est certaine, et rien ne la fera tomber. */
export function probaAuMoins(inconnus: number, k: number, chance: number): number {
  if (k <= 0) return 1;
  if (k > inconnus) return 0;
  const cle = `${inconnus}|${k}|${chance}`;
  const vu = tableProba.get(cle);
  if (vu !== undefined) return vu;
  let p = 0;
  for (let i = k; i <= inconnus; i++) p += probaExactement(inconnus, i, chance);
  const r = Math.min(1, Math.max(0, p));
  tableProba.set(cle, r);
  return r;
}

// ─── La mémoire courte de la table ──────────────────────────────────
// Une annonce ne se juge pas seulement sur les dés : elle se juge sur
// la personne qui la fait. Celui qui monte de trois dés à chaque tour
// ment plus souvent que celui qui monte d'un, et celui qui crie
// « menteur ! » à la première occasion oblige à rester crédible. Nous
// gardons ces deux traits et rien d'autre, parce que la mémoire longue
// d'un joueur de dés est une illusion.

export interface MemoireDes {
  /** Par joueur, de combien ses annonces dépassent ce que la table
   *  peut normalement porter, en part du total des dés. */
  audace: Record<string, number>;
  /** Combien de fois chacun a crié au menteur. */
  doutes: Record<string, number>;
  /** Combien d'annonces nous lui avons entendu faire. */
  annonces: Record<string, number>;
  /** Ce qui est déjà noté, pour ne pas compter deux fois la même chose. */
  vu: Set<string>;
}

export const memoireNeuve = (): MemoireDes => ({
  audace: {}, doutes: {}, annonces: {}, vu: new Set<string>(),
});

/**
 * Range dans la mémoire ce que l'état donne à voir.
 *
 * La machine l'appelle chaque fois qu'elle prend la parole. Le banc
 * d'essai l'appelle en plus au dévoilement, le seul moment où l'on
 * apprend qui a crié au menteur.
 */
export function observer(m: MemoireDes, p: Partie): void {
  const total = desEnJeu(p);
  if (p.mise) {
    const cle = `a${p.manche}:${p.mise.parId}:${p.mise.quantite}:${p.mise.face}`;
    if (!m.vu.has(cle)) {
      m.vu.add(cle);
      const neutre = total * chanceDe(p.mise.face);
      const ecart = (p.mise.quantite - neutre) / Math.max(1, total);
      m.audace[p.mise.parId] = (m.audace[p.mise.parId] ?? 0) * 0.6 + ecart * 0.4;
      m.annonces[p.mise.parId] = (m.annonces[p.mise.parId] ?? 0) + 1;
    }
  }
  const d = p.devoilement;
  if (d && !d.exact) {
    const cle = `d${p.manche}:${d.doutePar}`;
    if (!m.vu.has(cle)) {
      m.vu.add(cle);
      m.doutes[d.doutePar] = (m.doutes[d.doutePar] ?? 0) + 1;
    }
  }
}

/** Ce que la mémoire retire de crédibilité à un joueur trop pressé. Il
 *  faut l'avoir entendu trois fois avant d'en tirer quoi que ce soit. */
function audaceDe(m: MemoireDes | undefined, id: string): number {
  if (!m || (m.annonces[id] ?? 0) < 3) return 0;
  return Math.max(-0.25, Math.min(0.25, m.audace[id] ?? 0));
}

/** À quel point ce voisin est prompt à retourner les gobelets. */
function mefianceDe(m: MemoireDes | undefined, id: string): number {
  const vues = m ? (m.annonces[id] ?? 0) : 0;
  if (!m || vues < 2) return 0;
  return Math.min(1, (m.doutes[id] ?? 0) / vues);
}

// ─── Les dix marches, la même échelle que les plateaux ──────────────
// La bévue et la fenêtre viennent de `moteur/niveaux.ts` : le Marmiton
// des dés est distrait comme le Marmiton du tafl. Trois cadrans
// s'ajoutent, propres à un jeu où l'on ne voit pas la main d'en face :
//
//   patience  de combien la machine surestime ce qu'on lui annonce, ce
//             qui la fait douter deux tours trop tard;
//   cible     la crédibilité qu'elle vise en relançant. Basse, elle
//             promet plus qu'elle ne peut tenir;
//   bluff     la part de relances gonflées bien au-delà de la cible.

interface Temperament {
  bevue: number;
  flou: number;
  patience: number;
  bluff: number;
  cible: number;
  appelleExact: boolean;
}

// Le bluff est ce qui sépare vraiment les hautes marches : au banc
// d'essai, un connétable qui gonfle une annonce sur cinq perd contre
// celui qui n'en gonfle qu'une sur vingt.
const BLUFF: Record<Niveau, number> = {
  1: 0.55, 2: 0.48, 3: 0.42, 4: 0.36, 5: 0.30,
  6: 0.25, 7: 0.20, 8: 0.15, 9: 0.10, 10: 0.05,
};

// La cible du connétable sort du banc d'essai et non de l'intuition :
// mille parties de la machine contre elle-même ont fait perdre les
// relances gourmandes contre les relances mesurées, six fois sur dix.
// Viser haut veut dire monter d'un dé à la fois plutôt que d'écraser
// la table, ce qui laisse aussi les manches respirer.
//
// Relevé une seconde fois le 2026-09-01, mille parties par réglage,
// parce que le premier balayage se faisait mémoire allumée des deux
// côtés, ce qui aide bien plus le sergent que le connétable et écrase
// l'écart entre les hautes marches. Mesuré à mémoire égale, la cible
// du connétable ne plafonne pas à 0,90 : à 0,95 il passe de 90,3 à
// 93,4 % contre le sergent, de 58,7 à 63,5 % contre le capitaine et de
// 54,3 à 58,9 % contre le sénéchal. Au-delà, le plafond de
// `cibleVoulue` mord et plus rien ne bouge.
const CIBLE: Record<Niveau, number> = {
  1: 0.35, 2: 0.42, 3: 0.48, 4: 0.55, 5: 0.62,
  6: 0.68, 7: 0.74, 8: 0.80, 9: 0.85, 10: 0.95,
};

export function temperament(n: Niveau): Temperament {
  const r = NIVEAUX[n];
  return {
    bevue: r.bevue,
    flou: (r.fenetre / 400) * 0.3,
    patience: r.bevue * 0.45,
    bluff: BLUFF[n],
    cible: CIBLE[n],
    appelleExact: n >= 4,
  };
}

// Une relance ne tranche rien sur-le-champ : elle ne coûte un dé que
// si quelqu'un la contredit, plus tard. Ce poids ramène son résultat
// dans la monnaie du doute, qui se paie tout de suite, et c'est lui
// qui permet de comparer les deux. Réglé au banc d'essai, lui aussi.
const POIDS_D_UNE_RELANCE = 0.7;

// ─── Le choix du coup ───────────────────────────────────────────────

export type ActionDes = 'annonce' | 'doute' | 'exact';

export interface CoupDes {
  action: ActionDes;
  quantite?: number;
  face?: Face;
}

export interface OptionsDes {
  /** La mémoire de table, quand l'appelant en tient une. */
  memoire?: MemoireDes;
  /** L'appelant sait-il quoi faire d'un « c'est exactement ça » ? Le
   *  vieux `coupDeLaMachine` ne connaît que l'annonce et le doute. */
  autoriserExact?: boolean;
}

interface Annonce { quantite: number; face: Face }
interface AnnoncePesee extends Annonce { tenue: number }

const FACES: readonly Face[] = [1, 2, 3, 4, 5, 6];

/** Les annonces légales, sans les sauts que personne ne fait : monter
 *  de plus de trois dés d'un coup ne se voit pas à une vraie table, et
 *  allonger la liste ne ferait que ralentir le banc d'essai. */
function annoncesLegales(p: Partie, total: number): Annonce[] {
  const plafond = p.mise
    ? Math.min(total, p.mise.quantite + 3)
    : Math.min(total, Math.ceil(total / 3) + 2);
  const liste: Annonce[] = [];
  for (let q = 1; q <= plafond; q++) {
    for (const f of FACES) {
      if (miseValide(p.mise, q, f, total)) liste.push({ quantite: q, face: f });
    }
  }
  return liste;
}

/** La relance qui approche le mieux la crédibilité visée. À égalité,
 *  la face que je tiens le plus, puis la plus petite quantité. */
function meilleureAnnonce(
  liste: readonly Annonce[], cible: number, inconnus: number,
  chezMoi: (f: Face) => number,
): AnnoncePesee | null {
  let meilleure: AnnoncePesee | null = null;
  let meilleurScore = -Infinity;
  for (const a of liste) {
    const tenue = probaAuMoins(inconnus, a.quantite - chezMoi(a.face), chanceDe(a.face));
    const score = -Math.abs(tenue - cible) + chezMoi(a.face) * 0.02 - a.quantite * 0.001;
    if (score > meilleurScore) {
      meilleurScore = score;
      meilleure = { quantite: a.quantite, face: a.face, tenue };
    }
  }
  return meilleure;
}

/** Le voisin qui parlera juste après nous. */
function joueurSuivant(p: Partie): string {
  for (let k = 1; k <= p.joueurs.length; k++) {
    const j = p.joueurs[(p.tour + k) % p.joueurs.length];
    if (!j.elimine) return j.id;
  }
  return p.joueurs[p.tour].id;
}

/**
 * Le coup que joue la machine, à ce niveau, dans cette position.
 *
 * Elle ne connaît que ses propres dés : tout le reste est une loi de
 * probabilité sur les gobelets fermés. Les trois options se pèsent
 * dans la même monnaie, le dé, puis la meilleure se joue.
 */
export function choisirCoupDes(
  p: Partie, niveau: Niveau, alea: Alea = auHasard, o: OptionsDes = {},
): CoupDes {
  const moi = p.joueurs[p.tour];
  const total = desEnJeu(p);
  const inconnus = total - moi.des.length;
  const t = temperament(niveau);
  if (o.memoire) observer(o.memoire, p);

  const chezMoi = (f: Face): number =>
    moi.des.filter((d) => d === f || (f !== 1 && d === 1)).length;

  const legales = annoncesLegales(p, total);

  // La bévue : le marmiton parle avant d'avoir compté. Il monte au
  // hasard et ne songe même pas à retourner les gobelets.
  if (t.bevue > 0 && legales.length > 0 && alea() < t.bevue) {
    const a = piocher(alea, legales);
    return { action: 'annonce', quantite: a.quantite, face: a.face };
  }

  // Une annonce doit rester crédible pour celui qui parle après nous,
  // et il faut donc viser plus haut quand ce voisin doute facilement.
  const cibleVoulue = Math.min(0.95, t.cible + mefianceDe(o.memoire, joueurSuivant(p)) * 0.15);
  const bluffe = alea() < t.bluff;
  const cible = Math.max(0.05, cibleVoulue - (bluffe ? 0.3 : 0));
  const relance = meilleureAnnonce(legales, cible, inconnus, chezMoi);

  // Ouvrir la manche : il n'y a rien à contredire, il n'y a qu'à parler.
  if (!p.mise) {
    return relance
      ? { action: 'annonce', quantite: relance.quantite, face: relance.face }
      : { action: 'annonce', quantite: 1, face: 2 };
  }

  // Ce que coûte une erreur. Le dernier dé vaut plus cher que le
  // troisième : le perdre, c'est quitter la table.
  const coutMonDe = 1 + (moi.des.length === 1 ? 0.6 : moi.des.length === 2 ? 0.2 : 0);

  // Ce que rapporte un dé pris à quelqu'un d'autre. À deux, il vaut
  // exactement le mien. À cinq, un doute juste profite surtout aux
  // trois qui regardent, et ne me rend donc qu'un quart de dé. Un
  // adversaire sur son dernier dé, lui, vaut le déplacement.
  const adversaires = p.joueurs.filter((j) => !j.elimine && j.id !== moi.id).length;
  const annonceur = p.joueurs.find((j) => j.id === p.mise!.parId);
  const gainAdverse = (1 / Math.max(1, adversaires)) * (annonceur?.des.length === 1 ? 1.5 : 1);

  // La crédibilité de l'annonce, vue d'ici. Un joueur faible surestime
  // ce qu'on lui raconte, et c'est ce qui le fait douter trop tard. Une
  // annonce que je tiens à moi seul reste certaine à tous les niveaux :
  // le flou ne mord que sur ce qui est encore incertain.
  const ch = chanceDe(p.mise.face);
  const besoin = p.mise.quantite - chezMoi(p.mise.face);
  const brut = probaAuMoins(inconnus, besoin, ch);
  const biais = t.patience + (alea() * 2 - 1) * t.flou - audaceDe(o.memoire, p.mise.parId);
  const tenue = Math.max(0, Math.min(1, brut + (1 - brut) * Math.max(-0.6, Math.min(1, biais))));

  const evDoute = (1 - tenue) * gainAdverse - tenue * coutMonDe;

  // Le calzar : il rapporte un dé, mais seulement à qui en a perdu un.
  // Le règlement plafonne le gobelet à cinq, donc un appel réussi ne
  // rapporte rien quand il est plein. À cinq dés en main, l'appel ne
  // ferait plus que risquer un dé pour rien, et il ne se joue pas.
  const gainDe = moi.des.length < DES_AU_DEPART ? 1 : 0;
  const pExact = probaExactement(inconnus, besoin, ch);
  const evExact = t.appelleExact && o.autoriserExact !== false
    ? pExact * gainDe - (1 - pExact) * coutMonDe
    : -Infinity;

  const evAnnonce = relance
    ? POIDS_D_UNE_RELANCE * (relance.tenue * gainAdverse - (1 - relance.tenue) * coutMonDe)
    : -Infinity;

  if (relance && evAnnonce >= evDoute && evAnnonce >= evExact) {
    return { action: 'annonce', quantite: relance.quantite, face: relance.face };
  }
  if (evExact > evDoute) return { action: 'exact' };
  return { action: 'doute' };
}

// ─── Les dix marches, pour la page qui laisse choisir ───────────────

/** Le tempérament de la marche, dit en une phrase. Quatre bandes
 *  suffisent : les marches voisines se ressemblent, et dix phrases
 *  presque identiques ne renseigneraient personne. */
function humeur(n: Niveau, fr: boolean): string {
  if (n <= 2) {
    return fr
      ? 'Annonce presque au hasard et découvre le mensonge bien trop tard.'
      : 'Bids almost at random and sees through a lie far too late.';
  }
  if (n <= 5) {
    return fr
      ? 'Compte ses propres dés, se fie trop à ce qu’on lui annonce, et bluffe sans mesure.'
      : 'Counts its own dice, takes every bid too seriously, and bluffs without measure.';
  }
  if (n <= 8) {
    return fr
      ? 'Compte toute la table, ne promet que ce qu’elle peut tenir, et connaît le compte exact.'
      : 'Counts the whole table, promises only what it can hold, and knows the exact call.';
  }
  return fr
    ? 'Compte juste, bluffe rarement mais au bon moment, et appelle le compte exact quand il rend un dé.'
    : 'Counts exactly, bluffs rarely and at the right moment, and calls the exact count when it wins a die back.';
}

export interface MarcheDes {
  niveau: Niveau;
  nom: string;
  humeur: string;
}

/** Les dix adversaires, du marmiton au connétable, dans la langue de
 *  la page. Les noms sont ceux des plateaux : une seule échelle. */
export const marchesDes = (fr: boolean): MarcheDes[] =>
  NIVEAUX_POSSIBLES.map((n) => ({ niveau: n, nom: nomNiveau(n, fr), humeur: humeur(n, fr) }));
