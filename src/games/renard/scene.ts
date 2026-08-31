// ─── La table du Renard et les Oies ─────────────────────────────────
// Alex, 2026-08-30 : la scène, les lumières, la salle et la table de
// bois viennent telles quelles du hnefatafl (sceneSetup.ts). Rien à
// réécrire : c'est la même taverne, le même brouillard, la même caméra
// en plongée légère qu'on fait tourner à la souris.
//
// Ce qui est propre à ce jeu vit ici : la planche cruciforme, les
// lignes brûlées au fer, les cupules creusées à chaque point, le
// renard roux et les oies blanches, tous taillés en code. Aucun
// fichier à télécharger, la partie s'ouvre tout de suite.

import * as THREE from 'three';
import gsap from 'gsap';
import { setupScene } from '../hnefatafl/sceneSetup';
import { PAS, POINTS, pointDe, type Coup, type Plateau } from './logic';
import { chargerSculpture } from '../sculpture';
import { carteNormales, grainDeBois, ombreDeContact } from '../bois';

/** L'écart entre deux points du plateau. Sept points de large, donc
 *  une planche d'environ douze unités : le cadrage de sceneSetup, réglé
 *  pour le damier du tafl, la prend sans rien changer. */
const PAS_3D = 2.0;
// Le chanfrein déborde de l'extrusion des deux côtés : l'épaisseur
// utile de la planche vaut donc EPAISSEUR + 2 × BISEAU, et ce total
// doit rester sous les 0,64 unité qui séparent le plan de jeu du
// dessus de la table partagée avec le tafl (sceneSetup.ts).
const EPAISSEUR = 0.44;
const BISEAU = 0.09;

/** La demi-largeur d'un bras de la croix, et sa demi-longueur. Les deux
 *  servent à la fois à découper la planche et à peindre sa texture. */
const BRAS = 2.25;
const LONGUEUR = 6.35;

/** Le jeu entier est grossi d'un quart dans la scène du tafl, moins
 *  en portrait (voir `ajusterEchelle`). */
const ECHELLE = 1.25;

const HAUTEUR_SURBRILLANCE = 0.075;

const COULEUR_CHOISI = 0xe8b14a;   // laiton du site
const COULEUR_CIBLE = 0x2ab964;    // vert de la forêt ancienne

/** Le monde 3D d'un point du plateau. La rangée 0 est au fond. */
const positionDe = (i: number): THREE.Vector3 => {
  const { r, c } = POINTS[i];
  return new THREE.Vector3((c - 3) * PAS_3D, 0, (r - 3) * PAS_3D);
};

// ── Le bois de la planche ───────────────────────────────────────────
// Alex, 2026-08-31 : la planche ne partage plus la photo de la table
// des dés. Elle a son propre canevas, peint ici : de l'épinette
// patinée, fibres serrées et claires, avec le liseré rouge usé du
// pourtour, les trente-trois cupules et les lignes brûlées au fer,
// creusées dans la carte de normales plutôt que posées à plat.

/** Le contour de la croix, en coordonnées de plateau. */
const CONTOUR: ReadonlyArray<readonly [number, number]> = (() => {
  const a = BRAS; const L = LONGUEUR;
  return [
    [-a, -L], [a, -L], [a, -a], [L, -a], [L, a], [a, a],
    [a, L], [-a, L], [-a, a], [-L, a], [-L, -a], [-a, -a],
  ];
})();

/** Le repère de la texture : le carré englobant de la croix devient le
 *  carré de l'image, et rien ne se déforme puisque la croix est carrée. */
const uvPx = (S: number) => (u: number) => ((u + LONGUEUR) / (LONGUEUR * 2)) * S;
const RAYON_CUPULE = 0.36;

