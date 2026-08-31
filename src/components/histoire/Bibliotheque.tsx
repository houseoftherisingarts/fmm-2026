import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { RAYONS } from '../../content/bibliotheque';

// ─── La bibliothèque du festival ────────────────────────────────────
// Au bout de la page Histoire (Alex, 2026-08-23) : un rayon par année
// du festival, et sous chaque livre une raison de l'ouvrir. C'est la
// première pierre du carnet d'apprentissage médiéval.

const Bibliotheque: React.FC<{ lang: 'FR' | 'EN' }> = ({ lang }) => {
  const fr = lang === 'FR';
  const [ouvert, setOuvert] = useState<string>(RAYONS[0].id);

  return (
    <section className="relative py-16 md:py-24 overflow-hidden" aria-labelledby="biblio-titre">
      <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
        <div className="max-w-3xl mb-10 md:mb-14">
          <p className="font-sans uppercase tracking-[0.3em] text-[10px] mb-4 inline-flex items-center gap-2"
             style={{ color: 'var(--color-amber-glow)' }}>
            <BookOpen size={12} /> {fr ? 'La bibliothèque' : 'The library'}
          </p>
          <h2 id="biblio-titre" className="font-display title-medieval text-3xl md:text-5xl text-ivory leading-tight mb-5">
            {fr ? 'Ce qu’il faut lire' : 'What to read'}
          </h2>
          <div className="divider-brass w-20 mb-6" />
          <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed">
            {fr
              ? 'Chaque édition du festival a son monde, et chaque monde a ses livres. Voici les nôtres, rangés par année, avec une raison d’ouvrir chacun. Rien d’obligatoire, rien d’universitaire : de la lecture qui donne envie de revenir en septembre.'
              : 'Every edition of the festival has its world, and every world has its books. Here are ours, shelved by year, each with a reason to open it. Nothing compulsory, nothing academic: reading that makes you want to come back in September.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {RAYONS.map((r) => (
            <button
              key={r.id} type="button"
              onClick={() => setOuvert(r.id)}
              aria-pressed={ouvert === r.id}
              className={`px-4 py-2.5 rounded-full border font-sans uppercase tracking-[0.16em] text-[10px] transition-colors ${
                ouvert === r.id
                  ? 'border-brass text-ivory'
                  : 'border-brass/25 text-ivory-soft/70 hover:border-brass/60'
              }`}
              style={ouvert === r.id ? { background: 'rgba(var(--sk-glow-rgb),0.14)' } : undefined}
            >
              {fr ? r.anneeFR : r.anneeEN}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {RAYONS.filter((r) => r.id === ouvert).map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="font-editorial text-base text-ivory-soft leading-relaxed max-w-3xl mb-8">
                {fr ? r.chapeauFR : r.chapeauEN}
              </p>
              <ol className="grid md:grid-cols-2 gap-x-8 gap-y-7">
                {r.livres.map((l, i) => (
                  <li key={l.titre} className="flex gap-5">
                    <span className="font-display title-medieval text-2xl shrink-0 pt-0.5"
                          style={{ color: 'rgba(var(--sk-glow-rgb),0.45)' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-display text-lg text-ivory leading-snug">{l.titre}</h3>
                      <p className="font-sans uppercase tracking-[0.18em] text-[10px] text-ivory-soft/55 mt-1 mb-2.5">
                        {l.auteur} · {l.repere}
                      </p>
                      <p className="font-editorial text-sm md:text-[15px] text-ivory-soft leading-relaxed">
                        {fr ? l.noteFR : l.noteEN}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </motion.div>
          ))}
        </AnimatePresence>

        <p className="mt-12 font-editorial text-sm text-ivory-soft/70 leading-relaxed max-w-2xl">
          {fr
            ? 'Cette bibliothèque grandira. Le carnet d’apprentissage médiéval du festival s’ouvre bientôt, avec des articles sur ce que ces livres racontent.'
            : 'This library will grow. The festival’s medieval learning journal opens soon, with pieces on what these books have to say.'}
        </p>
      </div>
    </section>
  );
};

export default Bibliotheque;
