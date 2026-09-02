// ─── L'entraînement : ce que la machine apprend toute seule ─────────
// Alex, 2026-09-01 : « il faut que l'IA réfléchisse aux règles,
// apprenne les règles, fasse plusieurs parties en background. »
//
// Cet outil fait jouer la machine contre elle-même, à graine fixe, et
// il en tire deux choses.
//
// LE LIVRE D'OUVERTURES d'abord. Les positions des premiers demi-coups
// sont retenues avec le coup qui y a été joué, et un coup n'entre au
// livre que s'il a été essayé au moins trois fois et qu'il gagne plus
// souvent que la moyenne de son camp. La moyenne se prend camp par
// camp : au Renard les oies gagnent bien plus que le renard, et une
// moyenne commune aurait vidé le livre de tout coup de renard.
//
// LES POIDS D'ÉVALUATION ensuite. Une montée de colline sur les
// coefficients du Renard : on tire une variation, on la fait jouer
// contre les poids sortants dans un match où chacun tient le renard à
// son tour, et elle ne prend leur place que si elle marque plus que la
// moitié des points. Le tout s'écrit dans
// `src/games/moteur/livre-donnees.ts`, que le jeu relit au chargement.
//
// À lancer depuis la racine du dépôt, par `npm run entrainement`, avec
// ses arguments derrière un double tiret. Les voici, avec leur valeur
// par défaut :
//
//   --jeu=tous          renard · merelle · tafl · tous
//   --parties=40        parties d'entraînement par plateau et variante
//   --coups=10          demi-coups gardés au livre depuis le début
//   --minimum=3         fois qu'un coup doit avoir été joué pour compter
//   --entrees=40        entrées gardées au plus par livre
//   --noeuds=2000       plafond de nœuds par coup, ce qui borne le temps
//   --bruit=45          écart toléré au meilleur coup pendant l'ouverture
//   --iterations=6      variations de poids essayées, zéro pour sauter
//   --matchs=8          parties du match de validation d'une variation
//   --graine=20260901   la graine, pour rejouer le même entraînement
//   --sortie=<chemin>   le fichier à écrire, pour un essai à blanc
//
// Le plafond de nœuds rend l'entraînement reproductible. Les marches 8
// à 10 portent aussi une horloge dans `niveaux.ts`, et une horloge ne
// rend jamais deux fois le même résultat. Tant que le plafond tombe
// avant elle, deux entraînements de même graine donnent le même livre.

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { entier, graine, piocher, type Alea } from '../src/games/moteur/hasard';
import { NIVEAUX, choisirAuNiveau, type Niveau } from '../src/games/moteur/niveaux';
import { chercher } from '../src/games/moteur/recherche';
import type { Adaptateur } from '../src/games/moteur/types';

import { POIDS as POIDS_RENARD, adaptateurRenard, oublierEtalon } from '../src/games/renard/cpu';
import { etatInitial as departRenard, type EtatRenard } from '../src/games/renard/arbitre';
import type { Variante } from '../src/games/renard/logic';

import { adaptateurMerelle } from '../src/games/merelle/cpu';
import { etatInitial as departMerelle, type EtatMerelle } from '../src/games/merelle/arbitre';

import { adaptateurTafl } from '../src/games/hnefatafl/cpuPlayer';
import { etatInitial as departTafl, type EtatTafl } from '../src/games/hnefatafl/arbitre';

// ─── Les arguments ──────────────────────────────────────────────────
const ARGS = new Map<string, string>();
for (const brut of process.argv.slice(2)) {
  const m = /^--([a-z]+)(?:=(.*))?$/.exec(brut);
  if (m) ARGS.set(m[1], m[2] ?? 'oui');
}
const nombre = (nom: string, defaut: number): number => {
  const v = Number(ARGS.get(nom));
  return Number.isFinite(v) ? v : defaut;
};