/** Le dessus de la planche, en couleur. */
function dessusEpinette(): THREE.CanvasTexture {
  const S = 1024;
  const c = grainDeBois({
    taille: S, fond: '#c8a878', veine: '#6a4c2a',
    fibres: 620, noeuds: 4, ondulation: 5, repetition: 1,
  });
  const g = c.getContext('2d')!;
  const px = uvPx(S);
  const R = (RAYON_CUPULE / (LONGUEUR * 2)) * S;

  // La patine : la planche a servi, elle est plus sombre aux extrémités
  // et sur les bords, plus claire là où les mains l'ont polie.
  const usure = g.createRadialGradient(S / 2, S / 2, S * 0.08, S / 2, S / 2, S * 0.62);
  usure.addColorStop(0, 'rgba(255,236,200,0.16)');
  usure.addColorStop(0.6, 'rgba(60,34,12,0.05)');
  usure.addColorStop(1, 'rgba(40,22,8,0.34)');
  g.fillStyle = usure;
  g.fillRect(0, 0, S, S);

  // Le liseré rouge du pourtour, peint au minium et mangé par le temps :
  // un trait plein, puis une seconde passe qui l'écaille par endroits.
  const tracerContour = (marge: number) => {
    g.beginPath();
    CONTOUR.forEach(([x, y], i) => {
      const m = marge * Math.sign(x || 1);
      const n = marge * Math.sign(y || 1);
      const px0 = px(x - (Math.abs(x) === LONGUEUR || Math.abs(x) === BRAS ? m : 0));
      const py0 = px(y - (Math.abs(y) === LONGUEUR || Math.abs(y) === BRAS ? n : 0));
      if (i === 0) g.moveTo(px0, py0); else g.lineTo(px0, py0);
    });
    g.closePath();
  };
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(150,44,28,0.72)';
  g.lineWidth = S * 0.011;
  tracerContour(0.34);
  g.stroke();
  // L'écaillage : des trous dans le trait, pas un dégradé.
  g.save();
  g.globalCompositeOperation = 'destination-out';
  g.lineWidth = S * 0.013;
  g.setLineDash([S * 0.006, S * 0.055, S * 0.014, S * 0.03]);
  g.lineDashOffset = S * 0.02;
  g.strokeStyle = 'rgba(0,0,0,0.75)';
  tracerContour(0.34);
  g.stroke();
  g.restore();
  g.setLineDash([]);

  // Les lignes brûlées au fer, une par voisinage.
  g.strokeStyle = 'rgba(26,12,3,0.8)';
  g.lineWidth = S * 0.006;
  POINTS.forEach((p, i) => {
    for (const { dr, dc } of PAS) {
      const v = pointDe(p.r + dr, p.c + dc);
      if (v <= i) continue;
      g.beginPath();
      g.moveTo(px((p.c - 3) * PAS_3D), px((p.r - 3) * PAS_3D));
      g.lineTo(px((POINTS[v].c - 3) * PAS_3D), px((POINTS[v].r - 3) * PAS_3D));
      g.stroke();
    }
  });

  // Les cupules : le fond sombre, l'arête haute qui prend la lumière.
  POINTS.forEach((p) => {
    const cx = px((p.c - 3) * PAS_3D);
    const cy = px((p.r - 3) * PAS_3D);
    const grad = g.createRadialGradient(cx + R * 0.3, cy + R * 0.3, R * 0.05, cx, cy, R);
    grad.addColorStop(0, 'rgba(42,21,8,0.5)');
    grad.addColorStop(0.82, 'rgba(78,50,24,0.34)');
    grad.addColorStop(1, 'rgba(120,88,52,0.1)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(240,214,168,0.4)';
    g.lineWidth = S * 0.0028;
    g.beginPath();
    g.arc(cx, cy, R, Math.PI * 1.08, Math.PI * 1.92);
    g.stroke();
  });

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Le relief du dessus : blanc, la surface; noir, le fond du creux.
 *  Sert de source à la carte de normales et de carte de rugosité. */
function reliefEpinette(): HTMLCanvasElement {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const px = uvPx(S);
  const R = (RAYON_CUPULE / (LONGUEUR * 2)) * S;

  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, S, S);
  g.lineCap = 'round';

  g.strokeStyle = '#3c3c3c';
  g.lineWidth = S * 0.0055;
  g.filter = 'blur(1.4px)';
  POINTS.forEach((p, i) => {
    for (const { dr, dc } of PAS) {
      const v = pointDe(p.r + dr, p.c + dc);
      if (v <= i) continue;
      g.beginPath();
      g.moveTo(px((p.c - 3) * PAS_3D), px((p.r - 3) * PAS_3D));
      g.lineTo(px((POINTS[v].c - 3) * PAS_3D), px((POINTS[v].r - 3) * PAS_3D));
      g.stroke();
    }
  });
  g.filter = 'none';

  POINTS.forEach((p) => {
    const cx = px((p.c - 3) * PAS_3D);
    const cy = px((p.r - 3) * PAS_3D);
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, R);
    grad.addColorStop(0, '#1f1f1f');
    grad.addColorStop(0.62, '#4a4a4a');
    grad.addColorStop(0.92, '#c6c6c6');
    grad.addColorStop(1, '#ffffff');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2);
    g.fill();
  });

  return c;
}

