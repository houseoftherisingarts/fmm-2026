// ─── L'interstitiel publicitaire au début d'une partie ──────────────
// Alex, 2026-08-27 : la pub AdSense (ca-pub-7365982984401895, déjà dans
// index.html) ne s'affiche NULLE PART ailleurs sur le site que sur cet
// écran, au moment où une partie de jeu commence. Le compte n'a pas
// encore été approuvé : tant que VITE_ADSENSE_SLOT_JEUX est vide, ce
// composant ne rend rien et laisse la partie démarrer tout de suite,
// exactement comme si la pub n'existait pas.
import React, { useEffect, useState } from 'react';
import { bumpPubJeuxView } from '../../lib/siteStats';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const CLIENT_ADSENSE = 'ca-pub-7365982984401895';
const DELAI_MS = 3000;

interface Props {
  lang: 'FR' | 'EN';
  /** Ce qui démarre réellement la partie, une fois la pub passée (ou
   *  tout de suite, si aucun bloc n'est encore configuré). */
  onContinuer: () => void;
}

const PubDebutPartie: React.FC<Props> = ({ lang, onContinuer }) => {
  const fr = lang === 'FR';
  const slot = import.meta.env.VITE_ADSENSE_SLOT_JEUX;
  const [pret, setPret] = useState(false);

  // Aucun identifiant de bloc encore : rien à montrer, on passe la main
  // immédiatement.
  useEffect(() => {
    if (!slot) onContinuer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot]);

  // Le bloc se pousse une seule fois, au montage, et le bouton reste
  // grisé trois secondes : le temps que la pub ait au moins une chance
  // d'être vue avant qu'on la ferme.
  useEffect(() => {
    if (!slot) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* Un bloqueur de pub ou un compte pas encore approuvé ne doit
         jamais empêcher la partie de démarrer. */
    }
    const id = window.setTimeout(() => setPret(true), DELAI_MS);
    return () => window.clearTimeout(id);
  }, [slot]);

  if (!slot) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-md rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md p-6 flex flex-col items-center gap-5">
        <span className="witcher-stat-label self-start">
          {fr ? 'Publicité' : 'Advertisement'}
        </span>
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', minHeight: 200 }}
          data-ad-client={CLIENT_ADSENSE}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
        <button
          type="button"
          disabled={!pret}
          onClick={onContinuer}
          className="fmm-glass-btn is-primary px-6 py-3.5 w-full disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="fmm-glass-btn-label">
            {fr ? 'Continuer vers la partie' : 'Continue to the game'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default PubDebutPartie;