const O = {
  jeu: ARGS.get('jeu') ?? 'tous',
  parties: nombre('parties', 40),
  coups: nombre('coups', 10),
  minimum: nombre('minimum', 3),
  entrees: nombre('entrees', 40),
  noeuds: nombre('noeuds', 2_000),
  bruit: nombre('bruit', 45),
  iterations: nombre('iterations', 6),
  matchs: nombre('matchs', 8),
  graine: nombre('graine', 20_260_901),
};

/** Une empreinte de texte, pour que deux plateaux ne partagent jamais
 *  la même suite de graines : deux noms de même longueur donnaient
 *  autrement les mêmes tirages. */
function empreinte(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 131 + s.charCodeAt(i)) % 1e6;
  return h;
}

/** Aucune partie ne dépasse ce nombre de demi-coups, même si un arbitre
 *  se tait : l'entraînement ne doit jamais pouvoir tourner en rond. */
const PLAFOND_PARTIE = 400;

/** Combien de coups d'ouverture se disputent le tirage. Au-delà de
 *  quatre, les débuts ne se répètent plus assez pour qu'un coup atteigne
 *  ses trois parties, et le livre ressort vide. */
const LARGEUR_BRUIT = 4;

/** Les marches auxquelles la machine s'entraîne. En dessous de huit,
 *  elle apprendrait ses propres bévues. */
const MARCHES: readonly Niveau[] = [8, 9, 10];

// ─── Une partie ─────────────────────────────────────────────────────
/** Un demi-coup joué, avec la clé de position que la recherche
 *  interrogera plus tard, et le camp qui l'a joué. */
interface Trait { cle: string; coup: string; camp: string }

/** `gagnant` reste nul quand la partie est nulle ou coupée au plafond. */
interface Partie { gagnant: string | null; traits: Trait[]; demiCoups: number }

interface OptionsPartie {
  niveaux: Record<string, Niveau>;
  noeudsMax: number;
  /** Les demi-coups d'ouverture où le coup se tire au sort, et l'écart
   *  toléré au meilleur coup pendant ce temps, en centièmes. */
  ouverture: number;
  bruit: number;
  /** Appelé avant chaque coup, pour poser les poids du camp au trait. */
  avant?: (camp: string) => void;
}

/** Le coup d'ouverture, tiré parmi les meilleurs. La recherche tourne à
 *  fenêtre pleine (`notesExactes`) : sans elle, seul le premier coup de
 *  la racine reçoit une note juste et les autres remontent une borne
 *  rabotée par l'alpha courant. Piocher dans cette liste-là revient à
 *  piocher au hasard. */
function coupDOuverture<E, C>(
  a: Adaptateur<E, C>, e: E, niveau: Niveau, alea: Alea, o: OptionsPartie,
): C | null {
  const r = chercher(a, e, {
    profondeurMax: NIVEAUX[niveau].profondeurMax,
    quiescence: NIVEAUX[niveau].quiescence,
    noeudsMax: o.noeudsMax,
    notesExactes: true,
  });
  if (r.racine.length === 0) return r.coup;
  const seuil = r.racine[0].note - o.bruit;
  const proches = r.racine.filter((x) => x.note >= seuil).slice(0, LARGEUR_BRUIT);
  return proches.length > 0 ? piocher(alea, proches).coup : r.coup;
}

function jouerUnePartie<E, C>(
  a: Adaptateur<E, C>, depart: E,
  camp: (e: E) => string, camps: readonly [string, string],
  alea: Alea, o: OptionsPartie,
): Partie {
  const traits: Trait[] = [];
  let e = depart;
  let n = 0;
  while (n < PLAFOND_PARTIE && a.fini(e) === null) {
    const auTrait = camp(e);
    o.avant?.(auTrait);
    const niveau = o.niveaux[auTrait];
    const c = n < o.ouverture && o.bruit > 0
      ? coupDOuverture(a, e, niveau, alea, o)
      : choisirAuNiveau(a, e, niveau, { alea, noeudsMax: o.noeudsMax });
    if (c === null) break;
    traits.push({ cle: a.cle(e), coup: a.nomCoup(c), camp: auTrait });
    e = a.jouer(e, c);
    n++;
  }
  const verdict = a.fini(e);
  const auTrait = camp(e);
  const gagnant = verdict === null || verdict === 0 ? null
    : verdict === 1 ? auTrait
      : (camps[0] === auTrait ? camps[1] : camps[0]);
  return { gagnant, traits, demiCoups: n };
}

