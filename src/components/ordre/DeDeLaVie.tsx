import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Dices } from 'lucide-react';

// ─── Le dé de la vie ────────────────────────────────────────────────
// Un vrai d20 qui roule, le même objet que celui du Salon des Inconnus
// (Alex, 2026-08-23) : vingt faces d'icosaèdre, arêtes dorées, chiffres
// peints, culbute puis atterrissage sur la face choisie. Le dé ne décide
// de rien sur le site, seulement dans la vie de qui le lance.

const RAYON = 1.6;
const DUREE = 2.6;

type Face = { centre: THREE.Vector3; normale: THREE.Vector3 };

/** Les vingt faces de l'icosaèdre : leur centre et leur normale. */
function lireLesFaces(geo: THREE.BufferGeometry): Face[] {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const pos = g.attributes.position as THREE.BufferAttribute;
  const out: Face[] = [];
  for (let i = 0; i < pos.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, i);
    const b = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
    const c = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
    const centre = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3);
    const normale = new THREE.Vector3()
      .crossVectors(new THREE.Vector3().subVectors(b, a), new THREE.Vector3().subVectors(c, a))
      .normalize();
    if (normale.dot(centre) < 0) normale.multiplyScalar(-1);
    out.push({ centre, normale });
  }
  return out.slice(0, 20);
}

const versant = (de: THREE.Vector3, vers: THREE.Vector3) =>
  new THREE.Quaternion().setFromUnitVectors(de.clone().normalize(), vers.clone().normalize());

