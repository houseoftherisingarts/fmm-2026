import React from 'react';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import Orb from '../components/layout/Orb';
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
        titleA={fr ? 'Taverne' : 'The Tavern'}
        intro={fr
          ? 'Hypocras, bière et rafraîchissements du festival : le menu complet du comptoir arrive sous peu.'
          : 'Hypocras, ale and festival refreshments: the full bar menu is coming shortly.'}
        orbImage="/wix/nourriture/taverne-orbe-p.webp"
        orbImagePosition="center 32%"
      />}

      {/* En mode embarqué (page du Village Nourriture), le bar annonce
          son entité : le Village Boissons n'est pas le Village
          Nourriture, il le côtoie. Son propre grand cercle, en miroir
          (l'orbe à gauche), pour que la frontière se voie (Alex,
          29 août). */}
      {embedded && (
        <div className="relative max-w-screen-2xl mx-auto px-5 md:px-10 lg:px-14 pt-20 md:pt-28 grid gap-x-12 gap-y-10 items-center lg:grid-cols-[1fr_1.05fr]">
          <div className="w-full max-w-[240px] sm:max-w-[300px] md:max-w-[380px] lg:max-w-[420px] justify-self-center lg:justify-self-start lg:order-1">
            <Orb
              image="/wix/nourriture/taverne-orbe-p.webp"
              position="center 32%"
              label={fr ? 'Chope de bière ambrée sur une table de bois' : 'Mug of amber ale on a wooden table'}
            />
          </div>
          <div className="min-w-0 text-center lg:text-left lg:order-2 lg:pl-6">
            <Eyebrow tone="amber" className="mb-5 inline-flex items-center gap-3">
              <span aria-hidden className="h-px w-8" style={{ background: 'var(--color-amber-glow)' }} />
              {fr ? 'Une autre maison, à côté' : 'Another house, next door'}
            </Eyebrow>
            <DisplayTitle size="xl" glow className="mb-5">
              {fr ? 'Taverne' : 'The Tavern'}
            </DisplayTitle>
            <p className="font-editorial text-base md:text-lg text-[var(--color-bone)]/80 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              {fr
                ? 'La taverne du festival est sa propre maison : elle voisine le Village Nourriture sans lui appartenir. Hypocras, bière et rafraîchissements se servent à son comptoir.'
                : 'The festival tavern is its own house: it sits beside the Food Village without belonging to it. Hypocras, ale and refreshments are served at its counter.'}
            </p>
          </div>
        </div>
      )}

      <section className="relative caravan-stage bleed-edges fmm-perf-section text-[var(--color-bone)] overflow-hidden">
        <SectionFog />
        <div className="relative max-w-screen-2xl mx-auto px-5 md:px-10 lg:px-14 pt-8 md:pt-12 pb-24 md:pb-32">
          <SectionTopRail
            index="01"
            name={fr ? 'Taverne' : 'The Tavern'}
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
                    src="/wix/nourriture/taverne-toast-p.webp"
                    alt={fr ? 'Chopes qui trinquent à la taverne' : 'Mugs clinking at the tavern'}
                    decoding="async"
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover fmm-kenburns"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(var(--sk-copper-rgb),0.15) 0%, transparent 40%, rgba(var(--sk-ink-rgb),0.9) 100%)',
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
