// ─── Le travailleur : la réflexion hors du fil principal ────────────
// Alex, 2026-09-01 : « il faut que l'IA réfléchisse aux règles,
// apprenne les règles, fasse plusieurs parties en arrière-plan. »
//
// Le connétable dispose de deux secondes et six dixièmes pour choisir
// son coup. Prises sur le fil principal, ces deux secondes et demie
// gèlent tout : la scène Three.js s'arrête net, le clic ne répond plus,
// et le joueur croit que la page a planté. La recherche déménage donc
// dans un Web Worker, qui a son propre fil et laisse l'écran vivre.
//
// Ce fichier remplit deux offices, et c'est voulu. Il est le travailleur
// lui-même, celui que Vite charge par
// `new Worker(new URL('./travailleur.ts', import.meta.url), { type: 'module' })`.
// Il porte aussi la table des trois plateaux et le repli synchrone, dont
// le penseur se sert quand aucun travailleur ne démarre. L'écouteur de
// messages ne s'installe donc qu'à l'intérieur d'un vrai travailleur :
// importé depuis une page ou depuis le terminal, ce fichier ne fait rien
// d'autre que ce qu'on lui demande.
//
// LE CLONAGE. Tout ce qui traverse la frontière passe par le clonage
// structuré du navigateur, qui accepte les nombres, les textes, les
// tableaux et les objets ordinaires, et qui refuse une Map, un Set ou
// une fonction. Les trois états de jeu s'y prêtent tels quels : le
// registre des positions vues est un objet ordinaire chez le renard et
// au tafl, et un tableau de textes à la mérelle. Rien n'a donc besoin
// d'être sérialisé à la main, et le penseur se replie sur le fil
// principal si un jour un état cessait de passer.

import { adaptateurMerelle, coupSimple } from '../merelle/cpu';
import type { EtatMerelle } from '../merelle/arbitre';
import { adaptateurRenard } from '../renard/cpu';
import type { EtatRenard } from '../renard/arbitre';
import type { Coup as CoupRenard } from '../renard/logic';
import { adaptateurTafl, type CpuMove } from '../hnefatafl/cpuPlayer';
import type { EtatTafl } from '../hnefatafl/arbitre';
import { REGLE } from '../hnefatafl/gameLogic';
import { auHasard, graine, piocher } from './hasard';
import { livreDe } from './livre';
import { NIVEAUX, choisirAuNiveau, reflechir, type ChoixOptions, type Niveau } from './niveaux';
import type { Adaptateur, CoupNote } from './types';

// ─── Le protocole ───────────────────────────────────────────────────

/** Les trois plateaux qui savent chercher. Les dés n'ont pas d'arbre à
 *  explorer et répondent en un clin d'œil sur le fil principal. */
export type JeuPlateau = 'renard' | 'merelle' | 'tafl';

export interface OptionsReflexion {
  /** La graine du hasard, quand la partie doit se rejouer à l'identique. */
  graine?: number;
  /** Plafond de nœuds, quand l'appelant veut une réponse bornée. */
  noeudsMax?: number;
}

export interface DemandeTravailleur extends OptionsReflexion {
  /** Le numéro de la demande. Une réponse qui n'y répond pas est périmée. */
  id: number;
  jeu: JeuPlateau;
  /**
   * Le règlement du tafl, qui vit dans une variable de module et se pose
   * avant de chercher. Le renard et la mérelle portent la leur dans leur
   * état, et ce champ ne les concerne pas.
   */
  variante: string;
  /** L'état du jeu, en objets simples. */
  etat: unknown;
  niveau: Niveau;
  /**
   * Réflexion anticipée. Le travailleur n'a alors aucun coup à rendre :
   * il étudie les positions que l'adversaire va lui donner et les range
   * dans sa mémoire, pour répondre du tac au tac quand son tour vient.
   */
  anticipation?: boolean;
}

/** Le message qui enterre la réflexion en cours, sans en demander d'autre. */
export interface ArretTravailleur { arret: true }

export type MessageTravailleur = DemandeTravailleur | ArretTravailleur;

export interface ReponseTravailleur {
  id: number;
  coup: unknown;
  note: number;
  profondeur: number;
  noeuds: number;
  ms: number;
  /** Le coup sortait de la mémoire de la réflexion anticipée. */
  deMemoire?: boolean;
  /** Les positions étudiées d'avance, quand la demande était une anticipation. */
  etudiees?: number;
  /** Ce qui a mal tourné. Le penseur se replie alors sur le fil principal. */
  erreur?: string;
}

