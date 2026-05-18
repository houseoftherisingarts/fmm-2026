import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { PILLAR_BY_KEY, PILLAR_COPY, PILLARS, type PillarKey } from '../content';
import { addLocale } from '../lib/locale';
import SEO from '../components/SEO';
import Brume from '../components/Brume';

interface Props { pillarKey: PillarKey }

// Shared shell for the 13 pillar pages — temporary placeholder until
// each page gets its own faithful clone in the build-order rollout
// (home → activites → nourriture → musique → benevole → marche →
// jeunesse → histoire → partenaires → mariages → chevaux → apprendre
// → hebergement → groupes). Uses the dark-navy editorial system to
// match the live Wix visual language.
const PillarPage: React.FC<Props> = ({ pillarKey }) => {
  const { lang } = useUI();
  const pillar = PILLAR_BY_KEY[pillarKey];
  const copy = PILLAR_COPY[pillarKey][lang];

  const siblings = PILLARS.filter((p) => p.key !== pillarKey).slice(0, 4);

  return (
    <>
      <SEO title={pillar.label[lang]} description={copy.lead} />

      {/* ── Hero band ── */}
      <section className="relative text-ivory pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden">
        <img
          src="/wix/home/scene-cinematic.jpg"
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-midnight-deep/85 via-midnight/85 to-midnight-deep" />
        <div className="grain absolute inset-0 opacity-25" aria-hidden />
        <Brume />

        <div className="relative max-w-screen-xl mx-auto px-4 md:px-8">
          <Link to={addLocale('/', lang)} className="inline-flex items-center gap-2 font-sans text-xs uppercase tracking-widest text-ivory-soft hover:text-brass mb-8 transition">
            <ArrowLeft size={14} /> {lang === 'FR' ? 'Accueil' : 'Home'}
          </Link>

          <motion.p
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs md:text-sm mb-5"
          >
            {copy.eyebrow}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display title-medieval text-5xl md:text-7xl text-ivory mb-6 leading-tight"
          >
            {copy.title}
          </motion.h1>
          <div className="divider-brass w-24 mb-6" />
          <motion.p
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
            className="font-editorial text-lg md:text-2xl text-ivory-soft max-w-2xl leading-relaxed"
          >
            {copy.lead}
          </motion.p>
        </div>
      </section>

      {/* ── Placeholder card ── */}
      <section className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4 md:px-8">
          <div className="glass-light p-8 md:p-12 text-center rounded-card">
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">
              {lang === 'FR' ? 'En préparation' : 'In preparation'}
            </p>
            <h2 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-3">
              {lang === 'FR' ? 'Cette page sera clonée prochainement' : 'This page will be cloned shortly'}
            </h2>
            <p className="font-editorial text-ivory-soft max-w-md mx-auto">
              {lang === 'FR'
                ? 'Le contenu de cette page sera repris à l\'identique du site actuel pendant la migration.'
                : 'This page content will be cloned 1:1 from the current site during the migration.'}
            </p>
          </div>
        </div>
      </section>

      {/* ── Sibling cross-links ── */}
      <section className="py-16 md:py-20">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-6 text-center">
            {lang === 'FR' ? 'Continuer la visite' : 'Continue the journey'}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {siblings.map((s) => (
              <Link key={s.key} to={s.slug[lang]}
                className="group p-5 glass-light hover:bg-brass/10 transition rounded-card flex items-center justify-between gap-3">
                <div>
                  <p className="font-editorial italic text-xs text-stone-light mb-1">{s.short[lang]}</p>
                  <p className="font-display title-medieval text-base md:text-lg text-ivory group-hover:text-brass transition">
                    {s.label[lang]}
                  </p>
                </div>
                <ArrowUpRight size={16} className="text-ivory-soft opacity-0 group-hover:opacity-100 transition shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default PillarPage;
