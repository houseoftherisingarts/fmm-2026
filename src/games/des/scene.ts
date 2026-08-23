// ─── La table des dés ───────────────────────────────────────────────
// Three.js pur : une table de taverne, un gobelet de cuir par joueur,
// des dés de bois taillés dans des faces peintes au canevas. Aucun
// fichier à télécharger : le bois, les points et le son sont fabriqués
// à l'exécution.

import * as THREE from 'three';
import type { Face } from './regles';

export interface TableDes {
  monter: (el: HTMLElement) => void;
  demonter: () => void;
  /** Place les gobelets selon le nombre de joueurs. */
  disposer: (nb: number) => void;
  /** Lance les dés du joueur humain, puis les pose sur leurs faces. */
  lancer: (faces: Face[], onFini?: () => void) => void;
  /** Montre ou cache les dés des autres au dévoilement. */
  devoiler: (mains: Face[][], montrer: boolean) => void;
  /** Le gobelet du joueur dont c'est le tour se soulève un peu. */
  designer: (index: number) => void;
}

// ── Le bois, peint une fois pour toutes ─────────────────────────────
function boisTexture(teinte: string, veine: string, taille = 512): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = taille;
  const g = c.getContext('2d')!;
  g.fillStyle = teinte;
  g.fillRect(0, 0, taille, taille);
  g.strokeStyle = veine;
  for (let i = 0; i < 160; i++) {
    const x = Math.random() * taille;
    g.globalAlpha = 0.04 + Math.random() * 0.14;
    g.lineWidth = 0.6 + Math.random() * 2.4;
    g.beginPath();
    g.moveTo(x, 0);
    const amp = 4 + Math.random() * 14;
    for (let y = 0; y <= taille; y += 16) {
      g.lineTo(x + Math.sin((y / taille) * Math.PI * (1 + Math.random())) * amp, y);
    }
    g.stroke();
  }
  g.globalAlpha = 0.05;
  for (let i = 0; i < 3000; i++) {
    g.fillStyle = Math.random() > 0.5 ? '#000' : '#fff';
    g.fillRect(Math.random() * taille, Math.random() * taille, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
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
  // Os vieilli
  g.fillStyle = '#e6dcc2';
  g.fillRect(0, 0, s, s);
  g.globalAlpha = 0.06;
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = Math.random() > 0.5 ? '#8a7a55' : '#fffaf0';
    g.fillRect(Math.random() * s, Math.random() * s, 1.5, 1.5);
  }
  g.globalAlpha = 1;
  // Bord légèrement bruni
  const grad = g.createRadialGradient(s / 2, s / 2, s * 0.28, s / 2, s / 2, s * 0.72);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(90,60,25,0.28)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  // Les points, creusés
  for (const [x, y] of POINTS[n]) {
    const r = n === 1 ? s * 0.11 : s * 0.075;
    g.beginPath();
    g.arc(x * s, y * s, r, 0, Math.PI * 2);
    g.fillStyle = '#2a1d10';
    g.fill();
    g.beginPath();
    g.arc(x * s - r * 0.18, y * s - r * 0.18, r * 0.72, 0, Math.PI * 2);
    g.fillStyle = '#14100a';
    g.fill();
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

// ── Le son, fabriqué au vol ─────────────────────────────────────────
function fabriquerSon() {
  let ctx: AudioContext | null = null;
  const ouvrir = () => {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return ctx;
  };
  const clac = (t: number, gain = 0.16) => {
    const a = ouvrir();
    const duree = 0.06;
    const buf = a.createBuffer(1, a.sampleRate * duree, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 5);
    }
    const src = a.createBufferSource();
    src.buffer = buf;
    const filtre = a.createBiquadFilter();
    filtre.type = 'bandpass';
    filtre.frequency.value = 900 + Math.random() * 900;
    filtre.Q.value = 1.4;
    const vol = a.createGain();
    vol.gain.value = gain;
    src.connect(filtre).connect(vol).connect(a.destination);
    src.start(a.currentTime + t);
  };
  return {
    /** Le bruit des dés secoués dans le gobelet. */
    secouer() {
      for (let i = 0; i < 14; i++) clac(i * 0.055 + Math.random() * 0.03, 0.09 + Math.random() * 0.06);
    },
    /** Les dés qui tombent sur la table. */
    tomber() {
      for (let i = 0; i < 6; i++) clac(0.02 * i + Math.random() * 0.05, 0.2);
    },
  };
}

export function creerTable(): TableDes {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0506);
  scene.fog = new THREE.Fog(0x0a0506, 9, 20);

  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
  camera.position.set(0, 5.6, 6.4);
  camera.lookAt(0, 0, 0.4);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // ── La table ──────────────────────────────────────────────────────
  const bois = boisTexture('#3a2412', '#1c1108');
  bois.repeat.set(3, 3);
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(6.2, 6.4, 0.42, 48),
    new THREE.MeshPhongMaterial({ color: 0xffffff, map: bois, shininess: 16, specular: 0x3a2712 }),
  );
  table.position.y = -0.24;
  table.receiveShadow = true;
  scene.add(table);

  // Un drap de feutre au centre, pour amortir les dés.
  const feutre = new THREE.Mesh(
    new THREE.CylinderGeometry(3.1, 3.1, 0.02, 48),
    new THREE.MeshPhongMaterial({ color: 0x4a1520, shininess: 4 }),
  );
  feutre.position.y = -0.02;
  feutre.receiveShadow = true;
  scene.add(feutre);

  // ── Lumières de taverne ───────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0x2a1a12, 1.1));
  const chandelle = new THREE.PointLight(0xffb066, 2.6, 26, 2);
  chandelle.position.set(0, 5.2, 1.2);
  chandelle.castShadow = true;
  scene.add(chandelle);
  const braise = new THREE.PointLight(0xc4471f, 1.1, 18, 2);
  braise.position.set(-4.4, 2.2, -3.2);
  scene.add(braise);

  // ── Les gobelets ──────────────────────────────────────────────────
  const cuir = boisTexture('#2a1712', '#120a07', 256);
  cuir.repeat.set(2, 1);
  const gobelets: THREE.Mesh[] = [];
  const faireGobelet = () => {
    const g = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.5, 1.15, 24, 1, true),
      new THREE.MeshPhongMaterial({
        color: 0xffffff, map: cuir, shininess: 8, side: THREE.DoubleSide,
      }),
    );
    const fond = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 0.06, 24),
      new THREE.MeshPhongMaterial({ color: 0x1a0f0a, shininess: 6 }),
    );
    fond.position.y = -0.56;
    const grp = new THREE.Group();
    grp.add(g, fond);
    grp.castShadow = true;
    g.castShadow = true;
    return grp as unknown as THREE.Mesh;
  };

  // ── Les dés ───────────────────────────────────────────────────────
  const materiaux = ORDRE_FACES.map((n) =>
    new THREE.MeshPhongMaterial({ map: faceTexture(n), shininess: 26, specular: 0x554433 }));
  const geoDe = new THREE.BoxGeometry(0.4, 0.4, 0.4);
  const faireDe = () => {
    const d = new THREE.Mesh(geoDe, materiaux);
    d.castShadow = true;
    d.receiveShadow = true;
    return d;
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
  const tumbling: Array<{ de: THREE.Mesh; jusqua: number; cible: Face; depart: number }> = [];

  const boucle = () => {
    if (!vivant) return;
    anim = requestAnimationFrame(boucle);
    const t = performance.now();
    // Flamme de chandelle
    chandelle.intensity = 2.4 + Math.sin(t / 190) * 0.22 + Math.sin(t / 77) * 0.1;
    // Dés en vol
    for (let i = tumbling.length - 1; i >= 0; i--) {
      const d = tumbling[i];
      const k = (t - d.depart) / (d.jusqua - d.depart);
      if (k >= 1) {
        const [rx, ry, rz] = VERS_LE_CIEL[d.cible];
        d.de.rotation.set(rx, ry + (Math.random() - 0.5) * 0.25, rz);
        d.de.position.y = 0.2;
        tumbling.splice(i, 1);
        continue;
      }
      d.de.rotation.x += 0.34;
      d.de.rotation.y += 0.27;
      d.de.rotation.z += 0.19;
      d.de.position.y = 0.2 + Math.abs(Math.sin(k * Math.PI * 2.2)) * (1 - k) * 1.5;
    }
    renderer.render(scene, camera);
  };

  const ajuster = (el: HTMLElement) => {
    const w = el.clientWidth || 800;
    const h = el.clientHeight || 480;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
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
      window.addEventListener('resize', surResize);
      vivant = true;
      boucle();
    },
    demonter() {
      vivant = false;
      if (anim) cancelAnimationFrame(anim);
      window.removeEventListener('resize', surResize);
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
      pl.forEach((p, i) => {
        const g = faireGobelet();
        g.position.set(p.x, 0.52, p.z);
        groupe.add(g);
        gobelets.push(g);
        if (i === 0) {
          for (let k = 0; k < 5; k++) {
            const d = faireDe();
            d.position.set(-1.0 + k * 0.5, 0.2, 2.35);
            groupe.add(d);
            mesDes.push(d);
          }
        } else {
          const mains: THREE.Mesh[] = [];
          for (let k = 0; k < 5; k++) {
            const d = faireDe();
            d.position.set(p.x - 0.9 + k * 0.45, 0.2, p.z + 0.9);
            d.visible = false;
            groupe.add(d);
            mains.push(d);
          }
          desAdverses.push(mains);
        }
      });
    },
    lancer(faces, onFini) {
      son.secouer();
      const depart = performance.now() + 780;
      mesDes.forEach((d, i) => {
        d.visible = i < faces.length;
        if (i >= faces.length) return;
        d.position.set(-1.0 + i * 0.5, 1.6, 2.35);
        tumbling.push({ de: d, depart, jusqua: depart + 900 + i * 90, cible: faces[i] });
      });
      window.setTimeout(() => son.tomber(), 800);
      if (onFini) window.setTimeout(onFini, 1800);
    },
    devoiler(mains, montrer) {
      desAdverses.forEach((groupeDes, idx) => {
        const main = mains[idx] || [];
        groupeDes.forEach((d, k) => {
          d.visible = montrer && k < main.length;
          if (d.visible) {
            const [rx, ry, rz] = VERS_LE_CIEL[main[k]];
            d.rotation.set(rx, ry, rz);
          }
        });
      });
      gobelets.forEach((g, i) => {
        if (i === 0) return;
        g.position.y = montrer ? 1.35 : 0.52;
      });
    },
    designer(index) {
      gobelets.forEach((g, i) => {
        g.position.y = i === index ? 0.68 : 0.52;
      });
    },
  };
}
