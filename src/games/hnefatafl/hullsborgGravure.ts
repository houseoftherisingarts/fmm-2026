// ─── Hnefatafl · les gravures du plateau de Hullsborg ───────────────
// Le plateau qu'Alex a taillé à la main porte une notation, comme aux
// échecs. Tout ce qui suit est COPIÉ sur ses photos du 21 septembre
// 2026 (bords redressés en bandes, signe par signe), pas sur un tableau
// d'alphabet : Alex tient à ce que le site montre sa planche telle
// quelle, avec ses traits ronds, ses croix penchées et son bol plein.
//   • les bords gauche et droit portent l'ANCIEN futhark, taillé au
//     couteau en traits droits (ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ ᚺ ᚾ ᛁ), ᚠ en haut,
//     une rune par rangée;
//   • les bords haut et bas portent la rangée RÉCENTE, brûlée au fer
//     en traits ronds : croissant, C, arche, #, bol plein et V,
//     crochet, étoile, croix penchée, trait couché, croix, 5 angulaire,
//     le croissant à gauche, un signe par colonne.
// Sur chacun des quatre bords, les signes sont debout pour qui se tient
// à l'extérieur du plateau devant ce bord (le haut du signe regarde
// vers les cases). Une case se note (colonne récente, rangée ancienne).
// Au centre, quatre pattes fourchues autour du clou; dans les coins,
// un Y dont la fourche regarde le coin.
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

// Boîte unité, y vers le haut, x qui peut déborder de [0, 1] pour les
// signes plus larges que hauts. Un tableau de polylignes par signe; une
// polyligne fermée (premier point = dernier) est remplie, c'est le bol
// plein du cinquième signe récent.
const FUT = {
  // Ancien futhark, au couteau (ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ ᚺ ᚾ ᛁ)
  fehu:     [[[0.35, 0], [0.35, 1]], [[0.35, 0.45], [0.8, 0.75]], [[0.35, 0.7], [0.8, 1]]],
  // Sur la planche, ᚢ est un lambda : jambe gauche presque droite,
  // jambe droite qui redescend jusqu'au sol.
  uruz:     [[[0.25, 0], [0.38, 1], [0.85, 0]]],
  thurisaz: [[[0.35, 0], [0.35, 1]], [[0.35, 0.8], [0.8, 0.52], [0.35, 0.25]]],
  ansuz:    [[[0.35, 0], [0.35, 1]], [[0.35, 1], [0.8, 0.75]], [[0.35, 0.7], [0.8, 0.45]]],
  raido:    [[[0.3, 0], [0.3, 1], [0.75, 0.75], [0.3, 0.5], [0.75, 0]]],
  kaunan:   [[[0.7, 0.85], [0.3, 0.5], [0.7, 0.15]]],
  gebo:     [[[0.2, 0.1], [0.8, 0.9]], [[0.2, 0.9], [0.8, 0.1]]],
  wunjo:    [[[0.35, 0], [0.35, 1], [0.75, 0.75], [0.35, 0.5]]],
  hagalaz:  [[[0.25, 0], [0.25, 1]], [[0.75, 0], [0.75, 1]], [[0.25, 0.65], [0.75, 0.35]]],
  naudiz:   [[[0.5, 0], [0.5, 1]], [[0.25, 0.65], [0.75, 0.35]]],
  isaz:     [[[0.5, 0], [0.5, 1]]],
  // Le Y des coins.
  coin:     [[[0.5, 0], [0.5, 0.55]], [[0.5, 0.55], [0.15, 1]], [[0.5, 0.55], [0.85, 1]]],
  // Une patte du centre : tige depuis le clou, fourchue au bout.
  patte:    [[[0.5, 0], [0.5, 0.75]], [[0.5, 0.55], [0.22, 0.98]], [[0.5, 0.55], [0.78, 0.98]]],

  // Rangée récente, au fer, relevée signe par signe sur la bande
  // redressée du bord (photo 1, bord gauche; photo 5, bord bas : les
  // deux bords portent la même suite).
  // 1. Le croissant : montée à gauche, arche qui retombe à droite en
  //    petit crochet.
  croissant: [[...courbe([-0.1, 0.02], [0.15, 1.25], [0.75, 0.4]), ...courbe([0.75, 0.4], [0.8, -0.02], [0.5, 0.02]).slice(1)]],
  // 2. Le C : branche haute courbée jusqu'à la pointe, à gauche et
  //    bas, puis trait de sol vers la droite.
  ce:        [[...courbe([1.0, 1.0], [0.2, 0.95], [-0.1, 0.2]), [1.0, 0.0]]],
  // 3. L'arche : deux jambes écartées, la gauche un peu plus longue.
  arche:     [[[-0.15, 0.0], [-0.05, 0.5], ...courbe([-0.05, 0.5], [0.5, 1.3], [1.05, 0.5]).slice(1), [1.15, 0.05]]],
  // 4. Le dièse : deux montants qui penchent à droite, deux barres.
  diese:     [[[0.25, 0], [0.42, 1]], [[0.58, 0], [0.75, 1]], [[-0.15, 0.3], [1.15, 0.42]], [[-0.15, 0.62], [1.15, 0.74]]],
  // 5. Le bol plein et le V : triangle noirci à gauche, tige qui
  //    descend, deuxième branche qui remonte à droite.
  bolplein:  [[[0.45, 1.0], [0.45, 0.45], [-0.1, 0.5], [0.45, 1.0]], [[0.45, 1.0], [0.62, 0.0], [1.15, 0.95]]],
  // 6. Le crochet : une diagonale bombée qui descend, un trait de sol.
  crochet:   [courbe([-0.1, 1.0], [0.55, 0.9], [1.05, 0.05]), [[-0.1, 0.02], [1.05, 0.02]]],
  // 7. L'étoile : une tige et deux diagonales.
  etoile:    [[[0.5, 0], [0.5, 1]], [[-0.05, 0.85], [1.05, 0.15]], [[-0.05, 0.15], [1.05, 0.85]]],
  // 8. La croix penchée : grand trait qui monte vers la droite, barre
  //    presque plate qui le coupe.
  croixpenchee: [[[0.3, 0.0], [0.72, 1.0]], [[-0.15, 0.6], [1.15, 0.38]]],
  // 9. Le trait couché, seul.
  traitcouche: [[[-0.15, 0.38], [1.15, 0.34]]],
  // 10. La croix : montant qui penche, barre à mi-hauteur.
  croix:     [[[0.4, 1.0], [0.62, 0.0]], [[-0.1, 0.42], [1.1, 0.46]]],
  // 11. Le 5 angulaire : barre haute vers la droite, diagonale qui
  //     descend vers la droite, barre basse vers la gauche.
  cinq:      [[[1.1, 0.95], [0.42, 1.0], [0.72, 0.03], [-0.15, 0.0]]],
} satisfies Record<string, Trait[]>;

