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

/** L'écart entre deux points du plateau. Sept points de large, donc
 *  une planche d'environ douze unités : le cadrage de sceneSetup, réglé
 *  pour le damier du tafl, la prend sans rien changer. */
const PAS_3D = 2.0;
const EPAISSEUR = 0.55;
const BISEAU = 0.05;

/** Le jeu entier est grossi d'un quart dans la scène du tafl. */
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
// Même texture que la table des dés et du tafl, pour que les trois
// jeux du festival soient taillés dans le même arbre.
function boisDeLaPlanche(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: 0xf3ddbe, roughness: 0.78, metalness: 0.03 });
  const tex = new THREE.TextureLoader().load(
    '/jeux/des/table-bois.webp',
    (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(0.16, 0.16);
      t.anisotropy = 8;
      mat.needsUpdate = true;
    },
    undefined,
    () => { mat.map = null; mat.color.set(0x8a6236); mat.needsUpdate = true; },
  );
  mat.map = tex;
  return mat;
}

/** La croix, taillée en deux planches croisées, plus le liseré brûlé
 *  et les cupules. Une planche de ferme, pas un damier verni. */
function construirePlateau(): THREE.Group {
  const groupe = new THREE.Group();
  const bois = boisDeLaPlanche();

  // Une seule pièce de bois, découpée en croix. Deux planches croisées
  // auraient donné deux dessus coplanaires au milieu, donc un
  // scintillement à la moindre rotation de caméra.
  const a = 2.25;  // demi-largeur d'un bras
  const L = 6.35;  // demi-longueur de la croix
  const forme = new THREE.Shape();
  forme.moveTo(-a, -L);
  forme.lineTo(a, -L); forme.lineTo(a, -a); forme.lineTo(L, -a);
  forme.lineTo(L, a); forme.lineTo(a, a); forme.lineTo(a, L);
  forme.lineTo(-a, L); forme.lineTo(-a, a); forme.lineTo(-L, a);
  forme.lineTo(-L, -a); forme.lineTo(-a, -a);
  forme.closePath();
  const planche = new THREE.Mesh(
    new THREE.ExtrudeGeometry(forme, {
      depth: EPAISSEUR, bevelEnabled: true, bevelThickness: BISEAU, bevelSize: 0.06, bevelSegments: 2,
    }),
    bois,
  );
  planche.rotation.x = -Math.PI / 2;
  // Le chanfrein déborde de l'extrusion des deux côtés : sans ce
  // décalage, le dessus de la planche montait à 0,05 et recouvrait les
  // lignes brûlées comme les cupules.
  planche.position.y = -(EPAISSEUR + BISEAU);
  planche.castShadow = true;
  planche.receiveShadow = true;
  groupe.add(planche);

  // Les lignes brûlées au fer, une par voisinage. Elles ne sont pas
  // peintes : elles sont creusées d'un cheveu dans le bois, donc
  // posées juste au-dessus pour rester nettes sous la lumière rase.
  const braise = new THREE.MeshStandardMaterial({ color: 0x1a0c03, roughness: 0.98, metalness: 0 });
  const faites = new Set<string>();
  POINTS.forEach((p, i) => {
    for (const { dr, dc } of PAS) {
      const voisin = pointDe(p.r + dr, p.c + dc);
      if (voisin < 0) continue;
      const cle = i < voisin ? `${i}-${voisin}` : `${voisin}-${i}`;
      if (faites.has(cle)) continue;
      faites.add(cle);
      const a = positionDe(i);
      const b = positionDe(voisin);
      const horizontal = Math.abs(a.x - b.x) > 0.01;
      const ligne = new THREE.Mesh(
        new THREE.BoxGeometry(horizontal ? PAS_3D : 0.13, 0.05, horizontal ? 0.13 : PAS_3D),
        braise,
      );
      ligne.position.set((a.x + b.x) / 2, 0.02, (a.z + b.z) / 2);
      groupe.add(ligne);
    }
  });

  // Les cupules : un creux au vilebrequin à chaque point, pour que le
  // pion se cale et que le plateau se lise même de loin.
  const creux = new THREE.MeshStandardMaterial({ color: 0x2a1508, roughness: 0.95, metalness: 0 });
  const creuxGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.06, 24);
  POINTS.forEach((_, i) => {
    const m = new THREE.Mesh(creuxGeo, creux);
    m.position.copy(positionDe(i));
    m.position.y = 0.028;
    m.receiveShadow = true;
    groupe.add(m);
  });

  return groupe;
}

// ── Le renard ───────────────────────────────────────────────────────
function construireRenard(): THREE.Group {
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
function construireOie(): THREE.Group {
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
  racine.scale.setScalar(ECHELLE);
  scene.add(racine);
  racine.add(construirePlateau());

  // Les pièces, une par point occupé. Le groupe garde son numéro de
  // point dans userData : l'animation le relit sans table annexe.
  const pieces = new Map<number, THREE.Group>();
  const renard = construireRenard();
  renard.visible = false;
  racine.add(renard);

  const oiesLibres: THREE.Group[] = [];
  const prendreOie = (): THREE.Group => {
    const dispo = oiesLibres.pop();
    if (dispo) { dispo.visible = true; dispo.scale.setScalar(1); return dispo; }
    const neuve = construireOie();
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
    contact.divideScalar(ECHELLE);
    let meilleur: number | null = null;
    let distance = PAS_3D * 0.62;
    POINTS.forEach((_, i) => {
      const p = positionDe(i);
      const d = Math.hypot(p.x - contact.x, p.z - contact.z);
      if (d < distance) { distance = d; meilleur = i; }
    });
    return meilleur;
  };

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

  let vivant = true;
  const boucle = () => {
    if (!vivant) return;
    renderer.render(scene, camera);
    requestAnimationFrame(boucle);
  };
  boucle();

  const dispose = () => {
    vivant = false;
    gsap.killTweensOf(renard.position);
    effacer();
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
