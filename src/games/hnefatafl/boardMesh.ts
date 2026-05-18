// ─── Hnefatafl — board base, squares, grid, throne and corner markers
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CELL, MID, N, isCorner, isThrone } from './gameLogic';

// Path served by vite from /public/ at runtime. Large (~33 MB) — drop a
// compressed version here (draco/meshopt) to cut deploy size.
export const BOARD_GLB_URL = '/games/hnefatafl/models/board.glb';

// Where the play surface (top of the board) should sit in scene units.
// The procedural squares top out at y = 0.10, so aligning the GLB's top
// here makes pieces (base at y = 0.10) stand cleanly on the surface.
const TARGET_BOARD_TOP_Y = 0.10;
// Width the GLB should fill horizontally. Matches the procedural board's
// outer trim so the lit board area lines up with the 11×11 grid.
const TARGET_BOARD_SPAN = N * CELL + 1.4;

export interface BoardHandle {
  squares: THREE.Mesh[][];
  clickables: THREE.Object3D[];
  // Everything that the GLB visually replaces (base, trims, grid lines,
  // corner + throne markers). Hide these once the GLB has loaded.
  decorations: THREE.Object3D[];
}

export interface BoardModelOpts {
  /** Extra scale multiplier on top of the autofit (default 1). */
  scaleMul?: number;
  /** Extra Y offset on top of the auto top-alignment (default 0). */
  yOffset?: number;
  /**
   * Force a rotation around the X axis (radians). If unset, auto-detected:
   * if the GLB's Y extent exceeds its horizontal extents, we lay it down
   * (-90° around X) on the assumption it was exported Z-up.
   */
  rotateX?: number;
  onLoad?: (root: THREE.Group, info: BoardModelInfo) => void;
  onError?: (err: unknown) => void;
}

export interface BoardModelInfo {
  rotatedX: number;
  appliedScale: number;
  rawSize: THREE.Vector3;
  finalSize: THREE.Vector3;
}

export function loadBoardModel(scene: THREE.Scene, opts: BoardModelOpts = {}) {
  const loader = new GLTFLoader();
  let cancelled = false;
  let loadedRoot: THREE.Group | null = null;

  loader.load(
    BOARD_GLB_URL,
    (gltf) => {
      if (cancelled) return;
      const root = gltf.scene;
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = false;
          m.receiveShadow = true;
        }
      });

      // ── Measure raw bounds (no transform applied yet) ──────────────
      const rawBox = new THREE.Box3().setFromObject(root);
      const rawSize = new THREE.Vector3();
      rawBox.getSize(rawSize);

      // ── Step 1: lay the model flat if it was exported Z-up ─────────
      // Heuristic: if Y is the dominant axis, it's standing on its side.
      let rotatedX = 0;
      if (opts.rotateX !== undefined) {
        rotatedX = opts.rotateX;
      } else if (rawSize.y > Math.max(rawSize.x, rawSize.z) * 1.1) {
        rotatedX = -Math.PI / 2;
      }
      root.rotation.x = rotatedX;
      // Re-measure after rotation
      const rotBox = new THREE.Box3().setFromObject(root);
      const rotSize = new THREE.Vector3();
      rotBox.getSize(rotSize);

      // ── Step 2: scale so the longer horizontal axis fills the span ─
      const longestHorizontal = Math.max(rotSize.x, rotSize.z);
      const autoScale = longestHorizontal > 0
        ? TARGET_BOARD_SPAN / longestHorizontal
        : 1;
      const appliedScale = autoScale * (opts.scaleMul ?? 1);
      root.scale.setScalar(appliedScale);

      // ── Step 3: center on origin (X, Z) and align top to play surface
      const finalBox = new THREE.Box3().setFromObject(root);
      const finalSize = new THREE.Vector3();
      finalBox.getSize(finalSize);
      const finalCenter = new THREE.Vector3();
      finalBox.getCenter(finalCenter);
      root.position.x -= finalCenter.x;
      root.position.z -= finalCenter.z;
      root.position.y -= finalBox.max.y - TARGET_BOARD_TOP_Y;
      root.position.y += opts.yOffset ?? 0;

      scene.add(root);
      loadedRoot = root;

      const info: BoardModelInfo = {
        rotatedX,
        appliedScale,
        rawSize,
        finalSize,
      };
      // Debug log so visual tuning is easy from devtools.
      // eslint-disable-next-line no-console
      console.info('[Hnefatafl] Board GLB loaded', {
        rawSize: rawSize.toArray(),
        finalSize: finalSize.toArray(),
        rotatedXDeg: (rotatedX * 180) / Math.PI,
        appliedScale,
      });
      opts.onLoad?.(root, info);
    },
    undefined,
    (err) => {
      if (cancelled) return;
      console.warn('[Hnefatafl] Board GLB failed to load:', err);
      opts.onError?.(err);
    },
  );

  return {
    cancel: () => {
      cancelled = true;
      if (loadedRoot) {
        scene.remove(loadedRoot);
        loadedRoot.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            m.geometry?.dispose();
            const mat = m.material as THREE.Material | THREE.Material[];
            if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
            else mat?.dispose();
          }
        });
      }
    },
  };
}

