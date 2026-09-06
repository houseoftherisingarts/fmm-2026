import React, { useEffect, useState } from 'react';
import PieceMontpellois from '../boutique/PieceMontpellois';
import { suivreMaBourse, type Bourse } from '../../firebase/montpellois';
import { suivreMaBourseGuilde, type BourseGuilde } from '../../firebase/guildeMonnaie';
import { nomMonnaie, type Guilde } from '../../firebase/guildes';
import type { Lang } from '../../content';

// ─── Les deux bourses, en tête de la page du groupe ──────────────────
// À gauche le Montpellois, qui vaut partout sur le site. À droite la
// pièce du groupe, qui ne vaut que chez lui. Les deux se lisent d'un
// coup d'œil, sans descendre jusqu'au trésor.

const Jeton: React.FC<{
  emblème: React.ReactNode;
  montant: number;
  legende: string;
}> = ({ emblème, montant, legende }) => (
  <span
    className="inline-flex items-center gap-3 px-4 py-2.5 rounded-card"
    style={{
      background: 'rgba(var(--sk-deep-rgb),0.5)',
      border: '1px solid rgba(var(--sk-parchment-rgb),0.14)',
    }}
  >
    {emblème}
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
        emblème={<PieceMontpellois size={26} image />}
        montant={bourse?.solde ?? 0}
        legende="Montpellois"
      />
      <Jeton
        emblème={
          <span
            aria-hidden
            className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-sm shrink-0"
            style={{
              background: 'rgba(var(--sk-gilt-rgb),0.16)',
              border: '1px solid rgba(var(--sk-gilt-rgb),0.45)',
              color: 'var(--sk-gilt)',
            }}
          >
            {guilde.monnaie?.glyphe || '◎'}
          </span>
        }
        montant={pieces?.solde ?? 0}
        legende={nomMonnaie(guilde, lang)}
      />
    </div>
  );
};

export default SoldePieces;
