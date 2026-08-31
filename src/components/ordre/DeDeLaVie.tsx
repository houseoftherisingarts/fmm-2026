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
const DUREE = 1.55;
const SOL = -RAYON * 0.62;  // au repos, le centre du dé tombe sur l'origine

/** La même courbe que les dés du menteur : une grande arche, puis deux
 *  plus petites, chacune écrasée par la précédente (Alex, 2026-08-24 :
 *  « ça doit ressembler plus aux physiques de dés sur une table »). */
function hauteurRebond(k: number, h0: number): number {
  if (k <= 0) return h0;
  const arches: Array<[number, number, number]> = [
    [0, 0.5, 1],
    [0.5, 0.79, 0.33],
    [0.79, 1, 0.1],
  ];
  for (const [a, b, h] of arches) {
    if (k >= a && k < b) {
      const u = (k - a) / (b - a);
      const arc = a === 0 ? Math.cos(u * (Math.PI / 2)) : Math.sin(u * Math.PI);
      return h0 * h * arc;
    }
  }
  return 0;
}

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

/** La peinture rouge sang écaillée des dés du menteur, reprise telle
 *  quelle : marbrures, éclats qui laissent voir l'os, crasse de table
 *  (Alex, 2026-08-23 : « exactement comme tu as créé pour le jeu des
 *  dés »). */
