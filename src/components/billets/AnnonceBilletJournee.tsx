import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUI } from '../../contexts/AppContext';
import { ANNONCES } from '../../content/annonces';
import { addLocale } from '../../lib/locale';

// ─── Le billet d'une journée vaut pour le jour choisi ────────────────
// Alex, 2026-09-23 : Zeffy n'imprime que la date d'ouverture (vendredi)
// sur le billet d'une journée. Ce pop-up le dit à TOUS les visiteurs,
// avec ou sans compte, parce qu'un acheteur n'a pas forcément de compte
// sur le site. Une seule fois par appareil. Le texte est celui de l'avis
// `billet-un-jour-2026` du babillard : retirer l'avis éteint le pop-up.
// Il passe devant tout le reste (z-125, au-dessus des badges à z-120) :
// l'avis compte davantage que le reste pendant la fin de semaine du festival.

const ANNONCE = ANNONCES.find((a) => a.id === 'billet-un-jour-2026');
const CLE_VUE = 'fmm.annonce.billet-journee-2026';
const PAGES_SANS_POPUP = ['/admin', '/signer', '/jeux', '/jeunesse/hnefatafl', '/labo-titre'];

function dejaVue(): boolean {
  try { return localStorage.getItem(CLE_VUE) === '1'; } catch { return false; }
}

const AnnonceBilletJournee: React.FC = () => {
  const { lang } = useUI();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const fr = lang === 'FR';

  const [vue, setVue] = useState(dejaVue);
  const [pret, setPret] = useState(false);

  // L'accueil cinématique se reconnaît à son chemin nu : l'avis attend
  // que la personne entre dans le site.
  const chemin = pathname.replace(/^\/en(?=\/|$)/, '') || '/';
  const pageMuette = chemin === '/' || PAGES_SANS_POPUP.some((p) => chemin.startsWith(p));
  const ouvert = !!ANNONCE && !vue && pret && !pageMuette;

  useEffect(() => {
    const t = window.setTimeout(() => setPret(true), 1200);
    return () => window.clearTimeout(t);
  }, []);

  const fermer = (puis?: () => void) => {
    setVue(true);
    try { localStorage.setItem(CLE_VUE, '1'); } catch { /* navigation privée */ }
    puis?.();
  };

  useEffect(() => {
    if (!ouvert) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') fermer(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouvert]);

  return (
    <AnimatePresence>
      {ouvert && ANNONCE && (
        <motion.div
          className="fixed inset-0 z-[125] flex items-center justify-center p-4"
          style={{ background: 'rgba(6, 3, 4, 0.82)', backdropFilter: 'blur(6px)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => fermer()}
          role="dialog" aria-modal="true"
          aria-label={fr ? ANNONCE.titleFR : ANNONCE.titleEN}
        >
          <motion.div
            className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-lg-card border border-brass/40 text-center"
            style={{
              background: 'linear-gradient(165deg, rgba(24,12,8,0.96), rgba(8,3,5,0.98))',
              boxShadow: '0 30px 90px rgba(0,0,0,0.65), 0 0 60px rgba(var(--sk-glow-rgb),0.12) inset',
            }}
            initial={{ scale: 0.9, y: 18, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button" onClick={() => fermer()}
              aria-label={fr ? 'Fermer' : 'Close'}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/50 text-ivory-soft/80 hover:text-ivory transition-colors"
            >
              <X size={16} />
            </button>

            <div className="px-7 pt-9 pb-8 md:px-9">
              <p className="font-sans uppercase tracking-[0.28em] text-[10px] text-ivory-soft/60 mb-2">
                {fr ? 'Avis aux festivaliers' : 'Notice to festival-goers'}
              </p>
              <h2 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-3">
                {fr ? ANNONCE.titleFR : ANNONCE.titleEN}
              </h2>
              <div className="divider-brass w-16 mx-auto mb-4" />
              <p className="font-editorial text-sm md:text-base text-ivory-soft leading-relaxed text-pretty">
                {fr ? ANNONCE.bodyFR : ANNONCE.bodyEN}
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => fermer()}
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-full border border-brass/50 font-sans uppercase tracking-[0.2em] text-[11px] text-ivory hover:bg-brass/15 transition-colors"
                >
                  {fr ? 'Bien compris' : 'Got it'}
                </button>
                {ANNONCE.cta && (
                  <button
                    type="button"
                    onClick={() => fermer(() => navigate(addLocale(ANNONCE.cta!.url, lang)))}
                    className="block mx-auto mt-3 font-sans uppercase tracking-[0.2em] text-[10px] text-ivory-soft/70 hover:text-ivory transition-colors"
                  >
                    {fr ? ANNONCE.cta.labelFR : ANNONCE.cta.labelEN}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AnnonceBilletJournee;