// ─── La table des trois plateaux ────────────────────────────────────

/** Un plateau prêt à être cherché : son adaptateur, sa position, son nom
 *  de variante et la façon de rendre un coup au monde extérieur. */
export interface Plateau<E, C> {
  adaptateur: Adaptateur<E, C>;
  etat: E;
  /** Le nom de la variante, pour le livre d'ouvertures et pour la mémoire. */
  variante: string;
  /** Le coup dans la forme que la page attend, qui n'est pas toujours
   *  celle que la recherche manipule. */
  sortie: (c: C) => unknown;
}

/**
 * Ouvre le bon plateau et confie le travail à `faire`.
 *
 * Le détour par une fonction générique tient à une contrainte de
 * typage : chaque jeu a son état et son coup à lui, et les trois ne se
 * rangent pas sous un type commun sans tout perdre. Chaque branche
 * garde donc ses vrais types, et `faire` est écrit une seule fois.
 */
export function avecPlateau<R>(
  jeu: JeuPlateau,
  variante: string,
  etat: unknown,
  faire: <E, C>(p: Plateau<E, C>) => R,
): R {
  switch (jeu) {
    case 'renard': {
      const e = etat as EtatRenard;
      return faire({
        adaptateur: adaptateurRenard(e.variante),
        etat: e,
        variante: e.variante,
        sortie: (c: CoupRenard) => c,
      });
    }
    case 'merelle': {
      const e = etat as EtatMerelle;
      return faire({
        adaptateur: adaptateurMerelle(e.jeu.vol),
        etat: e,
        variante: e.jeu.vol ? 'vol' : 'sansVol',
        // Le moulin voyage avec son retrait dans la recherche, et se
        // rejoue en deux temps sur le plateau : la page reçoit le coup
        // seul, et le retrait lui sera demandé au tour suivant.
        sortie: coupSimple,
      });
    }
    case 'tafl': {
      const e = etat as EtatTafl;
      const regleId = variante || REGLE.id;
      return faire({
        adaptateur: adaptateurTafl(regleId),
        etat: e,
        variante: regleId,
        sortie: (c: CpuMove) => c,
      });
    }
  }
}

/** Les options de recherche d'une demande, livre d'ouvertures compris. */
function optionsDe(
  jeu: JeuPlateau, variante: string, o: OptionsReflexion, arret?: () => boolean,
): ChoixOptions {
  return {
    alea: o.graine === undefined ? auHasard : graine(o.graine),
    livre: livreDe(jeu, variante),
    noeudsMax: o.noeudsMax,
    arret,
  };
}

/**
 * Le coup de la machine, calculé ici même, sur le fil de l'appelant.
 *
 * C'est le repli du penseur quand aucun travailleur ne démarre, et c'est
 * aussi ce que fait le travailleur quand il n'a rien en mémoire. Un
 * navigateur ancien, un rendu côté serveur ou un banc d'essai au
 * terminal passent tous par ici, et ils obtiennent exactement le coup
 * que `choisirAuNiveau` aurait rendu, puisque c'est lui qui travaille.
 */
export function coupSynchrone(
  jeu: JeuPlateau, variante: string, etat: unknown, niveau: Niveau,
  o: OptionsReflexion = {},
): unknown {
  return avecPlateau(jeu, variante, etat, (p) => {
    const c = choisirAuNiveau(p.adaptateur, p.etat, niveau, optionsDe(jeu, p.variante, o));
    return c === null ? null : p.sortie(c);
  });
}

// ─── La mémoire de la réflexion anticipée ───────────────────────────
// La table de transposition de `recherche.ts` naît et meurt avec un
// appel : elle ne garde rien d'un coup à l'autre. La mémoire d'ici prend
// le relais à l'étage au-dessus. Elle retient, pour une position donnée,
// les coups que la recherche a mis en tête, et elle permet de répondre
// sans réfléchir à une position déjà étudiée pendant que l'adversaire,
// lui, réfléchissait.
//
// Seuls les coups ex æquo en tête sont gardés. Le reste de la liste de
// racine ne sert à rien ici et pèserait lourd : au tafl une position
// ouvre facilement cinq cents coups.

interface Souvenir {
  /** Les coups de tête, tous de même note. Le tirage se fait entre eux. */
  tete: CoupNote<unknown>[];
  note: number;
  profondeur: number;
  noeuds: number;
}

/** Assez pour une partie entière d'anticipation à trois coups par tour. */
const MEMOIRE_MAX = 512;

