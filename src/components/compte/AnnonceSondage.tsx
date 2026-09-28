import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/AppContext';
import { roueFinie } from './RecompensesQuotidiennes';
import { BONUS_SONDAGE } from '../../content/sondageRetour';

// ─── « Le festival veut vous entendre » ──────────────────────────────
// Alex, 2026-09-28 : un pop-up qui mène au sondage de retour, avec le
// bonus de Montpellois pour qui le termine. Une fois par appareil,
// jamais par-dessus le prologue du chevalier ni la roue des récompenses,
// et jamais sur le sondage lui-même.

const CLE_VUE = 'fmm.annonce.sondage-retour-2026';
const PAGES_SANS_POPUP = ['/admin', '/signer', '/sondage', '/survey'];

function dejaVue(): boolean {
  try { return localStorage.getItem(CLE_VUE) === '1'; } catch { return false; }
}
function introPassee(): boolean {
  try { return sessionStorage.getItem('fmm_intro_seen') === '1'; } catch { return true; }
}

const AnnonceSondage: React.FC = () => {
  const { user, loading } = useAuth();
  const { lang } = useUI();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const fr = lang === 'FR';
  const [roue, setRoue] = useState(roueFinie);
  const [intro, setIntro] = useState(introPassee);
  const [vue, setVue] = useState(dejaVue);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    if (roue) return;
    const fini = () => setRoue(true);
    window.addEventListener('fmm:roue-finie', fini);
    return () => window.removeEventListener('fmm:roue-finie', fini);
  }, [roue]);

  // Le prologue ne prévient personne quand il se termine : on relit le
  // drapeau de session à chaque changement de page et toutes les secondes.
  useEffect(() => {
    if (intro) return;
    const id = window.setInterval(() => { if (introPassee()) setIntro(true); }, 1000);
    return () => window.clearInterval(id);
  }, [intro]);

  // Trois secondes de répit après l'arrivée, pour laisser la page se montrer.
  useEffect(() => { const id = window.setTimeout(() => setPret(true), 3000); return () => window.clearTimeout(id); }, []);

  const chemin = pathname.replace(/^\/en(?=\/|$)/, '') || '/';
  const ouvert = !vue && pret && !loading
    && (chemin !== '/' || intro)
    && (!user || roue)
    && !PAGES_SANS_POPUP.some((p) => chemin.startsWith(p));

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
      {ouvert && (
        <motion.div
          className="fixed inset-0 z-[93] flex items-center justify-center p-4"
          style={{ background: 'rgba(6, 3, 4, 0.82)', backdropFilter: 'blur(6px)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => fermer()}
          role="dialog" aria-modal="true"
          aria-label={fr ? 'Le festival veut vous entendre' : 'The festival wants to hear from you'}
        >
          <motion.div
            className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-[15px] border border-brass/40 text-center"
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
            <button type="button" onClick={() => fermer()} aria-label={fr ? 'Fermer' : 'Close'}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/50 text-ivory-soft/80 hover:text-ivory transition-colors">
              <X size={16} />
            </button>
            <img src="/merci/equipe-2026-1024.webp" alt=""
              className="block w-full aspect-[16/9] object-cover border-b border-brass/30" style={{ objectPosition: '50% 30%' }} />
            <div className="px-7 pt-6 pb-8 md:px-9">
              <p className="font-sans uppercase tracking-[0.28em] text-[10px] text-ivory-soft/60 mb-2">
                {fr ? 'Sondage de retour · 2026' : 'Feedback survey · 2026'}
              </p>
              <h2 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-3">
                {fr ? 'Le festival veut vous entendre' : 'The festival wants to hear from you'}
              </h2>
              <div className="divider-brass w-16 mx-auto mb-4" />
              <p className="font-editorial text-sm md:text-base text-ivory-soft leading-relaxed text-pretty">
                {fr
                  ? `Dites-nous ce que vous avez aimé, ce qui mérite d’être amélioré et quel thème vous voulez voir ensuite. Le sondage prend environ sept minutes, et ${BONUS_SONDAGE} Montpellois attendent dans votre bourse quand vous l’aurez terminé.`
                  : `Tell us what you loved, what deserves improving and which theme you want to see next. The survey takes about seven minutes, and ${BONUS_SONDAGE} Montpellois wait in your purse once you finish it.`}
              </p>
              <div className="mt-6">
                <button type="button" onClick={() => fermer(() => navigate(fr ? '/sondage' : '/en/survey'))}
                  className="inline-flex items-center gap-2 min-h-[48px] px-7 py-3 rounded-[15px] font-sans uppercase tracking-[0.2em] text-[11px] transition-transform hover:scale-[1.02]"
                  style={{ background: '#E3C27A', color: '#1A0A05', boxShadow: '0 0 28px rgba(227,194,122,0.35)' }}>
                  {fr ? 'Répondre au sondage' : 'Take the survey'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AnnonceSondage;
