import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  SECTIONS, NIVEAUX, PROFONDEURS, type Section, type Niveau, type Profondeur,
} from '../../../../firebase/inventaire';

// ─── Le container en trois dimensions ────────────────────────────────
// Vu de la porte : les tablettes de gauche (CG), celles du fond (CF) et
// celles de droite (CD). Chaque case porte une petite pile de caisses,
// une par objet rangé (cinq au plus), et des caisses translucides pour
// ce qui est sorti. On tourne la scène à la souris, on zoome à la
// molette, on clique une case pour filtrer la liste. Pas de drei :
// R3F et three nus, comme la scène de l'accueil.

export interface Compte { total: number; sortis: number }
interface Props {
  comptes: Record<string, Compte>;
  selection: string | null;
  survol?: string | null;
  onSelect: (code: string | null) => void;
}

// Dimensions intérieures d'un container de 20 pieds, en mètres.
const L = 5.9, W = 2.35, H = 2.4;
const PROF_TABLETTE = 0.6;
const Y_NIVEAU: Record<Niveau, number> = { 1: 1.78, 2: 1.2, 3: 0.62, 4: 0.02 };

const BRASS = '#B08D3A';
const BRASS_HI = '#E4C776';
const BLUSH = '#D87B8E';
const STEEL = '#2E3E52';
// Alex, 9 sept 2026 : ambre du canon (var(--color-amber-glow)), réservé
// au survol depuis la liste pour qu'il se distingue de l'or de la sélection.
const AMBRE = '#E8B14A';

interface Case { code: string; section: Section; niveau: Niveau; profondeur: Profondeur; pos: [number, number, number]; taille: [number, number] }

function cases(): Case[] {
  const out: Case[] = [];
  const zPorte = L / 2, zFond = -L / 2 + PROF_TABLETTE;
  const longueurCote = zPorte - zFond;
  const seg = longueurCote / 4;
  for (const section of SECTIONS) {
    if (section === 'CF') {
      // Une seule tablette et le sol, sans profondeur : deux cases pleine largeur.
      for (const niveau of [1, 4] as const) {
        out.push({ code: `CF${niveau}`, section, niveau, profondeur: 'A', pos: [0, niveau === 1 ? 1.15 : Y_NIVEAU[4], -L / 2 + PROF_TABLETTE / 2], taille: [W - 2 * PROF_TABLETTE, PROF_TABLETTE] });
      }
      continue;
    }
    for (const niveau of NIVEAUX) for (const [i, profondeur] of PROFONDEURS.entries()) {
      const y = Y_NIVEAU[niveau];
      const x = section === 'CG' ? -W / 2 + PROF_TABLETTE / 2 : W / 2 - PROF_TABLETTE / 2;
      const z = zPorte - seg * (i + 0.5);
      out.push({ code: `${section}${niveau}${profondeur}`, section, niveau, profondeur, pos: [x, y, z], taille: [PROF_TABLETTE, seg] });
    }
  }
  return out;
}

const CASES = cases();

const Pile: React.FC<{ n: number; sortis: number; taille: [number, number]; y: number }> = ({ n, sortis, taille, y }) => {
  const boites = Math.min(5, n);
  const w = taille[0] * 0.55, d = taille[1] * 0.55, h = 0.11;
  return (
    <group position={[0, y + 0.02, 0]}>
      {Array.from({ length: boites }, (_, i) => {
        const sortie = i >= boites - Math.min(boites, sortis);
        return (
          <mesh key={i} position={[0, h / 2 + i * (h + 0.015), 0]} castShadow>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial
              color={sortie ? BLUSH : BRASS}
              transparent={sortie}
              opacity={sortie ? 0.35 : 1}
              roughness={0.55}
              metalness={sortie ? 0 : 0.35}
            />
          </mesh>
        );
      })}
    </group>
  );
};

