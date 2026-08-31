import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useUI } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { useBadges } from '../../contexts/BadgesContext';
import { sceauDe } from '../../firebase/badges';

// ─── L'annonce d'un badge ────────────────────────────────────────────
// Au centre de l'écran, un sceau qui se pose. Si la personne n'a pas de
// compte, l'annonce l'invite à se connecter pour réclamer son badge.

const TAILLE_FR: Record<string, string> = {
  petit: 'un petit prix', moyen: 'un prix moyen', grand: 'un grand prix',
};
const TAILLE_EN: Record<string, string> = {
  petit: 'a small prize', moyen: 'a middling prize', grand: 'a great prize',
};

const AnnonceBadge: React.FC = () => {
  const { annonce, fermerAnnonce } = useBadges();
  const { lang } = useUI();
  const { openSignIn } = useAuth();
  const fr = lang === 'FR';
  // Le sceau d'un badge tout neuf n'a pas encore été gravé (Alex,
  // 2026-08-28) : l'image 404 bascule sur le glyphe.
  const [sceauCasse, setSceauCasse] = useState(false);
  useEffect(() => { setSceauCasse(false); }, [annonce?.badge.id]);

  useEffect(() => {
    if (!annonce) return;
    const minuteur = window.setTimeout(fermerAnnonce, annonce.collection || annonce.grandChelem ? 11000 : 7000);
    return () => window.clearTimeout(minuteur);
  }, [annonce, fermerAnnonce]);

  return (
    <AnimatePresence>
      {annonce && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center px-4 pointer-events-none"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div
            role="status" aria-live="polite"
            className="pointer-events-auto relative w-full max-w-md rounded-lg-card border border-brass/40 text-center px-7 py-9 md:px-9"
            style={{
              background: 'linear-gradient(165deg, rgba(24,12,8,0.94), rgba(8,3,5,0.97))',
              backdropFilter: 'blur(14px)',
              boxShadow: '0 30px 90px rgba(0,0,0,0.65), 0 0 60px rgba(var(--sk-glow-rgb),0.12) inset',
            }}
            initial={{ scale: 0.86, y: 18, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          >
            <button
              type="button" onClick={fermerAnnonce}
              aria-label={fr ? 'Fermer' : 'Close'}
              className="absolute top-3 right-3 p-2 rounded-full text-ivory-soft/50 hover:text-ivory transition-colors"
            >
              <X size={16} />
            </button>

            <motion.div
              className="mx-auto mb-5 w-28 h-28 md:w-32 md:h-32"
              style={{ filter: 'drop-shadow(0 0 34px rgba(var(--sk-glow-rgb),0.35))' }}
              initial={{ rotate: -14, scale: 0.7 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.08 }}
            >
              {sceauCasse ? (
                <span aria-hidden className="w-full h-full flex items-center justify-center text-6xl" style={{ color: 'var(--sk-gilt)' }}>
                  {annonce.badge.glyphe}
                </span>
              ) : (
                <img src={sceauDe(annonce.badge.id)} alt="" aria-hidden
                     onError={() => setSceauCasse(true)}
                     className="w-full h-full object-contain" />
              )}
            </motion.div>

            <p className="font-sans uppercase tracking-[0.28em] text-[10px] text-ivory-soft/60 mb-2">
              {annonce.grandChelem
                ? (fr ? 'Tous les badges' : 'Every badge')
                : annonce.collection
                  ? (fr ? 'Collection complète' : 'Collection complete')
                  : (fr ? 'Vous avez gagné un badge' : 'You earned a badge')}
            </p>

            <h2 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-3">
              {fr ? annonce.badge.nomFR : annonce.badge.nomEN}
            </h2>
            <div className="divider-brass w-16 mx-auto mb-4" />
            <p className="font-editorial text-sm md:text-base text-ivory-soft leading-relaxed">
              {fr ? annonce.badge.texteFR : annonce.badge.texteEN}
            </p>

            {annonce.collection && !annonce.grandChelem && (
              <p className="mt-4 font-editorial text-sm text-ivory-soft/85 leading-relaxed">
                {fr
                  ? `La collection « ${annonce.collection.nomFR} » est complète. Elle vous vaut ${TAILLE_FR[annonce.collection.prix]}, que nous dévoilerons avant le festival.`
                  : `The “${annonce.collection.nomEN}” collection is complete. It earns you ${TAILLE_EN[annonce.collection.prix]}, revealed before the festival.`}
              </p>
            )}

            {annonce.grandChelem && (
              <p className="mt-4 font-editorial text-sm md:text-base leading-relaxed" style={{ color: 'var(--color-amber-glow)' }}>
                {fr
                  ? 'Vous avez réuni tous les badges du site. Le très grand prix vous attend, et nous le dévoilerons avant le festival.'
                  : 'You have gathered every badge on the site. The greatest prize is waiting, and we will reveal it before the festival.'}
              </p>
            )}

            {annonce.aReclamer && (
              <div className="mt-6">
                <p className="font-editorial text-sm text-ivory-soft/85 leading-relaxed mb-4">
                  {fr
                    ? 'Connectez-vous pour le réclamer. Des surprises attendent les personnes qui ont collecté tous les badges.'
                    : 'Sign in to claim it. Surprises are waiting for those who collect every badge.'}
                </p>
                <button
                  type="button"
                  onClick={() => { fermerAnnonce(); openSignIn(); }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-brass/50 font-sans uppercase tracking-[0.2em] text-[11px] text-ivory hover:bg-brass/15 transition-colors"
                >
                  {fr ? 'Réclamer mon badge' : 'Claim my badge'}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AnnonceBadge;
