// ─── Les animations du festival, le dossier de Tristan ──────────────
// Alex, 2026-09-15 : « ajouter un module à Tristan pour gérer les
// animations. Aslak, détails logistiques, coût, remboursement du
// transport, etc., et un bouton pour publier à l'horaire quand tout
// est confirmé. » Tout ce qui monte sur le site sauf la musique, qui
// reste dans l'onglet de Pitch (`groupesMusicaux`).
//
//   /animations/{id}
//
// Une fiche porte trois choses qui vivaient jusqu'ici dans la tête de
// Tristan et dans ses courriels : qui vient (contact, descriptif), ce
// que ça demande sur le terrain (espace, feu, électricité, couchage,
// repas), et ce que ça coûte (cachet, transport remboursé). La liste
// de confirmations en bas de fiche décide si le bouton « Publier à
// l'horaire » s'allume : tant qu'une case reste vide, rien ne part
// vers la page publique.

import {
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp, type Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { CURRENT_YEAR } from './applications';
import { getSchedule, setSchedule, CURRENT_SCHEDULE_YEAR, type ScheduleDay, type ScheduleItem } from './schedule';
import {
  fusionnerAlHoraire, retirerDeLHoraireJours, compterDansJours, ligneDuPassage,
} from '../lib/horaireAnimations';

export type JourFestival = 'vendredi' | 'samedi' | 'dimanche';

export const JOURS: { id: JourFestival; FR: string; EN: string }[] = [
  { id: 'vendredi', FR: 'Vendredi', EN: 'Friday' },
  { id: 'samedi',   FR: 'Samedi',   EN: 'Saturday' },
  { id: 'dimanche', FR: 'Dimanche', EN: 'Sunday' },
];

export type TypeAnimation =
  | 'troupe' | 'artiste' | 'atelier' | 'demonstration'
  | 'spectacle' | 'joute' | 'campement' | 'conte' | 'jeunesse' | 'autre';

export const TYPES_ANIMATION: { id: TypeAnimation; FR: string; EN: string }[] = [
  { id: 'troupe',        FR: 'Troupe de reconstitution', EN: 'Reenactment troupe' },
  { id: 'artiste',       FR: 'Artiste ou saltimbanque',  EN: 'Artist or performer' },
  { id: 'atelier',       FR: 'Atelier participatif',     EN: 'Hands-on workshop' },
  { id: 'demonstration', FR: 'Démonstration de métier',  EN: 'Craft demonstration' },
  { id: 'spectacle',     FR: 'Spectacle',                EN: 'Show' },
  { id: 'joute',         FR: 'Joute ou combat',          EN: 'Joust or combat' },
  { id: 'campement',     FR: 'Campement vivant',         EN: 'Living camp' },
  { id: 'conte',         FR: 'Conte et parole',          EN: 'Storytelling' },
  { id: 'jeunesse',      FR: 'Jeunesse',                 EN: 'Youth' },
  { id: 'autre',         FR: 'Autre',                    EN: 'Other' },
];

export type StatutAnimation =
  | 'piste' | 'discussion' | 'confirmee' | 'publiee' | 'refusee' | 'archivee';

export const STATUTS: { id: StatutAnimation; FR: string }[] = [
  { id: 'piste',      FR: 'Piste' },
  { id: 'discussion', FR: 'En discussion' },
  { id: 'confirmee',  FR: 'Confirmée' },
  { id: 'publiee',    FR: 'À l’horaire' },
  { id: 'refusee',    FR: 'Refusée' },
  { id: 'archivee',   FR: 'Archivée' },
];

/** Un passage de l'animation : c'est ça qui devient une ligne d'horaire. */
export interface CreneauAnimation {
  id: string;
  jour: JourFestival;
  /** « 14h00 » ou « 14h00–15h30 », la même écriture que l'horaire. */
  heure: string;
  /** Ce qui paraît à l'horaire. Vide : le nom de l'animation sert de titre. */
  titre: string;
  lieu: string;
  /** Posé quand la ligne est effectivement passée à l'horaire public. */
  publieLe?: unknown;
}

/** Les sept cases à cocher avant de pouvoir publier. */
export interface ConfirmationsAnimation {
  entente:     boolean;
  cachet:      boolean;
  transport:   boolean;
  logistique:  boolean;
  descriptif:  boolean;
  assurance:   boolean;
  creneaux:    boolean;
}

export const CONFIRMATIONS: { id: keyof ConfirmationsAnimation; FR: string; aide: string }[] = [
  { id: 'entente',    FR: 'Entente convenue',      aide: 'Entente écrite ou courriel de confirmation en main.' },
  { id: 'cachet',     FR: 'Cachet convenu',        aide: 'Le montant et le moment du paiement sont entendus des deux bords.' },
  { id: 'transport',  FR: 'Transport réglé',       aide: 'Forfait, kilométrage ou rien du tout : la question est tranchée.' },
  { id: 'logistique', FR: 'Logistique validée',    aide: 'Espace, électricité, feu, couchage et repas sont possibles sur le site.' },
  { id: 'descriptif', FR: 'Descriptif reçu',       aide: 'Le texte et la photo pour le programme sont arrivés.' },
  { id: 'assurance',  FR: 'Assurance au dossier',  aide: 'Attestation reçue, ou non requise pour cette animation.' },
  { id: 'creneaux',   FR: 'Horaire entendu',       aide: 'Les heures de passage sont confirmées avec la troupe.' },
];

export const CONFIRMATIONS_VIDES: ConfirmationsAnimation = {
  entente: false, cachet: false, transport: false,
  logistique: false, descriptif: false, assurance: false, creneaux: false,
};

export type ModeTransport = 'aucun' | 'forfait' | 'kilometrage';
export type ModeHebergement = 'aucun' | 'camping' | 'chambre' | 'a-discuter';

export interface Animation {
  id: string;
  nom: string;
  type: TypeAnimation;
  statut: StatutAnimation;
  annee: number;

  // ── Qui vient ─────────────────────────────────────────────────────
  contactNom: string;
  courriel: string;
  telephone: string;
  siteWeb?: string;
  reseaux?: string;
  provenance?: string;
  nbPersonnes?: number;

  // ── Ce qui paraît au programme ────────────────────────────────────
  descriptionFR: string;
  descriptionEN: string;
  photoUrl?: string;

  // ── Ce que ça demande sur le terrain ──────────────────────────────
  jours: JourFestival[];
  espaceRequis?: string;
  montage?: string;
  electricite?: string;
  eau: boolean;
  feu: boolean;
  son?: string;
  securite?: string;
  hebergement: ModeHebergement;
  nbCampeurs?: number;
  repasParJour?: number;
  vehicules?: number;
  besoinsParticuliers?: string;

  // ── Ce que ça coûte ───────────────────────────────────────────────
  cachet?: number;
  cachetNote?: string;
  depot?: number;
  transportMode: ModeTransport;
  transportForfait?: number;
  transportKm?: number;
  transportTauxKm?: number;
  transportNote?: string;
  repasFournis: boolean;
  hebergementFourni: boolean;
  modePaiement?: string;
  payeLe?: string;

  // ── Le reste ──────────────────────────────────────────────────────
  confirmations: ConfirmationsAnimation;
  creneaux: CreneauAnimation[];
  notes?: string;
  /** L'id de la candidature d'où la fiche a été importée, s'il y a lieu. */
  candidatureId?: string;
  publieLe?: unknown;
  ordre: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type AnimationInput = Omit<Animation, 'id' | 'createdAt' | 'updatedAt'>;

const COL = 'animations';

const sansUndefined = (o: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(o)) if (o[k] !== undefined) out[k] = o[k];
  return out;
};

const nombreOuRien = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;

const texteOuRien = (v: unknown): string | undefined => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s ? s : undefined;
};