function peintureDe(): THREE.CanvasTexture {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  g.fillStyle = '#7b2018';
  g.fillRect(0, 0, s, s);
  for (let i = 0; i < 80; i++) {
    g.globalAlpha = 0.05 + Math.random() * 0.14;
    g.fillStyle = Math.random() > 0.5 ? '#4d1009' : '#a4392a';
    g.beginPath();
    g.ellipse(Math.random() * s, Math.random() * s,
      24 + Math.random() * 110, 16 + Math.random() * 80,
      Math.random() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 52; i++) {
    g.globalAlpha = 0.14 + Math.random() * 0.3;
    g.fillStyle = '#d8c6a4';
    const rx = Math.random() * s;
    const ry = Math.random() * s;
    g.beginPath();
    g.moveTo(rx, ry);
    for (let k = 0; k < 6; k++) {
      g.lineTo(rx + (Math.random() - 0.5) * 62, ry + (Math.random() - 0.5) * 56);
    }
    g.closePath();
    g.fill();
  }
  g.globalAlpha = 0.09;
  for (let i = 0; i < 5200; i++) {
    g.fillStyle = Math.random() > 0.6 ? '#1a0805' : '#e4d3b0';
    g.fillRect(Math.random() * s, Math.random() * s, 2, 2);
  }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Le chiffre, creusé dans l'os comme les points des dés du menteur :
 *  une ombre portée en bas à droite, la matière claire, un liseré
 *  lumineux en haut à gauche. */
function chiffrePeint(n: number): THREE.CanvasTexture {
  const t = 256;
  const cv = document.createElement('canvas');
  cv.width = t; cv.height = t;
  const ctx = cv.getContext('2d')!;
  ctx.clearRect(0, 0, t, t);
  const taille = Math.floor(t * (n >= 10 ? 0.52 : 0.62));
  ctx.font = `bold ${taille}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const poser = (dx: number, dy: number, couleur: string) => {
    ctx.fillStyle = couleur;
    ctx.fillText(String(n), t / 2 + dx, t / 2 + dy);
  };
  // Le creux : une ombre franche vers le bas à droite.
  poser(5, 6, 'rgba(18,5,3,0.72)');
  // La matière : os poli, plus chaud sur le 20, plus rouge sur le 1.
  poser(0, 0, n === 20 ? '#f6efdc' : n === 1 ? '#e9b3a6' : '#dccca7');
  // Le liseré lumineux en haut à gauche.
  ctx.globalAlpha = 0.55;
  poser(-1.6, -1.8, '#fffaf0');
  ctx.globalAlpha = 1;
  // Le 6 et le 9 se ressemblent trop sur un dé qui tourne : un trait
  // les sépare.
  if (n === 6 || n === 9) {
    ctx.strokeStyle = '#dccca7';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(t * 0.33, t * 0.79);
    ctx.lineTo(t * 0.67, t * 0.79);
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
  const peinture = useMemo(() => peintureDe(), []);

  const phase = useRef<'repos' | 'culbute' | 'chute' | 'pose'>('repos');
  const debut = useRef(0);
  const depart = useRef(new THREE.Quaternion());
  const cible = useRef(new THREE.Quaternion());
  const axe = useRef(new THREE.Vector3(1, 0, 0));
  const tours = useRef(6);
  // Le dé ne tombe pas à pic : il part de côté et glisse en roulant.
  const depX = useRef(0);
  const depZ = useRef(0);

  useEffect(() => {
    if (jet === 0 || !groupe.current) return;
    const r = () => Math.random() * 2 - 1;
    axe.current.set(r(), r(), r()).normalize();
    tours.current = 5 + Math.random() * 3;
    depX.current = r() * 1.5;
    depZ.current = r() * 0.9;
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
      g.position.y = SOL + RAYON * 0.62;
      g.rotation.y += dt * 0.35;
      g.rotation.x += dt * 0.2;
      return;
    }
    if (phase.current === 'culbute') {
      // La main secoue le dé au-dessus de la table, le temps que le
      // sort se décide.
      g.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(axe.current, dt * 14));
      g.position.set(depX.current, 1.5 + Math.sin(t * 6.4) * 0.16, depZ.current);
      return;
    }
    if (phase.current === 'chute') {
      const k = Math.min(1, (t - debut.current) / DUREE);
      // La course horizontale s'épuise comme un dé qui perd sa vitesse
      // sur les planches.
      const glisse = 1 - Math.pow(1 - k, 3);
      g.position.x = depX.current * (1 - glisse * 0.72);
      g.position.z = depZ.current * (1 - glisse * 0.72);
      g.position.y = SOL + RAYON * 0.62 + hauteurRebond(k, 1.7);
      // Le roulis s'éteint au fil des rebonds, et la face choisie prend
      // le dessus sur la dernière arche.
      const doux = 1 - Math.pow(1 - k, 3.2);
      const roulis = new THREE.Quaternion()
        .setFromAxisAngle(axe.current, (1 - doux) * Math.PI * 2 * tours.current);
      const posee = new THREE.Quaternion()
        .slerpQuaternions(depart.current, cible.current, doux);
      g.quaternion.copy(roulis.multiply(posee));
      if (k >= 1) {
        g.quaternion.copy(cible.current);
        g.position.set(0, SOL + RAYON * 0.62, 0);
        phase.current = 'pose';
        onPose();
      }
      return;
    }
    g.position.y = SOL + RAYON * 0.62 + Math.sin(t * 1.2) * 0.015;
  });

  return (
    <group ref={groupe}>
      <mesh geometry={geo}>
        <meshPhysicalMaterial
          map={peinture} metalness={0.04} roughness={0.46}
          clearcoat={0.18} clearcoatRoughness={0.5}
        />
      </mesh>
      <lineSegments geometry={aretes}>
        <lineBasicMaterial color="#3a1109" />
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
      style={{ background: 'rgba(var(--sk-deep-rgb), 0.45)' }}
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
          borderColor: critique ? 'rgba(var(--sk-glow-rgb),0.85)'
            : echec ? 'rgba(160,50,40,0.8)' : 'rgba(var(--sk-glow-rgb),0.32)',
          background: 'radial-gradient(circle at 40% 28%, rgba(var(--sk-glow-rgb),0.14), rgba(18,8,6,0.95) 72%)',
          boxShadow: critique ? '0 0 42px rgba(var(--sk-glow-rgb),0.45)'
            : echec ? '0 0 34px rgba(160,50,40,0.4)' : 'none',
        }}
      >
        {/* La caméra plonge sur la table : la face gagnante se lit sur
            le dessus du dé (Alex, 2026-08-23). */}
        <Canvas camera={{ position: [0, 4.3, 4.5], fov: 38 }} dpr={[1, 1.6]}>
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
            : echec ? '#c85a48' : 'rgba(var(--sk-parchment-rgb),0.45)',
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
