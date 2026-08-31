// ─── La visite guidée d'un jeu ──────────────────────────────────────
// Alex, 2026-08-31 : un seul composant pour les quatre jeux. Il reçoit
// le nom du jeu, va chercher ses étapes dans tutoriels.tsx, et les pose
// une à une par-dessus la table : une carte de verre sombre, un anneau
// de lumière autour de la zone dont on parle, et trois boutons.
//
// La zone se marque dans la page du jeu par `data-tuto="<nom>"`. Une
// ancre absente ne casse rien : la carte se centre et la visite
// continue. C'est ce qui permet d'ouvrir la même visite depuis l'écran
// de préparation, où la table n'est pas encore dressée, et en pleine
// partie, où elle l'est.

import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, GraduationCap, X } from 'lucide-react';
import { TUTORIELS, type JeuTutoriel } from './tutoriels';

export type { JeuTutoriel };

const cleVue = (jeu: JeuTutoriel) => `fmm.tutoriel.${jeu}`;

/** La visite a-t-elle déjà été offerte à cette personne, sur cet appareil ? */
export function tutorielVu(jeu: JeuTutoriel): boolean {
  try { return localStorage.getItem(cleVue(jeu)) === '1'; } catch { return true; }
}

export function marquerTutorielVu(jeu: JeuTutoriel): void {
  try { localStorage.setItem(cleVue(jeu), '1'); } catch { /* navigation privée */ }
}

/**
 * L'état de la visite, pour une page de jeu.
 *
 * `auto` dit si la visite a le droit de s'ouvrir toute seule à la
 * première venue. Les pages la ferment en mode `?partie=` : on ne pose
 * pas un tutoriel devant quelqu'un dont l'adversaire attend.
 */
export function useTutoriel(jeu: JeuTutoriel, auto: boolean) {
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    if (!auto || tutorielVu(jeu)) return;
    // Le temps que la page se pose. Une carte qui saute à la figure
    // pendant que le hero s'anime se lit comme une publicité.
    const t = window.setTimeout(() => setOuvert(true), 900);
    return () => window.clearTimeout(t);
  }, [jeu, auto]);

  const ouvrir = useCallback(() => setOuvert(true), []);
  const fermer = useCallback(() => { setOuvert(false); marquerTutorielVu(jeu); }, [jeu]);

  return { ouvert, ouvrir, fermer };
}

interface Props {
  jeu: JeuTutoriel;
  lang: 'FR' | 'EN';
  ouvert: boolean;
  onFermer: () => void;
}

/** Le rectangle de l'ancre, en coordonnées d'écran. */
function useRectAncre(nom: string | undefined, actif: boolean): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!actif || !nom) { setRect(null); return; }
    const el = document.querySelector<HTMLElement>(`[data-tuto="${nom}"]`);
    if (!el) { setRect(null); return; }

    // La zone doit être sous les yeux avant d'être entourée.
    const r0 = el.getBoundingClientRect();
    if (r0.bottom < 80 || r0.top > window.innerHeight - 80) {
      el.scrollIntoView({ block: 'center', behavior: 'auto' });
    }

    const mesurer = () => setRect(el.getBoundingClientRect());
    mesurer();
    // Deux images plus tard : le temps qu'un panneau qui s'ouvre ait
    // fini de pousser la mise en page.
    const t1 = window.setTimeout(mesurer, 60);
    const t2 = window.setTimeout(mesurer, 320);
    window.addEventListener('scroll', mesurer, true);
    window.addEventListener('resize', mesurer);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('scroll', mesurer, true);
      window.removeEventListener('resize', mesurer);
    };
  }, [nom, actif]);

  return rect;
}

