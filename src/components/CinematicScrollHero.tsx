import React, { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import TarotCard, { type TarotGlyph } from './TarotCard';

// ─── CinematicScrollHero ────────────────────────────────────────────
// Three-act scroll-pinned welcome hero for the FMM 2026 home page.
// Outer container = 320vh tall; inner sticky stays viewport-pinned at
// top while scrollY 0→1 drives every transform.
//
// ACT 1 (progress 0.00 – 0.33) — viking helmet center stage, title fades in
// ACT 2 (progress 0.33 – 0.66) — helmet drifts left + shrinks; tarot fan
//                                materialises from the right; fire ignites
// ACT 3 (progress 0.66 – 1.00) — full mystical scene; CTA + countdown
//                                overlay sticks; scroll-down hint fades

interface Cta { label: string; href: string }
interface Countdown { days: number; hours: number; minutes: number; seconds: number; isPast: boolean }

interface Props {
  helmetImageUrl: string;            // /wix/home/viking-helmet.jpg
  backgroundImageUrl?: string;       // optional secondary bg layer
  eyebrow: string;                   // "Édition 2026 · Caravanes & Saltimbanques"
  title: string;                     // "FMM 2026"
  subtitle: string;                  // tagline
  dates: string;                     // "25 — 26 — 27 septembre 2026"
  primaryCta: Cta;                   // tickets
  secondaryCta?: Cta;                // optional discover link
  countdown: Countdown;
  countdownLabels: { days: string; hours: string; minutes: string; seconds: string };
  scrollHint: string;                // "Scroll" / "Faites défiler"
  cardsLabel?: string;               // tiny eyebrow above the tarot fan
}

const TAROT: TarotGlyph[] = ['wanderer', 'flame', 'wheel', 'mask', 'helm'];

const CinematicScrollHero: React.FC<Props> = ({
  helmetImageUrl, backgroundImageUrl,
  eyebrow, title, subtitle, dates,
  primaryCta, secondaryCta,
  countdown, countdownLabels,
  scrollHint, cardsLabel = 'Tirage du festival',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // ── Master progress curves ──
  // Act 1 visibility (1 → 0)
  const act1Visibility = useTransform(scrollYProgress, [0, 0.18, 0.32], [1, 1, 0]);
  // Act 2 ignition (0 → 1) — tarot + fire reveal
  const act2Visibility = useTransform(scrollYProgress, [0.20, 0.45, 1], [0, 1, 1]);
  // Act 3 finale (0 → 1) — CTA + countdown anchor
  const act3Visibility = useTransform(scrollYProgress, [0.55, 0.75], [0, 1]);

  // Helmet motion: starts dead center, drifts left + shrinks across 0.30→0.85
  const helmetX     = useTransform(scrollYProgress, [0, 0.30, 0.85], [0, 0, -260]);
  const helmetScale = useTransform(scrollYProgress, [0, 0.30, 0.85], [1.05, 1.05, 0.55]);
  const helmetY     = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const helmetOpacity = useTransform(scrollYProgress, [0, 0.30, 0.85, 1], [0.85, 0.95, 0.4, 0.35]);

  // Bg image (if any) parallax
  const bgY     = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.18]);

  // Title (act 1) entrance + exit
  const titleY        = useTransform(scrollYProgress, [0, 0.10, 0.28, 0.38], [40, 0, 0, -40]);
  const titleOpacity  = useTransform(scrollYProgress, [0, 0.10, 0.28, 0.38], [0, 1, 1, 0]);

  // Vignette darkens slightly through acts to focus the eye
  const vignetteOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.35, 0.55, 0.7]);

  return (
    <section ref={containerRef} className="relative bg-midnight-deep" style={{ height: '320vh' }}>
      {/* Sticky cinematic pane */}
      <div className="sticky top-0 h-screen w-full overflow-hidden text-ivory">

        {/* ── Layer 0 — optional bg image with deep parallax ── */}
        {backgroundImageUrl && (
          <motion.img
            src={backgroundImageUrl} alt="" aria-hidden
            style={{ y: bgY, scale: bgScale }}
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        )}

        {/* ── Layer 1 — base atmosphere ── */}
        <div className="absolute inset-0 bg-gradient-to-b from-midnight-deep via-midnight to-midnight-deep" />
        <motion.div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_60%_at_50%_0%,rgba(176,141,58,0.10),transparent_70%)]" />

        {/* ── Layer 2 — fire bed (act 2 onward) ── */}
        <motion.div
          style={{ opacity: act2Visibility }}
          className="absolute inset-x-0 bottom-0 h-[70%] pointer-events-none"
        >
          <div className="fire-bed" />
          <div className="embers" />
        </motion.div>

        {/* ── Layer 3 — viking helmet, the protagonist ── */}
        <motion.div
          style={{ x: helmetX, y: helmetY, scale: helmetScale, opacity: helmetOpacity }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="relative w-[78vmin] h-[78vmin] max-w-[680px] max-h-[680px]">
            {/* Brass aura behind the helmet */}
            <div className="absolute inset-[-15%] rounded-full bg-[radial-gradient(circle,rgba(176,141,58,0.18),transparent_60%)] blur-2xl" />
            <img
              src={helmetImageUrl} alt="" aria-hidden
              className="absolute inset-0 w-full h-full object-cover rounded-full opacity-95"
              style={{ maskImage: 'radial-gradient(circle, black 55%, transparent 78%)', WebkitMaskImage: 'radial-gradient(circle, black 55%, transparent 78%)' }}
            />
          </div>
        </motion.div>

        {/* ── Layer 4 — tarot fan (act 2 onward) ── */}
        <TarotFan progress={scrollYProgress} act2Visibility={act2Visibility} cardsLabel={cardsLabel} />

        {/* ── Layer 5 — vignette + grain ── */}
        <motion.div style={{ opacity: vignetteOpacity }} className="vignette-radial" />
        <div className="grain absolute inset-0 opacity-25" aria-hidden />

        {/* ── Layer 6 — Act 1 title block ── */}
        <motion.div
          style={{ y: titleY, opacity: titleOpacity }}
          className="absolute inset-x-0 bottom-[12vh] md:bottom-[18vh] text-center px-4 md:px-8 pointer-events-none"
        >
          <p className="font-editorial italic text-brass uppercase tracking-[0.4em] text-xs md:text-sm mb-4">
            {eyebrow}
          </p>
          <h1 className="font-display title-medieval text-6xl md:text-8xl lg:text-[8.5rem] text-ivory leading-[0.9] drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)]">
            {title}
          </h1>
          <p className="font-display title-medieval text-base md:text-xl text-brass mt-3 tracking-widest">
            {dates}
          </p>
          <p className="font-editorial italic text-base md:text-lg text-ivory-soft mt-5 max-w-xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        </motion.div>

        {/* ── Layer 7 — Act 1 scroll hint ── */}
        <motion.div
          style={{ opacity: act1Visibility }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-ivory-soft pointer-events-none"
        >
          <span className="font-editorial italic text-[10px] uppercase tracking-[0.3em] text-brass">{scrollHint}</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
            <ChevronDown size={18} className="text-brass" />
          </motion.div>
        </motion.div>

        {/* ── Layer 8 — Act 3 floating CTA + countdown ── */}
        <motion.aside
          style={{ opacity: act3Visibility }}
          className="absolute bottom-6 right-4 md:bottom-10 md:right-10 max-w-sm w-[calc(100%-2rem)] md:w-[380px]"
        >
          <div className="glass-on-photo rounded-lg-card p-5 md:p-6">
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px] mb-3">{eyebrow}</p>
            <h2 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-1 leading-tight">
              {title}
            </h2>
            <p className="font-display title-medieval text-xs md:text-sm text-brass mb-4 tracking-widest">
              {dates}
            </p>
            <a href={primaryCta.href} target="_blank" rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card mb-3 shadow-[0_8px_32px_-8px_rgba(176,141,58,0.6)]">
              {primaryCta.label} <ArrowUpRight size={14} />
            </a>
            {secondaryCta && (
              <a href={secondaryCta.href}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 glass-frost text-ivory hover:border-brass hover:text-brass font-sans uppercase tracking-wider text-[11px] transition rounded-card mb-4">
                {secondaryCta.label}
              </a>
            )}
            {!countdown.isPast && (
              <div className="grid grid-cols-4 gap-1.5 md:gap-2 pt-3 border-t border-ivory-soft/15">
                {[
                  { label: countdownLabels.days,    value: countdown.days },
                  { label: countdownLabels.hours,   value: countdown.hours },
                  { label: countdownLabels.minutes, value: countdown.minutes },
                  { label: countdownLabels.seconds, value: countdown.seconds },
                ].map((b) => (
                  <div key={b.label} className="text-center glass-frost rounded-card py-1.5 md:py-2">
                    <div className="font-display title-medieval text-base md:text-lg text-brass tabular-nums leading-none">
                      {String(b.value).padStart(2, '0')}
                    </div>
                    <div className="font-sans text-[8px] md:text-[9px] uppercase tracking-widest text-ivory-soft mt-1">
                      {b.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.aside>
      </div>
    </section>
  );
};

// ─── Tarot fan — 5 cards arc out from the right side ──────────────
// Each card has a base angle in the fan; scroll progress drives a
// shared opacity + a per-card stagger of x/rotate.
interface FanProps { progress: MotionValue<number>; act2Visibility: MotionValue<number>; cardsLabel: string }

const TarotFan: React.FC<FanProps> = ({ progress, act2Visibility, cardsLabel }) => {
  return (
    <motion.div
      style={{ opacity: act2Visibility }}
      className="absolute inset-y-0 right-0 flex items-center pointer-events-none w-full md:w-[60%]"
    >
      <div className="relative w-full h-full">
        {/* Tiny header above the fan */}
        <motion.div
          style={{ opacity: useTransform(progress, [0.4, 0.6], [0, 1]) }}
          className="absolute top-[20%] right-6 md:right-12 text-right hidden md:block"
        >
          <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px]">{cardsLabel}</p>
          <div className="divider-brass w-12 ml-auto mt-2" />
        </motion.div>

        {TAROT.map((g, i) => (
          <FanCard key={g} index={i} total={TAROT.length} glyph={g} progress={progress} />
        ))}
      </div>
    </motion.div>
  );
};

interface CardProps { index: number; total: number; glyph: TarotGlyph; progress: MotionValue<number> }

const FanCard: React.FC<CardProps> = ({ index, total, glyph, progress }) => {
  // Spread the cards across an arc; 0 = leftmost (rotated -25°), end = rightmost (+25°)
  const t        = total === 1 ? 0.5 : index / (total - 1);
  const baseRot  = -25 + t * 50;        // -25° ... +25°
  const baseX    = -120 + t * 240;      // -120 ... +120 px from anchor
  const baseY    = Math.abs(t - 0.5) * 60;  // arc curve — center up, edges down
  const enter    = 0.30 + index * 0.05;     // staggered entrance
  const settle   = enter + 0.18;

  const opacity  = useTransform(progress, [enter - 0.05, enter, settle, 1], [0, 0.4, 1, 1]);
  const rot      = useTransform(progress, [enter, settle], [baseRot - 25, baseRot]);
  const x        = useTransform(progress, [enter, settle], [baseX + 80, baseX]);
  const y        = useTransform(progress, [enter, settle], [baseY + 30, baseY]);
  // Subtle hover-up in act 3
  const yFinish  = useTransform(progress, [0.78, 1], [0, -8]);

  return (
    <motion.div
      style={{
        opacity, rotate: rot, x, y,
        transformOrigin: 'bottom center',
      }}
      className="absolute right-[15%] md:right-[18%] lg:right-[20%] top-1/2 -translate-y-1/2"
    >
      <motion.div style={{ y: yFinish }}>
        <TarotCard glyph={glyph} className="w-[28vmin] max-w-[180px]" />
      </motion.div>
    </motion.div>
  );
};

export default CinematicScrollHero;
