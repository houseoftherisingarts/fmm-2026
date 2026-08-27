import React, { useState } from 'react';
import {
  Swords,
  LayoutDashboard, HandHeart, ShoppingBag, Users, MessageSquare, Mail,
  Image as ImageIcon, BarChart3, Sparkles, Settings, LogOut, Menu, X, ExternalLink, Grid3x3,
  Beer, Heart, UsersRound, ShieldCheck, DoorOpen, Eye, CalendarClock, Music, Feather, Megaphone,
  Hash, Bug, Camera, Images, CalendarCheck2, TicketCheck, Wallet, BookUser, Landmark, Award, Send,
  Receipt, MailPlus, PenLine,
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
  | 'activites'
  | 'badges'
  | 'musiciens'
  | 'pupitre'
  | 'matrice'
  | 'horaire'
  | 'bar'
  | 'dispos'
  | 'mariages'
  | 'commanditaires'
  | 'finances'
  | 'carnet'
  | 'comptes'
  | 'clients'
  | 'invites'
  | 'messages'
  | 'messagerie'
  | 'campagnes'
  | 'newsletter'
  | 'social'
  | 'medias'
  | 'photos'
  | 'photosRecues'
  | 'analytics'
  | 'splash'
  | 'parametres'
  | 'discord'
  | 'bugs'
  | 'roles';

interface NavItem {
  id: AdminSectionId;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  /** Rail heading this item sits under. Items sharing a group must stay
   *  adjacent in NAV: the rail renders a heading whenever the group
   *  changes between two consecutive VISIBLE items, so permission
   *  filtering never leaves an orphan heading behind. */
  group: string;
}

const NAV: NavItem[] = [
  { id: 'dashboard',  label: 'Tableau de bord', icon: LayoutDashboard, group: 'Vue d’ensemble' },

  { id: 'benevoles',  label: 'Bénévoles',       icon: HandHeart,       group: 'Bénévoles' },
  { id: 'equipes',    label: 'Équipes',         icon: UsersRound,      group: 'Bénévoles' },
  { id: 'dispos',     label: 'Disponibilités',  icon: CalendarCheck2,  group: 'Bénévoles' },
  { id: 'matrice',    label: 'Matrice des Rôles', icon: Grid3x3,       group: 'Bénévoles' },
  { id: 'badges',     label: 'Babillard et badges', icon: Award,       group: 'Bénévoles' },

  { id: 'marchands',  label: 'Marchands',       icon: ShoppingBag,     group: 'Participants' },
  { id: 'activites',  label: 'Activités',       icon: Swords,          group: 'Participants' },
  { id: 'musiciens',  label: 'Musique',         icon: Music,           group: 'Participants' },
  { id: 'mariages',   label: 'Mariages',        icon: Heart,           group: 'Participants' },
  { id: 'invites',    label: 'Invités',         icon: TicketCheck,     group: 'Participants' },

  { id: 'horaire',    label: 'Horaire',         icon: CalendarClock,   group: 'Opérations' },
  { id: 'bar',        label: 'Bar',             icon: Beer,            group: 'Opérations' },
  { id: 'pupitre',    label: 'Le Pupitre',      icon: Feather,         group: 'Opérations' },

  { id: 'commanditaires', label: 'Commanditaires', icon: Landmark,     group: 'Partenaires et deniers' },
  { id: 'finances',   label: 'Finances',        icon: Wallet,          group: 'Partenaires et deniers' },

  { id: 'messages',   label: 'Messages',        icon: MessageSquare,   group: 'Communications' },
  // Écrire dans la boîte de réception des membres : une personne, un
  // groupe coché, ou tout le registre (Alex, 2026-08-24).
  { id: 'messagerie', label: 'Écrire aux membres', icon: Send,         group: 'Communications' },
  { id: 'campagnes',  label: 'Campagnes courriel', icon: MailPlus, group: 'Communications' },
  { id: 'newsletter', label: 'Infolettre',      icon: Mail,            group: 'Communications' },
  { id: 'social',     label: 'Médias sociaux',  icon: Megaphone,       group: 'Communications' },
  { id: 'discord',    label: 'Discord',         icon: Hash,            group: 'Communications' },

  { id: 'medias',     label: 'Médiathèque',     icon: ImageIcon,       group: 'Contenu' },
  { id: 'photos',     label: 'Photos',          icon: Camera,          group: 'Contenu' },
  // Photos envoyées par les membres depuis leur espace compte (à ne
  // pas confondre avec 'photos' ci-dessus : les archives Histoire).
  { id: 'photosRecues', label: 'Photos reçues', icon: Images,          group: 'Contenu' },
  { id: 'splash',     label: 'Écran d’accueil', icon: Sparkles,        group: 'Contenu' },

  { id: 'comptes',    label: 'Comptes',         icon: Users,           group: 'Régie' },
  // Tout ce que le festival a vendu depuis 2023, une personne par
  // ligne, versé par tools/importer-clients.mjs (Alex, 2026-08-24).
  { id: 'clients',    label: 'Clients',         icon: Receipt,         group: 'Régie' },
  { id: 'carnet',     label: 'Carnet de contacts', icon: BookUser,     group: 'Régie' },
  { id: 'analytics',  label: 'Analytics',       icon: BarChart3,       group: 'Régie' },
  { id: 'parametres', label: 'Paramètres',      icon: Settings,        group: 'Régie' },
  { id: 'bugs',       label: 'Bugs',            icon: Bug,             group: 'Régie' },
  // Super-admin-only section: assign/revoke admin roles for everyone else.
  { id: 'roles',      label: 'Rôles admin',     icon: ShieldCheck,     group: 'Régie' },
];

const ALL_SECTION_IDS: AdminSectionId[] = NAV.map((n) => n.id);

// Exported so AdminPage / App.tsx can validate a URL's `:section` segment
// against the real list of sections: the id IS the URL segment (already
// lowercase French, no accents), so no separate mapping table is needed.
export const ADMIN_SECTION_IDS: AdminSectionId[] = ALL_SECTION_IDS;

interface Props {
  user: Pick<User, 'email' | 'displayName' | 'photoURL'> | { email: string; displayName?: string | null; photoURL?: string | null };
  section: AdminSectionId;
  onSectionChange: (s: AdminSectionId) => void;
  onSignOut: () => void;
  devBanner?: boolean;
  /** Effective role being viewed: drives NAV filter + accent theme. */
  adminRole?: AdminRole | null;
  /** The user's actual clearance (true role on file). Used to decide
   *  which roles they're allowed to preview-as in the toggle below. */
  actualAdminRole?: AdminRole | null;
  /** Switch the effective role (preview-as). */
  onAdminRoleChange?: (role: AdminRole) => void;
  /** When a super-admin is previewing a role, render a banner with the
   *  role being previewed + a "back to gates" callback. */
  previewBanner?: { role: AdminRole; onBack: () => void } | null;
  /** Callback to return to the gate screen: wires the "Changer de
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
  // to an empty list if no role is set, at which point AdminPage should
  // already be rendering the "access refused" gate, so we never actually
  // render an empty shell.
  const allowed = new Set(allowedSections(adminRole, ALL_SECTION_IDS));
  const visibleNav = NAV.filter((n) => allowed.has(n.id));
  const current = visibleNav.find((n) => n.id === section) ?? NAV.find((n) => n.id === section);

  // Sidebar avatar initial: used when no photoURL is on the user.
  const initial = (user.displayName || user.email || '?')[0].toUpperCase();
  const displayName = user.displayName || user.email?.split('@')[0] || '';

  return (
    <div
      className="admin-skin-root admin-stage min-h-screen flex"
      // Override the admin CSS tokens with the active role's accent so
      // every `var(--admin-accent)` reference downstream paints in CA
      // blue / Super Bénévoles green / Bénévoles steel / Cuisine red /
      // Organisateurs+Super gold, without touching the stylesheet.
      // `--admin-line` is deliberately NOT overridden: on the reference
      // plates the structure is made of dark grooves and the brass is
      // reserved for what you can act on, so structural hairlines stay
      // cold and neutral. The role tint rides on --admin-accent-line
      // for the few places that genuinely want a brass filet.
      style={(() => {
        const tone = ROLE_ACCENT[adminRole ?? 'super'];
        return {
          ['--admin-accent'      as never]: tone.accent,
          ['--admin-accent-dim'  as never]: tone.accentDim,
          ['--admin-accent-line' as never]: tone.line,
        } as React.CSSProperties;
      })()}
    >
      {/* ── Sidebar ── */}
      {/* On desktop the rail is chrome, not content: it stays put at
          viewport height while the section scrolls. Without this it
          stretched to the full document height, which pushed the
          sign-out and door switcher thousands of pixels below the fold
          on a long section. */}
      <aside className={`admin-rail fixed inset-y-0 left-0 z-40 w-72 flex flex-col transform transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:z-0 lg:sticky lg:top-0 lg:h-screen lg:self-start`}>
        {/* Brand block */}
        <div className="admin-rail-brand shrink-0 px-6 pt-7 pb-5">
          <img decoding="async" src="/fmm-logo-embossed-silver.webp" alt="FMM" className="h-9 w-auto mb-3.5" />
          <p className="admin-eyebrow inline-flex items-center gap-2">
            <span aria-hidden style={{ width: 5, height: 5, transform: 'rotate(45deg)', background: 'var(--admin-accent)' }} />
            Espace Admin
          </p>
          <p className="admin-title text-sm mt-1.5 tracking-[0.18em] uppercase" style={{ fontWeight: 400 }}>
            FMM <span style={{ color: 'var(--admin-accent)' }}>2026</span>
          </p>
        </div>

        {/* Nav: filtered to sections this role can open, and broken into
            headed groups. The heading is emitted whenever the group
            changes between two consecutive VISIBLE rows, so a role that
            can only open part of a group never gets an empty heading. */}
        {/* min-h-0 is what actually lets this column shrink: a flex child
            with overflow-y-auto refuses to go below its content height
            without it, so the list would spill under the user card. */}
        <nav className="admin-nav-scroll flex-1 min-h-0 overflow-y-auto py-2">
          {visibleNav.map(({ id, label, icon: Icon, group }, i) => {
            const active = section === id;
            const opensGroup = group !== visibleNav[i - 1]?.group;
            return (
              <React.Fragment key={id}>
                {opensGroup && <p className="admin-nav-group">{group}</p>}
                <button
                  type="button"
                  onClick={() => { onSectionChange(id); setMobileOpen(false); }}
                  data-active={active || undefined}
                  aria-current={active ? 'page' : undefined}
                  className="admin-nav-item"
                >
                  <Icon size={13} className="shrink-0" />
                  <span className="flex-1 min-w-0 truncate">{label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* User card */}
        <div
          className="shrink-0 px-5 py-4"
          style={{
            borderTop: '1px solid rgba(0, 0, 0, 0.55)',
            boxShadow: '0 -1px 0 var(--admin-sheen) inset',
            background: 'linear-gradient(180deg, rgba(6, 10, 14, 0.85) 0%, rgba(4, 7, 10, 0.95) 100%)',
          }}
        >
          <div className="flex items-center gap-3 mb-3 min-w-0">
            {user.photoURL ? (
              <img
                decoding="async"
                src={user.photoURL}
                alt=""
                className="w-9 h-9 object-cover"
                style={{ borderRadius: 9, border: '1px solid var(--admin-line)' }}
              />
            ) : (
              <div
                className="w-9 h-9 flex items-center justify-center font-sans text-xs font-semibold"
                style={{
                  borderRadius: 9,
                  background: 'color-mix(in oklab, var(--admin-accent), transparent 88%)',
                  border: '1px solid var(--admin-accent-line)',
                  color: 'var(--admin-brass-hi)',
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
                    borderRadius: 6,
                    color: 'var(--admin-brass-hi)',
                    background: 'color-mix(in oklab, var(--admin-accent), transparent 91%)',
                    border: '1px solid var(--admin-accent-line)',
                  }}
                >
                  <ShieldCheck size={9} />
                  {ROLE_LABELS[adminRole].FR}
                </span>
              )}
            </div>
          </div>

          {/* View-as toggle: only shown when the admin's actual
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
                      {r === actualAdminRole ? ' (vous)' : ''}
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
          style={{ background: 'rgba(4, 8, 11, 0.78)' }}
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
              Mode aperçu : vue {ROLE_LABELS[previewBanner.role].FR}
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
            {/* No truncation: clipping a section name to "BÉNÉVOL…" is
                worse than letting it wrap. Sized so the longest label
                in NAV, "Babillard et badges" (19 characters), holds on
                one line at 390px and never reaches a third line. */}
            <h1 className="admin-title text-xl sm:text-2xl md:text-4xl">
              {current?.label}
            </h1>
            {/* Brass filet under the section title: lit at the start,
                spent at the end, like the rule under the reference
                logo's subtitle. */}
            <hr className="admin-title-rule" />
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex shrink-0 admin-ghost"
          >
            <ExternalLink size={12} /> Voir le site
          </a>
        </header>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}

          {/* Bottom HUD: Witcher controller-prompt rail at the foot
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
            borderRadius: 10,
            background: 'rgba(6, 11, 15, 0.88)',
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
