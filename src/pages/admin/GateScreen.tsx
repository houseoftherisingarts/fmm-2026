import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown, Scroll, Shield, Hammer, Flame, Lock, LogOut, LogIn,
} from 'lucide-react';
import {
  ALL_ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, type AdminRole,
} from '../../lib/adminPermissions';
import HaltScreen from './HaltScreen';

// ─── GateScreen ──────────────────────────────────────────────────────
// Post-login "choose your gate" UI. Five doors, one per admin role.
// Super-admin can open any door (preview mode); every other role can
// only open the door that matches their own clearance. Clicking a
// forbidden door triggers a medieval "Accès refusé" overlay that
// shakes, glows red, and names which clearance the visitor actually
// holds.

interface Props {
  /** The actual role the signed-in user holds, or null. */
  actualRole: AdminRole | null;
  /** Is this user a platform super-admin? Then any door opens. */
  isSuperAdmin: boolean;
  /** Called when the user successfully opens a door. */
  onEnter: (role: AdminRole) => void;
  /** Called when the user clicks "Se déconnecter". */
  onSignOut: () => void;
  /** Called when an anonymous visitor knocks on a door (no auth yet). */
  onSignIn?: () => void;
  /** True when the visitor is signed in; false for anonymous visitors. */
  signedIn: boolean;
  /** Email of the signed-in user — shown on the denied overlay. */
  userEmail: string;
}

// Thematic icon + motif per role. Icons are lucide medieval-flavoured
// glyphs (Crown, Scroll, Shield, Hammer, Flame). Motifs are short
// French poetics for the chip under the icon — no colour names; the
// Johnnie Walker tone shows up only on the chrome (border, corners,
// pip, footer accent, hover glint).
const DOOR_META: Record<AdminRole, {
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  motif: { FR: string; EN: string };
}> = {
  super:          { icon: Crown,   motif: { FR: 'La Couronne',    EN: 'The Crown'      } },
  ca:             { icon: Crown,   motif: { FR: 'La Couronne',    EN: 'The Crown'      } },
  organisateur:   { icon: Scroll,  motif: { FR: 'Le Sceau Royal', EN: 'The Royal Seal' } },
  super_benevole: { icon: Shield,  motif: { FR: 'Le Bouclier',    EN: 'The Shield'     } },
  benevole:       { icon: Hammer,  motif: { FR: 'La Main Tendue', EN: 'The Open Hand'  } },
  kitchen:        { icon: Flame,   motif: { FR: 'Le Fourneau',    EN: 'The Furnace'    } },
};

