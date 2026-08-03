import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Info, Facebook, ArrowUpRight } from 'lucide-react';
import { ANNONCES, type Annonce } from '../../content/annonces';
import { SITE } from '../../content';

// Les annonces ouvrent l'espace client : c'est la première chose vue en
// arrivant. Une consigne (`alerte`) porte une arête rouge, un bon à
// savoir (`info`) une arête ambre.
const AnnoncesPanel: React.FC<{ lang: 'FR' | 'EN' }> = ({ lang }) => {
  const fr = lang === 'FR';
  if (ANNONCES.length === 0) return null;

  return (
    <section aria-labelledby="annonces-title" className="mb-10 md:mb-14">
      <div
        className="flex items-center justify-between gap-4 mb-6 pb-2"
        style={{ borderBottom: '1px solid rgba(244, 239, 227, 0.10)' }}
      >
        <span id="annonces-title" className="witcher-stat-label">
          {fr ? 'Avis de la caravane' : 'Caravan notices'}
        </span>
        <span
          className="font-sans text-sm tracking-[0.2em]"
          style={{ color: '#D8B05A', fontWeight: 300 }}
        >
          {ANNONCES.length}
        </span>
      </div>

      <ul className="grid md:grid-cols-2 gap-4 md:gap-5 items-start">
        {ANNONCES.map((a, i) => (
          <AnnonceCard key={a.id} a={a} lang={lang} index={i} />
        ))}
      </ul>

      {/* Le fil Facebook n'est pas branché : tirer les publications
          demande un jeton de page Meta côté serveur. En attendant, on
          renvoie honnêtement à la page plutôt que de simuler un fil. */}
      <a
        href={SITE.social.facebook}
        target="_blank"
        rel="noopener noreferrer"
        className="group mt-5 flex items-center justify-between gap-4 p-5 border transition-colors"
        style={{
          borderColor: 'rgba(244, 239, 227, 0.12)',
          background: 'rgba(26, 5, 11, 0.5)',
        }}
      >
        <span className="flex items-center gap-4 min-w-0">
          <span className="witcher-tile shrink-0" style={{ width: 42, height: 42 }}>
            <span className="witcher-tile-inner" style={{ color: '#D8B05A' }}>
              <Facebook size={15} />
            </span>
          </span>
          <span className="min-w-0">
            <span
              className="block font-sans uppercase tracking-[0.25em] text-[11px] mb-1"
              style={{ color: 'var(--color-bone)' }}
            >
              {fr ? 'Nouvelles de la page Facebook' : 'News from the Facebook page'}
            </span>
            <span
              className="block font-sans text-[13px] leading-snug"
              style={{ color: 'rgba(244,239,227,0.5)', fontWeight: 300 }}
            >
              {fr
                ? 'Les publications du festival, au fil des jours.'
                : 'The festival’s posts, day by day.'}
            </span>
          </span>
        </span>
        <ArrowUpRight
          size={16}
          className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          style={{ color: '#D8B05A' }}
        />
      </a>
    </section>
  );
};

const AnnonceCard: React.FC<{ a: Annonce; lang: 'FR' | 'EN'; index: number }> = ({ a, lang, index }) => {
  const fr = lang === 'FR';
  const alerte = a.tone === 'alerte';
  const accent = alerte ? '#C4553A' : '#D8B05A';
  const Icon = alerte ? AlertTriangle : Info;

  return (
    <motion.li
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.06 * index }}
      className="relative p-6 md:p-7 overflow-hidden"
      style={{
        background: 'rgba(26, 5, 11, 0.6)',
        border: '1px solid rgba(244, 239, 227, 0.10)',
        boxShadow: `inset 3px 0 0 ${accent}`,
      }}
    >
      <div className="flex items-start gap-4">
        <span className="witcher-tile shrink-0 mt-0.5" style={{ width: 42, height: 42 }}>
          <span className="witcher-tile-inner" style={{ color: accent }}>
            <Icon size={15} />
          </span>
        </span>
        <div className="min-w-0">
          <p
            className="font-sans uppercase tracking-[0.3em] text-[10px] mb-2"
            style={{ color: accent }}
          >
            {alerte ? (fr ? 'Consigne' : 'Rule') : (fr ? 'Bon à savoir' : 'Good to know')}
          </p>
          <h3
            className="font-display text-xl md:text-2xl leading-snug mb-2.5"
            style={{ color: 'var(--color-bone)', fontWeight: 400 }}
          >
            {fr ? a.titleFR : a.titleEN}
          </h3>
          <p
            className="font-sans text-sm md:text-[15px] leading-[1.7]"
            style={{ color: 'rgba(244, 239, 227, 0.72)', fontWeight: 300 }}
          >
            {fr ? a.bodyFR : a.bodyEN}
          </p>

          {a.logo && (
            <a
              href={a.logo.href}
              target={a.logo.href?.startsWith('http') ? '_blank' : undefined}
              rel={a.logo.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="group inline-flex items-center gap-3 mt-5 pt-5 transition-opacity hover:opacity-100 opacity-85"
              style={{ borderTop: '1px solid rgba(244, 239, 227, 0.10)' }}
            >
              <img
                src={a.logo.src}
                alt={a.logo.alt}
                loading="lazy"
                decoding="async"
                className="h-11 md:h-12 w-auto"
              />
              <ArrowUpRight
                size={14}
                className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                style={{ color: '#D8B05A' }}
              />
            </a>
          )}
        </div>
      </div>
    </motion.li>
  );
};

export default AnnoncesPanel;
