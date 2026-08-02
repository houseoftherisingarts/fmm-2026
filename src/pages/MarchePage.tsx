import React, { useEffect, useMemo, useState } from 'react';
import { useUI } from '../contexts/AppContext';
import SEO from '../components/SEO';
import {
  PREMIUM_VENDORS,
  MARCHE_VENDORS,
  DIGITAL_VENDORS,
} from '../content/marche';
import { applyImageOverrides, loadVendorImageOverrides } from '../firebase/vendorImages';
import PageHeader, { type PageHeaderCta } from '../components/layout/PageHeader';
import { ScrollProgress } from '../components/scroll';
import { addLocale } from '../lib/locale';
import AtelierHall, { type AtelierCopy } from '../components/marche/AtelierHall';
import MarketSquare, { type MarketCopy } from '../components/marche/MarketSquare';
import MerchantPact, { type PactCopy } from '../components/marche/MerchantPact';
import SealedScroll, { type SealedCopy } from '../components/marche/SealedScroll';

// ─── /marche ─────────────────────────────────────────────────────────
// Top-to-bottom:
//   1. PageHeader   — shared orb header with section-specific image
//                     (/orb/marche.jpg). Same chrome as every pillar.
//   2. AtelierHall  — Premium pavilion, champion-select layout
//   3. MarketSquare — 15 on-site kiosks, item-shop grid + modal
//   4. MerchantPact — Become-a-merchant CTA with stat plates
//   5. SealedScroll — Digital partners, 3D-tilt flip cards
const MarchePage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { lang } = useUI();
  const c = lang === 'FR' ? FR : EN;

  // Single continuous page background — toggled on <body> for the
  // duration of this route. All /marche sections are transparent and
  // sit on top of this one gradient, so there's literally no per-
  // section paint to seam.
  useEffect(() => {
    document.body.classList.add('fmm-caravan-page');
    return () => { document.body.classList.remove('fmm-caravan-page'); };
  }, []);

  // Per-vendor image override map — populated from Firestore on mount.
  // Precedence (highest first):
  //   1. Jesse's CRM override (crm/vendor-image-overrides)         ← here
  //   2. Vendor's self-uploaded mainPhotoUrl (future, not yet wired)
  //   3. Hardcoded `image` in src/content/marche.ts                ← fallback
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  useEffect(() => {
    let live = true;
    loadVendorImageOverrides().then((o) => { if (live) setOverrides(o); });
    return () => { live = false; };
  }, []);

  const premium = useMemo(() => applyImageOverrides(PREMIUM_VENDORS, overrides), [overrides]);
  const marche  = useMemo(() => applyImageOverrides(MARCHE_VENDORS,  overrides), [overrides]);
  const digital = useMemo(() => applyImageOverrides(DIGITAL_VENDORS, overrides), [overrides]);

  const ctas: PageHeaderCta[] = [
    {
      label:   c.header.apply2026,
      to:      addLocale('/marche/inscription', lang) + '?year=2026',
      variant: 'primary',
    },
    {
      label:   c.header.apply2027,
      to:      addLocale('/marche/inscription', lang) + '?year=2027',
      variant: 'ghost',
    },
  ];

  return (
    <>
      {!embedded && <SEO title={`${c.header.titleA}${c.header.titleB ? ' & ' + c.header.titleB : ''}`} description={c.header.intro} />}
      {!embedded && <ScrollProgress />}

      {embedded ? (
        <section className="relative pt-20 md:pt-28 pb-2">
          <div className="max-w-screen-xl mx-auto px-4 md:px-8">
            <p className="font-editorial italic uppercase tracking-[0.4em] text-[11px] md:text-xs text-[var(--color-amber-glow)] mb-3">{c.header.eyebrow}</p>
            <h2 className="font-display title-medieval text-4xl md:text-6xl text-ivory leading-[1.04]">{c.header.titleA}</h2>
            <div className="divider-brass w-24 mt-5" />
          </div>
        </section>
      ) : (
        <PageHeader
          eyebrow={c.header.eyebrow}
          titleA={c.header.titleA}
          titleB={c.header.titleB}
          intro={c.header.intro}
          orbImage="/orb/marche.jpg"
          ctas={ctas}
        />
      )}

      <AtelierHall   lang={lang} vendors={premium} copy={c.atelier} />
      <MarketSquare  lang={lang} vendors={marche}  copy={c.market} />
      <MerchantPact  lang={lang} copy={c.pact} />
      <SealedScroll  lang={lang} vendors={digital} copy={c.sealed} />
    </>
  );
};

interface HeaderCopy {
  eyebrow:   string;
  titleA:    string;
  titleB?:   string;
  intro:     string;
  apply2026: string;
  apply2027: string;
}

interface Copy {
  header:  HeaderCopy;
  atelier: AtelierCopy;
  market:  MarketCopy;
  pact:    PactCopy;
  sealed:  SealedCopy;
}

