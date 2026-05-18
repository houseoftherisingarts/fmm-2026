import React from 'react';

// Three swaying SVG lanterns hung above the form. Each lantern has a
// staggered sway+flicker animation; the whole row uses CSS only so it
// pauses correctly under prefers-reduced-motion.

const Lantern: React.FC<{ delay: number; size?: number }> = ({ delay, size = 44 }) => (
  <div className="lantern-sway" style={{ animationDelay: `${delay}s` }}>
    {/* Hanging cord */}
    <div className="w-px h-10 bg-gradient-to-b from-transparent via-amber-500/40 to-amber-500/60 mx-auto" />
    <div
      className="lantern-flicker relative"
      style={{ animationDelay: `${delay * 0.7}s`, width: size, height: size * 1.35 }}
    >
      <svg viewBox="0 0 60 80" width={size} height={size * 1.35} aria-hidden>
        <defs>
          <radialGradient id={`lglow-${delay}`} cx="50%" cy="55%" r="55%">
            <stop offset="0%"  stopColor="#FFE6A8" stopOpacity="1" />
            <stop offset="55%" stopColor="#E8B14A" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#7B1E2D" stopOpacity="0.0" />
          </radialGradient>
          <linearGradient id={`lframe-${delay}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"  stopColor="#7A6534" />
            <stop offset="50%" stopColor="#C4A45A" />
            <stop offset="100%" stopColor="#5B4A22" />
          </linearGradient>
        </defs>
        {/* Crown */}
        <path d="M22 4 H38 L42 12 H18 Z" fill={`url(#lframe-${delay})`} />
        <rect x="20" y="12" width="20" height="3" fill="#3A2A18" />
        {/* Globe glow */}
        <ellipse cx="30" cy="40" rx="22" ry="26" fill={`url(#lglow-${delay})`} />
        {/* Glass body — segmented */}
        <path
          d="M14 22 Q30 16 46 22 L48 56 Q30 68 12 56 Z"
          fill="rgba(255, 200, 110, 0.14)"
          stroke={`url(#lframe-${delay})`}
          strokeWidth="1.2"
        />
        <line x1="14" y1="22" x2="12" y2="56" stroke={`url(#lframe-${delay})`} strokeWidth="1" />
        <line x1="46" y1="22" x2="48" y2="56" stroke={`url(#lframe-${delay})`} strokeWidth="1" />
        <line x1="30" y1="18" x2="30" y2="66" stroke={`url(#lframe-${delay})`} strokeWidth="0.8" opacity="0.6" />
        {/* Flame */}
        <path
          d="M30 32 Q26 38 28 44 Q30 47 30 50 Q32 47 32 44 Q34 38 30 32 Z"
          fill="#FFE6A8"
        />
        {/* Foot */}
        <rect x="22" y="64" width="16" height="3" fill={`url(#lframe-${delay})`} />
        <path d="M26 67 H34 L32 72 H28 Z" fill="#3A2A18" />
      </svg>
    </div>
  </div>
);

const LanternRow: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`pointer-events-none flex items-start justify-around px-8 ${className}`}>
    <Lantern delay={0}    size={36} />
    <Lantern delay={1.1}  size={48} />
    <Lantern delay={0.5}  size={36} />
  </div>
);

export default LanternRow;
