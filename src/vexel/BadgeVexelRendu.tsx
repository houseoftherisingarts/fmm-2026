import { useCallback, useRef } from 'react';
import { BadgeCheck } from 'lucide-react';
import type { Fini } from './collants';

/**
 * Le rendu pur du badge « Partenaire officiel Vexel », sans aucune lecture
 * Firestore. `BadgeVexel` lit `settings/vexel` et lui passe la finition;
 * ce composant-ci ne fait que dessiner le collant tel qu'il paraîtra, avec
 * le fond, l'encre et le liseré de la finition, et le reflet foil seulement
 * quand la finition le demande. Le pointeur fait basculer le collant et
 * déplace le reflet, comme l'autocollant de collection.
 *
 * Ce fichier vit en deux copies strictement identiques : la source dans
 * `_vexel-base/src/vexel/BadgeVexelRendu.tsx`, la copie dans
 * `vexel-site/src/site/components/BadgeVexelRendu.tsx`. La vérification
 * `scripts/verif-collants.ts` échoue si elles divergent.
 */

const style = `
.bvr-badge {
  --mx: 30%; --my: 30%; --rx: 0deg; --ry: 0deg;
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 1rem;
  border-radius: 15px;
  color: var(--bvr-encre);
  background: var(--bvr-fond);
  box-shadow: 0 10px 24px -10px rgb(0 0 0 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.25);
  overflow: hidden;
  isolation: isolate;
  text-decoration: none;
  font-family: system-ui, sans-serif;
  transform: perspective(600px) rotateX(var(--rx)) rotateY(var(--ry));
  transition: transform 0.15s ease-out;
}
.bvr-badge::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: var(--bvr-lisere);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
.bvr-badge > * { position: relative; z-index: 1; }
.bvr-badge .bvr-sheen {
  position: absolute; inset: -40%; z-index: 0;
  pointer-events: none;
  background: repeating-conic-gradient(from 200deg at var(--mx) var(--my),
    #ff9ecb 0deg, #ffe08a 24deg, #9bffcf 48deg, #8ad4ff 72deg, #c9a4ff 96deg, #ff9ecb 120deg);
  opacity: 0.16;
  mix-blend-mode: color-dodge;
  filter: saturate(1.2) blur(2px);
  transition: opacity 260ms ease;
}
.bvr-badge:hover .bvr-sheen { opacity: 0.32; }
.bvr-badge .bvr-texte { display: flex; flex-direction: column; line-height: 1.15; }
.bvr-badge .bvr-kicker { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.16em; opacity: 0.78; }
.bvr-badge .bvr-nom { font-size: 0.85rem; font-weight: 600; }
@media (prefers-reduced-motion: reduce) { .bvr-badge { transform: none; transition: none; } }
`;

export interface BadgeVexelRenduProps {
  fini: Fini;
  code: string;
  nom: string;
  className?: string;
}

export function BadgeVexelRendu({ fini, code, nom, className = '' }: BadgeVexelRenduProps) {
  const ref = useRef<HTMLAnchorElement>(null);

  const suivre = useCallback((e: React.PointerEvent<HTMLAnchorElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
    el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    el.style.setProperty('--rx', `${((0.5 - y) * 8).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${((x - 0.5) * 10).toFixed(2)}deg`);
  }, []);

  const relacher = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--mx', '30%');
    el.style.setProperty('--my', '30%');
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  }, []);

  const lien = `https://vexelwebstudio.com/r/${encodeURIComponent(code)}`;

  return (
    <a
      ref={ref}
      href={lien}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Partenaire officiel Vexel : en savoir plus"
      onPointerMove={suivre}
      onPointerLeave={relacher}
      className={`bvr-badge ${className}`}
      style={
        {
          '--bvr-fond': fini.fond,
          '--bvr-encre': fini.encre,
          '--bvr-lisere': fini.lisere,
        } as React.CSSProperties
      }
    >
      <style>{style}</style>
      {fini.reflet ? <span aria-hidden className="bvr-sheen" /> : null}
      <BadgeCheck size={20} aria-hidden style={{ color: 'var(--bvr-encre)' }} />
      <span className="bvr-texte">
        <span className="bvr-kicker">Partenaire officiel</span>
        <span className="bvr-nom">{nom}</span>
      </span>
    </a>
  );
}

export default BadgeVexelRendu;
