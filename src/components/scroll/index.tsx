import React, { useRef } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type Variants,
} from 'framer-motion';

// ─── Scrollytelling kit ──────────────────────────────────────────────
// Shared cinematic scroll primitives for FMM pillar pages. Built on the
// same art direction as OrbHomePage / ActivitesPage / AccueilPage:
//   · amber-glow + brass eyebrows, Cinzel/Cormorant display type
//   · fade-and-rise entrances on the smooth easing [0.16, 1, 0.3, 1]
//   · clip-path image reveals with a slow inner Ken-Burns push
//   · scroll-linked parallax depth (Draftly-style, never scroll-jacked)
//
// Every primitive collapses to a static, fully-visible state when the
// visitor has `prefers-reduced-motion: reduce`. Nothing here hides
// content behind an animation. The SSR/initial DOM stays readable.

// Smooth exponential-out: the house entrance curve. Matches the easing
// used across the home + activities pages.
export const EASE_SMOOTH: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const EASE_SHARP:  [number, number, number, number] = [0.76, 0, 0.24, 1];

type Dir = 'up' | 'down' | 'left' | 'right' | 'none';

const offsetFor = (dir: Dir, d: number): { x?: number; y?: number } => {
  switch (dir) {
    case 'up':    return { y: d };
    case 'down':  return { y: -d };
    case 'left':  return { x: d };
    case 'right': return { x: -d };
    default:      return {};
  }
};

// ─── Reveal ──────────────────────────────────────────────────────────
// Single element that fades + drifts into place when it scrolls into
// view. The workhorse Tier-1 entrance. `once` keeps it settled after the
// first reveal (no re-trigger flicker on scroll-back).
export const Reveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  /** Travel direction of the entrance. Default 'up'. */
  from?: Dir;
  /** Travel distance in px. Default 28. */
  distance?: number;
  /** Seconds. Default 0.7. */
  duration?: number;
  /** Seconds. Default 0. */
  delay?: number;
  /** 0–1 visible fraction before triggering. Default 0.2. */
  amount?: number;
  once?: boolean;
  style?: React.CSSProperties;
  as?: 'div' | 'section' | 'li' | 'article' | 'figure' | 'header';
}> = ({
  children,
  className,
  from = 'up',
  distance = 28,
  duration = 0.7,
  delay = 0,
  amount = 0.2,
  once = true,
  style,
  as = 'div',
}) => {
  const reduce = useReducedMotion();
  const Comp = motion[as] as typeof motion.div;
  if (reduce) {
    return React.createElement(as, { className, style }, children);
  }
  const o = offsetFor(from, distance);
  return (
    <Comp
      className={className}
      style={style}
      initial={{ opacity: 0, ...o }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: EASE_SMOOTH }}
    >
      {children}
    </Comp>
  );
};

// ─── Stagger / StaggerItem ───────────────────────────────────────────
// Cascade a grid or list into view. Wrap the container in <Stagger> and
// each child in <StaggerItem>. Children ripple in on a 50ms cadence.
const staggerParent = (stagger: number, delayChildren: number): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren } },
});
const staggerChild = (distance: number, duration: number): Variants => ({
  hidden: { opacity: 0, y: distance },
  show: { opacity: 1, y: 0, transition: { duration, ease: EASE_SMOOTH } },
});

export const Stagger: React.FC<{
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delayChildren?: number;
  amount?: number;
  once?: boolean;
  style?: React.CSSProperties;
  as?: 'div' | 'ul' | 'section';
}> = ({
  children,
  className,
  stagger = 0.06,
  delayChildren = 0,
  amount = 0.15,
  once = true,
  style,
  as = 'div',
}) => {
  const reduce = useReducedMotion();
  const Comp = motion[as] as typeof motion.div;
  if (reduce) {
    return React.createElement(as, { className, style }, children);
  }
  return (
    <Comp
      className={className}
      style={style}
      variants={staggerParent(stagger, delayChildren)}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
    >
      {children}
    </Comp>
  );
};

export const StaggerItem: React.FC<{
  children: React.ReactNode;
  className?: string;
  distance?: number;
  duration?: number;
  style?: React.CSSProperties;
  as?: 'div' | 'li' | 'article' | 'figure';
}> = ({ children, className, distance = 26, duration = 0.65, style, as = 'div' }) => {
  const reduce = useReducedMotion();
  const Comp = motion[as] as typeof motion.div;
  if (reduce) {
    return React.createElement(as, { className, style }, children);
  }
  return (
    <Comp className={className} style={style} variants={staggerChild(distance, duration)}>
      {children}
    </Comp>
  );
};

// ─── Parallax ────────────────────────────────────────────────────────
// Scroll-linked vertical drift. Wrap a decorative/background layer; it
// glides at a fraction of scroll speed as its section passes through the
// viewport. Keep `speed` small (0.1–0.3) and reserve it for background
// or accent layers, never primary reading content.
export const Parallax: React.FC<{
  children: React.ReactNode;
  className?: string;
  /** Fraction of viewport travel. Positive = moves up as you scroll. */
  speed?: number;
  style?: React.CSSProperties;
}> = ({ children, className, speed = 0.18, style }) => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const range = 100 * speed;
  const y = useTransform(scrollYProgress, [0, 1], [range, -range]);
  if (reduce) {
    return <div ref={ref} className={className} style={style}>{children}</div>;
  }
  return (
    <div ref={ref} className={className} style={{ ...style, position: 'relative' }}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
};

