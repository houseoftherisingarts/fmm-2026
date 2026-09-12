// BadgeVexel — le sticker foil du pied de page, porté de
// xena-horizon-platform (3)/components/BadgeVexel.tsx. Un liseré découpé,
// un reflet holographique qui suit le pointeur, un léger basculement 3D : le
// même geste que les autocollants de collection, posé bien droit.
//
// Ne se rend QUE quand settings/vexel.partenaire.code existe dans le
// Firestore du site (écrit par PartenaireVexelPanneau au moment de
// l'inscription) : tant que le site n'a pas de représentant actif, ce
// composant ne rend rien. Le lien pointe vers la page publique du
// représentant, /r/CODE sur vexelwebstudio.com.
//
// Couleurs : aucune couleur Vexel en dur, tout passe par --pv-* (voir
// PartenaireVexelPanneau et README.md pour les redéfinir).
import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, type Firestore } from 'firebase/firestore';
import { BadgeCheck } from 'lucide-react';

const style = `
.pv-badge {
  --pv-fond: var(--couleur-surface, #101012);
  --pv-texte: var(--couleur-texte, #f2f2f2);
  --pv-muted: var(--couleur-muted, #9a9a9f);
  --pv-bordure: var(--couleur-bordure, rgba(255,255,255,0.16));
  --pv-accent: var(--couleur-accent, #d4af37);
  --pv-radius: var(--rayon-carte, 15px);
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 1rem;
  border-radius: var(--pv-radius);
  border: 1px solid var(--pv-bordure);
  background:
    radial-gradient(120% 120% at var(--mx, 30%) var(--my, 30%), color-mix(in srgb, var(--pv-accent) 35%, transparent) 0%, transparent 55%),
    color-mix(in srgb, var(--pv-fond) 88%, white 4%);
  color: var(--pv-texte);
  text-decoration: none;
  font-family: var(--police-corps, system-ui, sans-serif);
  transform: perspective(600px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
  transition: transform 0.15s ease-out;
}
.pv-badge:hover { border-color: var(--pv-accent); }
.pv-badge .pv-badge-texte { display: flex; flex-direction: column; line-height: 1.15; }
.pv-badge .pv-badge-kicker { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.16em; color: var(--pv-muted); }
.pv-badge .pv-badge-nom { font-size: 0.85rem; font-weight: 600; }
`;

interface ParametresVexel {
  partenaire?: { code?: string; lien?: string };
}

export interface BadgeVexelProps {
  /** L'instance Firestore déjà configurée du site hôte : ce composant ne
   * connaît aucune configuration Firebase, il lit seulement `settings/vexel`. */
  db: Firestore;
  className?: string;
}

export function BadgeVexel({ db, className = '' }: BadgeVexelProps) {
  const [code, setCode] = useState<string | null>(null);
  const [lien, setLien] = useState<string | null>(null);
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    return onSnapshot(
      doc(db, 'settings/vexel'),
      (snap) => {
        const p = (snap.exists() ? (snap.data() as ParametresVexel) : {}).partenaire;
        // Seul un code de la forme attendue passe; le lien se reconstruit
        // ici plutot que d'etre lu de la base, pour qu'aucune adresse
        // etrangere (javascript:, autre site) ne puisse etre servie au visiteur.
        const codeSur = typeof p?.code === 'string' && /^[A-Z0-9-]{4,24}$/.test(p.code) ? p.code : null;
        setCode(codeSur);
        setLien(codeSur ? `https://vexelwebstudio.com/r/${encodeURIComponent(codeSur)}` : null);
      },
      () => {
        setCode(null);
        setLien(null);
      },
    );
  }, [db]);

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

  if (!code) return null;

  return (
    <a
      ref={ref}
      href={lien ?? `https://vexelwebstudio.com/r/${code}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Partenaire officiel Vexel : en savoir plus"
      onPointerMove={suivre}
      onPointerLeave={relacher}
      className={`pv-badge ${className}`}
    >
      <style>{style}</style>
      <BadgeCheck size={20} aria-hidden style={{ color: 'var(--pv-accent)' }} />
      <span className="pv-badge-texte">
        <span className="pv-badge-kicker">Partenaire officiel</span>
        <span className="pv-badge-nom">Vexel</span>
      </span>
    </a>
  );
}

export default BadgeVexel;
