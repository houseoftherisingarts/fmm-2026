// ─── Hnefatafl · les gravures du plateau de Hullsborg ───────────────
// Le plateau qu'Alex a taillé à la main porte une notation, comme aux
// échecs, relevée sur ses photos du 21 septembre 2026 :
//   • les bords gauche et droit portent l'ANCIEN futhark (ᚠ en haut,
//     lu vers le bas), une rune par rangée;
//   • les bords haut et bas portent le futhark RÉCENT (ᚠ à gauche,
//     lu vers la droite), une rune par colonne.
// Les deux alphabets se croisent : une case se note (colonne récente,
// rangée ancienne), par exemple ᚠ·ᚢ. Les runes sont couchées le long
// du bord, comme sur la planche : sur les côtés, le haut de la rune
// regarde vers le plateau; en haut et en bas, il regarde vers la
// gauche. Au centre, quatre fois la rune ᚱ tournée autour du trône;
// dans les coins, une rune à trois branches.
//
// Les runes sont TRACÉES trait par trait au canevas, jamais écrites
// avec une police : les glyphes runiques manquent sur trop d'appareils,
// et un trait brûlé au fer n'a de toute façon rien d'une fonte.

import * as THREE from 'three';
import { CELL, MID, N } from './gameLogic';

type Trait = Array<[number, number]>;

/** Une branche courbe, échantillonnée en polyligne : de p0 à p1 en
 *  passant près du point de contrôle c (Bézier quadratique). */
function courbe(p0: [number, number], c: [number, number], p1: [number, number], n = 8): Trait {
  const pts: Trait = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push([u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]]);
  }
  return pts;
}

// Boîte unité, y vers le haut. Un tableau de polylignes par rune.
//
// Les deux alphabets doivent se distinguer à l'œil, parce que la
// notation d'une case les combine (ᚠ récent · ᚢ ancien, par exemple)
// et qu'une rune de forme identique dans les deux rangées la rendrait
// ambiguë (Alex, 2026-09-21, d'après son tableau des deux futharks).
// L'ancien futhark est donc tracé tout en traits droits et anguleux;
// le futhark récent, comme sur le tableau, en branches rondes et
// courbées, avec un point à chaque bout de trait.
const FUT = {
  // Ancien futhark (les onze premières : ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ ᚺ ᚾ ᛁ)
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
  algiz:    [[[0.5, 0], [0.5, 1]], [[0.5, 0.5], [0.2, 1]], [[0.5, 0.5], [0.8, 1]]],
  // Futhark récent (les onze premières : ᚠ ᚢ ᚦ ᚬ ᚱ ᚴ ᚼ ᚾ ᛁ ᛅ ᛋ), en
  // branches rondes.
  fe:       [[[0.3, 0], [0.3, 1]], courbe([0.3, 0.95], [0.72, 0.98], [0.78, 0.66]), courbe([0.3, 0.68], [0.7, 0.7], [0.76, 0.4])],
  ur:       [[[0.25, 0], [0.25, 1]], courbe([0.25, 1], [0.8, 1.04], [0.74, 0.32])],
  thurs:    [[[0.3, 0], [0.3, 1]], courbe([0.3, 0.82], [0.95, 0.55], [0.3, 0.28])],
  oss:      [[[0.6, 0], [0.6, 1]], courbe([0.6, 0.92], [0.28, 0.9], [0.18, 0.6]), courbe([0.6, 0.64], [0.28, 0.62], [0.18, 0.33])],
  reid:     [[[0.3, 0], [0.3, 1]], courbe([0.3, 1], [0.9, 0.96], [0.3, 0.55]), courbe([0.3, 0.55], [0.5, 0.35], [0.76, 0.03])],
  kaun:     [[[0.35, 0], [0.35, 1]], courbe([0.35, 0.5], [0.58, 0.68], [0.76, 0.96])],
  hagall:   [[[0.5, 0.04], [0.5, 0.96]], [[0.2, 0.27], [0.8, 0.73]], [[0.2, 0.73], [0.8, 0.27]]],
  naudr:    [[[0.5, 0], [0.5, 1]], courbe([0.22, 0.7], [0.5, 0.44], [0.78, 0.36])],
  iss:      [[[0.5, 0.05], [0.5, 0.95]]],
  ar:       [[[0.5, 0], [0.5, 1]], courbe([0.5, 0.78], [0.3, 0.66], [0.2, 0.36])],
  sol:      [[[0.7, 1], [0.3, 0.64], [0.7, 0.38], [0.32, 0.02]]],
} satisfies Record<string, Trait[]>;

