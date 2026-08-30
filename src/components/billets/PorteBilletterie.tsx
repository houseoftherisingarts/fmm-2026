import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, X, UserPlus, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/AppContext';
import { lienBilletterie, RABAIS_MEMBRE, EVENEMENT_PORTE } from '../../lib/billetterie';

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
  const { user, openSignIn } = useAuth();
  // Le compte vient d'être créé pendant que la porte était ouverte :
  // la porte change de visage et offre le passage vers la campagne des
  // membres (Alex, 2026-08-28).
  const [attendaitCompte, setAttendaitCompte] = React.useState(false);
  const compteFrais = attendaitCompte && Boolean(user);

  const continuerSansCompte = () => {
    onFermer();
    window.location.href = lienBilletterie(false);
  };

  const creerUnCompte = () => {
    setAttendaitCompte(true);
    openSignIn();
  };

  const versMesBillets = () => {
    onFermer();
    window.location.href = lienBilletterie(true);
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

            {compteFrais ? (
              <>
                <h2 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-4">
                  {fr ? 'Votre compte est ouvert' : 'Your account is open'}
                </h2>
                <p className="font-editorial text-[15px] text-ivory-soft leading-relaxed mb-7">
                  {fr
                    ? `Le rabais de ${RABAIS_MEMBRE} $ par billet vous suit dès maintenant.`
                    : `The ${RABAIS_MEMBRE} dollar discount per ticket follows you from now on.`}
                </p>
                <button type="button" onClick={versMesBillets}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
                  <Ticket size={15} /> {fr ? 'Continuer vers mes billets' : 'Continue to my tickets'} <ArrowUpRight size={13} />
                </button>
              </>
            ) : (
              <>
                <h2 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-4">
                  {fr ? `Économisez ${RABAIS_MEMBRE} $ en devenant membre` : `Save ${RABAIS_MEMBRE} dollars by becoming a member`}
                </h2>
                <p className="font-editorial text-[15px] text-ivory-soft leading-relaxed mb-7">
                  {fr
                    ? `Faites-vous un profil, et chaque billet vous coûte ${RABAIS_MEMBRE} $ de moins. Le compte se crée en une minute.`
                    : `Create a profile, and every ticket costs you ${RABAIS_MEMBRE} dollars less. The account takes a minute.`}
                </p>

                <div className="flex flex-col gap-2.5">
                  <button type="button" onClick={creerUnCompte}
                          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
                    <UserPlus size={15} /> {fr ? 'Oui, je me fais un profil' : 'Yes, create my profile'}
                  </button>
                  <button type="button" onClick={continuerSansCompte}
                          className="inline-flex items-center justify-center gap-2 px-6 py-3 font-sans uppercase tracking-wider text-xs text-ivory-soft/70 hover:text-ivory transition rounded-card"
                          style={{ border: '1px solid rgba(244,239,227,0.18)' }}>
                    {fr ? 'Non merci, je paie le plein prix' : 'No thanks, I pay full price'} <ArrowUpRight size={13} />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

// ─── La porte globale ────────────────────────────────────────────────
// Montée UNE fois dans App, sur toutes les routes (la NavBar est absente
// des accueils immersifs). N'importe quel bouton « billets » l'ouvre en
// passant par ouvrirBilletterie() de lib/billetterie.
export const PorteBilletterieGlobale: React.FC = () => {
  const { lang } = useUI();
  const [ouvert, setOuvert] = React.useState(false);

  React.useEffect(() => {
    const ouvrir = () => setOuvert(true);
    window.addEventListener(EVENEMENT_PORTE, ouvrir);
    return () => window.removeEventListener(EVENEMENT_PORTE, ouvrir);
  }, []);

  return <PorteBilletterie ouvert={ouvert} onFermer={() => setOuvert(false)} lang={lang} />;
};

export default PorteBilletterie;