/** Les rangées, de haut en bas : ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁ (ancien futhark, droit). */
export const ANCIEN: Trait[][] = [FUT.fehu, FUT.uruz, FUT.thurisaz, FUT.ansuz, FUT.raido, FUT.kaunan,
  FUT.gebo, FUT.wunjo, FUT.hagalaz, FUT.naudiz, FUT.isaz];
/** Les colonnes, de gauche à droite : les onze signes ronds de la planche. */
export const RECENT: Trait[][] = [FUT.croissant, FUT.ce, FUT.arche, FUT.diese, FUT.bolplein, FUT.crochet,
  FUT.etoile, FUT.croixpenchee, FUT.traitcouche, FUT.croix, FUT.cinq];

/** Le nom des signes, pour la notation à venir : colonne puis rangée. */
export const NOM_COLONNE = ['croissant', 'c', 'arche', 'dièse', 'bol', 'crochet', 'étoile', 'croix penchée', 'trait', 'croix', 'cinq'];
export const NOM_RANGEE = ['fehu', 'uruz', 'thurisaz', 'ansuz', 'raido', 'kenaz', 'gebo', 'wunjo', 'hagalaz', 'naudiz', 'isaz'];

/** Brûle un signe au fer : centre (x, y) en pixels, hauteur h, angle en
 *  radians (sens horaire à l'écran). */
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
    g.fillStyle = couleur;
    for (const trait of rune) {
      g.beginPath();
      trait.forEach(([px, py], i) => {
        const X = (px - 0.5) * h * 0.8;
        const Y = -(py - dy) * h;
        if (i === 0) g.moveTo(X, Y); else g.lineTo(X, Y);
      });
      const [p0, pn] = [trait[0], trait[trait.length - 1]];
      if (trait.length > 2 && p0[0] === pn[0] && p0[1] === pn[1]) g.fill();
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

/** Pose les gravures : la notation sur le cadre (yCadre) et les signes
 *  du trône et des coins sur les cases (yCases). `cote` est la largeur
 *  totale du cadre, en unités de scène. */
export function graverHullsborg(group: THREE.Group, cote: number, yCadre: number, yCases: number): void {
  const span = N * CELL;
  const PX = 2048;

  // ── Le cadre : ancien futhark sur les côtés, rangée récente en haut et en bas ──
  const cadre = document.createElement('canvas');
  cadre.width = cadre.height = PX;
  const g = cadre.getContext('2d')!;
  const k = PX / cote;                       // pixels par unité de scène
  const marge = (cote - span) / 2;
  const h = marge * 0.5 * k;                 // hauteur d'un signe sur la bande
  const bord = (marge * 0.5) * k;            // milieu de la bande du cadre
  const HORAIRE = Math.PI / 2;
  for (let i = 0; i < N; i++) {
    const long = (marge + (i + 0.5) * CELL) * k;
    // Rangées (ancien futhark), ᚠ en haut. Debout pour qui regarde le
    // bord de l'extérieur : à gauche le haut du signe pointe vers la
    // droite, à droite vers la gauche.
    bruler(g, ANCIEN[i], bord, long, h, HORAIRE);
    bruler(g, ANCIEN[i], PX - bord, long, h, -HORAIRE);
    // Colonnes (rangée récente), le croissant à gauche. En bas, debout
    // pour qui se tient au sud; en haut, retourné pour qui se tient au
    // nord.
    bruler(g, RECENT[i], long, PX - bord, h, 0);
    bruler(g, RECENT[i], long, bord, h, Math.PI);
  }
  group.add(plan(cadre, cote, yCadre));

  // ── Les cases marquées : quatre pattes fourchues au trône, un Y aux coins ──
  const cases = document.createElement('canvas');
  cases.width = cases.height = PX;
  const c = cases.getContext('2d')!;
  const kc = PX / span;
  const px = (n: number) => (n + 0.5) * CELL * kc;
  for (let q = 0; q < 4; q++) {
    // Les pattes partent du clou vers les quatre coins de la case.
    bruler(c, FUT.patte, px(MID), px(MID), CELL * kc * 0.7, Math.PI / 4 + q * Math.PI / 2, 'pied');
  }
  for (const [r, col] of [[0, 0], [0, N - 1], [N - 1, 0], [N - 1, N - 1]]) {
    // La fourche du Y regarde le coin du plateau.
    const angle = Math.atan2(col - MID, -(r - MID));
    bruler(c, FUT.coin, px(col), px(r), CELL * kc * 0.62, angle);
  }
  group.add(plan(cases, span, yCases));
}
