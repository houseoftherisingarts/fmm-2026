// Mariages médiévaux — gestion des cérémonies à thème sur le site
// FMM 2026. Couples réservent une cérémonie médiévale (officiant·e,
// décor, témoins, programme) durant la fin de semaine du festival.
// Wire to Firestore later.

export type MariageStatus =
  | 'demande'        // formulaire reçu, à évaluer
  | 'confirmee'      // date verrouillée, dépôt reçu
  | 'planifiee'      // contrat + détails finalisés
  | 'celebree'       // cérémonie réalisée
  | 'annulee';       // annulée

export type MariageCeremony =
  | 'paienne'        // celtique / nordique / wicca
  | 'chretienne'     // adaptation médiévale
  | 'laique'         // engagement non religieux
  | 'handfasting'    // liaison des mains (celtique)
  | 'renouvellement';

export interface MariageBooking {
  id: string;
  partner1: string;          // prénom + nom
  partner2: string;
  contactEmail: string;
  contactPhone: string;
  ceremonyType: MariageCeremony;
  date: string;              // ISO YYYY-MM-DD
  startTime: string;         // HH:MM
  durationMin: number;       // 30, 45, 60…
  guests: number;            // nombre d'invités
  location: string;          // "Chapiteau nordique", "Bosquet sacré", "Place du tournoi"
  officiant: string;         // nom de l'officiant·e
  packageName: string;       // "Couronne", "Dragon", "Sur mesure"
  packagePrice: number;      // CAD
  depositPaid: number;       // CAD
  notes?: string;
  status: MariageStatus;
  createdAt: string;         // ISO
}

export const STATUS_LABEL: Record<MariageStatus, string> = {
  demande:    'Demande',
  confirmee:  'Confirmée',
  planifiee:  'Planifiée',
  celebree:   'Célébrée',
  annulee:    'Annulée',
};
export const STATUS_TONE: Record<MariageStatus, string> = {
  demande:    'border-brass/40 bg-brass/8 text-brass',
  confirmee:  'border-blue-300/40 bg-blue-300/10 text-blue-300',
  planifiee:  'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  celebree:   'border-ivory-soft/30 bg-ivory-soft/8 text-ivory-soft',
  annulee:    'border-blush/40 bg-blush/10 text-blush',
};
export const CEREMONY_LABEL: Record<MariageCeremony, string> = {
  paienne:        'Païenne (celtique / nordique)',
  chretienne:     'Chrétienne médiévale',
  laique:         'Laïque',
  handfasting:    'Handfasting (liaison des mains)',
  renouvellement: 'Renouvellement de vœux',
};

let _bookings: MariageBooking[] = [
  {
    id: 'm-1',
    partner1: 'Élodie Tremblay', partner2: 'Maxime Dufresne',
    contactEmail: 'elodie.maxime@example.ca', contactPhone: '514-555-3344',
    ceremonyType: 'handfasting',
    date: '2026-09-26', startTime: '14:30', durationMin: 45,
    guests: 60,
    location: 'Bosquet sacré',
    officiant: 'Océane Leclair (MCC)',
    packageName: 'Dragon',
    packagePrice: 2400, depositPaid: 800,
    status: 'planifiee',
    createdAt: '2026-02-12',
    notes: 'Souhaite musique celtique live. Couronne de fleurs fournie par la mariée.',
  },
  {
    id: 'm-2',
    partner1: 'Sara Bélanger', partner2: 'Léa Marchand',
    contactEmail: 'belanger.marchand@example.ca', contactPhone: '438-555-2027',
    ceremonyType: 'paienne',
    date: '2026-09-27', startTime: '11:00', durationMin: 60,
    guests: 80,
    location: 'Chapiteau nordique',
    officiant: 'Patrice Tournoi',
    packageName: 'Couronne',
    packagePrice: 3200, depositPaid: 1600,
    status: 'confirmee',
    createdAt: '2026-01-30',
    notes: 'Cérémonie nordique avec runes. Sara apporte les anneaux forgés sur place vendredi (kiosque forge).',
  },
  {
    id: 'm-3',
    partner1: 'Jean-Philippe Royer', partner2: 'Camille Beaulieu',
    contactEmail: 'jp.camille@example.ca', contactPhone: '450-555-1188',
    ceremonyType: 'laique',
    date: '2026-09-26', startTime: '17:00', durationMin: 30,
    guests: 35,
    location: 'Place du tournoi',
    officiant: 'À assigner',
    packageName: 'Sur mesure',
    packagePrice: 1800, depositPaid: 0,
    status: 'demande',
    createdAt: '2026-04-18',
    notes: 'Couple en évaluation — souhaite cérémonie courte avant le banquet. Officiant à proposer.',
  },
  {
    id: 'm-4',
    partner1: 'Mathieu Côté', partner2: 'Annie Lefebvre',
    contactEmail: 'mathieu.annie@example.ca', contactPhone: '819-555-7700',
    ceremonyType: 'renouvellement',
    date: '2026-09-25', startTime: '19:30', durationMin: 30,
    guests: 20,
    location: 'Bosquet sacré',
    officiant: 'Océane Leclair (MCC)',
    packageName: 'Couronne',
    packagePrice: 1400, depositPaid: 700,
    status: 'planifiee',
    createdAt: '2026-03-05',
    notes: '15e anniversaire de mariage. Souhaitent renouveler vœux médiévaux à la lueur des torches.',
  },
];

let _idSeq = 100;
const nextId = () => `m-${++_idSeq}`;

// ── API ────────────────────────────────────────────────────────────
export function listMariages(): Promise<MariageBooking[]> {
  return Promise.resolve([..._bookings]);
}
export function addMariage(data: Omit<MariageBooking, 'id' | 'createdAt'>): Promise<MariageBooking> {
  const created: MariageBooking = { ...data, id: nextId(), createdAt: new Date().toISOString().slice(0, 10) };
  _bookings = [..._bookings, created];
  return Promise.resolve(created);
}
export function updateMariage(id: string, patch: Partial<Omit<MariageBooking, 'id'>>): Promise<void> {
  _bookings = _bookings.map((b) => (b.id === id ? { ...b, ...patch } : b));
  return Promise.resolve();
}
export function deleteMariage(id: string): Promise<void> {
  _bookings = _bookings.filter((b) => b.id !== id);
  return Promise.resolve();
}

// ── Derived ────────────────────────────────────────────────────────
export interface MariageTotals {
  total: number;
  confirmed: number;       // statut planifiée ou confirmée
  pending: number;         // demande
  guestsTotal: number;
  revenueBooked: number;   // sum packagePrice (statuts non annulés)
  depositReceived: number; // sum depositPaid (statuts non annulés)
  outstanding: number;     // revenueBooked - depositReceived
}

export function computeMariageTotals(items: MariageBooking[]): MariageTotals {
  const live = items.filter((b) => b.status !== 'annulee');
  return {
    total: items.length,
    confirmed: live.filter((b) => b.status === 'confirmee' || b.status === 'planifiee').length,
    pending: items.filter((b) => b.status === 'demande').length,
    guestsTotal: live.reduce((s, b) => s + b.guests, 0),
    revenueBooked: live.reduce((s, b) => s + b.packagePrice, 0),
    depositReceived: live.reduce((s, b) => s + b.depositPaid, 0),
    outstanding: live.reduce((s, b) => s + (b.packagePrice - b.depositPaid), 0),
  };
}
