// ─── Ce que le banc a mesuré, et comment on l'écrit ─────────────────
// Les formes que le tournoi remplit, les seuils au-dessus desquels un
// chiffre devient un reproche, et la petite cuisine de mise en page du
// markdown. Les tableaux vivent dans ./tableaux, la prose et les
// constats dans ./rapport.

import type { Niveau } from '../../src/games/moteur/niveaux';
import type { Chrono, Journal } from './duel';
import type { JournalDes } from './des';

export interface Appariement {
  jeu: string; variante: string; nomA: string; nomB: string;
  fort: Niveau; faible: Niveau;
  parties: number;
  /** Victoires de la marche forte quand c'est elle qui ouvre. */
  fortOuvre: number;
  faibleOuvre: number;
  /** Victoires de la marche forte quand elle répond. */
  fortSuit: number;
  faibleSuit: number;
  nulles: number;
}

export interface AppariementDes {
  taille: number; fort: Niveau; faible: Niveau;
  tables: number;
  fortOuvre: number; faibleOuvre: number;
  fortSuit: number; faibleSuit: number;
  sansVainqueur: number;
}

export interface LigneBanc {
  jeu: string; variante: string; nomA: string; nomB: string;
  budget: number; journal: Journal;
}

export interface Equilibre {
  jeu: string; variante: string; nomA: string; nomB: string;
  parties: number; a: number; b: number; nulles: number;
}

/**
 * Le contrôle du moteur, passé avant toute mesure.
 *
 * Le banc juge la machine, mais il se sert du même moteur pour la
 * juger. Il vérifie donc d'abord que ce moteur rend des notes qui ont
 * un sens, et il le dit dans le rapport plutôt que de bâtir mille
 * parties de statistiques sur une note qui vaut l'infini.
 */
export interface ControleMoteur {
  table: string;
  /** Combien de coups de la racine ont une note finie, sur le total. */
  finiesAvecQuiescence: number;
  finiesSansQuiescence: number;
  notes: number;
  profondeurAvec: number;
  profondeurSans: number;
}

export interface LigneChrono {
  table: string;
  parNiveau: Array<[Niveau, Chrono]>;
}

export interface Bilan {
  date: string;
  dureeMs: number;
  noeuds: Record<Niveau, number>;
  refBevue: { profondeur: number; noeuds: number; pas: number };
  filetChrono: number;
  plafondArene: number;
  controle: ControleMoteur[];
  bancs: LigneBanc[];
  global: Journal;
  echelle: Appariement[];
  equilibre: Equilibre[];
  chrono: LigneChrono[];
  des: {
    global: JournalDes;
    parTaille: Array<{ taille: number; journal: JournalDes }>;
    echelle: AppariementDes[];
  };
  partiesTotal: number;
  reductions: string[];
}

// ─── Les outils de mise en page ─────────────────────────────────────

export const n1 = (x: number): string => x.toFixed(1).replace('.', ',');
export const n2 = (x: number): string => x.toFixed(2).replace('.', ',');
export const pct = (x: number, sur: number): string =>
  (sur === 0 ? '0,0' : ((x / sur) * 100).toFixed(1).replace('.', ',')) + ' %';
export const ms = (x: number): string => (
  x >= 1000 ? `${n2(x / 1000)} s` : x >= 10 ? `${Math.round(x)} ms` : `${n1(x)} ms`
);

export const tableau = (entetes: readonly string[], lignes: ReadonlyArray<readonly string[]>): string => {
  const l = [`| ${entetes.join(' | ')} |`, `|${entetes.map(() => '---').join('|')}|`];
  for (const r of lignes) l.push(`| ${r.join(' | ')} |`);
  return l.join('\n');
};

export const trier = (r: Record<string, number>): Array<[string, number]> =>
  Object.entries(r).sort((a, b) => b[1] - a[1]);

// ─── Les mots des machines, traduits ────────────────────────────────
// Le banc range ses causes de fin sous des étiquettes courtes, faites
// pour être comptées. Le rapport, lui, se lit. Une étiquette qui n'est
// pas dans ce dictionnaire s'affiche telle quelle : ce sera le signe
// qu'une cause neuve est apparue et que personne ne l'a encore nommée.

export const NOM_CAUSE: Record<string, string> = {
  'renard-a-croque': 'le renard a croqué assez d’oies pour passer le seuil',
  'oies-bloquees': 'le troupeau n’avait plus un seul coup',
  'renard-enferme': 'le renard était enfermé',
  'nulle-plafond': 'nulle, quatre cents demi-coups sans vainqueur',
  'nulle-repetition': 'nulle, la même position pour la troisième fois',
  'nulle-compteur': 'nulle, cinquante demi-coups sans pose ni retrait',
  'moulin-decisif': 'un camp est tombé à deux pions ou n’avait plus un coup',
  fuite: 'le roi a gagné le coin',
  roiPris: 'les lances se sont refermées sur le roi',
  encerclement: 'l’anneau s’est fermé et le camp du roi ne respirait plus',
  blocage: 'le camp au trait n’avait plus un seul coup',
  repetition: 'perdue sur la répétition perpétuelle',
  sansPrise: 'nulle, cent vingt demi-coups sans une seule prise',
  'plafond-arene': '**coupée par le plafond du banc**',
  'sans-coup': '**plus un coup à jouer, et l’arbitre n’avait rien tranché**',
};

export const NOM_EVENEMENT: Record<string, string> = {
  'oie-punie': 'la traînarde s’est fait croquer, règle de la basse-cour',
  'position-repetee': 'une position est revenue une deuxième fois',
};

export const NOM_PATHOLOGIE_DES: Record<string, string> = {
  'annonce-refusee': 'le règlement a refusé une annonce de la maison',
  'appel-sans-mise': 'un doute lancé sans annonce à contredire',
  'table-close-sans-vainqueur': 'la table s’est fermée sans vainqueur',
  'plafond-de-tours': 'la table a heurté le plafond de tours de parole',
};

export const traduire = (dico: Record<string, string>, cle: string): string =>
  dico[cle] ?? `\`${cle}\``;

// ─── Les seuils du jugement ─────────────────────────────────────────

/** Au-delà, un camp est tenu pour dominant à niveau égal. */
export const SEUIL_DESEQUILIBRE = 0.75;

/** La promesse faite au joueur : le connétable répond en trois secondes. */
export const PLAFOND_REFLEXION = 3000;

/** Au-delà, une marche joue trop souvent un coup qui perd un demi-point. */
export const SEUIL_BEVUES = 0.25;