/** Le chiffre, peint sur une petite toile : rien à charger, rien à attendre. */
function chiffrePeint(n: number): THREE.CanvasTexture {
  const t = 256;
  const cv = document.createElement('canvas');
  cv.width = t; cv.height = t;
  const ctx = cv.getContext('2d')!;
  ctx.clearRect(0, 0, t, t);
  ctx.font = `bold ${Math.floor(t * 0.62)}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillText(String(n), t / 2 + 4, t / 2 + 6);
  ctx.fillStyle = n === 20 ? '#f3e5ab' : n === 1 ? '#ee9999' : '#d8c98a';
  ctx.fillText(String(n), t / 2, t / 2);
  // Le 6 et le 9 se ressemblent trop sur un dé qui tourne : un trait
  // les sépare.
  if (n === 6 || n === 9) {
    ctx.strokeStyle = ctx.fillStyle as string;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(t * 0.32, t * 0.78);
    ctx.lineTo(t * 0.68, t * 0.78);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const De: React.FC<{
  jet: number;
  face: number | null;
  onPose: () => void;
}> = ({ jet, face, onPose }) => {
  const groupe = useRef<THREE.Group>(null);
  const geo = useMemo(() => new THREE.IcosahedronGeometry(RAYON, 0).toNonIndexed(), []);
  const aretes = useMemo(() => new THREE.EdgesGeometry(geo), [geo]);
  const faces = useMemo(() => lireLesFaces(geo), [geo]);
  const chiffres = useMemo(() => Array.from({ length: 20 }, (_, i) => chiffrePeint(i + 1)), []);

  const phase = useRef<'repos' | 'culbute' | 'chute' | 'pose'>('repos');
  const debut = useRef(0);
  const depart = useRef(new THREE.Quaternion());
  const cible = useRef(new THREE.Quaternion());
  const axe = useRef(new THREE.Vector3(1, 0, 0));
  const tours = useRef(6);

  useEffect(() => {
    if (jet === 0 || !groupe.current) return;
    const r = () => Math.random() * 2 - 1;
    axe.current.set(r(), r(), r()).normalize();
    tours.current = 5 + Math.random() * 3;
    phase.current = 'culbute';
  }, [jet]);

  useEffect(() => {
    if (face == null || !groupe.current) return;
    const f = faces[Math.max(0, Math.min(19, face - 1))];
    cible.current = versant(f.normale, new THREE.Vector3(0, 1, 0));
    depart.current.copy(groupe.current.quaternion);
    debut.current = performance.now() / 1000;
    phase.current = 'chute';
  }, [face, jet, faces]);

  useFrame((_, dt) => {
    const g = groupe.current;
    if (!g) return;
    const t = performance.now() / 1000;

    if (phase.current === 'repos') {
      g.rotation.y += dt * 0.35;
      g.rotation.x += dt * 0.2;
      return;
    }
    if (phase.current === 'culbute') {
      g.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(axe.current, dt * 13));
      g.position.y = -0.4 + Math.abs(Math.sin(t * 5.5)) * 0.45;
      return;
    }
    if (phase.current === 'chute') {
      const k = Math.min(1, (t - debut.current) / DUREE);
      const doux = 1 - Math.pow(1 - k, 4);
      const roulis = new THREE.Quaternion()
        .setFromAxisAngle(axe.current, (1 - doux) * Math.PI * 2 * tours.current);
      const posee = new THREE.Quaternion()
        .slerpQuaternions(depart.current, cible.current, doux);
      g.quaternion.copy(roulis.multiply(posee));
      g.position.y = Math.max(0, Math.sin(k * Math.PI))
        + Math.max(0, Math.sin(k * Math.PI * 2.4) * 0.18) - 0.4;
      if (k >= 1) {
        g.quaternion.copy(cible.current);
        g.position.y = -0.4;
        phase.current = 'pose';
        onPose();
      }
      return;
    }
    g.position.y = -0.4 + Math.sin(t * 1.2) * 0.02;
  });

  return (
    <group ref={groupe}>
      <mesh geometry={geo}>
        <meshPhysicalMaterial
          color="#1a1208" metalness={0.35} roughness={0.35}
          clearcoat={0.6} clearcoatRoughness={0.25}
          emissive="#3a2a10" emissiveIntensity={0.08}
        />
      </mesh>
      <lineSegments geometry={aretes}>
        <lineBasicMaterial color="#c5a059" />
      </lineSegments>
      {faces.map((f, i) => {
        const p = f.centre.clone().add(f.normale.clone().multiplyScalar(0.012));
        const q = versant(new THREE.Vector3(0, 0, 1), f.normale);
        return (
          <mesh key={i} position={[p.x, p.y, p.z]} quaternion={[q.x, q.y, q.z, q.w]}>
            <planeGeometry args={[0.95, 0.95]} />
            <meshBasicMaterial map={chiffres[i]} transparent depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};

const DeDeLaVie: React.FC<{ lang: 'FR' | 'EN' }> = ({ lang }) => {
  const fr = lang === 'FR';
  const [jet, setJet] = useState(0);
  const [face, setFace] = useState<number | null>(null);
  const [roule, setRoule] = useState(false);

  const lancer = () => {
    if (roule) return;
    setRoule(true);
    setFace(null);
    setJet((n) => n + 1);
    // Le sort se décide au moment du jet, et le dé met un instant à
    // s'y rendre : la culbute couvre l'attente.
    window.setTimeout(() => setFace(1 + Math.floor(Math.random() * 20)), 520);
  };

  const critique = face === 20 && !roule;
  const echec = face === 1 && !roule;

  return (
    <div
      className="rounded-lg-card border border-brass/25 p-6 text-center"
      style={{ background: 'rgba(26, 5, 11, 0.45)' }}
    >
      <p className="witcher-stat-label mb-1.5 inline-flex items-center gap-2">
        <Dices size={11} /> {fr ? 'Le dé de la vie' : 'The die of life'}
      </p>
      <p className="font-editorial text-sm text-ivory-soft leading-relaxed mb-4">
        {fr
          ? 'Vous hésitez ? Laissez le sort trancher. Le dé ne décide de rien sur ce site, seulement dans votre vie.'
          : 'Hesitating? Let fate settle it. The die decides nothing on this site, only in your life.'}
      </p>

      <button
        type="button"
        onClick={lancer}
        aria-label={fr ? 'Lancer le dé' : 'Roll the die'}
        className="mx-auto mb-3 block w-full max-w-[16rem] h-52 rounded-[15px] border overflow-hidden"
        style={{
          borderColor: critique ? 'rgba(232,177,74,0.85)'
            : echec ? 'rgba(160,50,40,0.8)' : 'rgba(232,177,74,0.32)',
          background: 'radial-gradient(circle at 40% 28%, rgba(232,177,74,0.14), rgba(18,8,6,0.95) 72%)',
          boxShadow: critique ? '0 0 42px rgba(232,177,74,0.45)'
            : echec ? '0 0 34px rgba(160,50,40,0.4)' : 'none',
        }}
      >
        <Canvas camera={{ position: [0, 1.6, 6], fov: 42 }} dpr={[1, 1.6]}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 8, 4]} intensity={1.3} />
          <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#c5a059" />
          <De jet={jet} face={face} onPose={() => setRoule(false)} />
        </Canvas>
      </button>

      <p
        className="font-sans uppercase tracking-[0.2em] text-[10px] h-4"
        style={{
          color: critique ? 'var(--color-amber-glow)'
            : echec ? '#c85a48' : 'rgba(244,239,227,0.45)',
        }}
      >
        {roule ? (fr ? 'Le dé roule…' : 'Rolling…')
          : critique ? 'Nat 20'
            : echec ? (fr ? 'Échec critique' : 'Critical failure')
              : face ? (fr ? `Le sort a parlé : ${face}` : `Fate has spoken: ${face}`)
                : (fr ? 'Touchez le dé' : 'Touch the die')}
      </p>
    </div>
  );
};

export default DeDeLaVie;
