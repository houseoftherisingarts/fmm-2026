// ─── Hnefatafl — square highlighting via overlay planes ─────────────
// The selected cell and its valid-move cells get translucent glowing
// disks placed slightly above the board surface. Overlay-based (rather
// than mutating square materials) so highlights remain visible whether
// the procedural board or the Meshy GLB is rendered underneath.

import * as THREE from 'three';
import { CELL, MID, type Coord } from './gameLogic';

export interface HighlightSystem {
  clearHL(): void;
  showHL(selected: Coord | null, moves: Coord[]): void;
  setOverlayHeight(y: number): void;
  dispose(): void;
}

const SELECTED_COLOR = 0xffd700;   // gold
const VALID_MOVE_COLOR = 0x2ab964; // ancient-forest green
const SELECTED_OPACITY = 0.55;
const VALID_MOVE_OPACITY = 0.42;

export function createHighlightSystem(scene: THREE.Scene): HighlightSystem {
  const overlayGeo = new THREE.PlaneGeometry(CELL * 0.95, CELL * 0.95);
  let overlayY = 0.16;
  const overlays: THREE.Mesh[] = [];

  const addOverlay = (r: number, c: number, color: number, opacity: number) => {
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
    });
    const m = new THREE.Mesh(overlayGeo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set((c - MID) * CELL, overlayY, (r - MID) * CELL);
    scene.add(m);
    overlays.push(m);
  };

  const clearHL = () => {
    for (const m of overlays) {
      scene.remove(m);
      (m.material as THREE.Material).dispose();
    }
    overlays.length = 0;
  };

  const showHL = (selected: Coord | null, moves: Coord[]) => {
    clearHL();
    if (!selected) return;
    addOverlay(selected[0], selected[1], SELECTED_COLOR, SELECTED_OPACITY);
    for (const [r, c] of moves) {
      addOverlay(r, c, VALID_MOVE_COLOR, VALID_MOVE_OPACITY);
    }
  };

  const setOverlayHeight = (y: number) => {
    overlayY = y;
    for (const m of overlays) m.position.y = y;
  };

  const dispose = () => {
    clearHL();
    overlayGeo.dispose();
  };

  return { clearHL, showHL, setOverlayHeight, dispose };
}