export function buildBoard(scene: THREE.Scene): BoardHandle {
  const decorations: THREE.Object3D[] = [];
  const addDeco = (o: THREE.Object3D) => {
    scene.add(o);
    decorations.push(o);
  };

  // ── Base + trims ──────────────────────────────────────────────────
  const baseMat = new THREE.MeshPhongMaterial({ color: 0x160902, shininess: 5 });
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(N * CELL + 2, 0.6, N * CELL + 2),
    baseMat,
  );
  base.position.y = -0.36;
  base.receiveShadow = true;
  addDeco(base);

  const trimMat = new THREE.MeshPhongMaterial({
    color: 0x7a5215,
    shininess: 120,
    specular: 0xffd700,
  });
  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(N * CELL + 0.9, 0.12, N * CELL + 0.9),
    trimMat,
  );
  trim.position.y = -0.06;
  addDeco(trim);

  const trim2 = new THREE.Mesh(
    new THREE.BoxGeometry(N * CELL + 1.4, 0.06, N * CELL + 1.4),
    new THREE.MeshPhongMaterial({ color: 0x4a2f08, shininess: 40 }),
  );
  trim2.position.y = -0.14;
  addDeco(trim2);

  // ── Squares (each one clickable, raycastable) ─────────────────────
  const squares: THREE.Mesh[][] = [];
  const clickables: THREE.Object3D[] = [];
  const sqGeo = new THREE.BoxGeometry(CELL * 0.97, 0.1, CELL * 0.97);

  for (let r = 0; r < N; r++) {
    const row: THREE.Mesh[] = [];
    for (let c = 0; c < N; c++) {
      let col = (r + c) % 2 === 0 ? 0x7a5315 : 0x472c07;
      if (isThrone(r, c)) col = 0x8b0e0e;
      if (isCorner(r, c)) col = 0x0e380e;
      const mat = new THREE.MeshPhongMaterial({ color: col, shininess: 22, emissive: 0 });
      const sq = new THREE.Mesh(sqGeo, mat);
      sq.position.set((c - MID) * CELL, 0.05, (r - MID) * CELL);
      sq.receiveShadow = true;
      sq.userData = { r, c };
      scene.add(sq);
      row.push(sq);
      clickables.push(sq);
    }
    squares.push(row);
  }

  // ── Grid lines ────────────────────────────────────────────────────
  const glMat = new THREE.MeshPhongMaterial({ color: 0xbb8a00, emissive: 0x3a2800 });
  for (let i = 0; i <= N; i++) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(N * CELL, 0.022, 0.026), glMat);
    h.position.set(0, 0.112, (i - MID - 0.5) * CELL);
    addDeco(h);
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.022, N * CELL), glMat);
    v.position.set((i - MID - 0.5) * CELL, 0.112, 0);
    addDeco(v);
  }

  // ── Corner markers (green torch + ring) ───────────────────────────
  const crnMat = new THREE.MeshPhongMaterial({
    color: 0x1a5a1a,
    emissive: 0x082208,
    shininess: 60,
  });
  for (const [r, c] of [
    [0, 0], [0, 10], [10, 0], [10, 10],
  ] as Array<[number, number]>) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.18, 6), crnMat);
    m.position.set((c - MID) * CELL, 0.19, (r - MID) * CELL);
    addDeco(m);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.03, 6, 16),
      new THREE.MeshPhongMaterial({ color: 0x2a9a2a, emissive: 0x0a2a0a }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set((c - MID) * CELL, 0.28, (r - MID) * CELL);
    addDeco(ring);
  }

  // ── Throne marker (red dais + ring) ───────────────────────────────
  const thrMat = new THREE.MeshPhongMaterial({
    color: 0xaa1010,
    emissive: 0x330000,
    shininess: 90,
  });
  const thrM = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.18, 4), thrMat);
  thrM.position.set(0, 0.19, 0);
  addDeco(thrM);
  const thrRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.26, 0.03, 6, 16),
    new THREE.MeshPhongMaterial({ color: 0xcc1818, emissive: 0x440000 }),
  );
  thrRing.rotation.x = Math.PI / 2;
  thrRing.position.set(0, 0.28, 0);
  addDeco(thrRing);

  // The 121 squares are NOT decorations — they remain in the scene as
  // raycast targets even when the GLB renders the visible board. Their
  // materials become transparent when the GLB loads (set by caller).
  return { squares, clickables, decorations };
}
