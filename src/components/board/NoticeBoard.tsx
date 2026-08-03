import React from 'react';
import { motion } from 'framer-motion';

// Le panneau de bois du festival. Il vivait dans le tableau des marchands;
// extrait ici le 2026-08-03 parce que les avis de l'espace client s'y
// épinglent maintenant eux aussi. Un seul panneau, deux usages.
//
//   • public/board/notice-frame.webp     — cadre servi en border-image
//     (tranches de 170 px) pour que les coins ferrés restent nets quelle
//     que soit la hauteur du tableau
//   • public/board/notice-wood.webp      — intérieur en tuile miroir 2x2,
//     répétable sans couture, jamais étiré
//   • public/board/notice-parchment.webp — vraie feuille déchirée détourée,
//     une par avis, notre texte par-dessus

// Ce qui plante l'avis dans le bois. La cire rouge est le défaut
// historique du tableau des marchands; le laiton et l'or distinguent les
// avis de l'espace client sans changer d'objet.
export type PinTone = 'cire' | 'laiton' | 'or';

const PIN: Record<PinTone, string> = {
  cire:   'radial-gradient(circle at 35% 30%, #c93a3a 0%, #7e1c1c 60%, #3e0808 100%)',
  laiton: 'radial-gradient(circle at 35% 30%, #e8cd93 0%, #a9812f 60%, #5d4413 100%)',
  or:     'radial-gradient(circle at 35% 30%, #f6e6b0 0%, #D8B05A 55%, #7a5a17 100%)',
};

export const NoticeBoard: React.FC<{
  children: React.ReactNode;
  /** Largeur du panneau. Le tableau des marchands reste à max-w-5xl. */
  className?: string;
  /** Grille intérieure, pour ajuster le nombre de colonnes selon les avis. */
  gridClassName?: string;
}> = ({ children, className = 'max-w-5xl mx-auto', gridClassName = 'sm:grid-cols-2 lg:grid-cols-3' }) => (
  <div className={`relative ${className}`}>
    <div
      className="relative"
      style={{
        borderStyle: 'solid',
        borderWidth: 'clamp(26px, 5.5vw, 64px)',
        borderImageSource: 'url(/board/notice-frame.webp)',
        borderImageSlice: 170,
        borderImageRepeat: 'stretch',
        backgroundImage: 'url(/board/notice-wood.webp)',
        backgroundSize: '340px auto',
        backgroundRepeat: 'repeat',
        // padding-box : sans ça le bois se peint AUSSI sous la zone de
        // bordure et rebouche les creux transparents du cadre découpé.
        backgroundClip: 'padding-box',
        filter: 'drop-shadow(0 24px 50px rgba(0,0,0,0.7))',
      }}
    >
      {/* Ombrage interne : le bois s'assombrit dans les coins, comme
          sur la photo d'origine. */}
      <span
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,0,0,0.5)' }}
      />
      <div className={`relative grid gap-x-6 gap-y-9 p-5 md:p-8 ${gridClassName}`}>
        {children}
      </div>
    </div>
  </div>
);

// ─── Parchment — un avis épinglé sur le panneau ──────────────────
export const Parchment: React.FC<{
  tilt?: number;
  pin?: PinTone;
  className?: string;
  children: React.ReactNode;
}> = ({ tilt = 0, pin = 'cire', className = '', children }) => (
  <motion.div
    initial={{ opacity: 0, y: -6, rotate: tilt - 4 }}
    whileInView={{ opacity: 1, y: 0, rotate: tilt }}
    viewport={{ once: true, margin: '-40px' }}
    whileHover={{ y: -4, rotate: tilt * 0.5, scale: 1.02 }}
    transition={{ type: 'spring', stiffness: 220, damping: 22 }}
    className={`relative px-7 py-8 md:px-8 md:py-9 ${className}`}
    style={{
      backgroundImage: 'url(/board/notice-parchment.webp)',
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      filter: 'drop-shadow(0 12px 22px rgba(0,0,0,0.6))',
    }}
  >
    {/* Clou de cire, planté au centre haut */}
    <span
      aria-hidden
      className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full"
      style={{
        background: PIN[pin],
        boxShadow: '0 3px 6px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.25)',
      }}
    />
    {children}
  </motion.div>
);

// Inclinaison déterministe par id, dans [-3.5, +3.5] degrés : épinglé à
// la main, mais qui ne resaute pas à chaque rendu.
export function seedTilt(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const t = ((h % 71) / 71) * 7 - 3.5;
  return Math.round(t * 100) / 100;
}
