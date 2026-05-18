// Seed CRM data for VITE_ADMIN_DEV_BYPASS mode — lets the user iterate
// on the /admin dashboard UI without wiring Firebase. Loaded only when
// the bypass flag is on. Mutations stay in-memory for the session.

import type { BenevoleApp, VendorApp, AppStatus, VendorStatus, BenevoleTeamRole } from './applications';
import type { Team } from './teams';
import { PREMIUM_VENDORS, MARCHE_VENDORS, DIGITAL_VENDORS, type MarcheKiosk } from '../content/marche';

const now = (offsetDays: number) => {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return { toDate: () => d, seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 };
};

let _benevoles: BenevoleApp[] = [
  // ── Showcase profile — Béné Vole (dummy for /admin/benevole demo).
  {
    uid: 'mock-bene-vole', email: 'bene.vole@example.ca', displayName: 'Béné Vole',
    prenom: 'Béné', nom: 'Vole', telephone: '438-555-2626',
    message: "Bonjour ! Je m'appelle Béné Vole, c'est mon vrai nom (vraiment 😄). C'est ma première fois au festival, mais j'ai grandi dans les festivals médiévaux en Bretagne et je rêve d'en faire partie depuis que j'ai vu vos photos en 2024. Je peux faire à peu près n'importe quoi — je n'ai pas peur de me salir les mains, je conduis manuelle, et j'ai vraiment envie d'apprendre. Disponible toute la fin de semaine + montage. Si vous avez besoin de quelqu'un pour un poste imprévu, écrivez-moi.",
    status: 'pending',
    adminNotes: 'Profil de démonstration — à utiliser comme exemple pour les nouvelles candidatures.',
    year: 2026, createdAt: now(-1) as any, updatedAt: now(-1) as any,
    city: 'Montpellier, QC',
    languages: ['FR', 'EN'],
    skills: [
      'Bricolage général', 'Conduite manuelle', 'Cuisine en grande quantité',
      'Animation enfants', 'Service à la clientèle', 'Levée de poids',
    ],
    certifications: ['Permis classe 5'],
    preferredStations: ['Animation', 'Accueil', 'Entretien', 'Camping'],
    availability: {
      jeudi:    'Soir (montage 17h-23h)',
      vendredi: 'Toute la journée',
      samedi:   'Toute la journée',
      dimanche: 'Matin (jusqu’à 14h, doit partir tôt)',
    },
    tShirtSize: 'L',
    dietaryNotes: 'Aucune restriction',
    allergies: 'Aucune connue',
    emergencyContact: { name: 'Marin Vole', phone: '438-555-2627', relation: 'Conjoint·e' },
    transport: 'covoiturage',
    pastYears: [],
    hoursLogged: 0,
    assignedShifts: [],
    badges: ['Nouveau·elle', 'Énergie illimitée'],
    socials: { instagram: '@bene.vole.officiel', facebook: 'bene.vole.fmm' },
  },
  // ── Showcase profile — Léa Marchand (rich data for /admin/benevole/:uid demo).
  {
    uid: 'mock-b0', email: 'lea.marchand@example.ca', displayName: 'Léa Marchand',
    prenom: 'Léa', nom: 'Marchand', telephone: '514-555-2027',
    message: "Bénévole depuis 2022, j'adore l'ambiance du festival et l'équipe. Cette année j'aimerais essayer le bar — j'ai travaillé deux étés en pub à Dublin et j'ai mes formations RCR et service responsable d'alcool. Disponible toute la fin de semaine + montage du jeudi. Je peux apporter ma propre tenue d'époque (cuir + lin) et j'amène habituellement des biscuits maison pour l'équipe le dimanche matin :)",
    status: 'accepted', adminNotes: 'Profil exemplaire — proposer un rôle Lead Bar à terme. Toujours fiable, toujours souriante, parle aux artisans.',
    year: 2026, createdAt: now(-28) as any, updatedAt: now(-4) as any,
    city: 'Gatineau, QC',
    languages: ['FR', 'EN', 'ES'],
    skills: [
      'Service de bar', 'Service responsable d\'alcool',
      'Premiers soins', 'Accueil bilingue',
      'Conduite de chariot manuel', 'Photographie',
    ],
    certifications: ['RCR niveau C', 'Service responsable Éduc\'alcool', 'Permis classe 5'],
    preferredStations: ['Bar', 'Accueil', 'Camping'],
    availability: {
      jeudi:    'Soir (montage 16h-22h)',
      vendredi: 'Toute la journée (10h-minuit)',
      samedi:   'Toute la journée (10h-minuit)',
      dimanche: 'Toute la journée (10h-22h)',
    },
    tShirtSize: 'M',
    dietaryNotes: 'Végétarienne',
    allergies: 'Aucune',
    emergencyContact: { name: 'Olivier Marchand', phone: '514-555-2028', relation: 'Frère' },
    transport: 'voiture',
    pastYears: [2022, 2023, 2024, 2025],
    hoursLogged: 142,
    assignedShifts: [
      { day: 'Jeudi 24 sept.',    start: '16:00', end: '22:00', station: 'Montage — bars' },
      { day: 'Vendredi 25 sept.', start: '15:00', end: '23:00', station: 'Bar principal' },
      { day: 'Samedi 26 sept.',   start: '12:00', end: '20:00', station: 'Bar principal' },
      { day: 'Dimanche 27 sept.', start: '10:00', end: '17:00', station: 'Accueil' },
    ],
    badges: ['4 éditions', 'RCR', 'Bilingue', 'Service alcool'],
    socials: { instagram: '@lea.marchand', facebook: 'lea.marchand.gatineau' },
  },
  {
    uid: 'mock-b1', email: 'tristan.dubois@example.ca', displayName: 'Tristan Dubois',
    prenom: 'Tristan', nom: 'Dubois', telephone: '514-555-0142',
    message: 'Disponible vendredi soir et toute la fin de semaine. Expérience en montage de scène et bar. Costumes apportés.',
    status: 'pending', year: 2026, createdAt: now(-3) as any, updatedAt: now(-3) as any,
  },
  {
    uid: 'mock-b2', email: 'maite.lavoie@example.ca', displayName: 'Maïté Lavoie',
    prenom: 'Maïté', nom: 'Lavoie', telephone: '438-555-0907',
    message: 'Bénévole depuis 2023. Préférence pour l’accueil et la billetterie. Bilingue.',
    status: 'accepted', adminNotes: 'Confirmée pour accueil — quart vendredi 16-22h.',
    year: 2026, createdAt: now(-12) as any, updatedAt: now(-2) as any,
  },
  {
    uid: 'mock-b3', email: 'oceane.leclair@example.ca', displayName: 'Océane Leclair',
    prenom: 'Océane', nom: 'Leclair', telephone: '819-555-3344',
    message: 'Photographe — propose de couvrir l’événement bénévolement en échange d’accès complet.',
    status: 'pending', year: 2026, createdAt: now(-1) as any, updatedAt: now(-1) as any,
  },
  {
    uid: 'mock-b4', email: 'francois.brunet@example.ca', displayName: 'François Brunet',
    prenom: 'François', nom: 'Brunet', telephone: '450-555-7788',
    message: 'Disponibilité limitée au samedi seulement. Expérience en sécurité événementielle.',
    status: 'rejected', adminNotes: 'Quart trop court pour besoins sécurité ; à reconsidérer 2027.',
    year: 2026, createdAt: now(-20) as any, updatedAt: now(-10) as any,
  },
];

