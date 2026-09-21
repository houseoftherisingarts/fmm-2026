// ─── Hnefatafl · les gravures du plateau de Hullsborg ───────────────
// Le plateau qu'Alex a taillé à la main porte une notation, comme aux
// échecs : l'ancien futhark court sur l'axe des X, le futhark récent
// sur l'axe des Y. Au centre, quatre fois la rune ᚱ tournée autour du
// trône; dans les coins, une rune à trois branches.
//
// Les runes sont TRACÉES trait par trait au canevas, jamais écrites
// avec une police : les glyphes runiques manquent sur trop d'appareils,
// et un trait brûlé au fer n'a de toute façon rien d'une fonte.

import * as THREE from 'three';
import { CELL, MID, N } from './gameLogic';

type Trait = Array<[number, number]>;

// Boîte unité, y vers le haut. Un tableau de polylignes par rune.
const FUT = {
  fehu:     [[[0.35, 0], [0.35, 1]], [[0.35, 0.45], [0.8, 0.75]], [[0.35, 0.7], [0.8, 1]]],
  uruz:     [[[0.25, 0], [0.25, 1], [0.75, 0.6], [0.75, 0]]],
  thurisaz: [[[0.35, 0], [0.35, 1]], [[0.35, 0.75], [0.75, 0.5], [0.35, 0.25]]],
  ansuz:    [[[0.35, 0], [0.35, 1]], [[0.35, 1], [0.8, 0.75]], [[0.35, 0.7], [0.8, 0.45]]],
  raido:    [[[0.3, 0], [0.3, 1], [0.75, 0.75], [0.3, 0.5], [0.75, 0]]],
  kaunan:   [[[0.7, 0.85], [0.3, 0.5], [0.7, 0.15]]],
  gebo:     [[[0.2, 0.1], [0.8, 0.9]], [[0.2, 0.9], [0.8, 0.1]]],
  wunjo:    [[[0.35, 0], [0.35, 1], [0.75, 0.75], [0.35, 0.5]]],
  hagalaz:  [[[0.25, 0], [0.25, 1]], [[0.75, 0], [0.75, 1]], [[0.25, 0.65], [0.75, 0.35]]],
  naudiz:   [[[0.5, 0], [0.5, 1]], [[0.25, 0.65], [0.75, 0.35]]],
  isaz:     [[[0.5, 0], [0.5, 1]]],
  oss:      [[[0.5, 0], [0.5, 1]], [[0.25, 0.85], [0.75, 0.6]], [[0.25, 0.6], [0.75, 0.35]]],
  kaun:     [[[0.35, 0], [0.35, 1]], [[0.35, 0.5], [0.8, 0.95]]],
  hagall:   [[[0.5, 0], [0.5, 1]], [[0.2, 0.25], [0.8, 0.75]], [[0.2, 0.75], [0.8, 0.25]]],
  ar:       [[[0.5, 0], [0.5, 1]], [[0.25, 0.35], [0.75, 0.65]]],
  sol:      [[[0.35, 1], [0.35, 0.4], [0.65, 0.6], [0.65, 0]]],
  algiz:    [[[0.5, 0], [0.5, 1]], [[0.5, 0.5], [0.2, 1]], [[0.5, 0.5], [0.8, 1]]],
} satisfies Record<string, Trait[]>;

// Les onze premières runes de chaque rangée : ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁ et ᚠᚢᚦᚬᚱᚴᚼᚾᛁᛅᛋ.
export const ANCIEN: Trait[][] = [FUT.fehu, FUT.uruz, FUT.thurisaz, FUT.ansuz, FUT.raido, FUT.kaunan,
  FUT.gebo, FUT.wunjo, FUT.hagalaz, FUT.naudiz, FUT.isaz];
export const RECENT: Trait[][] = [FUT.fehu, FUT.uruz, FUT.thurisaz, FUT.oss, FUT.raido, FUT.kaun,
  FUT.hagall, FUT.naudiz, FUT.isaz, FUT.ar, FUT.sol];

/** Brûle une rune au fer : centre (x, y) en pixels, hauteur h, angle en radians. */
function bruler(g: CanvasRenderingContext2D, rune: Trait[], x: number, y: number, h: number, angle = 0, ancre: 'centre' | 'pied' = 'centre') {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const dy = ancre === 'pied' ? 0 : 0.5;
  // Deux passes : le halo roussi autour, puis le sillon noirci.
  for (const [largeur, alpha, couleur] of [[h * 0.16, 0.22, '#3a1d0a'], [h * 0.075, 0.95, '#160b05']] as const) {
    g.lineWidth = largeur;
    g.globalAlpha = alpha;
    g.strokeStyle = couleur;
    for (const trait of rune) {
      g.beginPath();
      trait.forEach(([px, py], i) => {
        const X = (px - 0.5) * h * 0.8;
        const Y = -(py - dy) * h;
        if (i === 0) g.moveTo(X, Y); else g.lineTo(X, Y);
      });
      g.stroke();
    }
  }
  g.restore();
}

function plan(canvas: HTMLCanvasElement, taille: number, y: number): THREE.Mesh {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(taille, taille),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  m.renderOrder = 1;
  return m;
}

/** Pose les gravures : la notation sur le cadre (yCadre) et les runes
 *  du trône et des coins sur les cases (yCases). `cote` est la largeur
 *  totale du cadre, en unités de scène. */
export function graverHullsborg(group: THREE.Group, cote: number, yCadre: number, yCases: number): void {
  const span = N * CELL;
  const PX = 2048;

  // ── Le cadre : ancien futhark en X, futhark récent en Y ──
  const cadre = document.createElement('canvas');
  cadre.width = cadre.height = PX;
  const g = cadre.getContext('2d')!;
  const k = PX / cote;                       // pixels par unité de scène
  const marge = (cote - span) / 2;
  const h = marge * 0.52 * k;
  const bord = (marge * 0.5) * k;            // milieu de la bande du cadre
  for (let i = 0; i < N; i++) {
    const long = (marge + (i + 0.5) * CELL) * k;
    // Colonnes, de gauche à droite, lues depuis le bas puis depuis le haut.
    bruler(g, ANCIEN[i], long, PX - bord, h);
    bruler(g, ANCIEN[i], long, bord, h, Math.PI);
    // Rangées, de bas en haut, lues depuis la gauche puis depuis la droite.
    bruler(g, RECENT[i], bord, PX - long, h, Math.PI / 2);
    bruler(g, RECENT[i], PX - bord, PX - long, h, -Math.PI / 2);
  }
  group.add(plan(cadre, cote, yCadre));

  // ── Les cases marquées : quatre ᚱ au trône, une rune aux coins ──
  const cases = document.createElement('canvas');
  cases.width = cases.height = PX;
  const c = cases.getContext('2d')!;
  const kc = PX / span;
  const px = (n: number) => (n + 0.5) * CELL * kc;
  for (let q = 0; q < 4; q++) {
    bruler(c, FUT.raido, px(MID), px(MID), CELL * kc * 0.44, q * Math.PI / 2, 'pied');
  }
  for (const [r, col] of [[0, 0], [0, N - 1], [N - 1, 0], [N - 1, N - 1]]) {
    // Les branches de la rune pointent vers le coin du plateau.
    const angle = Math.atan2(col - MID, -(r - MID));
    bruler(c, FUT.algiz, px(col), px(r), CELL * kc * 0.62, angle);
  }
  group.add(plan(cases, span, yCases));
}
