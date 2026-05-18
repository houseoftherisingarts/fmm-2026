import React from 'react';

// Decorative wax-seal SVG. Brass disc with star + radial scallops, used to
// stamp completed chapters and the final submitted state.
export const WaxSeal: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden focusable="false">
    <defs>
      <radialGradient id="wax-rg" cx="40%" cy="35%" r="65%">
        <stop offset="0%"  stopColor="#E5C679" />
        <stop offset="55%" stopColor="#C4A45A" />
        <stop offset="100%" stopColor="#7A6534" />
      </radialGradient>
    </defs>
    {/* Outer scallop (12 rays) */}
    <g fill="url(#wax-rg)">
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * Math.PI * 2) / 12;
        const cx = 32 + Math.cos(a) * 27;
        const cy = 32 + Math.sin(a) * 27;
        return <circle key={i} cx={cx} cy={cy} r="6" />;
      })}
      <circle cx="32" cy="32" r="22" />
    </g>
    {/* Inner ring */}
    <circle cx="32" cy="32" r="18" fill="none" stroke="#0E1A2A" strokeOpacity="0.35" strokeWidth="1.2" />
    {/* Center star */}
    <path
      d="M32 19 L34.6 28.5 L44 28.5 L36.5 34 L39 43 L32 37.5 L25 43 L27.5 34 L20 28.5 L29.4 28.5 Z"
      fill="#0E1A2A" fillOpacity="0.55"
    />
  </svg>
);
