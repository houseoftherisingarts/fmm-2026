import React from 'react';
import { motion } from 'framer-motion';

// ─── HaltScreen ──────────────────────────────────────────────────────
// Full-screen medieval HALT page used wherever someone hits an
// access-refused state in the admin. Renders the gatekeeper knight
// (halt.png) on a charcoal stage with an oxblood spotlight, "HALTE LÀ !"
// headline, the canonical quote, and a configurable description + CTA.
//
// Used in two places today:
//   1. GateScreen → when a non-super clicks a door they can't open
//      (description = which door they tried, what rank they hold).
//   2. AdminPage → when a signed-in user has no admin role at all
//      (description = no role attributed, CTA = sign out).
// Pass `onBackdropClick` to make clicks on the backdrop dismiss (the
// gate-overlay usage). Omit it for full-page usage (the AdminPage
// usage), where there's nothing to dismiss to.

interface Props {
  /** Email of the visitor, rendered in monospace under the description. */
  email: string;
  /** Descriptive copy explaining the specific scenario. */
  description: React.ReactNode;
  /** Primary CTA at the bottom of the page. */
  cta: { label: string; onClick: () => void };
  /** Optional secondary CTA rendered next to the primary (e.g. link to
   *  the bénévole application form when someone tries the Bénévoles
   *  or Super-Bénévoles door without a key). */
  secondaryCta?: { label: string; href: string };
  /** When provided, clicking the dark backdrop triggers this. */
  onBackdropClick?: () => void;
  /** Optional override for the title. Defaults to "Halte là !". */
  title?: string;
  /** Optional override for the canonical quote. */
  quote?: string;
}

const DEFAULT_TITLE = 'Halte là !';
const DEFAULT_QUOTE =
  '« Halte là ! Cette salle est strictement réservée aux chevaliers et à la cour. »';

