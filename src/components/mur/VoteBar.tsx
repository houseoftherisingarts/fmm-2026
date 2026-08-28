import React, { useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

// ─── La barre de vote ──────────────────────────────────────────────
// Alex, 2026-08-28 : façon Reddit, pas façon Facebook. Une flèche vers
// le haut, le score, une flèche vers le bas; recliquer une flèche déjà
// active retire le vote. Au survol du score (et au focus clavier), une
// bulle liste qui a voté pour et qui a voté contre — chargée à la
// demande, jamais tant que personne ne regarde.
//
// Sert autant à la barre d'un billet (verticale sur bureau) qu'à celle
// d'un commentaire (toujours en ligne, plus petite).

const VoteBar: React.FC<{
  fr: boolean;
  pour: number;
  contre: number;
  score: number;
  monVote: 1 | -1 | 0;
  onVoter: (valeur: 1 | -1 | 0) => void;
  listerPour: () => Promise<string[]>;
  listerContre: () => Promise<string[]>;
  /** Colonne sur bureau, ligne sur mobile — le patron du billet. Un
   *  commentaire reste toujours en ligne (défaut). */
  vertical?: boolean;
  petit?: boolean;
}> = ({ fr, pour, contre, score, monVote, onVoter, listerPour, listerContre, vertical = false, petit = false }) => {
  const idBulle = useId();
  const [bulleOuverte, setBulleOuverte] = useState(false);
  const [nomsPour, setNomsPour] = useState<string[] | null>(null);
  const [nomsContre, setNomsContre] = useState<string[] | null>(null);
  const [chargement, setChargement] = useState(false);

  const ouvrirBulle = () => {
    setBulleOuverte(true);
    if (nomsPour === null && !chargement && (pour > 0 || contre > 0)) {
      setChargement(true);
      Promise.all([listerPour(), listerContre()])
        .then(([p, c]) => { setNomsPour(p); setNomsContre(c); })
        .finally(() => setChargement(false));
    }
  };

  const groupe = (titre: string, couleur: string, total: number, noms: string[] | null) => {
    if (total <= 0) return null;
    const affiches = noms || [];
    const reste = total - affiches.length;
    return (
      <div>
        <p className="font-sans uppercase tracking-[0.16em] text-[9px] mb-1" style={{ color: couleur }}>
          {titre} ({total})
        </p>
        <p className="font-editorial text-[12px] text-ivory-soft leading-snug">
          {affiches.join(', ')}
          {reste > 0 ? (fr ? ` et ${reste} autre${reste > 1 ? 's' : ''}` : ` and ${reste} more`) : ''}
        </p>
      </div>
    );
  };

  const tailleFleche = petit ? 12 : 16;

  return (
    <div className={`relative flex ${vertical ? 'flex-row sm:flex-col' : 'flex-row'} items-center gap-0.5`}>
      <button
        type="button"
        onClick={() => onVoter(monVote === 1 ? 0 : 1)}
        aria-label={fr ? 'Voter pour' : 'Upvote'}
        aria-pressed={monVote === 1}
        className="p-1 rounded-full transition-colors hover:bg-white/10"
        style={{ color: monVote === 1 ? '#D8B05A' : 'rgba(244,239,227,0.4)' }}
      >
        <ChevronUp size={tailleFleche} strokeWidth={2.5} />
      </button>

      <span
        tabIndex={0}
        aria-describedby={idBulle}
        onMouseEnter={ouvrirBulle}
        onMouseLeave={() => setBulleOuverte(false)}
        onFocus={ouvrirBulle}
        onBlur={() => setBulleOuverte(false)}
        className={`font-sans font-semibold tabular-nums px-0.5 cursor-default ${petit ? 'text-[11px]' : 'text-xs'}`}
        style={{ color: score > 0 ? '#D8B05A' : score < 0 ? '#E08A6E' : 'rgba(244,239,227,0.55)' }}
      >
        {score}
      </span>

      <button
        type="button"
        onClick={() => onVoter(monVote === -1 ? 0 : -1)}
        aria-label={fr ? 'Voter contre' : 'Downvote'}
        aria-pressed={monVote === -1}
        className="p-1 rounded-full transition-colors hover:bg-white/10"
        style={{ color: monVote === -1 ? '#E08A6E' : 'rgba(244,239,227,0.4)' }}
      >
        <ChevronDown size={tailleFleche} strokeWidth={2.5} />
      </button>

      <AnimatePresence>
        {bulleOuverte && (pour > 0 || contre > 0) && (
          <motion.div
            id={idBulle}
            role="tooltip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-30 left-1/2 -translate-x-1/2 top-full mt-1.5 w-56 rounded-card p-3 text-left pointer-events-none"
            style={{ background: 'rgba(16,4,8,0.96)', border: '1px solid rgba(216,176,90,0.3)', backdropFilter: 'blur(12px)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}
          >
            {chargement ? (
              <p className="font-sans text-[11px] text-ivory-soft/60">{fr ? 'Chargement…' : 'Loading…'}</p>
            ) : (
              <div className="space-y-2.5">
                {groupe(fr ? 'Pour' : 'For', '#D8B05A', pour, nomsPour)}
                {groupe(fr ? 'Contre' : 'Against', '#E08A6E', contre, nomsContre)}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VoteBar;
