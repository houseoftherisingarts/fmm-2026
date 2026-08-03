import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { MarcheKiosk } from '../../content/marche';
import { Eyebrow, DisplayTitle, HexPanel, ChevronButton, HexMark, SectionFog, SectionTopRail, SectionBottomRail } from './atmospherics';
import { useSpotlight, useTilt, useSfx } from './effects';
import EmberCanvas from '../vendor/EmberCanvas';

interface Props {
  lang: 'FR' | 'EN';
  vendors: MarcheKiosk[];
  copy: SealedCopy;
}

export interface SealedCopy {
  eyebrow:    string;
  title:      string;
  lead:       string;
  visit:      string;
  promoLabel: string;
  copyAction: string;
  copied:     string;
  flipCta:    string;
  flipBack:   string;
  emptyState: string;
}

// ─── SealedScroll — Tilted loot cards ────────────────────────────────
// Digital boutique tier as 3D-tilt cards. Front face: full-bleed
// partner photo with a copper rarity frame. Click "Reveal" → card
// flips on Y to show the promo code on the velvet back. Tilt follows
// mouse on the front face only.
const SealedScroll: React.FC<Props> = ({ lang, vendors, copy }) => (
  <section className="relative caravan-stage bleed-edges fmm-perf-section text-[var(--color-bone)] overflow-hidden">
    <SectionFog />
    <EmberCanvas className="opacity-80" count={30} />

    <div className="relative max-w-screen-2xl mx-auto px-5 md:px-10 lg:px-14 pt-24 md:pt-32 pb-24 md:pb-32">
      <SectionTopRail
        index="04"
        name={copy.eyebrow}
        meta={lang === 'FR' ? 'Partenaires' : 'Partners'}
        metaValue={String(vendors.length)}
        className="mb-10 md:mb-14"
      />

      {/* Une seule carte : le titre reste à gauche et la carte prend la
          colonne de droite, grande, au lieu de flotter en petit carré
          centré sous le titre. Plusieurs cartes : grille pleine largeur
          sous l'en-tête, comme avant. */}
      {vendors.length === 1 ? (
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <header className="lg:col-span-5 min-w-0">
            <Eyebrow className="mb-5 inline-flex items-center gap-3">
              <span aria-hidden className="h-px w-8" style={{ background: 'var(--color-copper)' }} />
              {copy.eyebrow}
            </Eyebrow>
            {/* size lg : en colonne étroite, xl poussait le titre sur
                trois lignes (règle : jamais plus de deux). */}
            <DisplayTitle size="lg" glow className="mb-6">{copy.title}</DisplayTitle>
            <p className="font-editorial text-base md:text-lg text-[var(--color-bone)]/80 leading-relaxed max-w-2xl">
              {copy.lead}
            </p>
          </header>
          <div className="lg:col-span-7 min-w-0">
            <FlipCard kiosk={vendors[0]} index={0} lang={lang} copy={copy} large />
          </div>
        </div>
      ) : (
        <>
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

          {vendors.length === 0 ? (
            <p className="font-editorial italic text-[var(--color-bone)]/70 text-base max-w-xl">
              {copy.emptyState}
            </p>
          ) : (
            <ul className="grid gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-3">
              {vendors.map((v, i) => (
                <li key={v.id}>
                  <FlipCard kiosk={v} index={i} lang={lang} copy={copy} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <SectionBottomRail
        className="mt-14 md:mt-20"
        hint={lang === 'FR' ? 'Retourner la carte pour révéler le code' : 'Flip the card to reveal the code'}
        meta={lang === 'FR' ? 'En ligne uniquement' : 'Online only'}
      />
    </div>
  </section>
);

// ─── FlipCard ───────────────────────────────────────────────────────
const FlipCard: React.FC<{
  kiosk: MarcheKiosk;
  index: number;
  lang: 'FR' | 'EN';
  copy: SealedCopy;
  large?: boolean;
}> = ({ kiosk, index, lang, copy, large = false }) => {
  const reduce = useReducedMotion();
  const [flipped, setFlipped] = useState(false);
  const [copied, setCopied] = useState(false);
  const tilt = useTilt(8);
  const spot = useSpotlight('rgba(232, 177, 74, 0.28)', 260);
  const playSfx = useSfx('/orb/sfx/loot.mp3', 0.4);

  const cta = lang === 'FR' ? (kiosk.cta?.FR ?? copy.visit) : (kiosk.cta?.EN ?? copy.visit);
  const tag = lang === 'FR' ? kiosk.tagFR : kiosk.tagEN;

  const onFlip = () => {
    playSfx();
    setFlipped((v) => !v);
  };

  const onCopy = async () => {
    if (!kiosk.promo) return;
    try {
      await navigator.clipboard.writeText(kiosk.promo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { /* no-op */ }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: 0.08 * index }}
      style={{ perspective: 1400 }}
      className="h-full"
    >
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
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={reduce ? { duration: 0.15 } : { duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{
            rotateX: tilt.rx,
            rotateY: flipped ? 180 : tilt.ry,
            transformStyle: 'preserve-3d',
            position: 'relative',
            // Was a fixed 460 — at 320px portrait the card filled most
            // of the viewport with empty padding. Tighter on mobile,
            // restore full height on sm+ where there's room.
            minHeight: large ? 'clamp(380px, 42vw, 560px)' : 'clamp(320px, 70vw, 460px)',
          }}
        >
          {/* FRONT */}
          <div
            className="absolute inset-0"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            <HexPanel size="md" className="fmm-shimmer h-full">
              <div className={`relative overflow-hidden ${large ? "h-[clamp(380px,42vw,560px)]" : "h-[460px]"}`}>
                <img
                  src={kiosk.image || '/wix/marche/04065e6d.jpg'}
                  alt={kiosk.name}
                  decoding="async"
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover fmm-kenburns"
                  style={{ objectPosition: kiosk.imagePosition || 'center' }}
                />
                {/* Scrim renforcé : le texte doit rester lisible même sur
                    une photo chargée (leçon Julie-Chantal). */}
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(184,106,42,0.15) 0%, transparent 30%, rgba(10,2,7,0.55) 62%, rgba(10,2,7,0.97) 100%)',
                  }}
                />
                <motion.div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: spot.background, mixBlendMode: 'screen' }}
                />
                <div className="relative h-full flex flex-col justify-between p-6 md:p-7">
                  <span
                    className="inline-block self-start px-2.5 py-1 font-sans text-[9px] tracking-[0.5em] caravan-glass"
                    style={{ color: 'var(--color-amber-glow)' }}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p
                      className="font-editorial italic uppercase tracking-[0.4em] text-[10px] mb-2"
                      style={{ color: 'var(--color-amber-glow)' }}
                    >
                      {kiosk.category}
                    </p>
                    <h3
                      className={`font-display leading-[1.05] tracking-[-0.005em] mb-3 line-clamp-2 ${large ? 'text-3xl md:text-4xl lg:text-5xl max-w-xl' : 'text-2xl md:text-3xl'}`}
                      style={{ color: 'var(--color-bone)', fontWeight: 400, textShadow: '0 4px 24px rgba(0,0,0,0.9), 0 1px 6px rgba(0,0,0,0.9)' }}
                    >
                      {kiosk.name}
                    </h3>
                    <p
                      className="font-editorial italic text-[15px] leading-snug mb-6"
                      style={{ color: 'var(--color-bone)', opacity: 0.85 }}
                    >
                      « {tag} »
                    </p>
                    <ChevronButton onClick={onFlip} variant="ghost">
                      {copy.flipCta}
                    </ChevronButton>
                  </div>
                </div>
              </div>
            </HexPanel>
          </div>

          {/* BACK */}
          <div
            className="absolute inset-0"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <HexPanel size="md" active className="h-full">
              <div
                className={`relative overflow-hidden caravan-glass fmm-beam p-6 md:p-7 flex flex-col justify-between ${large ? "h-[clamp(380px,42vw,560px)]" : "h-[460px]"}`}
              >
                <span
                  className="inline-flex items-center gap-2 self-start font-editorial italic uppercase tracking-[0.4em] text-[10px]"
                  style={{ color: 'var(--color-amber-glow)' }}
                >
                  <HexMark className="opacity-80" /> {copy.promoLabel}
                </span>

                <div className="text-center my-6">
                  <code
                    className="font-display text-2xl sm:text-3xl md:text-4xl tracking-[0.12em] sm:tracking-[0.18em] block mb-4 break-all"
                    style={{
                      color: 'var(--color-amber-glow)',
                      fontWeight: 400,
                      textShadow: '0 0 28px rgba(232, 177, 74, 0.45)',
                    }}
                  >
                    {kiosk.promo}
                  </code>
                  <button
                    type="button"
                    onClick={onCopy}
                    className="inline-flex items-center gap-2 px-4 py-2 font-sans uppercase tracking-[0.3em] text-[10px] hover:scale-[1.02] transition"
                    style={{
                      color: copied ? 'var(--color-bone)' : 'var(--color-amber-glow)',
                      border: '1px solid rgba(232,177,74,0.5)',
                      background: copied ? 'rgba(232,177,74,0.18)' : 'rgba(232,177,74,0.06)',
                    }}
                  >
                    {copied ? copy.copied : copy.copyAction}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={onFlip}
                    className="group inline-flex items-center gap-2 font-sans uppercase tracking-[0.3em] text-[10px]"
                    style={{ color: 'var(--color-bone)', opacity: 0.7 }}
                  >
                    <span aria-hidden className="inline-block w-4 h-px bg-[var(--color-bone)]/40 group-hover:bg-[var(--color-amber-glow)] group-hover:w-8 transition-all" />
                    {copy.flipBack}
                  </button>
                  {kiosk.href && (
                    <a
                      href={kiosk.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-2 font-sans uppercase tracking-[0.3em] text-[11px] hover:text-[var(--color-amber-glow)] transition"
                      style={{ color: 'var(--color-amber-glow)' }}
                    >
                      {cta}
                      <span aria-hidden className="inline-block w-4 h-px bg-[var(--color-amber-glow)] transition-all group-hover:w-10" />
                    </a>
                  )}
                </div>
              </div>
            </HexPanel>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SealedScroll;
