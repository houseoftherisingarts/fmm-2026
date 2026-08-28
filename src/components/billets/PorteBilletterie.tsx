import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, X, UserPlus, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { lienBilletterie, RABAIS_MEMBRE } from '../../lib/billetterie';

// ─── La porte de la billetterie ──────────────────────────────────────
// Alex, 2026-08-28 : le visiteur sans compte voit d'abord cette porte.
// Elle dit où il s'en va, et elle lui offre les cinq dollars de rabais
// par billet qui viennent avec un compte. Une personne déjà connectée
// ne la voit jamais : son bouton file droit sur la billetterie.

const PorteBilletterie: React.FC<{
  ouvert: boolean;
  onFermer: () => void;
  lang: 'FR' | 'EN';
}> = ({ ouvert, onFermer, lang }) => {
  const fr = lang === 'FR';
  const { openSignIn } = useAuth();

  const continuerSansCompte = () => {
    onFermer();
    window.location.href = lienBilletterie(false);
  };

  const creerUnCompte = () => {
    onFermer();
    openSignIn();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {ouvert && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: 'rgba(6,2,4,0.82)', backdropFilter: 'blur(6px)' }}
          onClick={onFermer}
          role="dialog" aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-lg-card p-7 md:p-9"
            style={{
              background: 'linear-gradient(150deg, rgba(38,12,18,0.97), rgba(16,4,8,0.97))',
              border: '1px solid rgba(216,176,90,0.4)',
              boxShadow: '0 40px 100px -40px rgba(0,0,0,0.95)',
            }}
          >
            <button type="button" onClick={onFermer} aria-label={fr ? 'Fermer' : 'Close'}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-ivory-soft/60 hover:text-ivory transition-colors">
              <X size={16} />
            </button>

            <span className="witcher-tile inline-flex mb-5" style={{ width: 52, height: 52 }}>
              <span className="witcher-tile-inner" style={{ color: '#D8B05A' }}><Ticket size={18} /></span>
            </span>

            <p className="witcher-stat-label mb-2">{fr ? 'La billetterie' : 'The box office'}</p>
            <h2 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-4">
              {fr ? `Prenez vos billets à ${RABAIS_MEMBRE} $ de moins` : `Get your tickets ${RABAIS_MEMBRE} dollars cheaper`}
            </h2>
            <p className="font-editorial text-[15px] text-ivory-soft leading-relaxed mb-7">
              {fr
                ? `Vous partez vers notre billetterie Zeffy. Les membres du festival paient ${RABAIS_MEMBRE} $ de moins par billet, et le compte se crée en une minute.`
                : `You are heading to our Zeffy box office. Festival members pay ${RABAIS_MEMBRE} dollars less per ticket, and the account takes a minute to create.`}
            </p>

            <div className="flex flex-col gap-2.5">
              <button type="button" onClick={creerUnCompte}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
                <UserPlus size={15} /> {fr ? `Créer mon compte et garder ${RABAIS_MEMBRE} $ par billet` : `Create my account and keep ${RABAIS_MEMBRE} dollars per ticket`}
              </button>
              <button type="button" onClick={continuerSansCompte}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 font-sans uppercase tracking-wider text-xs text-ivory-soft/70 hover:text-ivory transition rounded-card"
                      style={{ border: '1px solid rgba(244,239,227,0.18)' }}>
                {fr ? 'Continuer sans compte' : 'Continue without an account'} <ArrowUpRight size={13} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default PorteBilletterie;
