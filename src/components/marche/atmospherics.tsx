import React from 'react';
import { Link } from 'react-router-dom';

// ─── SectionRail ────────────────────────────────────────────────────
// Top + bottom hairline rails matching MerchantPact's pattern, so
// every /marche section shares the same structural rhythm. The top
// rail shows the section's index/name on the left and an optional
// meta readout on the right; the bottom rail mirrors the structure
// with a diamond pip + hint. Borders + colors match the existing
// MerchantPact rule exactly so nothing visual changes — sections just
// bleed into a unified chapter-by-chapter flow.
export const SectionTopRail: React.FC<{
  index: string;
  name:  string;
  meta?: string;
  metaValue?: React.ReactNode;
  className?: string;
}> = ({ index, name, meta, metaValue, className = '' }) => (
  <div
    className={`flex items-center justify-between gap-4 pb-2 ${className}`}
    style={{ borderBottom: '1px solid rgba(244, 239, 227, 0.10)' }}
  >
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: 5, height: 5,
          transform: 'rotate(45deg)',
          background: 'var(--color-amber-glow)',
        }}
      />
      <span
        className="font-sans uppercase tracking-[0.4em] text-[10px]"
        style={{ color: 'var(--color-amber-glow)' }}
      >
        {index} <span className="opacity-50">·</span> {name}
      </span>
    </div>
    {meta && (
      <div className="hidden md:flex items-center gap-2">
        <span
          className="font-sans uppercase tracking-[0.35em] text-[10px]"
          style={{ color: 'rgba(244, 239, 227, 0.55)' }}
        >
          {meta}
        </span>
        {metaValue && (
          <span
            className="font-sans text-sm tracking-[0.2em]"
            style={{ color: 'var(--color-amber-glow)', fontWeight: 300 }}
          >
            {metaValue}
          </span>
        )}
      </div>
    )}
  </div>
);

export const SectionBottomRail: React.FC<{
  hint?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}> = ({ hint, meta, className = '' }) => (
  <div
    className={`flex items-center justify-between flex-wrap gap-y-3 pt-5 ${className}`}
    style={{ borderTop: '1px solid rgba(244, 239, 227, 0.10)' }}
  >
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: 4, height: 4,
          transform: 'rotate(45deg)',
          background: 'var(--color-copper)',
        }}
      />
      <span
        className="font-sans uppercase tracking-[0.35em] text-[10px]"
        style={{ color: 'rgba(244, 239, 227, 0.55)' }}
      >
        {hint}
      </span>
    </div>
    {meta && (
      <span
        className="font-sans uppercase tracking-[0.35em] text-[10px]"
        style={{ color: 'rgba(244, 239, 227, 0.55)' }}
      >
        {meta}
      </span>
    )}
  </div>
);

// ─── SectionFog ──────────────────────────────────────────────────────
// Pure-CSS atmospheric overlay at section edges. No video, no canvas,
// no SVG noise — three layered radial-gradient blobs of warm copper
// fog that drift slowly via background-position animation. Cheap on
// GPU, no playback desync, no clip artifacts, and the dense centre
// always lands at the seam regardless of section height.
//
// Default: both edges. Pass `edges="bottom"` (or `"top"`) when a
// section's other edge shouldn't carry fog — e.g. a hero where the
// top fog would cover the orb.
export const SectionFog: React.FC<{ edges?: 'top' | 'bottom' | 'both' }> = ({
  edges = 'both',
}) => (
  <div aria-hidden className="section-fog">
    {(edges === 'both' || edges === 'top')    && <span data-pos="top" />}
    {(edges === 'both' || edges === 'bottom') && <span data-pos="bottom" />}
  </div>
);


// Caravan-theme typographic + frame primitives. Pattern lifted from
// le-salon-des-inconnus InnPage (corner brackets, hairline dividers)
// fused with League-of-Legends champion-select chrome (gilded corner
// ornaments, runic plates, energy pulses). Caravan palette: velvet,
// oxblood, copper, amber-glow.

// ─── Eyebrow ─────────────────────────────────────────────────────
export const Eyebrow: React.FC<{ children: React.ReactNode; className?: string; tone?: 'copper' | 'amber' }> = ({
  children,
  className = '',
  tone = 'copper',
}) => (
  <p
    className={`font-editorial italic uppercase tracking-[0.45em] text-[10px] md:text-[11px] ${className}`}
    style={{ color: tone === 'amber' ? 'var(--color-amber-glow)' : 'var(--color-copper)' }}
  >
    {children}
  </p>
);

