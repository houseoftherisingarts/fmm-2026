import * as THREE from 'three';

// ─── Le jeu de la caravane, bâti en géométrie ───────────────────────
// La récompense du jour 3 (Alex, 2026-08-30) : rien à voir avec les
// autres jeux, ni une couleur de plus. Le roi est une roulotte de
// gitans qui doit gagner un coin du plateau; les assaillants sont des
// hommes de la route, foulard rouge et gilet; les défenseurs, des
// femmes en jupe rayée et châle. Tout est construit ici avec des
// primitives Three.js, sans fichier à télécharger, et livré au moteur
// de pièces dans le MÊME repère que les modèles Meshy : hauteur 1,9,
// base à y = -0,95 (voir MODEL_BASE dans pieceMesh.ts).

const BASE = -0.95;

const mat = (color: number, extra: Partial<THREE.MeshPhongMaterialParameters> = {}) =>
  new THREE.MeshPhongMaterial({ color, shininess: 28, ...extra });

const M = {
  boisRouge: mat(0x8a2430, { specular: 0x553333 }),
  boisVert:  mat(0x2f6f5a, { specular: 0x335544 }),
  ocre:      mat(0xd9a441, { shininess: 60, specular: 0xffe0a0 }),
  creme:     mat(0xf0e3c8),
  roue:      mat(0xc98d2e, { shininess: 40 }),
  fer:       mat(0x3a3530, { shininess: 90, specular: 0x999999 }),
  peau:      mat(0xc98d6a, { shininess: 12 }),
  cheveux:   mat(0x2a1a12, { shininess: 6 }),
  foulard:   mat(0xb8202c, { shininess: 20 }),
  gilet:     mat(0x233b5c, { shininess: 18 }),
  chemise:   mat(0xe8dcc0, { shininess: 10 }),
  ceinture:  mat(0xd9a441, { shininess: 50 }),
  bottes:    mat(0x2b1b10, { shininess: 30 }),
  jupe:      mat(0x7a1f3a, { shininess: 16 }),
  jupeRaie:  mat(0xd9a441, { shininess: 30 }),
  chale:     mat(0x1f6b5a, { shininess: 14 }),
  fleur:     mat(0xe2452f, { shininess: 40 }),
  or:        mat(0xffd27a, { shininess: 120, specular: 0xffffff }),
};

function mesh(geo: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

/** Une roue à rayons, posée debout dans le plan XY. */
function roue(rayon: number): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.TorusGeometry(rayon, rayon * 0.16, 10, 28), M.roue));
  g.add(mesh(new THREE.CylinderGeometry(rayon * 0.22, rayon * 0.22, rayon * 0.5, 12), M.fer).rotateX(Math.PI / 2));
  for (let i = 0; i < 8; i++) {
    const r = mesh(new THREE.CylinderGeometry(rayon * 0.05, rayon * 0.05, rayon * 1.9, 6), M.ocre);
    r.rotation.z = (i * Math.PI) / 8;
    g.add(r);
  }
  return g;
}

