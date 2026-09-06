import React, { useEffect, useState } from 'react';
import PieceMontpellois from '../boutique/PieceMontpellois';
import { suivreMaBourse, type Bourse } from '../../firebase/montpellois';
import { suivreMaBourseGuilde, type BourseGuilde } from '../../firebase/guildeMonnaie';
import { imageMonnaie, nomMonnaie, type Guilde } from '../../firebase/guildes';
import type { Lang } from '../../content';

// ─── La pièce du groupe ──────────────────────────────────────────────
// Partout où la pièce paraît (pastille de l'en-tête, Ma bourse, boutons
// Acheter, marché, registre), c'est l'image ronde qui se montre : celle
// que le chef a téléversée, ou la pièce par défaut du site. Le glyphe
// ne revient que si l'image ne charge pas (addendum du 6 septembre
// 2026, ordre 4). Même patron que PieceMontpellois.
export const PieceGuilde: React.FC<{
  guilde: Pick<Guilde, 'monnaie'>;
  size?: number;
  className?: string;
}> = ({ guilde, size = 26, className = '' }) => {
  const src = imageMonnaie(guilde);
  const [echec, setEchec] = useState(false);
  useEffect(() => { setEchec(false); }, [src]);

  if (echec) {
    return (
      <span
        aria-hidden
        className={`rounded-full inline-flex items-center justify-center shrink-0 ${className}`}
        style={{
          width: size, height: size, fontSize: size * 0.55,
          background: 'rgba(var(--sk-gilt-rgb),0.16)',
          border: '1px solid rgba(var(--sk-gilt-rgb),0.45)',
          color: 'var(--sk-gilt)',
        }}
      >
        {guilde.monnaie?.glyphe || '◎'}
      </span>
    );
  }
  return (
    <img
      src={src} alt="" width={size} height={size} loading="lazy"
      className={`rounded-full object-contain shrink-0 ${className}`}
      style={{ width: size, height: size, filter: 'drop-shadow(0 0 10px rgba(var(--sk-gilt-rgb),0.35))' }}
      onError={() => setEchec(true)}
    />
  );
};

// ─── Les deux bourses, en tête de la page du groupe ──────────────────
// À gauche le Montpellois, qui vaut partout sur le site. À droite la
// pièce du groupe, qui ne vaut que chez lui. Les deux se lisent d'un
// coup d'œil, sans descendre jusqu'au trésor.

const Jeton: React.FC<{
  embleme: React.ReactNode;
  montant: number;
  legende: string;
}> = ({ embleme, montant, legende }) => (
  <span
    className="inline-flex items-center gap-3 px-4 py-2.5 rounded-card"
    style={{
      background: 'rgba(var(--sk-deep-rgb),0.5)',
      border: '1px solid rgba(var(--sk-parchment-rgb),0.14)',
    }}
  >
    {embleme}
    <span className="leading-none">
      <span className="block font-display text-xl text-ivory tabular-nums leading-none">{montant}</span>
      <span
        className="block font-sans uppercase tracking-[0.2em] text-[9px] mt-1"
        style={{ color: 'rgba(var(--sk-parchment-rgb),0.55)' }}
      >
        {legende}
      </span>
    </span>
  </span>
);

const SoldePieces: React.FC<{ guilde: Guilde; uid: string; lang: Lang }> = ({ guilde, uid, lang }) => {
  const [bourse, setBourse] = useState<Bourse | null>(null);
  const [pieces, setPieces] = useState<BourseGuilde | null>(null);

  useEffect(() => suivreMaBourse(uid, setBourse), [uid]);
  useEffect(() => suivreMaBourseGuilde(guilde.id, uid, setPieces), [guilde.id, uid]);

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <Jeton
        embleme={<PieceMontpellois size={26} image />}
        montant={bourse?.solde ?? 0}
        legende="Montpellois"
      />
      <Jeton
        embleme={<PieceGuilde guilde={guilde} size={26} />}
        montant={pieces?.solde ?? 0}
        legende={nomMonnaie(guilde, lang)}
      />
    </div>
  );
};

export default SoldePieces;
