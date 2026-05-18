import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Users } from 'lucide-react';
import { useUI } from '../../contexts/AppContext';
import {
  subscribeAcceptedVendors, CURRENT_YEAR, type VendorApp,
} from '../../firebase/applications';

// Public, live-subscribed list of vendors already accepted for the
// current edition. Styled as a wooden tavern noticeboard with parchment
// notes pinned by iron nails — fits the festival's "Caravanes" theme.
const ApprovedVendorsList: React.FC = () => {
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  const [rows, setRows] = useState<VendorApp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeAcceptedVendors(CURRENT_YEAR, (next) => {
      setRows(next);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Pre-compute a stable random rotation per notice so they don't
  // re-shuffle on re-render but still feel hand-pinned.
  const tilts = useMemo(
    () => rows.map((v) => seedTilt(`${v.uid}_${v.year}`)),
    [rows],
  );

  return (
    <section className="relative bg-[#1A0F08] text-ivory py-16 md:py-24 overflow-hidden">
      {/* Wall background */}
      <div aria-hidden className="absolute inset-0" style={wallBg} />

      <div className="relative max-w-screen-xl mx-auto px-4 md:px-8">
        {/* Eyebrow / header */}
        <div className="text-center mb-10">
          <p className="font-editorial italic text-amber-200 uppercase tracking-[0.4em] text-xs md:text-sm mb-3">
            <Users size={12} className="inline mr-1.5 -mt-0.5" />{t.eyebrow}
          </p>
          <h2 className="font-display title-medieval text-4xl md:text-5xl text-amber-100 mb-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">{t.title}</h2>
          <p className="font-editorial italic text-base md:text-lg text-amber-200/70 max-w-xl mx-auto">{t.lead}</p>
        </div>

        {/* The board */}
        <NoticeBoard>
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-16">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-amber-300 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <Parchment tilt={-1.2} className="col-span-full max-w-md mx-auto">
              <p className="font-display title-medieval text-base md:text-lg text-[#3a2618] text-center mb-1">
                {t.emptyTitle}
              </p>
              <p className="font-editorial italic text-sm text-[#5b4023] text-center">{t.empty}</p>
            </Parchment>
          ) : (
            rows.map((v, i) => (
              <Notice key={`${v.uid}_${v.year}`} v={v} tilt={tilts[i]} t={t} index={i} />
            ))
          )}
        </NoticeBoard>

        <p className="font-editorial italic text-sm text-amber-200/60 text-center mt-10 max-w-xl mx-auto">
          {t.refreshNote}
        </p>
      </div>
    </section>
  );
};

// ─── NoticeBoard — wooden frame with iron-nailed corners ─────────
const NoticeBoard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative max-w-6xl mx-auto">
    {/* Outer wooden frame */}
    <div className="relative rounded-[6px] p-4 md:p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)]"
         style={frameBg}>
      {/* Inner planks panel */}
      <div className="relative rounded-[3px] p-5 md:p-9 overflow-hidden"
           style={planksBg}>
        {/* Iron studs at corners of the inner board */}
        {(['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'] as const).map((pos) => (
          <span key={pos} className={`absolute ${pos} w-2.5 h-2.5 rounded-full pointer-events-none`}
                style={{
                  background: 'radial-gradient(circle at 35% 30%, #6b6258 0%, #2a241e 60%, #15110d 100%)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.15)',
                }}
                aria-hidden />
        ))}
        {/* Notice grid */}
        <div className="grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 relative">
          {children}
        </div>
      </div>
    </div>
  </div>
);

// ─── Parchment — single pinned note ──────────────────────────────
const Parchment: React.FC<{
  tilt?: number; className?: string; children: React.ReactNode;
}> = ({ tilt = 0, className = '', children }) => (
  <motion.div
    initial={{ opacity: 0, y: -6, rotate: tilt - 4 }}
    animate={{ opacity: 1, y: 0, rotate: tilt }}
    whileHover={{ y: -4, rotate: tilt * 0.5, scale: 1.02 }}
    transition={{ type: 'spring', stiffness: 220, damping: 22 }}
    className={`relative px-5 py-5 md:px-6 md:py-6 ${className}`}
    style={parchmentBg}
  >
    {/* Wax pin at top center */}
    <span aria-hidden className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full"
          style={{
            background: 'radial-gradient(circle at 35% 30%, #c93a3a 0%, #7e1c1c 60%, #3e0808 100%)',
            boxShadow: '0 3px 6px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.25)',
          }} />
    {/* Torn-edge effect via subtle pseudo-borders */}
    <span aria-hidden className="absolute inset-0 pointer-events-none rounded-[2px]"
          style={{ boxShadow: 'inset 0 0 22px rgba(80, 50, 20, 0.18)' }} />
    {children}
  </motion.div>
);

