// ─── Hnefatafl — plateau procédural ─────────────────────────────────
// Socle de noyer sombre, tuiles chaudes, filets et incrustations de
// laiton : la palette du site (velours, os, laiton), pas celle d'un
// échiquier générique.
//
// 🚨 Le GLB de 34 Mo est PARTI (2026-08-03). Il arrivait pivoté et
// décalé par rapport à la grille (le socle sculpté dépassait en biais
// sous le plateau), pesait 34 Mo au chargement, et son damier peint ne
// tombait pas sur les cases cliquables. Tout est maintenant construit
// ici, aligné par construction sur les mêmes coordonnées que le
// raycast. Si un beau modèle 3D revient un jour, il devra être
// compressé (draco/meshopt, < 2 Mo) et calé sur CELL/MID sans
// autofit heuristique.

import * as THREE from 'three';
import { CELL, MID, N, isCorner, isThrone } from './gameLogic';

export interface BoardHandle {
  squares: THREE.Mesh[][];
  clickables: THREE.Object3D[];
  /** Conservé pour compatibilité d'interface : toujours vide désormais. */
  decorations: THREE.Object3D[];
}

// ── Palette du festival ───────────────────────────────────────────
const WALNUT_LIGHT = 0x4a2f16;   // tuile claire, noyer chaud
const WALNUT_DARK  = 0x2b1a0b;   // tuile sombre
const VELVET_DEEP  = 0x1a050b;   // socle, velours du site
const OXBLOOD      = 0x571414;   // trône
const BRASS        = 0xc4a45a;   // laiton du site
const BRASS_DEEP   = 0x7a5215;

export function buildBoard(scene: THREE.Scene): BoardHandle {
  const group = new THREE.Group();
  scene.add(group);

  // ── Socle : deux plateaux de velours-noyer, biseau de laiton ────
  const span = N * CELL;

  const baseDeep = new THREE.Mesh(
    new THREE.BoxGeometry(span + 2.2, 0.5, span + 2.2),
    new THREE.MeshPhongMaterial({ color: VELVET_DEEP, shininess: 8 }),
  );
  baseDeep.position.y = -0.42;
  baseDeep.receiveShadow = true;
  group.add(baseDeep);

  const baseTop = new THREE.Mesh(
    new THREE.BoxGeometry(span + 1.5, 0.3, span + 1.5),
    new THREE.MeshPhongMaterial({ color: 0x241207, shininess: 14 }),
  );
  baseTop.position.y = -0.12;
  baseTop.receiveShadow = true;
  group.add(baseTop);

  // Filet de laiton qui court autour du champ de jeu
  const railMat = new THREE.MeshPhongMaterial({
    color: BRASS,
    emissive: 0x1f1502,
    shininess: 140,
    specular: 0xffe9b0,
  });
  const railW = 0.09;
  for (const [w, d, x, z] of [
    [span + 0.9, railW, 0, (span + 0.8) / 2],
    [span + 0.9, railW, 0, -(span + 0.8) / 2],
    [railW, span + 0.9, (span + 0.8) / 2, 0],
    [railW, span + 0.9, -(span + 0.8) / 2, 0],
  ] as Array<[number, number, number, number]>) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.06, d),
      railMat,
    );
    rail.position.set(x, 0.055, z);
    group.add(rail);
  }

  // ── Tuiles (chacune cliquable, cible du raycast) ────────────────
  const squares: THREE.Mesh[][] = [];
  const clickables: THREE.Object3D[] = [];
  const sqGeo = new THREE.BoxGeometry(CELL * 0.965, 0.1, CELL * 0.965);

  for (let r = 0; r < N; r++) {
    const row: THREE.Mesh[] = [];
    for (let c = 0; c < N; c++) {
      let col = (r + c) % 2 === 0 ? WALNUT_LIGHT : WALNUT_DARK;
      let emissive = 0x000000;
      if (isThrone(r, c)) { col = OXBLOOD; emissive = 0x1a0202; }
      if (isCorner(r, c)) { col = BRASS_DEEP; emissive = 0x171004; }
      const mat = new THREE.MeshPhongMaterial({ color: col, shininess: 26, emissive });
      const sq = new THREE.Mesh(sqGeo, mat);
      sq.position.set((c - MID) * CELL, 0.05, (r - MID) * CELL);
      sq.receiveShadow = true;
      sq.userData = { r, c };
      group.add(sq);
      row.push(sq);
      clickables.push(sq);
    }
    squares.push(row);
  }

  // ── Incrustations de laiton : coins et trône ────────────────────
  // Des anneaux plats posés sur la tuile, comme des ferrures
  // incrustées, à la place des anciennes torches vertes et rouges qui
  // juraient avec tout le reste.
  const inlayMat = new THREE.MeshPhongMaterial({
    color: BRASS,
    emissive: 0x241902,
    shininess: 160,
    specular: 0xfff0c0,
  });
  const ringGeo = new THREE.TorusGeometry(CELL * 0.30, 0.022, 8, 32);
  const dotGeo  = new THREE.CylinderGeometry(0.045, 0.045, 0.02, 12);

  const marks: Array<[number, number]> = [
    [0, 0], [0, N - 1], [N - 1, 0], [N - 1, N - 1], [MID, MID],
  ];
  for (const [r, c] of marks) {
    const ring = new THREE.Mesh(ringGeo, inlayMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set((c - MID) * CELL, 0.108, (r - MID) * CELL);
    group.add(ring);
    const dot = new THREE.Mesh(dotGeo, inlayMat);
    dot.position.set((c - MID) * CELL, 0.108, (r - MID) * CELL);
    group.add(dot);
  }

  // Croix du trône : quatre courts rayons de laiton
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Array<[number, number]>) {
    const ray = new THREE.Mesh(
      new THREE.BoxGeometry(dx !== 0 ? CELL * 0.22 : 0.03, 0.018, dz !== 0 ? CELL * 0.22 : 0.03),
      inlayMat,
    );
    ray.position.set(dx * CELL * 0.26, 0.106, dz * CELL * 0.26);
    group.add(ray);
  }

  return { squares, clickables, decorations: [] };
}
