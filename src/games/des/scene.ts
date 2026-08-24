// ─── La table des dés ───────────────────────────────────────────────
// Three.js pur : une table de taverne, un gobelet de cuir par joueur,
// des dés de bois taillés dans des faces peintes au canevas. Aucun
// fichier à télécharger : le bois, les points et le son sont fabriqués
// à l'exécution.

import * as THREE from 'three';
import { emblemePret, parures } from './skins';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Face } from './regles';

/** Les textures gravées pour le jeu, servies depuis /public/jeux/des/. */
const TEXTURES = {
  table: '/jeux/des/table-bois.webp',
  cuir: '/jeux/des/cuir-gobelet.webp',
  de: '/jeux/des/de-rouge.webp',
};

const chargeur = new THREE.TextureLoader();

/** Les convives peints, un par place, dans le registre des portraits
 *  de Thronebreaker (Alex, 2026-08-23). Six visages différents pour
 *  que deux joueurs ne se ressemblent jamais dans la même partie. */
const CONVIVES = [
  '/jeux/des/convives/bourreau.webp',
  '/jeux/des/convives/dame.webp',
  '/jeux/des/convives/meunier.webp',
  '/jeux/des/convives/moine.webp',
  '/jeux/des/convives/taverniere.webp',
  '/jeux/des/convives/colporteur.webp',
];

/**
 * Charge une texture peinte, et garde le repli fabriqué au canevas si
 * le fichier manque : le jeu ne doit jamais s'ouvrir sur du gris.
 */
function texturePeinte(url: string, repli: THREE.CanvasTexture, repeat = 1): THREE.Texture {
  const t = chargeur.load(url, undefined, undefined, () => { /* repli déjà en place */ });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  return repli && !url ? repli : t;
}

export interface TableDes {
  monter: (el: HTMLElement) => void;
  demonter: () => void;
  /** Place les gobelets selon le nombre de joueurs. */
  disposer: (nb: number) => void;
  /** Lance les dés du joueur humain, puis les pose sur leurs faces. */
  lancer: (faces: Face[], onFini?: () => void) => void;
  /** Montre ou cache les dés des autres au dévoilement. */
  devoiler: (mains: Face[][], montrer: boolean) => void;
  /** Le gobelet du joueur dont c'est le tour se soulève, sous la douche
   *  de lumière qui le suit autour de la table. */
  designer: (index: number) => void;
  /** Les gobelets des autres frissonnent sur la table, dés cachés. */
  remuer: (indices: number[]) => void;
  /** Un dé s'efface en fumée devant la place indiquée. */
  perdreUnDe: (index: number) => void;
  /** Un dé revient sur la table, pour un « exactement ça » réussi. */
  reprendreUnDe: (index: number) => void;
  /** Combien de dés chacun tient encore, pour la mise en place. */
  mains: (comptes: number[]) => void;
  /** Où poser les bulles de dialogue, en pourcentage de l'écran. */
  ancres: () => Array<{ x: number; y: number }>;
}

