import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useUI } from '../../contexts/AppContext';
import { SectionFog } from '../marche/atmospherics';

// ─── PageHeader ──────────────────────────────────────────────────────
// Shared two-column header used by every pillar page. Lifted from
// OrbHomePage's chrome:
//   • Left  → breadcrumb + eyebrow + display title + intro + CTAs
//   • Right → glass orb with a section-specific image, brass rim,
//             Ken Burns drift, single glistening sweep on mount
//
// Pages pass their own `orbImage` (a section emblem like coins for the
// market, a feast plate for nourriture, etc) plus copy and optional
// CTAs. The orb's rim, sweep, glow, and inner vignette are constant so
// the entire site shares one visual signature.
//
// Account access lives in the global NavBar (which renders above every
// page that uses PageHeader). The floating top-right account pill was
// removed to avoid two CTAs competing — only OrbHomePage (immersive,
// no NavBar) keeps its own account button.

export interface PageHeaderCta {
  label:   string;
  to?:     string;
  href?:   string;
  variant: 'primary' | 'ghost';
  /** Hook for SFX, analytics, etc. */
  onClick?: () => void;
}

interface Props {
  eyebrow:      string;
  /** Two-line display title. Pass titleB="" to render just one line. */
  titleA:       string;
  titleB?:      string;
  intro:        string;
  /** Image displayed inside the orb. Path under /public/. */
  orbImage:     string;
  /** Optional object-position hint (e.g. "center 35%"). */
  orbImagePosition?: string;
  /** Optional video as orb media — overrides image when set. */
  orbVideo?:    string;
  /** Up to two CTAs displayed below the intro. */
  ctas?:        PageHeaderCta[];
}

const PageHeader: React.FC<Props> = ({
  eyebrow,
  titleA,
  titleB,
  intro,
  orbImage,
  orbImagePosition = 'center',
  orbVideo,
  ctas = [],
}) => {
  const { lang } = useUI();
  // Re-key the orb sweep on first paint AND on every hover, so the
  // diagonal glistening lance plays both on mount and whenever the
  // user mouses over the orb. Re-keying remounts the sweep spans →
  // their CSS animation runs from frame zero again.
  const [sweepKey, setSweepKey] = useState(0);
  useEffect(() => { setSweepKey((k) => k + 1); }, []);
  const triggerSweep = () => setSweepKey((k) => k + 1);

  return (
    <header className="relative text-ivory overflow-hidden isolate">
      {/* Atmosphere is now painted by .fmm-caravan-page on <body> as
          a single continuous gradient covering the whole document.
          Hero is transparent — the orb is the visual focus. */}

      {/* Bottom-only fog — covers the hero→first-tier seam. Top edge
          stays clear so the orb has uncluttered surrounding space. */}
      <SectionFog edges="bottom" />

      <div className="relative z-10 max-w-screen-2xl mx-auto px-5 md:px-10 lg:px-14 pt-28 md:pt-36 pb-20 md:pb-28 grid lg:grid-cols-[1.05fr_1fr] gap-x-12 gap-y-12 items-center">
        {/* LEFT — text column */}
        <div className="lg:pr-6">
          <p className="font-editorial italic uppercase tracking-[0.45em] text-[11px] md:text-xs text-[var(--color-amber-glow)] mb-7 inline-flex items-center gap-3">
            <span aria-hidden className="h-px w-8" style={{ background: 'var(--color-amber-glow)' }} />
            {eyebrow}
          </p>

          <h1
            className="font-display uppercase leading-[0.95] tracking-[0.02em] mb-2"
            style={{ fontSize: 'clamp(2.6rem, 6.8vw, 5.6rem)' }}
          >
            <span
              className="block bg-gradient-to-br from-ivory via-ivory to-[var(--color-amber-glow)] bg-clip-text text-transparent"
            >
              {titleA}
            </span>
            {titleB && (
              <span
                className="block text-[var(--color-brass-soft)]"
                style={{ fontSize: '0.92em' }}
              >
                <span
                  aria-hidden
                  className="font-editorial italic normal-case text-[var(--color-amber-glow)]/90"
                  style={{ fontSize: '0.62em', letterSpacing: '0.04em', marginRight: '0.18em' }}
                >
                  &amp;
                </span>
                {titleB}
              </span>
            )}
          </h1>

          {/* Dates / brass rule subtitle */}
          <div className="mt-4 md:mt-5 mb-7 flex items-baseline gap-3">
            <span className="h-px w-10 md:w-14 bg-gradient-to-r from-transparent via-brass/40 to-brass/70" />
            <p className="font-display title-medieval text-[11px] md:text-[12px] uppercase tracking-[0.3em] sm:tracking-[0.4em] text-[var(--color-brass-soft)] sm:whitespace-nowrap">
              {lang === 'FR' ? '25–27 septembre 2026' : '25–27 September 2026'}
            </p>
          </div>

          <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed max-w-xl mb-10">
            {intro}
          </p>

          {ctas.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {ctas.map((cta, i) => (
                <CtaElement key={i} cta={cta} />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT — orb */}
        <div className="relative w-full max-w-[300px] sm:max-w-[380px] md:max-w-[480px] lg:max-w-[520px] aspect-square justify-self-center lg:justify-self-end">
          {/* Outer warm glow ring */}
          <div
            aria-hidden
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, rgba(184, 106, 42, 0.32), rgba(176, 141, 58, 0.18) 40%, transparent 65%)',
              filter: 'blur(55px)',
            }}
          />

          <div
            className="orb-shell relative aspect-square w-full rounded-full overflow-hidden group cursor-pointer"
            onMouseEnter={triggerSweep}
            onFocus={triggerSweep}
            tabIndex={0}
          >
            {/* Image / video bed */}
            {orbVideo ? (
              <video
                src={orbVideo}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover fmm-orb-img-active"
                style={{ objectPosition: orbImagePosition }}
              />
            ) : (
              <div
                className="absolute inset-0 fmm-orb-img-active"
                style={{
                  backgroundImage: `url(${orbImage})`,
                  backgroundPosition: orbImagePosition,
                  backgroundSize: 'cover',
                }}
              />
            )}

            {/* Glistening sweep — runs once on mount */}
            <div
              key={`sweep-${sweepKey}`}
              aria-hidden
              className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
            >
              <div
                className="fmm-orb-sweep absolute inset-0"
                style={{
                  background:
                    'linear-gradient(110deg, transparent 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 65%, transparent 100%)',
                }}
              />
              <div
                className="fmm-orb-sweep-2 absolute inset-0"
                style={{
                  background:
                    'linear-gradient(110deg, transparent 0%, rgba(232, 177, 74, 0.45) 50%, transparent 100%)',
                  mixBlendMode: 'screen',
                }}
              />
            </div>

            {/* Inner vignette — softens image into the rim */}
            <div
              aria-hidden
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle at 50% 50%, transparent 55%, rgba(10, 2, 7, 0.7) 100%)',
              }}
            />

            {/* Glass shine — broad top radial */}
            <div
              aria-hidden
              className="absolute inset-0 rounded-full pointer-events-none fmm-orb-shine"
              style={{
                background:
                  'radial-gradient(ellipse 90% 70% at 50% 0%, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.06) 40%, rgba(255, 255, 255, 0) 100%)',
                mixBlendMode: 'screen',
              }}
            />

            {/* Brass + flame ornate rim — the orb's signature */}
            <div
              aria-hidden
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                border: '1px solid rgba(232, 177, 74, 0.55)',
                boxShadow:
                  'inset 0 0 0 5px rgba(10, 2, 7, 0.6),' +
                  'inset 0 0 0 6px rgba(176, 141, 58, 0.7),' +
                  'inset 0 0 70px rgba(184, 106, 42, 0.22),' +
                  '0 0 80px rgba(176, 141, 58, 0.22),' +
                  '0 0 200px rgba(107, 31, 31, 0.18),' +
                  '0 30px 80px rgba(0, 0, 0, 0.6)',
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

