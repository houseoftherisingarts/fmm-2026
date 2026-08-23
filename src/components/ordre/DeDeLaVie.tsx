import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Dices } from 'lucide-react';

// ─── Le dé de la vie ────────────────────────────────────────────────
// Un d20 posé sur la fiche, sans conséquence (Alex, 2026-08-23) : quand
// on hésite, on laisse le sort trancher. Un 1 est un échec critique, un
// 20 est un Nat 20. Clin d'œil, rien d'autre.

const DeDeLaVie: React.FC<{ lang: 'FR' | 'EN' }> = ({ lang }) => {
  const fr = lang === 'FR';
  const [valeur, setValeur] = useState<number | null>(null);
  const [roule, setRoule] = useState(false);

  const lancer = () => {
    if (roule) return;
    setRoule(true);
    const debut = Date.now();
    const battre = () => {
      setValeur(1 + Math.floor(Math.random() * 20));
      if (Date.now() - debut < 900) window.setTimeout(battre, 70);
      else setRoule(false);
    };
    battre();
  };

  const critique = valeur === 20;
  const echec = valeur === 1;

  return (
    <div className="rounded-lg-card border border-brass/25 p-6 text-center"
         style={{ background: 'rgba(26, 5, 11, 0.45)' }}>
      <p className="witcher-stat-label mb-1.5 inline-flex items-center gap-2">
        <Dices size={11} /> {fr ? 'Le dé de la vie' : 'The die of life'}
      </p>
      <p className="font-editorial text-sm text-ivory-soft leading-relaxed mb-5">
        {fr
          ? 'Vous hésitez ? Laissez le sort trancher. Le dé ne décide de rien sur ce site, seulement dans votre vie.'
          : 'Hesitating? Let fate settle it. The die decides nothing on this site, only in your life.'}
      </p>

      <motion.button
        type="button" onClick={lancer}
        whileTap={{ scale: 0.94 }}
        className="mx-auto mb-4 w-24 h-24 flex items-center justify-center rounded-[18px] border"
        style={{
          borderColor: critique ? 'rgba(232,177,74,0.85)' : echec ? 'rgba(160,50,40,0.8)' : 'rgba(232,177,74,0.4)',
          background: 'radial-gradient(circle at 32% 26%, rgba(232,177,74,0.22), rgba(30,14,10,0.9) 70%)',
          boxShadow: critique ? '0 0 42px rgba(232,177,74,0.5)' : echec ? '0 0 34px rgba(160,50,40,0.45)' : 'none',
        }}
        aria-label={fr ? 'Lancer le dé' : 'Roll the die'}
      >
        <span className="font-display title-medieval text-4xl"
              style={{ color: echec ? '#c85a48' : 'var(--color-amber-glow)' }}>
          {valeur ?? 'd20'}
        </span>
      </motion.button>

      <p className="font-sans uppercase tracking-[0.2em] text-[10px] h-4"
         style={{ color: critique ? 'var(--color-amber-glow)' : echec ? '#c85a48' : 'rgba(244,239,227,0.45)' }}>
        {roule ? (fr ? 'Le dé roule…' : 'Rolling…')
          : critique ? 'Nat 20'
          : echec ? (fr ? 'Échec critique' : 'Critical failure')
          : valeur ? (fr ? 'Le sort a parlé' : 'Fate has spoken')
          : (fr ? 'Touchez le dé' : 'Touch the die')}
      </p>
    </div>
  );
};

export default DeDeLaVie;
