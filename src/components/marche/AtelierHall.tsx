import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { MarcheKiosk } from '../../content/marche';
import { Eyebrow, DisplayTitle, EnergyPulse, HexPanel, ChevronButton, HexMark, SectionFog, SectionTopRail, SectionBottomRail } from './atmospherics';
import { BubbleCanvas, Motes, useSpotlight, useTilt, useSfx } from './effects';

interface Props {
  lang: 'FR' | 'EN';
  vendors: MarcheKiosk[];
  copy: AtelierCopy;
}

export interface AtelierCopy {
  eyebrow:    string;
  title:      string;
  lead:       string;
  defaultCta: string;
  plateLabel: string;
  picker:     string;   // "Choose your artisan"
  locked:     string;   // "Locked in"
}

// ─── AtelierHall — Champion-select pavilion ──────────────────────────
// LoL-style champion-select layout for the four flagship artisans:
//   Left  → focused artisan card (large photo, name, lore, CTA)
//   Right → vertical list of all four artisans (clickable rows)
//   On lock: particle burst + brass rim flares, others dim.
// Caravan palette throughout: velvet stage, copper edges, amber lock-in.
const AtelierHall: React.FC<Props> = ({ lang, vendors, copy }) => {
  const [idx, setIdx] = useState(0);
  const reduce = useReducedMotion();
  const playLoot = useSfx('/orb/sfx/loot.mp3', 0.45);
  const active = vendors[idx];
  if (!active) return null;

  const select = (i: number) => {
    if (i === idx) return;
    setIdx(i);
    playLoot();
  };

  return (
    <section className="relative caravan-stage bleed-edges fmm-perf-section text-[var(--color-bone)] overflow-hidden">
      <SectionFog />
      <BubbleCanvas className="opacity-25" count={10} />

      <div className="relative max-w-screen-2xl mx-auto px-5 md:px-10 lg:px-14 pt-24 md:pt-32 pb-12">
        <SectionTopRail
          index="01"
          name={copy.eyebrow}
          meta={copy.picker}
          metaValue={`${vendors.length} / ${vendors.length}`}
          className="mb-10 md:mb-14"
        />
        <header className="max-w-3xl mb-12 md:mb-16">
          <Eyebrow className="mb-5 inline-flex items-center gap-3">
            <span aria-hidden className="h-px w-8" style={{ background: 'var(--color-copper)' }} />
            {copy.eyebrow}
          </Eyebrow>
          <DisplayTitle size="xl" glow className="mb-6">{copy.title}</DisplayTitle>
          <p className="font-editorial text-base md:text-lg text-[var(--color-bone)]/80 leading-relaxed max-w-2xl">
            {copy.lead}
          </p>
        </header>

        <div className="grid lg:grid-cols-12 gap-6 lg:gap-10">
          {/* ── FOCUSED CARD ─────────────────────────────────── */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -16, scale: 1.02 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
              >
                <FocusCard kiosk={active} lang={lang} copy={copy} index={idx} total={vendors.length} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── PICKER LIST ──────────────────────────────────── */}
          <div className="lg:col-span-4">
            <p
              className="font-editorial italic uppercase tracking-[0.45em] text-[10px] mb-4"
              style={{ color: 'var(--color-amber-glow)' }}
            >
              {copy.picker}
            </p>
            <ul className="space-y-2.5">
              {vendors.map((v, i) => (
                <li key={v.id}>
                  <PickerRow
                    kiosk={v}
                    index={i}
                    isActive={i === idx}
                    onSelect={() => select(i)}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="relative max-w-screen-2xl mx-auto px-5 md:px-10 lg:px-14 pt-8 pb-24 md:pb-32">
        <SectionBottomRail
          hint={lang === 'FR' ? 'Toucher un nom pour ouvrir l’atelier' : 'Tap a name to open the atelier'}
          meta={`${vendors.length} ${lang === 'FR' ? 'fanions' : 'flagships'}`}
        />
      </div>
    </section>
  );
};

// ─── FocusCard ──────────────────────────────────────────────────────
// The large card on the left. 3D tilt on mouse-move, mouse-tracking
// copper spotlight inside, gilded frame, energy pulse rim. Photo on
// top half, editorial copy bottom half (or split layout on desktop).
const FocusCard: React.FC<{
  kiosk: MarcheKiosk;
  lang: 'FR' | 'EN';
  copy: AtelierCopy;
  index: number;
  total: number;
}> = ({ kiosk, lang, copy, index, total }) => {
  const tilt = useTilt(5);
  const spot = useSpotlight('rgba(232, 177, 74, 0.22)', 360);
  const bio = lang === 'FR' ? kiosk.bioFR : kiosk.bioEN;
  const tag = lang === 'FR' ? kiosk.tagFR : kiosk.tagEN;
  const cta = lang === 'FR' ? (kiosk.cta?.FR ?? copy.defaultCta) : (kiosk.cta?.EN ?? copy.defaultCta);

  return (
    <div
      ref={tilt.ref}
      onMouseMove={(e) => {
        tilt.onMove(e);
        spot.onMove(e);
      }}
      onMouseLeave={() => {
        tilt.onLeave();
        spot.onLeave();
      }}
      style={{ perspective: 1600 }}
    >
      <motion.div
        style={{
          rotateX: tilt.rx,
          rotateY: tilt.ry,
          transformStyle: 'preserve-3d',
        }}
      >
        <HexPanel size="lg" active className="fmm-shimmer">
          <div className="caravan-glass relative overflow-hidden">
            <EnergyPulse tone="copper" />

            <div className="grid md:grid-cols-12">
              {/* PHOTO column — splash-art treatment */}
              <div className="relative md:col-span-6 min-h-[46vh] md:min-h-[62vh] overflow-hidden fmm-beam">
                <img
                  src={kiosk.image || '/wix/marche/04065e6d.jpg'}
                  alt={kiosk.name}
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover fmm-kenburns"
                  style={{ objectPosition: kiosk.imagePosition || 'center' }}
                />
                {/* Tinted scrim — copper top, velvet bottom + right blend */}
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(184,106,42,0.18) 0%, transparent 40%, rgba(26,5,11,0.85) 100%),' +
                      'linear-gradient(90deg, transparent 55%, rgba(26,5,11,0.7) 100%)',
                  }}
                />
                {/* Mouse-tracking spotlight */}
                <motion.div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: spot.background, mixBlendMode: 'screen' }}
                />
                {/* Drifting motes around splash art */}
                <Motes count={24} />
                {/* Champion plate — top-left */}
                <div className="absolute top-5 left-5 z-10 flex items-center gap-3">
                  <span
                    className="font-sans text-[10px] tracking-[0.5em] px-3 py-1 caravan-glass"
                    style={{ color: 'var(--color-amber-glow)', clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)' }}
                  >
                    {String(index + 1).padStart(2, '0')} <span className="opacity-50">·</span> {String(total).padStart(2, '0')}
                  </span>
                  <span
                    className="font-editorial italic uppercase tracking-[0.4em] text-[10px] inline-flex items-center gap-2"
                    style={{ color: 'var(--color-amber-glow)' }}
                  >
                    <HexMark className="opacity-80" />
                    {copy.plateLabel}
                  </span>
                </div>
                {/* Bottom-edge nameplate — splash-art signature */}
                <div className="absolute inset-x-0 bottom-0 p-6 md:p-8 z-10">
                  <p
                    className="font-editorial italic uppercase tracking-[0.4em] text-[10px] md:text-[11px] mb-2"
                    style={{ color: 'var(--color-amber-glow)' }}
                  >
                    {kiosk.category}
                  </p>
                  <h3
                    className="font-display leading-[1.0] tracking-[-0.01em] text-2xl sm:text-3xl md:text-4xl lg:text-[2.8rem]"
                    style={{
                      color: 'var(--color-bone)',
                      fontWeight: 400,
                      textShadow: '0 4px 24px rgba(0,0,0,0.85), 0 0 32px rgba(232,177,74,0.25)',
                    }}
                  >
                    {kiosk.name}
                  </h3>
                </div>
              </div>

              {/* COPY column */}
              <div className="relative md:col-span-6 p-7 md:p-10 lg:p-14 flex flex-col justify-center">
                <p
                  className="font-editorial italic uppercase tracking-[0.4em] text-[10px] md:text-[11px] mb-5 inline-flex items-center gap-2"
                  style={{ color: 'var(--color-bone)', opacity: 0.65 }}
                >
                  <HexMark className="opacity-70" /> {kiosk.category}
                </p>
                <p
                  className="font-editorial italic text-lg md:text-2xl leading-snug mb-6 max-w-md"
                  style={{ color: 'var(--color-amber-glow)' }}
                >
                  « {tag} »
                </p>
                {bio && (
                  <p
                    className="font-editorial text-[15px] md:text-base leading-[1.7] mb-10 max-w-xl"
                    style={{ color: 'var(--color-bone)', opacity: 0.8 }}
                  >
                    {bio}
                  </p>
                )}
                {kiosk.href && (
                  <ChevronButton
                    href={kiosk.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="ghost"
                  >
                    {cta}
                  </ChevronButton>
                )}
              </div>
            </div>
          </div>
        </HexPanel>
      </motion.div>
    </div>
  );
};