// Convert a marche.ts kiosk record into a VendorApp the CRM can manage.
// Premium tier defaults to `accepted` (they're already on the page);
// regular marché defaults to `accepted` with a renewal note; digital
// gets the `digital` tier. Jesse can flip tier/status from the CRM.
const seedFromKiosk = (k: MarcheKiosk, idx: number): VendorApp => ({
  uid: `mock-v-${k.id}`,
  email: k.email,
  displayName: k.name,
  kioskName: k.name,
  companyName: k.name,
  contact: k.contact,
  category: k.category,
  products: k.bioFR || k.tagFR,
  description: k.bioFR || k.tagFR,
  socials: k.href || '',
  websiteUrl: k.href || '',
  spaceSize: k.tier === 'premium' ? '10x20' : '10x10',
  kioskDimensions: k.tier === 'premium' ? '10×20 pi' : '10×10 pi',
  hasInsurance: true,
  needsElectricity: k.tier === 'premium',
  electricityNeed: k.tier === 'premium' ? 'oui' : 'phone',
  needsWater: false,
  hasParticipatedBefore: k.tier === 'premium',
  status: 'accepted',
  adminNotes: k.tier === 'premium' ? 'Pavillon premium — vitrine vedette /marche.' : k.tier === 'digital' ? 'Partenaire boutique digitale.' : 'Kiosque confirmé.',
  year: 2026,
  createdAt: now(-30 - idx) as any,
  updatedAt: now(-5) as any,
  // Public-facing display fields — drive /marche directly.
  tier:       k.tier === 'digital' ? 'digital' : k.tier === 'premium' ? 'premium' : 'marche',
  featured:   k.tier === 'premium',
  bioFR:      k.bioFR,
  bioEN:      k.bioEN,
  heroImage:  k.image,
  publicHref: k.href,
  promoCode:  k.promo,
});

