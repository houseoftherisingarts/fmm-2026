import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { addLocale } from '../../lib/locale';
import { Motes, useSfx } from './effects';
import { SectionFog } from './atmospherics';

interface Props {
  lang: 'FR' | 'EN';
  copy: PactCopy;
}

export interface PactCopy {
  eyebrow:    string;
  title:      string;
  body:       string;
  apply2027:  string;
  reviewNote: string;
}

// ─── MerchantPact — Glossary register ────────────────────────────────
// Pattern lifted from the Witcher 4 Glossary mockup: NO contained
// panel. Content floats on the page; tabs and HUD live as hairline
// rules at the top and bottom of the section. An atmospheric image
// bleeds in from the right edge and fades into the velvet stage.
// Italic amber lore-quote acts as the intro register before the body.
const MerchantPact: React.FC<Props> = ({ lang, copy }) => {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const playLoot = useSfx('/orb/sfx/loot.mp3', 0.45);

  const perks: PerkTile[] = lang === 'FR' ? FR_PERKS : EN_PERKS;

  // 2026 est complète : le seul geste possible est de postuler pour 2027.
  const onApply = () => {
    playLoot();
    navigate(addLocale('/marche/inscription', lang) + '?year=2027');
  };

  const loreQuote = lang === 'FR'
    ? '« Aux marchands voyageurs : la caravane 2026 est au complet. Ceux de 2027 seront bientôt appelés. »'
    : '« To travelling merchants: the 2026 caravan is full. Those of 2027 will soon be called. »';
  const loreAttrib = lang === 'FR' ? '· Avis affiché à l’entrée du site' : '· Posted at the site entrance';

  return (
    <section
      className="relative caravan-stage bleed-edges fmm-perf-section text-[var(--color-bone)] overflow-hidden py-16 md:py-24"
    >
      {/* Backdrop image removed — section now sits cleanly on the
          continuous page bg with just grain + fog atmosphere. */}
      <SectionFog />
      <Motes className="opacity-70" count={34} />

      <div className="relative max-w-screen-xl mx-auto w-full px-4 md:px-8">
        {/* ─── TOP HAIRLINE — state registers, read-only ──────── */}
        <div className="flex items-center justify-between gap-4 mb-12 md:mb-16 pb-2" style={{ borderBottom: '1px solid rgba(244, 239, 227, 0.10)' }}>
          <div className="flex items-center gap-6 md:gap-9 flex-wrap">
            <span className="flex items-baseline gap-3">
              <span className="witcher-stat-label">{lang === 'FR' ? 'Cohorte 2026' : 'Cohort 2026'}</span>
              <span className="font-sans text-sm tracking-[0.2em]" style={{ color: 'rgba(244,239,227,0.55)', fontWeight: 300 }}>
                {lang === 'FR' ? 'Complète' : 'Full'}
              </span>
            </span>
            <span aria-hidden className="hidden sm:block w-px h-5" style={{ background: 'rgba(244,239,227,0.12)' }} />
            <span className="flex items-baseline gap-3">
              <span className="witcher-stat-label">{lang === 'FR' ? 'Cohorte 2027' : 'Cohort 2027'}</span>
              <span className="font-sans text-sm tracking-[0.2em]" style={{ color: '#D8B05A', fontWeight: 300 }}>
                {lang === 'FR' ? 'Inscriptions ouvertes' : 'Applications open'}
              </span>
            </span>
          </div>
        </div>

        {/* ─── MAIN BODY — text column, breathes on the left ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl"
        >
          <p
            className="font-sans uppercase tracking-[0.45em] text-[10px] md:text-[11px] mb-7"
            style={{ color: '#D8B05A' }}
          >
            {copy.eyebrow}
          </p>

          <h2
            className="font-display leading-[1.02] tracking-[-0.005em] text-3xl sm:text-4xl md:text-6xl lg:text-7xl mb-9"
            style={{
              color: 'var(--color-bone)',
              fontWeight: 400,
              textShadow: '0 0 24px rgba(232, 177, 74, 0.28), 0 0 60px rgba(184, 106, 42, 0.22)',
            }}
          >
            {copy.title}
          </h2>

          {/* Italic lore-quote — sits like the Sea Siren intro */}
          <blockquote className="mb-8 pl-4" style={{ borderLeft: '1px solid rgba(216, 176, 90, 0.45)' }}>
            <p
              className="font-editorial italic text-base md:text-lg leading-snug"
              style={{ color: '#D8B05A', fontWeight: 400 }}
            >
              {loreQuote}
            </p>
            <p
              className="font-sans uppercase tracking-[0.35em] text-[10px] mt-2"
              style={{ color: 'rgba(216, 176, 90, 0.55)' }}
            >
              {loreAttrib}
            </p>
          </blockquote>

          <p
            className="font-sans text-base md:text-lg leading-[1.75] mb-4"
            style={{ color: 'rgba(244, 239, 227, 0.78)', fontWeight: 300 }}
          >
            {copy.body}
          </p>
          <p
            className="font-sans text-sm leading-relaxed mb-12"
            style={{ color: 'rgba(244, 239, 227, 0.45)', fontWeight: 300 }}
          >
            {copy.reviewNote}
          </p>

          {/* Perks row — diamond tiles floating, not in a container */}
          <div className="mb-12">
            <p className="witcher-stat-label mb-5">{lang === 'FR' ? 'Inclus' : 'Included'}</p>
            <ul className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-7">
              {perks.map((p, i) => (
                <PerkCell key={p.label} perk={p} index={i} reduce={!!reduce} />
              ))}
            </ul>
          </div>

        </motion.div>

        {/* ─── APPEL À L'ACTION ────────────────────────────────
            Le prompt witcher discret se perdait dans le filet du bas.
            C'est le seul geste de la section : il prend le centre, en
            grand, entre les deux filets. */}
        <div
          className="mt-14 md:mt-20 pt-12 md:pt-16 pb-2 flex flex-col items-center text-center"
          style={{ borderTop: '1px solid rgba(244, 239, 227, 0.10)' }}
        >
          <motion.button
            type="button"
            onClick={onApply}
            whileHover={reduce ? undefined : { y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="group relative inline-flex items-center justify-center gap-4 px-10 md:px-16 py-5 md:py-6 font-sans uppercase tracking-[0.3em] text-sm md:text-base"
            style={{
              color: '#1a050b',
              fontWeight: 600,
              background: 'linear-gradient(180deg, #E8C87A 0%, #D8B05A 55%, #B98F3E 100%)',
              clipPath: 'polygon(22px 0, 100% 0, calc(100% - 22px) 100%, 0 100%)',
              boxShadow: '0 0 48px -8px rgba(216,176,90,0.65), 0 18px 40px -14px rgba(0,0,0,0.8)',
            }}
          >
            {copy.apply2027}
            <span aria-hidden className="inline-block w-6 h-px bg-[#1a050b]/70 transition-all group-hover:w-12" />
          </motion.button>

          <p
            className="font-sans text-xs md:text-sm tracking-[0.25em] uppercase mt-6"
            style={{ color: 'rgba(244, 239, 227, 0.5)', fontWeight: 300 }}
          >
            {lang === 'FR' ? 'Réponse via votre espace marchand' : 'Reply via your merchant space'}
          </p>
        </div>
        <div className="mt-12 md:mt-16" style={{ borderTop: '1px solid rgba(244, 239, 227, 0.10)' }} />
      </div>
    </section>
  );
};

// ─── PerkCell ────────────────────────────────────────────────────────
// Vertical perk cell — small diamond tile on top, label + detail below.
// Used in a 4-column grid that flows under the body copy.
interface PerkTile {
  label:  string;
  detail: string;
  icon:   React.FC<{ size?: number }>;
}
const PerkCell: React.FC<{ perk: PerkTile; index: number; reduce: boolean }> = ({
  perk,
  index,
  reduce,
}) => {
  const Icon = perk.icon;
  return (
    <motion.li
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: 0.06 * index }}
      className="flex flex-col items-start gap-6"
    >
      <span className="witcher-tile shrink-0" style={{ width: 54, height: 54 }}>
        <span className="witcher-tile-inner" style={{ color: '#D8B05A' }}>
          <Icon size={16} />
        </span>
      </span>
      <span className="flex flex-col min-w-0">
        <span
          className="font-sans uppercase tracking-[0.25em] text-[11px] leading-tight"
          style={{ color: 'var(--color-bone)' }}
        >
          {perk.label}
        </span>
        <span
          className="font-sans text-[12px] leading-snug mt-1"
          style={{ color: 'rgba(244, 239, 227, 0.5)', fontWeight: 300 }}
        >
          {perk.detail}
        </span>
      </span>
    </motion.li>
  );
};


