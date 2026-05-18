// Extended seed data for VITE_ADMIN_DEV_BYPASS — covers all admin
// sections so the dashboard can be iterated on before Firebase is wired.

import type { UserProfile } from './applications';

const now = (offsetDays: number) => {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return { toDate: () => d, seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 };
};

// ── Users / comptes ────────────────────────────────────────────────
export interface MockUser extends UserProfile { hasBenevoleApp: boolean; hasVendorApp: boolean }

export const mockUsers: MockUser[] = [
  { uid: 'mock-b1', email: 'tristan.dubois@example.ca', displayName: 'Tristan Dubois',  phone: '514-555-0142', lang: 'FR', createdAt: now(-3) as any, hasBenevoleApp: true, hasVendorApp: false },
  { uid: 'mock-b2', email: 'maite.lavoie@example.ca',   displayName: 'Maïté Lavoie',     phone: '438-555-0907', lang: 'FR', createdAt: now(-12) as any, hasBenevoleApp: true, hasVendorApp: false },
  { uid: 'mock-b3', email: 'oceane.leclair@example.ca', displayName: 'Océane Leclair',   phone: '819-555-3344', lang: 'FR', createdAt: now(-1) as any, hasBenevoleApp: true, hasVendorApp: false },
  { uid: 'mock-b4', email: 'francois.brunet@example.ca',displayName: 'François Brunet',  phone: '450-555-7788', lang: 'FR', createdAt: now(-20) as any, hasBenevoleApp: true, hasVendorApp: false },
  { uid: 'mock-v1', email: 'azure@artisans.ca',          displayName: 'Camille Beaulieu', phone: '514-555-2233', lang: 'FR', createdAt: now(-30) as any, hasBenevoleApp: false, hasVendorApp: true },
  { uid: 'mock-v2', email: 'mandragores@atelier.ca',     displayName: 'Sève Lavigne',     phone: '450-555-9921', lang: 'FR', createdAt: now(-7) as any, hasBenevoleApp: false, hasVendorApp: true },
  { uid: 'mock-v3', email: 'forets.papilles@example.ca', displayName: 'Roxane Tessier',   phone: '819-555-4040', lang: 'FR', createdAt: now(-2) as any, hasBenevoleApp: false, hasVendorApp: true },
  { uid: 'mock-v4', email: 'frek@atelier.ca',            displayName: 'Mikaela Frank',    phone: '418-555-1010', lang: 'FR', createdAt: now(-45) as any, hasBenevoleApp: false, hasVendorApp: true },
  { uid: 'mock-u1', email: 'curieux@example.ca',         displayName: 'Pascale Hivon',                            lang: 'FR', createdAt: now(-9) as any, hasBenevoleApp: false, hasVendorApp: false },
  { uid: 'mock-u2', email: 'visiteur@example.ca',        displayName: 'Julien Marcoux',   phone: '514-555-7799', lang: 'EN', createdAt: now(-5) as any, hasBenevoleApp: false, hasVendorApp: false },
];

// ── Newsletter subscribers ────────────────────────────────────────
export interface MockSub { id: string; email: string; lang: 'FR' | 'EN'; source: string; subscribedAt: any; unsubscribed?: boolean }

export const mockSubs: MockSub[] = [
  { id: 's1',  email: 'manon.tremblay@example.ca', lang: 'FR', source: 'home',     subscribedAt: now(-1) as any },
  { id: 's2',  email: 'noah.gauthier@example.ca',  lang: 'FR', source: 'footer',   subscribedAt: now(-2) as any },
  { id: 's3',  email: 'aria.beaulieu@example.ca',  lang: 'EN', source: 'home',     subscribedAt: now(-3) as any },
  { id: 's4',  email: 'leon.allard@example.ca',    lang: 'FR', source: 'home',     subscribedAt: now(-4) as any },
  { id: 's5',  email: 'eva.bergeron@example.ca',   lang: 'FR', source: 'footer',   subscribedAt: now(-5) as any },
  { id: 's6',  email: 'felix.cote@example.ca',     lang: 'FR', source: 'home',     subscribedAt: now(-7) as any },
  { id: 's7',  email: 'rose.dion@example.ca',      lang: 'FR', source: 'home',     subscribedAt: now(-9) as any },
  { id: 's8',  email: 'olivia.fortin@example.ca',  lang: 'EN', source: 'footer',   subscribedAt: now(-12) as any },
  { id: 's9',  email: 'arthur.gagne@example.ca',   lang: 'FR', source: 'home',     subscribedAt: now(-15) as any },
  { id: 's10', email: 'mila.hebert@example.ca',    lang: 'FR', source: 'compte',   subscribedAt: now(-18) as any },
  { id: 's11', email: 'samuel.jacques@example.ca', lang: 'FR', source: 'home',     subscribedAt: now(-22) as any },
  { id: 's12', email: 'florence.king@example.ca',  lang: 'EN', source: 'footer',   subscribedAt: now(-30) as any, unsubscribed: true },
];

