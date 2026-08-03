// ─── Hnefatafl — plateau : GLB de Meshy + secours procédural ────────
// Le plateau sculpté d'Alex (Meshy) est revenu le 2026-08-03, compressé
// de 34 Mo à 1,96 Mo (draco + textures webp 1024). Il se pose PAR-DESSUS
// une grille procédurale qui, elle, reste la seule vérité du jeu :
//
//   · les tuiles procédurales portent le raycast (userData {r,c}) et
//     deviennent invisibles (opacity 0) dès que le GLB est affiché;
//   · la surbrillance (highlightSystem) vit sur des plans superposés,
//     donc elle fonctionne au-dessus de n'importe quel plateau;
//   · si le GLB échoue à charger, le plateau procédural reste visible
//     et le jeu est identique à avant.
//
// 🚨 CALAGE FIXE, PAS D'AUTOFIT. La première intégration (34 Mo) avait
// un autofit heuristique qui pivotait et décalait le modèle : damier
// peint à côté des cases cliquables. Les constantes GLB_* ci-dessous
// sont mesurées à l'écran une fois pour toutes (accordeur dev
// window.__hnefBoard) puis figées. Si le modèle change, on re-mesure,
// on ne devine pas.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { CELL, MID, N, isCorner, isThrone } from './gameLogic';

export interface BoardHandle {
  squares: THREE.Mesh[][];
  clickables: THREE.Object3D[];
  /** Conservé pour compatibilité d'interface : toujours vide désormais. */
  decorations: THREE.Object3D[];
}

// ── Calage du GLB (constantes figées, mesurées via l'accordeur dev) ──
// Le modèle Meshy est couché dans le plan XY (épaisseur en Z) :
// bbox x,y ∈ [-0.95, 0.95], z ∈ [-0.14, 0.14]. On le couche à plat
// (rotation X) puis on l'échelonne pour que son damier peint tombe sur
// la grille CELL/MID du raycast.
const GLB_URL   = '/games/hnefatafl/models/board.glb';
const GLB_ROT_X = -Math.PI / 2;
const GLB_SCALE = 7.4;
const GLB_Y     = 0.0;
const GLB_ROT_Y = 0;

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

  // Tout ce qui est purement décoratif (socle, filets, incrustations)
  // s'éteint quand le GLB prend le relais. Les tuiles, elles, passent
  // en opacité 0 mais restent dans la scène : cibles du raycast.
  const cosmetics: THREE.Object3D[] = [];
  const tileMats: THREE.MeshPhongMaterial[] = [];

  // ── Socle : deux plateaux de velours-noyer, biseau de laiton ────
  const span = N * CELL;

  const baseDeep = new THREE.Mesh(
    new THREE.BoxGeometry(span + 2.2, 0.5, span + 2.2),
    new THREE.MeshPhongMaterial({ color: VELVET_DEEP, shininess: 8 }),
  );
  baseDeep.position.y = -0.42;
  baseDeep.receiveShadow = true;
  group.add(baseDeep);
  cosmetics.push(baseDeep);

  const baseTop = new THREE.Mesh(
    new THREE.BoxGeometry(span + 1.5, 0.3, span + 1.5),
    new THREE.MeshPhongMaterial({ color: 0x241207, shininess: 14 }),
  );
  baseTop.position.y = -0.12;
  baseTop.receiveShadow = true;
  group.add(baseTop);
  cosmetics.push(baseTop);

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
    cosmetics.push(rail);
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
      sq.userData = { r, c, isSquare: true };
      group.add(sq);
      row.push(sq);
      clickables.push(sq);
      tileMats.push(mat);
    }
    squares.push(row);
  }

  // ── Incrustations de laiton : coins et trône ────────────────────
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
    cosmetics.push(ring);
    const dot = new THREE.Mesh(dotGeo, inlayMat);
    dot.position.set((c - MID) * CELL, 0.108, (r - MID) * CELL);
    group.add(dot);
    cosmetics.push(dot);
  }

  // Croix du trône : quatre courts rayons de laiton
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Array<[number, number]>) {
    const ray = new THREE.Mesh(
      new THREE.BoxGeometry(dx !== 0 ? CELL * 0.22 : 0.03, 0.018, dz !== 0 ? CELL * 0.22 : 0.03),
      inlayMat,
    );
    ray.position.set(dx * CELL * 0.26, 0.106, dz * CELL * 0.26);
    group.add(ray);
    cosmetics.push(ray);
  }

  // ── Le plateau sculpté de Meshy, par-dessus ─────────────────────
  const draco = new DRACOLoader();
  draco.setDecoderPath('/draco/');
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);

  loader.load(
    GLB_URL,
    (gltf) => {
      const model = gltf.scene;
      model.rotation.x = GLB_ROT_X;
      model.rotation.y = GLB_ROT_Y;
      model.scale.setScalar(GLB_SCALE);
      model.position.y = GLB_Y;
      model.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          o.receiveShadow = true;
          o.castShadow = false;
        }
      });
      group.add(model);

      // Le GLB est là : la déco procédurale s'éteint, les tuiles
      // deviennent des cibles invisibles.
      for (const c of cosmetics) c.visible = false;
      for (const m of tileMats) {
        m.transparent = true;
        m.opacity = 0;
        m.depthWrite = false;
      }

      // Accordeur dev : régler échelle / hauteur / rotation à l'écran,
      // reporter les valeurs dans les constantes GLB_*, puis figer.
      // ⚠️ StrictMode monte le jeu deux fois : deux buildBoard, deux
      // callbacks de chargement, et l'accordeur du montage MORT peut
      // écraser celui du vivant (course des parses GLB). D'où un
      // TABLEAU : on accorde tous les modèles, la scène fantôme ne
      // rend rien de toute façon.
      if (import.meta.env.DEV) {
        const w = window as unknown as Record<string, unknown>;
        const tuners = (w.__hnefBoards as unknown[]) ?? [];
        w.__hnefBoards = tuners;
        w.__hnefBoard = {
          tune: (scale: number, y: number, rotY = 0) => {
            for (const t of tuners) (t as { tune: (s: number, y: number, r: number) => void }).tune(scale, y, rotY);
            return { scale, y, rotY, models: tuners.length };
          },
          showProc: (on: boolean) => {
            for (const t of tuners) (t as { showProc: (o: boolean) => void }).showProc(on);
          },
          census: () => tuners.map((t) => (t as { census: () => unknown }).census()),
        };
        tuners.push({
          tune: (scale: number, y: number, rotY = 0) => {
            model.scale.setScalar(scale);
            model.position.y = y;
            model.rotation.y = rotY;
            return { scale, y, rotY };
          },
          showProc: (on: boolean) => {
            for (const c of cosmetics) c.visible = on;
            for (const m of tileMats) m.opacity = on ? 1 : 0;
          },
          census: () => {
            const sc = group.parent as THREE.Scene | null;
            return {
              groupInScene: !!sc,
              sceneChildren: sc ? sc.children.map((ch) => `${ch.type}:${ch.children.length}`) : [],
              tileOpacity: tileMats[0]?.opacity,
              cosmeticsVisible: cosmetics[0]?.visible,
              modelScale: model.scale.x,
            };
          },
        };
      }
    },
    undefined,
    (err) => {
      // Pas de GLB : le plateau procédural reste tel quel.
      console.warn('[hnefatafl] plateau GLB indisponible, secours procédural', err);
    },
  );

  return { squares, clickables, decorations: [] };
}