// ─── Line-art icons ─────────────────────────────────────────────────
const IconKiosk: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9 L12 4 L21 9" /><path d="M5 9 V20 H19 V9" /><path d="M9 20 V14 H15 V20" />
  </svg>
);
const IconUser: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="3.5" /><path d="M5 20 c0-4 3-6 7-6 s7 2 7 6" />
  </svg>
);
const IconLink: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 14 L14 10" /><path d="M8 12 a3 3 0 0 1 0 -4 l2 -2 a3 3 0 0 1 4 4 l-1 1" /><path d="M16 12 a3 3 0 0 1 0 4 l-2 2 a3 3 0 0 1 -4 -4 l1 -1" />
  </svg>
);
const IconShield: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3 L19 6 V12 c0 5 -3 8 -7 9 c-4 -1 -7 -4 -7 -9 V6 Z" />
  </svg>
);

const FR_PERKS: PerkTile[] = [
  { label: 'Kiosque sur place',    detail: '3 jours · emplacement assigné',  icon: IconKiosk  },
  { label: 'Espace marchand',      detail: 'Statut, messagerie, dossier',    icon: IconUser   },
  { label: 'Boutique sur /marche', detail: 'Lien externe ou page interne',   icon: IconLink   },
  { label: 'Accompagnement FMM',   detail: 'Décor · logistique · contacts',  icon: IconShield },
];
const EN_PERKS: PerkTile[] = [
  { label: 'On-site kiosk',     detail: '3 days · assigned spot',         icon: IconKiosk  },
  { label: 'Merchant space',    detail: 'Status, messaging, dossier',     icon: IconUser   },
  { label: 'Listing on /marche',detail: 'External link or internal page', icon: IconLink   },
  { label: 'FMM support',       detail: 'Decor · logistics · contacts',   icon: IconShield },
];

export default MerchantPact;