// ─── Les plateaux, ramenés à un seul contrat ────────────────────────
interface Chantier {
  jeu: string;
  variante: string;
  camps: readonly [string, string];
  partie: (alea: Alea, o: OptionsPartie) => Partie;
  /**
   * La recherche retrouve-t-elle son livre ? Un livre bâti sur une clé
   * qui a dérivé d'un cheveu se compile, se déploie et ne sert jamais à
   * rien, parce que `recherche.ts` ne tombe jamais dessus. Rend `null`
   * quand la position de départ n'a pas été retenue, ce qui n'est pas
   * une faute.
   */
  reconnait: (livre: Record<string, string>) => boolean | null;
}

/** Emballe un plateau derrière une seule porte. Le montage se refait à
 *  chaque partie : le hnefatafl pose son règlement dans une variable de
 *  module, et deux damiers de tailles différentes ne cohabitent pas. */
function chantier<E, C>(
  jeu: string, variante: string, camps: readonly [string, string],
  camp: (e: E) => string,
  monter: () => { a: Adaptateur<E, C>; depart: E },
): Chantier {
  return {
    jeu, variante, camps,
    partie: (alea, o) => {
      const { a, depart } = monter();
      return jouerUnePartie(a, depart, camp, camps, alea, o);
    },
    reconnait: (livre) => {
      const { a, depart } = monter();
      if (livre[a.cle(depart)] === undefined) return null;
      return chercher(a, depart, { profondeurMax: 1, livre }).duLivre === true;
    },
  };
}

const VARIANTES_RENARD: readonly Variante[] = ['oies13', 'oies17'];
const REGLES_TAFL: readonly string[] = ['copenhague', 'brandubh'];

function chantiersDe(jeu: string): Chantier[] {
  const veut = (n: string): boolean => jeu === 'tous' || jeu === n;
  const tous: Chantier[] = [];
  if (veut('renard')) {
    for (const v of VARIANTES_RENARD) {
      tous.push(chantier('renard', v, ['renard', 'oies'] as const, (e: EtatRenard) => e.tour,
        () => ({ a: adaptateurRenard(v), depart: departRenard(v) })));
    }
  }
  if (veut('merelle')) {
    for (const vol of [true, false]) {
      tous.push(chantier('merelle', vol ? 'vol' : 'sansVol', ['1', '2'] as const,
        (e: EtatMerelle) => String(e.jeu.tour),
        () => ({ a: adaptateurMerelle(vol), depart: departMerelle(vol) })));
    }
  }
  if (veut('tafl')) {
    for (const id of REGLES_TAFL) {
      tous.push(chantier('tafl', id, ['attacker', 'defender'] as const, (e: EtatTafl) => e.tour,
        () => ({ a: adaptateurTafl(id), depart: departTafl(id) })));
    }
  }
  return tous;
}

// ─── Le livre ───────────────────────────────────────────────────────
interface Compte { camp: string; parties: number; gagnees: number }
interface Retenu { cle: string; coup: string; parties: number; taux: number }
/** Ce que les parties ont retenu, position par position. Une nulle ne
 *  compte pas comme une victoire : la plainte d'Alex portait sur des
 *  oies qui annulent pour ne pas perdre, et un livre qui les
 *  récompenserait leur apprendrait à camper dès le premier coup. */