// ─── DisplayTitle ────────────────────────────────────────────────
// Caravan display: warm bone-ivory, slight serif weight, two sizes.
export const DisplayTitle: React.FC<{
  children: React.ReactNode;
  size?: 'lg' | 'xl';
  className?: string;
  glow?: boolean;
}> = ({ children, size = 'lg', className = '', glow = false }) => (
  <h2
    className={`font-display leading-[1.02] tracking-[-0.005em] ${
      size === 'xl' ? 'text-4xl md:text-6xl lg:text-7xl' : 'text-3xl md:text-5xl'
    } ${className}`}
    style={{
      color: 'var(--color-bone)',
      fontWeight: 400,
      textShadow: glow ? '0 0 24px rgba(232, 177, 74, 0.28), 0 0 60px rgba(184, 106, 42, 0.22)' : undefined,
    }}
  >
    {children}
  </h2>
);

// ─── BracketFrame ────────────────────────────────────────────────
// Four L-tick corners that light on hover (InnPage VictorianCard).
// Kept for sober usages; the richer GildedFrame is preferred for
// hero/premium contexts.
export const BracketFrame: React.FC<{
  children: React.ReactNode;
  className?: string;
  inset?: number;
  active?: boolean;
}> = ({ children, className = '', inset = 0, active = false }) => {
  const tickBase = 'absolute w-2.5 h-2.5 transition-colors duration-500 pointer-events-none';
  const tone = active
    ? 'border-[var(--color-amber-glow)]'
    : 'border-[var(--color-bone)]/30 group-hover:border-[var(--color-amber-glow)]/90';
  return (
    <div className={`group relative ${className}`}>
      {children}
      <span aria-hidden className={`${tickBase} ${tone} border-t border-l`} style={{ top: inset, left: inset }} />
      <span aria-hidden className={`${tickBase} ${tone} border-t border-r`} style={{ top: inset, right: inset }} />
      <span aria-hidden className={`${tickBase} ${tone} border-b border-l`} style={{ bottom: inset, left: inset }} />
      <span aria-hidden className={`${tickBase} ${tone} border-b border-r`} style={{ bottom: inset, right: inset }} />
    </div>
  );
};

