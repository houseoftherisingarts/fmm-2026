import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { MarcheKiosk } from '../../content/marche';
import { Eyebrow, DisplayTitle, HexPanel, HexMark, SectionFog, SectionTopRail, SectionBottomRail } from './atmospherics';
import { useSpotlight, useSfx } from './effects';

interface Props {
  lang: 'FR' | 'EN';
  vendors: MarcheKiosk[];
  copy: MarketCopy;
}

export interface MarketCopy {
  eyebrow:    string;
  title:      string;
  lead:       string;
  onsite:     string;
  visit:      string;
  closeLbl:   string;
  count:      string;
  filterAll:  string;
  filterLabel:string;
}

// ─── MarketSquare — Item-shop grid ──────────────────────────────────
// Caravan item-shop aesthetic for the 15 on-site kiosks. Each stall is
// a photo tile with a copper-edged frame. Hover: tile lifts, photo
// scales, gold rim glows, caption slides up. Click: opens a full-bleed
// detail modal with the artisan photo on one side and lore on the
// other. Category chips at the top filter the grid live.
const MarketSquare: React.FC<Props> = ({ lang, vendors, copy }) => {
  const [filter, setFilter] = useState<string>('ALL');
  const [openId, setOpenId] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const playLoot = useSfx('/orb/sfx/loot.mp3', 0.45);

  const categories = useMemo(() => {
    const set = new Set<string>();
    vendors.forEach((v) => set.add(v.category));
    return Array.from(set);
  }, [vendors]);
  const filtered = useMemo(
    () => (filter === 'ALL' ? vendors : vendors.filter((v) => v.category === filter)),
    [vendors, filter],
  );
  const open = vendors.find((v) => v.id === openId) ?? null;

  return (
    <section className="relative caravan-stage bleed-edges fmm-perf-section text-[var(--color-bone)] overflow-hidden">
      <SectionFog />

      <div className="relative max-w-screen-2xl mx-auto px-5 md:px-10 lg:px-14 pt-24 md:pt-32 pb-24 md:pb-32">
        <SectionTopRail
          index="02"
          name={copy.eyebrow}
          meta={lang === 'FR' ? 'Kiosques' : 'Stalls'}
          metaValue={`${filtered.length} / ${vendors.length}`}
          className="mb-10 md:mb-14"
        />
        <header className="grid md:grid-cols-12 gap-x-10 gap-y-6 mb-12 md:mb-16">
          <div className="md:col-span-8">
            <Eyebrow className="mb-5 inline-flex items-center gap-3">
              <span aria-hidden className="h-px w-8" style={{ background: 'var(--color-copper)' }} />
              {copy.eyebrow}
            </Eyebrow>
            <DisplayTitle size="xl" glow className="mb-6">{copy.title}</DisplayTitle>
            <p className="font-editorial text-base md:text-lg text-[var(--color-bone)]/80 leading-relaxed max-w-2xl">
              {copy.lead}
            </p>
          </div>
          <div className="md:col-span-4 md:self-end">
            <p
              className="font-sans text-[10px] tracking-[0.5em]"
              style={{ color: 'var(--color-amber-glow)', opacity: 0.85 }}
            >
              {copy.count.replace('{n}', String(filtered.length))}
            </p>
          </div>
        </header>

        {/* Category chips */}
        <div className="mb-10 md:mb-14 flex flex-wrap items-center gap-2 md:gap-3">
          <span
            className="font-editorial italic uppercase tracking-[0.45em] text-[10px] mr-2"
            style={{ color: 'var(--color-copper)' }}
          >
            {copy.filterLabel}
          </span>
          <CategoryChip
            label={copy.filterAll}
            isActive={filter === 'ALL'}
            onClick={() => setFilter('ALL')}
          />
          {categories.map((c) => (
            <CategoryChip
              key={c}
              label={c}
              isActive={filter === c}
              onClick={() => setFilter(c)}
            />
          ))}
        </div>

        {/* Tiles */}
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
          <AnimatePresence>
            {filtered.map((v, i) => (
              <motion.li
                key={v.id}
                layout
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.45, delay: 0.03 * (i % 10) }}
              >
                <StallTile
                  kiosk={v}
                  index={i}
                  isOpen={openId === v.id}
                  onSelect={() => {
                    playLoot();
                    setOpenId(v.id);
                  }}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        <SectionBottomRail
          className="mt-14 md:mt-20"
          hint={lang === 'FR' ? 'Toucher une tuile pour ouvrir' : 'Tap a tile to open'}
          meta={filter === 'ALL'
            ? (lang === 'FR' ? 'Tous les métiers' : 'All trades')
            : filter}
        />
      </div>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <DetailModal
            kiosk={open}
            lang={lang}
            copy={copy}
            onClose={() => setOpenId(null)}
            reduce={!!reduce}
          />
        )}
      </AnimatePresence>
    </section>
  );
};