const Tutoriel: React.FC<Props> = ({ jeu, lang, ouvert, onFermer }) => {
  const fr = lang === 'FR';
  const etapes = TUTORIELS[jeu][lang];
  const [i, setI] = useState(0);
  const etape = etapes[Math.min(i, etapes.length - 1)];
  const rect = useRectAncre(etape?.ancre, ouvert);

  // Une visite rouverte repart du début.
  useEffect(() => { if (ouvert) setI(0); }, [ouvert]);

  const precedent = useCallback(() => setI((n) => Math.max(0, n - 1)), []);
  const suivant = useCallback(() => {
    setI((n) => {
      if (n + 1 >= etapes.length) { onFermer(); return n; }
      return n + 1;
    });
  }, [etapes.length, onFermer]);

  useEffect(() => {
    if (!ouvert) return;
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onFermer(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); suivant(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); precedent(); }
    };
    window.addEventListener('keydown', auClavier);
    return () => window.removeEventListener('keydown', auClavier);
  }, [ouvert, suivant, precedent, onFermer]);

  if (typeof document === 'undefined') return null;

  // La carte fuit l'anneau : au bas de l'écran quand la zone est en
  // haut, en haut quand elle est en bas, au milieu quand il n'y a rien
  // à entourer.
  const enBas = rect ? rect.top + rect.height / 2 < window.innerHeight / 2 : false;
  const placement = !rect
    ? 'top-1/2 -translate-y-1/2'
    : enBas ? 'bottom-6 md:bottom-10' : 'top-20 md:top-24';

  const dernier = i >= etapes.length - 1;

  return createPortal(
    <AnimatePresence>
      {ouvert && (
        <motion.div
          key="tutoriel"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed inset-0 z-[95]"
          role="dialog"
          aria-modal="true"
          aria-label={fr ? 'Visite guidée du jeu' : 'Guided tour of the game'}
        >
          {/* Le voile, et le clic qui quitte la visite. Quand une zone est
              entourée, c'est l'ombre de l'anneau qui assombrit le reste :
              la zone dont on parle reste alors la seule chose éclairée. */}
          <button
            type="button"
            onClick={onFermer}
            aria-label={fr ? 'Quitter la visite' : 'Leave the tour'}
            className="absolute inset-0 w-full h-full cursor-default"
            style={rect ? undefined : { background: 'rgba(6,3,4,0.74)', backdropFilter: 'blur(2px)' }}
          />

          {/* L'anneau de lumière autour de la zone dont parle l'étape. */}
          <AnimatePresence>
            {rect && (
              <motion.div
                key={`anneau-${i}`}
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                aria-hidden
                className="absolute pointer-events-none rounded-[15px]"
                style={{
                  left: Math.max(4, rect.left - 8),
                  top: Math.max(4, rect.top - 8),
                  width: Math.min(window.innerWidth - 8, rect.width + 16),
                  height: Math.min(window.innerHeight - 8, rect.height + 16),
                  border: '2px solid rgba(232,177,74,0.9)',
                  boxShadow: '0 0 0 9999px rgba(6,3,4,0.74), 0 0 34px 4px rgba(232,177,74,0.5)',
                }}
              />
            )}
          </AnimatePresence>

          {/* La carte. */}
          <motion.aside
            key={`carte-${i}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className={`absolute left-1/2 -translate-x-1/2 ${placement} w-[min(25rem,calc(100%-1.5rem))] max-h-[80vh] overflow-y-auto rounded-[15px] border border-white/15 p-5 md:p-6`}
            style={{
              background: 'rgba(10,5,7,0.86)',
              backdropFilter: 'blur(18px)',
              boxShadow: '0 26px 70px rgba(0,0,0,0.7)',
            }}
          >
            <button
              type="button"
              onClick={onFermer}
              aria-label={fr ? 'Quitter' : 'Leave'}
              className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full text-ivory-soft/70 hover:text-ivory hover:bg-white/10 transition-colors"
            >
              <X size={15} />
            </button>

            <p className="flex items-center gap-2 font-sans uppercase tracking-[0.28em] text-[10px] text-[var(--color-amber-glow)] mb-2 pr-7">
              <GraduationCap size={13} />
              {fr ? 'Visite guidée' : 'Guided tour'}
              <span className="text-ivory-soft/45 tracking-[0.18em]">
                {i + 1} / {etapes.length}
              </span>
            </p>

            <h2 className="font-display title-medieval text-xl md:text-2xl text-ivory leading-tight pr-4">
              {etape.titre}
            </h2>
            <div className="divider-brass w-12 my-3.5" />
            <p className="font-editorial text-[13px] md:text-sm text-ivory-soft leading-relaxed">
              {etape.corps}
            </p>

            {etape.schema}

            {/* La barre d'avancement, puis les trois gestes. */}
            <div className="mt-5 flex items-center gap-1.5" aria-hidden>
              {etapes.map((_, n) => (
                <span
                  key={n}
                  className="h-[3px] flex-1 rounded-full transition-colors duration-300"
                  style={{ background: n <= i ? 'var(--color-brass, #E8B14A)' : 'rgba(244,239,227,0.16)' }}
                />
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={precedent}
                disabled={i === 0}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 min-h-[42px] rounded-[15px] border border-white/15 text-ivory-soft hover:text-ivory hover:border-brass/55 transition-colors font-sans text-[10px] uppercase tracking-[0.18em] disabled:opacity-35 disabled:pointer-events-none"
              >
                <ArrowLeft size={13} />
                {fr ? 'Précédent' : 'Back'}
              </button>
              <button
                type="button"
                onClick={onFermer}
                className="px-3 py-2.5 font-sans text-[10px] uppercase tracking-[0.18em] text-ivory-soft/60 hover:text-ivory transition-colors"
              >
                {fr ? 'Quitter' : 'Leave'}
              </button>
              <button
                type="button"
                onClick={suivant}
                className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] rounded-[15px] bg-brass text-[#1A0A05] border border-brass hover:bg-brass-soft transition-colors font-sans text-[10px] uppercase tracking-[0.18em]"
              >
                {dernier ? (fr ? 'Terminer' : 'Finish') : (fr ? 'Suivant' : 'Next')}
                {!dernier && <ArrowRight size={13} />}
              </button>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default Tutoriel;

// ─── Le bouton qui rouvre la visite ─────────────────────────────────
// Même grammaire que les autres pastilles des barres de jeu, pour qu'il
// se pose aussi bien sur l'écran de préparation que dans la barre du
// bas ou celle du haut.
export const BoutonTutoriel: React.FC<{
  onClick: () => void;
  lang: 'FR' | 'EN';
  className?: string;
}> = ({ onClick, lang, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-full border border-brass/45 bg-black/50 backdrop-blur-md font-sans uppercase tracking-[0.18em] text-[10px] text-ivory hover:bg-brass/15 transition-colors duration-200 ${className}`}
  >
    <GraduationCap size={13} className="text-brass" />
    {lang === 'FR' ? 'Tutoriel' : 'Tutorial'}
  </button>
);
