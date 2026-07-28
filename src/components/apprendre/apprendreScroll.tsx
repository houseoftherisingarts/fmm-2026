import React, { useRef } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from 'framer-motion';
const EASE_SMOOTH: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ─── CinematicReveal ─────────────────────────────────────────────────
// The dramatic entrance: content flies in from real distance with a
// blur + scale resolve, not a subtle fade. Collapses to static content
// under prefers-reduced-motion.
export const CinematicReveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  /** Travel distance in px. Default 96 (large, deliberately felt). */
  distance?: number;
  from?: 'up' | 'left' | 'right';
  delay?: number;
  duration?: number;
  amount?: number;
  style?: React.CSSProperties;
  as?: 'div' | 'section' | 'article' | 'header';
}> = ({
  children,
  className,
  distance = 96,
  from = 'up',
  delay = 0,
  duration = 0.9,
  amount = 0.3,
  style,
  as = 'div',
}) => {
  const reduce = useReducedMotion();
  if (reduce) {
    return React.createElement(as, { className, style }, children);
  }
  const Comp = motion[as] as typeof motion.div;
  const offset =
    from === 'left' ? { x: -distance } : from === 'right' ? { x: distance } : { y: distance };
  return (
    <Comp
      className={className}
      style={style}
      initial={{ opacity: 0, ...offset, scale: 0.94, filter: 'blur(12px)' }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)' }}
      viewport={{ once: true, amount }}
      transition={{ duration, delay, ease: EASE_SMOOTH }}
    >
      {children}
    </Comp>
  );
};

// ─── DepthChapter ────────────────────────────────────────────────────
// Wraps a section and paints three scroll-linked parallax layers behind
// the children: a far ember/parchment bloom, a mid drifting band, and a
// near vignette, each moving at a very different rate to read as real
// depth as the chapter passes through the viewport.
export const DepthChapter: React.FC<{
  children: React.ReactNode;
  className?: string;
  /** 'ember' for dark sections, 'parchment' for light sections. */
  tone?: 'ember' | 'parchment';
  style?: React.CSSProperties;
}> = ({ children, className, tone = 'ember', style }) => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  // Large travel ranges so the depth is unmistakable.
  const yFar = useTransform(scrollYProgress, [0, 1], [-90, 90]);
  const yMid = useTransform(scrollYProgress, [0, 1], [160, -160]);
  const yNear = useTransform(scrollYProgress, [0, 1], [-220, 220]);
  const farScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.05, 1.2, 1.05]);

  const farBg =
    tone === 'parchment'
      ? 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(232,177,74,0.16), transparent 70%)'
      : 'radial-gradient(ellipse 65% 55% at 50% 45%, rgba(184,106,42,0.22), transparent 72%)';
  const midBg =
    tone === 'parchment'
      ? 'linear-gradient(90deg, transparent, rgba(176,141,58,0.12) 45%, transparent)'
      : 'linear-gradient(90deg, transparent, rgba(232,177,74,0.10) 50%, transparent)';

  const z = (v: MotionValue<number>) => (reduce ? 0 : v);

  return (
    <div ref={ref} className={className} style={{ ...style, position: 'relative', overflow: 'hidden' }}>
      <motion.div
        aria-hidden
        style={{
          position: 'absolute',
          inset: '-15% 0',
          background: farBg,
          y: z(yFar),
          scale: reduce ? 1 : farScale,
          pointerEvents: 'none',
        }}
      />
      <motion.div
        aria-hidden
        style={{
          position: 'absolute',
          left: '-20%',
          right: '-20%',
          top: '30%',
          height: '40%',
          background: midBg,
          filter: 'blur(26px)',
          y: z(yMid),
          pointerEvents: 'none',
        }}
      />
      <motion.div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(120% 80% at 50% 120%, rgba(10,2,7,0.45), transparent 60%)',
          y: z(yNear),
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
};

