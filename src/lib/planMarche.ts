// ─── Le plan du marché · la logique pure ─────────────────────────────
// Aucun import ici : ce fichier se teste tel quel (planMarche.test.ts)
// et sert autant l'admin que l'espace de l'exposant. Le fil vers
// Firestore vit dans src/firebase/planMarche.ts, qui réexporte tout.
//
// Alex, 12 septembre 2026 : Jesse (Master Kiosque) doit voir une carte
// des kiosques, dire pour chacun son prix, s'il a de l'électricité, la
// qualité du wifi et s'il prend l'option des repas livrés, puis glisser
// les marchands acceptés sur les kiosques et les échanger entre eux.
// Tant que la carte n'est pas dessinée, le plan se lit en trois rangées.
// Chaque fonction rend un plan neuf, jamais muté.

export type QualiteWifi = 'bon' | 'moyen' | 'faible' | 'aucun';

export interface Rangee {
  id: string;
  nom: string;
}

export interface Kiosque {
  id: string;
  rangeeId: string;
  /** Rang dans la rangée, à partir de 1. */
  numero: number;
  /** Ce qui s'affiche : « R1-03 ». */
  code: string;
  /** Prix du kiosque, en cents, avant taxes. Absent tant que Jesse ne l'a pas posé. */
  prixCents?: number;
  electricite: boolean;
  wifi: QualiteWifi;
  /** L'option des repas livrés au kiosque (le service du Salon des
   *  Inconnus). Jesse la coche à la main ; la fiche payée de
   *  livraisonsKiosque la suggère. */
  nourriture: boolean;
  /** Le marchand qui s'y tient : l'uid de vendors/{uid}. */
  vendorUid?: string | null;
  /** Position sur la photo de la carte, en pourcentage de sa largeur et
   *  de sa hauteur. Absents tant que la carte n'est pas posée. */
  x?: number;
  y?: number;
  note?: string;
}

export interface CartePlan {
  url: string;
  chemin: string;
  largeur: number;
  hauteur: number;
}

export interface PlanMarche {
  annee: number;
  rangees: Rangee[];
  kiosques: Kiosque[];
  /** La photo de la carte dessinée par Jesse, une fois déposée. */
  carte?: CartePlan | null;
  /** Horodatage Firestore de la dernière sauvegarde. */
  maj?: { toDate(): Date } | null;
}

export const WIFI: Array<{ id: QualiteWifi; FR: string; EN: string }> = [
  { id: 'bon',    FR: 'Bon wifi',     EN: 'Good wifi' },
  { id: 'moyen',  FR: 'Wifi moyen',   EN: 'Average wifi' },
  { id: 'faible', FR: 'Wifi faible',  EN: 'Weak wifi' },
  { id: 'aucun',  FR: 'Sans wifi',    EN: 'No wifi' },
];

// ── Fabrique ─────────────────────────────────────────────────────────

export const KIOSQUES_PAR_RANGEE = 8;

export function codeKiosque(rangeeIndex: number, numero: number): string {
  return `R${rangeeIndex + 1}-${String(numero).padStart(2, '0')}`;
}

export function nouveauKiosque(rangees: Rangee[], rangeeId: string, numero: number): Kiosque {
  const idx = Math.max(0, rangees.findIndex((r) => r.id === rangeeId));
  return {
    id: `${rangeeId}-${numero}`,
    rangeeId,
    numero,
    code: codeKiosque(idx, numero),
    electricite: false,
    wifi: 'moyen',
    nourriture: false,
    vendorUid: null,
  };
}

/** Trois rangées de huit, en attendant la carte de Jesse. */
export function planParDefaut(annee: number): PlanMarche {
  const rangees: Rangee[] = [
    { id: 'r1', nom: 'Rangée 1' },
    { id: 'r2', nom: 'Rangée 2' },
    { id: 'r3', nom: 'Rangée 3' },
  ];
  const kiosques: Kiosque[] = [];
  for (const r of rangees) {
    for (let n = 1; n <= KIOSQUES_PAR_RANGEE; n++) kiosques.push(nouveauKiosque(rangees, r.id, n));
  }
  return { annee, rangees, kiosques, carte: null };
}

// ── Logique pure : chaque fonction rend un plan neuf, jamais muté ─────

export function kiosquesDeRangee(plan: PlanMarche, rangeeId: string): Kiosque[] {
  return plan.kiosques
    .filter((k) => k.rangeeId === rangeeId)
    .sort((a, b) => a.numero - b.numero);
}

export function kiosqueDe(plan: PlanMarche | null | undefined, vendorUid: string): Kiosque | null {
  if (!plan) return null;
  return plan.kiosques.find((k) => k.vendorUid === vendorUid) ?? null;
}

/** Pose un marchand sur un kiosque. S'il en occupait un autre, il le
 *  quitte ; si le kiosque visé était occupé, l'ancien occupant prend la
 *  place que le nouveau vient de laisser (c'est l'échange par glisser),
 *  ou se retrouve sans kiosque si le nouveau n'en avait pas. */