let _vendors: VendorApp[] = [
  // ── Public-facing kiosks (from src/content/marche.ts) ─────────────
  ...PREMIUM_VENDORS.map(seedFromKiosk),
  ...MARCHE_VENDORS.map(seedFromKiosk),
  ...DIGITAL_VENDORS.map(seedFromKiosk),
  // ── Plus a few pending / in-flight applications for Jesse to triage
  {
    uid: 'mock-v-new-1', email: 'argile.foret@example.ca', displayName: 'Argile & Forêt',
    kioskName: 'Argile & Forêt', companyName: 'Argile & Forêt',
    contact: 'Léa Hudon', category: 'Poterie',
    products: 'Poterie en grès — bols, gobelets, lampes à huile. Première fois au festival.',
    spaceSize: '10x10', websiteUrl: 'https://argileforet.example.ca',
    hasInsurance: true, needsElectricity: false, needsWater: false,
    status: 'pending', year: 2026, tier: 'marche',
    createdAt: now(-2) as any, updatedAt: now(-2) as any,
  },
  {
    uid: 'mock-v-new-2', email: 'lutherie@example.ca', displayName: 'Lutherie Sainte-Lune',
    kioskName: 'Lutherie Sainte-Lune', companyName: 'Lutherie Sainte-Lune',
    contact: 'Yann Beaudoin', category: 'Lutherie',
    products: 'Instruments médiévaux — vielles à roue, cornemuses, flûtes. Souhaite tenir un atelier d’écoute.',
    spaceSize: '10x10', websiteUrl: '',
    hasInsurance: false, needsElectricity: true, needsWater: false,
    status: 'pending', adminNotes: 'À confirmer assurance avant acceptation finale.',
    year: 2026, tier: 'marche',
    createdAt: now(-1) as any, updatedAt: now(-1) as any,
  },
  // ── 2027 early reservation
  {
    uid: 'mock-v-2027', email: 'verreriealba@example.ca', displayName: 'Verrerie Alba',
    kioskName: 'Verrerie Alba', companyName: 'Verrerie Alba',
    contact: 'Anaïs Larochelle', category: 'Verre soufflé',
    products: 'Verre soufflé médiéval — fioles, flacons, gobelets. Réservation anticipée 2027.',
    spaceSize: '10x10', websiteUrl: 'https://verreriealba.example.ca',
    hasInsurance: true, needsElectricity: true, needsWater: false,
    status: 'pending',
    adminNotes: 'Réservation 2027 — confirmer en janvier 2027 dès ouverture des inscriptions.',
    year: 2027, tier: 'marche',
    createdAt: now(-8) as any, updatedAt: now(-8) as any,
  },
];

export function mockListBenevoles(): Promise<BenevoleApp[]> {
  return Promise.resolve([..._benevoles]);
}
export function mockGetBenevole(uid: string): Promise<BenevoleApp | null> {
  return Promise.resolve(_benevoles.find((b) => b.uid === uid) || null);
}
export function mockListVendors(): Promise<VendorApp[]> {
  return Promise.resolve([..._vendors]);
}
export function mockSetBenevoleStatus(uid: string, status: AppStatus, adminNotes?: string): Promise<void> {
  _benevoles = _benevoles.map((b) =>
    b.uid === uid ? { ...b, status, ...(adminNotes !== undefined ? { adminNotes } : {}), updatedAt: now(0) as any } : b,
  );
  return Promise.resolve();
}
export function mockSetVendorStatus(uid: string, status: VendorStatus, adminNotes?: string): Promise<void> {
  _vendors = _vendors.map((v) =>
    v.uid === uid ? { ...v, status, ...(adminNotes !== undefined ? { adminNotes } : {}), updatedAt: now(0) as any } : v,
  );
  return Promise.resolve();
}