// ─── Premium metallic palette per role ───────────────────────────────
// Each tone now carries five stops, the bare minimum for a true
// metallic look: dark shadow → mid → accent → highlight → specular.
// They're composed into multi-stop linear gradients (icon medallion,
// edge ribbon, footer hairline) so light/shadow play across the
// surface instead of sitting as a flat tint.
//
// Reference: the project's `.divider-brass` (a transparent → gold →
// transparent hairline) — that fade-in/fade-out aesthetic is the
// signature of the metallic ribbon used here on top + above footer.
//
//   shadow    — deepest stop, for the dark band in the polished disc
//   accent    — the door's identity colour (mid tone, also used for
//               the simple 1px border around the card)
//   highlight — brighter shade, used for the lit edge of the metal
//   specular  — the bright "catch-light" stop at the very top of the
//               metallic gradient (almost white-hot)
//   glow      — rgba halo bloom for the outer shadow
//   bgTop / bgBottom — tinted-charcoal gradient for the card body
const DOOR_TONE: Record<AdminRole, {
  shadow:    string;
  accent:    string;
  highlight: string;
  specular:  string;
  glow:      string;
  bgTop:     string;
  bgBottom:  string;
}> = {
  // Champagne / antique metallic gold — warm bronze, no lemon yellow.
  super: {
    shadow:    '#3c2a0d',
    accent:    '#a07832',
    highlight: '#d4a857',
    specular:  '#fde2a3',
    glow:      'rgba(168, 128, 48, 0.42)',
    bgTop:     '#18130e',
    bgBottom:  '#0a0604',
  },
  // Royal blue — Rolls-Royce-deep sapphire (no cobalt brightness).
  ca: {
    shadow:    '#070e22',
    accent:    '#1f365a',
    highlight: '#4d7ac4',
    specular:  '#c8d8f5',
    glow:      'rgba(31, 54, 90, 0.50)',
    bgTop:     '#060c1e',
    bgBottom:  '#02040e',
  },
  // Same metallic gold as 'super' — Organisateurs share the gold ribbon.
  organisateur: {
    shadow:    '#3c2a0d',
    accent:    '#a07832',
    highlight: '#d4a857',
    specular:  '#fde2a3',
    glow:      'rgba(168, 128, 48, 0.42)',
    bgTop:     '#18130e',
    bgBottom:  '#0a0604',
  },
  // Satin forest green — deep British-racing register, muted sheen.
  super_benevole: {
    shadow:    '#082014',
    accent:    '#1a4429',
    highlight: '#3d7a4f',
    specular:  '#b8e0c6',
    glow:      'rgba(26, 68, 41, 0.50)',
    bgTop:     '#07120e',
    bgBottom:  '#030806',
  },
  // Obsidian with platinum silver highlight — gunmetal sheen on the
  // metallic disc.
  benevole: {
    shadow:    '#050507',
    accent:    '#3a3a40',
    highlight: '#a3a3ad',
    specular:  '#f0f0f5',
    glow:      'rgba(200, 200, 215, 0.30)',
    bgTop:     '#131316',
    bgBottom:  '#050506',
  },
  // Ribbon red — warm orange undertone, like fire-engine / signal red.
  kitchen: {
    shadow:    '#4a1208',
    accent:    '#c8351e',
    highlight: '#e3593d',
    specular:  '#fbc7b5',
    glow:      'rgba(200, 53, 30, 0.46)',
    bgTop:     '#190b07',
    bgBottom:  '#0a0402',
  },
};

// Reusable metallic-disc gradient — five stops simulate light → shadow
// → light across a polished medallion. Diagonal angle reads as if a
// lamp is above-left.
const metallicDiscBg = (t: typeof DOOR_TONE[AdminRole]): string =>
  `linear-gradient(135deg, ${t.specular} 0%, ${t.highlight} 22%, ${t.accent} 45%, ${t.shadow} 58%, ${t.accent} 75%, ${t.highlight} 100%)`;

// Top / bottom ribbon — mirrors the `.divider-brass` fade, but uses
// the role's metallic gradient instead of solid brass.
const metallicRibbonBg = (t: typeof DOOR_TONE[AdminRole]): string =>
  `linear-gradient(90deg, transparent 0%, ${t.shadow}80 8%, ${t.accent} 28%, ${t.specular} 50%, ${t.accent} 72%, ${t.shadow}80 92%, transparent 100%)`;

// Order the doors are presented in. Super isn't displayed unless the
// viewer IS a super-admin (their own door is always shown so they can
// enter their native view too).
const DOOR_ORDER: AdminRole[] = ['ca', 'organisateur', 'super_benevole', 'benevole', 'kitchen'];

const containerVariants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};
const doorVariants = {
  hidden: { opacity: 0, y: 40, rotateX: -20 },
  shown:  { opacity: 1, y: 0, rotateX: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const } },
};