/** Le chant de la planche : le même bois, vu de côté, sans gravure. */
function chantEpinette(): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(grainDeBois({
    taille: 512, fond: '#b0906a', veine: '#5d3f22', fibres: 520, noeuds: 2, ondulation: 4, repetition: 3,
  }));
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 1);
  t.anisotropy = 8;
  return t;
}

/** Un clou forgé : une tête martelée, jamais parfaitement ronde. */
function clouForge(mat: THREE.Material): THREE.Mesh {
  const tete = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2), mat);
  tete.scale.set(1, 0.42, 0.92);
  tete.rotation.y = Math.random() * Math.PI;
  tete.castShadow = true;
  return tete;
}

/** La croix, taillée dans une seule pièce de bois, ses chants
 *  biseautés, ses lignes en creux et ses cupules polies. */
function construirePlateau(): { groupe: THREE.Group; ranger: () => void } {
  const groupe = new THREE.Group();

  const dessusTex = dessusEpinette();
  const reliefCanvas = reliefEpinette();
  const normalesTex = carteNormales(reliefCanvas, 2.4);
  const rugositeTex = new THREE.CanvasTexture(reliefCanvas);
  rugositeTex.anisotropy = 8;
  const chantTex = chantEpinette();

  const matDessus = new THREE.MeshStandardMaterial({
    map: dessusTex,
    normalMap: normalesTex,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughnessMap: rugositeTex,
    roughness: 0.92,
    metalness: 0.03,
  });
  const matChant = new THREE.MeshStandardMaterial({ map: chantTex, roughness: 0.84, metalness: 0.02 });

  // Une seule pièce de bois, découpée en croix. Deux planches croisées
  // auraient donné deux dessus coplanaires au milieu, donc un
  // scintillement à la moindre rotation de caméra.
  const forme = new THREE.Shape();
  CONTOUR.forEach(([x, y], i) => { if (i === 0) forme.moveTo(x, y); else forme.lineTo(x, y); });
  forme.closePath();

  const geo = new THREE.ExtrudeGeometry(forme, {
    depth: EPAISSEUR, bevelEnabled: true, bevelThickness: BISEAU, bevelSize: 0.11, bevelSegments: 3,
  });
  // L'extrusion rend les faces du dessus et du dessous dans le groupe 0
  // et les chants dans le groupe 1. Les UV du dessus sortent en unités
  // de plateau : elles se ramènent ici dans le carré 0..1 de l'image.
  const capot = geo.groups.find((gr) => gr.materialIndex === 0);
  if (capot) {
    const uv = geo.attributes.uv;
    for (let i = capot.start; i < capot.start + capot.count; i++) {
      uv.setXY(
        i,
        (uv.getX(i) + LONGUEUR) / (LONGUEUR * 2),
        (uv.getY(i) + LONGUEUR) / (LONGUEUR * 2),
      );
    }
    uv.needsUpdate = true;
  }

  const planche = new THREE.Mesh(geo, [matDessus, matChant]);
  planche.rotation.x = -Math.PI / 2;
  // Le chanfrein déborde de l'extrusion des deux côtés : sans ce
  // décalage, le dessus de la planche monterait au-dessus de zéro et
  // recouvrirait les cupules.
  planche.position.y = -(EPAISSEUR + BISEAU);
  planche.castShadow = true;
  planche.receiveShadow = true;
  groupe.add(planche);

  // Les cupules : une écuelle polie à chaque point, lèvre affleurante,
  // fond nettement sous le plan de la planche.
  const CUP = [
    [0.00, -0.105], [0.06, -0.102], [0.15, -0.086], [0.24, -0.055],
    [0.32, -0.016], [0.36, 0.000], [0.40, 0.005],
  ] as const;
  const creuxGeo = new THREE.LatheGeometry(CUP.map(([r, y]) => new THREE.Vector2(r, y)), 26);
  creuxGeo.computeVertexNormals();
  const creuxMat = new THREE.MeshStandardMaterial({
    color: 0x9a7245, roughness: 0.32, metalness: 0.05, side: THREE.DoubleSide,
  });
  POINTS.forEach((_, i) => {
    const m = new THREE.Mesh(creuxGeo, creuxMat);
    m.position.copy(positionDe(i));
    m.position.y = 0.006;
    m.receiveShadow = true;
    groupe.add(m);
  });

  // Les clous forgés : un à chaque angle saillant de la croix, comme
  // sur les planches de ferme où le liseré était cloué avant d'être
  // peint.
  const ferMat = new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.48, metalness: 0.85 });
  const a = BRAS - 0.42; const L = LONGUEUR - 0.42;
  for (const [x, z] of [
    [-a, -L], [a, -L], [L, -a], [L, a], [a, L], [-a, L], [-L, a], [-L, -a],
  ] as const) {
    const clou = clouForge(ferMat);
    clou.position.set(x, 0.01, z);
    groupe.add(clou);
  }

  const ranger = () => {
    geo.dispose();
    creuxGeo.dispose();
    creuxMat.dispose();
    matDessus.dispose();
    matChant.dispose();
    ferMat.dispose();
    dessusTex.dispose();
    normalesTex.dispose();
    rugositeTex.dispose();
    chantTex.dispose();
  };

  return { groupe, ranger };
}