// ─── CategoryChip ────────────────────────────────────────────────────
const CategoryChip: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, isActive, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`group inline-flex items-center gap-2 px-3.5 py-2.5 sm:py-1.5 font-sans uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[10px] font-medium border transition-all ${
      isActive
        ? 'caravan-rim'
        : 'border-[var(--color-bone)]/15 hover:border-[var(--color-amber-glow)]/60'
    }`}
    style={{
      color: isActive ? 'var(--color-amber-glow)' : 'var(--color-bone)',
      background: isActive ? 'rgba(232, 177, 74, 0.10)' : 'rgba(26, 5, 11, 0.45)',
    }}
  >
    {label}
  </button>
);

// ─── StallTile ──────────────────────────────────────────────────────
const StallTile: React.FC<{
  kiosk: MarcheKiosk;
  index: number;
  isOpen: boolean;
  onSelect: () => void;
}> = ({ kiosk, index, isOpen, onSelect }) => {
  const spot = useSpotlight('rgba(232, 177, 74, 0.32)', 220);
  return (
    <HexPanel size="sm" active={isOpen} className="fmm-shimmer">
      <button
        type="button"
        onClick={onSelect}
        onMouseMove={spot.onMove}
        onMouseLeave={spot.onLeave}
        aria-expanded={isOpen}
        aria-label={`${kiosk.name} — ${kiosk.category}`}
        className="group/btn relative block w-full aspect-[4/5] overflow-hidden text-left transition-transform duration-500 hover:-translate-y-1"
        style={{
          background: 'rgba(26, 5, 11, 0.7)',
        }}
      >
        {/* Photo */}
        <img
          decoding="async" loading="lazy"
          src={kiosk.image || '/wix/marche/04065e6d.jpg'}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1100ms] ease-out group-hover/btn:scale-[1.07]"
          style={{ objectPosition: kiosk.imagePosition || 'center' }}
        />
        {/* Top tint + bottom legibility scrim */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(184,106,42,0.18) 0%, transparent 35%, rgba(10,2,7,0.92) 100%)',
          }}
        />
        {/* Mouse-tracking spotlight */}
        <motion.div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: spot.background, mixBlendMode: 'screen' }}
        />
        {/* Number plate — chevron-clipped */}
        <span
          className="absolute top-3 left-3 z-10 inline-block px-2.5 py-1 font-sans text-[9px] tracking-[0.5em] chev-cta"
          style={{
            color: 'var(--color-amber-glow)',
            background: 'rgba(10, 2, 7, 0.85)',
            boxShadow: 'inset 0 0 0 1px rgba(232, 177, 74, 0.5)',
          }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        {/* Bottom caption */}
        <div className="absolute inset-x-0 bottom-0 p-4 md:p-5 z-10">
          <p
            className="font-editorial italic uppercase tracking-[0.35em] text-[9px] md:text-[10px] mb-1.5 inline-flex items-center gap-1.5"
            style={{ color: 'var(--color-amber-glow)', opacity: 0.85 }}
          >
            <HexMark className="opacity-80" style={{ width: 8, height: 8 } as React.CSSProperties} />
            {kiosk.category}
          </p>
          <h3
            className="font-display leading-tight tracking-[-0.005em] text-base md:text-lg line-clamp-2"
            style={{ color: 'var(--color-bone)', fontWeight: 400, textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}
          >
            {kiosk.name}
          </h3>
        </div>
      </button>
    </HexPanel>
  );
};

