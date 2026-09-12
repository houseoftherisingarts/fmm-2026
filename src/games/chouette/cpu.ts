// ─── La maison au Cul de chouette ───────────────────────────────────
// Les convives de la table jouent selon les dix marches communes aux
// jeux du festival (../moteur/niveaux). Ici, une marche règle trois
// choses : l'audace au sirotage, le goût du pari, et la vitesse de la
// main quand il faut crier.

import type { Niveau } from '../moteur/niveaux';
import { CIBLE, type Face, type Joueur, type Partie } from './regles';

/** Sirote-t-il ? Plus la chouette est haute et plus il est loin, plus il ose. */
export function veutSiroter(p: Partie, niveau: Niveau): boolean {
  const moi = p.joueurs[p.tour];
  const chouette = p.combinaison?.valeur ?? 1;
  const meneur = Math.max(...p.joueurs.map((j) => j.score));
  const retard = meneur - moi.score;
  // Un sixième de chance de réussir : la mise vaut le coup quand la
  // chouette est petite (peu à perdre) ou quand il faut rattraper.
  let envie = chouette <= 2 ? 0.75 : chouette <= 4 ? 0.4 : 0.25;
  if (retard > 80) envie += 0.25;
  if (moi.score >= CIBLE - 40) envie -= 0.3;
  // Les marches basses jouent au hasard, les hautes calculent.
  const sagesse = niveau / 10;
  const hasard = Math.random();
  return hasard < envie * (0.6 + 0.4 * sagesse) + (1 - sagesse) * 0.15;
}

/** Parie-t-il sur le sirotage d'un autre, et sur quelle face ? */
export function pariSirop(j: Joueur, chouette: Face, niveau: Niveau): Face | null {
  if (j.score < 5) return null;
  if (Math.random() > 0.35 + niveau * 0.03) return null;
  // Le connétable sait que toute face a la même chance et évite celle
  // que le siroteur espère (elle rapporte moins de plaisir à la table).
  const faces = ([1, 2, 3, 4, 5, 6] as Face[]).filter((f) => niveau < 6 || f !== chouette);
  return faces[Math.floor(Math.random() * faces.length)];
}

/** Le temps qu'il met à crier, en millisecondes. Le marmiton est lent et distrait. */
export function delaiCri(niveau: Niveau): number {
  const base = 1500 - niveau * 95;
  return Math.max(320, base + (Math.random() - 0.3) * 500);
}

/** Sur une soufflette, qui défie-t-il ? Le meneur, quand il est assez fort pour y penser. */
export function cibleSoufflette(p: Partie, niveau: Niveau): string | null {
  const moi = p.joueurs[p.tour];
  const autres = p.joueurs.filter((j) => j.id !== moi.id);
  if (autres.length === 0 || Math.random() > 0.35 + niveau * 0.05) return null;
  const tri = [...autres].sort((a, b) => b.score - a.score);
  return niveau >= 5 ? tri[0].id : autres[Math.floor(Math.random() * autres.length)].id;
}

/** Relève-t-il un néant avec sa grelottine ? */
export function veutDefierGrelottine(j: Joueur, niveau: Niveau): boolean {
  return j.grelottine && j.score > 0 && Math.random() < 0.3 + niveau * 0.06;
}
