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

/** Un pas de grille, en unités de scène. */
export const CELL = 1.5;
/** La surface du plateau : tout ce qui se pose dessus vit à cette hauteur. */
const HAUT = 0.18;
/** Du centre au bord du bois, en unités de grille. */
const DEMI = 3.6;

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
function grainDeChene(
  taille = 512, fond = '#6b4a29', veine = '#3a2412', densite = 1,
): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = taille;
  const g = c.getContext('2d')!;
  g.fillStyle = fond;
  g.fillRect(0, 0, taille, taille);
  g.strokeStyle = veine;
  // Le chêne se lit à la fréquence de ses veines. Trop peu de traits et
  // le bois tourne au carton peint (constat à l'écran, 2026-08-30).
  const traits = Math.round(150 * densite);
  for (let i = 0; i < traits; i++) {
    const x = Math.random() * taille;
    g.globalAlpha = 0.03 + Math.random() * 0.11;
    g.lineWidth = (0.5 + Math.random() * 1.6) / Math.sqrt(densite);
    g.beginPath();
    g.moveTo(x, 0);
    const amp = (3 + Math.random() * 11) / Math.sqrt(densite);
    for (let y = 0; y <= taille; y += 12) {
      g.lineTo(x + Math.sin((y / taille) * Math.PI * (1 + Math.random())) * amp, y);
    }
    g.stroke();
  }
  // Quelques nœuds : sans eux, le bois ressemble à du carton rayé.
  for (let k = 0; k < 3 * densite; k++) {
    const nx = 60 + Math.random() * (taille - 120);
    const ny = 60 + Math.random() * (taille - 120);
    const grand = (16 + Math.random() * 14) / Math.sqrt(densite);
    for (let r = grand; r > 1; r -= 1.8) {
      g.globalAlpha = 0.035 + (grand - r) * 0.009;
      g.beginPath();
      g.ellipse(nx, ny, r, r * 0.45, Math.random() * Math.PI, 0, Math.PI * 2);
      g.stroke();
    }
  }
  g.globalAlpha = 0.05;
  for (let i = 0; i < 4200 * densite; i++) {
    g.fillStyle = Math.random() > 0.5 ? '#000' : '#fff';
    g.fillRect(Math.random() * taille, Math.random() * taille, 1, 1);
  }
  g.globalAlpha = 1;
  return c;
}

/** Le dessus du plateau : le grain, les seize alignements gravés, et les
 *  vingt-quatre cupules avec leur ombre portée. */
