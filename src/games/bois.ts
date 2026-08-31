// ─── Le bois des plateaux ───────────────────────────────────────────
// Alex, 2026-08-31 : la mérelle et le renard partagent maintenant le
// même atelier. Trois choses vivent ici, et rien d'autre :
//
//   · le grain, peint au canevas avec de vraies fibres longues qui se
//     cintrent autour des nœuds, comme le fait le bois débité sur
//     dosse (c'est ce cintrage qui distingue une planche d'un carton
//     rayé, et c'est ce qui manquait aux deux plateaux);
//   · la carte de normales, calculée par un Sobel sur un relief peint
//     en niveaux de gris, pour que les lignes gravées et les cupules
//     accrochent vraiment la lumière rasante au lieu d'être un dessin
//     posé à plat;
//   · l'ombre de contact, le disque flou qui pose l'objet sur la table
//     au lieu de le laisser flotter.
//
// Tout est peint une fois au montage de la scène et jamais retouché :
// aucun téléchargement, et rien qui coûte une image par seconde.

import * as THREE from 'three';

export interface GrainOptions {
  taille?: number;
  /** La couleur du bois nu. */
  fond: string;
  /** La couleur des fibres. */
  veine: string;
  /** Nombre de fibres. Un chêne en veut beaucoup, une épinette encore plus. */
  fibres?: number;
  /** Combien de nœuds, et leur force de cintrage. */
  noeuds?: number;
  /** L'amplitude d'ondulation des fibres, en pixels. */
  ondulation?: number;
  /** Le nombre de fois que la texture se répétera : les fibres
   *  s'affinent d'autant pour garder la même finesse à l'écran. */
  repetition?: number;
}

/**
 * Une planche peinte au canevas.
 *
 * Chaque fibre est une courbe verticale : une ondulation lente de
 * fond, plus le cintrage de chaque nœud, qui la repousse d'autant plus
 * fort qu'elle passe près de lui. C'est ce qui donne les arches en
 * ogive du bois de dosse, et c'est ce qu'un simple sinus ne donne pas.
 */
export function grainDeBois(o: GrainOptions): HTMLCanvasElement {
  const S = o.taille ?? 512;
  const rep = o.repetition ?? 1;
  const nbFibres = Math.round((o.fibres ?? 420) * rep);
  const nbNoeuds = o.noeuds ?? 3;
  const onde = (o.ondulation ?? 9) / rep;

  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = o.fond;
  g.fillRect(0, 0, S, S);

  // Les nœuds d'abord : les fibres ont besoin de savoir où ils sont.
  const noeuds = Array.from({ length: nbNoeuds }, () => ({
    x: S * (0.12 + Math.random() * 0.76),
    y: S * (0.12 + Math.random() * 0.76),
    rayon: (S * 0.028 + Math.random() * S * 0.026) / Math.sqrt(rep),
    portee: (S * 0.10 + Math.random() * S * 0.09) / Math.sqrt(rep),
  }));

  g.lineCap = 'round';
  g.lineJoin = 'round';
  const pas = Math.max(4, Math.round(S / 90));

  for (let f = 0; f < nbFibres; f++) {
    const x0 = Math.random() * S;
    const phase = Math.random() * Math.PI * 2;
    const frequence = 0.8 + Math.random() * 1.6;
    const amplitude = onde * (0.35 + Math.random() * 0.9);
    g.globalAlpha = 0.025 + Math.random() * 0.085;
    g.strokeStyle = o.veine;
    g.lineWidth = (0.35 + Math.random() * 0.95) / Math.sqrt(rep);
    g.beginPath();
    for (let y = -pas; y <= S + pas; y += pas) {
      let dx = Math.sin((y / S) * Math.PI * frequence + phase) * amplitude;
      for (const n of noeuds) {
        const dy = y - n.y;
        const ex = x0 - n.x;
        const distance = Math.abs(ex);
        if (distance > n.portee * 2.4) continue;
        // Une gaussienne en hauteur, une décroissance en largeur : la
        // fibre s'écarte du nœud et se referme derrière lui.
        const poids = Math.exp(-(dy * dy) / (2 * n.portee * n.portee))
          * Math.exp(-distance / n.portee);
        dx += Math.sign(ex || 1) * n.rayon * 1.9 * poids;
      }
      if (y <= -pas) g.moveTo(x0 + dx, y);
      else g.lineTo(x0 + dx, y);
    }
    g.stroke();
  }

  // Les nœuds eux-mêmes : des anneaux serrés, discrets, jamais des
  // taches noires. Un nœud trop marqué se lit comme une salissure.
  for (const n of noeuds) {
    for (let r = n.rayon; r > 0.9; r -= Math.max(0.9, n.rayon / 9)) {
      g.globalAlpha = 0.05 + (n.rayon - r) * 0.014;
      g.strokeStyle = o.veine;
      g.lineWidth = 0.8 / Math.sqrt(rep);
      g.beginPath();
      g.ellipse(n.x, n.y, r, r * 0.52, 0.3, 0, Math.PI * 2);
      g.stroke();
    }
  }

  // Le bruit du bois brut, pour casser la régularité des courbes.
  g.globalAlpha = 0.04;
  const grains = Math.round(S * S * 0.014);
  for (let i = 0; i < grains; i++) {
    g.fillStyle = Math.random() > 0.5 ? '#000' : '#fff';
    g.fillRect(Math.random() * S, Math.random() * S, 1, 1);
  }
  g.globalAlpha = 1;
  return c;
}