function livreDepuis(parties: readonly Partie[]): Retenu[] {
  const stats = new Map<string, Map<string, Compte>>();
  for (const p of parties) {
    const jusque = Math.min(O.coups, p.traits.length);
    for (let i = 0; i < jusque; i++) {
      const t = p.traits[i];
      let parCoup = stats.get(t.cle);
      if (!parCoup) { parCoup = new Map(); stats.set(t.cle, parCoup); }
      let c = parCoup.get(t.coup);
      if (!c) { c = { camp: t.camp, parties: 0, gagnees: 0 }; parCoup.set(t.coup, c); }
      c.parties++;
      if (p.gagnant === t.camp) c.gagnees++;
    }
  }

  // La moyenne de chaque camp, à laquelle ses coups seront comparés.
  const total = new Map<string, Compte>();
  for (const parCoup of stats.values()) for (const c of parCoup.values()) {
    let t = total.get(c.camp);
    if (!t) { t = { camp: c.camp, parties: 0, gagnees: 0 }; total.set(c.camp, t); }
    t.parties += c.parties;
    t.gagnees += c.gagnees;
  }
  const moyenne = (camp: string): number => {
    const t = total.get(camp);
    return t && t.parties > 0 ? t.gagnees / t.parties : 1;
  };

  const retenus: Retenu[] = [];
  for (const [cle, parCoup] of stats) {
    let meilleur: Retenu | null = null;
    for (const [coup, c] of parCoup) {
      if (c.parties < O.minimum) continue;
      const taux = c.gagnees / c.parties;
      if (taux <= moyenne(c.camp)) continue;
      const mieux = meilleur === null || taux > meilleur.taux
        || (taux === meilleur.taux
          && (c.parties > meilleur.parties
            || (c.parties === meilleur.parties && coup < meilleur.coup)));
      if (mieux) meilleur = { cle, coup, parties: c.parties, taux };
    }
    if (meilleur) retenus.push(meilleur);
  }
  // Les plus fréquentes d'abord : ce sont celles qui reviendront le plus
  // souvent devant un joueur, et le plafond ne coupe donc que la queue.
  retenus.sort((x, y) => y.parties - x.parties || y.taux - x.taux || (x.cle < y.cle ? -1 : 1));
  return retenus.slice(0, O.entrees);
}

// ─── La montée de colline sur les poids du Renard ───────────────────
type Poids = Record<string, number>;

/** Une variation : un ou deux coefficients tirés, poussés de trente pour
 *  cent au plus. Plus large, l'évaluation casse d'un coup et la montée
 *  n'avance plus; plus court, l'écart ne se voit pas au match. */
function varier(p: Poids, alea: Alea): Poids {
  const suivant: Poids = { ...p };
  const cles = Object.keys(suivant);
  const combien = 1 + entier(alea, 2);
  for (let i = 0; i < combien; i++) {
    const k = piocher(alea, cles);
    suivant[k] = Math.max(1, Math.round(suivant[k] * (0.7 + alea() * 0.6)));
  }
  return suivant;
}

/**
 * Le match de validation, en points marqués par le premier jeu de poids.
 * Les deux camps partagent le même objet de poids, puisque
 * `renard/cpu.ts` le lit dans son module : il est reposé avant chaque
 * coup, et l'étalon oublié du même geste, parce que ce zéro-là dépend
 * des poids.
 *
 * LES PARTIES VONT PAR DEUX, même graine et couleurs inversées. La
 * première version changeait de camp et de variante du même pas, si
 * bien que le premier jeu de poids tenait toujours le renard à treize
 * oies et toujours les oies à dix-sept. Comme les oies gagnent presque
 * toujours à dix-sept, il marquait cinq points et demi sur huit quoi
 * qu'on lui donne, et les huit variations d'une première montée ont
 * ainsi été adoptées sans rien valoir.
 */
function match(a: Poids, b: Poids, parties: number, base: number): number {
  const marches: Record<string, Niveau> = { renard: 8, oies: 8 };
  let points = 0;
  for (let i = 0; i < parties; i++) {
    const paire = Math.floor(i / 2);
    const roleA = i % 2 === 0 ? 'renard' : 'oies';
    const variante = VARIANTES_RENARD[paire % VARIANTES_RENARD.length];
    const p = jouerUnePartie(
      adaptateurRenard(variante), departRenard(variante),
      (e) => e.tour, ['renard', 'oies'], graine(base + paire),
      {
        niveaux: marches, noeudsMax: O.noeuds, ouverture: O.coups, bruit: O.bruit,
        avant: (camp) => {
          Object.assign(POIDS_RENARD, camp === roleA ? a : b);
          oublierEtalon();
        },
      },
    );
    if (p.gagnant === roleA) points += 1;
    else if (p.gagnant === null) points += 0.5;
  }
  return points;
}