function dessusGrave(): THREE.CanvasTexture {
  const S = 1024;
  const c = grainDeChene(S, '#7a5530', '#3a2209', 4);
  const g = c.getContext('2d')!;
  const px = (u: number) => ((u + DEMI) / (DEMI * 2)) * S;
  const R = (0.30 / (DEMI * 2)) * S; // rayon d'une cupule, en pixels

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
  // lumière. C'est ce décalage d'un pixel ou deux qui fait creux.
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
    grad.addColorStop(0, 'rgba(18,10,3,0.92)');
    grad.addColorStop(0.8, 'rgba(52,32,15,0.8)');
    grad.addColorStop(1, 'rgba(86,60,32,0.55)');
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
  const FIT_R = 17.4;
  const rayonUtile = (aspect: number) =>
    (aspect >= 1 ? FIT_R : FIT_R / Math.pow(Math.max(aspect, 0.35), 0.75));

  let camR = FIT_R;
  let theta = 0;
  let phi = 0.66;

  const majCam = () => {
    camera.position.set(
      camR * Math.sin(phi) * Math.sin(theta),
      camR * Math.cos(phi),
      camR * Math.sin(phi) * Math.cos(theta),
    );
    camera.lookAt(0, -0.4, 0);
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
  table.position.y = -0.85;
  table.receiveShadow = true;
  scene.add(table);

  // ── Le madrier gravé ───────────────────────────────────────────────
  const cote = DEMI * 2 * CELL;
  const dessusTex = dessusGrave();
  const chantTex = new THREE.CanvasTexture(grainDeChene(256, '#5a3b20', '#2a1809', 3));
  chantTex.colorSpace = THREE.SRGBColorSpace;
  chantTex.anisotropy = 4;
  const matDessus = new THREE.MeshStandardMaterial({ map: dessusTex, roughness: 0.62, metalness: 0.03 });
  const matChant = new THREE.MeshStandardMaterial({ map: chantTex, roughness: 0.78, metalness: 0.02 });
  const plateauGeo = new THREE.BoxGeometry(cote, 0.36, cote);
  // L'ordre des faces d'une boîte : +x, -x, +y, -y, +z, -z. Seul le
  // dessus porte la gravure.
  const plateau = new THREE.Mesh(plateauGeo, [
    matChant, matChant, matDessus, matChant, matChant, matChant,
  ]);
  plateau.position.y = HAUT - 0.18;
  plateau.castShadow = true;
  plateau.receiveShadow = true;
  scene.add(plateau);

  // Un socle en retrait donne au madrier son épaisseur et sa mouluration.
  const socleGeo = new THREE.BoxGeometry(cote + 0.8, 0.34, cote + 0.8);
  const socleMat = new THREE.MeshStandardMaterial({ map: chantTex, color: 0x6d4c2c, roughness: 0.82, metalness: 0.02 });
  const socle = new THREE.Mesh(socleGeo, socleMat);
  socle.position.y = HAUT - 0.5;
  socle.castShadow = true;
  socle.receiveShadow = true;
  scene.add(socle);

  // ── Les cupules ────────────────────────────────────────────────────
  // Creusées pour de vrai : la peinture donne l'ombre, la géométrie
  // donne le relief quand la caméra passe au ras du bois.
  const cupuleGeo = new THREE.CylinderGeometry(0.33 * CELL, 0.28 * CELL, 0.07, 24, 1, true);
  const cupuleFondGeo = new THREE.CircleGeometry(0.28 * CELL, 24);
  const cupuleMat = new THREE.MeshStandardMaterial({ color: 0x3a2410, roughness: 0.85, metalness: 0.02, side: THREE.DoubleSide });
  for (let p = 0; p < 24; p++) {
    const pos = positionDe(p);
    const paroi = new THREE.Mesh(cupuleGeo, cupuleMat);
    paroi.position.set(pos.x, HAUT - 0.035, pos.z);
    paroi.receiveShadow = true;
    scene.add(paroi);
    const fond = new THREE.Mesh(cupuleFondGeo, cupuleMat);
    fond.rotation.x = -Math.PI / 2;
    fond.position.set(pos.x, HAUT - 0.068, pos.z);
    fond.receiveShadow = true;
    scene.add(fond);
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
  const pions: (THREE.Mesh | null)[] = Array(24).fill(null);
  /** Le point tenu en main, celui dont le pion respire. */
  let selection: number | null = null;

  const creerPion = (p: number, camp: Camp): THREE.Mesh => {
    const m = new THREE.Mesh(pionGeo, matPion[camp]);
    const pos = positionDe(p);
    m.position.copy(pos);
    m.rotation.y = Math.random() * Math.PI * 2; // le grain du bois n'est jamais aligné
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.point = p;
    groupePions.add(m);
    pions[p] = m;
    return m;
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
    const touches = ray.intersectObjects(groupePions.children, false);
    if (touches.length > 0) {
      const p = touches[0].object.userData.point;
      if (typeof p === 'number') return p;
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
    cancelAnimationFrame(raf);
    gsap.killTweensOf(groupePions.children.map((o) => o.position));
    eteindre();
    haloGeo.dispose();
    anneauGeo.dispose();
    pionGeo.dispose();
    matPion[1].dispose();
    matPion[2].dispose();
    cupuleGeo.dispose();
    cupuleFondGeo.dispose();
    cupuleMat.dispose();
    plateauGeo.dispose();
    socleGeo.dispose();
    socleMat.dispose();
    matDessus.dispose();
    matChant.dispose();
    dessusTex.dispose();
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