// ── Le renard ───────────────────────────────────────────────────────
function renardProcedural(): THREE.Group {
  const g = new THREE.Group();
  const roux = new THREE.MeshStandardMaterial({ color: 0xb5551d, roughness: 0.65, metalness: 0.02 });
  const clair = new THREE.MeshStandardMaterial({ color: 0xf1e3cc, roughness: 0.7, metalness: 0.02 });
  const sombre = new THREE.MeshStandardMaterial({ color: 0x241009, roughness: 0.6, metalness: 0.05 });

  const corps = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.42, 6, 14), roux);
  corps.rotation.z = Math.PI / 2;
  corps.position.set(0, 0.52, 0.02);
  g.add(corps);

  const poitrail = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 12), clair);
  poitrail.position.set(0, 0.44, -0.22);
  poitrail.scale.set(1, 0.85, 0.8);
  g.add(poitrail);

  for (const x of [-0.17, 0.17]) {
    for (const z of [-0.2, 0.22]) {
      const patte = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.05, 0.42, 10), sombre);
      patte.position.set(x, 0.21, z);
      g.add(patte);
    }
  }

  const tete = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 14), roux);
  tete.position.set(0, 0.82, -0.28);
  g.add(tete);

  const museau = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.34, 14), roux);
  museau.rotation.x = -Math.PI / 2;
  museau.position.set(0, 0.78, -0.48);
  g.add(museau);

  const truffe = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), sombre);
  truffe.position.set(0, 0.78, -0.64);
  g.add(truffe);

  for (const x of [-0.12, 0.12]) {
    const oreille = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.26, 4), roux);
    oreille.position.set(x, 1.02, -0.24);
    oreille.rotation.x = -0.12;
    g.add(oreille);
  }

  const queue = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.36, 6, 12), roux);
  queue.position.set(0, 0.62, 0.44);
  queue.rotation.x = -0.85;
  g.add(queue);
  const boutDeQueue = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 10), clair);
  boutDeQueue.position.set(0, 0.86, 0.62);
  g.add(boutDeQueue);

  g.traverse((o) => { if (o instanceof THREE.Mesh) { o.castShadow = true; } });
  // L'échelle vit sur la figurine, jamais sur le groupe rendu : c'est
  // ce dernier que l'animation de capture rétrécit jusqu'à zéro.
  g.scale.setScalar(1.35);
  const socle = new THREE.Group();
  socle.add(g);
  return socle;
}