function depuisSnap(id: string, d: Record<string, unknown>): Animation {
  const conf = (d.confirmations as Record<string, unknown> | undefined) ?? {};
  return {
    id,
    nom: String(d.nom ?? ''),
    type: (d.type as TypeAnimation) ?? 'autre',
    statut: (d.statut as StatutAnimation) ?? 'piste',
    annee: typeof d.annee === 'number' ? d.annee : CURRENT_YEAR,

    contactNom: String(d.contactNom ?? ''),
    courriel: String(d.courriel ?? ''),
    telephone: String(d.telephone ?? ''),
    siteWeb: texteOuRien(d.siteWeb),
    reseaux: texteOuRien(d.reseaux),
    provenance: texteOuRien(d.provenance),
    nbPersonnes: nombreOuRien(d.nbPersonnes),

    descriptionFR: String(d.descriptionFR ?? ''),
    descriptionEN: String(d.descriptionEN ?? ''),
    photoUrl: texteOuRien(d.photoUrl),

    jours: Array.isArray(d.jours) ? (d.jours as JourFestival[]) : [],
    espaceRequis: texteOuRien(d.espaceRequis),
    montage: texteOuRien(d.montage),
    electricite: texteOuRien(d.electricite),
    eau: Boolean(d.eau),
    feu: Boolean(d.feu),
    son: texteOuRien(d.son),
    securite: texteOuRien(d.securite),
    hebergement: (d.hebergement as ModeHebergement) ?? 'aucun',
    nbCampeurs: nombreOuRien(d.nbCampeurs),
    repasParJour: nombreOuRien(d.repasParJour),
    vehicules: nombreOuRien(d.vehicules),
    besoinsParticuliers: texteOuRien(d.besoinsParticuliers),

    cachet: nombreOuRien(d.cachet),
    cachetNote: texteOuRien(d.cachetNote),
    depot: nombreOuRien(d.depot),
    transportMode: (d.transportMode as ModeTransport) ?? 'aucun',
    transportForfait: nombreOuRien(d.transportForfait),
    transportKm: nombreOuRien(d.transportKm),
    transportTauxKm: nombreOuRien(d.transportTauxKm),
    transportNote: texteOuRien(d.transportNote),
    repasFournis: Boolean(d.repasFournis),
    hebergementFourni: Boolean(d.hebergementFourni),
    modePaiement: texteOuRien(d.modePaiement),
    payeLe: texteOuRien(d.payeLe),

    confirmations: { ...CONFIRMATIONS_VIDES, ...(conf as Partial<ConfirmationsAnimation>) },
    creneaux: Array.isArray(d.creneaux) ? (d.creneaux as CreneauAnimation[]) : [],
    notes: texteOuRien(d.notes),
    candidatureId: texteOuRien(d.candidatureId),
    publieLe: d.publieLe ?? undefined,
    ordre: typeof d.ordre === 'number' ? d.ordre : 500,
    createdAt: d.createdAt as Timestamp | undefined,
    updatedAt: d.updatedAt as Timestamp | undefined,
  };
}

