// ─── Le moteur de « Ta place dans le clan » ─────────────────────────
// Pur : aucune dépendance, aucun réseau. Le contenu vient de
// src/content/placeClan.ts. Ici on additionne, on tranche et on
// compose des équipes.

import {
  ARCHETYPES, FICHES, FONCTIONS, GROUPES, QUESTIONS, TAILLE_EQUIPE,
  type Archetype, type Fonction, type Groupe,
} from '../content/placeClan';

export type Scores = Record<Fonction, number>;

export interface Verdict {
  fonction: Fonction;
  seconde: Fonction;
  archetype: Archetype;
  scores: Scores;
  /** Le titre porté dans le groupe choisi. */
  titre: string;
  titreSecond: string;
}

export const scoresVides = (): Scores =>
  Object.fromEntries(FONCTIONS.map((f) => [f, 0])) as Scores;

/** Additionne les réponses : reponses[i] = index choisi à la question i, ou -1. */
export function calculerScores(reponses: number[]): Scores {
  const s = scoresVides();
  QUESTIONS.forEach((q, i) => {
    const r = q.reponses[reponses[i] ?? -1];
    if (!r) return;
    for (const [f, p] of Object.entries(r.poids)) s[f as Fonction] += p ?? 0;
  });
  return s;
}

/** Points par archétype, en sommant ses fonctions. */
export function scoresArchetypes(s: Scores): Record<Archetype, number> {
  const a: Record<Archetype, number> = { roi: 0, guerrier: 0, magicien: 0, amant: 0 };
  for (const f of FONCTIONS) a[FICHES[f].archetype] += s[f];
  return a;
}

/**
 * Tranche. À égalité de points entre deux fonctions, celle dont
 * l'archétype a le plus de points l'emporte; à égalité encore, l'ordre
 * de FONCTIONS (stable, donc prévisible dans l'admin).
 */
export function trancher(s: Scores): { fonction: Fonction; seconde: Fonction; archetype: Archetype } {
  const arch = scoresArchetypes(s);
  const ordre = [...FONCTIONS].sort((a, b) =>
    s[b] - s[a] || arch[FICHES[b].archetype] - arch[FICHES[a].archetype] || FONCTIONS.indexOf(a) - FONCTIONS.indexOf(b));
  const fonction = ordre[0];
  const seconde = ordre[1];
  return { fonction, seconde, archetype: FICHES[fonction].archetype };
}

export function verdict(groupe: Groupe, reponses: number[]): Verdict {
  const scores = calculerScores(reponses);
  const t = trancher(scores);
  const titres = GROUPES[groupe].titres;
  return { ...t, scores, titre: titres[t.fonction], titreSecond: titres[t.seconde] };
}

export const nomArchetype = (a: Archetype) => ARCHETYPES[a].nom;

// ── Composer une équipe ─────────────────────────────────────────────
// Une équipe complète = une personne par fonction, tirée parmi les gens
// du même groupe. La personne qui demande occupe sa propre fonction; on
// cherche les six autres. Une fonction sans candidat direct se comble
// par quelqu'un dont c'est la seconde fonction; sinon la place reste
// vide, et l'équipe le dit.

export interface Candidat {
  uid: string;
  groupe: Groupe;
  fonction: Fonction;
  seconde: Fonction;
}

export interface PlaceEquipe { fonction: Fonction; uid: string | null; parDefaut: boolean }

export function composerEquipe(
  moi: Candidat,
  candidats: Candidat[],
  exclus: Set<string> = new Set(),
  alea: () => number = Math.random,
): PlaceEquipe[] {
  const pris = new Set<string>([moi.uid]);
  const libres = candidats.filter((c) => c.groupe === moi.groupe && c.uid !== moi.uid && !exclus.has(c.uid));
  const piocher = (liste: Candidat[]) => {
    const dispo = liste.filter((c) => !pris.has(c.uid));
    if (!dispo.length) return null;
    const choix = dispo[Math.floor(alea() * dispo.length)];
    pris.add(choix.uid);
    return choix.uid;
  };
  return FONCTIONS.map((f) => {
    if (f === moi.fonction) return { fonction: f, uid: moi.uid, parDefaut: false };
    const direct = piocher(libres.filter((c) => c.fonction === f));
    if (direct) return { fonction: f, uid: direct, parDefaut: false };
    const second = piocher(libres.filter((c) => c.seconde === f));
    return { fonction: f, uid: second, parDefaut: second !== null };
  });
}

export const equipeComplete = (e: PlaceEquipe[]) => e.filter((p) => p.uid).length === TAILLE_EQUIPE;

// ── Pour la carte de l'admin ────────────────────────────────────────
/** Le maximum de points que chaque fonction peut atteindre sur tout le questionnaire. */
export function plafonds(): Scores {
  const s = scoresVides();
  for (const q of QUESTIONS) {
    for (const f of FONCTIONS) s[f] += Math.max(...q.reponses.map((r) => r.poids[f] ?? 0));
  }
  return s;
}

/** Combien de réponses, au total, donnent au moins un point à chaque fonction. */
export function couverture(): Scores {
  const s = scoresVides();
  for (const q of QUESTIONS) for (const r of q.reponses) for (const f of FONCTIONS) if (r.poids[f]) s[f] += 1;
  return s;
}