/** La roulotte : le roi de la caravane. */
export function construireRoulotte(): THREE.Group {
  const g = new THREE.Group();
  const rayonRoue = 0.36;
  const yEssieu = BASE + rayonRoue;
  // Les quatre roues, deux de chaque côté, les arrière plus grandes.
  const roues: Array<[number, number, number]> = [
    [-0.62, yEssieu, -0.52], [0.62, yEssieu, -0.52], [-0.52, yEssieu + 0.04, 0.48], [0.52, yEssieu + 0.04, 0.48],
  ];
  roues.forEach(([x, y, z], i) => {
    const r = roue(i < 2 ? rayonRoue : rayonRoue * 0.85);
    r.position.set(x, y, z);
    r.rotation.y = Math.PI / 2;
    g.add(r);
  });
  // Les essieux
  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 8), M.fer, 0, yEssieu, -0.52).rotateZ(Math.PI / 2));
  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 8), M.fer, 0, yEssieu + 0.04, 0.48).rotateZ(Math.PI / 2));
  // La caisse, rouge, plus large en haut comme une vraie roulotte
  const yCaisse = yEssieu + 0.38;
  const caisse = mesh(new THREE.BoxGeometry(1.0, 0.78, 1.5), M.boisRouge, 0, yCaisse + 0.39, 0);
  g.add(caisse);
  // Les planches vertes du bas et le liseré ocre
  g.add(mesh(new THREE.BoxGeometry(1.04, 0.16, 1.54), M.boisVert, 0, yCaisse + 0.08, 0));
  g.add(mesh(new THREE.BoxGeometry(1.06, 0.04, 1.56), M.ocre, 0, yCaisse + 0.18, 0));
  g.add(mesh(new THREE.BoxGeometry(1.06, 0.04, 1.56), M.ocre, 0, yCaisse + 0.76, 0));
  // Les fenêtres crème avec volets verts, de chaque côté
  for (const sx of [-1, 1]) {
    g.add(mesh(new THREE.BoxGeometry(0.03, 0.28, 0.3), M.creme, sx * 0.51, yCaisse + 0.48, -0.2));
    g.add(mesh(new THREE.BoxGeometry(0.03, 0.32, 0.06), M.boisVert, sx * 0.52, yCaisse + 0.48, -0.38));
    g.add(mesh(new THREE.BoxGeometry(0.03, 0.32, 0.06), M.boisVert, sx * 0.52, yCaisse + 0.48, -0.02));
  }
  // La porte à l'arrière, avec sa marche
  g.add(mesh(new THREE.BoxGeometry(0.34, 0.56, 0.03), M.boisVert, 0, yCaisse + 0.36, -0.76));
  g.add(mesh(new THREE.SphereGeometry(0.03, 8, 8), M.or, 0.12, yCaisse + 0.36, -0.78));
  g.add(mesh(new THREE.BoxGeometry(0.4, 0.04, 0.16), M.ocre, 0, yCaisse + 0.04, -0.84));
  // Le toit en tonneau, vert, qui déborde
  const toit = mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.66, 20, 1, false, 0, Math.PI), M.boisVert, 0, yCaisse + 0.72, 0);
  toit.rotation.z = Math.PI / 2;
  toit.rotation.y = Math.PI / 2;
  g.add(toit);
  // La cheminée du poêle
  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.28, 8), M.fer, 0.28, yCaisse + 1.42, 0.3));
  // Les brancards à l'avant
  for (const sx of [-1, 1]) {
    const b = mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.9, 6), M.ocre, sx * 0.3, yEssieu + 0.12, 1.15);
    b.rotation.x = Math.PI / 2 - 0.12;
    g.add(b);
  }
  // Le sommet touche y = 0,95 : toit à yCaisse + 0,72 + 0,62 ≈ 0,95.
  return g;
}

