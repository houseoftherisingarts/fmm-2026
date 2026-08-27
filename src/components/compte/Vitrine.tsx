import React from 'react';
import { motion } from 'framer-motion';
import { badgeParId, sceauDe } from '../../firebase/badges';

// ─── La vitrine ──────────────────────────────────────────────────────
// Jusqu'à cinq badges choisis par la personne, en tête de sa fiche,
// privée comme publique (Alex, 2026-08-27). Rien ne s'affiche tant que
// la vitrine est vide : la fiche garde alors son bandeau d'avant.

const Vitrine: React.FC<{ ids: string[]; lang: 'FR' | 'EN' }> = ({ ids, lang }) => {
  const fr = lang === 'FR';
  const badges = ids.map(badgeParId).filter((b): b is NonNullable<typeof b> => Boolean(b)).slice(0, 5);
  if (badges.length === 0) return null;
  return (
    <ul className="mt-6 flex flex-wrap justify-center md:justify-start gap-3" aria-label={fr ? 'Badges exposés' : 'Showcased badges'}>
      {badges.map((b, i) => (
        <motion.li
          key={b.id}
          initial={{ opacity: 0, y: 8, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.08 * i, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          title={`${fr ? b.nomFR : b.nomEN} · ${fr ? b.texteFR : b.texteEN}`}
          className="flex flex-col items-center w-[76px]"
        >
          <span className="relative flex items-center justify-center w-14 h-14 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(232,177,74,0.16), transparent 70%)' }}>
            <img src={sceauDe(b.id)} alt="" aria-hidden className="w-14 h-14 object-contain"
                 style={{ filter: 'drop-shadow(0 0 12px rgba(232,177,74,0.35))' }} />
          </span>
          <span className="mt-1.5 font-sans uppercase tracking-[0.14em] text-[9px] text-center leading-tight"
                style={{ color: 'rgba(244,239,227,0.72)' }}>
            {fr ? b.nomFR : b.nomEN}
          </span>
        </motion.li>
      ))}
    </ul>
  );
};

export default Vitrine;