// ─── PickerRow ──────────────────────────────────────────────────────
// Champion-select list row. Tiny thumbnail + name + category. Active
// row glows amber with a leading copper marker.
const PickerRow: React.FC<{
  kiosk: MarcheKiosk;
  index: number;
  isActive: boolean;
  onSelect: () => void;
}> = ({ kiosk, index, isActive, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    aria-pressed={isActive}
    className={`group relative w-full flex items-center gap-4 p-3 transition-all border ${
      isActive
        ? 'caravan-rim'
        : 'border-[var(--color-bone)]/12 hover:border-[var(--color-amber-glow)]/60'
    }`}
    style={{
      background: isActive
        ? 'rgba(232, 177, 74, 0.10)'
        : 'rgba(26, 5, 11, 0.55)',
    }}
  >
    {/* Leading marker */}
    <span
      aria-hidden
      className={`absolute left-0 top-0 bottom-0 w-[3px] transition-opacity duration-500 ${
        isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
      }`}
      style={{ background: 'linear-gradient(180deg, transparent, var(--color-amber-glow), transparent)' }}
    />

    {/* Thumb */}
    <span className="relative w-14 h-14 shrink-0 overflow-hidden">
      <img
        src={kiosk.image || '/wix/marche/04065e6d.jpg'}
        alt=""
        aria-hidden
        decoding="async"
        loading="lazy"
        className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ${
          isActive ? 'scale-[1.08]' : 'scale-100 group-hover:scale-[1.06]'
        }`}
      />
      <span
        aria-hidden
        className={`absolute inset-0 pointer-events-none transition-opacity ${
          isActive ? 'opacity-100' : 'opacity-50 group-hover:opacity-80'
        }`}
        style={{
          boxShadow:
            'inset 0 0 0 1px rgba(232, 177, 74, 0.55), inset 0 0 20px -4px rgba(232, 177, 74, 0.45)',
        }}
      />
    </span>

    <span className="flex-1 min-w-0 text-left">
      <span
        className="font-sans text-[9px] tracking-[0.5em] block mb-0.5"
        style={{ color: isActive ? 'var(--color-amber-glow)' : 'var(--color-copper)', opacity: 0.7 }}
      >
        {String(index + 1).padStart(2, '0')}
      </span>
      <span
        className="font-display text-sm md:text-base block leading-tight truncate"
        style={{
          color: isActive ? 'var(--color-bone)' : 'var(--color-bone)',
          opacity: isActive ? 1 : 0.85,
          fontWeight: 400,
        }}
      >
        {kiosk.name}
      </span>
      <span
        className="font-editorial italic text-[11px] block truncate"
        style={{ color: 'var(--color-bone)', opacity: 0.55 }}
      >
        {kiosk.category}
      </span>
    </span>

    <span
      aria-hidden
      className={`text-[10px] tracking-[0.4em] uppercase shrink-0 transition-all ${
        isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
      }`}
      style={{ color: 'var(--color-amber-glow)' }}
    >
      ◆
    </span>
  </button>
);

export default AtelierHall;