const GateScreen: React.FC<Props> = ({ actualRole, isSuperAdmin, onEnter, onSignOut, onSignIn, signedIn, userEmail }) => {
  const [deniedRole, setDeniedRole] = useState<AdminRole | null>(null);

  const canEnter = (role: AdminRole): boolean => {
    if (isSuperAdmin) return true;
    return actualRole === role;
  };

  // Knocking on a door always routes through canEnter — anonymous
  // visitors and signed-in visitors without the right role both land
  // on the HALT page. Only the central "Se connecter" plaque opens
  // the sign-in modal.
  const onDoorClick = (role: AdminRole) => {
    if (canEnter(role)) onEnter(role);
    else setDeniedRole(role);
  };

  // Doors to render — super-admins see CA→Kitchen (their `'super'` door
  // is implicit, since any door opens for them).
  const doors = ALL_ROLES.filter((r) => r !== 'super' && DOOR_ORDER.includes(r))
    .sort((a, b) => DOOR_ORDER.indexOf(a) - DOOR_ORDER.indexOf(b));

  return (
    <main
      className="min-h-screen relative overflow-hidden text-[var(--color-bone)] px-4 md:px-8 py-12"
      style={{
        background:
          // Stacked top → bottom: copper/amber spotlights, a dimmed
          // charcoal wash, then the Petite-Nation forest photo as the
          // back-most layer. Same recipe as the HALT page so both
          // admin doorways share atmosphere.
          `radial-gradient(1200px 800px at 50% -10%, rgba(232, 177, 74, 0.10), transparent 65%),` +
          `radial-gradient(900px 700px at 50% 110%, rgba(184, 106, 42, 0.07), transparent 60%),` +
          `linear-gradient(180deg, rgba(31, 31, 36, 0.72) 0%, rgba(22, 22, 26, 0.82) 55%, rgba(14, 14, 18, 0.92) 100%),` +
          `url('https://storage.googleapis.com/salondesinconnus/Auberge%20photos/nature%20coco%20upscale.jpg')`,
        backgroundSize: 'cover, cover, cover, cover',
        backgroundPosition: 'center, center, center, center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Top-right corner: only the discreet "Quitter" pill, and only
          for signed-in visitors. Anonymous visitors don't get a corner
          button — the central plaque is the only call to action. */}
      {signedIn && (
        <button
          type="button"
          onClick={onSignOut}
          className="absolute top-6 right-6 inline-flex items-center gap-2 px-3 py-1.5 font-sans uppercase tracking-[0.25em] text-[10px] transition-colors"
          style={{
            color: 'rgba(244, 239, 227, 0.65)',
            border: '1px solid rgba(232, 177, 74, 0.25)',
            background: 'rgba(10, 2, 7, 0.4)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-amber-glow)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(244, 239, 227, 0.65)'; }}
        >
          <LogOut size={11} /> Quitter
        </button>
      )}

      {/* Header */}
      <div className="max-w-5xl mx-auto text-center mb-14 md:mb-20">
        <motion.p
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="font-display title-medieval italic uppercase tracking-[0.5em] text-[11px] mb-4 inline-flex items-center gap-3"
          style={{ color: 'var(--color-amber-glow)', textShadow: '0 0 14px rgba(232, 177, 74, 0.45)' }}
        >
          <HexDot />
          Chambre du Conseil
          <HexDot />
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="font-display title-medieval text-4xl md:text-6xl tracking-[0.04em] mb-4"
          style={{ color: 'var(--color-bone)' }}
        >
          Qui frappe à la porte du jardin ?
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="font-editorial italic text-base md:text-lg max-w-2xl mx-auto"
          style={{ color: 'rgba(244, 239, 227, 0.75)' }}
        >
          Cinq seuils mènent au tableau de bord. Chaque porte n’obéit qu’à
          la clef qui lui correspond — sauf à celui qui détient toutes
          les clefs.
        </motion.p>
        {isSuperAdmin && (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-4 inline-flex items-center gap-2 px-3 py-1 font-sans uppercase tracking-[0.3em] text-[10px]"
            style={{
              color: 'var(--color-amber-glow)',
              background: 'rgba(232, 177, 74, 0.08)',
              border: '1px solid rgba(232, 177, 74, 0.4)',
            }}
          >
            <Crown size={10} /> Maître des clefs — toutes les portes vous obéissent
          </motion.p>
        )}

        {!signedIn && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            // mt-4 brings the "Avant de toquer..." sentence closer to
            // the previous paragraph (balanced gap); gap-9 pushes the
            // central plaque ~20px further below the sentence.
            className="mt-4 flex flex-col items-center gap-9"
          >
            <p
              className="font-editorial italic text-sm md:text-base max-w-xl mx-auto"
              style={{ color: 'rgba(244, 239, 227, 0.6)' }}
            >
              Avant de toquer à l’une des portes, vous devrez décliner votre identité.
            </p>
            {/* Medieval plaque — octagonal hex clip + double bevel +
                corner ornaments. Sits between the intro paragraph and
                the door grid so it reads as a ceremonial threshold. */}
            <div className="relative inline-block group">
              <PlaqueCorners />
              <button
                type="button"
                onClick={() => onSignIn?.()}
                className="relative inline-flex items-center gap-3 px-10 py-4 font-display title-medieval uppercase tracking-[0.36em] text-[12px] font-semibold transition-all group-hover:scale-[1.025]"
                style={{
                  color: 'var(--color-velvet-deep)',
                  background:
                    'linear-gradient(180deg, var(--color-amber-glow) 0%, var(--color-mustard) 52%, var(--color-copper) 100%)',
                  clipPath:
                    'polygon(14px 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 14px 100%, 0 50%)',
                  boxShadow:
                    'inset 0 1px 0 rgba(255, 240, 200, 0.55), inset 0 -2px 0 rgba(120, 60, 20, 0.3), 0 16px 32px -10px rgba(216, 155, 58, 0.7)',
                }}
              >
                <span aria-hidden className="w-1 h-1 rotate-45" style={{ background: 'var(--color-velvet-deep)' }} />
                <LogIn size={13} /> Se connecter
                <span aria-hidden className="w-1 h-1 rotate-45" style={{ background: 'var(--color-velvet-deep)' }} />
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Doors */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="shown"
        className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 md:gap-6"
      >
        {doors.map((role) => (
          <Door
            key={role}
            role={role}
            unlocked={canEnter(role)}
            onClick={() => onDoorClick(role)}
          />
        ))}
      </motion.div>

      {/* Access-denied overlay */}
      <AnimatePresence>
        {deniedRole && (
          <AccessDenied
            attempted={deniedRole}
            actualRole={actualRole}
            userEmail={userEmail}
            onClose={() => setDeniedRole(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
};

// Small diamond marker reused in the header.
const HexDot: React.FC = () => (
  <span
    aria-hidden
    className="inline-block w-1.5 h-1.5 rotate-45"
    style={{ background: 'var(--color-amber-glow)', boxShadow: '0 0 8px rgba(232, 177, 74, 0.55)' }}
  />
);

// ─── Door ────────────────────────────────────────────────────────────
// Tall hex-style panel with corner ticks, motif name, role label,
// description, and an "Entrer" / "Verrouillée" footer. Hover glows
// amber; locked doors show a copper padlock and stay dim.
const Door: React.FC<{
  role: AdminRole;
  unlocked: boolean;
  onClick: () => void;
}> = ({ role, unlocked, onClick }) => {
  const Icon = DOOR_META[role].icon;
  const tone = DOOR_TONE[role];
  return (
    <motion.button
      type="button"
      variants={doorVariants}
      whileHover={unlocked ? { y: -4, scale: 1.015 } : { x: [0, -2, 2, -2, 0] }}
      whileTap={unlocked ? { scale: 0.99 } : undefined}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      onClick={onClick}
      className="group relative text-left flex flex-col min-h-[340px] md:min-h-[400px] overflow-hidden transition-all"
      style={{
        background: `linear-gradient(180deg, ${tone.bgTop} 0%, ${tone.bgBottom} 100%)`,
        border: `1px solid ${tone.accent}`,
        boxShadow: unlocked
          ? `
              inset 0 1px 0 ${tone.specular}22,
              inset 0 -1px 0 ${tone.shadow}99,
              0 0 0 1px ${tone.shadow}88,
              0 22px 48px -20px ${tone.glow},
              0 0 36px -12px ${tone.glow}
            `
          : `
              inset 0 1px 0 ${tone.specular}14,
              inset 0 -1px 0 ${tone.shadow}88,
              0 0 0 1px ${tone.shadow}66,
              0 16px 36px -18px rgba(0,0,0,0.75)
            `,
        clipPath: 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)',
      }}
    >
      {/* Top metallic ribbon — divider-brass aesthetic, fades at edges */}
      <span
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          top: 0,
          left: 22, right: 22,
          height: 2,
          background: metallicRibbonBg(tone),
          filter: unlocked ? `drop-shadow(0 0 6px ${tone.glow})` : 'none',
        }}
      />

      {/* Corner ticks tinted to the highlight so they read on every tone */}
      <DoorCorners unlocked={unlocked} color={tone.highlight} />

      {/* Icon + motif */}
      <div className="px-6 pt-10 flex flex-col items-center gap-3 text-center">
        {/* Metallic medallion — five-stop diagonal gradient (specular →
            highlight → accent → shadow → accent → highlight) simulates
            a polished hex coin. The icon is rendered in the shadow
            tone so it reads as engraved/stamped into the metal. */}
        <span
          className="relative inline-flex items-center justify-center w-16 h-16 mb-1"
          style={{
            background: metallicDiscBg(tone),
            clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
            boxShadow: unlocked
              ? `
                  inset 0 1px 0 ${tone.specular}aa,
                  inset 0 -1px 0 ${tone.shadow}cc,
                  0 0 22px -2px ${tone.glow},
                  0 4px 10px -2px rgba(0,0,0,0.55)
                `
              : `
                  inset 0 1px 0 ${tone.specular}66,
                  inset 0 -1px 0 ${tone.shadow}aa,
                  0 4px 10px -2px rgba(0,0,0,0.6)
                `,
          }}
        >
          <Icon size={24} style={{
            color: tone.shadow,
            filter: `drop-shadow(0 1px 0 ${tone.specular}88)`,
          }} />
        </span>
        <span
          className="font-display title-medieval italic uppercase tracking-[0.45em] text-[9px]"
          style={{ color: tone.highlight }}
        >
          {DOOR_META[role].motif.FR}
        </span>
      </div>

      {/* Title — always rendered in bone for a premium, crisp look */}
      <div className="px-6 pt-3 pb-4 text-center">
        <h3
          className="font-display title-medieval text-xl md:text-2xl tracking-[0.04em] uppercase leading-tight"
          style={{ color: 'var(--color-bone)' }}
        >
          {ROLE_LABELS[role].FR}
        </h3>
      </div>

      {/* Description */}
      <p
        className="px-6 pb-5 font-editorial italic text-[13px] leading-snug text-center flex-1"
        style={{ color: 'rgba(244, 239, 227, 0.78)' }}
      >
        {ROLE_DESCRIPTIONS[role].FR}
      </p>

      {/* Footer — divider-brass-style hairline as the band's top stroke,
          then the role's chip text + pip. */}
      <div
        className="relative px-6 py-3 flex items-center justify-between gap-3"
        style={{
          background: `linear-gradient(180deg, ${tone.accent}10 0%, ${tone.accent}05 100%)`,
        }}
      >
        <span
          aria-hidden
          className="absolute top-0 pointer-events-none"
          style={{
            left: 22, right: 22,
            height: 1,
            background: metallicRibbonBg(tone),
            opacity: 0.85,
          }}
        />
        <span
          className="font-sans uppercase tracking-[0.35em] text-[10px]"
          style={{ color: unlocked ? tone.highlight : `${tone.highlight}aa` }}
        >
          {unlocked ? 'Entrer' : 'Verrouillée'}
        </span>
        {unlocked ? (
          <span aria-hidden className="w-1.5 h-1.5 rotate-45"
                style={{ background: tone.highlight, boxShadow: `0 0 10px ${tone.glow}` }} />
        ) : (
          <Lock size={12} style={{ color: `${tone.highlight}99` }} />
        )}
      </div>

      {/* Hover sweep — diagonal specular glint */}
      {unlocked && (
        <span
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background:
              `linear-gradient(115deg, transparent 35%, ${tone.specular}30 50%, transparent 65%)`,
          }}
        />
      )}
    </motion.button>
  );
};

const DoorCorners: React.FC<{ unlocked: boolean; color?: string }> = ({ unlocked, color: customColor }) => {
  const color = unlocked
    ? (customColor ?? 'var(--color-amber-glow)')
    : 'rgba(244, 239, 227, 0.18)';
  const filter = unlocked ? `drop-shadow(0 0 6px ${customColor ?? 'rgba(232, 177, 74, 0.5)'})` : 'none';
  const base: React.CSSProperties = {
    position: 'absolute', width: 14, height: 14, borderColor: color, filter, pointerEvents: 'none',
  };
  return (
    <>
      <span aria-hidden style={{ ...base, top: 10,    left: 10,    borderTop:    '1.5px solid', borderLeft:  '1.5px solid' }} />
      <span aria-hidden style={{ ...base, top: 10,    right: 10,   borderTop:    '1.5px solid', borderRight: '1.5px solid' }} />
      <span aria-hidden style={{ ...base, bottom: 10, left: 10,    borderBottom: '1.5px solid', borderLeft:  '1.5px solid' }} />
      <span aria-hidden style={{ ...base, bottom: 10, right: 10,   borderBottom: '1.5px solid', borderRight: '1.5px solid' }} />
    </>
  );
};

// L-tick filigree around the medieval Se-connecter plaque. Sits in the
// wrapper, OUTSIDE the clipped plaque, so the ornaments aren't clipped.
const PlaqueCorners: React.FC = () => {
  const color = 'var(--color-amber-glow)';
  const filter = 'drop-shadow(0 0 5px rgba(232, 177, 74, 0.55))';
  const base: React.CSSProperties = {
    position: 'absolute', width: 10, height: 10, borderColor: color, filter, pointerEvents: 'none',
  };
  return (
    <>
      <span aria-hidden style={{ ...base, top: -4,     left:  -2,    borderTop:    '1.5px solid', borderLeft:  '1.5px solid' }} />
      <span aria-hidden style={{ ...base, top: -4,     right: -2,    borderTop:    '1.5px solid', borderRight: '1.5px solid' }} />
      <span aria-hidden style={{ ...base, bottom: -4,  left:  -2,    borderBottom: '1.5px solid', borderLeft:  '1.5px solid' }} />
      <span aria-hidden style={{ ...base, bottom: -4,  right: -2,    borderBottom: '1.5px solid', borderRight: '1.5px solid' }} />
    </>
  );
};

// ─── AccessDenied (gate context) ─────────────────────────────────────
// Thin wrapper around the shared HaltScreen — gate-specific copy.
// When the visitor knocks on the Bénévoles or Super-Bénévoles door
// without a key, surface a secondary CTA pointing at the bénévole
// application form so they can apply on the spot instead of bouncing.
const AccessDenied: React.FC<{
  attempted: AdminRole;
  actualRole: AdminRole | null;
  userEmail: string;
  onClose: () => void;
}> = ({ attempted, actualRole, userEmail, onClose }) => {
  const offerApplication = attempted === 'benevole' || attempted === 'super_benevole';
  return (
    <HaltScreen
      email={userEmail}
      description={
        <>
          <p>
            Vous frappez à la porte de la{' '}
            <strong style={{ color: '#e6a3a3' }}>{ROLE_LABELS[attempted].FR}</strong>
            {' '}— votre clef n’y répond pas.
          </p>
          <p className="text-xs md:text-sm" style={{ color: 'rgba(244, 239, 227, 0.55)' }}>
            {actualRole
              ? <>Votre rang reconnu&nbsp;: <strong style={{ color: 'var(--color-amber-glow)' }}>{ROLE_LABELS[actualRole].FR}</strong>.</>
              : <>Aucun rang ne vous a encore été attribué.</>}
          </p>
          {offerApplication && (
            <p className="text-xs md:text-sm pt-2" style={{ color: 'rgba(244, 239, 227, 0.65)' }}>
              Vous souhaitez devenir bénévole ? Le formulaire d’engagement vous attend.
            </p>
          )}
        </>
      }
      cta={{ label: 'Retour aux portes', onClick: onClose }}
      secondaryCta={
        offerApplication
          ? { label: 'Postuler comme bénévole', href: '/benevole' }
          : undefined
      }
      onBackdropClick={onClose}
    />
  );
};

export default GateScreen;