interface Colline {
  poids: Poids; adoptees: number; gain: number; parties: number; garde: boolean;
}

function monterLaColline(): Colline {
  const depart: Poids = { ...POIDS_RENARD };
  let sortant: Poids = { ...depart };
  let adoptees = 0;
  const alea = graine(O.graine + 7_777);

  // Le contrôle : les poids de départ contre eux-mêmes. Le score doit
  // tomber à la moitié des points, et ces quelques parties sont ce qui
  // prouve que l'arène ne penche pas d'un côté.
  console.log(`  contrôle : ${match(depart, depart, O.matchs, O.graine + 900_000)}/${O.matchs}`
    + ' pour les poids de départ contre eux-mêmes, la moitié attendue');

  for (let i = 0; i < O.iterations; i++) {
    const candidat = varier(sortant, alea);
    const points = match(candidat, sortant, O.matchs, O.graine + i * 1_000);
    const pris = points > O.matchs / 2;
    if (pris) { sortant = candidat; adoptees++; }
    console.log(`  variation ${i + 1}/${O.iterations} : ${points}/${O.matchs}`
      + ` contre les sortants ${pris ? '· adoptée' : '· rejetée'}`);
  }

  // Le gain se mesure sur des graines que la montée n'a jamais vues :
  // une variation choisie sur un jeu de parties gagne toujours contre
  // celui qui l'a fait choisir, et cela ne prouve rien. Quand ce match
  // ne dépasse pas la moitié des points, la montée n'a rien trouvé et
  // les poids écrits à la main restent en place. Un entraînement qui
  // livrerait quand même sa trouvaille ferait reculer le jeu.
  const parties = O.matchs * 2;
  const gain = match(sortant, depart, parties, O.graine + 5e5);
  const garde = gain > parties / 2;
  return { poids: garde ? sortant : depart, adoptees, gain, parties, garde };
}

// ─── Le fichier généré ──────────────────────────────────────────────
const ENTETE = `// ─── Ce que la machine a appris ─────────────────────────────────────
// FICHIER GÉNÉRÉ. Ne pas modifier à la main.
// Écrit par tools/entrainement.ts (npm run entrainement).
//
// Le livre associe une clé de position au coup que les parties gagnées
// ont retenu. La clé est celle de l'adaptateur du jeu, exactement celle
// que \`recherche.ts\` interroge avant de réfléchir. Le nom du livre est
// le jeu, deux points, la variante, comme le veut \`nomDuLivre\`.
//
// Les poids sont ceux que la montée de colline a retenus. Le jeu les
// lit au chargement et les pose par-dessus les siens.

import type { Livre } from './livre';
`;

const PIED = `};

/** Les coefficients d'évaluation retenus par l'entraînement. Le jeu
 *  les pose par-dessus ceux qui sont écrits dans son \`cpu.ts\`. */
export const POIDS_APPRIS: Record<string, Record<string, number>> = {
  renard: %POIDS%,
};

/** L'heure du dernier entraînement, en texte lisible. Vide tant que
 *  l'entraînement n'a pas tourné. */
export const APPRIS_LE = '%QUAND%';
`;

function texteDuFichier(livres: Map<string, Retenu[]>, poids: Poids): string {
  const lignes = [ENTETE, 'export const LIVRES_APPRIS: Record<string, Livre> = {'];
  for (const [nom, entrees] of livres) {
    if (entrees.length === 0) continue;
    lignes.push(`  ${JSON.stringify(nom)}: {`);
    for (const e of entrees) lignes.push(`    ${JSON.stringify(e.cle)}: ${JSON.stringify(e.coup)},`);
    lignes.push('  },');
  }
  const quand = new Date().toISOString().slice(0, 16).replace('T', ' ');
  return `${lignes.join('\n')}\n${PIED.replace('%POIDS%', JSON.stringify(poids)).replace('%QUAND%', quand)}`;
}

