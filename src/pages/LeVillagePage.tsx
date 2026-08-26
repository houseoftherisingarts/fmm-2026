import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { ScrollProgress } from '../components/scroll';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import { useBadgeAuBout } from '../contexts/BadgesContext';
import { Eyebrow, DisplayTitle, HexPanel, SectionFog, SectionTopRail } from '../components/marche/atmospherics';
import MarchePage from './MarchePage';
import NourriturePage from './NourriturePage';

// ─── Le Village (édition 2026) ──────────────────────────────────────
// Merged pillar. One unified hero + scroll-progress, then the Marché
// renders embedded. Le Village Nourriture est de retour depuis le
// 2026-08-12 : le menu de Marc-Alexis est arrêté et intégré, le teaser
// MenuComingSoon (gardé plus bas) a été remplacé par la vraie section.
const LeVillagePage: React.FC = () => {
  useCaravanPage();
  useBadgeAuBout('village');
  const { lang } = useUI();
  const fr = lang === 'FR';

  // Deux chapitres, repliés à l'arrivée : la page tient sur un écran et
  // on ouvre celui qu'on veut. Cliquer l'orbe ouvre aussi (Alex,
  // 2026-08-23).
  const [marcheOuvert, setMarcheOuvert] = useState(false);
  // Au retour du paiement, le chapitre Nourriture s'ouvre de lui-même :
  // sinon l'acheteur revient sur une page repliée et ne voit pas son
  // remerciement (vérification du 23 août).
  // `?banquet=merci` au retour du paiement, `?banquet=1` pour le lien
  // qu'Alex envoie par courriel : les deux ouvrent le chapitre, sinon
  // l'acheteur tombe sur une page repliée et ne trouve rien.
  const [nourritureOuverte, setNourritureOuverte] = useState(() => {
    if (typeof window === 'undefined') return false;
    const q = new URLSearchParams(window.location.search).get('banquet');
    return q === 'merci' || q === '1';
  });

  return (
    <>
      <SEO title={fr ? 'Marché' : 'Market'} />
      <ScrollProgress />
      <PageHeader
        eyebrow={fr ? 'Le cœur battant du festival' : 'The beating heart of the festival'}
        titleA={fr ? 'Marché' : 'Market'}
        intro={fr
          ? 'Les artisans, le pavillon premium, les kiosques et le faubourg : tout ce qui se découvre et se rapporte du festival.'
          : 'Artisans, the premium pavilion, the kiosks and the faubourg: everything you discover and bring home from the festival.'}
        orbImage="/wix/marche/64edb1ee.jpg"
        orbImagePosition="center 45%"
        onOrbClick={() => setMarcheOuvert((v) => !v)}
        orbLabel={fr ? 'Ouvrir le marché' : 'Open the market'}
      />
      <ChapitreBouton
        label={fr ? 'Le marché' : 'The market'}
        note={fr ? 'Pavillon premium, kiosques, marchands' : 'Premium pavilion, kiosks, merchants'}
        open={marcheOuvert}
        onClick={() => setMarcheOuvert((v) => !v)}
      />
      <Repli open={marcheOuvert}>
        <MarchePage embedded />
      </Repli>

      <PageHeader
        mirrored
        eyebrow={fr ? 'Le village gustatif' : 'The food village'}
        titleA={fr ? 'Nourriture' : 'Food'}
        intro={fr
          ? 'Les cuisines de clans, la taverne, le banquet du Prince William : tout ce qui se mange et se boit sur le site.'
          : 'Clan kitchens, the tavern, the Prince William banquet: everything you eat and drink on site.'}
        orbImage="/wix/nourriture/feu-broche-v3.webp"
        orbImagePosition="45% 50%"
        onOrbClick={() => setNourritureOuverte((v) => !v)}
        orbLabel={fr ? 'Ouvrir le village gustatif' : 'Open the food village'}
      />
      <ChapitreBouton
        label={fr ? 'La nourriture' : 'The food'}
        note={fr
          ? 'Le banquet, le menu du village et le livre de recettes'
          : 'The banquet, the village menu and the cookbook'}
        open={nourritureOuverte}
        onClick={() => setNourritureOuverte((v) => !v)}
      />
      <Repli open={nourritureOuverte}>
        <NourriturePage embedded />
      </Repli>
    </>
  );
};

// ─── Le bouton d'un chapitre ────────────────────────────────────────
const ChapitreBouton: React.FC<{
  label: string; note: string; open: boolean; onClick: () => void;
}> = ({ label, note, open, onClick }) => (
  <div className="relative z-10 max-w-screen-2xl mx-auto px-5 md:px-10 lg:px-14 -mt-2 mb-6 md:mb-10">
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className="fmm-glass-btn w-full px-7 py-5 md:py-6"
      style={{ flexDirection: 'row', justifyContent: 'space-between' }}
    >
      <span className="text-left">
        <span className="fmm-glass-btn-label block">{label}</span>
        <span className="fmm-glass-btn-note block mt-1.5">{note}</span>
      </span>
      <ChevronDown
        size={22}
        style={{
          color: 'var(--color-amber-glow)',
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform .35s ease',
        }}
      />
    </button>
  </div>
);

// ─── Le repli ───────────────────────────────────────────────────────
const Repli: React.FC<{ open: boolean; children: React.ReactNode }> = ({ open, children }) => (
  <AnimatePresence initial={false}>
    {open && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        style={{ overflow: 'hidden' }}
      >
        {children}
      </motion.div>
    )}
  </AnimatePresence>
);

// ─── MenuComingSoon · teaser du Village Nourriture (retiré 2026-08-12) ─
// Même grammaire Witcher que les sections du marché : rail indexé,
// panneau hex, photo pleine carte, une seule phrase. Gardé en réserve
// au cas où le menu devrait redisparaître; exporté pour calmer TS6133.
export const MenuComingSoon: React.FC<{ fr: boolean }> = ({ fr }) => (
  <section className="relative caravan-stage bleed-edges fmm-perf-section text-[var(--color-bone)] overflow-hidden">
    <SectionFog />
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
          {/* size lg : en colonne étroite, xl pousse sur trois lignes. */}
          <DisplayTitle size="lg" glow className="mb-6">
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
