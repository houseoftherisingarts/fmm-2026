// ─── Hnefatafl — scene, renderer, camera, lights, fog, resize ────────
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

export function setupScene(el: HTMLElement): SceneHandle {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x080502);
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x080502, 24, 42);

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

  // Animate the orbit radius for a cinematic push-in (king escape).
  const pushCameraIn = (targetRadius: number, duration = 1.6) => {
    const state = { r: camR };
    gsap.killTweensOf(state);
    gsap.to(state, {
      r: targetRadius,
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
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  };

  const attachResize = (): (() => void) => {
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
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

  const dispose = () => {
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