/** Les rangées, de haut en bas : ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁ (ancien futhark, droit). */
export const ANCIEN: Trait[][] = [FUT.fehu, FUT.uruz, FUT.thurisaz, FUT.ansuz, FUT.raido, FUT.kaunan,
  FUT.gebo, FUT.wunjo, FUT.hagalaz, FUT.naudiz, FUT.isaz];
/** Les colonnes, de gauche à droite : ᚠᚢᚦᚬᚱᚴᚼᚾᛁᛅᛋ (futhark récent, rond). */
export const RECENT: Trait[][] = [FUT.fe, FUT.ur, FUT.thurs, FUT.oss, FUT.reid, FUT.kaun,
  FUT.hagall, FUT.naudr, FUT.iss, FUT.ar, FUT.sol];

/** Le nom des runes, pour la notation à venir : colonne puis rangée. */
export const NOM_COLONNE = ['fé', 'úr', 'þurs', 'óss', 'reið', 'kaun', 'hagall', 'nauðr', 'íss', 'ár', 'sól'];
export const NOM_RANGEE = ['fehu', 'uruz', 'thurisaz', 'ansuz', 'raido', 'kenaz', 'gebo', 'wunjo', 'hagalaz', 'naudiz', 'isaz'];

/** Brûle une rune au fer : centre (x, y) en pixels, hauteur h, angle en radians
 *  (sens horaire à l'écran). */
function bruler(g: CanvasRenderingContext2D, rune: Trait[], x: number, y: number, h: number, angle = 0, ancre: 'centre' | 'pied' = 'centre', rond = false) {
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
      if (rond) {
        // Le futhark récent finit chaque trait par un point, comme
        // sur le tableau : c'est ce qui le sépare de l'ancien.
        g.fillStyle = couleur;
        for (const [px, py] of [trait[0], trait[trait.length - 1]]) {
          g.beginPath();
          g.arc((px - 0.5) * h * 0.8, -(py - dy) * h, largeur * 0.95, 0, Math.PI * 2);
          g.fill();
        }
      }
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

  // ── Le cadre : ancien futhark sur les côtés, récent en haut et en bas ──
  const cadre = document.createElement('canvas');
  cadre.width = cadre.height = PX;
  const g = cadre.getContext('2d')!;
  const k = PX / cote;                       // pixels par unité de scène
  const marge = (cote - span) / 2;
  const h = marge * 0.62 * k;                // la rune couchée court le long du bord
  const bord = (marge * 0.5) * k;            // milieu de la bande du cadre
  const HORAIRE = Math.PI / 2;
  for (let i = 0; i < N; i++) {
    const long = (marge + (i + 0.5) * CELL) * k;
    // Rangées (ancien futhark), de haut en bas. À gauche, la rune est
    // couchée le haut vers le plateau; à droite, pareil, donc à l'envers.
    bruler(g, ANCIEN[i], bord, long, h, HORAIRE);
    bruler(g, ANCIEN[i], PX - bord, long, h, -HORAIRE);
    // Colonnes (futhark récent), de gauche à droite, couchées le haut
    // vers la gauche, en haut comme en bas.
    bruler(g, RECENT[i], long, bord, h, -HORAIRE, 'centre', true);
    bruler(g, RECENT[i], long, PX - bord, h, -HORAIRE, 'centre', true);
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
