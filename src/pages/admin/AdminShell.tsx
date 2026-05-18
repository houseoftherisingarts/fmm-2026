import React, { useState } from 'react';
import {
  LayoutDashboard, HandHeart, ShoppingBag, Users, MessageSquare, Mail,
  Image as ImageIcon, BarChart3, Sparkles, Settings, LogOut, Menu, X, ExternalLink, Grid3x3,
  Beer, Heart, UsersRound, ShieldCheck, DoorOpen, Eye, CalendarClock, Music, Feather, Megaphone,
  Hash,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { AdminRole } from '../../lib/adminPermissions';
import { ROLE_LABELS, allowedSections, ROLE_ACCENT, previewableRoles } from '../../lib/adminPermissions';

// ─── FMM admin shell ──────────────────────────────────────────────
// Sidebar layout cloned from Krystine's pattern (sidebar nav + main
// pane + sticky header), re-themed in the midnight + brass system and
// using lucide icons. Section enum is FMM-specific: bénévoles +
// marchands are first-class, plus universal admin sections.

export type AdminSectionId =
  | 'dashboard'
  | 'benevoles'
  | 'equipes'
  | 'marchands'
  | 'musiciens'
  | 'pupitre'
  | 'matrice'
  | 'horaire'
  | 'bar'
  | 'mariages'
  | 'comptes'
  | 'messages'
  | 'newsletter'
  | 'social'
  | 'medias'
  | 'analytics'
  | 'splash'
  | 'parametres'
  | 'discord'
  | 'roles';

interface NavItem {
  id: AdminSectionId;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const NAV: NavItem[] = [
  { id: 'dashboard',  label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'benevoles',  label: 'Bénévoles',       icon: HandHeart },
  { id: 'equipes',    label: 'Équipes',         icon: UsersRound },
  { id: 'marchands',  label: 'Marchands',       icon: ShoppingBag },
  { id: 'musiciens',  label: 'Musique',         icon: Music },
  { id: 'pupitre',    label: 'Le Pupitre',      icon: Feather },
  { id: 'matrice',    label: 'Matrice des Rôles', icon: Grid3x3 },
  { id: 'horaire',    label: 'Horaire',         icon: CalendarClock },
  { id: 'bar',        label: 'Bar',             icon: Beer },
  { id: 'mariages',   label: 'Mariages',        icon: Heart },
  { id: 'comptes',    label: 'Comptes',         icon: Users },
  { id: 'messages',   label: 'Messages',        icon: MessageSquare },
  { id: 'newsletter', label: 'Infolettre',      icon: Mail },
  { id: 'social',     label: 'Médias sociaux',  icon: Megaphone },
  { id: 'medias',     label: 'Médiathèque',     icon: ImageIcon },
  { id: 'analytics',  label: 'Analytics',       icon: BarChart3 },
  { id: 'splash',     label: 'Écran d’accueil', icon: Sparkles },
  { id: 'parametres', label: 'Paramètres',      icon: Settings },
  { id: 'discord',    label: 'Discord',          icon: Hash },
  // Super-admin-only section: assign/revoke admin roles for everyone else.
  { id: 'roles',      label: 'Rôles admin',     icon: ShieldCheck },
];

const ALL_SECTION_IDS: AdminSectionId[] = NAV.map((n) => n.id);

interface Props {
  user: Pick<User, 'email' | 'displayName' | 'photoURL'> | { email: string; displayName?: string | null; photoURL?: string | null };
  section: AdminSectionId;
  onSectionChange: (s: AdminSectionId) => void;
  onSignOut: () => void;
  devBanner?: boolean;
  /** Effective role being viewed — drives NAV filter + accent theme. */
  adminRole?: AdminRole | null;
  /** The user's actual clearance (true role on file). Used to decide
   *  which roles they're allowed to preview-as in the toggle below. */
  actualAdminRole?: AdminRole | null;
  /** Switch the effective role (preview-as). */
  onAdminRoleChange?: (role: AdminRole) => void;
  /** When a super-admin is previewing a role, render a banner with the
   *  role being previewed + a "back to gates" callback. */
  previewBanner?: { role: AdminRole; onBack: () => void } | null;
  /** Callback to return to the gate screen — wires the "Changer de
   *  porte" affordance in the sidebar footer. */
  onBackToGates?: () => void;
  children: React.ReactNode;
}

const AdminShell: React.FC<Props> = ({
  user, section, onSectionChange, onSignOut, devBanner,
  adminRole = null, actualAdminRole = null, onAdminRoleChange,
  previewBanner = null, onBackToGates, children,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  // Filter the rail to only the sections this role can open. Falls back
  // to an empty list if no role is set — at which point AdminPage should
  // already be rendering the "access refused" gate, so we never actually
  // render an empty shell.
  const allowed = new Set(allowedSections(adminRole, ALL_SECTION_IDS));
  const visibleNav = NAV.filter((n) => allowed.has(n.id));
  const current = visibleNav.find((n) => n.id === section) ?? NAV.find((n) => n.id === section);

  // Sidebar avatar initial — used when no photoURL is on the user.
  const initial = (user.displayName || user.email || '?')[0].toUpperCase();
  const displayName = user.displayName || user.email?.split('@')[0] || '';

  return (
    <div
      className="admin-skin-root admin-stage min-h-screen flex"
      // Override the admin CSS tokens with the active role's accent so
      // every `var(--admin-accent)` reference downstream paints in CA
      // blue / Super Bénévoles green / Bénévoles steel / Cuisine red /
      // Organisateurs+Super gold — without touching the stylesheet.
      style={(() => {
        const tone = ROLE_ACCENT[adminRole ?? 'super'];
        return {
          ['--admin-accent'     as never]: tone.accent,
          ['--admin-accent-dim' as never]: tone.accentDim,
          ['--admin-line'       as never]: tone.line,
        } as React.CSSProperties;
      })()}
    >
      {/* ── Sidebar ── */}
      <aside className={`admin-rail fixed inset-y-0 left-0 z-40 w-72 flex flex-col transform transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-0`}>
        {/* Brand block */}
        <div className="px-6 pt-7 pb-6" style={{ borderBottom: '1px solid var(--admin-line)' }}>
          <img decoding="async" src="/fmm-logo-embossed-silver.png" alt="FMM" className="h-8 w-auto mb-3 opacity-90" />
          <p className="admin-eyebrow inline-flex items-center gap-2">
            <span aria-hidden style={{ width: 5, height: 5, transform: 'rotate(45deg)', background: 'var(--admin-accent)' }} />
            Espace Admin
          </p>
          <p className="admin-title text-sm mt-1 tracking-[0.18em] uppercase" style={{ fontWeight: 400 }}>
            FMM <span style={{ color: 'var(--admin-accent)' }}>2026</span>
          </p>
        </div>

        {/* Nav — filtered to sections this role can open */}
        <nav className="flex-1 overflow-y-auto py-3">
          {visibleNav.map(({ id, label, icon: Icon }) => {
            const active = section === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => { onSectionChange(id); setMobileOpen(false); }}
                data-active={active || undefined}
                className="admin-nav-item"
              >
                <Icon size={13} className="shrink-0" />
                <span className="flex-1 min-w-0 truncate">{label}</span>
              </button>
            );
          })}
        </nav>

        {/* User card */}
        <div className="px-5 py-4" style={{ borderTop: '1px solid var(--admin-line)' }}>
          <div className="flex items-center gap-3 mb-3 min-w-0">
            {user.photoURL ? (
              <img
                decoding="async"
                src={user.photoURL}
                alt=""
                className="w-9 h-9 object-cover"
                style={{ border: '1px solid var(--admin-line)' }}
              />
            ) : (
              <div
                className="w-9 h-9 flex items-center justify-center font-sans text-xs font-semibold"
                style={{
                  background: 'rgba(127, 176, 232, 0.10)',
                  border: '1px solid var(--admin-line)',
                  color: 'var(--admin-accent)',
                }}
              >
                {initial}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-sans" style={{ color: 'var(--admin-text)' }}>
                {displayName}
              </p>
              <p className="truncate text-[11px] font-sans" style={{ color: 'var(--admin-text-mute)' }}>
                {user.email}
              </p>
              {adminRole && (
                <span
                  className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 font-sans uppercase tracking-[0.25em] text-[9px]"
                  style={{
                    color: 'var(--admin-accent)',
                    background: 'var(--admin-accent)0d',
                    border: '1px solid var(--admin-line)',
                  }}
                >
                  <ShieldCheck size={9} />
                  {ROLE_LABELS[adminRole].FR}
                </span>
              )}
            </div>
          </div>

          {/* View-as toggle — only shown when the admin's actual
              clearance lets them preview more than one role (i.e. the
              CA can view as Organisateur / Super Bénévole / etc.). The
              dropdown picks the EFFECTIVE role; the shell re-themes
              and re-permissions itself on change. */}
          {actualAdminRole && onAdminRoleChange && (() => {
            const opts = previewableRoles(actualAdminRole);
            if (opts.length < 2) return null;
            return (
              <div className="mb-3">
                <label
                  htmlFor="admin-view-as"
                  className="block font-sans uppercase tracking-[0.3em] text-[9px] mb-1"
                  style={{ color: 'var(--admin-text-mute)' }}
                >
                  Vue
                </label>
                <select
                  id="admin-view-as"
                  value={adminRole ?? actualAdminRole}
                  onChange={(e) => onAdminRoleChange(e.target.value as AdminRole)}
                  className="admin-input w-full"
                >
                  {opts.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r].FR}
                      {r === actualAdminRole ? ' — vous' : ''}
                    </option>
                  ))}
                </select>
              </div>
            );
          })()}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onSignOut}
              className="text-left text-[10px] uppercase tracking-[0.3em] font-sans flex items-center gap-2 transition-colors"
              style={{ color: 'var(--admin-text-soft)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#FCA5B0'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--admin-text-soft)'; }}
            >
              <LogOut size={11} /> Déconnexion
            </button>
            {onBackToGates && (
              <button
                type="button"
                onClick={onBackToGates}
                className="text-right text-[10px] uppercase tracking-[0.3em] font-sans flex items-center gap-2 transition-colors"
                style={{ color: 'var(--admin-text-soft)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--admin-accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--admin-text-soft)'; }}
                title="Choisir une autre porte"
              >
                <DoorOpen size={11} /> Portes
              </button>
            )}
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden backdrop-blur-sm"
          style={{ background: 'rgba(5, 8, 16, 0.75)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Main pane ── */}
      <main className="flex-1 min-w-0">
        {devBanner && (
          <div
            className="px-4 md:px-8 py-2 text-center font-sans text-[10px] uppercase tracking-[0.35em]"
            style={{
              background: 'rgba(216, 123, 142, 0.10)',
              borderBottom: '1px solid rgba(216, 123, 142, 0.30)',
              color: '#FCA5B0',
            }}
          >
            DEV MODE · auth bypassée · données factices · ne pas déployer ainsi
          </div>
        )}
        {previewBanner && (
          <div
            className="px-4 md:px-8 py-2 flex items-center justify-center gap-4 flex-wrap font-sans text-[10px] uppercase tracking-[0.35em]"
            style={{
              background: 'rgba(232, 177, 74, 0.08)',
              borderBottom: '1px solid rgba(232, 177, 74, 0.35)',
              color: 'var(--color-amber-glow)',
            }}
          >
            <span className="inline-flex items-center gap-2">
              <Eye size={11} />
              Mode aperçu — vue {ROLE_LABELS[previewBanner.role].FR}
            </span>
            <button
              type="button"
              onClick={previewBanner.onBack}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 transition-colors hover:bg-[rgba(232,177,74,0.15)]"
              style={{
                border: '1px solid rgba(232, 177, 74, 0.45)',
                color: 'var(--color-amber-glow)',
              }}
            >
              <DoorOpen size={10} /> Retour aux portes
            </button>
          </div>
        )}
        <header className="admin-topbar px-4 md:px-8 py-3 md:py-4 flex items-center gap-4 sticky top-0 z-20">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden w-8 h-8"
            style={{ color: 'var(--admin-text)' }}
            aria-label="Menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="admin-eyebrow mb-2 inline-flex items-center gap-2">
              <span
                aria-hidden
                style={{
                  display: 'inline-block', width: 5, height: 5,
                  transform: 'rotate(45deg)', background: 'var(--admin-accent)',
                }}
              />
              Section
            </p>
            <h1 className="admin-title text-3xl md:text-4xl truncate">
              {current?.label}
            </h1>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex admin-ghost"
          >
            <ExternalLink size={12} /> Voir le site
          </a>
        </header>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}

          {/* Bottom HUD — Witcher controller-prompt rail at the foot
              of every admin section so the global actions sit where
              the eye expects them. */}
          <div className="admin-hud">
            <div className="flex items-center gap-8 md:gap-10">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="admin-hud-prompt"
              >
                <span className="admin-hud-prompt-glyph"><span>A</span></span>
                Voir le site
              </a>
            </div>
            <div className="flex items-center gap-8 md:gap-10">
              <button
                type="button"
                onClick={onSignOut}
                className="admin-hud-prompt"
              >
                <span className="admin-hud-prompt-glyph"><span>B</span></span>
                Déconnexion
              </button>
              <span
                className="font-sans uppercase tracking-[0.35em] text-[10px]"
                style={{ color: 'var(--admin-text-mute)' }}
              >
                {current?.label}
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Floating mobile-close X when drawer is open */}
      {mobileOpen && (
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="fixed top-4 right-4 z-50 lg:hidden p-2 backdrop-blur"
          style={{
            background: 'rgba(5, 8, 16, 0.85)',
            border: '1px solid var(--admin-line)',
            color: 'var(--admin-text)',
          }}
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
};

export default AdminShell;