const FR: Copy = {
  header: {
    eyebrow:   'Marché médiéval · Édition 2026',
    titleA:    'Marché',
    titleB:    'Artisans',
    intro:
      'Trois portes ouvrent sur le même marché : nos kiosques premium, les allées du marché, et la boutique numérique.',
    apply2026: 'Postuler 2026',
    apply2027: 'Réserver 2027',
  },
  atelier: {
    eyebrow: 'Pavillon Premium',
    title:   'Kiosques Premium',
    lead:    'Les artisans vedettes du marché, ceux qui incarnent la mission FMM et reviennent année après année. Le pavillon tourne de lui-même : laissez-le défiler, ou touchez un nom.',
    defaultCta: 'Voir le site',
    plateLabel: 'Premium',
    picker:     'Nos artisans',
    locked:     'Verrouillé',
  },
  market: {
    eyebrow:     'Les allées du marché',
    title:       'Le marché 2025',
    lead:        'Un aperçu de l’édition passée : les artisans qui tiennent vitrine en ligne. Le marché 2026 sera dévoilé sous peu. Touchez une tuile pour ouvrir la fiche complète.',
    onsite:      'Sur place uniquement',
    visit:       'Voir la boutique',
    closeLbl:    'Fermer',
    count:       'Marché 2026 dévoilé sous peu',
    filterAll:   'Tous',
    filterLabel: 'Filtrer',
  },
  pact: {
    eyebrow:   'Devenir marchand',
    title:     'Votre kiosque sur le marché',
    body:      'La cohorte 2026 est complète. Les inscriptions 2027 sont ouvertes, et la liste sera dévoilée sous peu. Chaque dossier est étudié individuellement : esprit artisanal, ambiance médiévale, conscience écologique.',
    apply2026: 'Postuler 2027',
    apply2027: 'Postuler 2027',
    reviewNote:'Réponse via votre espace client après revue de votre dossier.',
    stat1Number: '',
    stat1Label:  '',
    stat2Number: '',
    stat2Label:  '',
    stat3Number: '',
    stat3Label:  '',
  },
  sealed: {
    eyebrow:    'Boutique digitale',
    title:      'Préparez-vous au festival',
    lead:       'Nos partenaires en ligne — pas de kiosque sur place, mais ils vous équipent pour le festival. Retournez la carte pour voir le code promo.',
    visit:      'Voir la boutique',
    promoLabel: 'Code promo',
    copyAction: 'Copier',
    copied:     'Copié',
    flipCta:    'Voir le code',
    flipBack:   'Retour',
    emptyState: 'Nos partenaires en ligne seront annoncés sous peu.',
  },
};

const EN: Copy = {
  header: {
    eyebrow:   'Medieval market · 2026 edition',
    titleA:    'Market',
    titleB:    'Artisans',
    intro:
      'Three doors into the same market: our premium kiosks, the on-site alleys, and the digital shop.',
    apply2026: 'Apply 2026',
    apply2027: 'Reserve 2027',
  },
  atelier: {
    eyebrow: 'Premium Pavilion',
    title:   'Premium Kiosks',
    lead:    'The market’s flagship artisans, the ones who embody the FMM mission and return year after year. The pavilion turns on its own: let it cycle, or tap a name.',
    defaultCta: 'Visit their site',
    plateLabel: 'Premium',
    picker:     'Our artisans',
    locked:     'Locked',
  },
  market: {
    eyebrow:     'Through the market alleys',
    title:       'The 2025 market',
    lead:        'A look back at last edition: the artisans with an online storefront. The 2026 market will be revealed soon. Tap a tile to open the full entry.',
    onsite:      'On site only',
    visit:       'Visit shop',
    closeLbl:    'Close',
    count:       '2026 market revealed soon',
    filterAll:   'All',
    filterLabel: 'Filter',
  },
  pact: {
    eyebrow:   'Become a merchant',
    title:     'Your kiosk at the market',
    body:      'The 2026 cohort is full. 2027 applications are open, and the list will be revealed soon. Each application is reviewed individually: artisan goods, medieval vibe, eco-mindedness.',
    apply2026: 'Apply 2027',
    apply2027: 'Apply 2027',
    reviewNote:'Response via your client space after review.',
    stat1Number: '',
    stat1Label:  '',
    stat2Number: '',
    stat2Label:  '',
    stat3Number: '',
    stat3Label:  '',
  },
  sealed: {
    eyebrow:    'Digital shop',
    title:      'Get festival-ready',
    lead:       'Our online partners — no on-site kiosk, but they kit you out for the festival. Flip the card to see the promo code.',
    visit:      'Visit shop',
    promoLabel: 'Promo code',
    copyAction: 'Copy',
    copied:     'Copied',
    flipCta:    'See the code',
    flipBack:   'Back',
    emptyState: 'Online partners coming soon.',
  },
};

export default MarchePage;
