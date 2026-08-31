import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ArrowUpRight } from 'lucide-react';
import { sonnerBadge } from '../../lib/fanfare';

// ─── L'affiche de la prise ──────────────────────────────────────────
// À chaque acquisition à la boutique (skin, dos de carte, ambiance,
// album), la même affiche que pour un badge se lève au centre de
// l'écran, avec l'image de l'objet et le son du succès, et dit où
// l'objet est allé : dans le coffre (Alex, 2026-08-31).

export interface Prise {
  /** Le nom tel qu'il s'affiche : « Le skin Hiver argenté ». */
  nom: string;
  /** L'image de l'objet; à défaut, le glyphe. */
  image?: string;
  glyphe?: string;
  /** Portrait (dos de carte) ou carré (skin, ambiance). */
  portrait?: boolean;
  /** Remplace « a été ajouté à votre coffre », déjà traduit par
   *  l'appelant : les Montpellois d'une recharge vont à la bourse. */
  texte?: string;
}

const AffichePrise: React.FC<{ prise: Prise | null; onFermer: () => void; lienCoffre: string; fr: boolean }> = ({ prise, onFermer, lienCoffre, fr }) => {
  useEffect(() => {
    if (!prise) return;
    sonnerBadge();
    const minuteur = window.setTimeout(onFermer, 8000);
    return () => window.clearTimeout(minuteur);
  }, [prise, onFermer]);

  return (
    <AnimatePresence>
      {prise && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center px-4 pointer-events-none"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div
            role="status" aria-live="polite"
            className="pointer-events-auto relative w-full max-w-md rounded-lg-card border border-brass/40 text-center px-7 py-9 md:px-9"
            style={{
              background: 'linear-gradient(165deg, rgba(var(--sk-slate-rgb),0.94), rgba(var(--sk-navy-deep-rgb),0.2)), linear-gradient(165deg, rgba(24,12,8,0.94), rgba(8,3,5,0.97))',
              backdropFilter: 'blur(14px)',
              boxShadow: '0 30px 90px rgba(0,0,0,0.65), 0 0 60px rgba(var(--sk-glow-rgb),0.12) inset',
            }}
            initial={{ scale: 0.86, y: 18, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          >
            <button
              type="button" onClick={onFermer}
              aria-label={fr ? 'Fermer' : 'Close'}
              className="absolute top-3 right-3 p-2 rounded-full text-ivory-soft/50 hover:text-ivory transition-colors"
            >
              <X size={16} />
            </button>

            <motion.div
              className={`mx-auto mb-5 overflow-hidden ${prise.portrait ? 'w-24 h-40 md:w-28 md:h-48 rounded-[6px]' : 'w-28 h-28 md:w-32 md:h-32 rounded-[15px]'}`}
              style={{ boxShadow: '0 0 34px rgba(var(--sk-glow-rgb),0.35), 0 12px 30px rgba(0,0,0,0.6)', border: '1px solid rgba(var(--sk-gilt-rgb),0.55)' }}
              initial={{ rotate: -8, scale: 0.7 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.08 }}
            >
              {prise.image ? (
                <img src={prise.image} alt="" aria-hidden className="w-full h-full object-cover" />
              ) : (
                <span aria-hidden className="w-full h-full flex items-center justify-center text-6xl" style={{ color: 'var(--sk-gilt)' }}>
                  {prise.glyphe ?? '✦'}
                </span>
              )}
            </motion.div>

            <p className="font-sans uppercase tracking-[0.28em] text-[10px] text-ivory-soft/60 mb-2">
              {fr ? 'Félicitations' : 'Congratulations'}
            </p>
            <h2 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-3">
              {prise.nom}
            </h2>
            <div className="divider-brass w-16 mx-auto mb-4" />
            <p className="font-editorial text-sm md:text-base text-ivory-soft leading-relaxed">
              {prise.texte ?? (fr ? 'a été ajouté à votre coffre.' : 'has been added to your vault.')}
            </p>

            <Link
              to={lienCoffre}
              onClick={onFermer}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full border border-brass/50 font-sans uppercase tracking-[0.2em] text-[11px] text-ivory hover:bg-brass/15 transition-colors"
            >
              {fr ? 'Ouvrir mon coffre' : 'Open my vault'} <ArrowUpRight size={13} />
            </Link>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AffichePrise;
