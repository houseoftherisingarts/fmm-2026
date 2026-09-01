// ─── Le livre d'ouvertures ──────────────────────────────────────────
// Alex, 2026-09-01 : « il faut que l'IA réfléchisse aux règles,
// apprenne les règles, fasse plusieurs parties en background. »
//
// C'est ici que se dépose ce qu'elle a appris. Le banc d'essai
// (tools/entrainement.ts) fait jouer la machine contre elle-même des
// milliers de fois, garde les premiers coups des parties gagnées, et
// écrit le résultat dans `livre-donnees.ts`, un fichier généré que
// personne ne modifie à la main.
//
// Le livre sert deux choses. Il rend les débuts de partie plus rapides,
// puisque la machine n'a rien à chercher. Il les rend surtout plus
// variés : un moteur sans livre rejoue exactement la même ouverture
// contre tout le monde, et le premier joueur venu apprend la parade par
// cœur en trois parties.

import { LIVRES_APPRIS } from './livre-donnees';

/** La clé de position vers le nom du coup à jouer. */
export type Livre = Record<string, string>;

/** Le nom d'un livre : le jeu, puis la variante. */
export const nomDuLivre = (jeu: string, variante: string): string => `${jeu}:${variante}`;

export function livreDe(jeu: string, variante: string): Livre | undefined {
  return LIVRES_APPRIS[nomDuLivre(jeu, variante)];
}

export const livreVide: Livre = {};
