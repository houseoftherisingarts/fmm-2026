// ─── La table de mérelle en trois dimensions ────────────────────────
// Alex, 2026-08-30 : le plateau est un madrier de chêne posé sur la même
// table que le hnefatafl et le jeu de dés. Les lignes sont gravées dans
// le bois (peintes au canevas, avec leur ombre et leur arête claire) et
// les vingt-quatre points sont de vraies cupules creusées, pas des
// pastilles collées : c'est ce qui donne la lumière rasante quand on
// fait tourner la caméra.
//
// Les pions sont tournés au tour, littéralement : une LatheGeometry
// suit le profil d'un pion de tourneur sur bois, pied évasé, taille
// creusée, dôme sur le dessus. Deux teintes, chêne clair et bois teint.
//
// Ce fichier ne connaît rien aux règles. Il reçoit des ordres (pose,
// déplace, retire, allume) et rend des clics en numéros de point.

import * as THREE from 'three';
import gsap from 'gsap';
import { ARETES, POSITIONS, type Camp } from './logic';
import { chargerSculpture } from '../sculpture';
import { carteNormales, grainDeBois, ombreDeContact, piedTourne } from '../bois';

/** Un pas de grille, en unités de scène. */
export const CELL = 1.5;
/** La surface du plateau : tout ce qui se pose dessus vit à cette hauteur. */
const HAUT = 0.18;
/** Du centre au bord du bois, en unités de grille. */
const DEMI = 3.6;

/** Hauteur d'un pion sculpté, en unités de scène (un pas = CELL = 1,5). */
const HAUTEUR_PION = 1.5;

const TEINTES: Record<Camp, number> = {
  1: 0xd9b681, // chêne clair, huilé
  2: 0x452a18, // bois teint au brou de noix
};

export interface SceneMerelle {
  renderer: THREE.WebGLRenderer;
  /** Rend le point visé par ce clic, ou null si le clic tombe à côté. */
  pointSous(clientX: number, clientY: number): number | null;
  poser(p: number, camp: Camp, fini?: () => void): void;
  deplacer(de: number, vers: number, fini?: () => void): void;
  retirer(p: number, fini?: () => void): void;
  /** Remet le plateau dans l'état donné, sans animation. */
  reinitialiser(points: readonly (0 | 1 | 2)[]): void;
  /** Allume la table : le pion tenu, où il peut aller, et les pions
   *  adverses qu'on a le droit de retirer. */
  allumer(opts: { selection?: number | null; destinations?: number[]; retraits?: number[] }): void;
  /** Branche la souris et le doigt. Rend la fonction de débranchement. */
  attacherEntrees(surPoint: (p: number) => void): () => void;
  attacherResize(): () => void;
  dispose(): void;
}

// ── Le bois ──────────────────────────────────────────────────────────
// Un canevas peint plutôt qu'une image à télécharger : la page du jeu
// ouvre sans attendre le réseau, et le grain se règle au pixel près.
// Le tracé des fibres vit dans ../bois.ts, partagé avec le renard.
function grainDeChene(
  taille = 512, fond = '#6b4a29', veine = '#3a2412', repetition = 1,
): HTMLCanvasElement {
  return grainDeBois({
    taille, fond, veine, repetition,
    // Le chêne se lit à la finesse de ses fibres. Trop peu de traits et
    // le bois tourne au carton peint (constat à l'écran, 2026-08-30);
    // trop épais, il tourne au velours (2026-08-31).
    fibres: 430, noeuds: 3, ondulation: 7,
  });
}

/** Où tombe chaque point du plateau dans la texture du dessus. */
const PX_DESSUS = (S: number) => (u: number) => ((u + DEMI) / (DEMI * 2)) * S;
/** Le rayon d'une cupule, dans la texture du dessus. */
const R_CUPULE = (S: number) => (0.31 / (DEMI * 2)) * S;

/** Le dessus du plateau : le grain, les seize alignements gravés, et les
 *  vingt-quatre cupules avec leur ombre portée. */