// ─── DetailModal ────────────────────────────────────────────────────
const DetailModal: React.FC<{
  kiosk: MarcheKiosk;
  lang: 'FR' | 'EN';
  copy: MarketCopy;
  onClose: () => void;
  reduce: boolean;
}> = ({ kiosk, lang, copy, onClose, reduce }) => {
  const bio = lang === 'FR' ? kiosk.bioFR : kiosk.bioEN;
  const tag = lang === 'FR' ? kiosk.tagFR : kiosk.tagEN;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center px-3 sm:px-4 md:px-8 py-4 md:py-8 overflow-y-auto"
      style={{ background: 'rgba(10, 2, 7, 0.88)', backdropFilter: 'blur(14px)' }}
    >
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl"
      >
        <HexPanel size="lg" active className="fmm-shimmer">
          <div className="caravan-glass relative overflow-hidden">
            <button
              type="button"
              onClick={onClose}
              aria-label={copy.closeLbl}
              className="absolute top-4 right-4 z-30 w-10 h-10 flex items-center justify-center caravan-glass hover:bg-[rgba(232,177,74,0.15)] transition"
              style={{ color: 'var(--color-amber-glow)' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1 1 L13 13 M13 1 L1 13" />
              </svg>
            </button>

            <div className="grid md:grid-cols-12">
              <div className="relative md:col-span-6 min-h-[34vh] md:min-h-[60vh] overflow-hidden fmm-beam">
                <img
                  src={kiosk.image || '/wix/marche/04065e6d.jpg'}
                  alt={kiosk.name}
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover fmm-kenburns"
                  style={{ objectPosition: kiosk.imagePosition || 'center' }}
                />
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent 50%, rgba(26,5,11,0.85) 100%),' +
                      'linear-gradient(180deg, rgba(184,106,42,0.18) 0%, transparent 40%, rgba(10,2,7,0.5) 100%)',
                  }}
                />
              </div>
              <div className="md:col-span-6 p-5 sm:p-7 md:p-10 lg:p-14 flex flex-col justify-center">
                <p
                  className="font-editorial italic uppercase tracking-[0.4em] text-[10px] md:text-[11px] mb-4 inline-flex items-center gap-2"
                  style={{ color: 'var(--color-amber-glow)' }}
                >
                  <HexMark /> {kiosk.category}
                </p>
                <h3
                  className="font-display leading-[1.0] tracking-[-0.005em] text-2xl sm:text-3xl md:text-5xl mb-5"
                  style={{ color: 'var(--color-bone)', fontWeight: 400, textShadow: '0 0 32px rgba(232,177,74,0.18)' }}
                >
                  {kiosk.name}
                </h3>
                <p
                  className="font-editorial italic text-lg md:text-xl leading-snug mb-6"
                  style={{ color: 'var(--color-amber-glow)' }}
                >
                  « {tag} »
                </p>
                {bio && (
                  <p
                    className="font-editorial text-[15px] md:text-base leading-[1.7] mb-8"
                    style={{ color: 'var(--color-bone)', opacity: 0.8 }}
                  >
                    {bio}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-4">
                  {kiosk.href ? (
                    <a
                      href={kiosk.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-3 px-5 py-2.5 font-sans uppercase tracking-[0.3em] text-[11px] hover:scale-[1.02] transition chev-cta"
                      style={{
                        color: 'var(--color-amber-glow)',
                        boxShadow: 'inset 0 0 0 1px rgba(232,177,74,0.5)',
                        background: 'rgba(232,177,74,0.08)',
                      }}
                    >
                      {copy.visit}
                      <span aria-hidden className="inline-block w-5 h-px bg-[var(--color-amber-glow)] transition-all group-hover:w-10" />
                    </a>
                  ) : (
                    <span
                      className="font-editorial italic uppercase tracking-[0.4em] text-[10px]"
                      style={{ color: 'var(--color-amber-glow)' }}
                    >
                      {copy.onsite}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </HexPanel>
      </motion.div>
    </motion.div>
  );
};

export default MarketSquare;