// ─── CtaElement ──────────────────────────────────────────────────────
const CtaElement: React.FC<{ cta: PageHeaderCta }> = ({ cta }) => {
  const className =
    cta.variant === 'primary'
      ? 'group inline-flex items-center gap-3 px-7 py-3.5 font-display title-medieval text-[11px] uppercase tracking-[0.35em] transition-all duration-300 bg-[var(--color-amber-glow)] text-[var(--color-velvet-deep)] hover:bg-[var(--color-mustard)] hover:scale-[1.02]'
      : 'group inline-flex items-center gap-2 font-sans uppercase tracking-[0.3em] text-[11px] text-ivory hover:text-[var(--color-amber-glow)] transition';
  const primaryStyle: React.CSSProperties =
    cta.variant === 'primary'
      ? {
          boxShadow:
            '0 6px 24px rgba(216, 155, 58, 0.32), inset 0 0 0 1px rgba(232, 177, 74, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
        }
      : {};
  const content = (
    <>
      {cta.label}
      {cta.variant === 'primary' ? (
        <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
      ) : (
        <span
          aria-hidden
          className="inline-block w-5 h-px bg-ivory/40 group-hover:bg-[var(--color-amber-glow)] group-hover:w-10 transition-all"
        />
      )}
    </>
  );

  if (cta.to) {
    return (
      <Link to={cta.to} onClick={cta.onClick} className={className} style={primaryStyle}>
        {content}
      </Link>
    );
  }
  return (
    <a
      href={cta.href}
      onClick={cta.onClick}
      target={cta.href?.startsWith('http') ? '_blank' : undefined}
      rel={cta.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      className={className}
      style={primaryStyle}
    >
      {content}
    </a>
  );
};

export default PageHeader;