// ─── Teams (mock) ─────────────────────────────────────────────────
// Stations mirror Maïté's actual 2025 schedule sheets (Horaire bénévole
// VENDREDI/SAMEDI/DIMANCHE). Names and ids stable across years so the
// UI can carry forward year-on-year.
let _teams: Team[] = [
  { id: 'team-accueil',         name: 'Accueil',                description: 'Billetterie, bracelets, premiers contacts.',         color: '#7aa6c9', icon: '🎟️', year: 2026, createdAt: now(-30) as any, updatedAt: now(-3) as any },
  { id: 'team-accueil-camping', name: 'Accueil camping',         description: 'Accueil des campeurs, plan du site camping.',         color: '#6fb39a', icon: '🏕️', year: 2026, createdAt: now(-30) as any, updatedAt: now(-3) as any },
  { id: 'team-bar',             name: 'Bar / Taverne',           description: 'Service, caisse, gestion des fûts.',                  color: '#c9a05a', icon: '🍺', year: 2026, createdAt: now(-30) as any, updatedAt: now(-3) as any },
  { id: 'team-bar-mobile',      name: 'Bar mobile',              description: 'Plateaux mobiles servant la foule sur le site.',      color: '#e0b873', icon: '🍯', year: 2026, createdAt: now(-30) as any, updatedAt: now(-3) as any },
  { id: 'team-securite',        name: 'Sécurité',                description: 'Patrouille, porte-fouille, premiers soins.',          color: '#d18a8a', icon: '🛡️', year: 2026, createdAt: now(-30) as any, updatedAt: now(-3) as any },
  { id: 'team-stationnement',   name: 'Stationnement',           description: 'Placement véhicules, navettes, signalétique.',        color: '#9a7eb0', icon: '🅿️', year: 2026, createdAt: now(-30) as any, updatedAt: now(-3) as any },
  { id: 'team-entretien',       name: 'Entretien du site',       description: 'Propreté, ramassage, restauration de zones.',         color: '#a09080', icon: '🧹', year: 2026, createdAt: now(-30) as any, updatedAt: now(-3) as any },
  { id: 'team-regie',           name: 'Régie',                   description: 'Régie scène : son, lumière, cues.',                    color: '#7e85b0', icon: '🎚️', year: 2026, createdAt: now(-30) as any, updatedAt: now(-3) as any },
  { id: 'team-cuisine',         name: 'Cuisine — bouffe staff',   description: 'Repas bénévoles + équipe permanente.',                color: '#b08e6f', icon: '🍲', year: 2026, createdAt: now(-30) as any, updatedAt: now(-3) as any },
  { id: 'team-banquet',         name: 'Banquet Équinoxe',         description: 'Service du banquet final dimanche.',                  color: '#c08aa0', icon: '🍷', year: 2026, createdAt: now(-30) as any, updatedAt: now(-3) as any },
];

// Seed assignments on the existing mock bénévoles so the board has body.
_benevoles = _benevoles.map((b) => {
  if (b.uid === 'mock-b0') return { ...b, teamId: 'team-bar',     teamRole: 'leader' as BenevoleTeamRole };
  if (b.uid === 'mock-b2') return { ...b, teamId: 'team-accueil', teamRole: 'leader' as BenevoleTeamRole };
  if (b.uid === 'mock-b1') return { ...b, teamId: 'team-bar',     teamRole: 'member' as BenevoleTeamRole };
  if (b.uid === 'mock-b3') return { ...b, teamId: 'team-accueil', teamRole: 'member' as BenevoleTeamRole };
  return b;
});

export function mockListTeams(year = 2026): Promise<Team[]> {
  return Promise.resolve(_teams.filter((t) => t.year === year));
}
export function mockCreateTeam(t: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const id = `team-${Math.random().toString(36).slice(2, 8)}`;
  _teams.push({ ...t, id, createdAt: now(0) as any, updatedAt: now(0) as any });
  return Promise.resolve(id);
}
export function mockUpdateTeam(id: string, patch: Partial<Omit<Team, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  _teams = _teams.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: now(0) as any } : t));
  return Promise.resolve();
}
export function mockDeleteTeam(id: string): Promise<void> {
  _teams = _teams.filter((t) => t.id !== id);
  // unassign any bénévoles still on it
  _benevoles = _benevoles.map((b) =>
    b.teamId === id ? { ...b, teamId: undefined, teamRole: undefined, updatedAt: now(0) as any } : b,
  );
  return Promise.resolve();
}
export function mockSetBenevoleTeam(uid: string, teamId: string | null, role: BenevoleTeamRole | null): Promise<void> {
  _benevoles = _benevoles.map((b) =>
    b.uid === uid
      ? { ...b, teamId: teamId || undefined, teamRole: role || undefined, updatedAt: now(0) as any }
      : b,
  );
  return Promise.resolve();
}