// ─── RevealImage ─────────────────────────────────────────────────────
// Cinematic image reveal: a clip-path wipe uncovers the frame while the
// photo inside settles from a slow zoom (Ken-Burns-on-reveal). The
// signature "expensive" reveal from the analysis brief (technique #8).
export const RevealImage: React.FC<{
  src: string;
  alt?: string;
  className?: string;
  /** object-position, e.g. 'center 30%'. */
  position?: string;
  /** Wipe direction. Default 'up' (bottom→top inset). */
  from?: 'up' | 'down' | 'left' | 'right';
  duration?: number;
  /** Extra zoom applied to the inner photo during reveal. Default 1.12. */
  zoom?: number;
  loading?: 'lazy' | 'eager';
  onError?: React.ReactEventHandler<HTMLImageElement>;
  style?: React.CSSProperties;
}> = ({
  src,
  alt = '',
  className,
  position = 'center',
  from = 'up',
  duration = 1.0,
  zoom = 1.12,
  loading = 'lazy',
  onError,
  style,
}) => {
  const reduce = useReducedMotion();
  const clipFrom: Record<string, string> = {
    up:    'inset(100% 0 0 0)',
    down:  'inset(0 0 100% 0)',
    left:  'inset(0 100% 0 0)',
    right: 'inset(0 0 0 100%)',
  };
  const img = (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={onError}
      className="w-full h-full object-cover"
      style={{ objectPosition: position }}
    />
  );
  if (reduce) {
    return <div className={`overflow-hidden ${className ?? ''}`} style={style}>{img}</div>;
  }
  return (
    <motion.div
      className={`overflow-hidden ${className ?? ''}`}
      style={style}
      initial={{ clipPath: clipFrom[from] }}
      whileInView={{ clipPath: 'inset(0% 0 0 0)' }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration, ease: EASE_SHARP }}
    >
      <motion.div
        className="w-full h-full"
        initial={{ scale: zoom }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: duration + 0.4, ease: EASE_SMOOTH }}
      >
        {img}
      </motion.div>
    </motion.div>
  );
};

// ─── ChapterIntro ────────────────────────────────────────────────────
// The shared section header rhythm used site-wide: amber italic eyebrow
// over a hairline, a Cinzel display title, brass divider, optional lead.
// Reveals as a small staggered group so every chapter opens the same way.
export const ChapterIntro: React.FC<{
  eyebrow?: string;
  title: string;
  lead?: string;
  align?: 'center' | 'left';
  className?: string;
}> = ({ eyebrow, title, lead, align = 'center', className }) => {
  const centered = align === 'center';
  return (
    <Stagger
      className={`${centered ? 'text-center mx-auto' : 'text-left'} max-w-2xl ${className ?? ''}`}
      stagger={0.08}
      amount={0.4}
    >
      {eyebrow && (
        <StaggerItem>
          <p
            className={`font-editorial italic uppercase tracking-[0.4em] text-[11px] md:text-xs text-[var(--color-amber-glow)] mb-4 inline-flex items-center gap-3 ${
              centered ? 'justify-center' : ''
            }`}
          >
            <span aria-hidden className="h-px w-7" style={{ background: 'var(--color-amber-glow)' }} />
            {eyebrow}
          </p>
        </StaggerItem>
      )}
      <StaggerItem>
        <h2 className="font-display title-medieval text-2xl sm:text-3xl md:text-5xl text-ivory leading-[1.05]">
          {title}
        </h2>
      </StaggerItem>
      <StaggerItem>
        <div className={`divider-brass w-20 my-5 ${centered ? 'mx-auto' : ''}`} />
      </StaggerItem>
      {lead && (
        <StaggerItem>
          <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed">
            {lead}
          </p>
        </StaggerItem>
      )}
    </Stagger>
  );
};

// ─── ScrollProgress ──────────────────────────────────────────────────
// A thin candlelight rail pinned to the top of the page, filling as the
// reader descends. Quiet cinematic identity marker; skipped for reduced
// motion. Mount once near the top of a page.
export const ScrollProgress: React.FC<{ className?: string }> = ({ className }) => {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  if (reduce) return null;
  return (
    <motion.div
      aria-hidden
      className={`fixed top-0 left-0 right-0 z-[60] h-[2px] origin-left ${className ?? ''}`}
      style={{
        scaleX: scrollYProgress,
        background:
          'linear-gradient(90deg, var(--color-copper), var(--color-amber-glow) 55%, #FFF6D5)',
        boxShadow: '0 0 12px rgba(232,177,74,0.55)',
      }}
    />
  );
};

// ─── ParallaxBackdrop ────────────────────────────────────────────────
// Full-bleed photographic backdrop that drifts slowly behind a section,
// veiled by a velvet scrim so foreground text stays legible. Pairs with
// the page's caravan gradient rather than fighting it.
export const ParallaxBackdrop: React.FC<{
  src: string;
  position?: string;
  /** Scrim strength 0–1. Default 0.72. */
  scrim?: number;
  speed?: number;
  className?: string;
}> = ({ src, position = 'center', scrim = 0.72, speed = 0.2, className }) => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const travel = 12 * speed * 10; // px
  const y = useTransform(scrollYProgress, [0, 1], [-travel, travel]);
  return (
    <div ref={ref} aria-hidden className={`absolute inset-0 overflow-hidden pointer-events-none ${className ?? ''}`}>
      <motion.div
        className="absolute -inset-y-[12%] inset-x-0 bg-cover"
        style={{
          backgroundImage: `url(${src})`,
          backgroundPosition: position,
          y: reduce ? 0 : y,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 120% 90% at 50% 50%, rgba(10,2,7,${scrim * 0.6}), rgba(10,2,7,${scrim}) 80%)`,
        }}
      />
    </div>
  );
};
