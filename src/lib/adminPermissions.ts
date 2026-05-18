// ─── Admin role-based access control ────────────────────────────────
// Defines the 5 admin roles + their permission matrix (which AdminShell
// sections each role can open). Imported by AuthContext, AdminPage, the
// AdminShell NAV filter and the Rôles management section. The
// `'super'` role is the trump card — full access AND the only role
// that can assign/revoke roles for others.
//
// Edit ROLE_SECTIONS to grant/revoke section access — adding a section
// to AdminShell.AdminSectionId without listing it here means only
// `'super'` will see it (which is the safe default).

import type { AdminSectionId } from '../pages/admin/AdminShell';

export type AdminRole =
  | 'super'
  | 'ca'
  | 'organisateur'
  | 'super_benevole'
  | 'benevole'
  | 'kitchen';

export const ALL_ROLES: AdminRole[] = [
  'super',
  'ca',
  'organisateur',
  'super_benevole',
  'benevole',
  'kitchen',
];

export const ROLE_LABELS: Record<AdminRole, { FR: string; EN: string }> = {
  super:          { FR: 'Super-Admin',                EN: 'Super Admin'      },
  ca:             { FR: 'CA — Conseil d’admin.',      EN: 'Board (CA)'       },
  organisateur:   { FR: 'Organisateur',               EN: 'Organizer'        },
  super_benevole: { FR: 'Super Bénévole',             EN: 'Super Volunteer'  },
  benevole:       { FR: 'Bénévole',                   EN: 'Volunteer'        },
  kitchen:        { FR: 'Cuisine',                    EN: 'Kitchen'          },
};

export const ROLE_DESCRIPTIONS: Record<AdminRole, { FR: string; EN: string }> = {
  super:          { FR: 'Propriétaire de la plateforme — accès complet + gestion des rôles.',
                    EN: 'Platform owner — full access + manage admin roles.' },
  ca:             { FR: 'Accès total à toutes les sections.',
                    EN: 'Total access to every section.' },
  organisateur:   { FR: 'Accès total sauf l’onglet CA (à venir).',
                    EN: 'Total access except the CA tab (coming).' },
  super_benevole: { FR: 'Espace bénévole + supervise les bénévoles normaux.',
                    EN: 'Volunteer space + supervises normal volunteers.' },
  benevole:       { FR: 'Contenus publiés par les admins + salon de discussion.',
                    EN: 'Admin-published content + chat room.' },
  kitchen:        { FR: 'Accès au bar (boissons, inventaire, service).',
                    EN: 'Bar access (drinks, inventory, service).' },
};

// ─── Permission matrix ──────────────────────────────────────────────
// Map of role → list of sections it can open in AdminShell. `'*'` is
// shorthand for "every section, including future ones". The implicit
// `'roles'` section (this file's own management page) is super-only,
// gated separately in canAccess() below.
//
// NOTE — the "CA tab" Organisateurs are blocked from has not been
// built yet. When it lands (board-only documents / minutes / agenda),
// give it a new AdminSectionId (e.g. 'ca-board') and add it to CA's
// list ONLY. Same story for the bénévole space (super_benevole +
// benevole) — Maité is building it under the bénévole tab; add a new
// SectionId when ready and slot it into those two roles.

export const ROLE_SECTIONS: Record<AdminRole, AdminSectionId[] | '*'> = {
  // Platform owner — full access plus the role-management page.
  super:          '*',

  // CA — total access to every existing section (minus role management).
  ca: [
    'dashboard', 'benevoles', 'equipes', 'marchands', 'musiciens', 'pupitre', 'matrice', 'horaire',
    'bar', 'mariages', 'comptes', 'messages', 'newsletter', 'social',
    'medias', 'analytics', 'splash', 'parametres', 'discord',
  ],

  // Organisateurs — total access minus the future CA-only tab.
  // For now, until that tab ships, identical to CA.
  organisateur: [
    'dashboard', 'benevoles', 'equipes', 'marchands', 'musiciens', 'pupitre', 'matrice', 'horaire',
    'bar', 'mariages', 'comptes', 'messages', 'newsletter', 'social',
    'medias', 'analytics', 'splash', 'parametres', 'discord',
  ],

  // Super Bénévole — supervises normal bénévoles. Reads bénévole
  // records, equipes, matrice for context. The Mail tab is locked
  // (super / CA / Organisateurs only); their conversation channel
  // will be the dedicated bénévole-space chat once Maité builds it.
  super_benevole: [
    'dashboard', 'benevoles', 'equipes', 'matrice', 'discord',
  ],

  // Bénévole — admin-published content (dashboard) only for now.
  // Will gain the bénévole-space chat when it ships.
  benevole: [
    'dashboard', 'discord',
  ],

  // Kitchen — bar / food service only.
  kitchen: [
    'dashboard', 'bar',
  ],
};