function dessusGrave(): THREE.CanvasTexture {
  const S = 1024;
  const c = grainDeChene(S, '#7a5530', '#3a2209', 4);
  const g = c.getContext('2d')!;
  const px = PX_DESSUS(S);
  const R = R_CUPULE(S);

  g.lineCap = 'round';

  // Le double filet du pourtour : c'est ce qui fait un plateau taillé
  // pour être offert plutôt qu'une planche marquée à la va-vite.
  for (const [u, largeur, teinte] of [
    [3.34, 0.007, 'rgba(30,17,6,0.78)'],
    [3.46, 0.0035, 'rgba(30,17,6,0.6)'],
  ] as const) {
    g.strokeStyle = teinte;
    g.lineWidth = S * largeur;
    g.strokeRect(px(-u), px(-u), px(u) - px(-u), px(u) - px(-u));
  }
  // La gravure : un sillon sombre, puis l'arête claire du côté de la
  // lumière. C'est ce décalage d'un pixel ou deux qui fait creux, et la
  // carte de normales fait le reste quand la caméra passe au ras.
  for (const [a, b] of ARETES) {
    const [ax, az] = POSITIONS[a];
    const [bx, bz] = POSITIONS[b];
    g.strokeStyle = 'rgba(28,16,7,0.85)';
    g.lineWidth = S * 0.008;
    g.beginPath();
    g.moveTo(px(ax), px(az));
    g.lineTo(px(bx), px(bz));
    g.stroke();
    g.strokeStyle = 'rgba(214,175,120,0.30)';
    g.lineWidth = S * 0.0028;
    g.beginPath();
    g.moveTo(px(ax) - 2, px(az) - 2);
    g.lineTo(px(bx) - 2, px(bz) - 2);
    g.stroke();
  }

  // Les cupules : un bord net, un fond sombre, et l'arête claire du côté
  // de la lumière. Le dégradé s'arrête au bord, sinon la cupule bave sur
  // le bois et tout le plateau paraît sale.
  for (const [x, z] of POSITIONS) {
    const cx = px(x);
    const cz = px(z);
    const grad = g.createRadialGradient(cx + R * 0.28, cz + R * 0.3, R * 0.05, cx, cz, R);
    grad.addColorStop(0, 'rgba(46,28,11,0.52)');
    grad.addColorStop(0.8, 'rgba(74,49,23,0.36)');
    grad.addColorStop(1, 'rgba(116,84,47,0.14)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(cx, cz, R, 0, Math.PI * 2);
    g.fill();
    // L'arête haute prend la lumière, l'arête basse reste dans l'ombre.
    g.strokeStyle = 'rgba(232,197,144,0.42)';
    g.lineWidth = S * 0.0032;
    g.beginPath();
    g.arc(cx, cz, R, Math.PI * 1.08, Math.PI * 1.92);
    g.stroke();
    g.strokeStyle = 'rgba(24,13,4,0.55)';
    g.beginPath();
    g.arc(cx, cz, R, Math.PI * 0.08, Math.PI * 0.92);
    g.stroke();
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/**
 * Le relief du dessus, en niveaux de gris : blanc, c'est la surface du
 * bois; noir, c'est le fond du creux. Il sert deux fois. La carte de
 * normales en sort par un Sobel, et c'est elle qui donne aux sillons
 * leur vraie arête sous la lumière rasante. Et il sert tel quel de
 * carte de rugosité : le fond des cupules, poli par mille parties,
 * renvoie un reflet que le bois brut n'a pas.
 */
function reliefDuDessus(): HTMLCanvasElement {
  // Moitié moins que la couleur : une carte de normales tolère la
  // demi-résolution, et le Sobel qui la calcule coûte alors quatre fois
  // moins cher au montage de la scène.
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const px = PX_DESSUS(S);
  const R = R_CUPULE(S);

  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, S, S);
  g.lineCap = 'round';

  // Le double filet du pourtour, creusé lui aussi.
  g.strokeStyle = '#7a7a7a';
  g.lineWidth = S * 0.006;
  g.strokeRect(px(-3.34), px(-3.34), px(3.34) - px(-3.34), px(3.34) - px(-3.34));

  // Les sillons : un trait franc, adouci d'un cheveu pour que le Sobel
  // rende une arête et non une marche.
  g.strokeStyle = '#4a4a4a';
  g.lineWidth = S * 0.0075;
  g.filter = 'blur(1.5px)';
  for (const [a, b] of ARETES) {
    const [ax, az] = POSITIONS[a];
    const [bx, bz] = POSITIONS[b];
    g.beginPath();
    g.moveTo(px(ax), px(az));
    g.lineTo(px(bx), px(bz));
    g.stroke();
  }
  g.filter = 'none';

  // Les cupules, en écuelle : le centre au plus bas, le bord affleurant.
  for (const [x, z] of POSITIONS) {
    const cx = px(x);
    const cz = px(z);
    const grad = g.createRadialGradient(cx, cz, 0, cx, cz, R);
    grad.addColorStop(0, '#242424');
    grad.addColorStop(0.62, '#4f4f4f');
    grad.addColorStop(0.92, '#c8c8c8');
    grad.addColorStop(1, '#ffffff');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(cx, cz, R, 0, Math.PI * 2);
    g.fill();
  }

  return c;
}

/** Le profil d'un pion de tourneur, en coupe : le rayon à gauche, la
 *  hauteur à droite. Le tour de potier fait le reste. */
const PROFIL: ReadonlyArray<readonly [number, number]> = [
  [0.00, 0.00], [0.36, 0.00], [0.38, 0.045], [0.34, 0.11],
  [0.23, 0.15], [0.215, 0.23], [0.27, 0.29], [0.255, 0.335],
  [0.17, 0.375], [0.075, 0.395], [0.00, 0.40],
];

function positionDe(p: number, y = HAUT): THREE.Vector3 {
  const [x, z] = POSITIONS[p];
  return new THREE.Vector3(x * CELL, y, z * CELL);
}

export function monterScene(el: HTMLElement): SceneMerelle {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x0a0604);
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0d0906, 22, 56);

  // Une focale plutôt longue : à 48 degrés, le bord proche du plateau
  // devenait deux fois plus gros que le bord lointain et les trois
  // carrés ne se lisaient plus comme des carrés.
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

  // ── Cadrage ────────────────────────────────────────────────────────
  // Plongée légère, comme au hnefatafl : assez haut pour lire les trois
  // carrés d'un coup d'œil, assez bas pour que les pions gardent leur
  // volume. Le rayon se recalcule au redimensionnement, sinon le plateau
  // sort du cadre en portrait, où c'est la largeur qui commande.
  // Le madrier est carré et large. Dans une fenêtre en portrait, c'est
  // la LARGEUR qui commande, et un simple recul ne suffit pas : on ouvre
  // aussi l'objectif, sinon le plateau sort du cadre par les côtés
  // (constat à l'écran sur 390 × 760, 2026-08-30).
  const DEMI_LARGEUR = 6.5; // du centre au bord du bois, marge comprise
  const DEMI_HAUTEUR = 5.0; // ce que le plateau incliné occupe en hauteur
  const focalePour = (aspect: number) =>
    (aspect >= 1 ? 38 : Math.min(60, 38 / Math.pow(Math.max(aspect, 0.3), 0.55)));
  const rayonUtile = (aspect: number) => {
    const t = Math.tan((camera.fov * Math.PI) / 360);
    return 1.16 * Math.max(DEMI_HAUTEUR / t, DEMI_LARGEUR / (t * aspect));
  };

  let camR = 16;
  let theta = 0;
  let phi = 0.66;

  const majCam = () => {
    camera.position.set(
      camR * Math.sin(phi) * Math.sin(theta),
      camR * Math.cos(phi),
      camR * Math.sin(phi) * Math.cos(theta),
    );
    camera.lookAt(0, -0.55, 0);
  };
  majCam();

  const rotateOrbit = (dx: number, dy: number) => {
    theta -= dx * 0.007;
    phi = Math.max(0.18, Math.min(Math.PI / 2.2, phi + dy * 0.006));
    majCam();
  };

  const onResize = () => {
    const W = el.clientWidth;
    const H = el.clientHeight;
    if (W === 0 || H === 0) return;
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    camera.aspect = W / H;
    camera.fov = focalePour(camera.aspect);
    camera.updateProjectionMatrix();
    camR = rayonUtile(camera.aspect);
    majCam();
  };

  const attacherResize = (): (() => void) => {
    const obs = new ResizeObserver(onResize);
    obs.observe(el);
    onResize();
    return () => obs.disconnect();
  };

  // ── Lumière ────────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0x4a2c14, 1.5));
  const chandelle = new THREE.DirectionalLight(0xffd9a0, 2.6);
  chandelle.position.set(6, 12, 5);
  chandelle.castShadow = true;
  chandelle.shadow.mapSize.set(2048, 2048);
  Object.assign(chandelle.shadow.camera, {
    left: -9, right: 9, top: 9, bottom: -9, near: 0.5, far: 40,
  });
  scene.add(chandelle);
  const torcheA = new THREE.PointLight(0xff4c0a, 4.2, 16);
  torcheA.position.set(-7, 5, -6);
  scene.add(torcheA);
  const torcheB = new THREE.PointLight(0xff3d0a, 3.4, 16);
  torcheB.position.set(7, 5, 7);
  scene.add(torcheB);
  // Une pointe froide au-dessus de la table : sans elle, le chêne clair
  // et le bois teint virent tous les deux au même orange.
  const jour = new THREE.PointLight(0x8fa6ff, 1.1, 22);
  jour.position.set(0, 9, -2);
  scene.add(jour);

  // ── La salle et la table ───────────────────────────────────────────
  // Même taverne que le hnefatafl : un seul décor, deux jeux, et le
  // plateau reste le sujet grâce au brouillard.
  const salleTex = new THREE.TextureLoader().load('/scenes/taverne-salle.jpg', (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.x = 3;
    renderer.render(scene, camera);
  });
  const salleGeo = new THREE.CylinderGeometry(30, 30, 24, 48, 1, true);
  const salleMat = new THREE.MeshBasicMaterial({
    map: salleTex, side: THREE.BackSide, fog: true, depthWrite: false, color: 0x6a5a4a,
  });
  const salle = new THREE.Mesh(salleGeo, salleMat);
  salle.position.y = 4;
  salle.renderOrder = -1;
  scene.add(salle);

  const plancherGeo = new THREE.CircleGeometry(30, 48);
  const plancherMat = new THREE.MeshBasicMaterial({ color: 0x150e08, fog: true });
  const plancher = new THREE.Mesh(plancherGeo, plancherMat);
  plancher.rotation.x = -Math.PI / 2;
  plancher.position.y = -7.4;
  plancher.renderOrder = -2;
  scene.add(plancher);

  const boisTable = new THREE.CanvasTexture(grainDeChene(512, '#3a2412', '#1b1008'));
  boisTable.wrapS = boisTable.wrapT = THREE.RepeatWrapping;
  boisTable.repeat.set(3, 3);
  boisTable.anisotropy = 8;
  boisTable.colorSpace = THREE.SRGBColorSpace;
  const tableMat = new THREE.MeshStandardMaterial({ map: boisTable, roughness: 0.7, metalness: 0.02 });
  const tableGeo = new THREE.CylinderGeometry(11.5, 12.5, 0.7, 56);
  const table = new THREE.Mesh(tableGeo, tableMat);
  // Abaissée d'un quart d'unité le 2026-08-31 : le plateau a maintenant
  // des pieds tournés, et il lui faut la place de se tenir dessus.
  table.position.y = -1.10;
  table.receiveShadow = true;
  scene.add(table);

  // ── Le madrier gravé ───────────────────────────────────────────────
  // Trois pièces de menuiserie, comme sur un vrai jeu offert : le
  // madrier gravé, la moulure qui en cerne le bord et le protège, la
  // plinthe biseautée dessous, et quatre pieds tournés au tour.
  //
  // Repères de hauteur, une fois pour toutes : le dessus de la table
  // est à -0,75 et la surface de jeu à HAUT (0,18). Tout ce qui suit
  // se répartit ces 0,93 unité.
  const cote = DEMI * 2 * CELL;
  const DESSUS_TABLE = -0.75;

  const dessusTex = dessusGrave();
  const reliefCanvas = reliefDuDessus();
  const normalesTex = carteNormales(reliefCanvas, 2.6);
  // Le même relief sert de carte de rugosité : le bois brut reste mat,
  // le fond des cupules et des sillons, poli à l'usage, prend un reflet.
  const rugositeTex = new THREE.CanvasTexture(reliefCanvas);
  rugositeTex.anisotropy = 8;

  const chantTex = new THREE.CanvasTexture(grainDeChene(512, '#5a3b20', '#2a1809', 3));
  chantTex.colorSpace = THREE.SRGBColorSpace;
  chantTex.wrapS = chantTex.wrapT = THREE.RepeatWrapping;
  chantTex.repeat.set(3, 3);
  chantTex.anisotropy = 8;

  const matDessus = new THREE.MeshStandardMaterial({
    map: dessusTex,
    normalMap: normalesTex,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap: rugositeTex,
    roughness: 0.86,
    metalness: 0.04,
  });
  const matChant = new THREE.MeshStandardMaterial({ map: chantTex, roughness: 0.78, metalness: 0.02 });

  const plateauGeo = new THREE.BoxGeometry(cote, 0.32, cote);
  // L'ordre des faces d'une boîte : +x, -x, +y, -y, +z, -z. Seul le
  // dessus porte la gravure.
  const plateau = new THREE.Mesh(plateauGeo, [
    matChant, matChant, matDessus, matChant, matChant, matChant,
  ]);
  plateau.position.y = HAUT - 0.16;
  plateau.castShadow = true;
  plateau.receiveShadow = true;
  scene.add(plateau);

  /** Un carré aux coins arrondis, en profil d'extrusion. */
  const carre = (demi: number, rayon: number): THREE.Shape => {
    const f = new THREE.Shape();
    f.moveTo(-demi + rayon, -demi);
    f.lineTo(demi - rayon, -demi);
    f.quadraticCurveTo(demi, -demi, demi, -demi + rayon);
    f.lineTo(demi, demi - rayon);
    f.quadraticCurveTo(demi, demi, demi - rayon, demi);
    f.lineTo(-demi + rayon, demi);
    f.quadraticCurveTo(-demi, demi, -demi, demi - rayon);
    f.lineTo(-demi, -demi + rayon);
    f.quadraticCurveTo(-demi, -demi, -demi + rayon, -demi);
    return f;
  };

  // La moulure : un cadre biseauté qui cerne le madrier et dépasse d'un
  // cheveu de la surface. C'est elle qui retient un pion qui roule, et
  // c'est elle qui fait la différence entre une planche et un plateau.
  const moulureForme = carre(cote / 2 + 0.55, 0.22);
  moulureForme.holes.push(new THREE.Path(carre(cote / 2 - 0.02, 0.12).getPoints(64)));
  const MOULURE_BISEAU = 0.06;
  const moulureGeo = new THREE.ExtrudeGeometry(moulureForme, {
    depth: 0.34, bevelEnabled: true, bevelThickness: MOULURE_BISEAU, bevelSize: 0.075, bevelSegments: 3, curveSegments: 8,
  });
  moulureGeo.rotateX(-Math.PI / 2);
  const moulureMat = new THREE.MeshStandardMaterial({ map: chantTex, color: 0xa2794c, roughness: 0.55, metalness: 0.03 });
  const moulure = new THREE.Mesh(moulureGeo, moulureMat);
  moulure.position.y = HAUT + 0.05 - MOULURE_BISEAU;
  moulure.castShadow = true;
  moulure.receiveShadow = true;
  scene.add(moulure);

  // La plinthe : un second biseau, plus large, qui donne son assise au
  // meuble et rattrape l'ombre sous le madrier.
  const PLINTHE_BISEAU = 0.05;
  const plintheGeo = new THREE.ExtrudeGeometry(carre(cote / 2 + 0.78, 0.28), {
    depth: 0.20, bevelEnabled: true, bevelThickness: PLINTHE_BISEAU, bevelSize: 0.09, bevelSegments: 3, curveSegments: 8,
  });
  plintheGeo.rotateX(-Math.PI / 2);
  const plintheMat = new THREE.MeshStandardMaterial({ map: chantTex, color: 0x6d4c2c, roughness: 0.82, metalness: 0.02 });
  const plinthe = new THREE.Mesh(plintheGeo, plintheMat);
  plinthe.position.y = HAUT - 0.16 - PLINTHE_BISEAU;
  plinthe.castShadow = true;
  plinthe.receiveShadow = true;
  scene.add(plinthe);

  // Quatre pieds tournés au tour, un par coin, sous la plinthe.
  const HAUTEUR_PIED = (HAUT - 0.36) - DESSUS_TABLE;
  const piedGeo = piedTourne(HAUTEUR_PIED, 0.30);
  const piedMat = new THREE.MeshStandardMaterial({ map: chantTex, color: 0x7a5530, roughness: 0.7, metalness: 0.02 });
  const ecartPied = cote / 2 - 0.35;
  for (const sx of [-1, 1] as const) {
    for (const sz of [-1, 1] as const) {
      const pied = new THREE.Mesh(piedGeo, piedMat);
      pied.position.set(sx * ecartPied, DESSUS_TABLE, sz * ecartPied);
      pied.castShadow = true;
      pied.receiveShadow = true;
      scene.add(pied);
    }
  }

  // L'ombre de contact : le disque doux qui pose le meuble sur la table
  // au lieu de le laisser flotter, sous la carte d'ombre du projecteur.
  const ombreTex = ombreDeContact(256, 0.62);
  const ombreGeo = new THREE.PlaneGeometry(cote + 3.4, cote + 3.4);
  const ombreMat = new THREE.MeshBasicMaterial({
    map: ombreTex, transparent: true, opacity: 0.85, depthWrite: false, fog: false,
  });
  const ombre = new THREE.Mesh(ombreGeo, ombreMat);
  ombre.rotation.x = -Math.PI / 2;
  ombre.position.y = DESSUS_TABLE + 0.004;
  ombre.renderOrder = 1;
  scene.add(ombre);

  // ── Les cupules ────────────────────────────────────────────────────
  // Creusées pour de vrai. La lèvre affleure la surface et recouvre le
  // bois autour du point, donc l'écuelle plonge bel et bien SOUS le
  // plan de jeu : c'est ce qu'on voit quand la caméra passe au ras.
  // Le fond, poli par mille parties, a sa propre rugosité.
  const CUP = [
    [0.00, -0.085], [0.05, -0.083], [0.12, -0.070], [0.20, -0.045],
    [0.27, -0.014], [0.305, 0.000], [0.335, 0.004],
  ] as const;
  const cupuleGeo = new THREE.LatheGeometry(
    CUP.map(([r, y]) => new THREE.Vector2(r * CELL, y)), 28,
  );
  cupuleGeo.computeVertexNormals();
  const cupuleMat = new THREE.MeshStandardMaterial({
    color: 0x7d5730, roughness: 0.34, metalness: 0.05, side: THREE.DoubleSide,
  });
  for (let p = 0; p < 24; p++) {
    const pos = positionDe(p);
    const ecuelle = new THREE.Mesh(cupuleGeo, cupuleMat);
    ecuelle.position.set(pos.x, HAUT + 0.005, pos.z);
    ecuelle.receiveShadow = true;
    scene.add(ecuelle);
  }

  // ── Les pions ──────────────────────────────────────────────────────
  const profil = PROFIL.map(([r, y]) => new THREE.Vector2(r * CELL, y * CELL));
  const pionGeo = new THREE.LatheGeometry(profil, 36);
  pionGeo.computeVertexNormals();
  const matPion: Record<Camp, THREE.MeshStandardMaterial> = {
    1: new THREE.MeshStandardMaterial({ color: TEINTES[1], roughness: 0.44, metalness: 0.05 }),
    2: new THREE.MeshStandardMaterial({ color: TEINTES[2], roughness: 0.38, metalness: 0.06 }),
  };
  const groupePions = new THREE.Group();
  scene.add(groupePions);
  /** Le pion visible à chaque point, indexé comme le plateau. */
  const pions: (THREE.Group | null)[] = Array(24).fill(null);
  /** Le point tenu en main, celui dont le pion respire. */
  let selection: number | null = null;

  // Les pions sculptés (Meshy) remplacent le tour dès qu'ils arrivent;
  // le tour reste le secours si le réseau manque. La hauteur est
  // mesurée à l'écran : Meshy rend des figurines élancées (0,77 de
  // large pour 1,9 de haut), donc une hauteur de 0,85 les réduisait à
  // des grains de riz au fond de leur cupule. À 1,5, la figurine fait
  // un pas de grille de haut, comme les pièces du hnefatafl.
  const sculptes: Partial<Record<Camp, THREE.Group>> = {};
  const habiller = (g: THREE.Group) => {
    const proto = sculptes[g.userData.camp as Camp];
    if (!proto) return;
    g.clear();
    g.add(proto.clone(true));
  };
  let vivant = true;
  ([[1, '/games/merelle/models/pion-clair.glb'], [2, '/games/merelle/models/pion-sombre.glb']] as const)
    .forEach(([camp, url]) => {
      chargerSculpture(url, HAUTEUR_PION).then((proto) => {
        if (!vivant) return;
        sculptes[camp] = proto;
        for (const g of pions) if (g && g.userData.camp === camp) habiller(g);
      }).catch((err) => console.warn('[merelle] pion sculpté indisponible', url, err));
    });

  const creerPion = (p: number, camp: Camp): THREE.Group => {
    const g = new THREE.Group();
    const pos = positionDe(p);
    g.position.copy(pos);
    g.rotation.y = Math.random() * Math.PI * 2; // le grain du bois n'est jamais aligné
    g.userData.point = p;
    g.userData.camp = camp;
    const tour = new THREE.Mesh(pionGeo, matPion[camp]);
    tour.castShadow = true;
    tour.receiveShadow = true;
    g.add(tour);
    habiller(g);
    groupePions.add(g);
    pions[p] = g;
    return g;
  };

  const detruirePion = (p: number) => {
    const m = pions[p];
    if (!m) return;
    gsap.killTweensOf(m.position);
    gsap.killTweensOf(m.scale);
    gsap.killTweensOf(m.rotation);
    groupePions.remove(m);
    pions[p] = null;
  };

  const poser = (p: number, camp: Camp, fini?: () => void) => {
    detruirePion(p);
    const m = creerPion(p, camp);
    m.position.y = HAUT + 2.6;
    m.scale.setScalar(0.9);
    gsap.to(m.position, { y: HAUT, duration: 0.52, ease: 'bounce.out', onComplete: fini });
    gsap.to(m.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: 'power2.out' });
  };

  const deplacer = (de: number, vers: number, fini?: () => void) => {
    const m = pions[de];
    if (!m) { fini?.(); return; }
    detruirePion(vers);
    pions[de] = null;
    pions[vers] = m;
    m.userData.point = vers;
    const depart = m.position.clone();
    const arrivee = positionDe(vers);
    const etat = { t: 0 };
    // Un pion qu'on déplace se soulève un peu : un glissement à plat le
    // ferait passer au travers des cupules et des autres pions.
    gsap.to(etat, {
      t: 1,
      duration: 0.45,
      ease: 'power2.inOut',
      onUpdate: () => {
        m.position.lerpVectors(depart, arrivee, etat.t);
        m.position.y = HAUT + Math.sin(etat.t * Math.PI) * 0.55;
      },
      onComplete: () => { m.position.copy(arrivee); fini?.(); },
    });
  };

  const retirer = (p: number, fini?: () => void) => {
    const m = pions[p];
    if (!m) { fini?.(); return; }
    pions[p] = null;
    gsap.to(m.rotation, { y: m.rotation.y + Math.PI * 2.2, x: 0.9, duration: 0.5, ease: 'power1.in' });
    gsap.to(m.position, { y: HAUT + 1.6, duration: 0.5, ease: 'power2.out' });
    gsap.to(m.scale, {
      x: 0.02, y: 0.02, z: 0.02, duration: 0.5, ease: 'power2.in',
      onComplete: () => { groupePions.remove(m); fini?.(); },
    });
  };

  const reinitialiser = (points: readonly (0 | 1 | 2)[]) => {
    selection = null;
    for (let p = 0; p < 24; p++) detruirePion(p);
    for (let p = 0; p < 24; p++) {
      const v = points[p];
      if (v) creerPion(p, v);
    }
  };

  // ── La surbrillance ────────────────────────────────────────────────
  const halos: THREE.Mesh[] = [];
  const haloGeo = new THREE.CircleGeometry(0.4 * CELL, 28);
  // Le pion tenu porte un anneau plus large que sa base : un disque
  // passerait entièrement sous lui et on ne verrait rien.
  const anneauGeo = new THREE.RingGeometry(0.46 * CELL, 0.62 * CELL, 32);

  const eteindre = () => {
    for (const h of halos) {
      scene.remove(h);
      (h.material as THREE.Material).dispose();
    }
    halos.length = 0;
  };

  const halo = (p: number, couleur: number, opacite: number, anneau = false) => {
    const mat = new THREE.MeshBasicMaterial({
      color: couleur, transparent: true, opacity: opacite, depthWrite: false,
    });
    const m = new THREE.Mesh(anneau ? anneauGeo : haloGeo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.copy(positionDe(p, HAUT + 0.012));
    m.userData.opacite = opacite;
    scene.add(m);
    halos.push(m);
  };

  const allumer = ({ selection: sel = null, destinations = [], retraits = [] }: {
    selection?: number | null; destinations?: number[]; retraits?: number[];
  }) => {
    eteindre();
    // Le pion qu'on lâche redescend dans sa cupule : sans ce rappel, il
    // resterait suspendu à la hauteur où la respiration l'avait laissé.
    if (selection !== null && selection !== sel) {
      const ancien = pions[selection];
      if (ancien && !gsap.isTweening(ancien.position)) ancien.position.y = HAUT;
    }
    selection = sel;
    if (sel !== null) halo(sel, 0xe8b14a, 0.72, true);
    for (const p of destinations) halo(p, 0x2ab964, 0.46);
    for (const p of retraits) halo(p, 0xc0503e, 0.6, true);
  };

  // ── Le clic ────────────────────────────────────────────────────────
  const ray = new THREE.Raycaster();
  const souris = new THREE.Vector2();
  const planJeu = new THREE.Plane(new THREE.Vector3(0, 1, 0), -HAUT);
  const impact = new THREE.Vector3();
  const TOLERANCE = 0.62 * CELL;

  const pointSous = (clientX: number, clientY: number): number | null => {
    const rect = renderer.domElement.getBoundingClientRect();
    souris.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    souris.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(souris, camera);

    // Un pion touché de plein fouet répond pour son point : sans ça, un
    // pion haut vu de biais masque sa propre cupule et le clic tombe sur
    // le point d'à côté.
    const touches = ray.intersectObjects(groupePions.children, true);
    if (touches.length > 0) {
      let o: THREE.Object3D | null = touches[0].object;
      while (o && typeof o.userData.point !== 'number') o = o.parent;
      if (o) return o.userData.point as number;
    }

    if (!ray.ray.intersectPlane(planJeu, impact)) return null;
    let meilleur: number | null = null;
    let dist = TOLERANCE;
    for (let p = 0; p < 24; p++) {
      const [x, z] = POSITIONS[p];
      const d = Math.hypot(impact.x - x * CELL, impact.z - z * CELL);
      if (d < dist) { dist = d; meilleur = p; }
    }
    return meilleur;
  };

  // ── Sonde de développement ─────────────────────────────────────────
  // Même contrat que `window.__hnef` au hnefatafl : la projection d'un
  // point vers l'écran, pour qu'un test Playwright puisse cliquer une
  // case précise. Rien n'est exposé en production.
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__merelleScene = {
      ecranDe: (p: number) => {
        const v = positionDe(p, HAUT + 0.2).project(camera);
        const rect = renderer.domElement.getBoundingClientRect();
        return {
          x: rect.left + ((v.x + 1) / 2) * rect.width,
          y: rect.top + ((1 - v.y) / 2) * rect.height,
        };
      },
      pointSous,
    };
  }

  const attacherEntrees = (surPoint: (p: number) => void): (() => void) => {
    const cible = renderer.domElement;
    let appuye = false;
    let glisse = false;
    let depart = { x: 0, y: 0 };
    let dernier = { x: 0, y: 0 };

    const debut = (x: number, y: number) => {
      appuye = true; glisse = false;
      depart = { x, y }; dernier = { x, y };
    };
    const suite = (x: number, y: number) => {
      if (!appuye) return;
      if (glisse || Math.abs(x - depart.x) > 4 || Math.abs(y - depart.y) > 4) {
        glisse = true;
        rotateOrbit(x - dernier.x, y - dernier.y);
        dernier = { x, y };
      }
    };
    const fin = () => { appuye = false; };
    const tenter = (x: number, y: number) => {
      if (glisse) return;
      const p = pointSous(x, y);
      if (p !== null) surPoint(p);
    };

    const surSourisBas = (e: MouseEvent) => debut(e.clientX, e.clientY);
    const surSourisMouv = (e: MouseEvent) => suite(e.clientX, e.clientY);
    const surSourisHaut = () => fin();
    const surClic = (e: MouseEvent) => tenter(e.clientX, e.clientY);
    const surDoigtBas = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      debut(e.touches[0].clientX, e.touches[0].clientY);
    };
    const surDoigtMouv = (e: TouchEvent) => {
      if (!appuye || e.touches.length !== 1) return;
      e.preventDefault();
      suite(e.touches[0].clientX, e.touches[0].clientY);
    };
    const surDoigtHaut = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      const bougeait = glisse;
      fin();
      if (t && !bougeait) tenter(t.clientX, t.clientY);
    };
    const surMenu = (e: Event) => e.preventDefault();

    cible.addEventListener('mousedown', surSourisBas);
    cible.addEventListener('mousemove', surSourisMouv);
    cible.addEventListener('mouseup', surSourisHaut);
    cible.addEventListener('mouseleave', surSourisHaut);
    cible.addEventListener('click', surClic);
    cible.addEventListener('touchstart', surDoigtBas, { passive: true });
    cible.addEventListener('touchmove', surDoigtMouv, { passive: false });
    cible.addEventListener('touchend', surDoigtHaut);
    cible.addEventListener('touchcancel', surDoigtHaut);
    cible.addEventListener('contextmenu', surMenu);

    return () => {
      cible.removeEventListener('mousedown', surSourisBas);
      cible.removeEventListener('mousemove', surSourisMouv);
      cible.removeEventListener('mouseup', surSourisHaut);
      cible.removeEventListener('mouseleave', surSourisHaut);
      cible.removeEventListener('click', surClic);
      cible.removeEventListener('touchstart', surDoigtBas);
      cible.removeEventListener('touchmove', surDoigtMouv);
      cible.removeEventListener('touchend', surDoigtHaut);
      cible.removeEventListener('touchcancel', surDoigtHaut);
      cible.removeEventListener('contextmenu', surMenu);
    };
  };

  // ── La boucle ──────────────────────────────────────────────────────
  const horloge = new THREE.Clock();
  let raf = 0;
  const boucle = () => {
    raf = requestAnimationFrame(boucle);
    const t = horloge.getElapsedTime();
    torcheA.intensity = 4.2 + Math.sin(t * 7.1) * 0.5 + Math.sin(t * 13.3) * 0.25;
    torcheB.intensity = 3.4 + Math.sin(t * 5.7 + 1.2) * 0.45 + Math.sin(t * 11.7) * 0.22;
    // Les halos battent lentement autour de leur opacité de repos, et le
    // pion tenu respire, pour qu'on sache lequel on a en main.
    const battement = Math.sin(t * 3.1) * 0.11;
    for (const h of halos) {
      (h.material as THREE.MeshBasicMaterial).opacity
        = Math.max(0.12, (h.userData.opacite as number) + battement);
    }
    if (selection !== null) {
      const m = pions[selection];
      if (m && !gsap.isTweening(m.position)) m.position.y = HAUT + 0.09 + Math.sin(t * 3.4) * 0.07;
    }
    renderer.render(scene, camera);
  };
  boucle();

  const dispose = () => {
    vivant = false;
    cancelAnimationFrame(raf);
    gsap.killTweensOf(groupePions.children.map((o) => o.position));
    eteindre();
    haloGeo.dispose();
    anneauGeo.dispose();
    pionGeo.dispose();
    matPion[1].dispose();
    matPion[2].dispose();
    cupuleGeo.dispose();
    cupuleMat.dispose();
    plateauGeo.dispose();
    moulureGeo.dispose();
    moulureMat.dispose();
    plintheGeo.dispose();
    plintheMat.dispose();
    piedGeo.dispose();
    piedMat.dispose();
    ombreGeo.dispose();
    ombreMat.dispose();
    ombreTex.dispose();
    matDessus.dispose();
    matChant.dispose();
    dessusTex.dispose();
    normalesTex.dispose();
    rugositeTex.dispose();
    chantTex.dispose();
    tableGeo.dispose();
    tableMat.dispose();
    boisTable.dispose();
    salleGeo.dispose();
    salleMat.dispose();
    salleTex.dispose();
    plancherGeo.dispose();
    plancherMat.dispose();
    renderer.dispose();
    if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
  };

  return {
    renderer, pointSous, poser, deplacer, retirer, reinitialiser,
    allumer, attacherEntrees, attacherResize, dispose,
  };
}