const memoire = new Map<string, Souvenir>();

/** ponytail: la plus vieille entrée sort quand la mémoire est pleine.
 *  Une Map garde l'ordre d'insertion, donc la première clé est la plus
 *  ancienne. Le jour où cela se voit, il faudra compter les visites. */
function ranger(cle: string, s: Souvenir): void {
  if (memoire.size >= MEMOIRE_MAX) {
    const vieille = memoire.keys().next().value;
    if (vieille !== undefined) memoire.delete(vieille);
  }
  memoire.set(cle, s);
}

const cleMemoire = (jeu: string, variante: string, niveau: Niveau, position: string): string =>
  `${jeu}|${variante}|${niveau}|${position}`;

/**
 * La mémoire ne sert qu'aux marches qui pensent d'avance ET qui
 * choisissent sans tempérament, ce qui ne fait aujourd'hui que le
 * connétable. Une marche à fenêtre ou à bévue choisit autrement que « le
 * meilleur coup, au tirage entre les ex æquo », et rejouer son choix
 * depuis un souvenir lui donnerait une force qui n'est pas la sienne.
 * Le garde-fou tient donc aux trois réglages, pas au numéro de la
 * marche : si un jour le sénéchal se met à penser d'avance, il faudra
 * d'abord lui retirer sa fenêtre.
 */
function memorisable(n: Niveau): boolean {
  const r = NIVEAUX[n];
  return r.pense && r.bevue === 0 && r.fenetre === 0;
}

/** Les coups de tête d'un résultat de recherche, tous de même note. */
function teteDe<C>(racine: CoupNote<C>[]): CoupNote<C>[] {
  if (racine.length === 0) return [];
  const meilleure = racine[0].note;
  return racine.filter((c) => c.note >= meilleure);
}

// ─── Le travail d'une demande ───────────────────────────────────────

type Rapport = Omit<ReponseTravailleur, 'id' | 'ms'>;

function choisir<E, C>(p: Plateau<E, C>, d: DemandeTravailleur): Rapport {
  const options = optionsDe(d.jeu, p.variante, d);
  const alea = options.alea ?? auHasard;

  if (memorisable(d.niveau)) {
    const vu = memoire.get(cleMemoire(d.jeu, p.variante, d.niveau, p.adaptateur.cle(p.etat)));
    if (vu && vu.tete.length > 0) {
      const tete = vu.tete as CoupNote<C>[];
      const choix = tete.length > 1 ? piocher(alea, tete).coup : tete[0].coup;
      return {
        coup: p.sortie(choix), note: vu.note, profondeur: vu.profondeur,
        noeuds: vu.noeuds, deMemoire: true,
      };
    }
  }

  // Rien en mémoire : la marche cherche pour de bon, avec son
  // tempérament. `choisirAuNiveau` ne rend que le coup et garde son
  // rapport de recherche pour lui, donc les compteurs restent à zéro
  // plutôt que d'inventer un chiffre ou de chercher deux fois. Ils sont
  // renseignés dès que la réponse sort de la mémoire, c'est-à-dire là
  // où ils disent quelque chose.
  const c = choisirAuNiveau(p.adaptateur, p.etat, d.niveau, options);
  return { coup: c === null ? null : p.sortie(c), note: 0, profondeur: 0, noeuds: 0 };
}

// ─── La réflexion anticipée ─────────────────────────────────────────
// Pendant que l'adversaire réfléchit, la machine ne reste pas les bras
// croisés. Elle cherche d'abord sur la position courante, ce qui lui dit
// dans quel ordre l'adversaire a le plus de chances de jouer, puis elle
// étudie les positions qui suivent les coups les plus probables et les
// range dans sa mémoire. Quand l'adversaire joue l'un d'eux, la réponse
// est déjà prête et part sur-le-champ.
//
// ponytail: la réflexion ne se coupe qu'ENTRE deux positions étudiées.
// Un arrêt au milieu d'une recherche demanderait un SharedArrayBuffer,
// donc les en-têtes COOP et COEP que l'hébergement du festival ne pose
// pas. Un adversaire qui joue pendant une étude attend donc au pire ce
// qu'il reste de cette étude, et il gagne tout le temps de réflexion
// quand son coup était prévu.

/** Combien de réponses de l'adversaire la machine étudie d'avance. */
const LARGEUR_ANTICIPATION = 3;

