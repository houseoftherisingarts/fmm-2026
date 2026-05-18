import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { addLocale } from '../../lib/locale';
import { useSfx } from './effects';
import { SectionFog } from './atmospherics';

interface Props {
  lang: 'FR' | 'EN';
  copy: PactCopy;
}

export interface PactCopy {
  eyebrow:    string;
  title:      string;
  body:       string;
  apply2026:  string;
  apply2027:  string;
  reviewNote: string;
  stat1Number: string;
  stat1Label:  string;
  stat2Number: string;
  stat2Label:  string;
  stat3Number: string;
  stat3Label:  string;
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
  const [year, setYear] = useState<2026 | 2027>(2026);
  const playLoot = useSfx('/orb/sfx/loot.mp3', 0.45);

  const perks: PerkTile[] = lang === 'FR' ? FR_PERKS : EN_PERKS;

  const onApply = () => {
    playLoot();
    navigate(addLocale('/marche/inscription', lang) + `?year=${year}`);
  };

  const loreQuote = lang === 'FR'
    ? '« Aux marchands voyageurs : la caravane se rassemble. Quinze places, trois jours, un site. »'
    : '« To travelling merchants: the caravan gathers. Fifteen pitches, three days, one site. »';
  const loreAttrib = lang === 'FR' ? '— Avis affiché à l’entrée du site' : '— Posted at the site entrance';

  return (
    <section
      className="relative caravan-stage bleed-edges fmm-perf-section text-[var(--color-bone)] overflow-hidden py-24 md:py-36"
    >
      {/* Backdrop image removed — section now sits cleanly on the
          continuous page bg with just grain + fog atmosphere. */}
      <SectionFog />

      <div className="relative max-w-screen-xl mx-auto w-full px-4 md:px-8">
        {/* ─── TOP HAIRLINE — tabs + capacity readout ─────────── */}
        <div className="flex items-center justify-between gap-4 mb-12 md:mb-16 pb-2" style={{ borderBottom: '1px solid rgba(244, 239, 227, 0.10)' }}>
          <div className="flex items-center -ml-2">
            <button
              type="button"
              className="witcher-tab"
              data-active={year === 2026 || undefined}
              onClick={() => setYear(2026)}
            >
              {lang === 'FR' ? 'Cohorte 2026' : 'Cohort 2026'}
            </button>
            <button
              type="button"
              className="witcher-tab"
              data-active={year === 2027 || undefined}
              onClick={() => setYear(2027)}
            >
              {lang === 'FR' ? 'Liste 2027' : '2027 list'}
            </button>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="witcher-stat-label">{lang === 'FR' ? 'Places' : 'Slots'}</span>
            <span
              className="font-sans text-sm tracking-[0.2em]"
              style={{ color: '#D8B05A', fontWeight: 300 }}
            >
              {year === 2026 ? '15 / 15' : '— / 15'}
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

          {/* Stats row — horizontal, floating */}
          <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
            <StatInline num={copy.stat1Number} label={copy.stat1Label} />
            <span aria-hidden className="hidden sm:block w-px h-8" style={{ background: 'rgba(244,239,227,0.12)' }} />
            <StatInline num={copy.stat2Number} label={copy.stat2Label} />
            <span aria-hidden className="hidden sm:block w-px h-8" style={{ background: 'rgba(244,239,227,0.12)' }} />
            <StatInline num={copy.stat3Number} label={copy.stat3Label} />
          </div>
        </motion.div>

        {/* ─── BOTTOM HAIRLINE HUD — action prompts ─────────── */}
        <div className="mt-16 md:mt-20 pt-5 flex items-center justify-between flex-wrap gap-y-4" style={{ borderTop: '1px solid rgba(244, 239, 227, 0.10)' }}>
          <div className="flex items-center gap-8 md:gap-11">
            <button type="button" className="witcher-prompt" data-primary="true" onClick={onApply}>
              <span className="witcher-prompt-glyph"><span>A</span></span>
              {year === 2026 ? copy.apply2026 : copy.apply2027}
            </button>
            <button
              type="button"
              className="witcher-prompt"
              onClick={() => setYear((y) => (y === 2026 ? 2027 : 2026))}
            >
              <span className="witcher-prompt-glyph"><span>X</span></span>
              {year === 2026
                ? (lang === 'FR' ? 'Voir 2027' : 'View 2027')
                : (lang === 'FR' ? 'Voir 2026' : 'View 2026')}
            </button>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <span className="witcher-stat-label">{lang === 'FR' ? 'Réponse' : 'Reply'}</span>
            <span
              className="font-sans text-xs tracking-[0.25em]"
              style={{ color: 'rgba(244, 239, 227, 0.78)', fontWeight: 300 }}
            >
              {lang === 'FR' ? 'Via votre espace marchand' : 'Via your merchant space'}
            </span>
          </div>
        </div>
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

// ─── StatInline ──────────────────────────────────────────────────────
const StatInline: React.FC<{ num: string; label: string }> = ({ num, label }) => (
  <span className="flex items-baseline gap-3">
    <span
      className="witcher-stat-num"
      style={{ fontSize: 'clamp(1.5rem, 2.6vw, 2rem)' }}
    >
      {num}
    </span>
    <span className="witcher-stat-label">{label}</span>
  </span>
);

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
