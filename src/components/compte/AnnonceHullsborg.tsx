import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/AppContext';
import { sonnerFanfare } from '../../lib/fanfare';
import { suivreMaBourse, type Bourse } from '../../firebase/montpellois';
import { ANNONCES } from '../../content/annonces';
import { roueFinie } from './RecompensesQuotidiennes';

// ─── Le skin Hullsborg, juste après la roue ──────────────────────────
// Alex, 2026-09-22 : un second pop-up qui suit celui des récompenses du
// jour pour annoncer le skin Hullsborg du hnefatafl. Le texte, l'image
// et le bouton sont ceux de l'avis du babillard (content/annonces.ts).
// Il se lève une seule fois par appareil, jamais chez qui possède déjà
// le skin, et il se tient sous la roue (z-94 contre z-95) si les deux
// se croisent : la roue passe toujours d'abord.

const ANNONCE = ANNONCES.find((a) => a.id === 'skin-hullsborg-2026');
const CLE_VUE = 'fmm.annonce.skin-hullsborg-2026';
const PAGES_SANS_POPUP = ['/admin', '/signer'];

// En dev, `?apercuHullsborg=1` monte le pop-up sans compte ni roue.
const APERCU = import.meta.env.DEV
  && new URLSearchParams(window.location.search).has('apercuHullsborg');

function dejaVue(): boolean {
  try { return localStorage.getItem(CLE_VUE) === '1'; } catch { return false; }
}

const AnnonceHullsborg: React.FC = () => {
  const { user } = useAuth();
  const { lang } = useUI();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const fr = lang === 'FR';

  const [roue, setRoue] = useState(roueFinie);
  const [bourse, setBourse] = useState<Bourse | null>(null);
  const [vue, setVue] = useState(dejaVue);

  useEffect(() => {
    if (roue) return;
    const fini = () => setRoue(true);
    window.addEventListener('fmm:roue-finie', fini);
    return () => window.removeEventListener('fmm:roue-finie', fini);
  }, [roue]);

  useEffect(() => {
    if (!user?.uid) { setBourse(null); return; }
    return suivreMaBourse(user.uid, setBourse);
  }, [user?.uid]);

  const chemin = pathname.replace(/^\/en(?=\/|$)/, '') || '/';
  const ouvert = !!ANNONCE && !vue && (APERCU || (
    roue && !!user?.uid && !!bourse
    && !(bourse.taflPieces || []).includes('hullsborg')
    && !PAGES_SANS_POPUP.some((p) => chemin.startsWith(p))
  ));

  useEffect(() => { if (ouvert) sonnerFanfare(); }, [ouvert]);

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
  }, [ouvert]);

  return (
    <AnimatePresence>
      {ouvert && ANNONCE && !vue && (
        <motion.div
          className="fixed inset-0 z-[94] flex items-center justify-center p-4"
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

            <img
              src={ANNONCE.image} alt={fr ? ANNONCE.titleFR : ANNONCE.titleEN}
              className="block w-full aspect-[4/3] object-cover border-b border-brass/30"
            />

            <div className="px-7 pt-6 pb-8 md:px-9">
              <p className="font-sans uppercase tracking-[0.28em] text-[10px] text-ivory-soft/60 mb-2">
                {fr ? 'Nouveau dans la boutique' : 'New in the shop'}
              </p>
              <h2 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-3">
                {fr ? ANNONCE.titleFR : ANNONCE.titleEN}
              </h2>
              <div className="divider-brass w-16 mx-auto mb-4" />
              <p className="font-editorial text-sm md:text-base text-ivory-soft leading-relaxed text-pretty">
                {fr ? ANNONCE.bodyFR : ANNONCE.bodyEN}
              </p>
              {ANNONCE.cta && (
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => fermer(() => navigate(ANNONCE.cta!.url))}
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-full border border-brass/50 font-sans uppercase tracking-[0.2em] text-[11px] text-ivory hover:bg-brass/15 transition-colors"
                  >
                    {fr ? ANNONCE.cta.labelFR : ANNONCE.cta.labelEN}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AnnonceHullsborg;
