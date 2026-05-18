import React from 'react';
import { motion } from 'framer-motion';

// Animated SVG filigree corners. Strokes draw in via stroke-dashoffset.
// Color is driven by `accent` so each chapter can recolor the frame.

interface Props {
  accent?: string;            // CSS color
  className?: string;
  duration?: number;
}

// One reusable corner glyph (top-left). Other corners reuse via rotation.
const Corner: React.FC<{ rotate: number; accent: string; duration: number }> = ({ rotate, accent, duration }) => (
  <motion.svg
    viewBox="0 0 80 80"
    width="80" height="80"
    className="absolute"
    style={{ transform: `rotate(${rotate}deg)`, color: accent }}
    aria-hidden
  >
    <motion.path
      d="M2 30 V8 Q2 2 8 2 H30"
      fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration, ease: 'easeOut' }}
    />
    <motion.path
      d="M10 22 V14 Q10 10 14 10 H22 M14 18 H10"
      fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.8"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: duration * 0.85, delay: duration * 0.2, ease: 'easeOut' }}
    />
    <motion.circle
      cx="6" cy="6" r="1.4" fill="currentColor"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3, delay: duration * 0.55 }}
    />
    <motion.path
      d="M30 4 Q40 4 40 14"
      fill="none" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.5"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: duration * 0.6, delay: duration * 0.4 }}
    />
  </motion.svg>
);

const OrnateFrame: React.FC<Props> = ({ accent = 'var(--color-amber-glow)', className = '', duration = 0.9 }) => (
  <div className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden>
    <div className="absolute top-0 left-0">              <Corner rotate={0}   accent={accent} duration={duration} /></div>
    <div className="absolute top-0 right-0">             <Corner rotate={90}  accent={accent} duration={duration} /></div>
    <div className="absolute bottom-0 right-0">          <Corner rotate={180} accent={accent} duration={duration} /></div>
    <div className="absolute bottom-0 left-0">           <Corner rotate={270} accent={accent} duration={duration} /></div>
  </div>
);

export default OrnateFrame;
