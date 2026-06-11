import React, { useRef } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from 'framer-motion';
import { BookOpen } from 'lucide-react';

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

// ─── Codex3D ─────────────────────────────────────────────────────────
// The 3D moment: a medieval codex rendered in CSS 3D that tilts and
// opens as you scroll past it (rotateY/rotateX driven by scroll), its
// pages catching candlelight. Fits "Apprendre", the book of crafts and
// knowledge. Static, gently open under prefers-reduced-motion.
export const Codex3D: React.FC<{ label?: string; caption?: string }> = ({ label, caption }) => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  // The book swings through 3D as the section crosses the viewport.
  const rotY = useTransform(scrollYProgress, [0, 0.5, 1], [-48, 6, 40]);
  const rotX = useTransform(scrollYProgress, [0, 0.5, 1], [22, 8, -14]);
  const lift = useTransform(scrollYProgress, [0, 0.5, 1], [70, 0, -50]);
  const coverOpen = useTransform(scrollYProgress, [0.2, 0.6], [-8, -118]);

  const staticRotY = reduce ? -22 : undefined;
  const staticRotX = reduce ? 12 : undefined;

  return (
    <div
      ref={ref}
      style={{
        perspective: 1400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 0',
      }}
    >
      <motion.div
        style={{
          position: 'relative',
          width: 'min(62vw, 330px)',
          height: 'min(80vw, 430px)',
          transformStyle: 'preserve-3d',
          rotateY: reduce ? staticRotY : rotY,
          rotateX: reduce ? staticRotX : rotX,
          y: reduce ? 0 : lift,
        }}
      >
        {/* Back board */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '6px 14px 14px 6px',
            background: 'linear-gradient(135deg, #2B0A12, #1A050B)',
            boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
            transform: 'translateZ(-26px)',
            border: '1px solid rgba(176,141,58,0.4)',
          }}
        />
        {/* Page block */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: '10px 8px 10px 14px',
            borderRadius: '3px 8px 8px 3px',
            background:
              'repeating-linear-gradient(180deg, #efe5c9 0px, #efe5c9 3px, #e6d8b4 4px)',
            transform: 'translateZ(-8px)',
            boxShadow: 'inset -8px 0 18px rgba(120,90,40,0.35)',
          }}
        />
        {/* Front cover, opens on scroll */}
        <motion.div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            transformOrigin: 'left center',
            transformStyle: 'preserve-3d',
            rotateY: reduce ? -28 : coverOpen,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '6px 14px 14px 6px',
              background:
                'linear-gradient(135deg, #6B1F1F 0%, #4a1212 45%, #2B0A12 100%)',
              border: '1px solid rgba(232,177,74,0.55)',
              boxShadow:
                'inset 0 0 0 6px rgba(176,141,58,0.18), inset 0 0 60px rgba(184,106,42,0.25)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              backfaceVisibility: 'hidden',
            }}
          >
            <div
              style={{
                width: 86,
                height: 86,
                borderRadius: '50%',
                border: '2px solid rgba(232,177,74,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 30px rgba(232,177,74,0.35)',
              }}
            >
              <BookOpen size={40} style={{ color: 'var(--color-amber-glow)' }} />
            </div>
            {label && (
              <span
                className="font-display title-medieval uppercase"
                style={{
                  fontSize: '0.78rem',
                  letterSpacing: '0.28em',
                  color: 'var(--color-brass-soft)',
                  textAlign: 'center',
                  padding: '0 1.2rem',
                }}
              >
                {label}
              </span>
            )}
          </div>
          {/* Cover inner face (visible once opened) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '6px 14px 14px 6px',
              background: 'linear-gradient(135deg, #efe5c9, #d9c8a0)',
              transform: 'rotateY(180deg)',
              backfaceVisibility: 'hidden',
            }}
          />
        </motion.div>

        {/* Spine highlight */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: -2,
            top: 0,
            bottom: 0,
            width: 10,
            borderRadius: 4,
            background: 'linear-gradient(90deg, rgba(176,141,58,0.8), rgba(43,10,18,0.2))',
            transform: 'translateZ(-13px)',
          }}
        />
      </motion.div>

      {caption && (
        <span
          className="font-editorial italic"
          style={{
            position: 'absolute',
            bottom: 0,
            fontSize: '0.85rem',
            color: 'var(--color-ivory-soft)',
            letterSpacing: '0.04em',
          }}
        >
          {caption}
        </span>
      )}
    </div>
  );
};