const RANG_STATUT: Record<StatutAnimation, number> = {
  publiee: 0, confirmee: 1, discussion: 2, piste: 3, refusee: 4, archivee: 5,
};

function comparer(a: Animation, b: Animation): number {
  if (RANG_STATUT[a.statut] !== RANG_STATUT[b.statut]) return RANG_STATUT[a.statut] - RANG_STATUT[b.statut];
  if (a.ordre !== b.ordre) return a.ordre - b.ordre;
  return a.nom.localeCompare(b.nom, 'fr');
}

// ── Lectures ─────────────────────────────────────────────────────────

export async function listerAnimations(): Promise<Animation[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, COL));
  return snap.docs
    .map((d) => depuisSnap(d.id, d.data() as Record<string, unknown>))
    .sort(comparer);
}

/** Temps réel : la liste bouge si un autre admin touche une fiche. */
export function suivreAnimations(cb: (liste: Animation[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    collection(db, COL),
    (snap) => cb(
      snap.docs
        .map((d) => depuisSnap(d.id, d.data() as Record<string, unknown>))
        .sort(comparer),
    ),
    (err) => { console.warn('[animations] suivre a échoué', err); cb([]); },
  );
}

// ── Écritures ────────────────────────────────────────────────────────

export function nouvelIdAnimation(): string {
  if (!db) return `local-${Math.random().toString(36).slice(2, 10)}`;
  return doc(collection(db, COL)).id;
}

export function nouvelleFicheVide(): AnimationInput {
  return {
    nom: '', type: 'troupe', statut: 'piste', annee: CURRENT_YEAR,
    contactNom: '', courriel: '', telephone: '',
    descriptionFR: '', descriptionEN: '',
    jours: [], eau: false, feu: false, hebergement: 'aucun',
    transportMode: 'aucun', repasFournis: false, hebergementFourni: false,
    confirmations: { ...CONFIRMATIONS_VIDES }, creneaux: [], ordre: 500,
  };
}

export async function creerAnimation(id: string, input: AnimationInput): Promise<void> {
  if (!db) throw new Error('Firestore n’est pas configuré');
  await setDoc(doc(db, COL, id), {
    ...sansUndefined(input as unknown as Record<string, unknown>),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function majAnimation(id: string, patch: Partial<AnimationInput>): Promise<void> {
  if (!db) throw new Error('Firestore n’est pas configuré');
  await updateDoc(doc(db, COL, id), {
    ...sansUndefined(patch as unknown as Record<string, unknown>),
    updatedAt: serverTimestamp(),
  });
}

export async function supprimerAnimation(id: string): Promise<void> {
  if (!db) throw new Error('Firestore n’est pas configuré');
  await deleteDoc(doc(db, COL, id));
}

/** La photo part dans le Storage et rend son adresse publique. */
export async function televerserPhotoAnimation(id: string, fichier: File): Promise<string> {
  if (!storage) throw new Error('Storage n’est pas configuré');
  const ext = (fichier.name.split('.').pop() || 'jpg').toLowerCase();
  const r = ref(storage, `animations/${id}/photo-${Date.now()}.${ext}`);
  await uploadBytes(r, fichier);
  return getDownloadURL(r);
}

/**
 * Sème les fiches écrites dans le code (Aslak, Hullsborg, AMQ) et rend
 * le nombre de fiches créées. Ne fait rien si la collection porte déjà
 * quelque chose : le bouton se presse deux fois sans dégât.
 */
export async function semerAnimations(fiches: AnimationInput[]): Promise<number> {
  if (!db) throw new Error('Firestore n’est pas configuré');
  const existantes = await listerAnimations();
  if (existantes.length > 0) return 0;
  let n = 0;
  for (const f of fiches) {
    await creerAnimation(nouvelIdAnimation(), f);
    n += 1;
  }
  return n;
}

// ── L'argent ─────────────────────────────────────────────────────────

/** Ce que le transport coûte, selon le mode retenu. */
export function coutTransport(a: Pick<Animation, 'transportMode' | 'transportForfait' | 'transportKm' | 'transportTauxKm'>): number {
  if (a.transportMode === 'forfait') return a.transportForfait ?? 0;
  if (a.transportMode === 'kilometrage') return (a.transportKm ?? 0) * (a.transportTauxKm ?? 0);
  return 0;
}

/** Cachet plus transport : le chiffre que Tristan défend au budget. */
export function coutTotal(a: Animation): number {
  return (a.cachet ?? 0) + coutTransport(a);
}

export function enDollars(n: number): string {
  return n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 2 });
}

// ── Les confirmations ────────────────────────────────────────────────

export function casesManquantes(a: Animation): string[] {
  return CONFIRMATIONS.filter((c) => !a.confirmations[c.id]).map((c) => c.FR);
}

export function toutEstConfirme(a: Animation): boolean {
  return casesManquantes(a).length === 0;
}

/** Ce qui bloque le bouton « Publier », en clair, ou rien si la voie est libre. */
export function raisonDeBlocage(a: Animation): string | null {
  if (a.creneaux.length === 0) return 'Ajoutez au moins un passage (jour, heure, lieu) avant de publier.';
  const vides = a.creneaux.filter((c) => !c.heure.trim());
  if (vides.length > 0) return 'Un passage n’a pas d’heure : l’horaire ne peut pas l’afficher.';
  const manquantes = casesManquantes(a);
  if (manquantes.length > 0) return `Il reste à confirmer : ${manquantes.join(', ').toLowerCase()}.`;
  return null;
}

// ── Le passage à l'horaire public ────────────────────────────────────
// L'horaire vit dans un seul document (`schedule/{année}`) fait de trois
// journées, chacune portant ses lignes. Publier, c'est y glisser une
// ligne par passage, à sa place dans l'heure. Retirer, c'est enlever
// les mêmes lignes. Le champ `source` porte l'id de l'animation, mais
// la section Horaire recompose ses lignes à partir de son bloc de texte
// et l'efface au passage : la reconnaissance se fait donc d'abord sur
// le trio heure + libellé + lieu, et le `source` ne sert qu'à rattraper
// ce qui a été renommé à la main.

export function ligneDuCreneau(a: Animation, c: CreneauAnimation): ScheduleItem {
  return ligneDuPassage(a.nom, a.id, c);
}

export interface ResultatPublication {
  ajoutees: number;
  deja: number;
}

/**
 * Pousse chaque passage de l'animation dans l'horaire public, puis
 * marque la fiche comme publiée. Rejouable : une ligne déjà là n'est
 * pas écrite deux fois.
 */
export async function publierAlHoraire(
  a: Animation,
  meta: { uid: string; email: string; annee?: number },
): Promise<ResultatPublication> {
  const annee = meta.annee ?? CURRENT_SCHEDULE_YEAR;
  const docHoraire = await getSchedule(annee);
  const { jours, ajoutees, deja } = fusionnerAlHoraire(docHoraire?.days, a);

  await setSchedule(jours as ScheduleDay[], { uid: meta.uid, email: meta.email, year: annee });
  await majAnimation(a.id, {
    statut: 'publiee',
    publieLe: serverTimestamp(),
    creneaux: a.creneaux.map((c) => ({ ...c, publieLe: c.publieLe ?? Date.now() })),
  } as Partial<AnimationInput>);
  return { ajoutees, deja };
}

/** Enlève de l'horaire les lignes qui viennent de cette animation. */
export async function retirerDeLHoraire(
  a: Animation,
  meta: { uid: string; email: string; annee?: number },
): Promise<number> {
  const annee = meta.annee ?? CURRENT_SCHEDULE_YEAR;
  const docHoraire = await getSchedule(annee);
  if (!docHoraire?.days?.length) return 0;
  const { jours, retirees } = retirerDeLHoraireJours(docHoraire.days, a);

  if (retirees > 0) await setSchedule(jours as ScheduleDay[], { uid: meta.uid, email: meta.email, year: annee });
  await majAnimation(a.id, {
    statut: 'confirmee',
    creneaux: a.creneaux.map(({ publieLe: _publieLe, ...reste }) => reste),
  } as Partial<AnimationInput>);
  return retirees;
}

/**
 * Combien des passages de chaque fiche se retrouvent vraiment à
 * l'horaire, pour toute la liste d'un coup. L'horaire tient dans un
 * seul document, donc une seule lecture suffit : le compter fiche par
 * fiche relisait le même document autant de fois qu'il y a d'animations,
 * à chaque rafraîchissement de la liste.
 */
export async function compterPubliees(
  liste: Animation[],
  annee = CURRENT_SCHEDULE_YEAR,
): Promise<Record<string, number>> {
  if (liste.length === 0) return {};
  const docHoraire = await getSchedule(annee);
  return compterDansJours(docHoraire?.days, liste);
}