// `'roles'` is the role-management section; only super-admins can see it.
export const ROLES_SECTION_ID: AdminSectionId = 'roles' as AdminSectionId;

export function canAccess(role: AdminRole | null, section: AdminSectionId): boolean {
  if (!role) return false;
  if (section === ROLES_SECTION_ID) return role === 'super';
  const perm = ROLE_SECTIONS[role];
  return perm === '*' || perm.includes(section);
}

// Return the concrete section list a role can navigate to.
// `'super'` gets everything in the NAV, including the role-management
// section. Other roles get their explicit list (with `'roles'` excluded).
export function allowedSections(role: AdminRole | null, allSections: AdminSectionId[]): AdminSectionId[] {
  if (!role) return [];
  if (role === 'super') return allSections;
  const perm = ROLE_SECTIONS[role];
  if (perm === '*') return allSections.filter((s) => s !== ROLES_SECTION_ID);
  return allSections.filter((s) => (perm as AdminSectionId[]).includes(s));
}

// ─── Role hierarchy (for the "view as" preview toggle) ──────────────
// Higher rank ⇒ more authority. Kitchen sits between super_benevole
// and benevole — a specialist tier accessible to anyone above it.
const ROLE_RANK: Record<AdminRole, number> = {
  super:          100,
  ca:              80,
  organisateur:    60,
  super_benevole:  40,
  kitchen:         30,
  benevole:        20,
};

// True when a user with `actual` clearance is allowed to view the
// dashboard scoped to `target`'s permissions. Always permits the
// identity case (`actual === target`); super-admin can preview every
// role; otherwise allow downgrade if rank-of(actual) > rank-of(target).
export function canPreviewAs(actual: AdminRole | null, target: AdminRole): boolean {
  if (!actual) return false;
  if (actual === target) return true;
  if (actual === 'super') return true;
  return ROLE_RANK[actual] > ROLE_RANK[target];
}

// Which roles a given clearance can preview — used to build the
// "View as" select options. Always includes their own role first.
export function previewableRoles(actual: AdminRole | null): AdminRole[] {
  if (!actual) return [];
  return ALL_ROLES.filter((r) => canPreviewAs(actual, r));
}

// ─── Per-role accent palette ────────────────────────────────────────
// The admin shell paints its chrome (sidebar accent, active nav rail,
// links, hover states) in the role's tone — CA blue, Super Bénévoles
// green, Bénévoles neutral Witcher grey, Organisateurs gold,
// Cuisine red. Super gets the platform's default brass-gold.
//
// Each entry maps cleanly onto the existing `--admin-*` CSS tokens so
// we override them at the AdminShell root and let the rest of the
// stylesheet inherit naturally.
export const ROLE_ACCENT: Record<AdminRole, {
  accent:     string;  // primary accent — replaces --admin-accent
  accentDim:  string;  // darker companion — replaces --admin-accent-dim
  line:       string;  // hairline rgba — replaces --admin-line
  rail:       string;  // sidebar background tint — applied as overlay
}> = {
  super:          { accent: '#D4A857', accentDim: '#A07832', line: 'rgba(212, 168, 87, 0.22)', rail: 'rgba(168, 128, 48, 0.04)' },
  ca:             { accent: '#5A8FD6', accentDim: '#1F365A', line: 'rgba(90, 143, 214, 0.22)', rail: 'rgba(31, 54, 90, 0.07)'   },
  organisateur:   { accent: '#D4A857', accentDim: '#A07832', line: 'rgba(212, 168, 87, 0.22)', rail: 'rgba(168, 128, 48, 0.04)' },
  super_benevole: { accent: '#5BA372', accentDim: '#1A4429', line: 'rgba(91, 163, 114, 0.22)', rail: 'rgba(26, 68, 41, 0.07)'   },
  benevole:       { accent: '#B0B0BA', accentDim: '#5A5A60', line: 'rgba(176, 176, 186, 0.22)', rail: 'rgba(120, 120, 130, 0.04)' },
  kitchen:        { accent: '#E3593D', accentDim: '#7A1A0F', line: 'rgba(227, 89, 61, 0.22)',  rail: 'rgba(196, 53, 30, 0.06)'  },
};
