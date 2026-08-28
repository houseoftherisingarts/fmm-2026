import React from 'react';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { ScrollProgress } from '../components/scroll';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import { Eyebrow, DisplayTitle, HexPanel, SectionFog, SectionTopRail } from '../components/marche/atmospherics';

// ─── Boissons (nouveau pilier, 2026-08-27) ───────────────────────────
// Sorti du Village Nourriture à la demande d'Alex : son propre cercle sur
// l'accueil, sa propre page, même gabarit que les autres piliers (en-tête
// PageHeader + grammaire visuelle du marché). Pour l'instant, une seule
// promesse : le menu s'en vient. Le contenu réel arrive plus tard.
const BoissonsPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  useCaravanPage();
  const { lang } = useUI();
  const fr = lang === 'FR';

  return (
    <>
      {!embedded && <SEO
        title={fr ? 'Boissons' : 'Drinks'}
        description={fr
          ? 'Le menu des boissons du festival se prépare et sera dévoilé bientôt.'
          : 'The festival\'s drinks menu is coming together and will be revealed soon.'}
      />}
      {!embedded && <ScrollProgress />}
      {!embedded && <PageHeader
        eyebrow={fr ? 'Au comptoir' : 'At the bar'}
        titleA={fr ? 'Boissons' : 'Drinks'}
        intro={fr
          ? 'Hypocras, bière et rafraîchissements du festival : le menu complet du comptoir arrive sous peu.'
          : 'Hypocras, ale and festival refreshments: the full bar menu is coming shortly.'}
        orbImage="/wix/nourriture/fc0b94ea.jpg"
        orbImagePosition="center 40%"
      />}

      <section className="relative caravan-stage bleed-edges fmm-perf-section text-[var(--color-bone)] overflow-hidden">
        <SectionFog />
        <div className="relative max-w-screen-2xl mx-auto px-5 md:px-10 lg:px-14 pt-8 md:pt-12 pb-24 md:pb-32">
          <SectionTopRail
            index="01"
            name={fr ? 'Boissons' : 'Drinks'}
            meta={fr ? 'Menu' : 'Menu'}
            metaValue={fr ? 'À venir' : 'Soon'}
            className="mb-10 md:mb-14"
          />
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
            <header className="lg:col-span-5 min-w-0">
              <Eyebrow className="mb-5 inline-flex items-center gap-3">
                <span aria-hidden className="h-px w-8" style={{ background: 'var(--color-copper)' }} />
                {fr ? 'Au comptoir du festival' : 'At the festival bar'}
              </Eyebrow>
              <DisplayTitle size="lg" glow className="mb-6">
                {fr ? 'Menu des boissons à venir' : 'Drinks menu coming soon'}
              </DisplayTitle>
              <p className="font-editorial text-base md:text-lg text-[var(--color-bone)]/80 leading-relaxed max-w-2xl">
                {fr
                  ? 'Le comptoir prépare sa carte pour l\'édition 2026. Elle sera dévoilée ici dès qu\'elle sera prête.'
                  : 'The bar is putting together its list for the 2026 edition. It will appear here as soon as it is ready.'}
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
                    src="/wix/nourriture/fc0b94ea.jpg"
                    alt={fr ? 'Chopes levées sur une table du festival' : 'Mugs raised on a festival table'}
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
                      {fr ? 'Bientôt levée' : 'Raised soon'}
                    </p>
                    <p
                      className="font-display text-2xl md:text-3xl"
                      style={{ color: 'var(--color-bone)', fontWeight: 400, textShadow: '0 4px 24px rgba(0,0,0,0.85)' }}
                    >
                      {fr ? 'La carte des boissons s\'en vient.' : 'The drinks list is on its way.'}
                    </p>
                  </div>
                </div>
              </HexPanel>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
};

export default BoissonsPage;