/** Un homme de la route : foulard rouge, gilet bleu nuit, ceinture d'or. */
export function construireHomme(): THREE.Group {
  const g = new THREE.Group();
  const H = 1.9;
  // Bottes et jambes
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.16, 12), M.bottes, 0, BASE + 0.08, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.19, 0.2, 0.5, 12), M.bottes, 0, BASE + 0.4, 0));
  // Chemise et gilet
  g.add(mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.6, 14), M.chemise, 0, BASE + 0.94, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.26, 0.23, 0.44, 14, 1, true), M.gilet, 0, BASE + 0.98, 0));
  // Ceinture large, boucle d'or
  g.add(mesh(new THREE.TorusGeometry(0.22, 0.045, 8, 24), M.ceinture, 0, BASE + 0.66, 0).rotateX(Math.PI / 2));
  g.add(mesh(new THREE.BoxGeometry(0.1, 0.09, 0.05), M.or, 0, BASE + 0.66, 0.22));
  // Épaules et bras le long du corps
  g.add(mesh(new THREE.SphereGeometry(0.27, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.gilet, 0, BASE + 1.22, 0));
  for (const sx of [-1, 1]) {
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.5, 8), M.chemise, sx * 0.27, BASE + 1.0, 0));
    g.add(mesh(new THREE.SphereGeometry(0.06, 8, 8), M.peau, sx * 0.27, BASE + 0.74, 0));
  }
  // Tête, cheveux, foulard noué
  g.add(mesh(new THREE.SphereGeometry(0.2, 16, 14), M.peau, 0, BASE + 1.52, 0));
  g.add(mesh(new THREE.SphereGeometry(0.205, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), M.cheveux, 0, BASE + 1.53, 0));
  g.add(mesh(new THREE.SphereGeometry(0.215, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), M.foulard, 0, BASE + 1.56, 0));
  g.add(mesh(new THREE.TorusGeometry(0.2, 0.035, 8, 24), M.foulard, 0, BASE + 1.6, 0).rotateX(Math.PI / 2 + 0.25));
  // Le nœud du foulard, derrière, et l'anneau d'oreille
  g.add(mesh(new THREE.ConeGeometry(0.06, 0.16, 6), M.foulard, 0.08, BASE + 1.56, -0.22).rotateX(-1.2));
  g.add(mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 12), M.or, 0.2, BASE + 1.46, 0));
  g.scale.setScalar(H / 1.9);
  return g;
}

/** Une femme de la route : jupe rayée, châle vert, fleur aux cheveux. */
export function construireFemme(): THREE.Group {
  const g = new THREE.Group();
  // La jupe ample, en deux cônes pour les rayures
  g.add(mesh(new THREE.ConeGeometry(0.42, 0.9, 18), M.jupe, 0, BASE + 0.45, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.42, 0.43, 0.06, 18), M.jupeRaie, 0, BASE + 0.05, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.3, 0.33, 0.05, 18), M.jupeRaie, 0, BASE + 0.32, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.05, 18), M.chale, 0, BASE + 0.58, 0));
  // Le corsage et la taille
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.5, 14), M.chemise, 0, BASE + 1.06, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.19, 0.16, 0.3, 14), M.jupe, 0, BASE + 0.92, 0));
  // Le châle sur les épaules
  g.add(mesh(new THREE.ConeGeometry(0.3, 0.42, 14, 1, true), M.chale, 0, BASE + 1.16, 0));
  // Les bras, une main sur la hanche
  for (const sx of [-1, 1]) {
    const bras = mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.42, 8), M.chemise, sx * 0.24, BASE + 1.02, 0.02);
    bras.rotation.z = sx * 0.35;
    g.add(bras);
    g.add(mesh(new THREE.SphereGeometry(0.05, 8, 8), M.peau, sx * 0.3, BASE + 0.82, 0.03));
  }
  // Tête, chevelure longue, foulard et fleur
  g.add(mesh(new THREE.SphereGeometry(0.19, 16, 14), M.peau, 0, BASE + 1.5, 0));
  g.add(mesh(new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), M.cheveux, 0, BASE + 1.51, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.42, 12), M.cheveux, 0, BASE + 1.24, -0.12));
  g.add(mesh(new THREE.SphereGeometry(0.21, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.4), M.foulard, 0, BASE + 1.54, 0));
  g.add(mesh(new THREE.SphereGeometry(0.06, 10, 10), M.fleur, 0.17, BASE + 1.6, 0.06));
  g.add(mesh(new THREE.SphereGeometry(0.025, 8, 8), M.or, 0.17, BASE + 1.6, 0.115));
  // Les anneaux d'oreilles
  for (const sx of [-1, 1]) g.add(mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 12), M.or, sx * 0.19, BASE + 1.42, 0));
  return g;
}

/** Les trois prototypes, dans l'ordre des types du moteur :
 *  1 = assaillant, 2 = défenseur, 3 = roi. */
export function construireCaravane(): Record<number, THREE.Object3D> {
  return { 1: construireHomme(), 2: construireFemme(), 3: construireRoulotte() };
}
