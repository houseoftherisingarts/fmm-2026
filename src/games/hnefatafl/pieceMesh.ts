// ─── Hnefatafl — piece materials + mk/rm/mv pieces ───────────────────
// Pieces are two-part: a tapered cylinder body and a spherical cap.
// Each part registers its (r,c) in userData so the raycaster lookup
// can resolve to a board cell regardless of which surface was hit.
//
// When real GLB models arrive from Meshy (see ./assets/models/README.md),
// swap the procedural body+cap geometry inside `mkPiece` for the loaded
// GLTF scene. The commented-out block at the bottom of this file shows
// exactly where to plug in a GLTFLoader.

import * as THREE from 'three';
import gsap from 'gsap';
import { CELL, MID, type CellValue } from './gameLogic';

export interface PieceMaterials {
  a: THREE.MeshPhongMaterial;
  aC: THREE.MeshPhongMaterial;
  d: THREE.MeshPhongMaterial;
  dC: THREE.MeshPhongMaterial;
  k: THREE.MeshPhongMaterial;
  kC: THREE.MeshPhongMaterial;
}

export function createPieceMaterials(): PieceMaterials {
  return {
    a: new THREE.MeshPhongMaterial({ color: 0xaa1f0f, shininess: 90, specular: 0xff6644 }),
    aC: new THREE.MeshPhongMaterial({ color: 0xcc2211, shininess: 110, emissive: 0x110000 }),
    d: new THREE.MeshPhongMaterial({ color: 0xd4c49a, shininess: 70, specular: 0xffffdd }),
    dC: new THREE.MeshPhongMaterial({ color: 0xeeddcc, shininess: 90, emissive: 0x080808 }),
    k: new THREE.MeshPhongMaterial({ color: 0xbb8800, shininess: 180, specular: 0xffff00 }),
    kC: new THREE.MeshPhongMaterial({
      color: 0xffd700,
      shininess: 240,
      specular: 0xffffff,
      emissive: 0x332200,
    }),
  };
}

export interface PieceEntry {
  body: THREE.Mesh;
  cap: THREE.Mesh;
  pType: CellValue;
}

export interface AnimOpts {
  onComplete?: () => void;
}

export interface PieceSystem {
  group: THREE.Group;
  mkPiece(r: number, c: number, pType: CellValue): void;
  rmPiece(r: number, c: number, opts?: AnimOpts): void;
  mvPiece(fr: number, fc: number, tr: number, tc: number, opts?: AnimOpts): void;
  getPiece(r: number, c: number): PieceEntry | undefined;
  dispose(): void;
}