// ── Inbox messages (catch-all contact submissions) ───────────────
export interface MockMessage { id: string; from: string; email: string; subject: string; body: string; sentAt: any; read: boolean }

export const mockMessages: MockMessage[] = [
  {
    id: 'm1', from: 'Marie-Claude Pichette', email: 'mc.pichette@example.ca',
    subject: 'Question sur le banquet — allergies',
    body: 'Bonjour, j’aimerais savoir si le banquet du dimanche peut accommoder une allergie aux noix. Nous sommes 4 à vouloir réserver. Merci !',
    sentAt: now(-1) as any, read: false,
  },
  {
    id: 'm2', from: 'Comité culturel Petite-Nation', email: 'culture@petitenation.example.ca',
    subject: 'Partenariat médiatique 2026',
    body: 'Bonjour, le comité culturel Petite-Nation aimerait discuter d’un partenariat médiatique pour l’édition 2026. Disponibles pour un appel cette semaine.',
    sentAt: now(-3) as any, read: false,
  },
  {
    id: 'm3', from: 'Jean Lavigne', email: 'jean.lavigne@example.ca',
    subject: 'Disponibilité hébergement',
    body: 'Bonjour, je cherche à réserver pour les 3 nuits — mon yourte est elle disponible chez Le Salon des Inconnus ? Je voudrais idéalement régler dès maintenant.',
    sentAt: now(-6) as any, read: true,
  },
];

// ── Media library (placeholder pointing at our /public/wix dirs) ──
export const mockMedia: Array<{ id: string; src: string; alt: string; folder: string; sizeKb: number }> = [
  { id: 'mh1', src: '/wix/home/viking-helmet.jpg',     alt: 'Casque viking',        folder: 'home',      sizeKb: 113 },
  { id: 'mh2', src: '/wix/home/bonfire-warm.jpg',      alt: 'Scène de feu',          folder: 'home',      sizeKb: 453 },
  { id: 'mh3', src: '/wix/home/shields-blue.jpg',      alt: 'Boucliers vikings',     folder: 'home',      sizeKb: 95 },
  { id: 'mh4', src: '/wix/home/scene-cinematic.jpg',   alt: 'Scène cinématique',     folder: 'home',      sizeKb: 453 },
  { id: 'mh5', src: '/wix/home/marchand.jpg',          alt: 'Marchande',             folder: 'home',      sizeKb: 30 },
  { id: 'mh6', src: '/wix/musique/17e5523c.jpg',       alt: 'Musicien · Skarazula',  folder: 'musique',   sizeKb: 128 },
  { id: 'mh7', src: '/wix/musique/243cbf3c.jpg',       alt: 'Musicien · Arrünn',     folder: 'musique',   sizeKb: 363 },
  { id: 'mh8', src: '/wix/histoire/722a8ce4.jpg',      alt: 'Archive 2024',          folder: 'histoire',  sizeKb: 467 },
  { id: 'mh9', src: '/wix/histoire/89562353.jpg',      alt: 'Archive 2024',          folder: 'histoire',  sizeKb: 449 },
  { id: 'mh10',src: '/wix/hebergement/e1d1583b.jpg',   alt: 'Hébergement',           folder: 'hebergement', sizeKb: 419 },
  { id: 'mh11',src: '/site/carte-fmm-2025.jpg',        alt: 'Carte du site 2025',    folder: 'site',      sizeKb: 744 },
  { id: 'mh12',src: '/site/medieval-ticket.png',       alt: 'Plaque de billets',     folder: 'site',      sizeKb: 740 },
];
