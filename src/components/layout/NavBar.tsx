import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ShoppingBag, User, ArrowUpRight } from 'lucide-react';
import { useUI } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { PILLARS, SITE, UI } from '../../content';
import { addLocale, stripLocale } from '../../lib/locale';
import AudioPlayer from '../AudioPlayer';
import { HexMark } from '../marche/atmospherics';

// ─── Drawer palette ──────────────────────────────────────────────────
// Charcoal-grey dominant (80%), copper/gold accent (20%). Drawer is
// fully opaque so menu text is always readable against the page beneath.
const CHARCOAL_BG       = '#16161a';
const CHARCOAL_BG_SOFT  = '#1f1f24';
const CHARCOAL_DIVIDER  = 'rgba(244, 239, 227, 0.08)';
// Copper/gold accent palette — references the project's design tokens
// where possible so the drawer stays in sync with the rest of the site.
const ACCENT_DEEP   = 'var(--color-copper)';        // copper ~ #b86a2a
const ACCENT_MID    = 'var(--color-mustard)';       // mustard ~ #d89b3a
const ACCENT_BRIGHT = 'var(--color-amber-glow)';    // amber glow ~ #e8b14a
const ACCENT_GLOW   = 'rgba(232, 177, 74, 0.55)';   // amber-glow with alpha
const ACCENT_DIM    = 'rgba(184, 106, 42, 0.45)';   // copper-faded

// Four lit copper L-ticks pinned to the drawer's corners — Witcher
// inventory chrome on the charcoal stage.
const DrawerCornerTicks: React.FC = () => {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: ACCENT_BRIGHT,
    filter: `drop-shadow(0 0 6px ${ACCENT_GLOW})`,
    pointerEvents: 'none',
  };
  return (
    <>
      <span aria-hidden style={{ ...base, top: 12,    left:  12,    borderTop:    '2px solid', borderLeft:  '2px solid' }} />
      <span aria-hidden style={{ ...base, top: 12,    right: 12,    borderTop:    '2px solid', borderRight: '2px solid' }} />
      <span aria-hidden style={{ ...base, bottom: 12, left:  12,    borderBottom: '2px solid', borderLeft:  '2px solid' }} />
      <span aria-hidden style={{ ...base, bottom: 12, right: 12,    borderBottom: '2px solid', borderRight: '2px solid' }} />
    </>
  );
};

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII'] as const;

