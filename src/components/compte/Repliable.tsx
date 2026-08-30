import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// ─── Une section qui se replie ───────────────────────────────────────
// Alex, 2026-08-30 : « il faut que toutes les sections se collapsent ».
// L'en-tête reste visible, le contenu se plie d'un clic; l'état se
// garde dans le navigateur par clé, pour que la personne retrouve son
// profil comme elle l'a laissé.

interface Props {
  id: string;
  titre: string;
  icone?: React.ReactNode;
  /** Ce qui se lit à droite du titre quand la section est fermée (un
   *  compte, un solde). */
  resume?: React.ReactNode;
  ouvertParDefaut?: boolean;
  children: React.ReactNode;
}

const cle = (id: string) => `fmm.profil.replie.${id}`;

const Repliable: React.FC<Props> = ({ id, titre, icone, resume, ouvertParDefaut = true, children }) => {
  const [ouvert, setOuvert] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(cle(id));
      return v === null ? ouvertParDefaut : v === '1';
    } catch { return ouvertParDefaut; }
  });
  const basculer = () => {
    const suivant = !ouvert;
    setOuvert(suivant);
    try { localStorage.setItem(cle(id), suivant ? '1' : '0'); } catch { /* navigation privée */ }
  };

  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={basculer}
        aria-expanded={ouvert}
        aria-controls={`replie-${id}`}
        className="glass-light rounded-lg-card w-full flex items-center gap-4 px-5 md:px-6 py-3 md:py-3.5 text-left transition-colors hover:bg-white/[0.04]"
      >
        {icone && (
          <span className="witcher-tile shrink-0" style={{ width: 40, height: 40 }}>
            <span className="witcher-tile-inner" style={{ color: '#D8B05A' }}>{icone}</span>
          </span>
        )}
        <span className="witcher-stat-label flex-1 min-w-0 truncate">{titre}</span>
        {resume && (
          <span className="font-sans text-sm shrink-0" style={{ color: '#D8B05A' }}>{resume}</span>
        )}
        <ChevronDown
          size={16}
          className="shrink-0 transition-transform duration-300"
          style={{ color: 'rgba(244,239,227,0.6)', transform: ouvert ? 'rotate(180deg)' : undefined }}
        />
      </button>
      <AnimatePresence initial={false}>
        {ouvert && (
          <motion.div
            id={`replie-${id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-6 md:space-y-8">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default Repliable;