const CaseMesh: React.FC<{ c: Case; compte: Compte; selectionnee: boolean; enSurvol: boolean; sombre: boolean; reduit: boolean; onSelect: () => void; onHover: (on: boolean) => void }> =
  ({ c, compte, selectionnee, enSurvol, sombre, reduit, onSelect, onHover }) => {
    const [x, y, z] = c.pos;
    const [w, d] = c.taille;
    const mat = useRef<THREE.MeshStandardMaterial>(null);
    // La case trouvée depuis la liste respire en ambre; à l'arrêt du
    // mouvement demandé, l'émission reste fixe au lieu de pulser.
    useFrame(({ clock }) => {
      if (!mat.current || !enSurvol) return;
      const t = reduit ? 0.65 : 0.35 + (Math.sin(clock.elapsedTime * 2.6) * 0.5 + 0.5) * 0.55;
      mat.current.emissive.set(AMBRE);
      mat.current.emissiveIntensity = selectionnee ? Math.max(0.6, t) : t;
    });
    return (
      <group position={[x, 0, z]}>
        <mesh
          position={[0, y, 0]}
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          onPointerOver={(e) => { e.stopPropagation(); onHover(true); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { onHover(false); document.body.style.cursor = ''; }}
        >
          <boxGeometry args={[w * 0.96, 0.03, d * 0.96]} />
          <meshStandardMaterial
            ref={mat}
            color={selectionnee ? BRASS_HI : compte.total ? '#3A4C60' : STEEL}
            emissive={selectionnee ? BRASS : '#000000'}
            emissiveIntensity={selectionnee ? 0.6 : 0}
            transparent
            opacity={sombre ? 0.35 : 0.95}
            roughness={0.7}
            metalness={0.4}
          />
        </mesh>
        {enSurvol && <pointLight position={[0, y + 0.5, 0]} color={AMBRE} intensity={5} distance={2.2} decay={1.8} />}
        {compte.total > 0 && <Pile n={compte.total} sortis={compte.sortis} taille={[w, d]} y={y} />}
      </group>
    );
  };

const Coque: React.FC = () => (
  <group>
    {/* plancher */}
    <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[W, L]} />
      <meshStandardMaterial color="#0B1520" roughness={0.9} />
    </mesh>
    {/* murs : fond, gauche, droite, en tôle ondulée suggérée par la couleur */}
    <mesh position={[0, H / 2, -L / 2]}>
      <planeGeometry args={[W, H]} />
      <meshStandardMaterial color="#132131" side={THREE.DoubleSide} roughness={0.85} />
    </mesh>
    <mesh position={[-W / 2, H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[L, H]} />
      <meshStandardMaterial color="#101C2A" side={THREE.DoubleSide} transparent opacity={0.85} roughness={0.85} />
    </mesh>
    <mesh position={[W / 2, H / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
      <planeGeometry args={[L, H]} />
      <meshStandardMaterial color="#101C2A" side={THREE.DoubleSide} transparent opacity={0.85} roughness={0.85} />
    </mesh>
    {/* montants des étagères */}
    {[-W / 2 + 0.02, -W / 2 + PROF_TABLETTE - 0.02, W / 2 - 0.02, W / 2 - PROF_TABLETTE + 0.02].flatMap((x) =>
      [L / 2 - 0.03, -L / 2 + PROF_TABLETTE + 0.03].map((z) => (
        <mesh key={`${x}-${z}`} position={[x, H / 2 - 0.2, z]}>
          <boxGeometry args={[0.04, H - 0.4, 0.04]} />
          <meshStandardMaterial color="#5A6675" metalness={0.6} roughness={0.4} />
        </mesh>
      )),
    )}
  </group>
);

const Scene: React.FC<Props & { orbite: React.MutableRefObject<{ yaw: number; pitch: number; zoom: number }>; onHover: (code: string | null) => void; reduit: boolean }> =
  ({ comptes, selection, survol, onSelect, orbite, onHover, reduit }) => {
    const groupe = useRef<THREE.Group>(null);
    const cam = useRef<{ yaw: number; pitch: number; zoom: number }>({ yaw: 0, pitch: 0, zoom: 1 });
    useFrame(({ camera }) => {
      const cible = orbite.current;
      const c = cam.current;
      c.yaw += (cible.yaw - c.yaw) * 0.12;
      c.pitch += (cible.pitch - c.pitch) * 0.12;
      c.zoom += (cible.zoom - c.zoom) * 0.12;
      if (groupe.current) { groupe.current.rotation.y = c.yaw; groupe.current.rotation.x = c.pitch; }
      camera.position.set(0, 2.6 * c.zoom, 7.6 * c.zoom);
      camera.lookAt(0, 0.9, 0);
    });
    const vide: Compte = { total: 0, sortis: 0 };
    return (
      <group ref={groupe} position={[0, 0, 0]}>
        <Coque />
        {CASES.map((c) => (
          <CaseMesh
            key={c.code}
            c={c}
            compte={comptes[c.code] ?? vide}
            selectionnee={selection === c.code}
            enSurvol={!!survol && c.code.startsWith(survol)}
            sombre={!!selection && selection !== c.code && !(selection.length < 4 && c.code.startsWith(selection))}
            reduit={reduit}
            onSelect={() => onSelect(selection === c.code ? null : c.code)}
            onHover={(on) => onHover(on ? c.code : null)}
          />
        ))}
      </group>
    );
  };

const Container3D: React.FC<Props> = (props) => {
  const orbite = useRef({ yaw: 0.22, pitch: 0.16, zoom: 0.95 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  // pointe : la case que la souris touche DANS le canevas (infobulle).
  // props.survol : la case allumée depuis la liste, peu importe où
  // pointe la souris — deux choses distinctes.
  const [pointe, setPointe] = useState<string | null>(null);
  const comptePointe = useMemo(() => (pointe ? props.comptes[pointe] : null), [pointe, props.comptes]);
  const reduit = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);

  return (
    <div
      className="relative w-full rounded-card overflow-hidden select-none touch-none"
      style={{ height: 380, background: 'radial-gradient(120% 90% at 50% 100%, #142334 0%, #070D14 70%)', border: '1px solid var(--admin-line)' }}
      onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y;
        drag.current = { x: e.clientX, y: e.clientY };
        orbite.current.yaw += dx * 0.008;
        orbite.current.pitch = Math.max(-0.15, Math.min(0.6, orbite.current.pitch + dy * 0.005));
      }}
      onPointerUp={() => { drag.current = null; }}
      onPointerCancel={() => { drag.current = null; }}
      onWheel={(e) => { orbite.current.zoom = Math.max(0.55, Math.min(1.6, orbite.current.zoom + e.deltaY * 0.0012)); }}
    >
      <Canvas
        dpr={[1, 1.5]}
        shadows
        camera={{ position: [0, 2.6, 7.6], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onPointerMissed={() => props.onSelect(null)}
      >
        <ambientLight intensity={1.1} color="#F4EFE3" />
        <hemisphereLight args={['#DCE6F2', '#2A1E10', 0.9]} />
        <pointLight position={[0, 2.2, 2.4]} intensity={14} color="#E8B86A" distance={14} decay={1.5} castShadow />
        <pointLight position={[0, 2.1, -1.6]} intensity={8} color="#B9CCE6" distance={10} decay={1.6} />
        <pointLight position={[0, 1.4, 5.5]} intensity={6} color="#F4EFE3" distance={12} decay={1.6} />
        <Scene {...props} orbite={orbite} onHover={setPointe} reduit={reduit} />
      </Canvas>
      <div className="pointer-events-none absolute left-3 top-3 hidden sm:flex gap-2 whitespace-nowrap font-sans text-[10px] uppercase tracking-[0.25em]" style={{ color: 'var(--admin-text-mute)' }}>
        <span>Gauche (CG)</span><span>·</span><span>Fond (CF)</span><span>·</span><span>Droit (CD)</span>
      </div>
      <div className="pointer-events-none absolute right-3 bottom-3 hidden sm:block font-sans text-[10px] uppercase tracking-[0.25em]" style={{ color: 'var(--admin-text-mute)' }}>
        Vue de la porte
      </div>
      <div className="pointer-events-none absolute left-3 bottom-3 right-3 sm:right-32 font-sans text-xs" style={{ color: 'var(--admin-text-soft)' }}>
        {survol
          ? <><b style={{ color: 'var(--admin-accent)' }}>{survol}</b> · {compteSurvol?.total ?? 0} objet{(compteSurvol?.total ?? 0) > 1 ? 's' : ''}{compteSurvol?.sortis ? `, ${compteSurvol.sortis} sorti${compteSurvol.sortis > 1 ? 's' : ''}` : ''}</>
          : 'Glissez pour tourner, molette pour zoomer, cliquez une case.'}
      </div>
    </div>
  );
};

export default Container3D;