export function assigner(plan: PlanMarche, kiosqueId: string, vendorUid: string | null): PlanMarche {
  const cible = plan.kiosques.find((k) => k.id === kiosqueId);
  if (!cible) return plan;
  const origine = vendorUid ? plan.kiosques.find((k) => k.vendorUid === vendorUid && k.id !== kiosqueId) : undefined;
  const deplace = cible.vendorUid ?? null;
  const kiosques = plan.kiosques.map((k) => {
    if (k.id === kiosqueId) return { ...k, vendorUid };
    if (origine && k.id === origine.id) return { ...k, vendorUid: deplace };
    return k;
  });
  return { ...plan, kiosques };
}

/** Échange les occupants de deux kiosques, occupés ou non. */
export function echanger(plan: PlanMarche, aId: string, bId: string): PlanMarche {
  if (aId === bId) return plan;
  const a = plan.kiosques.find((k) => k.id === aId);
  const b = plan.kiosques.find((k) => k.id === bId);
  if (!a || !b) return plan;
  const kiosques = plan.kiosques.map((k) => {
    if (k.id === aId) return { ...k, vendorUid: b.vendorUid ?? null };
    if (k.id === bId) return { ...k, vendorUid: a.vendorUid ?? null };
    return k;
  });
  return { ...plan, kiosques };
}

export function liberer(plan: PlanMarche, kiosqueId: string): PlanMarche {
  return assigner(plan, kiosqueId, null);
}

/** Le document planMarche/{annee} est unique pour tout le marché : une note
 *  sans borne finirait par bloquer la sauvegarde de toute l'équipe en heurtant
 *  la limite de 1 Mo de Firestore. La règle côté serveur porte la même borne. */
export const NOTE_MAX_LEN = 500;

export function modifierKiosque(plan: PlanMarche, kiosqueId: string, patch: Partial<Omit<Kiosque, 'id' | 'rangeeId' | 'vendorUid'>>): PlanMarche {
  const patchBorne = patch.note != null ? { ...patch, note: patch.note.slice(0, NOTE_MAX_LEN) } : patch;
  return {
    ...plan,
    kiosques: plan.kiosques.map((k) => (k.id === kiosqueId ? { ...k, ...patchBorne } : k)),
  };
}

/** Ajoute un kiosque en bout de rangée. */
export function ajouterKiosque(plan: PlanMarche, rangeeId: string): PlanMarche {
  const existants = kiosquesDeRangee(plan, rangeeId);
  const numero = (existants[existants.length - 1]?.numero ?? 0) + 1;
  return { ...plan, kiosques: [...plan.kiosques, nouveauKiosque(plan.rangees, rangeeId, numero)] };
}

/** Retire le dernier kiosque de la rangée. Un kiosque occupé ne se
 *  retire pas : on libère d'abord. */
export function retirerDernierKiosque(plan: PlanMarche, rangeeId: string): PlanMarche {
  const existants = kiosquesDeRangee(plan, rangeeId);
  const dernier = existants[existants.length - 1];
  if (!dernier || dernier.vendorUid) return plan;
  return { ...plan, kiosques: plan.kiosques.filter((k) => k.id !== dernier.id) };
}

export function ajouterRangee(plan: PlanMarche, nom?: string): PlanMarche {
  const n = plan.rangees.length + 1;
  const rangee: Rangee = { id: `r${n}-${Math.random().toString(36).slice(2, 6)}`, nom: nom || `Rangée ${n}` };
  const rangees = [...plan.rangees, rangee];
  const kiosques = [...plan.kiosques];
  for (let i = 1; i <= KIOSQUES_PAR_RANGEE; i++) kiosques.push(nouveauKiosque(rangees, rangee.id, i));
  return { ...plan, rangees, kiosques };
}

export function renommerRangee(plan: PlanMarche, rangeeId: string, nom: string): PlanMarche {
  return { ...plan, rangees: plan.rangees.map((r) => (r.id === rangeeId ? { ...r, nom } : r)) };
}

/** Une rangée vide de marchands se retire avec ses kiosques. */
export function retirerRangee(plan: PlanMarche, rangeeId: string): PlanMarche {
  if (plan.kiosques.some((k) => k.rangeeId === rangeeId && k.vendorUid)) return plan;
  return {
    ...plan,
    rangees: plan.rangees.filter((r) => r.id !== rangeeId),
    kiosques: plan.kiosques.filter((k) => k.rangeeId !== rangeeId),
  };
}

/** Pose (ou déplace) un kiosque sur la photo, en pourcentage. */
export function placerSurCarte(plan: PlanMarche, kiosqueId: string, x: number, y: number): PlanMarche {
  const borne = (v: number) => Math.min(100, Math.max(0, Math.round(v * 10) / 10));
  return modifierKiosque(plan, kiosqueId, { x: borne(x), y: borne(y) });
}

/** Les kiosques que Jesse n'a pas encore posés sur la photo. */
export function kiosquesSansPosition(plan: PlanMarche): Kiosque[] {
  return plan.kiosques.filter((k) => k.x == null || k.y == null);
}

export function prixAffiche(cents: number | undefined, lang: 'FR' | 'EN' = 'FR'): string {
  if (cents == null) return lang === 'FR' ? 'Prix à venir' : 'Price to come';
  const v = (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
  return lang === 'FR' ? `${v.replace('.', ',')} $` : `$${v}`;
}
