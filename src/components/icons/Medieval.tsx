import React from 'react';

// ─── Icônes médiévales ───────────────────────────────────────────────
// RÈGLE (Alex, 2026-08-22) : aucune icône générique sur le site. Les
// pictos de lucide (Swords, CalendarClock, Music, Baby…) ont l'air d'une
// application SaaS. Ceux-ci sont dessinés au trait fin, dans la grammaire
// des menus de jeu médiéval : hampes, lames, parchemins, hanaps.
//
// Toutes les icônes partagent la même grille 24, le même trait 1.4 et
// `currentColor` : elles héritent de la couleur du texte qui les porte,
// comme les glyphes du bestiaire.

type P = { size?: number | string; className?: string; strokeWidth?: number };

const Base: React.FC<P & { children: React.ReactNode }> = ({
  size = 16, className = '', strokeWidth = 1.4, children,
}) => (
  <svg
    viewBox="0 0 24 24" width={size} height={size} aria-hidden
    className={className} fill="none" stroke="currentColor"
    strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
  >
    {children}
  </svg>
);

/** Deux épées croisées : les activités, le combat. */
export const IconSwords: React.FC<P> = (p) => (
  <Base {...p}>
    <path d="M4 3.5 L14.5 14" />
    <path d="M20 3.5 L9.5 14" />
    <path d="M3.2 3.2 h2.4 v2.4" />
    <path d="M20.8 3.2 h-2.4 v2.4" />
    <path d="M13 12.6 L16.4 16 l-1.6 1.6 -3.4 -3.4" />
    <path d="M11 12.6 L7.6 16 l1.6 1.6 3.4 -3.4" />
    <path d="M9.6 18.4 L7 21" />
    <path d="M14.4 18.4 L17 21" />
  </Base>
);

/** Parchemin roulé : l'horaire, le registre, le programme. */
export const IconScroll: React.FC<P> = (p) => (
  <Base {...p}>
    <path d="M5.5 4.5 h11 a2 2 0 0 1 2 2 v11 a2 2 0 0 0 2 2 h-13 a2 2 0 0 1 -2 -2 v-11" />
    <path d="M5.5 4.5 a2 2 0 0 0 -2 2 a2 2 0 0 0 2 2 h1" />
    <path d="M8.5 9 h6" />
    <path d="M8.5 12.2 h6" />
    <path d="M8.5 15.4 h3.6" />
  </Base>
);

/** Hanap et couvert : le banquet, la table. */
export const IconGoblet: React.FC<P> = (p) => (
  <Base {...p}>
    <path d="M7 3.5 h8 l-0.8 5.2 a3.2 3.2 0 0 1 -6.4 0 z" />
    <path d="M11 12 v6.2" />
    <path d="M8 20.5 h6" />
    <path d="M8.2 18.2 h5.6 l0.4 2.3 h-6.4 z" />
    <path d="M19 3.5 v8.6" />
    <path d="M17.6 3.5 v3 M20.4 3.5 v3" />
  </Base>
);

/** Lyre : la musique, les bardes. */
export const IconLyre: React.FC<P> = (p) => (
  <Base {...p}>
    <path d="M7 19 C3.6 14.6 3.6 7 8 3.4" />
    <path d="M17 19 C20.4 14.6 20.4 7 16 3.4" />
    <path d="M8 3.4 C10 6 10 8.6 8.4 11" />
    <path d="M16 3.4 C14 6 14 8.6 15.6 11" />
    <path d="M6.6 19.2 h10.8" />
    <path d="M10 8 v9.6 M12 7.2 v10.4 M14 8 v9.6" />
  </Base>
);

/** Cheval de bois : la jeunesse, les jeux. */
export const IconHobbyHorse: React.FC<P> = (p) => (
  <Base {...p}>
    <path d="M13.6 3.4 C16.4 3.9 18.4 5.8 18.4 8.2 C18.4 10 17 11.1 15.4 11.5 L14.4 14" />
    <path d="M13.6 3.4 L10.6 5.2 L12.2 6" />
    <path d="M16.2 6.6 h0.01" />
    <path d="M14.4 14 L11.2 20.6" />
    <path d="M8.2 20.6 h6.4" />
    <path d="M13.2 11.9 C11 12.6 9.4 11.6 8.6 10" />
  </Base>
);

/** Marmite sur son feu : la cuisine, les potages. */
export const IconCauldron: React.FC<P> = (p) => (
  <Base {...p}>
    <path d="M4.6 9.5 h14.8 a7.4 7.4 0 0 1 -7.4 7.4 a7.4 7.4 0 0 1 -7.4 -7.4 z" />
    <path d="M3 9.5 h18" />
    <path d="M7 9.5 C7 6.6 9.2 5 12 5 C14.8 5 17 6.6 17 9.5" />
    <path d="M9.4 20.6 C9.4 19.4 10.6 19 10.6 17.8" />
    <path d="M14.6 20.6 C14.6 19.4 13.4 19 13.4 17.8" />
  </Base>
);