// ── Le bois, peint une fois pour toutes ─────────────────────────────
function boisTexture(teinte: string, veine: string, taille = 1024): THREE.CanvasTexture {
  // Un vrai plateau de taverne : des planches assemblées, des veines
  // qui suivent la longueur, des nœuds, et des joints sombres entre
  // les lames (Alex, 2026-08-23 : « la table doit être en bois »,
  // registre des tables de Thronebreaker).
  const c = document.createElement('canvas');
  c.width = c.height = taille;
  const g = c.getContext('2d')!;
  g.fillStyle = teinte;
  g.fillRect(0, 0, taille, taille);

  const lames = 7;
  const h = taille / lames;
  for (let l = 0; l < lames; l++) {
    const y0 = l * h;
    // Chaque lame a sa propre teinte : le bois n'est jamais uniforme.
    const ton = 0.86 + Math.random() * 0.3;
    g.save();
    g.beginPath();
    g.rect(0, y0, taille, h);
    g.clip();
    g.globalAlpha = 0.5;
    g.fillStyle = veine;
    g.globalCompositeOperation = 'overlay';
    g.fillStyle = `rgba(255,235,205,${(ton - 0.86) * 0.5})`;
    g.fillRect(0, y0, taille, h);
    g.globalCompositeOperation = 'source-over';

    // Les veines, couchées dans le sens de la lame.
    for (let i = 0; i < 34; i++) {
      const y = y0 + Math.random() * h;
      g.globalAlpha = 0.05 + Math.random() * 0.16;
      g.strokeStyle = veine;
      g.lineWidth = 0.5 + Math.random() * 2.6;
      g.beginPath();
      g.moveTo(0, y);
      const amp = 1.5 + Math.random() * 5;
      for (let x = 0; x <= taille; x += 18) {
        g.lineTo(x, y + Math.sin((x / taille) * Math.PI * (1 + Math.random() * 2)) * amp);
      }
      g.stroke();
    }

    // Un nœud de temps en temps, avec ses cernes.
    if (Math.random() > 0.45) {
      const nx = Math.random() * taille;
      const ny = y0 + h * (0.3 + Math.random() * 0.4);
      for (let r = 2; r < 26; r += 2.4) {
        g.globalAlpha = 0.1 + Math.random() * 0.13;
        g.strokeStyle = veine;
        g.lineWidth = 1.1;
        g.beginPath();
        g.ellipse(nx, ny, r * 1.6, r, 0, 0, Math.PI * 2);
        g.stroke();
      }
    }
    g.restore();

    // Le joint entre deux lames.
    g.globalAlpha = 0.55;
    g.fillStyle = 'rgba(0,0,0,0.75)';
    g.fillRect(0, y0 - 1, taille, 2.4);
    g.globalAlpha = 0.16;
    g.fillStyle = 'rgba(255,225,190,0.6)';
    g.fillRect(0, y0 + 1.6, taille, 1.2);
  }

  // Usure et poussière.
  g.globalAlpha = 0.045;
  for (let i = 0; i < 6000; i++) {
    g.fillStyle = Math.random() > 0.5 ? '#000' : '#fff';
    g.fillRect(Math.random() * taille, Math.random() * taille, 1.4, 1.4);
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// ── Une face de dé : os clair, points creusés ───────────────────────
const POINTS: Record<number, Array<[number, number]>> = {
  1: [[0.5, 0.5]],
  2: [[0.28, 0.28], [0.72, 0.72]],
  3: [[0.26, 0.26], [0.5, 0.5], [0.74, 0.74]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.26, 0.26], [0.74, 0.26], [0.5, 0.5], [0.26, 0.74], [0.74, 0.74]],
  6: [[0.28, 0.22], [0.72, 0.22], [0.28, 0.5], [0.72, 0.5], [0.28, 0.78], [0.72, 0.78]],
};

function faceTexture(n: number): THREE.CanvasTexture {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  // Rouge sang écaillé, points d'os creusés : le registre des dés de
  // Davy Jones, référence donnée par Alex le 2026-08-23. La peinture
  // est vieille, le corps dessous est pâle, et les creux gardent la
  // crasse des tables.
  g.fillStyle = '#7b2018';
  g.fillRect(0, 0, s, s);
  // Marbrures de la peinture.
  for (let i = 0; i < 40; i++) {
    g.globalAlpha = 0.05 + Math.random() * 0.14;
    g.fillStyle = Math.random() > 0.5 ? '#4d1009' : '#a4392a';
    const rx = Math.random() * s;
    const ry = Math.random() * s;
    g.beginPath();
    g.ellipse(rx, ry, 12 + Math.random() * 60, 8 + Math.random() * 40, Math.random() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  // Éclats : la peinture partie laisse voir l'os.
  for (let i = 0; i < 26; i++) {
    g.globalAlpha = 0.14 + Math.random() * 0.3;
    g.fillStyle = '#d8c6a4';
    const rx = Math.random() * s;
    const ry = Math.random() * s;
    g.beginPath();
    g.moveTo(rx, ry);
    for (let k = 0; k < 6; k++) {
      g.lineTo(rx + (Math.random() - 0.5) * 34, ry + (Math.random() - 0.5) * 30);
    }
    g.closePath();
    g.fill();
  }
  // Griffures et crasse.
  g.globalAlpha = 0.09;
  for (let i = 0; i < 1800; i++) {
    g.fillStyle = Math.random() > 0.6 ? '#1a0805' : '#e4d3b0';
    g.fillRect(Math.random() * s, Math.random() * s, 1.6, 1.6);
  }
  g.globalAlpha = 1;
  const grad = g.createRadialGradient(s / 2, s / 2, s * 0.22, s / 2, s / 2, s * 0.78);
  grad.addColorStop(0, 'rgba(255,190,150,0.10)');
  grad.addColorStop(1, 'rgba(28,6,4,0.5)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  // La face du un peut porter un emblème gravé à la place du point :
  // le chevalier du festival ou le sceau du Salon (Alex, 2026-08-23).
  const embleme = n === 1 ? emblemePret(parures.de) : null;
  if (embleme) {
    const large = s * 0.62;
    const haut = large * (embleme.height / embleme.width);
    const px = (s - large) / 2;
    const py = (s - haut) / 2;
    // Le creux d'abord, décalé vers le bas à droite.
    g.globalAlpha = 0.7;
    g.filter = 'brightness(0)';
    g.drawImage(embleme, px + s * 0.016, py + s * 0.02, large, haut);
    g.filter = 'none';
    // La matière d'os, puis le liseré lumineux en haut à gauche.
    g.globalAlpha = 1;
    g.filter = 'sepia(1) saturate(0.35) brightness(1.32)';
    g.drawImage(embleme, px, py, large, haut);
    g.filter = 'brightness(1.9)';
    g.globalAlpha = 0.45;
    g.drawImage(embleme, px - s * 0.006, py - s * 0.007, large, haut);
    g.filter = 'none';
    g.globalAlpha = 1;
    const tSeul = new THREE.CanvasTexture(c);
    tSeul.anisotropy = 8;
    return tSeul;
  }

  // Les points : des cuvettes d'os, un bord lumineux en haut à gauche
  // et une ombre portée en bas à droite, comme sur la photo.
  for (const [x, y] of POINTS[n]) {
    const r = n === 1 ? s * 0.108 : s * 0.076;
    const cx = x * s;
    const cy = y * s;
    g.beginPath();
    g.arc(cx + r * 0.1, cy + r * 0.12, r * 1.02, 0, Math.PI * 2);
    g.fillStyle = 'rgba(20,6,4,0.55)';
    g.fill();
    const creux = g.createRadialGradient(cx - r * 0.34, cy - r * 0.36, r * 0.1, cx, cy, r);
    creux.addColorStop(0, '#f4ecd8');
    creux.addColorStop(0.55, '#d3c3a2');
    creux.addColorStop(1, '#8d7c5e');
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fillStyle = creux;
    g.fill();
    g.beginPath();
    g.arc(cx, cy, r, Math.PI * 0.95, Math.PI * 1.85);
    g.strokeStyle = 'rgba(255,250,235,0.6)';
    g.lineWidth = 1.6;
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
}

// L'ordre des matériaux d'un BoxGeometry : +X, -X, +Y, -Y, +Z, -Z.
// On pose 3, 4, 5, 2, 1, 6 : les faces opposées font sept, comme un
// vrai dé.
const ORDRE_FACES = [3, 4, 5, 2, 1, 6];

// Rotation à donner au dé pour amener une face vers le ciel.
const VERS_LE_CIEL: Record<Face, [number, number, number]> = {
  1: [Math.PI / 2, 0, 0],
  2: [Math.PI, 0, 0],
  3: [0, 0, Math.PI / 2],
  4: [0, 0, -Math.PI / 2],
  5: [0, 0, 0],
  6: [-Math.PI / 2, 0, 0],
};

/** Pose un dé à plat sur la planche, la bonne face au ciel. Le tour
 *  aléatoire se fait autour de l'axe Y du MONDE : sur les angles
 *  d'Euler il faisait basculer le dé sur une face voisine, et parfois
 *  le laissait en suspens (Alex, 2026-08-23). */
/** La courbe d'un dé qui tombe et rebondit deux fois : une grande arche,
 *  puis deux plus petites, chacune écrasée par la précédente. */
const CHUTE_MS = 1250;
function hauteurRebond(k: number, h0: number): number {
  // Avant son tour, le dé attend en haut, dans le gobelet : sans cela il
  // se posait sur la planche puis sautait d'un coup.
  if (k <= 0) return h0;
  const arches: Array<[number, number, number]> = [
    [0, 0.52, 1],        // début, fin, hauteur relative
    [0.52, 0.80, 0.34],
    [0.80, 1, 0.11],
  ];
  for (const [a, b, h] of arches) {
    if (k >= a && k < b) {
      const u = (k - a) / (b - a);
      // Une demi-sinusoïde donne l'arche; la première commence en haut.
      const arc = a === 0 ? Math.cos(u * (Math.PI / 2)) : Math.sin(u * Math.PI);
      return h0 * h * arc;
    }
  }
  return 0;
}

const AXE_Y = new THREE.Vector3(0, 1, 0);
function poserLeDe(de: THREE.Object3D, face: Face, hauteur = 0.29): void {
  const [rx, ry, rz] = VERS_LE_CIEL[face];
  de.rotation.set(rx, ry, rz);
  de.rotateOnWorldAxis(AXE_Y, Math.random() * Math.PI * 2);
  de.position.y = hauteur;
}


// ── Le son, fabriqué au vol ─────────────────────────────────────────
function fabriquerSon() {
  let ctx: AudioContext | null = null;
  const ouvrir = () => {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return ctx;
  };
  // Un dé de bois qui touche une planche ne claque pas, il TOQUE : un
  // coup mat, une résonance basse, presque pas d'aigus (Alex,
  // 2026-08-23 : « des sons de dés dans le bois, plus ronds »).
  const clac = (t: number, gain = 0.16) => {
    const a = ouvrir();
    const depart = a.currentTime + t;

    // Le grain du choc, coupé haut : ce qui reste est le bois.
    const duree = 0.09;
    const buf = a.createBuffer(1, Math.floor(a.sampleRate * duree), a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3.2);
    }
    const src = a.createBufferSource();
    src.buffer = buf;
    const passeBas = a.createBiquadFilter();
    passeBas.type = 'lowpass';
    passeBas.frequency.value = 520 + Math.random() * 260;
    passeBas.Q.value = 0.7;
    const corps = a.createBiquadFilter();
    corps.type = 'peaking';
    corps.frequency.value = 210 + Math.random() * 90;
    corps.gain.value = 7;
    corps.Q.value = 1.1;
    const vol = a.createGain();
    vol.gain.setValueAtTime(gain, depart);
    vol.gain.exponentialRampToValueAtTime(0.0001, depart + duree);
    src.connect(passeBas).connect(corps).connect(vol).connect(a.destination);
    src.start(depart);

    // La résonance de la lame de bois, deux partiels amortis.
    [168 + Math.random() * 60, 262 + Math.random() * 80].forEach((f, i) => {
      const osc = a.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, depart);
      osc.frequency.exponentialRampToValueAtTime(f * 0.86, depart + 0.16);
      const g2 = a.createGain();
      g2.gain.setValueAtTime(gain * (i === 0 ? 0.7 : 0.34), depart);
      g2.gain.exponentialRampToValueAtTime(0.0001, depart + 0.2 + i * 0.05);
      osc.connect(g2).connect(a.destination);
      osc.start(depart);
      osc.stop(depart + 0.3);
    });
  };
  return {
    /** Le bruit des dés secoués dans le gobelet de cuir : sourd. */
    secouer() {
      for (let i = 0; i < 12; i++) clac(i * 0.062 + Math.random() * 0.035, 0.07 + Math.random() * 0.05);
    },
    /** Les dés qui tombent sur la planche. */
    tomber() {
      for (let i = 0; i < 6; i++) clac(0.035 * i + Math.random() * 0.06, 0.17);
    },
    /** Le frisson du gobelet retourné : deux dés qui s'entrechoquent. */
    frisson() {
      clac(0, 0.06);
      clac(0.045 + Math.random() * 0.03, 0.045);
    },
    /** Un dé qui s'en va : un toc grave, puis plus rien. */
    perdre() {
      clac(0, 0.2);
      clac(0.09, 0.1);
    },
  };
}

export function creerTable(): TableDes {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0506);
  scene.fog = new THREE.Fog(0x0d0906, 27, 60);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 140);
  camera.position.set(0, 14, 15);
  camera.lookAt(0, 0, -0.2);

  // `preserveDrawingBuffer` garde l'image lisible après le rendu : ça
  // permet de capturer la table (vérification à l'œil, et le joueur
  // peut faire sa propre capture d'écran).
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Éclairage physique : les matériaux réagissent à la lumière comme
  // dans un moteur de jeu, et le rendu passe par une courbe de film
  // plutôt que par un simple écrasement des hautes lumières.
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  // ── La salle autour de la table ───────────────────────────────────
  // La table flottait dans le noir. La même taverne que le jeu de tafl
  // l'entoure maintenant, enroulée sur un cylindre ouvert vers
  // l'intérieur : un seul décor, deux jeux (Alex, 2026-08-23).
  const salleTex = chargeur.load('/scenes/taverne-salle.jpg', (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.x = 3;
  });
  const salle = new THREE.Mesh(
    new THREE.CylinderGeometry(26, 26, 20, 48, 1, true),
    new THREE.MeshBasicMaterial({
      map: salleTex, side: THREE.BackSide, fog: true, depthWrite: false,
      color: 0x5f5142,        // en retrait : la table reste le sujet
    }),
  );
  salle.position.y = 4;
  salle.renderOrder = -1;
  scene.add(salle);

  // Le cylindre de la salle était ouvert par en bas : son cerclage
  // dessinait un grand disque gris autour de la table (Alex,
  // 2026-08-23). Un plancher de taverne le referme, et la brume avale
  // tout ce qui dépasse du plateau.
  const plancher = new THREE.Mesh(
    new THREE.CircleGeometry(26, 48),
    new THREE.MeshBasicMaterial({ color: 0x140d08, fog: true }),
  );
  plancher.rotation.x = -Math.PI / 2;
  plancher.position.y = -5.98;
  plancher.renderOrder = -2;
  scene.add(plancher);

  // ── La table ──────────────────────────────────────────────────────
  const bois = texturePeinte(TEXTURES.table, boisTexture('#3a2412', '#1c1108'), 1);
  // Le plateau est en bois d'un bord à l'autre : aucun drap, aucun
  // cercle au centre (Alex, 2026-08-23).
  const dessus = new THREE.MeshStandardMaterial({
    map: bois, roughness: 0.68, metalness: 0.02,
  });
  const tranche = new THREE.MeshStandardMaterial({
    map: bois, roughness: 0.82, metalness: 0.02, color: 0xb08a5e,
  });
  // Le dessous de la table débordait en disque clair autour du plateau
  // (Alex, 2026-08-23). Il passe en bois presque noir, et le plateau
  // s'épaissit pour qu'on ne le voie plus depuis la caméra.
  const dessous = new THREE.MeshStandardMaterial({ color: 0x120b06, roughness: 0.95 });
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(6.2, 6.05, 0.9, 64),
    [tranche, dessus, dessous],
  );
  table.position.y = -0.45;
  table.receiveShadow = true;
  scene.add(table);

  // La parure de table pose un emblème brûlé dans le chêne, au centre
  // du plateau (Alex, 2026-08-23 : « comme si c'était gravé dans le
  // bois »). Un disque très mince flotte d'un cheveu au-dessus des
  // planches et se mélange en multiplication, donc le grain du bois
  // continue de passer au travers.
  const embTable = emblemePret(parures.table);
  if (embTable) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 1024;
    const g = cv.getContext('2d')!;
    // La toile reste transparente : seule la silhouette assombrit le
    // bois. Un fond blanc en multiplication délavait tout le plateau.
    const large = 600;
    const haut = large * (embTable.height / embTable.width);
    g.filter = 'brightness(0)';
    g.globalAlpha = 1;
    g.drawImage(embTable, (1024 - large) / 2, (1024 - haut) / 2, large, haut);
    g.filter = 'none';
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const decalque = new THREE.Mesh(
      new THREE.CircleGeometry(4.8, 64),
      new THREE.MeshBasicMaterial({
        map: tex, transparent: true, opacity: 0.6, depthWrite: false,
      }),
    );
    decalque.rotation.x = -Math.PI / 2;
    decalque.position.y = 0.004;
    scene.add(decalque);
  }

  // ── Lumières de taverne ───────────────────────────────────────────
  // Une salle basse éclairée à la chandelle : presque pas d'ambiante,
  // un rebond chaud du plancher, une flamme au-dessus de la table et
  // une braise au fond. Tout porte une ombre.
  scene.add(new THREE.AmbientLight(0xffd2a0, 0.22));
  scene.add(new THREE.HemisphereLight(0xffc98a, 0x1a0d07, 0.6));

  const chandelle = new THREE.PointLight(0xffb066, 90, 44, 2);
  chandelle.position.set(0, 5.4, 0.8);
  chandelle.castShadow = true;
  chandelle.shadow.mapSize.set(1024, 1024);
  chandelle.shadow.bias = -0.0016;
  chandelle.shadow.radius = 3;
  scene.add(chandelle);

  const braise = new THREE.PointLight(0xc4471f, 40, 26, 2);
  braise.position.set(-4.6, 1.9, -3.4);
  scene.add(braise);

  // Un contre-jour froid par la fenêtre, pour détacher les silhouettes.
  const fenetre = new THREE.DirectionalLight(0x8fa6c8, 0.35);
  fenetre.position.set(-7, 6, -8);
  scene.add(fenetre);

  // ── La douche de lumière ──────────────────────────────────────────
  // Elle tombe sur la place de celui dont c'est le tour, et glisse d'un
  // siège à l'autre (Alex, 2026-08-23). Un cône translucide rend le
  // faisceau visible dans la poussière de la salle.
  const projecteur = new THREE.SpotLight(0xffd9a0, 0, 26, Math.PI / 7.2, 0.72, 1.6);
  projecteur.position.set(0, 7.4, 2.6);
  projecteur.castShadow = true;
  projecteur.shadow.mapSize.set(2048, 2048);
  projecteur.shadow.bias = -0.0014;
  projecteur.shadow.radius = 4;
  scene.add(projecteur);
  const cible = new THREE.Object3D();
  cible.position.set(0, 0, 2.6);
  scene.add(cible);
  projecteur.target = cible;

  // Où la douche doit aller, et où elle est rendue.
  const viseeVoulue = new THREE.Vector3(0, 0, 2.6);
  const visee = viseeVoulue.clone();

  // ── Les gobelets ──────────────────────────────────────────────────
  const cuir = texturePeinte(TEXTURES.cuir, boisTexture('#2a1712', '#120a07', 256), 2);
  const gobelets: THREE.Mesh[] = [];
  // Un vrai gobelet de cuir a une paroi : on le tourne au tour, profil
  // à la main, plutôt que de plier un cylindre sur lui-même (Alex,
  // 2026-08-23). Le profil monte à l'extérieur, passe le bourrelet, et
  // redescend à l'intérieur jusqu'au fond.
  const HAUT = 1.35;
  const PAROI = 0.075;
  const profil: THREE.Vector2[] = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.52, 0),
    new THREE.Vector2(0.545, 0.06),
    new THREE.Vector2(0.63, HAUT * 0.55),
    new THREE.Vector2(0.70, HAUT - 0.06),
    new THREE.Vector2(0.715, HAUT),                    // le bourrelet
    new THREE.Vector2(0.715 - PAROI, HAUT - 0.015),
    new THREE.Vector2(0.63 - PAROI, HAUT * 0.55),
    new THREE.Vector2(0.545 - PAROI, 0.10),
    new THREE.Vector2(0.50 - PAROI, 0.085),
    new THREE.Vector2(0, 0.085),                       // le fond, épais
  ];
  const geoGobelet = new THREE.LatheGeometry(profil, 40);
  geoGobelet.computeVertexNormals();
  const matGobelet = new THREE.MeshStandardMaterial({
    map: cuir, roughness: 0.74, metalness: 0.06, side: THREE.DoubleSide,
  });
  const faireGobelet = () => {
    const g = new THREE.Mesh(geoGobelet, matGobelet);
    g.castShadow = true;
    g.receiveShadow = true;
    const grp = new THREE.Group();
    grp.add(g);
    return grp as unknown as THREE.Mesh;
  };

  // ── Les dés ───────────────────────────────────────────────────────
  const materiaux = ORDRE_FACES.map((n) =>
    new THREE.MeshStandardMaterial({
      map: faceTexture(n), roughness: 0.44, metalness: 0.03,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }));
  // Les coins sont adoucis : un dé de bois tourné à la main n'a jamais
  // d'arête vive (Alex, 2026-08-23). Le corps arrondi porte le bois,
  // et six plaques minces portent les faces gravées.
  const DE = 0.58;            // un dé qui se lit depuis la caméra
  const geoCorps = new RoundedBoxGeometry(DE, DE, DE, 4, DE * 0.16);
  const peauDe = texturePeinte(TEXTURES.de, faceTexture(1), 1);
  const matCorps = new THREE.MeshStandardMaterial({
    map: peauDe, roughness: 0.46, metalness: 0.04,
  });
  // Les faces se posent JUSTE au-dessus du corps arrondi : plus loin
  // elles décollent, plus près elles disparaissent dans le bois.
  const F = DE * 0.72;
  const D = DE / 2 + 0.004;
  const geoFace = new THREE.PlaneGeometry(F, F);
  const POSES: Array<[THREE.Vector3, THREE.Euler]> = [
    [new THREE.Vector3(D, 0, 0), new THREE.Euler(0, Math.PI / 2, 0)],
    [new THREE.Vector3(-D, 0, 0), new THREE.Euler(0, -Math.PI / 2, 0)],
    [new THREE.Vector3(0, D, 0), new THREE.Euler(-Math.PI / 2, 0, 0)],
    [new THREE.Vector3(0, -D, 0), new THREE.Euler(Math.PI / 2, 0, 0)],
    [new THREE.Vector3(0, 0, D), new THREE.Euler(0, 0, 0)],
    [new THREE.Vector3(0, 0, -D), new THREE.Euler(0, Math.PI, 0)],
  ];
  const faireDe = () => {
    const grp = new THREE.Group();
    const corps = new THREE.Mesh(geoCorps, matCorps);
    // Aucune ombre portée par les dés : la carte d'ombre les rendait en
    // carrés noirs sur la planche (Alex, 2026-08-23).
    corps.castShadow = false;
    corps.receiveShadow = false;
    grp.add(corps);
    POSES.forEach(([pos, rot], i) => {
      const f = new THREE.Mesh(geoFace, materiaux[i]);
      f.position.copy(pos);
      f.rotation.copy(rot);
      grp.add(f);
    });
    return grp as unknown as THREE.Mesh;
  };

  const mesDes: THREE.Mesh[] = [];
  const desAdverses: THREE.Mesh[][] = [];
  const son = fabriquerSon();

  const groupe = new THREE.Group();
  scene.add(groupe);

  // Anneau de places : le joueur humain est toujours devant.
  const places = (nb: number) => {
    const out: Array<{ x: number; z: number; a: number }> = [];
    for (let i = 0; i < nb; i++) {
      const a = Math.PI / 2 + (i / nb) * Math.PI * 2;
      out.push({ x: Math.cos(a) * 3.7, z: Math.sin(a) * 3.7, a });
    }
    return out;
  };

  let anim: number | null = null;
  let vivant = true;
  const tumbling: Array<{
    de: THREE.Mesh; jusqua: number; cible: Face; depart: number;
    arrivee?: THREE.Vector3;
  }> = [];
  // Les dés qui tombent du gobelet levé : chacun garde son point de
  // départ, son point d'arrivée et sa face (Alex, 2026-08-23 : « les
  // dés tombent du verre, ils rebondissent en tournant »).
  const chute: Array<{
    de: THREE.Mesh; cible: Face; depart: number;
    x0: number; z0: number; x1: number; z1: number;
    h0: number; axe: THREE.Vector3; tours: number;
  }> = [];
  const sieges: Array<{ x: number; z: number }> = [];
  const convives: THREE.Mesh[] = [];

  // Le geste complet d'un joueur : il brasse, il retourne le gobelet
  // sur la table, puis il le soulève (Alex, 2026-08-23).
  type Geste = {
    debut: number;
    // 'secoue' et 'jette' pour ma main : je brasse, puis les dés
    // roulent sur la table et le gobelet se range à côté.
    // 'remue' pour les autres : leur gobelet reste retourné sur la
    // planche et frissonne, on entend les dés dedans (Alex, 2026-08-23).
    phase: 'remue' | 'leve' | 'pose';
    base: THREE.Vector3;
    prochainBruit?: number;
  };
  const gestes = new Map<number, Geste>();
  const POSE_Y = 0.02;         // le gobelet debout, posé sur la planche
  const RENVERSE_Y = 0.02;     // retourné, son bourrelet sur le bois

  let intensiteVoulue = 0;

  /** Coupe court aux dés qui s'envolent : au brassage suivant, plus
   *  rien ne flotte au-dessus de la table (Alex, 2026-08-23). */
  const calmer = () => {
    tumbling.length = 0;
    chute.length = 0;
  };

  const boucle = () => {
    if (!vivant) return;
    anim = requestAnimationFrame(boucle);
    const t = performance.now();
    // Flamme de chandelle
    // La flamme respire : la salle bouge avec elle.
    chandelle.intensity = 88 + Math.sin(t / 190) * 9 + Math.sin(t / 77) * 4;
    braise.intensity = 38 + Math.sin(t / 260) * 5;
    // Dés en vol
    for (let i = tumbling.length - 1; i >= 0; i--) {
      const d = tumbling[i];
      const k = (t - d.depart) / (d.jusqua - d.depart);
      if (k >= 1) {
        poserLeDe(d.de, d.cible);
        if (d.arrivee) d.de.position.copy(d.arrivee);
        d.de.position.y = DE / 2;
        tumbling.splice(i, 1);
        continue;
      }
      if (d.arrivee) {
        d.de.position.x += (d.arrivee.x - d.de.position.x) * 0.12;
        d.de.position.z += (d.arrivee.z - d.de.position.z) * 0.12;
      }
      d.de.rotation.x += 0.34;
      d.de.rotation.y += 0.27;
      d.de.rotation.z += 0.19;
      d.de.position.y = DE / 2 + Math.abs(Math.sin(k * Math.PI * 2.2)) * (1 - k) * 1.5;
    }
    // Les gobelets : brassage, renversement, levée.
    gestes.forEach((g, idx) => {
      const gob = gobelets[idx];
      if (!gob) return;
      const duree = 620;
      const k = (t - g.debut) / duree;
      const doux = Math.min(1, Math.max(0, k));
      const cote = g.base.x >= 0 ? 1 : -1;

      if (g.phase === 'remue') {
        // Le frisson dure le temps d'un brassage, puis le gobelet se
        // repose : il ne vibre plus jusqu'à la fin des temps.
        if (t - g.debut > 2200) {
          gob.rotation.set(Math.PI, 0, 0);
          gob.position.set(g.base.x, RENVERSE_Y + HAUT, g.base.z);
          g.phase = 'pose';
          g.debut = t;
          return;
        }
        // Retourné sur la planche, il frissonne de gauche à droite et
        // les dés cliquettent dedans.
        gob.rotation.set(Math.PI, 0, Math.sin(t / 46) * 0.16);
        gob.position.set(
          g.base.x + Math.sin(t / 44) * 0.18,
          RENVERSE_Y + HAUT,
          g.base.z + Math.cos(t / 61) * 0.05,
        );
        if (!g.prochainBruit || t > g.prochainBruit) {
          son.frisson();
          g.prochainBruit = t + 210 + Math.random() * 90;
        }
      } else if (g.phase === 'leve') {
        // Le gobelet se soulève, puis se COUCHE à côté des dés. Posé
        // dessus, il les cachait (Alex, 2026-08-23).
        const e = 1 - Math.pow(1 - doux, 2);
        const hauteur = Math.sin(doux * Math.PI) * 1.2;
        // Couché, le gobelet repose sur son flanc : sa hauteur devient
        // son RAYON, sinon il s'enfonce dans la planche.
        gob.position.set(
          g.base.x + e * 1.9 * cote,
          POSE_Y + hauteur + e * 0.70,
          g.base.z + e * 0.66,
        );
        // Il bascule de renversé à couché SUR LE FLANC, la bouche
        // tournée de côté. En basculant sur l'axe X il finissait la
        // bouche vers la caméra, et se lisait comme un grand disque noir
        // posé sur la table (Alex, 2026-08-24).
        gob.rotation.set(Math.PI * (1 - e), 0, e * (Math.PI / 2) * -cote);
      }
    });

    // La douche glisse vers la place active, sans à-coup.
    visee.lerp(viseeVoulue, 0.07);
    cible.position.copy(visee);
    projecteur.position.set(visee.x * 0.42, 7.4, visee.z * 0.42 + 0.5);
    const pulse = 1 + Math.sin(t / 520) * 0.05;
    projecteur.intensity = intensiteVoulue * pulse;

    // Les dés lâchés par le gobelet : ils tombent, rebondissent deux
    // fois en tournant, puis se posent à plat sur la bonne face.
    for (let i = chute.length - 1; i >= 0; i--) {
      const c = chute[i];
      const k = (t - c.depart) / CHUTE_MS;
      if (k >= 1) {
        c.de.position.set(c.x1, DE / 2, c.z1);
        poserLeDe(c.de, c.cible);
        chute.splice(i, 1);
        continue;
      }
      // Le déplacement horizontal ralentit comme un dé qui perd sa
      // course sur les planches.
      const glisse = 1 - Math.pow(1 - k, 3);
      c.de.position.x = c.x0 + (c.x1 - c.x0) * glisse;
      c.de.position.z = c.z0 + (c.z1 - c.z0) * glisse;
      c.de.position.y = DE / 2 + hauteurRebond(k, c.h0);
      // La rotation s'épuise avec les rebonds.
      const reste = Math.pow(1 - k, 1.6);
      c.de.rotateOnWorldAxis(c.axe, reste * c.tours * 0.28);
    }

    // Les convives restent tournés vers la caméra pendant qu'elle
    // tourne autour de la table.
    convives.forEach((c) => {
      c.lookAt(camera.position.x, c.position.y, camera.position.z);
    });

    orbite?.update();
    renderer.render(scene, camera);
  };

  let orbite: OrbitControls | null = null;

  const ajuster = (el: HTMLElement) => {
    const w = el.clientWidth || 800;
    const h = el.clientHeight || 480;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // La table entière doit tenir dans la fenêtre : sur un écran large,
    // c'est la hauteur qui manque, alors la caméra recule d'autant.
    // Le cadrage doit contenir la table ET les convives assis derrière
    // elle, et la table doit remonter au-dessus du bandeau d'annonce
    // qui occupe le bas de la fenêtre (Alex, 2026-08-23).
    const RAYON = 8.9;
    const vertical = THREE.MathUtils.degToRad(camera.fov);
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
    const recul = Math.max(RAYON / Math.tan(vertical / 2), RAYON / Math.tan(horizontal / 2));
    const dist = Math.max(11.5, recul * 0.92);
    if (!orbite) {
      camera.position.set(0, dist * 0.66, dist * 0.72);
      camera.lookAt(0, -1.35, -0.2);
    }
    camera.updateProjectionMatrix();
  };

  let hote: HTMLElement | null = null;
  const surResize = () => { if (hote) ajuster(hote); };

  return {
    monter(el) {
      hote = el;
      el.appendChild(renderer.domElement);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      ajuster(el);
      // On tourne autour de la table à la souris, comme au tafl : le
      // regard reste sur le plateau, la hauteur reste crédible.
      orbite = new OrbitControls(camera, renderer.domElement);
      orbite.target.set(0, -1.35, -0.2);
      orbite.enableDamping = true;
      orbite.dampingFactor = 0.08;
      orbite.enablePan = false;
      orbite.minPolarAngle = Math.PI * 0.12;
      orbite.maxPolarAngle = Math.PI * 0.46;
      orbite.minDistance = 9;
      orbite.maxDistance = 22;
      orbite.rotateSpeed = 0.55;
      orbite.zoomSpeed = 0.6;
      orbite.update();
      window.addEventListener('resize', surResize);
      vivant = true;
      boucle();
    },
    demonter() {
      vivant = false;
      if (anim) cancelAnimationFrame(anim);
      window.removeEventListener('resize', surResize);
      orbite?.dispose();
      orbite = null;
      renderer.domElement.remove();
      renderer.dispose();
    },
    disposer(nb) {
      // On vide et on repose : c'est peu fréquent, ça reste lisible.
      groupe.clear();
      gobelets.length = 0;
      mesDes.length = 0;
      desAdverses.length = 0;
      const pl = places(nb);
      convives.length = 0;
      sieges.length = 0;
      pl.forEach((p) => sieges.push({ x: p.x, z: p.z }));
      pl.forEach((p, i) => {
        const g = faireGobelet();
        g.position.set(p.x * 0.72, POSE_Y, p.z * 0.72);
        groupe.add(g);
        gobelets.push(g);
        if (i === 0) {
          for (let k = 0; k < 5; k++) {
            const d = faireDe();
            d.position.set(-1.2 + k * 0.62, DE / 2, 2.35);
            groupe.add(d);
            mesDes.push(d);
          }
        } else {
          // Un convive peint se tient derrière la place, tourné vers
          // le centre de la table.
          const tex = chargeur.load(CONVIVES[(i - 1) % CONVIVES.length]);
          tex.colorSpace = THREE.SRGBColorSpace;
          const haut = 5.4;
          // `alphaTest` plutôt que la transparence mélangée : le convive
          // devient un objet plein qui se cache derrière la table au
          // lieu d'un filigrane posé par-dessus (Alex, 2026-08-23).
          const plaque = new THREE.Mesh(
            new THREE.PlaneGeometry(haut * 0.62, haut),
            new THREE.MeshBasicMaterial({
              map: tex, transparent: true, alphaTest: 0.02,
              depthWrite: true, depthTest: true,
            }),
          );
          // Le buste se pose AU-DELÀ du bord de la table (rayon 6,2),
          // et son bas plonge sous le plateau : les planches cachent la
          // découpe et le convive a l'air assis (Alex, 2026-08-23).
          plaque.position.set(p.x * 1.78, haut / 2 - 2.35, p.z * 1.78);
          plaque.lookAt(0, haut / 2 - 2.0, 0);
          groupe.add(plaque);
          convives.push(plaque);

          const mains: THREE.Mesh[] = [];
          for (let k = 0; k < 5; k++) {
            const d = faireDe();
            d.position.set(p.x - 1.1 + k * 0.56, DE / 2, p.z + 0.85);
            d.visible = false;
            groupe.add(d);
            mains.push(d);
          }
          desAdverses.push(mains);
        }
      });
    },
    lancer(faces, onFini) {
      calmer();
      // Le vrai geste de la table : le gobelet renversé brasse en
      // frottant la planche, puis il se lève et les dés lui tombent
      // dessous, rebondissent et se posent (Alex, 2026-08-23).
      const base = sieges[0]
        ? new THREE.Vector3(sieges[0].x * 0.72, 0, sieges[0].z * 0.72)
        : new THREE.Vector3(0, 0, 2.5);

      mesDes.forEach((d) => { d.visible = false; });
      gestes.set(0, { debut: performance.now(), phase: 'remue', base });
      son.secouer();

      // Le gobelet se lève et lâche ce qu'il tenait.
      window.setTimeout(() => {
        const g = gestes.get(0);
        if (g) { g.phase = 'leve'; g.debut = performance.now(); }
        const t0 = performance.now();
        mesDes.forEach((d, i) => {
          if (i >= faces.length) return;
          const a = (i / Math.max(1, faces.length)) * Math.PI * 2 + 0.4;
          const r = 0.95 + Math.random() * 0.2;
          const x1 = base.x * 0.78 + Math.cos(a) * r;
          const z1 = base.z * 0.78 + Math.sin(a) * r * 0.7 - 0.35;
          // Ils partent de la bouche du gobelet, serrés les uns contre
          // les autres, et s'écartent en tombant.
          const x0 = base.x + (Math.random() - 0.5) * 0.26;
          const z0 = base.z + (Math.random() - 0.5) * 0.26;
          d.position.set(x0, DE / 2 + 1.5, z0);
          d.visible = true;
          const rr = () => Math.random() * 2 - 1;
          chute.push({
            de: d, cible: faces[i], depart: t0 + i * 55,
            x0, z0, x1, z1,
            h0: 1.45 + Math.random() * 0.25,
            axe: new THREE.Vector3(rr(), rr(), rr()).normalize(),
            tours: 6 + Math.random() * 4,
          });
        });
        son.tomber();
        window.setTimeout(() => son.tomber(), 420);
      }, 2150);

      if (onFini) window.setTimeout(onFini, 2150 + CHUTE_MS + 380);
    },

    remuer(indices) {
      calmer();
      // Les autres ne montrent rien : leur gobelet reste retourné sur
      // la planche et frissonne, avec le bruit des dés dedans.
      const t0 = performance.now();
      indices.forEach((idx) => {
        if (idx === 0) return;
        const si = sieges[idx];
        if (!si) return;
        const base = new THREE.Vector3(si.x * 0.72, 0, si.z * 0.72);
        gestes.set(idx, { debut: t0, phase: 'remue', base });
      });
    },

    devoiler(mains, montrer) {
      desAdverses.forEach((groupeDes, idx) => {
        const main = mains[idx] || [];
        groupeDes.forEach((d, k) => {
          d.visible = montrer && k < main.length;
          if (d.visible) {
            poserLeDe(d, main[k]);
          }
        });
      });
      gobelets.forEach((g, i) => {
        if (i === 0) return;
        const si = sieges[i];
        const base = si ? new THREE.Vector3(si.x * 0.72, 0, si.z * 0.72) : new THREE.Vector3(0, 0, 0);
        if (montrer) {
          gestes.set(i, { debut: performance.now(), phase: 'leve', base });
        } else {
          gestes.delete(i);
          g.rotation.set(0, 0, 0);
          g.position.set(base.x, POSE_Y, base.z);
        }
      });
    },
    designer(index) {
      const s2 = sieges[index];
      if (s2) {
        // La douche vise la place, un peu en retrait vers le centre.
        viseeVoulue.set(s2.x * 0.72, 0, s2.z * 0.72);
        intensiteVoulue = 90;
      } else {
        intensiteVoulue = 0;
      }
    },

    perdreUnDe(_index) {
      // Le dé perdu quitte la table sans cérémonie. Le petit dé qui
      // montait en rapetissant avant de s'évaporer a été retiré : il se
      // voyait comme un défaut d'affichage (Alex, 2026-08-23). Seul le
      // son marque la perte, et le compte des mains suit derrière.
      son.perdre();
    },

    reprendreUnDe(index) {
      // Un dé repris tombe du haut, à la place de celui qui l'a gagné.
      const s2 = sieges[index];
      const de = faireDe();
      const x = (s2 ? s2.x : 0) * 0.72;
      const z = (s2 ? s2.z : 2.3) * 0.72;
      de.position.set(x, 2.4, z);
      groupe.add(de);
      const depart = performance.now();
      tumbling.push({
        de, depart, jusqua: depart + 700,
        cible: ((1 + Math.floor(Math.random() * 6)) as Face),
      });
      window.setTimeout(() => son.tomber(), 640);
      // Il reste posé un instant, puis la mise en place le remplace.
      window.setTimeout(() => { de.parent?.remove(de); }, 3200);
    },

    ancres() {
      // Chaque place est projetée sur l'écran : la bulle se pose juste
      // au-dessus du gobelet, comme dans une bande dessinée.
      const el = renderer.domElement;
      const v = new THREE.Vector3();
      return sieges.map((si) => {
        v.set(si.x * 0.86, 1.5, si.z * 0.86);
        v.project(camera);
        return {
          x: (v.x * 0.5 + 0.5) * 100,
          y: (-v.y * 0.5 + 0.5) * 100,
        };
      }).map((pt) => ({
        x: Math.max(6, Math.min(94, pt.x)),
        y: Math.max(10, Math.min(88, pt.y)),
      })).slice(0, sieges.length) as Array<{ x: number; y: number }>;
      void el;
    },

    mains(comptes) {
      // Les dés visibles du joueur suivent ce qu'il lui reste.
      mesDes.forEach((d, i) => { d.visible = i < (comptes[0] ?? 0); });
      desAdverses.forEach((groupeDes, idx) => {
        const n = comptes[idx + 1] ?? 0;
        groupeDes.forEach((d, k) => { if (k >= n) d.visible = false; });
      });
      // Qui n'a plus de dé quitte la table : son gobelet et sa place
      // s'effacent (Alex, 2026-08-23).
      gobelets.forEach((g, i) => { g.visible = (comptes[i] ?? 0) > 0; });
      convives.forEach((c, i) => { c.visible = (comptes[i + 1] ?? 0) > 0; });
    },
  };
}
