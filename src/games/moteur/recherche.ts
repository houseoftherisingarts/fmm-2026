// ─── La recherche ───────────────────────────────────────────────────
// Alex, 2026-09-01 : un seul negamax pour les trois plateaux, avec ce
// qui manquait aux trois anciens adversaires et qui faisait toute la
// différence :
//
//   · l'approfondissement progressif, qui rend un coup jouable à
//     n'importe quel moment et donne un ordre de coups déjà trié pour
//     la marche suivante;
//   · la table de transposition, parce qu'au tafl comme à la mérelle
//     la même position revient par vingt chemins;
//   · la quiescence, qui suit les prises jusqu'au calme : sans elle la
//     machine s'arrête au milieu d'un échange et croit avoir gagné une
//     pièce qu'elle rendra au coup suivant;
//   · les coups tueurs et l'historique, qui font tomber l'arbre de
//     moitié en essayant d'abord ce qui a déjà réfuté ailleurs.
//
// Rien ici ne connaît un jeu en particulier. Tout passe par
// l'adaptateur (types.ts).

import { MAT, type Adaptateur, type CoupNote, type OptionsRecherche, type Resultat } from './types';

/** Levée pour remonter d'un coup au sommet quand l'horloge tombe. */
const ARRET = Symbol('arret');

type Drapeau = 'exact' | 'basse' | 'haute';
interface Entree { prof: number; note: number; drapeau: Drapeau; meilleur: string | null }

/** Une note de mat vue depuis la racine : plus le mat est loin, moins
 *  il vaut. Sans ce réglage la machine tourne en rond au lieu de finir. */
const estMat = (n: number): boolean => Math.abs(n) > MAT - 1000;