// ─── Le tour complet ────────────────────────────────────────────────
function main(): void {
  const chantiers = chantiersDe(O.jeu);
  if (chantiers.length === 0) {
    console.error(`Jeu inconnu : ${O.jeu}. Attendu renard, merelle, tafl ou tous.`);
    process.exit(1);
  }
  console.log(`Entraînement · graine ${O.graine} · ${O.parties} parties par plateau`
    + ` · ${O.noeuds} nœuds par coup`);

  const livres = new Map<string, Retenu[]>();
  let partiesJouees = 0;
  for (const c of chantiers) {
    const debut = Date.now();
    const parties: Partie[] = [];
    for (let i = 0; i < O.parties; i++) {
      const alea = graine(O.graine + i * 31 + empreinte(`${c.jeu}:${c.variante}`));
      const marche = (): Niveau => MARCHES[entier(alea, MARCHES.length)];
      const niveaux: Record<string, Niveau> = { [c.camps[0]]: marche(), [c.camps[1]]: marche() };
      parties.push(c.partie(alea, {
        niveaux, noeudsMax: O.noeuds, ouverture: O.coups, bruit: O.bruit,
      }));
    }
    partiesJouees += parties.length;
    const retenus = livreDepuis(parties);
    livres.set(`${c.jeu}:${c.variante}`, retenus);

    const gagnees = (camp: string): number => parties.filter((p) => p.gagnant === camp).length;
    const nulles = parties.filter((p) => p.gagnant === null).length;
    const longueur = parties.reduce((s, p) => s + p.demiCoups, 0) / parties.length;
    console.log(`${c.jeu}:${c.variante} · ${parties.length} parties`
      + ` · ${c.camps[0]} ${gagnees(c.camps[0])} / ${c.camps[1]} ${gagnees(c.camps[1])}`
      + ` / nulles ${nulles} · ${longueur.toFixed(1)} demi-coups`
      + ` · ${retenus.length} entrées · ${((Date.now() - debut) / 1000).toFixed(1)} s`);
  }

  let relus = 0;
  for (const c of chantiers) {
    const livre: Record<string, string> = {};
    for (const e of livres.get(`${c.jeu}:${c.variante}`) ?? []) livre[e.cle] = e.coup;
    const verdict = c.reconnait(livre);
    if (verdict === true) relus++;
    else if (verdict === false) {
      console.error(`${c.jeu}:${c.variante} · la recherche ne retrouve pas la clé de son`
        + ' livre. Elle a dérivé, et le livre ne servirait à rien.');
      process.exit(1);
    }
  }
  console.log(`Livres relus par la recherche : ${relus}/${chantiers.length} départs reconnus`);

  let colline: Colline = {
    poids: { ...POIDS_RENARD }, adoptees: 0, gain: 0, parties: 0, garde: false,
  };
  if (O.iterations > 0) {
    console.log(`Poids du Renard · ${O.iterations} variations de ${O.matchs} parties`);
    colline = monterLaColline();
    Object.assign(POIDS_RENARD, colline.poids);
    oublierEtalon();
    console.log(`  ${colline.adoptees} variation(s) adoptée(s)`
      + ` · gain mesuré ${colline.gain}/${colline.parties} contre les anciens poids`
      + (colline.garde ? ' · les nouveaux poids sont gardés'
        : ' · rien de mieux trouvé, les anciens poids restent'));
  }

  const sortie = resolve(process.cwd(), ARGS.get('sortie') ?? 'src/games/moteur/livre-donnees.ts');
  writeFileSync(sortie, texteDuFichier(livres, colline.poids), 'utf8');
  const entrees = [...livres.values()].reduce((s, l) => s + l.length, 0);
  console.log(`Écrit : ${sortie} · ${entrees} entrées · ${partiesJouees} parties jouées`);
}

main();
