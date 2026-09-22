import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Gift, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/AppContext';
import { sonnerFanfare } from '../../lib/fanfare';
import { marquerCadeauVu, suivreMesCadeaux, type Cadeau } from '../../firebase/cadeaux';

// ─── L'annonce d'un cadeau ───────────────────────────────────────────
// Même scène que l'annonce d'un badge : au centre de l'écran, par-dessus
// tout, avec la fanfare. Elle se lève à la connexion du membre qui a un
// cadeau pas encore vu, et se referme sur « Jouer maintenant » ou sur la
// croix; dans les deux cas le cadeau est marqué vu, il ne revient pas.
// Alex, 2026-09-22, pour le skin Hullsborg offert à Tristan.

// En dev, `?apercuCadeau=1` monte un cadeau fictif pour régler la scène
// sans compte : rien de tout ça n'existe dans le bundle de production.
const APERCU: Cadeau | null = import.meta.env.DEV
  && new URLSearchParams(window.location.search).has('apercuCadeau')
  ? {
    id: 'apercu', uid: 'apercu', vu: false,
    image: '/games/hnefatafl/vignettes/hullsborg.webp',
    titreFR: 'Le skin Hullsborg du hnefatafl', titreEN: 'The Hullsborg hnefatafl skin',
    texteFR: 'Tristan, vous avez reçu le skin Hullsborg pour le jeu de hnefatafl.',
    texteEN: 'Tristan, you have received the Hullsborg skin for the hnefatafl game.',
    message: 'Aweye donc bro, joueeeeee maintenant. J’ai upgradé le CPU, c’est plus dur. Alleeeeez!',
    de: 'Alex', lien: '/jeunesse/hnefatafl', boutonFR: 'Jouer maintenant', boutonEN: 'Play now',
  }
  : null;

const AnnonceCadeau: React.FC = () => {
  const { user } = useAuth();
  const { lang } = useUI();
  const navigate = useNavigate();
  const fr = lang === 'FR';
  const [cadeaux, setCadeaux] = useState<Cadeau[]>(APERCU ? [APERCU] : []);

  useEffect(() => {
    if (!user?.uid || APERCU) return;
    return suivreMesCadeaux(user.uid, setCadeaux);
  }, [user?.uid]);

  const cadeau = cadeaux[0] ?? null;

  // La fanfare sonne une fois par cadeau affiché, jamais à chaque rendu.
  const sonne = useRef<string | null>(null);
  useEffect(() => {
    if (!cadeau || sonne.current === cadeau.id) return;
    sonne.current = cadeau.id;
    sonnerFanfare();
  }, [cadeau]);

  const fermer = (puis?: () => void) => {
    if (!cadeau) return;
    setCadeaux((l) => l.filter((c) => c.id !== cadeau.id));
    if (cadeau.id !== 'apercu') void marquerCadeauVu(cadeau.id);
    puis?.();
  };

  return (
    <AnimatePresence>
      {cadeau && (
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
              type="button" onClick={() => fermer()}
              aria-label={fr ? 'Fermer' : 'Close'}
              className="absolute top-3 right-3 p-2 rounded-full text-ivory-soft/50 hover:text-ivory transition-colors"
            >
              <X size={16} />
            </button>

            <motion.div
              className="mx-auto mb-5 w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden border border-brass/50"
              style={{ boxShadow: '0 0 34px rgba(var(--sk-glow-rgb),0.35), 0 10px 30px rgba(0,0,0,0.6)' }}
              initial={{ rotate: -14, scale: 0.7 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.08 }}
            >
              {cadeau.image ? (
                <img src={cadeau.image} alt="" aria-hidden className="w-full h-full object-cover" />
              ) : (
                <span aria-hidden className="w-full h-full flex items-center justify-center" style={{ color: 'var(--sk-gilt)' }}>
                  <Gift size={56} />
                </span>
              )}
            </motion.div>

            <p className="font-sans uppercase tracking-[0.28em] text-[10px] text-ivory-soft/60 mb-2">
              {cadeau.de
                ? (fr ? `Un cadeau d’${cadeau.de}` : `A gift from ${cadeau.de}`)
                : (fr ? 'Vous avez reçu un cadeau' : 'You received a gift')}
            </p>

            <h2 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-3">
              {fr ? cadeau.titreFR : cadeau.titreEN}
            </h2>
            <div className="divider-brass w-16 mx-auto mb-4" />
            <p className="font-editorial text-sm md:text-base text-ivory-soft leading-relaxed">
              {fr ? cadeau.texteFR : cadeau.texteEN}
            </p>

            {cadeau.message && (
              <p className="mt-4 font-editorial text-sm md:text-base leading-relaxed" style={{ color: 'var(--color-amber-glow)' }}>
                « {cadeau.message} »
              </p>
            )}

            {cadeau.lien && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => fermer(() => navigate(cadeau.lien!))}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-brass/50 font-sans uppercase tracking-[0.2em] text-[11px] text-ivory hover:bg-brass/15 transition-colors"
                >
                  {fr ? (cadeau.boutonFR ?? 'Jouer maintenant') : (cadeau.boutonEN ?? 'Play now')}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AnnonceCadeau;
