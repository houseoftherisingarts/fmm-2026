// Hnefatafl: scene, renderer, camera, lights, fog, resize
import * as THREE from 'three';
import gsap from 'gsap';

export interface SceneHandle {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  sun: THREE.DirectionalLight;
  torchA: THREE.PointLight;
  torchB: THREE.PointLight;
  torchCool: THREE.PointLight;
  updateCam(): void;
  rotateOrbit(dx: number, dy: number): void;
  pushCameraIn(targetRadius: number, duration?: number): void;
  attachResize(): () => void;
  dispose(): void;
}

// ── Le bois de la table ─────────────────────────────────────────────
// Alex, 2026-08-23 : même texture que la table du jeu de dés
// (public/jeux/des/table-bois.webp), pour que le bois soit identique
// dans les deux jeux. Le canevas peint plus bas reste le repli si le
// fichier ne charge pas : le jeu ne doit jamais s'ouvrir sur du gris.
function boisDeTable(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#3a2412';
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = '#1b1008';
  for (let i = 0; i < 170; i++) {
    const x = Math.random() * 512;
    g.globalAlpha = 0.05 + Math.random() * 0.15;
    g.lineWidth = 0.7 + Math.random() * 2.6;
    g.beginPath();
    g.moveTo(x, 0);
    const amp = 5 + Math.random() * 15;
    for (let y = 0; y <= 512; y += 16) {
      g.lineTo(x + Math.sin((y / 512) * Math.PI * (1 + Math.random())) * amp, y);
    }
    g.stroke();
  }
  for (let k = 0; k < 4; k++) {
    const nx = 40 + Math.random() * 432;
    const ny = 40 + Math.random() * 432;
    for (let r = 24; r > 1; r -= 2.6) {
      g.globalAlpha = 0.05 + (24 - r) * 0.011;
      g.beginPath();
      g.ellipse(nx, ny, r, r * 0.55, Math.random() * Math.PI, 0, Math.PI * 2);
      g.stroke();
    }
  }
  g.globalAlpha = 0.05;
  for (let i = 0; i < 5000; i++) {
    g.fillStyle = Math.random() > 0.5 ? '#000' : '#fff';
    g.fillRect(Math.random() * 512, Math.random() * 512, 1, 1);
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  t.anisotropy = 8;
  return t;
}

export function setupScene(el: HTMLElement): SceneHandle {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x080502);
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x080502, 24, 42);

  // La table sur laquelle le damier est posé : chêne, large, qui reçoit
  // les ombres des pièces. Même texture que la table des dés; repeat=5
  // pour garder les planches à la même échelle physique sur ce plateau
  // presque trois fois plus large.
  const materielTable = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.68, metalness: 0.02 });
  const boisTable = new THREE.TextureLoader().load(
    '/jeux/des/table-bois.webp', undefined, undefined,
    () => { materielTable.map = boisDeTable(); materielTable.needsUpdate = true; },
  );
  boisTable.colorSpace = THREE.SRGBColorSpace;
  boisTable.wrapS = boisTable.wrapT = THREE.RepeatWrapping;
  boisTable.repeat.set(5, 5);
  boisTable.anisotropy = 8;
  materielTable.map = boisTable;
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(15.5, 16.5, 0.7, 56),
    materielTable,
  );
  table.position.y = -1.15;
  table.receiveShadow = true;
  scene.add(table);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);

  // ── Cadrage adaptatif ─────────────────────────────────────────────
  // Le champ de vision est VERTICAL : dans une scène large, la hauteur
  // commande; dans une scène étroite (mobile en portrait), c'est la
  // largeur, et à distance fixe le plateau sortait du cadre. Le rayon
  // se recalcule donc à chaque redimensionnement. L'exposant adoucit
  // l'éloignement pour que le plateau ne devienne pas minuscule sur
  // téléphone. Posé le 2026-08-03 avec la refonte de la page.
  const FIT_R = 16.5;
  const fitRadius = (aspect: number) =>
    aspect >= 1 ? FIT_R : FIT_R / Math.pow(Math.max(aspect, 0.35), 0.8);

  let camR = FIT_R;
  let theta = 0.4;
  let phi = 1.08;

  const updateCam = () => {
    camera.position.set(
      camR * Math.sin(phi) * Math.sin(theta),
      camR * Math.cos(phi),
      camR * Math.sin(phi) * Math.cos(theta),
    );
    // Visée LÉGÈREMENT sous le plateau : en perspective, le bord proche
    // du plateau est bien plus gros et tire la masse visuelle vers le
    // bas. Viser un peu plus bas recentre l'ensemble à l'écran.
    camera.lookAt(0, -0.9, 0);
  };
  updateCam();

  const rotateOrbit = (dx: number, dy: number) => {
    theta -= dx * 0.007;
    phi = Math.max(0.15, Math.min(Math.PI / 2.05, phi + dy * 0.006));
    updateCam();
  };

  // Rapproché cinématique (fuite du Roi). Le paramètre est une FRACTION
  // du rayon courant, et non un rayon absolu : le rayon dépend
  // maintenant du format de la scène, donc une valeur en dur zoomerait
  // dans le vide sur téléphone.
  const pushCameraIn = (factor: number, duration = 1.6) => {
    const state = { r: camR };
    gsap.killTweensOf(state);
    gsap.to(state, {
      r: camR * factor,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        camR = state.r;
        updateCam();
      },
    });
  };

  const onResize = () => {
    const W = el.clientWidth;
    const H = el.clientHeight;
    // Une boîte de hauteur nulle (conteneur replié, page cachée) donnerait
    // un rapport infini et un cadrage perdu au retour.
    if (W === 0 || H === 0) return;
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    camR = fitRadius(camera.aspect);
    updateCam();
  };

  // Le canevas se remesure sur son CONTENEUR, plus sur la fenêtre. Entrer
  // ou sortir du plein écran ne redimensionne pas toujours la fenêtre, et
  // quand elle bouge, l'événement `resize` arrive parfois avant que la
  // mise en page du plein écran soit posée : le canevas gardait alors son
  // ancienne taille et une partie du plateau restait hors cadre (constat
  // d'Alex, 2026-08-23). ResizeObserver suit la boîte réelle, déclenche
  // dès l'attache, et couvre du même coup le redimensionnement de la
  // fenêtre puisque la scène est dimensionnée en pourcentage.
  const attachResize = (): (() => void) => {
    const observateur = new ResizeObserver(onResize);
    observateur.observe(el);
    onResize();
    return () => observateur.disconnect();
  };

  scene.add(new THREE.AmbientLight(0x4a2a12, 1.6));

  const sun = new THREE.DirectionalLight(0xffd580, 2.8);
  sun.position.set(8, 14, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -10,
    right: 10,
    top: 10,
    bottom: -10,
    near: 0.5,
    far: 45,
  });
  scene.add(sun);

  const torchA = new THREE.PointLight(0xff4c0a, 5, 18);
  torchA.position.set(-8, 6, -8);
  scene.add(torchA);

  const torchB = new THREE.PointLight(0xff380a, 4, 18);
  torchB.position.set(8, 6, 9);
  scene.add(torchB);

  const torchCool = new THREE.PointLight(0x3040ff, 1.5, 20);
  torchCool.position.set(0, 8, 0);
  scene.add(torchCool);

  // ── La salle autour du plateau ────────────────────────────────────
  // Le plateau flottait dans une couleur unie : rien autour, aucune
  // profondeur (constat d'Alex, 2026-08-22). Une taverne enroulée sur un
  // cylindre ouvert vers l'intérieur donne un décor qui défile quand on
  // fait tourner la caméra, pour le prix d'une texture. La même image
  // sert de scène au bestiaire des groupes : un seul décor, deux usages.
  // Le brouillard mange sa base, le plateau reste le sujet.
  const salleTex = new THREE.TextureLoader().load('/scenes/taverne-salle.jpg', (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.x = 3;          // trois travées : la salle fait le tour sans étirement
    renderer.render(scene, camera);
  });
  const salleGeo = new THREE.CylinderGeometry(34, 34, 26, 48, 1, true);
  const salleMat = new THREE.MeshBasicMaterial({
    map: salleTex,
    side: THREE.BackSide,
    fog: true,
    depthWrite: false,
    color: 0x6a5a4a,        // assombri : le décor reste en retrait du plateau
  });
  const salle = new THREE.Mesh(salleGeo, salleMat);
  salle.position.y = 5;
  salle.renderOrder = -1;
  scene.add(salle);

  // Le brouillard doit laisser voir la salle : il se referme plus loin
  // que le rayon du cylindre, sinon le décor disparaît dans le noir.
  scene.fog = new THREE.Fog(0x0d0906, 26, 62);

  const dispose = () => {
    salleGeo.dispose();
    salleMat.dispose();
    salleTex.dispose();
    renderer.dispose();
    if (el.contains(renderer.domElement)) {
      el.removeChild(renderer.domElement);
    }
  };

  return {
    renderer,
    scene,
    camera,
    sun,
    torchA,
    torchB,
    torchCool,
    updateCam,
    rotateOrbit,
    pushCameraIn,
    attachResize,
    dispose,
  };
}