const HaltScreen: React.FC<Props> = ({
  email,
  description,
  cta,
  secondaryCta,
  onBackdropClick,
  title = DEFAULT_TITLE,
  quote = DEFAULT_QUOTE,
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1, x: [0, -8, 8, -6, 6, -3, 3, 0] }}
    exit={{ opacity: 0 }}
    transition={{
      opacity: { duration: 0.28 },
      x:       { duration: 0.7, delay: 0.18, ease: 'easeOut' },
    }}
    className="fixed inset-0 z-50 flex flex-col items-center justify-start md:justify-center px-4 py-6 md:py-8 overflow-y-auto"
    style={{
      background:
        // Stacked top → bottom: oxblood spotlights, then a charcoal
        // wash dimmed enough that the Petite-Nation forest photo
        // (back-most layer) still reads through as a faint, moody
        // texture — not invisible, not competing with the knight.
        `radial-gradient(900px 700px at 50% 55%, rgba(140, 30, 30, 0.32), transparent 65%),` +
        `radial-gradient(700px 500px at 50% 25%, rgba(180, 40, 40, 0.18), transparent 70%),` +
        `linear-gradient(180deg, rgba(26, 20, 24, 0.72) 0%, rgba(18, 12, 14, 0.82) 60%, rgba(10, 5, 6, 0.92) 100%),` +
        `url('https://storage.googleapis.com/salondesinconnus/Auberge%20photos/nature%20coco%20upscale.jpg')`,
      backgroundSize: 'cover, cover, cover, cover',
      backgroundPosition: 'center, center, center, center',
      backgroundRepeat: 'no-repeat',
    }}
    onClick={onBackdropClick}
  >
    {/* Red corner L-ticks pinned to the viewport */}
    <DeniedCorners />

    {/* Stage — stops the click-to-close from bubbling so the user can
        read the page without it dismissing under them. */}
    <div
      onClick={(e) => e.stopPropagation()}
      className="relative w-full max-w-4xl flex flex-col items-center text-center"
    >
      {/* Headline drops down with overshoot */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative z-10"
      >
        <p
          className="font-display title-medieval italic uppercase tracking-[0.55em] text-[11px] mb-2"
          style={{ color: '#c83b3b', textShadow: '0 0 14px rgba(200, 60, 60, 0.6)' }}
        >
          ✕ Sceau brisé ✕
        </p>
        <h1
          className="font-display title-medieval uppercase tracking-[0.04em] leading-[0.95] text-4xl sm:text-5xl md:text-6xl lg:text-7xl"
          style={{
            color: 'var(--color-bone)',
            textShadow:
              '0 0 14px rgba(200, 60, 60, 0.55), 0 2px 0 rgba(0,0,0,0.55), 0 6px 22px rgba(0,0,0,0.7)',
          }}
        >
          {title}
        </h1>
      </motion.div>

      {/* Gatekeeper knight rises from below. The mask is a soft radial
          ellipse instead of a linear gradient so every edge of the
          bounding box fades out smoothly — no visible seam at the
          bottom or along the sides. Image sized smaller so the whole
          page comfortably fits the viewport. */}
      <motion.div
        initial={{ opacity: 0, y: 80, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.15, duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[260px] sm:max-w-xs md:max-w-sm my-2 md:my-3"
      >
        <span
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 55% 60% at 50% 55%, rgba(200, 60, 60, 0.30), transparent 70%),' +
              'radial-gradient(ellipse 40% 50% at 50% 60%, rgba(232, 177, 74, 0.10), transparent 75%)',
          }}
        />
        <img
          src="/characters/halt.png"
          alt="Le gardien des portes"
          className="fmm-no-grade relative w-full h-auto object-contain"
          style={{
            filter:
              'drop-shadow(0 16px 24px rgba(0, 0, 0, 0.75)) drop-shadow(0 0 28px rgba(200, 60, 60, 0.45))',
            // Aggressive radial mask — the fully-opaque core is small
            // (40%), the fade reaches well within the bounding box so
            // every corner of the rectangle is fully transparent.
            // Kills the "square cutoff" tell on PNGs with semi-opaque
            // antialiased edges.
            WebkitMaskImage:
              'radial-gradient(ellipse 58% 64% at 50% 45%, #000 38%, rgba(0,0,0,0.6) 65%, transparent 92%)',
            maskImage:
              'radial-gradient(ellipse 58% 64% at 50% 45%, #000 38%, rgba(0,0,0,0.6) 65%, transparent 92%)',
          }}
        />
      </motion.div>

      {/* Flavour copy — fades up beneath the knight */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative max-w-2xl px-2"
      >
        <p
          className="font-editorial italic text-lg md:text-2xl leading-snug mb-4"
          style={{ color: 'var(--color-bone)' }}
        >
          {quote}
        </p>
        <div
          className="font-editorial italic text-sm md:text-base mb-1 space-y-1"
          style={{ color: 'rgba(244, 239, 227, 0.7)' }}
        >
          {description}
        </div>
        {email && (
          <p className="font-mono text-[11px] mb-6 break-all" style={{ color: 'rgba(244, 239, 227, 0.4)' }}>
            {email}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={cta.onClick}
            className="inline-flex items-center gap-2 px-7 py-3 font-sans uppercase tracking-[0.32em] text-[11px] transition-all hover:scale-[1.03]"
            style={{
              color: 'var(--color-bone)',
              background: 'linear-gradient(180deg, #6b1d1d 0%, #4a1414 100%)',
              border: '1px solid rgba(200, 60, 60, 0.6)',
              boxShadow: 'inset 0 1px 0 rgba(255, 200, 200, 0.2), 0 12px 28px -10px rgba(200, 60, 60, 0.55)',
              clipPath: 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)',
            }}
          >
            {cta.label}
          </button>
          {secondaryCta && (
            <a
              href={secondaryCta.href}
              className="inline-flex items-center gap-2 px-7 py-3 font-sans uppercase tracking-[0.32em] text-[11px] transition-all hover:scale-[1.03]"
              style={{
                // Amber-gold ghost CTA — visually distinct from the
                // primary oxblood without competing with the headline.
                color: 'var(--color-amber-glow)',
                background: 'rgba(232, 177, 74, 0.06)',
                border: '1px solid rgba(232, 177, 74, 0.55)',
                boxShadow: 'inset 0 1px 0 rgba(255, 240, 200, 0.18), 0 12px 28px -10px rgba(216, 155, 58, 0.45)',
                clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 100%, 12px 100%)',
              }}
            >
              {secondaryCta.label}
            </a>
          )}
        </div>
      </motion.div>
    </div>
  </motion.div>
);

const DeniedCorners: React.FC = () => {
  const color = '#c83b3b';
  const base: React.CSSProperties = {
    position: 'absolute', width: 22, height: 22, borderColor: color,
    filter: 'drop-shadow(0 0 8px rgba(200, 60, 60, 0.55))',
    pointerEvents: 'none',
  };
  return (
    <>
      <span aria-hidden style={{ ...base, top: 18,    left: 18,    borderTop:    '2px solid', borderLeft:  '2px solid' }} />
      <span aria-hidden style={{ ...base, top: 18,    right: 18,   borderTop:    '2px solid', borderRight: '2px solid' }} />
      <span aria-hidden style={{ ...base, bottom: 18, left: 18,    borderBottom: '2px solid', borderLeft:  '2px solid' }} />
      <span aria-hidden style={{ ...base, bottom: 18, right: 18,   borderBottom: '2px solid', borderRight: '2px solid' }} />
    </>
  );
};

export default HaltScreen;
