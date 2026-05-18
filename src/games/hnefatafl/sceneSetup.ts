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
  let camR = 20;
  let theta = 0.4;
  let phi = 1.08;

  const updateCam = () => {
    camera.position.set(
      camR * Math.sin(phi) * Math.sin(theta),
      camR * Math.cos(phi),
      camR * Math.sin(phi) * Math.cos(theta),
    );
    camera.lookAt(0, 0, 0);
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

  scene.add(new THREE.AmbientLight(0x3a1a08, 1));

  const sun = new THREE.DirectionalLight(0xffcc60, 2.2);
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