function anticiper<E, C>(p: Plateau<E, C>, d: DemandeTravailleur, mien: number, debut: number): void {
  // La réflexion est périmée dès qu'un autre message est arrivé. La
  // recherche lit ce même test entre deux nœuds et rend la main.
  const perime = () => mien !== generation;
  const options = optionsDe(d.jeu, p.variante, d, perime);

  // Le devin : la recherche sur la position courante dit dans quel ordre
  // l'adversaire a le plus de chances de jouer.
  const devin = reflechir(p.adaptateur, p.etat, d.niveau, options);
  let noeuds = devin.noeuds;
  let etudiees = 0;
  const suites = devin.racine.slice(0, LARGEUR_ANTICIPATION);

  const finir = () => scope.postMessage({
    id: d.id, coup: null, note: devin.note, profondeur: devin.profondeur,
    noeuds, ms: Date.now() - debut, etudiees,
  } satisfies ReponseTravailleur);

  // Une position par tour de boucle d'événements : c'est ce qui laisse
  // le travailleur recevoir la demande suivante et enterrer celle-ci.
  const etudier = (i: number): void => {
    if (perime() || i >= suites.length) { finir(); return; }
    const apres = p.adaptateur.jouer(p.etat, suites[i].coup);
    if (p.adaptateur.fini(apres) === null) {
      const etude = reflechir(p.adaptateur, apres, d.niveau, options);
      noeuds += etude.noeuds;
      if (!perime() && !etude.duLivre) {
        ranger(cleMemoire(d.jeu, p.variante, d.niveau, p.adaptateur.cle(apres)), {
          tete: teteDe(etude.racine), note: etude.note,
          profondeur: etude.profondeur, noeuds: etude.noeuds,
        });
        etudiees++;
      }
    }
    setTimeout(() => etudier(i + 1), 0);
  };
  // Même la première étude attend un tour de boucle. La recherche du
  // devin, elle, n'est pas interruptible, et ce délai laisse la demande
  // qui serait arrivée pendant ce temps enterrer l'anticipation avant
  // qu'elle ne coûte une étude de plus.
  setTimeout(() => etudier(0), 0);
}

// ─── L'écoute ───────────────────────────────────────────────────────

/**
 * La vue étroite du travailleur sur son propre contexte. Elle évite la
 * directive `/// <reference lib="webworker" />`, qui ferait entrer les
 * déclarations du travailleur en collision avec celles du navigateur
 * dans tout le reste du projet.
 */
interface ContexteTravailleur {
  addEventListener(type: 'message', ecouteur: (e: MessageEvent) => void): void;
  postMessage(message: unknown): void;
}

const scope = globalThis as unknown as ContexteTravailleur;

/**
 * Le numéro de la réflexion en cours. Chaque message reçu l'incrémente,
 * et toute réflexion dont le numéro n'est plus le bon s'arrête d'elle
 * même. Un simple drapeau ne suffirait pas : une demande neuve le
 * remettrait à zéro et ressusciterait l'anticipation qu'elle vient
 * d'enterrer.
 */
let generation = 0;

function repondre(d: DemandeTravailleur): void {
  const debut = Date.now();
  try {
    const rapport = avecPlateau(d.jeu, d.variante, d.etat, (p) => choisir(p, d));
    scope.postMessage({ id: d.id, ms: Date.now() - debut, ...rapport } satisfies ReponseTravailleur);
  } catch (e) {
    scope.postMessage({
      id: d.id, coup: null, note: 0, profondeur: 0, noeuds: 0,
      ms: Date.now() - debut, erreur: String(e),
    } satisfies ReponseTravailleur);
  }
}

function recevoir(m: MessageTravailleur): void {
  const mien = ++generation;
  if ('arret' in m) return;
  if (!m.anticipation) { repondre(m); return; }
  const debut = Date.now();
  try {
    avecPlateau(m.jeu, m.variante, m.etat, (p) => anticiper(p, m, mien, debut));
  } catch (e) {
    scope.postMessage({
      id: m.id, coup: null, note: 0, profondeur: 0, noeuds: 0,
      ms: Date.now() - debut, erreur: String(e),
    } satisfies ReponseTravailleur);
  }
}

// L'écouteur ne s'installe que dans un vrai travailleur. Le penseur
// importe ce fichier pour son repli synchrone, et sans ce garde-fou il
// poserait un écouteur de messages sur la fenêtre du site.
if ('WorkerGlobalScope' in globalThis) {
  scope.addEventListener('message', (e) => recevoir(e.data as MessageTravailleur));
}
