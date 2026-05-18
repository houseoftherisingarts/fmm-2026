import React, { useEffect, useMemo, useState } from 'react';
import { useUI } from '../contexts/AppContext';
import SEO from '../components/SEO';
import {
  PREMIUM_VENDORS,
  MARCHE_VENDORS,
  DIGITAL_VENDORS,
  PREP_PRODUCTS,
} from '../content/marche';
import { applyImageOverrides, loadVendorImageOverrides } from '../firebase/vendorImages';
import PageHeader, { type PageHeaderCta } from '../components/layout/PageHeader';
import { addLocale } from '../lib/locale';
import AtelierHall, { type AtelierCopy } from '../components/marche/AtelierHall';
import MarketSquare, { type MarketCopy } from '../components/marche/MarketSquare';
import MerchantPact, { type PactCopy } from '../components/marche/MerchantPact';
import SealedScroll, { type SealedCopy } from '../components/marche/SealedScroll';
import ForgeCounter, { type ForgeCopy } from '../components/marche/ForgeCounter';

// ─── /marche ─────────────────────────────────────────────────────────
// Top-to-bottom:
//   1. PageHeader   — shared orb header with section-specific image
//                     (/orb/marche.jpg). Same chrome as every pillar.
//   2. AtelierHall  — Premium pavilion, champion-select layout
//   3. MarketSquare — 15 on-site kiosks, item-shop grid + modal
//   4. MerchantPact — Become-a-merchant CTA with stat plates
//   5. SealedScroll — Digital partners, 3D-tilt flip cards
//   6. ForgeCounter — In-house pre-orders, slot tiles
const MarchePage: React.FC = () => {
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
  const prep    = useMemo(() => applyImageOverrides(PREP_PRODUCTS,   overrides), [overrides]);

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
      <SEO title={`${c.header.titleA}${c.header.titleB ? ' & ' + c.header.titleB : ''}`} description={c.header.intro} />

      <PageHeader
        eyebrow={c.header.eyebrow}
        titleA={c.header.titleA}
        titleB={c.header.titleB}
        intro={c.header.intro}
        orbImage="/orb/marche.jpg"
        ctas={ctas}
      />

      <AtelierHall   lang={lang} vendors={premium} copy={c.atelier} />
      <MarketSquare  lang={lang} vendors={marche}  copy={c.market} />
      <MerchantPact  lang={lang} copy={c.pact} />
      <SealedScroll  lang={lang} vendors={digital} copy={c.sealed} />
      <ForgeCounter  lang={lang} products={prep}   copy={c.forge} />
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
  forge:   ForgeCopy;
}

const FR: Copy = {
  header: {
    eyebrow:   'Marché médiéval · Édition 2026',
    titleA:    'Marché',
    titleB:    'Artisans',
    intro:
      'Quatre portes ouvrent sur le même marché : nos kiosques premium, les allées du marché, la boutique numérique, et nos pièces maison à précommander.',
    apply2026: 'Postuler 2026',
    apply2027: 'Réserver 2027',
  },
  atelier: {
    eyebrow: 'Pavillon Premium',
    title:   'Choisissez votre artisan',
    lead:    'Les quatre piliers du marché — marchands qui incarnent la mission FMM et reviennent année après année. Touchez un nom dans la liste pour ouvrir leur atelier.',
    defaultCta: 'Découvrir l’atelier',
    plateLabel: 'Premium',
    picker:     'Kiosques Premium',
    locked:     'Verrouillé',
  },
  market: {
    eyebrow:     'Les allées du marché',
    title:       'Le marché 2026',
    lead:        'Quinze artisans réunis au cœur du site. Filtrez par métier, touchez une tuile pour ouvrir la fiche complète.',
    onsite:      'Sur place uniquement',
    visit:       'Voir la boutique',
    closeLbl:    'Fermer',
    count:       '{n} kiosques sur place',
    filterAll:   'Tous',
    filterLabel: 'Filtrer',
  },
  pact: {
    eyebrow:   'Devenir marchand',
    title:     'Votre kiosque sur le marché',
    body:      'Les inscriptions 2026 sont ouvertes, et la liste 2027 prend forme. Chaque dossier est étudié individuellement — esprit artisanal, ambiance médiévale, conscience écologique.',
    apply2026: 'Postuler 2026',
    apply2027: 'Réserver 2027',
    reviewNote:'Réponse via votre espace client après revue de votre dossier.',
    stat1Number: '15',
    stat1Label:  'Kiosques sur place',
    stat2Number: '4',
    stat2Label:  'Kiosques premium',
    stat3Number: '3 jours',
    stat3Label:  '25–27 septembre',
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
  forge: {
    eyebrow:    'Boutique maison',
    title:      'L’atelier FMM',
    lead:       'Les essentiels signés FMM, livrés à votre porte. Précommande avant l’ouverture du marché, rabais d’avant-festival.',
    preorder:   'Précommander',
    finePrint:  'Pièces sélectionnées et contrôlées par l’équipe FMM. Livraison sous deux à quatre semaines. Précommandes ouvrent prochainement.',
    emptyState: 'Précommandes ouvrent bientôt.',
    rebateBadge:'Rabais festival',
    retailLabel:'Détail',
    festLabel:  'Festival',
  },
};

const EN: Copy = {
  header: {
    eyebrow:   'Medieval market · 2026 edition',
    titleA:    'Market',
    titleB:    'Artisans',
    intro:
      'Four doors into the same market: our premium kiosks, the on-site alleys, the digital shop, and our in-house pieces available for pre-order.',
    apply2026: 'Apply 2026',
    apply2027: 'Reserve 2027',
  },
  atelier: {
    eyebrow: 'Premium Pavilion',
    title:   'Choose your artisan',
    lead:    'The four pillars of the market — merchants who embody the FMM mission and return year after year. Tap a name on the right to open their atelier.',
    defaultCta: 'Visit the atelier',
    plateLabel: 'Premium',
    picker:     'Premium kiosks',
    locked:     'Locked',
  },
  market: {
    eyebrow:     'Through the market alleys',
    title:       'The 2026 market',
    lead:        'Fifteen artisans gathered at the heart of the site. Filter by trade, tap a tile to open the full entry.',
    onsite:      'On site only',
    visit:       'Visit shop',
    closeLbl:    'Close',
    count:       '{n} on-site stalls',
    filterAll:   'All',
    filterLabel: 'Filter',
  },
  pact: {
    eyebrow:   'Become a merchant',
    title:     'Your kiosk at the market',
    body:      '2026 applications are open, and the 2027 list is already taking shape. Each application is reviewed individually — artisan goods, medieval vibe, eco-mindedness.',
    apply2026: 'Apply 2026',
    apply2027: 'Reserve 2027',
    reviewNote:'Response via your client space after review.',
    stat1Number: '15',
    stat1Label:  'On-site kiosks',
    stat2Number: '4',
    stat2Label:  'Premium kiosks',
    stat3Number: '3 days',
    stat3Label:  '25–27 September',
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
  forge: {
    eyebrow:    'In-house shop',
    title:      'The FMM workshop',
    lead:       'FMM-signed essentials, shipped to your door. Pre-order before the market opens, pre-festival discount included.',
    preorder:   'Pre-order',
    finePrint:  'Pieces selected and quality-checked by the FMM team. Shipped in two to four weeks. Pre-orders opening soon.',
    emptyState: 'Pre-orders open soon.',
    rebateBadge:'Festival discount',
    retailLabel:'Retail',
    festLabel:  'Festival',
  },
};

export default MarchePage;
