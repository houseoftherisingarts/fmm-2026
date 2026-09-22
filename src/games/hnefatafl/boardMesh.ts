// ─── Hnefatafl · plateau : GLB de Meshy + secours procédural ────────
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
import { CELL, MID, N, initBoard, isCorner, isThrone } from './gameLogic';
import { boardSet, BOARD_DEFAUT, type BoardSet } from './assets';
import { graverHullsborg } from './hullsborgGravure';

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
// Mesuré le 2026-08-03 (accordeur dev + marqueurs Playwright) : les
// quatre pierres de coin du damier peint tombent pile sur les centres
// logiques (0,0)/(0,10)/(10,0)/(10,10), et le champ peint arrive à
// y = 0.10, le niveau des socles de pièces. Aucun décalage x/z : le
// damier peint est centré dans le modèle.
// La rotation de mise à plat est commune à tous les modèles Meshy
// (couchés dans le plan XY). Le reste du calage vit dans assets.ts,
// mesuré plateau par plateau.
const GLB_ROT_X = -Math.PI / 2;

// ── Blason peint au centre ────────────────────────────────────────
// Texture blanche découpée sur son alpha (public/fmm-logo-decal.png,
// 512x626) : le blanc laisse la teinte au matériau. Hauteur en cases,
// ratio largeur/hauteur mesuré sur l'image.
const DECAL_URL   = '/fmm-logo-decal.png';
const DECAL_H     = 7.4;
const DECAL_RATIO = 512 / 626;

// ── Palettes procédurales ─────────────────────────────────────────
// Deux ambiances : le noyer chaud du festival (secours sous le GLB) et
// la pierre runique, plus froide et plus nordique. Meshy s'est montré
// incapable de produire une grille 11x11 fiable (deux tentatives le
// 2026-08-03 : des planches, pas un damier), alors le second plateau
// est bâti ICI, où la grille est exacte par construction.
interface Palette {
  clair: number; sombre: number; socle: number; socleHaut: number;
  trone: number; metal: number; metalSombre: number; brillance: number;
  /** Plateau de bois brut : cases sombres aux postes de départ, aucun
   *  laiton, cadre large gravé (voir hullsborgGravure.ts). */
  brut?: boolean;
}

const PALETTES: Record<string, Palette> = {
  noyer: {
    clair: 0x4a2f16, sombre: 0x2b1a0b, socle: 0x1a050b, socleHaut: 0x241207,
    trone: 0x571414, metal: 0xc4a45a, metalSombre: 0x7a5215, brillance: 26,
  },
  // Le chêne sombre de la salle basse, mesuré sur l'image de la tuile
  // des Vikings (Alex, 2026-08-23).
  taverne: {
    clair: 0x6b4420, sombre: 0x33200f, socle: 0x1c1108, socleHaut: 0x2a1a0d,
    trone: 0x5a2a12, metal: 0xc9a227, metalSombre: 0x7c5c17, brillance: 18,
  },
  pierre: {
    clair: 0x6a6558, sombre: 0x413d36, socle: 0x14161a, socleHaut: 0x22252a,
    trone: 0x3a5a4a, metal: 0x9aa3ab, metalSombre: 0x555c63, brillance: 8,
  },
  // Le plateau peint de la caravane (récompense du jour 3) : vert de
  // roulotte et bordeaux sur les cases, socle de bois rouge, filets ocre.
  caravane: {
    clair: 0x2f6f5a, sombre: 0x6b1f2a, socle: 0x3a1c0c, socleHaut: 0x5a2e14,
    trone: 0xd9a441, metal: 0xd9a441, metalSombre: 0x8a5a12, brillance: 34,
  },
  // Le plateau qu'Alex a taillé à la main pour Hullsborg, mesuré sur ses
  // photos : pin teinté brun, postes de départ teints noyer foncé, trône
  // et coins laissés au pin clair, sillons brûlés au fer.
  hullsborg: {
    clair: 0x8a5631, sombre: 0x3b2718, socle: 0x2a190d, socleHaut: 0x9a6232,
    trone: 0xb07a42, metal: 0xb07a42, metalSombre: 0xb07a42, brillance: 10, brut: true,
  },
};


