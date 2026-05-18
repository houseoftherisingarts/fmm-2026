import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Real WebGL 3D scene for the WelcomePage hero ───────────────────
// Five floating "coin/card" planes in a fan formation, gently orbiting
// a central spark light. Camera parallaxes with mouse position. Custom
// brass-tinted lighting for the Caravanes & Saltimbanques mood.
//
// Lean: no @react-three/drei dependency, just bare R3F + three.

interface SceneProps { coinTextureUrl: string }

const Scene3D: React.FC<SceneProps> = ({ coinTextureUrl }) => (
  <Canvas
    dpr={[1, 2]}
    camera={{ position: [0, 0, 6], fov: 50 }}
    gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
    style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
  >
    <Suspense fallback={null}>
      <ambientLight intensity={0.55} color="#F4EFE3" />
      <pointLight position={[0, 0, 5]} intensity={6} color="#E8B86A" distance={20} decay={1.4} />
      <pointLight position={[-4, 2.5, 3]} intensity={3} color="#B08D3A" distance={14} decay={1.6} />
      <pointLight position={[4, -2.5, 4]} intensity={2} color="#6B1F1F" distance={14} decay={1.8} />
      <CameraParallax />
      <CoinFan textureUrl={coinTextureUrl} />
      <CenterSpark />
    </Suspense>
  </Canvas>
);

// ── Camera parallax — gentle tilt following mouse ──
const CameraParallax: React.FC = () => {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });

  // Listen on window because the canvas has pointerEvents:none.
  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useFrame(() => {
    // Lerp camera toward target tilt for buttery smoothness.
    const targetX = mouse.current.x * 0.6;
    const targetY = -mouse.current.y * 0.4;
    camera.position.x += (targetX - camera.position.x) * 0.04;
    camera.position.y += (targetY - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
  });
  return null;
};

// ── Five coin planes in a fan, orbiting slowly ──
const CoinFan: React.FC<{ textureUrl: string }> = ({ textureUrl }) => {
  const tex = useLoader(THREE.TextureLoader, textureUrl);
  // sRGB color so the texture renders authentically (brass / metallic look).
  tex.colorSpace = THREE.SRGBColorSpace;

  const group = useRef<THREE.Group>(null!);
  const COUNT: number = 5;

  // Per-coin idle bob phase
  const phases = useMemo(() => Array.from({ length: COUNT }, (_, i) => i * 1.3), []);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    // Slow group sway
    group.current.rotation.y = Math.sin(t * 0.18) * 0.18;
    group.current.children.forEach((mesh, i) => {
      // Independent gentle bob + spin
      mesh.position.y = Math.sin(t * 0.6 + phases[i]) * 0.18;
      mesh.rotation.y = Math.sin(t * 0.25 + phases[i]) * 0.4;
    });
  });

  // Fan layout — wide arc dropped into the LOWER half of the viewport
  // so the title + countdown + CTAs read clearly above. Each card tilts
  // outward (rotation Y based on signed x) so light catches the front
  // facets and the inward edges fall into shadow → real depth.
  return (
    <group ref={group} position={[0, -1.6, 0]}>
      {Array.from({ length: COUNT }).map((_, i) => {
        const t = COUNT === 1 ? 0.5 : i / (COUNT - 1);
        const x = (-1 + t * 2) * 3.4;             // wider — clears the center
        const y = Math.abs(t - 0.5) * 0.5;        // slight arc upward at edges
        const z = -Math.abs(t - 0.5) * 1.6;       // edges recede
        const baseRot = (-1 + t * 2) * -0.55;     // outer cards face inward
        return (
          <mesh key={i} position={[x, y, z]} rotation={[-0.18, baseRot, 0]}>
            <planeGeometry args={[1.0, 1.4]} />
            <meshStandardMaterial
              map={tex}
              transparent
              metalness={0.95}
              roughness={0.22}
              emissive="#B08D3A"
              emissiveIntensity={0.45}
              opacity={0.92}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
};

// ── Central pulsing spark ──
const CenterSpark: React.FC = () => {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const s = 0.18 + Math.sin(t * 2.6) * 0.04 + Math.sin(t * 5.1) * 0.025;
    ref.current.scale.setScalar(s);
  });
  // Move the spark down into the fan so it reads as a flame at the
  // base of the cards rather than dominating the center.
  return (
    <mesh ref={ref} position={[0, -1.6, 1]}>
      <sphereGeometry args={[1, 24, 24]} />
      <meshBasicMaterial color="#FFD789" transparent opacity={0.7} />
    </mesh>
  );
};

export default Scene3D;