// ─── GildedFrame ─────────────────────────────────────────────────
// LoL champion-select-style ornate corner frame. Renders four SVG
// corner ornaments inside the wrapper — flourished gold filigree,
// not bracket ticks. Pair with a dark/photo background. Set `active`
// to lock the corners lit (e.g. selected card).
export const GildedFrame: React.FC<{
  children: React.ReactNode;
  className?: string;
  inset?: number;
  active?: boolean;
  /** Tone of the filigree: 'copper' default, 'amber' for hot moments. */
  tone?: 'copper' | 'amber';
}> = ({ children, className = '', inset = 14, active = false, tone = 'copper' }) => {
  const color = tone === 'amber' ? 'var(--color-amber-glow)' : 'var(--color-copper)';
  const litShadow = active
    ? `drop-shadow(0 0 10px ${color}) drop-shadow(0 0 22px ${color})`
    : undefined;
  return (
    <div className={`group relative ${className}`}>
      {children}
      {(['tl', 'tr', 'bl', 'br'] as const).map((pos) => (
        <CornerOrnament key={pos} pos={pos} inset={inset} color={color} active={active} filter={litShadow} />
      ))}
      {/* Energy edge — top + bottom hairlines that brighten on hover */}
      <span
        aria-hidden
        className={`pointer-events-none absolute left-12 right-12 top-0 h-px transition-opacity duration-500 ${
          active ? 'opacity-90' : 'opacity-30 group-hover:opacity-80'
        }`}
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute left-12 right-12 bottom-0 h-px transition-opacity duration-500 ${
          active ? 'opacity-90' : 'opacity-30 group-hover:opacity-80'
        }`}
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
    </div>
  );
};

const CornerOrnament: React.FC<{
  pos: 'tl' | 'tr' | 'bl' | 'br';
  inset: number;
  color: string;
  active: boolean;
  filter?: string;
}> = ({ pos, inset, color, active, filter }) => {
  const flipX = pos === 'tr' || pos === 'br' ? -1 : 1;
  const flipY = pos === 'bl' || pos === 'br' ? -1 : 1;
  const style: React.CSSProperties = {
    position: 'absolute',
    width: 38,
    height: 38,
    transform: `scale(${flipX}, ${flipY})`,
    transformOrigin: 'center',
    filter,
    transition: 'filter 500ms ease, opacity 500ms ease',
    opacity: active ? 1 : 0.55,
  };
  if (pos === 'tl' || pos === 'bl') style.left = inset;
  if (pos === 'tr' || pos === 'br') style.right = inset;
  if (pos === 'tl' || pos === 'tr') style.top = inset;
  if (pos === 'bl' || pos === 'br') style.bottom = inset;

  return (
    <svg
      aria-hidden
      viewBox="0 0 38 38"
      style={style}
      className="group-hover:opacity-100 transition-opacity duration-500"
    >
      <g fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round">
        {/* Long L stroke */}
        <path d="M2 2 L26 2 M2 2 L2 26" strokeWidth="1.4" />
        {/* Inner echo */}
        <path d="M6 6 L18 6 M6 6 L6 18" opacity="0.65" />
        {/* Flourish curl */}
        <path d="M26 2 Q34 2 34 10" strokeWidth="1.0" opacity="0.85" />
        <path d="M2 26 Q2 34 10 34" strokeWidth="1.0" opacity="0.85" />
        {/* Centerpoint diamond */}
        <path d="M2 2 L7 2 L4.5 5 Z" fill={color} stroke="none" opacity="0.9" />
        {/* Outer pip */}
        <circle cx="32" cy="32" r="1.4" fill={color} stroke="none" opacity="0.7" />
      </g>
    </svg>
  );
};

// ─── RuneRow ─────────────────────────────────────────────────────
// Three tiny stacked runes used as a divider/sigil between sections.
// Replaces the earlier QuietDivider in caravan-flavoured contexts.
export const RuneRow: React.FC<{
  className?: string;
  label?: string;
}> = ({ className = '', label }) => (
  <div aria-hidden className={`flex items-center justify-center gap-5 ${className}`}>
    <span
      className="h-px w-24 md:w-40"
      style={{ background: 'linear-gradient(90deg, transparent, var(--color-copper), transparent)' }}
    />
    <RuneMark />
    <span
      className="w-2 h-2 rotate-45 border"
      style={{ borderColor: 'var(--color-amber-glow)', backgroundColor: 'var(--color-velvet-deep)' }}
    />
    <RuneMark />
    <span
      className="h-px w-24 md:w-40"
      style={{ background: 'linear-gradient(90deg, transparent, var(--color-copper), transparent)' }}
    />
    {label && (
      <span
        className="font-editorial italic uppercase tracking-[0.45em] text-[10px] absolute"
        style={{ color: 'var(--color-amber-glow)' }}
      >
        {label}
      </span>
    )}
  </div>
);

const RuneMark: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
    <g
      stroke="var(--color-copper)"
      strokeWidth="1"
      fill="none"
      strokeLinecap="round"
      opacity="0.85"
    >
      <path d="M3 13 L8 3 L13 13" />
      <path d="M5 9 L11 9" opacity="0.6" />
    </g>
  </svg>
);

// ─── HexPanel ─────────────────────────────────────────────────────
// Wild-Rift-style hex-cut panel. Two opposing corners notched. Use
// for tier plates, focal cards, modal frames. The notch size is tuned
// via the `--hex` CSS var; `size` switches between sm / md / lg.
export const HexPanel: React.FC<{
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  /** Inner padding — defaults to 0 (caller controls). */
  padded?: boolean;
}> = ({ children, className = '', size = 'md', active = false, padded = false }) => {
  const sizeClass = size === 'sm' ? 'hex-cut-sm' : size === 'lg' ? 'hex-cut-lg' : '';
  return (
    <div className={`group relative ${className}`}>
      <div className={`hex-cut ${sizeClass} relative h-full ${padded ? 'p-6 md:p-8' : ''}`}>
        {children}
      </div>
      <span aria-hidden className={`hex-edge ${sizeClass}`} data-active={active || undefined} />
    </div>
  );
};

// ─── ChevronButton ────────────────────────────────────────────────
// Wild-Rift primary action — slanted parallelogram-ish edge, amber
// gradient fill, diagonal accent stripes, internal hover sheen. Used
// as the page-wide primary CTA pattern (apply, pre-order, etc).
interface ChevronButtonProps {
  children: React.ReactNode;
  /** External URL — renders an <a>. */
  href?: string;
  /** Internal route — renders a react-router <Link>. */
  to?: string;
  /** Form submit / native action — renders a <button>. */
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  target?: string;
  rel?: string;
  className?: string;
  lean?: 'right' | 'left';
  variant?: 'gold' | 'ghost';
  disabled?: boolean;
}

export const ChevronButton: React.FC<ChevronButtonProps> = ({
  children,
  href,
  to,
  type,
  onClick,
  target,
  rel,
  className = '',
  lean = 'right',
  variant = 'gold',
  disabled = false,
}) => {
  const chevClass = lean === 'left' ? 'chev-cta-r' : 'chev-cta';
  const goldStyle: React.CSSProperties = {
    color: 'var(--color-velvet-deep)',
    background:
      'linear-gradient(180deg, var(--color-amber-glow) 0%, var(--color-mustard) 55%, var(--color-copper) 100%)',
    boxShadow:
      '0 0 0 1px rgba(232, 177, 74, 0.6) inset, 0 0 30px -4px rgba(232, 177, 74, 0.55), 0 14px 32px -10px rgba(216, 155, 58, 0.7)',
  };
  const ghostStyle: React.CSSProperties = {
    color: 'var(--color-amber-glow)',
    background: 'rgba(232, 177, 74, 0.08)',
    boxShadow: '0 0 0 1px rgba(232, 177, 74, 0.45) inset',
  };
  const style = disabled
    ? { ...ghostStyle, opacity: 0.55, cursor: 'not-allowed' }
    : variant === 'gold' ? goldStyle : ghostStyle;

  const Inner = (
    <>
      {variant === 'gold' && !disabled && <span aria-hidden className="chev-stripe absolute inset-0" />}
      {!disabled && (
        <span
          aria-hidden
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 100%, rgba(255, 240, 200, 0.55), transparent 70%)',
            mixBlendMode: 'screen',
          }}
        />
      )}
      <span className="relative font-sans uppercase tracking-[0.28em] text-[11px] font-semibold">
        {children}
      </span>
      <span
        aria-hidden
        className={`relative inline-block w-4 h-px transition-all ${disabled ? '' : 'group-hover:w-8'} ${
          variant === 'gold' ? 'bg-[var(--color-velvet-deep)]' : 'bg-[var(--color-amber-glow)]'
        }`}
      />
    </>
  );

  const cls = `group relative inline-flex items-center gap-3 px-8 py-3.5 overflow-hidden ${chevClass} ${className}`;

  if (disabled) {
    return (
      <span className={cls} style={style} aria-disabled="true">{Inner}</span>
    );
  }
  if (type) {
    return (
      <button type={type} onClick={onClick} className={cls} style={style}>{Inner}</button>
    );
  }
  if (to) {
    return (
      <Link to={to} onClick={onClick} className={cls} style={style}>{Inner}</Link>
    );
  }
  return (
    <a href={href} target={target} rel={rel} onClick={onClick} className={cls} style={style}>{Inner}</a>
  );
};

// ─── HexMark ──────────────────────────────────────────────────────
// Tiny six-point hex used at section breaks and as a status pip.
export const HexMark: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = '', style }) => (
  <span aria-hidden className={`fmm-hex-mark inline-block ${className}`} style={style} />
);

// ─── EnergyPulse ────────────────────────────────────────────────
// Pulsing concentric ring used behind focal elements (active
// champion-select tile, hero focal point). Pure CSS.
export const EnergyPulse: React.FC<{
  className?: string;
  tone?: 'copper' | 'amber' | 'oxblood';
}> = ({ className = '', tone = 'copper' }) => {
  const color =
    tone === 'amber'
      ? 'var(--color-amber-glow)'
      : tone === 'oxblood'
      ? 'var(--color-oxblood)'
      : 'var(--color-copper)';
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 ${className}`}>
      <span
        className="absolute inset-0 rounded-[inherit] fmm-pulse-1"
        style={{ boxShadow: `inset 0 0 60px -10px ${color}` }}
      />
      <span
        className="absolute inset-0 rounded-[inherit] fmm-pulse-2"
        style={{ boxShadow: `inset 0 0 120px -30px ${color}` }}
      />
    </div>
  );
};
