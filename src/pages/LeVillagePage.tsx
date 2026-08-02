import React from 'react';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { ScrollProgress } from '../components/scroll';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import { Eyebrow, DisplayTitle, HexPanel, SectionFog, SectionTopRail } from '../components/marche/atmospherics';
import { Motes } from '../components/marche/effects';
import MarchePage from './MarchePage';

// ─── Le Village (édition 2026) ──────────────────────────────────────
// Merged pillar. One unified hero + scroll-progress, then the Marché
// renders embedded. Le Village Nourriture est masqué le temps que le
// menu 2026 soit arrêté : un teaser « Menu à venir » le remplace
// (décision d'Alex, 2026-08-02). Pour le ramener : restaurer
// <NourriturePage embedded /> à la place de <MenuComingSoon />.
const LeVillagePage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const fr = lang === 'FR';
  return (
    <>
      <SEO title={fr ? 'Le Village' : 'The Village'} />
      <ScrollProgress />
      <PageHeader
        eyebrow={fr ? 'Le cœur battant du festival' : 'The beating heart of the festival'}
        titleA={fr ? 'Le Village' : 'The Village'}
        intro={fr
          ? 'Le marché des artisans et le village nourriture : tout ce qui se découvre, se goûte et se rapporte du festival.'
          : 'The artisan market and the food village: everything you discover, taste and bring home from the festival.'}
        orbImage="/wix/marche/0b4c7ac8.jpg"
        orbImagePosition="center 30%"
      />
      <MarchePage embedded />
      <MenuComingSoon fr={fr} />
    </>
  );
};

// ─── MenuComingSoon — teaser du Village Nourriture ───────────────────
// Même grammaire Witcher que les sections du marché : rail indexé,
// panneau hex, photo pleine carte, une seule phrase. Pas de menu, pas
// de promesse détaillée : le chaudron parle.
const MenuComingSoon: React.FC<{ fr: boolean }> = ({ fr }) => (
  <section className="relative caravan-stage bleed-edges fmm-perf-section text-[var(--color-bone)] overflow-hidden">
    <SectionFog />
    <Motes className="opacity-40" count={14} />
    <div className="relative max-w-screen-2xl mx-auto px-5 md:px-10 lg:px-14 pt-24 md:pt-32 pb-24 md:pb-32">
      <SectionTopRail
        index="05"
        name={fr ? 'Village Nourriture' : 'Food Village'}
        meta={fr ? 'Menu' : 'Menu'}
        metaValue={fr ? 'À venir' : 'Soon'}
        className="mb-10 md:mb-14"
      />
      <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
        <header className="lg:col-span-5 min-w-0">
          <Eyebrow className="mb-5 inline-flex items-center gap-3">
            <span aria-hidden className="h-px w-8" style={{ background: 'var(--color-copper)' }} />
            {fr ? 'À la table du seigneur' : 'At the lord’s table'}
          </Eyebrow>
          <DisplayTitle size="xl" glow className="mb-6">
            {fr ? 'Menu à venir' : 'Menu coming soon'}
          </DisplayTitle>
          <p className="font-editorial text-base md:text-lg text-[var(--color-bone)]/80 leading-relaxed max-w-2xl">
            {fr
              ? 'Les seigneurs des fourneaux préparent l’édition 2026. Le menu complet du Village Nourriture sera dévoilé sous peu.'
              : 'The lords of the hearth are preparing the 2026 edition. The Food Village’s full menu will be revealed soon.'}
          </p>
        </header>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-7 min-w-0"
        >
          <HexPanel size="lg" active className="fmm-shimmer">
            <div className="relative h-[clamp(340px,40vw,520px)] overflow-hidden">
              <img
                src="/wix/nourriture/cauldron-teaser.webp"
                alt={fr ? 'Chaudron mijotant sur le feu de bois' : 'Cauldron simmering over the wood fire'}
                decoding="async"
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover fmm-kenburns"
              />
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(184,106,42,0.15) 0%, transparent 40%, rgba(10,2,7,0.9) 100%)',
                }}
              />
              <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                <p
                  className="font-editorial italic uppercase tracking-[0.4em] text-[10px] md:text-[11px] mb-2"
                  style={{ color: 'var(--color-amber-glow)' }}
                >
                  {fr ? 'Cinq tentes, cinq seigneurs' : 'Five tents, five lords'}
                </p>
                <p
                  className="font-display text-2xl md:text-3xl"
                  style={{ color: 'var(--color-bone)', fontWeight: 400, textShadow: '0 4px 24px rgba(0,0,0,0.85)' }}
                >
                  {fr ? 'Le chaudron mijote déjà.' : 'The cauldron is already simmering.'}
                </p>
              </div>
            </div>
          </HexPanel>
        </motion.div>
      </div>
    </div>
  </section>
);

export default LeVillagePage;