export function createPieceSystem(
  scene: THREE.Scene,
  clickables: THREE.Object3D[],
  materials: PieceMaterials = createPieceMaterials(),
): PieceSystem {
  const group = new THREE.Group();
  scene.add(group);
  const map: Record<string, PieceEntry> = {};
  let disposed = false;

  // Spawn a small particle burst at a captured piece's position. The
  // particles are independent THREE objects (not held in `map`) and
  // clean themselves up via gsap onComplete.
  const spawnCaptureBurst = (
    worldX: number,
    worldY: number,
    worldZ: number,
    color: number,
  ) => {
    const NUM = 14;
    const burst = new THREE.Group();
    scene.add(burst);
    let remaining = NUM;
    for (let i = 0; i < NUM; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1,
      });
      const geo = new THREE.SphereGeometry(0.07, 6, 6);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(worldX, worldY, worldZ);
      burst.add(m);
      const a = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 0.5;
      const up = 0.4 + Math.random() * 0.7;
      gsap.to(m.position, {
        x: worldX + Math.cos(a) * speed,
        z: worldZ + Math.sin(a) * speed,
        y: worldY + up,
        duration: 0.75,
        ease: 'power2.out',
      });
      gsap.to(mat, {
        opacity: 0,
        duration: 0.75,
        ease: 'power1.in',
        onComplete: () => {
          burst.remove(m);
          geo.dispose();
          mat.dispose();
          remaining -= 1;
          if (remaining === 0 && !disposed) scene.remove(burst);
        },
      });
    }
  };

  const mkPiece = (r: number, c: number, pType: CellValue) => {
    const isK = pType === 3;
    const pfx: 'k' | 'a' | 'd' = isK ? 'k' : pType === 1 ? 'a' : 'd';
    const bh = isK ? 0.92 : 0.56;
    const br = isK ? 0.3 : 0.24;
    const cr = isK ? 0.33 : 0.27;

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(br * 0.8, br, bh, isK ? 16 : 12),
      materials[pfx],
    );
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(cr, isK ? 16 : 12, 8),
      materials[`${pfx}C` as 'aC' | 'dC' | 'kC'],
    );

    [body, cap].forEach((m) => {
      m.castShadow = true;
      m.userData = { r, c };
    });

    const x = (c - MID) * CELL;
    const z = (r - MID) * CELL;
    body.position.set(x, 0.1 + bh / 2, z);
    cap.position.set(x, 0.1 + bh + cr * 0.65, z);
    group.add(body, cap);
    map[`${r},${c}`] = { body, cap, pType };
    clickables.push(body, cap);
  };

  const rmPiece = (r: number, c: number, opts?: AnimOpts) => {
    const key = `${r},${c}`;
    const entry = map[key];
    if (!entry) {
      opts?.onComplete?.();
      return;
    }
    const { body, cap } = entry;
    // Logical removal happens immediately so subsequent moves see the
    // correct state. Only the visual fade-out is deferred.
    [body, cap].forEach((m) => {
      const i = clickables.indexOf(m);
      if (i > -1) clickables.splice(i, 1);
    });
    delete map[key];

    // Particle burst takes the body's current color and current
    // position (slightly elevated so embers spawn above the piece base).
    const bodyMat = body.material as THREE.MeshPhongMaterial;
    const burstColor = bodyMat.color.getHex();
    spawnCaptureBurst(body.position.x, body.position.y + 0.2, body.position.z, burstColor);

    gsap.killTweensOf([body.position, cap.position, body.scale, cap.scale]);
    const tl = gsap.timeline({
      onComplete: () => {
        group.remove(body, cap);
        body.geometry.dispose();
        cap.geometry.dispose();
        if (!disposed) opts?.onComplete?.();
      },
    });
    // Sink slightly and shrink to nothing — like falling through the board.
    tl.to([body.position, cap.position], {
      y: '-=0.4',
      duration: 0.35,
      ease: 'power1.in',
    }, 0);
    tl.to([body.scale, cap.scale], {
      x: 0.01,
      y: 0.01,
      z: 0.01,
      duration: 0.35,
      ease: 'power2.in',
    }, 0);
  };

  const mvPiece = (fr: number, fc: number, tr: number, tc: number, opts?: AnimOpts) => {
    const key = `${fr},${fc}`;
    const entry = map[key];
    if (!entry) {
      opts?.onComplete?.();
      return;
    }
    const { body, cap, pType } = entry;
    const isK = pType === 3;
    const bh = isK ? 0.92 : 0.56;
    const cr = isK ? 0.33 : 0.27;
    const fromX = (fc - MID) * CELL;
    const fromZ = (fr - MID) * CELL;
    const toX = (tc - MID) * CELL;
    const toZ = (tr - MID) * CELL;
    const baseBodyY = 0.1 + bh / 2;
    const baseCapY = 0.1 + bh + cr * 0.65;

    // Logical position update is synchronous so subsequent game logic
    // sees the new coords; only the visual tween is deferred.
    body.userData = { r: tr, c: tc };
    cap.userData = { r: tr, c: tc };
    map[`${tr},${tc}`] = entry;
    delete map[key];

    // Snap y back to base so the selection-lift residue doesn't deform
    // the arc, then tween over an arc to the destination.
    body.position.set(fromX, baseBodyY, fromZ);
    cap.position.set(fromX, baseCapY, fromZ);

    const dist = Math.hypot(toX - fromX, toZ - fromZ);
    const duration = Math.min(0.65, 0.25 + dist * 0.05);
    const arc = Math.min(1.6, 0.5 + dist * 0.06);

    gsap.killTweensOf([body.position, cap.position]);
    const tl = gsap.timeline({
      onComplete: () => {
        if (!disposed) opts?.onComplete?.();
      },
    });
    // Horizontal glide.
    tl.to(body.position, { x: toX, z: toZ, duration, ease: 'power2.inOut' }, 0);
    tl.to(cap.position, { x: toX, z: toZ, duration, ease: 'power2.inOut' }, 0);
    // Vertical arc: lift then land.
    tl.to(body.position, { y: baseBodyY + arc, duration: duration / 2, ease: 'sine.out' }, 0);
    tl.to(body.position, { y: baseBodyY, duration: duration / 2, ease: 'sine.in' }, duration / 2);
    tl.to(cap.position, { y: baseCapY + arc, duration: duration / 2, ease: 'sine.out' }, 0);
    tl.to(cap.position, { y: baseCapY, duration: duration / 2, ease: 'sine.in' }, duration / 2);
  };

  const getPiece = (r: number, c: number): PieceEntry | undefined => map[`${r},${c}`];

  const dispose = () => {
    disposed = true;
    // Kill any in-flight tweens on tracked pieces so they can't fire after
    // the canvas is torn down. (Capture-burst particles aren't tracked
    // here — their tweens write to disposed THREE objects after teardown,
    // which is benign.)
    for (const k of Object.keys(map)) {
      const e = map[k];
      gsap.killTweensOf([e.body.position, e.cap.position, e.body.scale, e.cap.scale]);
      group.remove(e.body, e.cap);
      e.body.geometry.dispose();
      e.cap.geometry.dispose();
      delete map[k];
    }
    scene.remove(group);
  };

  return { group, mkPiece, rmPiece, mvPiece, getPiece, dispose };
}

// ── GLB hookup (Meshy pipeline) ─────────────────────────────────────
// Drop board.glb, piece_raider.glb, piece_defender.glb, piece_king.glb
// into ./assets/models/, then replace the body+cap construction inside
// mkPiece() with the snippet below. Keep userData={r,c} on every Mesh
// that should be raycast-clickable (descendants of the loaded scene).
//
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// import raiderUrl   from './assets/models/piece_raider.glb?url';
// import defenderUrl from './assets/models/piece_defender.glb?url';
// import kingUrl     from './assets/models/piece_king.glb?url';
//
// const loader = new GLTFLoader();
// const urlFor = (pType: CellValue) =>
//   pType === 3 ? kingUrl : pType === 1 ? raiderUrl : defenderUrl;
//
// loader.load(urlFor(pType), (gltf) => {
//   const root = gltf.scene;
//   root.position.set(x, 0.1, z);
//   root.traverse((o) => {
//     if ((o as THREE.Mesh).isMesh) {
//       (o as THREE.Mesh).castShadow = true;
//       o.userData = { r, c };
//       clickables.push(o);
//     }
//   });
//   group.add(root);
//   // store `root` (instead of body/cap) in map[`${r},${c}`] so mv/rm work.
// });
