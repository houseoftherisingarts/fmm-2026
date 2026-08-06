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
//   1. PageHeader   : shared orb header with section-specific image
//                     (/orb/marche.jpg). Same chrome as every pillar.
//   2. AtelierHall  : Premium pavilion, champion-select layout
//   3. MarketSquare : 15 on-site kiosks, item-shop grid + modal
//   4. MerchantPact : Become-a-merchant CTA with stat plates
//   5. SealedScroll : Digital partners, 3D-tilt flip cards
const MarchePage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { lang } = useUI();
  const c = lang === 'FR' ? FR : EN;

  // Single continuous page background: toggled on <body> for the
  // duration of this route. All /marche sections are transparent and
  // sit on top of this one gradient, so there's literally no per-
  // section paint to seam.
  useEffect(() => {
    document.body.classList.add('fmm-caravan-page');
    return () => { document.body.classList.remove('fmm-caravan-page'); };
  }, []);

  // Per-vendor image override map: populated from Firestore on mount.
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
      label:   c.header.apply2027,
      to:      addLocale('/marche/inscription', lang) + '?year=2027',
      variant: 'primary',
    },
  ];

  return (
    <>
      {!embedded && <SEO title={`${c.header.titleA}${c.header.titleB ? ' & ' + c.header.titleB : ''}`} description={c.header.intro} />}
      {!embedded && <ScrollProgress />}

      {/* En mode embarqué, le hero de la page porte déjà le mot « Marché ».
          Le sous-titre répétait « Marché médiéval · Édition 2026 / Marché »
          juste en dessous et poussait le Pavillon Premium loin vers le bas,
          pour rien. Retiré 2026-08-02. */}
      {embedded ? null : (
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
    apply2027: 'Postuler 2027',
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
    title:       'Les Kiosques',
    lead:        'Les artisans qui ont tenu place au marché. Filtrez par édition ou par métier, touchez une tuile pour ouvrir la fiche complète.',
    onsite:      'Sur place uniquement',
    visit:       'Voir la boutique',
    closeLbl:    'Fermer',
    count:       '{n} kiosques',
    filterAll:   'Tous',
    filterLabel: 'Métier',
    yearLabel:   'Édition',
    yearAll:     'Toutes',
    emptyYear:   'Aucun kiosque saisi pour cette édition. Le marché 2026 sera dévoilé sous peu.',
    photoCaption:'Un kiosque du marché, monté sous la tente.',
  },
  pact: {
    eyebrow:   'Devenir marchand',
    title:     'Votre kiosque sur le marché',
    body:      'La cohorte 2026 est complète. Les inscriptions 2027 sont ouvertes, et la liste sera dévoilée sous peu. Chaque dossier est étudié individuellement : esprit artisanal, ambiance médiévale, conscience écologique.',
    apply2027: 'Postuler 2027',
    reviewNote:'Réponse via votre espace client après revue de votre dossier.',
  },
  sealed: {
    eyebrow:    'Boutique digitale',
    title:      'Préparez-vous au festival',
    lead:       'Nos partenaires en ligne : pas de kiosque sur place, mais ils vous équipent pour le festival. Retournez la carte pour voir le code promo.',
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
    apply2027: 'Apply 2027',
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
    title:       'The Kiosks',
    lead:        'The artisans who have held a spot at the market. Filter by edition or by trade, tap a tile to open the full entry.',
    onsite:      'On site only',
    visit:       'Visit shop',
    closeLbl:    'Close',
    count:       '{n} stalls',
    filterAll:   'All',
    filterLabel: 'Trade',
    yearLabel:   'Edition',
    yearAll:     'All',
    emptyYear:   'No kiosk recorded for this edition. The 2026 market will be revealed soon.',
    photoCaption:'A market kiosk, pitched under the canvas.',
  },
  pact: {
    eyebrow:   'Become a merchant',
    title:     'Your kiosk at the market',
    body:      'The 2026 cohort is full. 2027 applications are open, and the list will be revealed soon. Each application is reviewed individually: artisan goods, medieval vibe, eco-mindedness.',
    apply2027: 'Apply 2027',
    reviewNote:'Response via your client space after review.',
  },
  sealed: {
    eyebrow:    'Digital shop',
    title:      'Get festival-ready',
    lead:       'Our online partners: no on-site kiosk, but they kit you out for the festival. Flip the card to see the promo code.',
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
