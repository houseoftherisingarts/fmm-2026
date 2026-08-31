// ─── La table de mérelle en trois dimensions ────────────────────────
// Alex, 2026-08-30 : le plateau est un madrier de chêne posé sur la même
// table que le hnefatafl et le jeu de dés. Les lignes sont gravées dans
// le bois (peintes au canevas, avec leur ombre et leur arête claire) et
// les vingt-quatre points sont de vraies cupules creusées, pas des
// pastilles collées : c'est ce qui donne la lumière rasante quand on
// fait tourner la caméra.
//
// Les pions sont tournés au tour, littéralement : une LatheGeometry
// suit le profil d'un pion de tourneur sur bois, pied évasé, taille
// creusée, dôme sur le dessus. Deux teintes, chêne clair et bois teint.
//
// Ce fichier ne connaît rien aux règles. Il reçoit des ordres (pose,
// déplace, retire, allume) et rend des clics en numéros de point.

import * as THREE from 'three';
import gsap from 'gsap';
import { ARETES, POSITIONS, type Camp } from './logic';

/** Un pas de grille, en unités de scène. */
export const CELL = 1.5;
/** La surface du plateau : tout ce qui se pose dessus vit à cette hauteur. */
const HAUT = 0.18;
const DEMI_PLATEAU = 3.6; // en unités de grille, du centre au bord du bois

const CHENE_CLAIR = 0xd8b float_placeholder;

export interface SceneMerelle {
  renderer: THREE.WebGLRenderer;
  /** Rend le point visé par ce clic, ou null si le clic tombe à côté. */
  pointSous(clientX: number, clientY: number): number | null;
  poser(p: number, camp: Camp, fini?: () => void): void;
  deplacer(de: number, vers: number, fini?: () => void): void;
  retirer(p: number, fini?: () => void): void;
  /** Remet le plateau dans l'état donné, sans animation. */
  reinitialiser(points: readonly (0 | 1 | 2)[]): void;
  /** Allume la table : le pion tenu, où il peut aller, et les pions
   *  adverses qu'on a le droit de retirer. */
  allumer(opts: { selection?: number | null; destinations?: number[]; retraits?: number[] }): void;
  attacherEntrees(surPoint: (p: number) => void): () => void;
  attacherResize(): () => void;
  dispose(): void;
}