// ── Une oie ─────────────────────────────────────────────────────────
function oieProcedurale(): THREE.Group {
  const g = new THREE.Group();
  const plume = new THREE.MeshStandardMaterial({ color: 0xf6f1e4, roughness: 0.72, metalness: 0.02 });
  const bec = new THREE.MeshStandardMaterial({ color: 0xe08a1e, roughness: 0.5, metalness: 0.08 });
  const oeil = new THREE.MeshStandardMaterial({ color: 0x1b1208, roughness: 0.4, metalness: 0.1 });

  const corps = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 14), plume);
  corps.position.set(0, 0.32, 0.04);
  corps.scale.set(0.78, 0.78, 1.18);
  g.add(corps);

  const cou = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.62, 12), plume);
  cou.position.set(0, 0.7, -0.16);
  cou.rotation.x = 0.2;
  g.add(cou);

  const tete = new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 12), plume);
  tete.position.set(0, 1.02, -0.24);
  g.add(tete);

  const nez = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 10), bec);
  nez.rotation.x = -Math.PI / 2;
  nez.position.set(0, 1.01, -0.38);
  g.add(nez);

  for (const x of [-0.075, 0.075]) {
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), oeil);
    o.position.set(x, 1.06, -0.32);
    g.add(o);
  }

  const croupion = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.28, 10), plume);
  croupion.rotation.x = -Math.PI / 2.6;
  croupion.position.set(0, 0.38, 0.32);
  g.add(croupion);

  g.traverse((o) => { if (o instanceof THREE.Mesh) { o.castShadow = true; } });
  g.scale.setScalar(1.2);
  const socle = new THREE.Group();
  socle.add(g);
  return socle;
}

export interface Table3D {
  /** Repose toutes les pièces d'un coup, sans animation. */
  poser(p: Plateau): void;
  /** Joue le coup à l'écran, puis appelle `fini`. */
  animer(coup: Coup, fini: () => void): void;
  surbrillance(choisi: number | null, cibles: number[]): void;
  dispose(): void;
}

/** Monte la table et rend de quoi la piloter. `surClic` reçoit le
 *  numéro du point touché, jamais un pixel. */