export function chercher<E, C>(
  a: Adaptateur<E, C>,
  etat: E,
  o: OptionsRecherche,
): Resultat<C> {
  const debut = Date.now();
  const table = new Map<string, Entree>();
  const tueurs: string[][] = [];
  const histoire = new Map<string, number>();
  let noeuds = 0;
  let stop = false;

  const horloge = () => {
    if (stop) return true;
    if ((noeuds & 1023) !== 0) return false;
    if (o.tempsMs !== undefined && Date.now() - debut >= o.tempsMs) stop = true;
    if (o.noeudsMax !== undefined && noeuds >= o.noeudsMax) stop = true;
    if (o.arret?.()) stop = true;
    return stop;
  };

  // ── Le livre d'ouvertures ─────────────────────────────────────────
  // Il sort d'un million de parties jouées au banc d'essai. Quand la
  // position y est, la machine joue sans réfléchir : c'est du temps
  // gagné pour le milieu de partie, et c'est ce qui empêche les
  // premiers coups de se ressembler tous.
  const coupsRacine = a.coups(etat);
  if (coupsRacine.length === 0) {
    return { coup: null, note: 0, profondeur: 0, noeuds: 0, racine: [] };
  }
  if (o.livre) {
    const nom = o.livre[a.cle(etat)];
    const trouve = nom ? coupsRacine.find((c) => a.nomCoup(c) === nom) : undefined;
    if (trouve) {
      return {
        coup: trouve, note: 0, profondeur: 0, noeuds: 0, duLivre: true,
        racine: [{ coup: trouve, note: 0 }],
      };
    }
  }

  // ── L'ordre des coups ─────────────────────────────────────────────
  const trier = (e: E, coups: C[], ply: number, coupTable: string | null): C[] => {
    const k = tueurs[ply] ?? [];
    const poids = (c: C): number => {
      const nom = a.nomCoup(c);
      if (nom === coupTable) return 1e9;
      let p = (a.promesse?.(e, c) ?? 0) * 1000;
      if (a.bruyant?.(e, c)) p += 500_000;
      if (nom === k[0]) p += 200_000;
      else if (nom === k[1]) p += 150_000;
      p += histoire.get(nom) ?? 0;
      return p;
    };
    return [...coups].sort((x, y) => poids(y) - poids(x));
  };

  const noterTueur = (nom: string, ply: number, profondeur: number) => {
    const k = tueurs[ply] ?? (tueurs[ply] = []);
    if (k[0] !== nom) { k[1] = k[0]; k[0] = nom; }
    histoire.set(nom, (histoire.get(nom) ?? 0) + profondeur * profondeur);
  };

  // ── La quiescence ─────────────────────────────────────────────────
  const calme = (e: E, alpha: number, beta: number, ply: number): number => {
    noeuds++;
    if (horloge()) throw ARRET;
    const t = a.fini(e);
    if (t !== null) return t === 0 ? 0 : t > 0 ? MAT - ply : -MAT + ply;

    const debout = a.evaluer(e);
    if (debout >= beta) return beta;
    let al = alpha > debout ? alpha : debout;

    if (!a.bruyant) return al;
    const bruyants = a.coups(e).filter((c) => a.bruyant!(e, c));
    if (bruyants.length === 0) return al;
    for (const c of trier(e, bruyants, ply, null)) {
      const note = -calme(a.jouer(e, c), -beta, -al, ply + 1);
      if (note >= beta) return beta;
      if (note > al) al = note;
    }
    return al;
  };

  // ── Le negamax ────────────────────────────────────────────────────
  const negamax = (e: E, prof: number, alpha: number, beta: number, ply: number): number => {
    noeuds++;
    if (horloge()) throw ARRET;

    const t = a.fini(e);
    if (t !== null) return t === 0 ? 0 : t > 0 ? MAT - ply : -MAT + ply;
    if (prof <= 0) return o.quiescence ? calme(e, alpha, beta, ply) : a.evaluer(e);

    const cle = a.cle(e);
    const vue = table.get(cle);
    let coupTable: string | null = null;
    if (vue) {
      coupTable = vue.meilleur;
      if (vue.prof >= prof) {
        // Une note de mat rangée dans la table se compte depuis le
        // nœud qui l'a trouvée : on la ramène à la profondeur d'ici.
        const n = estMat(vue.note)
          ? (vue.note > 0 ? vue.note - ply : vue.note + ply)
          : vue.note;
        if (vue.drapeau === 'exact') return n;
        if (vue.drapeau === 'basse' && n > alpha) alpha = n;
        else if (vue.drapeau === 'haute' && n < beta) beta = n;
        if (alpha >= beta) return n;
      }
    }

    const coups = a.coups(e);
    if (coups.length === 0) {
      // Un jeu bien écrit tranche dans `fini`. Sans coup et sans
      // verdict, la position est tenue pour perdue : personne ne peut
      // jouer, et c'est celui qui a le trait qui en paie le prix.
      return -MAT + ply;
    }

    const alphaDepart = alpha;
    let meilleure = -Infinity;
    let meilleurNom: string | null = null;

    for (const c of trier(e, coups, ply, coupTable)) {
      const note = -negamax(a.jouer(e, c), prof - 1, -beta, -alpha, ply + 1);
      if (note > meilleure) { meilleure = note; meilleurNom = a.nomCoup(c); }
      if (note > alpha) alpha = note;
      if (alpha >= beta) {
        if (!a.bruyant?.(e, c)) noterTueur(a.nomCoup(c), ply, prof);
        break;
      }
    }

    const drapeau: Drapeau = meilleure <= alphaDepart ? 'haute'
      : meilleure >= beta ? 'basse' : 'exact';
    const rangee = estMat(meilleure)
      ? (meilleure > 0 ? meilleure + ply : meilleure - ply)
      : meilleure;
    table.set(cle, { prof, note: rangee, drapeau, meilleur: meilleurNom });
    return meilleure;
  };

  // ── L'approfondissement progressif ────────────────────────────────
  // Chaque marche repart de zéro, mais avec la table et l'historique de
  // la précédente : elle coûte peu et trie l'arbre pour la suivante. La
  // dernière marche ENTIÈREMENT finie fait foi; celle que l'horloge a
  // coupée est jetée, sauf le meilleur coup déjà confirmé.
  // Le premier tri se fait à l'évaluation seule, avant toute descente.
  // Il sert deux fois : il ordonne la première marche, et il tient lieu
  // de réponse quand l'horloge tombe avant même que la profondeur un
  // soit finie. Sans ce filet, la recherche rendait le premier coup de
  // la liste, toujours le même, et deux machines pressées se
  // renvoyaient la balle jusqu'à la nulle par répétition (mesuré au
  // banc du Renard le 2026-09-01, huit parties sur huit).
  let racine: CoupNote<C>[] = coupsRacine
    .map((c) => ({ coup: c, note: -a.evaluer(a.jouer(etat, c)) }))
    .sort((x, y) => y.note - x.note);
  let meilleur: C = racine[0].coup;
  let noteFinale = racine[0].note;
  let atteinte = 0;

  for (let prof = 1; prof <= o.profondeurMax; prof++) {
    const tour: CoupNote<C>[] = [];
    let alpha = -Infinity;
    let coupe = false;
    try {
      // L'ordre de la marche précédente d'abord : le meilleur coup
      // connu fait tomber les autres tout de suite.
      const ordre = [meilleur, ...racine.map((r) => r.coup).filter((c) => c !== meilleur)];
      for (const c of ordre) {
        // À fenêtre pleine quand l'appelant a besoin de notes justes
        // pour TOUS les coups, et non seulement du meilleur.
        const borne = o.notesExactes ? -Infinity : -alpha;
        const note = -negamax(a.jouer(etat, c), prof - 1, -Infinity, borne, 1);
        tour.push({ coup: c, note });
        if (note > alpha) alpha = note;
      }
    } catch (err) {
      if (err !== ARRET) throw err;
      coupe = true;
    }
    if (!coupe) {
      tour.sort((x, y) => y.note - x.note);
      racine = tour;
      meilleur = tour[0].coup;
      noteFinale = tour[0].note;
      atteinte = prof;
      // Le mat est trouvé : rien de plus profond ne le rendra meilleur.
      if (estMat(noteFinale)) break;
    } else {
      // La marche est incomplète, mais ce qu'elle a fini de mesurer
      // vaut mieux que rien quand elle a battu le champion sortant.
      if (tour.length > 0) {
        tour.sort((x, y) => y.note - x.note);
        if (tour[0].note > noteFinale) { meilleur = tour[0].coup; noteFinale = tour[0].note; }
      }
      break;
    }
    if (stop) break;
  }

  return { coup: meilleur, note: noteFinale, profondeur: atteinte, noeuds, racine };
}
