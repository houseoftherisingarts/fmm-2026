// Charge une pièce sculptée (GLB Meshy, compressé draco) et la pose
// debout : hauteur imposée, base à y = 0, centrée en x et z. Chaque jeu
// clone le prototype rendu, donc un seul téléchargement par pièce.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export function chargerSculpture(url: string, hauteur: number): Promise<THREE.Group> {
  const draco = new DRACOLoader();
  draco.setDecoderPath('/draco/');
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => {
      const modele = gltf.scene;
      const boite = new THREE.Box3().setFromObject(modele);
      const taille = boite.getSize(new THREE.Vector3());
      const centre = boite.getCenter(new THREE.Vector3());
      const s = hauteur / Math.max(taille.y, 1e-6);
      modele.scale.setScalar(s);
      modele.position.set(-centre.x * s, -boite.min.y * s, -centre.z * s);
      modele.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; }
      });
      const enveloppe = new THREE.Group();
      enveloppe.add(modele);
      resolve(enveloppe);
    }, undefined, reject);
  });
}