// ── Le bois de la table ─────────────────────────────────────────────
// Alex, 2026-08-22 : le socle sortait en aplat, on ne voyait aucun
// bois. Une texture de veine est peinte au canevas (aucun fichier à
// télécharger) : des cernes qui ondulent, quelques nœuds, un grain
// fin. `repeat` ensuite selon la pièce pour que la veine ne s'étire pas.
function boisTexture(teinte: number, veine: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const g = c.getContext('2d')!;
  const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');
  g.fillStyle = hex(teinte);
  g.fillRect(0, 0, 512, 512);

  // Les cernes : des bandes verticales qui ondulent doucement.
  g.strokeStyle = hex(veine);
  for (let i = 0; i < 190; i++) {
    const x = Math.random() * 512;
    g.globalAlpha = 0.05 + Math.random() * 0.16;
    g.lineWidth = 0.6 + Math.random() * 2.6;
    g.beginPath();
    g.moveTo(x, 0);
    const amp = 5 + Math.random() * 16;
    for (let y = 0; y <= 512; y += 16) {
      g.lineTo(x + Math.sin((y / 512) * Math.PI * (1 + Math.random() * 1.5)) * amp, y);
    }
    g.stroke();
  }

  // Quelques nœuds : le bois d'une vraie table n'est jamais régulier.
  for (let k = 0; k < 4; k++) {
    const nx = 40 + Math.random() * 432;
    const ny = 40 + Math.random() * 432;
    for (let r = 22; r > 1; r -= 2.4) {
      g.globalAlpha = 0.05 + (22 - r) * 0.012;
      g.beginPath();
      g.ellipse(nx, ny, r, r * 0.55, Math.random() * Math.PI, 0, Math.PI * 2);
      g.stroke();
    }
  }

  // Grain fin, pour que la lumière rasante accroche quelque chose.
  g.globalAlpha = 0.05;
  for (let i = 0; i < 5200; i++) {
    g.fillStyle = Math.random() > 0.5 ? '#000' : '#fff';
    g.fillRect(Math.random() * 512, Math.random() * 512, 1, 1);
  }
  g.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

export function buildBoard(
  scene: THREE.Scene,
  isAlive?: () => boolean,
  /** Gestionnaire partagé : compte le GLB, ses textures et le décalque
   *  dans la barre de progression de l'écran d'attente. */
  manager?: THREE.LoadingManager,
  /** Identifiant du jeu de plateau choisi en boutique. */
  setId: string = BOARD_DEFAUT,
): BoardHandle {
  // Le plateau sculpté est taillé pour onze cases. Sur un damier plus
  // petit (Brandubh), il déborderait de partout : on retombe alors sur
  // le plateau procédural, qui se construit à la bonne taille.
  const jeuChoisi: BoardSet = boardSet(setId);
  const jeu: BoardSet = N === 11 ? jeuChoisi : { ...jeuChoisi, url: undefined };
  const pal = PALETTES[jeu.palette ?? 'noyer'] ?? PALETTES.noyer;
  const group = new THREE.Group();
  scene.add(group);

  // Tout ce qui est purement décoratif (socle, filets, incrustations)
  // s'éteint quand le GLB prend le relais. Les tuiles, elles, passent
  // en opacité 0 mais restent dans la scène : cibles du raycast.
  const cosmetics: THREE.Object3D[] = [];
  const tileMats: THREE.MeshPhongMaterial[] = [];

  // ── Socle : deux plateaux de velours-noyer, biseau de laiton ────
  const span = N * CELL;
  // Le cadre gravé de Hullsborg demande une bande d'une case de large.
  const cadre = pal.brut ? 2.3 : 1.5;
  // Sur la planche d'Alex, le damier est une dalle d'un pouce posée
  // sur le cadre gravé (photos du 2026-09-21) : le cadre descend
  // d'autant, les cases restent où les pièces les attendent.
  const DALLE = pal.brut ? 0.6 : 0;

  // Le bois de Hullsborg est photographié (deux planches de pin, l'une
  // au miel pour le cadre, l'autre teinte noyer pour les cases), pas
  // peint au canevas : Alex voulait « du vrai bois » (2026-09-21).
  const pinClair = pal.brut ? boisPhoto(PIN_CLAIR_URL, manager) : null;
  const pinTeinte = pal.brut ? boisPhoto(PIN_TEINTE_URL, manager) : null;

  const boisProfond = pinTeinte ?? boisTexture(pal.socle, pal.socleHaut);
  boisProfond.repeat.set(2.5, 2.5);
  const baseDeep = new THREE.Mesh(
    new THREE.BoxGeometry(span + cadre + 0.7, 0.5, span + cadre + 0.7),
    new THREE.MeshPhongMaterial({ color: pinTeinte ? 0x4a3020 : 0xffffff, map: boisProfond, shininess: 10, specular: 0x2a1a0c }),
  );
  baseDeep.position.y = -0.42 - DALLE;
  baseDeep.receiveShadow = true;
  group.add(baseDeep);
  cosmetics.push(baseDeep);

  const boisTable = pinClair ?? boisTexture(pal.socleHaut, pal.clair);
  boisTable.repeat.set(pinClair ? 1.4 : 2, pinClair ? 1.4 : 2);
  const baseTop = new THREE.Mesh(
    new THREE.BoxGeometry(span + cadre, 0.3, span + cadre),
    new THREE.MeshPhongMaterial({ color: pinClair ? 0xb8916a : 0xffffff, map: boisTable, shininess: pinClair ? 8 : 22, specular: 0x3a2712 }),
  );
  baseTop.position.y = -0.12 - DALLE;
  baseTop.receiveShadow = true;
  group.add(baseTop);
  cosmetics.push(baseTop);

  if (pal.brut && pinTeinte) {
    // La dalle du damier : ses flancs montrent le pin teinté, son
    // dessus disparaît sous les cases et les sillons brûlés.
    const dalle = new THREE.Mesh(
      new THREE.BoxGeometry(span + 0.04, DALLE, span + 0.04),
      new THREE.MeshPhongMaterial({ color: 0x6a4630, map: pinTeinte, shininess: 8, specular: 0x2a1a0c }),
    );
    dalle.position.y = 0.05 - DALLE / 2;
    dalle.castShadow = true;
    dalle.receiveShadow = true;
    group.add(dalle);
    cosmetics.push(dalle);
  }

  // Filet de laiton qui court autour du champ de jeu
  const railMat = new THREE.MeshPhongMaterial({
    color: pal.metal,
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
    if (pal.brut) break;
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

  // Plateau brut : la teinte suit les postes de départ, pas un damier,
  // et chaque essence a sa veine (trois textures pour tout le plateau).
  const depart = pal.brut ? initBoard() : null;
  const veines = new Map<number, THREE.CanvasTexture>();
  const veine = (teinte: number) => {
    if (!veines.has(teinte)) veines.set(teinte, boisTexture(teinte, 0x1a0f08));
    return veines.get(teinte)!;
  };

  for (let r = 0; r < N; r++) {
    const row: THREE.Mesh[] = [];
    for (let c = 0; c < N; c++) {
      let col = (depart ? depart[r][c] === 0 : (r + c) % 2 === 0) ? pal.clair : pal.sombre;
      let emissive = 0x000000;
      if (isThrone(r, c)) { col = pal.trone; emissive = 0x1a0202; }
      if (isCorner(r, c)) { col = pal.metalSombre; emissive = 0x171004; }
      let mat: THREE.MeshPhongMaterial;
      let geo: THREE.BufferGeometry = sqGeo;
      if (pinTeinte && pinClair) {
        // Chaque case est un bloc distinct sur la planche : la même
        // photo de pin, mais un morceau et un sens de veine par case.
        // Trône et coins au pin clair, postes de départ teints noyer.
        const special = isThrone(r, c) || isCorner(r, c);
        const sombre = col === pal.sombre;
        mat = new THREE.MeshPhongMaterial({
          color: special ? 0xe0c090 : (sombre ? 0x4a3226 : 0xa07452),
          map: special ? pinClair : pinTeinte,
          shininess: pal.brillance,
          specular: 0x2a1a0c,
        });
        geo = morceauDeVeine(sqGeo);
      } else if (pal.brut) {
        mat = new THREE.MeshPhongMaterial({ color: 0xffffff, map: veine(col), shininess: pal.brillance });
      } else {
        mat = new THREE.MeshPhongMaterial({ color: col, shininess: pal.brillance, emissive });
      }
      const sq = new THREE.Mesh(geo, mat);
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
    color: pal.metal,
    emissive: 0x241902,
    shininess: 160,
    specular: 0xfff0c0,
  });
  const ringGeo = new THREE.TorusGeometry(CELL * 0.30, 0.022, 8, 32);
  const dotGeo  = new THREE.CylinderGeometry(0.045, 0.045, 0.02, 12);

  const marks: Array<[number, number]> = [
    [0, 0], [0, N - 1], [N - 1, 0], [N - 1, N - 1], [MID, MID],
  ];
  for (const [r, c] of pal.brut ? [] : marks) {
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
  for (const [dx, dz] of (pal.brut ? [] : [[1, 0], [-1, 0], [0, 1], [0, -1]]) as Array<[number, number]>) {
    const ray = new THREE.Mesh(
      new THREE.BoxGeometry(dx !== 0 ? CELL * 0.22 : 0.03, 0.018, dz !== 0 ? CELL * 0.22 : 0.03),
      inlayMat,
    );
    ray.position.set(dx * CELL * 0.26, 0.106, dz * CELL * 0.26);
    group.add(ray);
    cosmetics.push(ray);
  }

  if (pal.brut) {
    // Les sillons entre les cases sont brûlés noir, pas couleur de cadre.
    const fond = new THREE.Mesh(
      new THREE.PlaneGeometry(span, span),
      new THREE.MeshBasicMaterial({ color: 0x120a05 }),
    );
    fond.rotation.x = -Math.PI / 2;
    fond.position.y = 0.052;
    group.add(fond);
    graverHullsborg(group, span + cadre, 0.032 - DALLE, 0.102);
  }

  // ── Le blason du festival, peint sur le champ ───────────────────
  // Un décalque du chevalier, à peine plus clair que le noyer, posé au
  // centre. Il doit se deviner, pas se voir : le plateau sculpté reste
  // la vedette. MeshPhong (et non Basic) pour que la peinture prenne
  // la lumière des torches et s'assombrisse dans l'ombre, comme une
  // vraie dorure usée. Sous la surbrillance (0.16) pour ne jamais
  // masquer les cases jouables.
  if (jeu.decal) {
    const decalGeo = new THREE.PlaneGeometry(DECAL_H * DECAL_RATIO, DECAL_H);
    const decalMat = new THREE.MeshPhongMaterial({
      color: jeu.decal.couleur,
      transparent: true,
      opacity: jeu.decal.opacite,
      depthWrite: false,
      shininess: 8,
    });
    const decal = new THREE.Mesh(decalGeo, decalMat);
    decal.rotation.x = -Math.PI / 2;
    decal.position.set(0, 0.13, 0);
    decal.renderOrder = 1;
    group.add(decal);
    // Surtout PAS dans `cosmetics` : le blason survit à l'arrivée du
    // GLB, c'est précisément sur le beau plateau qu'il doit se voir.

    new THREE.TextureLoader(manager).load(DECAL_URL, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      decalMat.map = tex;
      decalMat.needsUpdate = true;
    });
  }

  // ── Le plateau sculpté de Meshy, par-dessus ─────────────────────
  if (!jeu.url) {
    // Jeu sans modèle : le plateau procédural EST le plateau.
    return { squares, clickables, decorations: [] };
  }

  const draco = new DRACOLoader(manager);
  draco.setDecoderPath('/draco/');
  const loader = new GLTFLoader(manager);
  loader.setDRACOLoader(draco);

  loader.load(
    jeu.url,
    (gltf) => {
      // StrictMode monte le jeu deux fois : le callback du montage MORT
      // arrive quand même. On ne garde que le vivant.
      if (isAlive && !isAlive()) return;
      const model = gltf.scene;
      model.rotation.x = GLB_ROT_X;
      model.rotation.y = jeu.rotY ?? 0;
      model.scale.setScalar(jeu.scale ?? 7.85);
      model.position.y = jeu.y ?? 0;
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
        // Passer `transparent` après la première compilation exige une
        // recompilation du programme, sinon l'opacité est ignorée et
        // les tuiles restent pleinement visibles.
        m.needsUpdate = true;
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
          tune: (scale: number, y: number, rotY = 0, x = 0, z = 0) => {
            for (const t of tuners) (t as { tune: (s: number, y: number, r: number, x: number, z: number) => void }).tune(scale, y, rotY, x, z);
            return { scale, y, rotY, x, z, models: tuners.length };
          },
          showProc: (on: boolean) => {
            for (const t of tuners) (t as { showProc: (o: boolean) => void }).showProc(on);
          },
          census: () => tuners.map((t) => (t as { census: () => unknown }).census()),
        };
        tuners.push({
          tune: (scale: number, y: number, rotY = 0, x = 0, z = 0) => {
            model.scale.setScalar(scale);
            model.position.set(x, y, z);
            model.rotation.y = rotY;
            return { scale, y, rotY, x, z };
          },
          showProc: (on: boolean) => {
            for (const c of cosmetics) c.visible = on;
            for (const m of tileMats) { m.opacity = on ? 1 : 0; m.needsUpdate = true; }
          },
          census: () => {
            const sc = group.parent as THREE.Scene | null;
            // Headless : aucune frame ne passe forcément entre tune()
            // et census(), donc on force la matrice monde à jour.
            model.updateWorldMatrix(true, true);
            return {
              groupInScene: !!sc,
              sceneChildren: sc ? sc.children.map((ch) => `${ch.type}:${ch.children.length}`) : [],
              tileOpacity: tileMats[0]?.opacity,
              cosmeticsVisible: cosmetics[0]?.visible,
              modelScale: model.scale.x,
              modelPos: model.position.toArray(),
              modelWorldY: new THREE.Vector3().setFromMatrixPosition(model.matrixWorld).y,
              // Hauteur réelle de la surface peinte : raycast vertical
              // au-dessus de quelques cases logiques.
              surfaceY: [[5, 5], [0, 5], [5, 0], [10, 5], [5, 10], [3, 3], [8, 8]].map(([r, c]) => {
                const rc = new THREE.Raycaster(
                  new THREE.Vector3((c - MID) * CELL, 10, (r - MID) * CELL),
                  new THREE.Vector3(0, -1, 0),
                );
                const hit = rc.intersectObject(model, true)[0];
                return hit ? Math.round(hit.point.y * 1000) / 1000 : null;
              }),
            };
          },
        });
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
