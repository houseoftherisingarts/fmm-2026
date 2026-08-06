import React from 'react';
import { motion } from 'framer-motion';

// Le panneau de bois du festival. Il vivait dans le tableau des marchands;
// extrait ici le 2026-08-03 parce que les avis de l'espace client s'y
// épinglent maintenant eux aussi. Un seul panneau, deux usages.
//
//   • public/board/notice-frame.webp     : cadre servi en border-image
//     (tranches de 170 px) pour que les coins ferrés restent nets quelle
//     que soit la hauteur du tableau
//   • public/board/notice-wood.webp      : intérieur en tuile miroir 2x2,
//     répétable sans couture, jamais étiré
//   • public/board/notice-parchment.webp : vraie feuille déchirée détourée,
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

// ─── IronBar: barre de fer forgé posée sur une couture ──────────
// Même ferronnerie que les coins du panneau d'avis : fer sombre
// bruni, arête haute qui accroche la lumière, rivets d'acier et
// losange de cuivre au centre. Sert à masquer la jointure entre
// deux bandes de la page (accueil : héros de l'orbe → avis).
// Full-bleed, pas de bloc centré : la barre traverse l'écran.
export const IronBar: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div aria-hidden className={`relative w-full ${className}`}>
    {/* Ombre portée sous la barre : la couture disparaît dessous. */}
    <span
      className="absolute inset-x-0 top-1/2 h-14 -translate-y-1/2 pointer-events-none"
      style={{ background: 'radial-gradient(ellipse 60% 100% at 50% 50%, rgba(0,0,0,0.85), transparent 72%)' }}
    />
    {/* Le fer. Dégradé vertical en sept arrêts : arête qui accroche la
        lumière, corps creux, ventre sombre, retour de lueur chaude en
        bas — l'épaisseur vient de là, pas d'une image. */}
    <div
      className="relative h-[19px] md:h-[25px] w-full"
      style={{
        background:
          'linear-gradient(180deg, #4a423a 0%, #7a6e60 4%, #3c342b 16%, #241d16 34%, #120e0a 52%, #1c1610 66%, #382e23 84%, #241c14 94%, #0b0806 100%)',
        boxShadow: [
          'inset 0 1px 0 rgba(255, 236, 196, 0.30)',
          'inset 0 -2px 3px rgba(0, 0, 0, 0.85)',
          '0 14px 32px rgba(0, 0, 0, 0.8)',
        ].join(', '),
      }}
    >
      {/* Martelage : coups de marteau irréguliers, très discrets. */}
      <span
        className="absolute inset-0 opacity-[0.18] pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(97deg, rgba(255,240,210,0.14) 0 1px, transparent 1px 9px, rgba(0,0,0,0.5) 9px 11px, transparent 11px 23px)',
        }}
      />
      {/* Braise du fond qui léchouille le bas de la ferrure. */}
      <span
        className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(184, 106, 42, 0.28))' }}
      />
      {/* Filet de cuivre sous la barre : rappelle l'or du festival et
          fond la barre dans la braise du fond. */}
      <span
        className="absolute inset-x-0 -bottom-px h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,90,0.5) 18%, rgba(232,177,74,0.7) 50%, rgba(201,168,90,0.5) 82%, transparent)' }}
      />
      {/* Rivets, espacés comme sur une ferrure de porte : tête de fer
          brunie avec un reflet de cuivre, jamais de blanc. */}
      {[3, 17, 83, 97].map((left) => (
        <span
          key={left}
          className="absolute top-1/2 w-[10px] h-[10px] md:w-[13px] md:h-[13px] rounded-full -translate-y-1/2 -translate-x-1/2"
          style={{
            left: `${left}%`,
            background: 'radial-gradient(circle at 34% 28%, #d9c391 0%, #9a7c42 30%, #574326 62%, #1b1410 100%)',
            boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.7), 0 2px 4px rgba(0,0,0,0.8), 0 0 6px rgba(184,106,42,0.25)',
          }}
        />
      ))}
    </div>
    {/* Bossage central : plaque de fer + losange de cuivre, le seul
        point de couleur de la pièce. */}
    <span
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-[52px] h-[31px] md:w-[64px] md:h-[38px]"
      style={{
        background: 'linear-gradient(180deg, #6b6053 0%, #3a3128 22%, #1c1611 60%, #0a0705 100%)',
        clipPath: 'polygon(14% 0, 86% 0, 100% 50%, 86% 100%, 14% 100%, 0 50%)',
        boxShadow: '0 8px 20px rgba(0,0,0,0.85)',
      }}
    >
      <span
        className="w-[14px] h-[14px] md:w-[17px] md:h-[17px]"
        style={{
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
          background: 'radial-gradient(circle at 34% 30%, #f2dfa8 0%, #C9A85A 45%, #7a5a17 100%)',
          boxShadow: '0 0 10px rgba(232,177,74,0.45)',
        }}
      />
    </span>
  </div>
);

// ─── Parchment: un avis épinglé sur le panneau ──────────────────
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