/**
 * La carte de normales d'un relief peint en niveaux de gris (blanc =
 * la surface, noir = le fond du creux), par un Sobel classique.
 *
 * Un seul passage au montage : environ un million de pixels, quelques
 * dizaines de millisecondes, et plus rien ensuite.
 */
export function carteNormales(relief: HTMLCanvasElement, force = 2.4): THREE.CanvasTexture {
  const S = relief.width;
  const src = relief.getContext('2d')!.getImageData(0, 0, S, S).data;
  const sortie = document.createElement('canvas');
  sortie.width = sortie.height = S;
  const g = sortie.getContext('2d')!;
  const img = g.createImageData(S, S);
  const h = (x: number, y: number): number => {
    const cx = x < 0 ? 0 : x >= S ? S - 1 : x;
    const cy = y < 0 ? 0 : y >= S ? S - 1 : y;
    return src[(cy * S + cx) * 4] / 255;
  };

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (h(x - 1, y - 1) + 2 * h(x - 1, y) + h(x - 1, y + 1))
        - (h(x + 1, y - 1) + 2 * h(x + 1, y) + h(x + 1, y + 1));
      const dy = (h(x - 1, y - 1) + 2 * h(x, y - 1) + h(x + 1, y - 1))
        - (h(x - 1, y + 1) + 2 * h(x, y + 1) + h(x + 1, y + 1));
      let nx = dx * force;
      let ny = dy * force;
      const nz = 1;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l; ny /= l;
      const i = (y * S + x) * 4;
      img.data[i] = Math.round((nx * 0.5 + 0.5) * 255);
      img.data[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      img.data[i + 2] = Math.round(((1 / l) * 0.5 + 0.5) * 255);
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(sortie);
  t.anisotropy = 8;
  return t;
}

/** L'ombre douce qui pose l'objet sur la table : un disque noir qui
 *  s'éteint vers le bord, et rien de plus. */
export function ombreDeContact(taille = 256, force = 0.55): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = taille;
  const g = c.getContext('2d')!;
  const r = taille / 2;
  const grad = g.createRadialGradient(r, r, r * 0.18, r, r, r);
  grad.addColorStop(0, `rgba(0,0,0,${force})`);
  grad.addColorStop(0.55, `rgba(0,0,0,${force * 0.55})`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, taille, taille);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Le profil d'un pied tourné au tour, en coupe : le rayon d'abord, la
 *  hauteur ensuite, du sol jusqu'au dessous du plateau. */
export function piedTourne(hauteur: number, rayon: number): THREE.LatheGeometry {
  const profil: Array<readonly [number, number]> = [
    [0.00, 0.00], [0.95, 0.00], [1.00, 0.06], [0.86, 0.14],
    [0.62, 0.22], [0.55, 0.40], [0.68, 0.52], [0.60, 0.62],
    [0.52, 0.78], [0.78, 0.90], [0.84, 1.00], [0.00, 1.00],
  ];
  return new THREE.LatheGeometry(
    profil.map(([r, y]) => new THREE.Vector2(r * rayon, y * hauteur)),
    24,
  );
}