// ─── A single vendor notice ──────────────────────────────────────
const Notice: React.FC<{ v: VendorApp; tilt: number; t: typeof FR; index: number }> =
({ v, tilt, t, index }) => (
  <Parchment tilt={tilt}>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: Math.min(0.15 + index * 0.05, 0.7) }}
    >
      <p className="font-display title-medieval text-sm text-[#7a4a1a] uppercase tracking-[0.25em] text-center mb-2">
        {t.acceptedTag}
      </p>
      <h3 className="font-display title-medieval text-lg md:text-xl text-[#2a1505] text-center mb-1.5 leading-snug">
        {v.companyName || v.kioskName}
      </h3>
      {v.regionOfOrigin && (
        <p className="font-editorial italic text-sm text-[#5b3b1a] text-center mb-3">
          — {v.regionOfOrigin} —
        </p>
      )}
      {v.description && (
        <p className="font-editorial text-sm text-[#3a2618] leading-snug line-clamp-3 text-center">
          {v.description}
        </p>
      )}
      {(v.socials || v.websiteUrl) && (
        <div className="text-center mt-3">
          <a
            href={ensureUrl(v.socials || v.websiteUrl || '')}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-sans uppercase tracking-wider text-[#7a4a1a] hover:text-[#3a2618] transition"
          >
            {t.visit} <ExternalLink size={11} />
          </a>
        </div>
      )}
    </motion.div>
  </Parchment>
);

// ─── Helpers ──────────────────────────────────────────────────────
function ensureUrl(raw: string): string {
  const v = raw.trim();
  if (!v) return '#';
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith('@')) return `https://instagram.com/${v.slice(1)}`;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(v)) return `https://${v}`;
  return v;
}

// Stable per-id deterministic tilt in [-3.5, +3.5] degrees.
function seedTilt(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const t = ((h % 71) / 71) * 7 - 3.5;
  return Math.round(t * 100) / 100;
}

// ─── Inline SVG textures ─────────────────────────────────────────
const wallBg: React.CSSProperties = {
  background:
    'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(216,155,58,0.10), transparent 60%),' +
    'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(0,0,0,0.6), transparent 70%),' +
    'linear-gradient(180deg, #0E0805, #1A0F08 60%, #0A0503)',
};

const frameBg: React.CSSProperties = {
  background:
    'linear-gradient(180deg, #4a2e15 0%, #2e1a0a 100%)',
  boxShadow:
    'inset 0 1px 0 rgba(255,210,150,0.10), inset 0 -1px 0 rgba(0,0,0,0.6)',
};

const planksBg: React.CSSProperties = {
  background:
    // Vertical plank seams
    "repeating-linear-gradient(90deg, transparent 0px, transparent 118px, rgba(0,0,0,0.55) 118px, rgba(0,0,0,0.55) 120px)," +
    // Subtle wood grain noise via SVG turbulence
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.015 0.85' numOctaves='2' seed='3'/><feColorMatrix values='0 0 0 0 0.32  0 0 0 0 0.20  0 0 0 0 0.10  0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")," +
    'linear-gradient(180deg, #6b3f1c 0%, #4a2912 100%)',
  boxShadow:
    'inset 0 0 60px rgba(0, 0, 0, 0.55), inset 0 0 4px rgba(0, 0, 0, 0.85)',
};

const parchmentBg: React.CSSProperties = {
  background:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='5'/><feColorMatrix values='0 0 0 0 0.55  0 0 0 0 0.40  0 0 0 0 0.20  0 0 0 0.18 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")," +
    'radial-gradient(ellipse at 30% 0%, #f4e7c4 0%, #eadcb1 60%, #d9c898 100%)',
  border: '1px solid rgba(120, 80, 30, 0.35)',
  boxShadow:
    '0 14px 28px -10px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,250,225,0.5)',
  borderRadius: '2px',
};

// ─── Translations ────────────────────────────────────────────────
const FR = {
  eyebrow: 'Caravane 2026',
  title:   'Avis du tableau des marchands',
  lead:    'Les marchands déjà confirmés pour cette édition sont épinglés ici, au fil des acceptations.',
  acceptedTag: 'Confirmé',
  emptyTitle:  'Tableau vide',
  empty:       'Aucun marchand n’a encore été confirmé. Les premiers avis seront épinglés sous peu.',
  visit:       'Visiter',
  refreshNote: 'Revenez régulièrement — si votre candidature est acceptée, vous la verrez ici et dans votre espace client.',
};

const EN: typeof FR = {
  eyebrow: 'Caravan 2026',
  title:   'Merchants’ noticeboard',
  lead:    'Vendors already confirmed for this edition are pinned here as acceptances come in.',
  acceptedTag: 'Confirmed',
  emptyTitle:  'Empty board',
  empty:       'No merchants have been confirmed yet. The first notices will be pinned shortly.',
  visit:       'Visit',
  refreshNote: 'Check back regularly — if your application is accepted, you will see it both here and in your client space.',
};

export default ApprovedVendorsList;