/** Flamme sur un gril : les grillades. */
export const IconFlame: React.FC<P> = (p) => (
  <Base {...p}>
    <path d="M12 3 C12 6.4 8.8 7.2 8.8 11 A3.2 3.2 0 0 0 12 14.2 A3.2 3.2 0 0 0 15.2 11 C15.2 8.6 13.4 8.2 13.4 6" />
    <path d="M4.5 17.6 h15" />
    <path d="M6.6 17.6 v3 M17.4 17.6 v3" />
    <path d="M4.5 20.4 h15" />
  </Base>
);

/** Miche de pain entaillée : la boulangerie. */
export const IconBread: React.FC<P> = (p) => (
  <Base {...p}>
    <path d="M3.6 12.4 C3.6 8.6 7.4 6.2 12 6.2 C16.6 6.2 20.4 8.6 20.4 12.4 v3.2 a2 2 0 0 1 -2 2 h-12.8 a2 2 0 0 1 -2 -2 z" />
    <path d="M8.6 9.6 L7 12.6" />
    <path d="M12 9.2 L10.4 12.4" />
    <path d="M15.4 9.6 L13.8 12.6" />
  </Base>
);

/** Rayon de miel : les douceurs. */
export const IconHoney: React.FC<P> = (p) => (
  <Base {...p}>
    <path d="M12 3.2 L18.4 6.8 v7.2 L12 17.6 L5.6 14 V6.8 z" />
    <path d="M12 8 L15 9.8 v3.4 L12 15 L9 13.2 V9.8 z" />
    <path d="M9.4 19.4 C10 20.4 11 21 12 21 C13 21 14 20.4 14.6 19.4" />
  </Base>
);

/** Scorpion stylisé : la section « pour les courageux ». */
export const IconScorpion: React.FC<P> = (p) => (
  <Base {...p}>
    <path d="M9.6 13.6 h4.2" />
    <path d="M10.6 16.4 h3" />
    <path d="M9.4 11 C7.6 10 6.4 8.6 6.4 7 M6.4 7 l-1.6 1.2" />
    <path d="M14 11 C15.8 10 17 8.6 17 7 M17 7 l1.6 1.2" />
    <path d="M12 18.4 C12 20 13.4 21 15 20.4 C17 19.6 18 17.4 17 15.6" />
    <path d="M17 15.6 l1.4 0.8" />
    <path d="M9 19.4 L7 21 M15 19.4 L17 21" />
  </Base>
);

/** Pichet : l'abreuvoir. */
export const IconPitcher: React.FC<P> = (p) => (
  <Base {...p}>
    <path d="M7 6.4 h8 l1.2 11.2 a2 2 0 0 1 -2 2.2 h-6.4 a2 2 0 0 1 -2 -2.2 z" />
    <path d="M6.6 4.2 h8.8 l-0.4 2.2 h-8 z" />
    <path d="M16 9 C18.6 9.6 19.6 11.4 19 13.4 C18.6 14.6 17.6 15.2 16.6 15.2" />
    <path d="M8.4 12.6 h6.4" />
  </Base>
);

/** Soleil levant sur l'horizon : le déjeuner. */
export const IconSunrise: React.FC<P> = (p) => (
  <Base {...p}>
    <path d="M8 14.6 a4 4 0 0 1 8 0" />
    <path d="M3.4 14.6 h2.6 M18 14.6 h2.6" />
    <path d="M12 4.6 v2.6" />
    <path d="M5.8 7.4 L7.6 9.2 M18.2 7.4 L16.4 9.2" />
    <path d="M3 18 h18" />
    <path d="M6 20.8 h12" />
  </Base>
);

/** Botte de légumes : les boustifailles, le jardin. */
export const IconGreens: React.FC<P> = (p) => (
  <Base {...p}>
    <path d="M12 20.6 C9 18.4 7.4 15.6 7.4 12.6 C7.4 10.6 8.6 9.4 10 9.4 C11 9.4 11.7 10 12 10.8 C12.3 10 13 9.4 14 9.4 C15.4 9.4 16.6 10.6 16.6 12.6 C16.6 15.6 15 18.4 12 20.6 z" />
    <path d="M12 10.8 V20.6" />
    <path d="M12 9.4 C12 6.4 13.8 4.2 16.6 3.6 C16.8 6.6 15 8.8 12 9.4 z" />
  </Base>
);

/** Losange à filet : puce ornementale, remplace les points. */
export const IconLozenge: React.FC<P> = (p) => (
  <Base {...p}>
    <path d="M12 3.4 L20.6 12 L12 20.6 L3.4 12 z" />
    <path d="M12 7.6 L16.4 12 L12 16.4 L7.6 12 z" />
  </Base>
);