export function creerTable(el: HTMLElement, surClic: (point: number) => void): Table3D {
  const vue = setupScene(el);
  const { scene, camera, renderer } = vue;

  // Tout le jeu vit dans un groupe racine, grossi d'un quart. Le
  // cadrage de sceneSetup est réglé pour le damier du tafl, bien plus
  // large : sans cette échelle la croix flotte au milieu d'une table
  // vide. Passer par un groupe évite de toucher à une scène partagée
  // avec un autre jeu, et le ResizeObserver de sceneSetup continue de
  // faire son travail.
  const racine = new THREE.Group();
  scene.add(racine);
  const plateau = construirePlateau();
  racine.add(plateau.groupe);

  // L'ombre de contact : le disque doux qui pose la planche sur la
  // table au lieu de la laisser flotter.
  const ombreTex = ombreDeContact(256, 0.6);
  const ombreGeo = new THREE.PlaneGeometry(LONGUEUR * 2 + 4.5, LONGUEUR * 2 + 4.5);
  const ombreMat = new THREE.MeshBasicMaterial({
    map: ombreTex, transparent: true, opacity: 0.8, depthWrite: false, fog: false,
  });
  const ombre = new THREE.Mesh(ombreGeo, ombreMat);
  ombre.rotation.x = -Math.PI / 2;
  ombre.position.y = -(EPAISSEUR + BISEAU * 2) - 0.008;
  ombre.renderOrder = 1;
  racine.add(ombre);

  // En portrait, sceneSetup ne recule pas assez la caméra pour une
  // planche aussi large que haute : la croix débordait par les côtés
  // et une oie du bras gauche sortait du cadre. L'échelle se resserre
  // donc avec le format.
  let echelle = ECHELLE;
  const ajusterEchelle = () => {
    const format = el.clientWidth / Math.max(el.clientHeight, 1);
    echelle = ECHELLE * Math.min(1, Math.pow(Math.max(format, 0.3), 0.45));
    racine.scale.setScalar(echelle);
  };
  const suiviFormat = new ResizeObserver(ajusterEchelle);
  suiviFormat.observe(el);
  ajusterEchelle();

  // Les pièces, une par point occupé. Le groupe garde son numéro de
  // point dans userData : l'animation le relit sans table annexe.
  const pieces = new Map<number, THREE.Group>();

  // Les bêtes sculptées (Meshy) prennent la place des bêtes de
  // géométrie dès qu'elles arrivent; la géométrie reste le secours.
  const sculptes: { renard?: THREE.Group; oie?: THREE.Group } = {};
  const enveloppes: THREE.Group[] = [];
  const habiller = (g: THREE.Group) => {
    const proto = sculptes[g.userData.sculpture as 'renard' | 'oie'];
    if (!proto) return;
    g.clear();
    g.add(proto.clone(true));
  };
  const construire = (quoi: 'renard' | 'oie'): THREE.Group => {
    const g = quoi === 'renard' ? renardProcedural() : oieProcedurale();
    g.userData.sculpture = quoi;
    enveloppes.push(g);
    habiller(g);
    return g;
  };
  let vivant = true;
    // Hauteurs mesurées à l'écran (pas de grille PAS_3D = 2,0) : le
  // renard doit dominer la basse-cour, or Meshy sort les deux bêtes à
  // la même hauteur normalisée. 1,4 contre 1,1 : le renard fait un
  // quart de plus, et l'oie garde son assise dans sa cupule.
  ([['renard', '/games/renard/models/renard.glb', 1.4], ['oie', '/games/renard/models/oie.glb', 1.1]] as const)
    .forEach(([quoi, url, hauteur]) => {
      chargerSculpture(url, hauteur).then((proto) => {
        if (!vivant) return;
        sculptes[quoi] = proto;
        for (const g of enveloppes) if (g.userData.sculpture === quoi) habiller(g);
      }).catch((err) => console.warn('[renard] bête sculptée indisponible', url, err));
    });

  const renard = construire('renard');
  renard.visible = false;
  racine.add(renard);

  const oiesLibres: THREE.Group[] = [];
  const prendreOie = (): THREE.Group => {
    const dispo = oiesLibres.pop();
    if (dispo) { dispo.visible = true; dispo.scale.setScalar(1); return dispo; }
    const neuve = construire('oie');
    racine.add(neuve);
    return neuve;
  };

  const poser = (p: Plateau) => {
    gsap.killTweensOf(renard.position);
    for (const g of pieces.values()) {
      if (g !== renard) { g.visible = false; g.scale.setScalar(1); oiesLibres.push(g); }
    }
    pieces.clear();
    renard.visible = false;
    p.forEach((occ, i) => {
      if (!occ) return;
      const g = occ === 'renard' ? renard : prendreOie();
      g.visible = true;
      g.scale.setScalar(1);
      g.position.copy(positionDe(i));
      g.rotation.y = occ === 'oie' ? Math.PI : 0;
      pieces.set(i, g);
    });
  };

  const animer = (coup: Coup, fini: () => void) => {
    const piece = pieces.get(coup.de);
    if (!piece) { fini(); return; }
    pieces.delete(coup.de);

    const fil = gsap.timeline({ onComplete: fini });
    coup.etapes.forEach((etape, n) => {
      const arrivee = positionDe(etape);
      const bond = coup.prises.length > 0;
      fil.to(piece.position, {
        x: arrivee.x,
        z: arrivee.z,
        duration: bond ? 0.36 : 0.34,
        ease: bond ? 'power1.inOut' : 'power2.inOut',
      }, n === 0 ? 0 : '>');
      if (bond) {
        // Un vrai saut : la pièce quitte la planche entre les deux points.
        fil.to(piece.position, { y: 0.85, duration: 0.18, ease: 'power2.out' }, '<');
        fil.to(piece.position, { y: 0, duration: 0.18, ease: 'power2.in' }, '>');
      }
    });

    // Les oies emportées s'envolent au moment où le renard passe.
    coup.prises.forEach((prise, n) => {
      const oie = pieces.get(prise);
      if (!oie) return;
      pieces.delete(prise);
      fil.to(oie.position, { y: 1.6, duration: 0.5, ease: 'power2.out' }, n * 0.36 + 0.16);
      fil.to(oie.scale, {
        x: 0.01, y: 0.01, z: 0.01, duration: 0.5, ease: 'power2.in',
        onComplete: () => { oie.visible = false; oie.position.y = 0; oiesLibres.push(oie); },
      }, n * 0.36 + 0.16);
    });

    pieces.set(coup.vers, piece);
  };

  // ── Surbrillance ──────────────────────────────────────────────────
  const disqueGeo = new THREE.CircleGeometry(PAS_3D * 0.42, 28);
  const disques: THREE.Mesh[] = [];
  const effacer = () => {
    for (const d of disques) {
      racine.remove(d);
      (d.material as THREE.Material).dispose();
    }
    disques.length = 0;
  };
  const poserDisque = (i: number, couleur: number, opacite: number) => {
    const m = new THREE.Mesh(disqueGeo, new THREE.MeshBasicMaterial({
      color: couleur, transparent: true, opacity: opacite, depthWrite: false,
    }));
    m.rotation.x = -Math.PI / 2;
    m.position.copy(positionDe(i));
    m.position.y = HAUTEUR_SURBRILLANCE;
    racine.add(m);
    disques.push(m);
  };
  const surbrillance = (choisi: number | null, cibles: number[]) => {
    effacer();
    if (choisi !== null) poserDisque(choisi, COULEUR_CHOISI, 0.55);
    for (const c of cibles) poserDisque(c, COULEUR_CIBLE, 0.42);
  };

  // ── Le clic et la rotation ────────────────────────────────────────
  // On ne vise pas les pièces mais le plan de la planche : le point le
  // plus proche du contact gagne. Un pion mal cliqué sur son oreille
  // répond quand même, et une case vide se choisit aussi bien.
  const rayon = new THREE.Raycaster();
  const plan = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const contact = new THREE.Vector3();
  const ecran = new THREE.Vector2();

  const pointSous = (clientX: number, clientY: number): number | null => {
    const boite = renderer.domElement.getBoundingClientRect();
    ecran.x = ((clientX - boite.left) / boite.width) * 2 - 1;
    ecran.y = -((clientY - boite.top) / boite.height) * 2 + 1;
    rayon.setFromCamera(ecran, camera);
    if (!rayon.ray.intersectPlane(plan, contact)) return null;
    // Le clic est mesuré dans le repère du jeu, pas dans celui de la
    // scène : la racine est mise à l'échelle selon le format.
    contact.divideScalar(echelle);
    let meilleur: number | null = null;
    let distance = PAS_3D * 0.62;
    POINTS.forEach((_, i) => {
      const p = positionDe(i);
      const d = Math.hypot(p.x - contact.x, p.z - contact.z);
      if (d < distance) { distance = d; meilleur = i; }
    });
    return meilleur;
  };

  // ── Sonde de développement ────────────────────────────────────────
  // Même contrat qu'à la mérelle (`window.__merelleScene`) et au
  // hnefatafl : la projection d'un point vers l'écran, pour qu'un test
  // Playwright clique un point précis. Rien n'est exposé en production.
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__renardScene = {
      ecranDe: (i: number) => {
        const v = positionDe(i).multiplyScalar(echelle);
        v.y = 0.3 * echelle;
        v.project(camera);
        const boite = renderer.domElement.getBoundingClientRect();
        return {
          x: boite.left + ((v.x + 1) / 2) * boite.width,
          y: boite.top + ((1 - v.y) / 2) * boite.height,
        };
      },
      pointSous,
    };
  }

  let presse = false;
  let bouge = false;
  let dernierX = 0;
  let dernierY = 0;

  const debut = (x: number, y: number) => { presse = true; bouge = false; dernierX = x; dernierY = y; };
  const glisse = (x: number, y: number) => {
    if (!presse) return;
    const dx = x - dernierX;
    const dy = y - dernierY;
    if (Math.abs(dx) + Math.abs(dy) > 3) bouge = true;
    dernierX = x;
    dernierY = y;
    vue.rotateOrbit(dx, dy);
  };
  const fin = () => { presse = false; };

  const surSouris = {
    down: (e: MouseEvent) => debut(e.clientX, e.clientY),
    move: (e: MouseEvent) => glisse(e.clientX, e.clientY),
    up: () => fin(),
    click: (e: MouseEvent) => {
      if (bouge) return;
      const p = pointSous(e.clientX, e.clientY);
      if (p !== null) surClic(p);
    },
  };
  const surTouche = {
    start: (e: TouchEvent) => { const t = e.touches[0]; if (t) debut(t.clientX, t.clientY); },
    move: (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      e.preventDefault();
      glisse(t.clientX, t.clientY);
    },
    end: (e: TouchEvent) => {
      const t = e.changedTouches[0];
      fin();
      if (bouge || !t) return;
      const p = pointSous(t.clientX, t.clientY);
      if (p !== null) surClic(p);
    },
  };

  el.addEventListener('mousedown', surSouris.down);
  el.addEventListener('mousemove', surSouris.move);
  el.addEventListener('mouseup', surSouris.up);
  el.addEventListener('mouseleave', surSouris.up);
  el.addEventListener('click', surSouris.click);
  el.addEventListener('touchstart', surTouche.start, { passive: true });
  el.addEventListener('touchmove', surTouche.move, { passive: false });
  el.addEventListener('touchend', surTouche.end);
  el.addEventListener('touchcancel', surSouris.up);

  const detacherTaille = vue.attachResize();

  const boucle = () => {
    if (!vivant) return;
    renderer.render(scene, camera);
    requestAnimationFrame(boucle);
  };
  boucle();

  const dispose = () => {
    vivant = false;
    suiviFormat.disconnect();
    gsap.killTweensOf(renard.position);
    effacer();
    plateau.ranger();
    ombreGeo.dispose();
    ombreMat.dispose();
    ombreTex.dispose();
    disqueGeo.dispose();
    detacherTaille();
    el.removeEventListener('mousedown', surSouris.down);
    el.removeEventListener('mousemove', surSouris.move);
    el.removeEventListener('mouseup', surSouris.up);
    el.removeEventListener('mouseleave', surSouris.up);
    el.removeEventListener('click', surSouris.click);
    el.removeEventListener('touchstart', surTouche.start);
    el.removeEventListener('touchmove', surTouche.move);
    el.removeEventListener('touchend', surTouche.end);
    el.removeEventListener('touchcancel', surSouris.up);
    vue.dispose();
  };

  return { poser, animer, surbrillance, dispose };
}