// ─── Framer variants for the drawer open sequence ────────────────────
// Power animation: backdrop fades in, header strip slides down, eyebrow
// and list items cascade in from the left with stagger, CTA pops at the
// end with a back-out overshoot. Reversed on close.
const backdropVariants = {
  hidden: { opacity: 0 },
  shown:  { opacity: 1, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] as const } },
  exit:   { opacity: 0, transition: { duration: 0.22, ease: [0.7, 0, 0.84, 0] as const } },
};
const stripVariants = {
  hidden: { opacity: 0, y: -20 },
  shown:  { opacity: 1, y: 0, transition: { delay: 0.08, duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};
const eyebrowVariants = {
  hidden: { opacity: 0, x: -24 },
  shown:  { opacity: 1, x: 0, transition: { delay: 0.18, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};
const listVariants = {
  hidden: {},
  shown:  { transition: { delayChildren: 0.24, staggerChildren: 0.045 } },
};
const itemVariants = {
  hidden: { opacity: 0, x: -32 },
  shown:  { opacity: 1, x: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const } },
};
const ctaVariants = {
  hidden: { opacity: 0, scale: 0.88, y: 8 },
  shown:  { opacity: 1, scale: 1, y: 0, transition: { delay: 0.62, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] as const } },
};

// ─── NavBar — Caravan edition ────────────────────────────────────────
// Slim 56-60px chrome lifted in spirit from Le Salon des Inconnus
// SiteHeader: transparent over the page at top, dense velvet-glass on
// scroll, always-visible primary CTA on the right, segmented FR/EN
// pill, polished hover states with diamond markers.
//
// The full-screen drawer keeps the pillar list it already had, but
// the surface is now the caravan stage with drifting fog instead of a
// sterile sheet.
const NavBar: React.FC = () => {
  const { lang, setLang, mobileMenuOpen, setMobileMenuOpen } = useUI();
  const { user, openSignIn } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 14);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname, setMobileMenuOpen]);

  // Lock body scroll while the drawer is open — same trick the salon
  // SiteHeader uses to prevent background scroll bleed-through.
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const setLangAndNavigate = (next: 'FR' | 'EN') => {
    if (next === lang) return;
    setLang(next);
    const frPath = stripLocale(location.pathname);
    navigate(addLocale(frPath, next), { replace: true });
  };

  const ticketUrl = import.meta.env.VITE_ZEFFY_TICKET_URL || '#';

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
          scrolled ? 'fmm-nav-scrolled' : 'fmm-nav-top'
        }`}
        style={{ height: 60 }}
      >
        <nav className="h-full max-w-screen-2xl mx-auto px-4 md:px-7 flex items-center justify-between gap-4">
          {/* ── Brand mark ─────────────────────────────────── */}
          <Link
            to={addLocale('/', lang)}
            className="flex items-center gap-2.5 group shrink-0"
            aria-label={SITE.shortName}
          >
            <img
              decoding="async"
              src={SITE.logoWhite}
              alt={SITE.shortName}
              className="fmm-no-grade h-7 md:h-8 w-auto transition-opacity opacity-90 group-hover:opacity-100"
            />
            <span className="hidden sm:inline-flex items-baseline gap-1.5 font-display text-[12px] md:text-[13px] tracking-[0.22em] uppercase">
              <span style={{ color: 'rgba(244, 239, 227, 0.85)' }}>FMM</span>
              <span style={{ color: 'var(--color-amber-glow)' }}>{SITE.year}</span>
            </span>
          </Link>

          {/* ── Audio player — center ─────────────────────── */}
          <div className="flex-1 flex justify-center min-w-0">
            <AudioPlayer />
          </div>

          {/* ── Right cluster ─────────────────────────────── */}
          <div className="flex items-center gap-2 md:gap-2.5 shrink-0">
            {/* Primary CTA — Tickets, always visible on desktop */}
            <a
              href={ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-2 px-4 py-1.5 font-sans uppercase tracking-[0.28em] text-[10px] font-semibold transition-all hover:scale-[1.03]"
              style={{
                color: 'var(--color-velvet-deep)',
                background:
                  'linear-gradient(180deg, var(--color-amber-glow) 0%, var(--color-mustard) 55%, var(--color-copper) 100%)',
                clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
                boxShadow:
                  'inset 0 1px 0 rgba(255, 240, 200, 0.4), 0 6px 18px -6px rgba(216, 155, 58, 0.55)',
              }}
            >
              {lang === 'FR' ? 'Billets' : 'Tickets'}
            </a>

            {/* Segmented FR/EN toggle — lifted from SiteHeader */}
            <div
              className="hidden sm:inline-flex items-center p-0.5 backdrop-blur-md transition-colors"
              style={{
                background: 'rgba(10, 2, 7, 0.5)',
                border: '1px solid rgba(232, 177, 74, 0.25)',
              }}
            >
              {(['EN', 'FR'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLangAndNavigate(code)}
                  className="px-2.5 py-0.5 font-sans font-semibold text-[9px] tracking-[0.25em] transition-all"
                  style={{
                    color:
                      lang === code ? 'var(--color-velvet-deep)' : 'rgba(244, 239, 227, 0.55)',
                    background:
                      lang === code ? 'var(--color-amber-glow)' : 'transparent',
                  }}
                  aria-pressed={lang === code}
                >
                  {code}
                </button>
              ))}
            </div>

            {/* Account / sign-in */}
            {user ? (
              <Link
                to={addLocale('/compte', lang)}
                className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full transition-all"
                style={{
                  background: 'rgba(10, 2, 7, 0.5)',
                  border: '1px solid rgba(232, 177, 74, 0.25)',
                  color: 'var(--color-amber-glow)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-amber-glow)';
                  e.currentTarget.style.boxShadow = '0 0 14px -4px rgba(232, 177, 74, 0.55)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(232, 177, 74, 0.25)';
                  e.currentTarget.style.boxShadow = '';
                }}
                aria-label={lang === 'FR' ? 'Mon compte' : 'My account'}
                title={lang === 'FR' ? 'Mon compte' : 'My account'}
              >
                <User size={14} />
              </Link>
            ) : (
              <button
                type="button"
                onClick={openSignIn}
                className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full transition-all"
                style={{
                  background: 'rgba(10, 2, 7, 0.5)',
                  border: '1px solid rgba(244, 239, 227, 0.18)',
                  color: 'rgba(244, 239, 227, 0.75)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(232, 177, 74, 0.55)';
                  e.currentTarget.style.color = 'var(--color-amber-glow)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(244, 239, 227, 0.18)';
                  e.currentTarget.style.color = 'rgba(244, 239, 227, 0.75)';
                }}
                aria-label={UI[lang].signIn}
                title={UI[lang].signIn}
              >
                <User size={14} />
              </button>
            )}

            {/* Cart icon */}
            <button
              type="button"
              className="hidden sm:inline-flex items-center justify-center w-9 h-9 transition-colors"
              style={{ color: 'rgba(244, 239, 227, 0.55)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-amber-glow)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(244, 239, 227, 0.55)'; }}
              aria-label={UI[lang].cart}
              title={UI[lang].cart}
            >
              <ShoppingBag size={15} />
            </button>

            {/* Menu — diamond hover marker */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="relative flex items-center justify-center w-10 h-10 transition-colors group"
              style={{ color: 'var(--color-bone)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-amber-glow)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-bone)'; }}
              aria-label={UI[lang].menu}
            >
              <Menu size={20} />
              <span
                aria-hidden
                className="absolute inset-1 transition-opacity opacity-0 group-hover:opacity-100"
                style={{
                  border: '1px solid rgba(232, 177, 74, 0.55)',
                  clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
                }}
              />
            </button>
          </div>
        </nav>

        {/* Bottom hairline — visible only when scrolled */}
        <div
          aria-hidden
          className={`absolute inset-x-0 bottom-0 h-px transition-opacity ${scrolled ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: 'linear-gradient(90deg, transparent, var(--color-copper), transparent)' }}
        />
      </header>

      {/* ── Full-screen drawer ─────────────────────────────────────
          Witcher-inventory chrome on a fully-opaque charcoal stage —
          no transparency, so menu text always reads. Charcoal carries
          ~80% of the surface; copper/gold lives in the eyebrow, the
          item pip, the active hairline + the CTA fill (~20%). */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            key="drawer"
            variants={backdropVariants}
            initial="hidden" animate="shown" exit="exit"
            className="fixed inset-0 z-50 text-[var(--color-bone)] overflow-hidden"
            style={{
              background:
                // Deep charcoal vertical wash + faint copper blooms at
                // opposite corners so the panel doesn't read as a flat
                // grey slab.
                `radial-gradient(1100px 700px at 92% -10%, rgba(232, 177, 74, 0.10), transparent 60%),` +
                `radial-gradient(900px 700px at 8% 110%, rgba(184, 106, 42, 0.07), transparent 65%),` +
                `linear-gradient(180deg, ${CHARCOAL_BG_SOFT} 0%, ${CHARCOAL_BG} 55%, #0e0e12 100%)`,
            }}
          >
            {/* Corner ornaments — drawer-wide L-ticks in copper */}
            <DrawerCornerTicks />

            {/* Top strip — copper hairline beneath */}
            <motion.div
              variants={stripVariants}
              className="relative h-[60px] px-4 md:px-7 flex items-center justify-between"
              style={{
                background: `linear-gradient(180deg, rgba(255,255,255,0.02), transparent)`,
                borderBottom: `1px solid ${ACCENT_DEEP}`,
                boxShadow: `0 1px 0 rgba(232, 177, 74, 0.18)`,
              }}
            >
              <Link
                to={addLocale('/', lang)}
                className="flex items-center gap-2.5"
                onClick={() => setMobileMenuOpen(false)}
              >
                <img decoding="async" src={SITE.logoWhite} alt={SITE.shortName} className="fmm-no-grade h-7 w-auto" />
                <span className="font-display text-[13px] tracking-[0.22em] uppercase">
                  <span style={{ color: 'rgba(244, 239, 227, 0.85)' }}>FMM </span>
                  <span style={{ color: ACCENT_BRIGHT }}>{SITE.year}</span>
                </span>
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="relative p-1.5 transition-colors group"
                style={{ color: 'var(--color-bone)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = ACCENT_BRIGHT; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-bone)'; }}
                aria-label={UI[lang].close}
              >
                <X size={22} />
                {/* Diamond marker that lights up on hover */}
                <span
                  aria-hidden
                  className="absolute inset-0 transition-opacity opacity-0 group-hover:opacity-100"
                  style={{
                    border: `1px solid ${ACCENT_BRIGHT}`,
                    clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
                  }}
                />
              </button>
            </motion.div>

            <nav className="relative px-6 md:px-10 py-10 max-w-5xl mx-auto overflow-y-auto h-[calc(100vh-60px)]">
              {/* Eyebrow — slides in from the left, copper hex + label */}
              <motion.div variants={eyebrowVariants} className="mb-8">
                <p
                  className="font-display title-medieval italic uppercase tracking-[0.45em] text-[10px] inline-flex items-center gap-2.5"
                  style={{ color: ACCENT_BRIGHT, textShadow: `0 0 14px ${ACCENT_GLOW}` }}
                >
                  <span
                    aria-hidden
                    className="inline-block w-1.5 h-1.5 rotate-45"
                    style={{ background: ACCENT_BRIGHT, boxShadow: `0 0 8px ${ACCENT_GLOW}` }}
                  />
                  <HexMark className="opacity-80" />
                  {SITE.datesLabel[lang]}
                </p>
                {/* Copper-to-charcoal gradient hairline beneath the eyebrow */}
                <span
                  aria-hidden
                  className="block mt-3 h-px w-40"
                  style={{ background: `linear-gradient(90deg, ${ACCENT_BRIGHT}, transparent)` }}
                />
              </motion.div>

              {/* Pillar list — staggered cascade in from the left, laid
                  out in 2 columns on md+. Each row: Roman-numeral index
                  + diamond pip + label + arrow. Hover paints the label
                  copper, slides the pip, and draws a copper hairline
                  along the bottom. */}
              <motion.ul
                variants={listVariants}
                initial="hidden"
                animate="shown"
                className="mb-12 grid grid-cols-1 md:grid-cols-2 gap-x-8 lg:gap-x-12"
              >
                {PILLARS.map((p, idx) => {
                  const isActive = location.pathname === p.slug[lang]
                                || location.pathname === p.slug[lang] + '/';
                  return (
                    <motion.li key={p.key} variants={itemVariants}>
                      <Link
                        to={p.slug[lang]}
                        className="group relative flex items-center gap-3 md:gap-4 py-3 md:py-3.5 transition-all"
                        style={{ borderBottom: `1px solid ${CHARCOAL_DIVIDER}` }}
                      >
                        {/* Roman numeral index */}
                        <span
                          className="font-display title-medieval text-xs md:text-sm uppercase tracking-[0.4em] w-9 md:w-11 text-right shrink-0 transition-colors group-hover:!opacity-100"
                          style={{
                            color: isActive ? ACCENT_BRIGHT : 'rgba(244, 239, 227, 0.45)',
                            opacity: isActive ? 1 : 0.7,
                          }}
                        >
                          {ROMAN[idx]}
                        </span>

                        {/* Diamond pip — slides 4px right on hover */}
                        <span
                          aria-hidden
                          className="w-1.5 h-1.5 rotate-45 shrink-0 transition-all duration-300 group-hover:translate-x-1 group-hover:scale-125"
                          style={{
                            background: isActive ? ACCENT_BRIGHT : ACCENT_DIM,
                            boxShadow: isActive ? `0 0 10px ${ACCENT_GLOW}` : 'none',
                          }}
                        />

                        {/* Label — paints copper on hover */}
                        <span
                          className="flex-1 font-display title-medieval text-xl md:text-2xl lg:text-[1.7rem] tracking-[0.04em] uppercase transition-colors duration-200 leading-tight"
                          style={{ color: isActive ? ACCENT_BRIGHT : 'var(--color-bone)' }}
                          onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = ACCENT_BRIGHT; }}
                          onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--color-bone)'; }}
                        >
                          {p.label[lang]}
                        </span>

                        {/* Chevron-style line — appears on hover */}
                        <span
                          aria-hidden
                          className="hidden md:inline-block w-0 h-px opacity-0 group-hover:w-6 lg:group-hover:w-8 group-hover:opacity-100 transition-all duration-300"
                          style={{ background: ACCENT_BRIGHT }}
                        />
                        <ArrowUpRight
                          size={18}
                          className="opacity-30 group-hover:opacity-100 transition"
                          style={{ color: isActive ? ACCENT_BRIGHT : 'rgba(244, 239, 227, 0.6)' }}
                        />

                        {/* Copper bottom hairline that draws left → right on hover */}
                        <span
                          aria-hidden
                          className="absolute left-0 bottom-0 h-px w-0 group-hover:w-full transition-all duration-500"
                          style={{
                            background: `linear-gradient(90deg, ${ACCENT_BRIGHT}, ${ACCENT_DEEP} 70%, transparent)`,
                            boxShadow: `0 0 8px ${ACCENT_GLOW}`,
                          }}
                        />
                      </Link>
                    </motion.li>
                  );
                })}
              </motion.ul>

              {/* CTA — copper/gold gradient fill (the 20% accent moment).
                  Pops in last with a back-ease overshoot. */}
              <motion.a
                variants={ctaVariants}
                initial="hidden"
                animate="shown"
                href={ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-flex items-center gap-3 px-8 py-3.5 font-sans uppercase tracking-[0.28em] text-[11px] font-semibold overflow-hidden"
                style={{
                  color: 'var(--color-velvet-deep)',
                  background: `linear-gradient(180deg, ${ACCENT_BRIGHT} 0%, ${ACCENT_MID} 55%, ${ACCENT_DEEP} 100%)`,
                  clipPath: 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)',
                  boxShadow:
                    `inset 0 1px 0 rgba(255, 240, 200, 0.45), 0 14px 32px -10px ${ACCENT_GLOW}`,
                  border: `1px solid ${ACCENT_DEEP}`,
                }}
              >
                {lang === 'FR' ? 'Acheter mes billets' : 'Get my tickets'}
                <span aria-hidden className="inline-block w-4 h-px bg-[var(--color-velvet-deep)] transition-all group-hover:w-8" />
              </motion.a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NavBar;
