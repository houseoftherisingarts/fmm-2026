import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { badgeParId, sceauDe } from '../../firebase/badges';

// ─── La vitrine ──────────────────────────────────────────────────────
// Jusqu'à cinq badges choisis par la personne, sous son nom, sur la
// même ligne que sa pastille de fonction (Alex, 2026-08-27). Chaque
// badge est son sceau, avec le nom en survol. Rien tant que la vitrine
// est vide.

const Vitrine: React.FC<{ ids: string[]; lang: 'FR' | 'EN' }> = ({ ids, lang }) => {
  const fr = lang === 'FR';
  const badges = ids.map(badgeParId).filter((b): b is NonNullable<typeof b> => Boolean(b)).slice(0, 5);
  if (badges.length === 0) return null;
  return (
    <>
      {badges.map((b, i) => (
        <motion.li
          key={b.id}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.08 * i, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ y: -2 }}
          title={`${fr ? b.nomFR : b.nomEN} · ${fr ? b.texteFR : b.texteEN}`}
          aria-label={fr ? b.nomFR : b.nomEN}
          className="inline-flex items-center justify-center w-9 h-9 rounded-full"
          style={{ background: 'rgba(216,176,90,0.08)', border: '1px solid rgba(216,176,90,0.32)' }}
        >
          <img src={sceauDe(b.id)} alt="" aria-hidden className="w-7 h-7 object-contain"
               style={{ filter: 'drop-shadow(0 0 8px rgba(232,177,74,0.35))' }} />
        </motion.li>
      ))}
    </>
  );
};

export default Vitrine;
