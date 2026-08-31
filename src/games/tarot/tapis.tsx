import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Tirage } from '../../content/tarot';
import { resume, type LameTiree } from './interpretation';
import { dosEquipe, imageDos } from './dos';

// ─── Le tapis du tarot ──────────────────────────────────────────────
// Tout ce qui se pose sur le drap : la case d'une carte, le panneau de
// verre qui dit son sens, et la croix celtique avec ses dix places.
// La page (index.tsx) garde l'état du tirage et ne fait qu'appeler ces
// pièces-là. Séparé le 2026-08-23, quand le fichier de la page a passé
// les cinq cents lignes.

// ─── Le panneau qui dit le sens ─────────────────────────────────────
// Du verre sombre posé par-dessus la carte retournée : assez opaque
// pour se lire sans effort, assez transparent pour laisser deviner
// l'image dessous. Coins à 15 px, comme partout ailleurs sur le site.
export const PanneauSens: React.FC<{
  tiree: LameTiree;
  titre: string;
  fr: boolean;
  reduce: boolean;
  className?: string;
  onFermer?: () => void;
}> = ({ tiree, titre, fr, reduce, className = '', onFermer }) => (
  <motion.div
    initial={reduce ? false : { opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    role="note"
    className={`z-30 rounded-card border border-brass/40 p-3 md:p-4 overflow-y-auto ${className}`}
    style={{
      background: 'rgba(9, 4, 6, 0.86)',
      backdropFilter: 'blur(14px)',
      boxShadow: '0 22px 54px -22px rgba(0,0,0,0.95)',
    }}
  >
    <p className="font-sans text-[9px] uppercase tracking-[0.22em] text-ivory-soft/55 mb-1 leading-tight">
      {titre}
    </p>
    <p className="font-display title-medieval text-lg md:text-xl leading-tight mb-1" style={{ color: '#D8B05A' }}>
      {fr ? tiree.lame.nomFR : tiree.lame.nomEN}
    </p>
    <p className="font-sans text-[9px] uppercase tracking-[0.24em] mb-2"
       style={{ color: tiree.renversee ? 'var(--color-blush, #C97B84)' : 'var(--color-amber-glow)' }}>
      {tiree.renversee ? (fr ? 'Renversée' : 'Reversed') : (fr ? 'À l’endroit' : 'Upright')}
    </p>
    <p className="font-editorial text-[13px] md:text-sm leading-relaxed" style={{ color: 'rgba(244,239,227,0.93)' }}>
      {resume(tiree, fr)}
    </p>
    {onFermer && (
      <button
        type="button"
        onClick={onFermer}
        className="mt-3 font-sans text-[9px] uppercase tracking-[0.24em] text-brass/80 hover:text-brass"
      >
        {fr ? 'Fermer' : 'Close'}
      </button>
    )}
  </motion.div>
);

// ─── Une case du tapis ──────────────────────────────────────────────
// La case reste cliquable même sur son dos : c'est le clic qui
// retourne la carte. Sur un écran large, le panneau du sens se pose
// directement sur l'image; ailleurs, le tapis s'en charge.
const CarteSeule: React.FC<{
  tiree?: LameTiree;
  titre: string;
  active: boolean;
  /** Le panneau du sens se pose sur cette carte-ci. */
  panneau: boolean;
  /** La case est trop petite ou trop tournée pour porter le panneau. */
  sansPanneau?: boolean;
  onLire: () => void;
  onSurvol: () => void;
  onQuitter: () => void;
  fr: boolean;
  reduce: boolean;
}> = ({ tiree, titre, active, onLire, onSurvol, onQuitter, fr, reduce }) => (
  <div className="relative w-full" onMouseEnter={onSurvol} onMouseLeave={onQuitter}>
    <button
      type="button"
      onClick={onLire}
      onFocus={onSurvol}
      onBlur={onQuitter}
      aria-label={tiree
        ? `${fr ? tiree.lame.nomFR : tiree.lame.nomEN} · ${titre}`
        : `${fr ? 'Retourner la carte' : 'Turn the card'} · ${titre}`}
      className={`tarot-case relative w-full aspect-[813/1536] rounded-card overflow-hidden border transition-shadow cursor-pointer ${
        active ? 'border-brass shadow-[0_0_34px_-8px_rgba(232,177,74,0.75)]' : 'border-brass/25'
      }`}
      style={{ background: 'rgba(10,4,6,0.7)' }}
    >
      <AnimatePresence mode="wait">
        {tiree ? (
          <motion.div
            key={tiree.lame.code}
            initial={reduce ? false : { rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <img
              src={`/tarot/${tiree.lame.code}.webp`}
              alt={fr ? tiree.lame.nomFR : tiree.lame.nomEN}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-contain"
              style={{ transform: tiree.renversee ? 'rotate(180deg)' : undefined }}
            />
          </motion.div>
        ) : (
          <motion.img
            key={`dos-${dosEquipe() || 'festival'}`}
            src={imageDos(dosEquipe())}
            alt=""
            aria-hidden
            loading="lazy"
            initial={false}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
      </AnimatePresence>
    </button>
  </div>
);

export const CaseTirage: React.FC<{
  titre: string;
  tiree?: LameTiree;
  active: boolean;
  panneau: boolean;
  sansPanneau?: boolean;
  onLire: () => void;
  onSurvol: () => void;
  onQuitter: () => void;
  fr: boolean;
  reduce: boolean;
}> = ({ titre, ...reste }) => (
  <div className="flex w-full flex-col items-center gap-2">
    <CarteSeule titre={titre} {...reste} />
    {titre && (
      <span className="font-sans text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-ivory-soft/60 text-center leading-tight">
        {titre}
      </span>
    )}
  </div>
);

// ─── La croix celtique ──────────────────────────────────────────────
// Dix cartes, deux blocs. La croix occupe trois colonnes à gauche, avec
// la deuxième lame posée EN TRAVERS de la première, dans la même case.
// Les quatre dernières montent en colonne à droite, du bas vers le haut.
//
// Le piège corrigé le 2026-08-23 : les cartes 1 et 2 partageaient une
// case de grille, donc elles s'empilaient et leurs étiquettes se
// marchaient dessus. La paire vit maintenant dans son propre bloc, la
// carte couchée en position absolue, et les deux titres se lisent sous
// l'ensemble au lieu de passer derrière les images.
const CENTRE = { croisee: 1 };            // index de la lame en travers

const PLACES_CROIX: Array<{ col: number; row: number }> = [
  { col: 2, row: 2 },   // 1 · la situation, avec la 2 en travers
  { col: 2, row: 2 },   // 2 · ce qui barre (rendue dans la même case)
  { col: 2, row: 3 },   // 3 · la racine
  { col: 1, row: 2 },   // 4 · le passé récent
  { col: 2, row: 1 },   // 5 · ce qui couronne
  { col: 3, row: 2 },   // 6 · le proche avenir
  { col: 4, row: 4 },   // 7 · vous
  { col: 4, row: 3 },   // 8 · l'entourage
  { col: 4, row: 2 },   // 9 · espoir et crainte
  { col: 4, row: 1 },   // 10 · l'issue
];

export const CroixCeltique: React.FC<{
  tirage: Tirage;
  tirees: Array<LameTiree | undefined>;
  lue: number | null;
  panneau: number | null;
  onLire: (i: number) => void;
  onSurvol: (i: number) => void;
  onQuitter: () => void;
  fr: boolean;
  reduce: boolean;
}> = ({ tirage, tirees, lue, panneau, onLire, onSurvol, onQuitter, fr, reduce }) => {
  const nom = (i: number) => `${i + 1} · ${fr ? tirage.positions[i].titreFR : tirage.positions[i].titreEN}`;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6 md:[grid-template-rows:repeat(4,auto)] md:items-start">
      {tirage.positions.map((_p, i) => {
        // La lame en travers est dessinée avec la première : elle n'a
        // pas de case à elle.
        if (i === CENTRE.croisee) return null;
        const place = PLACES_CROIX[i];
        const centre = i === 0;

        return (
          <div
            key={i}
            className="md:[grid-column:var(--col)] md:[grid-row:var(--row)]"
            style={{ ['--col' as string]: String(place.col), ['--row' as string]: String(place.row) }}
          >
            {centre ? (
              <div className="flex w-full flex-col items-center gap-2">
                {/* La paire : la situation, et ce qui la traverse. La
                    case garde la place de la carte couchée à droite et
                    à gauche pour que rien ne déborde sur les voisines. */}
                <div className="relative w-full px-[14%]">
                  <CarteSeule
                    tiree={tirees[0]}
                    titre={nom(0)}
                    active={lue === 0}
                    panneau={panneau === 0}
                    onLire={() => onLire(0)}
                    onSurvol={() => onSurvol(0)}
                    onQuitter={onQuitter}
                    fr={fr}
                    reduce={reduce}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[74%] rotate-90 pointer-events-auto">
                      <CarteSeule
                        tiree={tirees[1]}
                        titre={nom(1)}
                        active={lue === 1}
                        panneau={panneau === 1}
                        sansPanneau
                        onLire={() => onLire(1)}
                        onSurvol={() => onSurvol(1)}
                        onQuitter={onQuitter}
                        fr={fr}
                        reduce={reduce}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="font-sans text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-ivory-soft/60 text-center leading-tight">
                    {nom(0)}
                  </span>
                  <span className="font-sans text-[9px] uppercase tracking-[0.2em] text-brass/80 text-center leading-tight">
                    {nom(1)}
                  </span>
                </div>
              </div>
            ) : (
              <CaseTirage
                titre={nom(i)}
                tiree={tirees[i]}
                active={lue === i}
                panneau={panneau === i}
                onLire={() => onLire(i)}
                onSurvol={() => onSurvol(i)}
                onQuitter={onQuitter}
                fr={fr}
                reduce={reduce}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
