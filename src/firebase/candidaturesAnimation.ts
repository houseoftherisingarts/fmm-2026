// ─── « J'aimerais animer » : les candidatures reçues ────────────────
// Alex, 2026-09-15 : Tristan doit pouvoir « importer les applicants,
// les personnes qui ont rempli le formulaire J'aimerais animer ». Le
// formulaire public (/animation/inscription) dépose ici; la section
// Animations de l'admin lit, écarte ou importe, et l'import crée la
// fiche d'animation correspondante.
//
//   /candidaturesAnimation/{autoId}
//
// Création ouverte à tout le monde : une troupe qui écrit au festival
// pour la première fois n'a pas de compte, et lui en demander un
// fermerait la porte avant la première phrase. Les règles Firestore
// bornent donc la forme exacte du document plutôt que l'identité de
// qui l'écrit. Le `uid` n'est là que pour les gens déjà connectés,
// et c'est lui qui permet de dire, dans l'admin, si la personne a
// déjà un compte au festival.

import {
  addDoc, collection, doc, getDocs, updateDoc,
  onSnapshot, serverTimestamp, type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { CURRENT_YEAR } from './applications';
import type { JourFestival, TypeAnimation } from './animations';

export type StatutCandidature = 'nouvelle' | 'importee' | 'ecartee';

export interface CandidatureAnimation {
  id: string;
  nom: string;
  type: TypeAnimation;
  contactNom: string;
  courriel: string;
  telephone: string;
  siteWeb?: string;
  provenance?: string;
  nbPersonnes?: number;
  description: string;
  jours: JourFestival[];
  duree?: string;
  nbPassages?: number;
  besoins?: string;
  cachetDemande?: string;
  transport?: string;
  hebergement: boolean;
  dejaVenu: boolean;
  message?: string;
  lang: 'FR' | 'EN';
  annee: number;
  uid?: string;
  statut: StatutCandidature;
  /** L'id de la fiche d'animation née de cette candidature. */
  animationId?: string;
  createdAt?: Timestamp;
}

/** Ce que le formulaire public envoie : tout sauf ce que l'admin pose. */
export type CandidatureInput = Omit<CandidatureAnimation, 'id' | 'statut' | 'animationId' | 'createdAt'>;

const COL = 'candidaturesAnimation';

const sansUndefined = (o: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(o)) if (o[k] !== undefined) out[k] = o[k];
  return out;
};

function depuisSnap(id: string, d: Record<string, unknown>): CandidatureAnimation {
  const texte = (v: unknown): string | undefined => {
    const s = typeof v === 'string' ? v.trim() : '';
    return s ? s : undefined;
  };
  const nombre = (v: unknown): number | undefined =>
    typeof v === 'number' && Number.isFinite(v) ? v : undefined;
  return {
    id,
    nom: String(d.nom ?? ''),
    type: (d.type as TypeAnimation) ?? 'autre',
    contactNom: String(d.contactNom ?? ''),
    courriel: String(d.courriel ?? ''),
    telephone: String(d.telephone ?? ''),
    siteWeb: texte(d.siteWeb),
    provenance: texte(d.provenance),
    nbPersonnes: nombre(d.nbPersonnes),
    description: String(d.description ?? ''),
    jours: Array.isArray(d.jours) ? (d.jours as JourFestival[]) : [],
    duree: texte(d.duree),
    nbPassages: nombre(d.nbPassages),
    besoins: texte(d.besoins),
    cachetDemande: texte(d.cachetDemande),
    transport: texte(d.transport),
    hebergement: Boolean(d.hebergement),
    dejaVenu: Boolean(d.dejaVenu),
    message: texte(d.message),
    lang: d.lang === 'EN' ? 'EN' : 'FR',
    annee: typeof d.annee === 'number' ? d.annee : CURRENT_YEAR,
    uid: texte(d.uid),
    statut: (d.statut as StatutCandidature) ?? 'nouvelle',
    animationId: texte(d.animationId),
    createdAt: d.createdAt as Timestamp | undefined,
  };
}

const RANG: Record<StatutCandidature, number> = { nouvelle: 0, importee: 1, ecartee: 2 };

function comparer(a: CandidatureAnimation, b: CandidatureAnimation): number {
  if (RANG[a.statut] !== RANG[b.statut]) return RANG[a.statut] - RANG[b.statut];
  const ms = (v: unknown) => (v && typeof (v as { toMillis?: () => number }).toMillis === 'function'
    ? (v as { toMillis: () => number }).toMillis() : 0);
  return ms(b.createdAt) - ms(a.createdAt);
}

/** Le dépôt du formulaire public. Rend l'id du document créé. */
export async function deposerCandidature(input: CandidatureInput): Promise<string> {
  if (!db) throw new Error('Firestore n’est pas configuré');
  const ref = await addDoc(collection(db, COL), sansUndefined({
    ...(input as unknown as Record<string, unknown>),
    statut: 'nouvelle',
    createdAt: serverTimestamp(),
  }));
  return ref.id;
}

export async function listerCandidatures(): Promise<CandidatureAnimation[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, COL));
  return snap.docs
    .map((d) => depuisSnap(d.id, d.data() as Record<string, unknown>))
    .sort(comparer);
}

export function suivreCandidatures(cb: (liste: CandidatureAnimation[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    collection(db, COL),
    (snap) => cb(
      snap.docs
        .map((d) => depuisSnap(d.id, d.data() as Record<string, unknown>))
        .sort(comparer),
    ),
    (err) => { console.warn('[candidaturesAnimation] suivre a échoué', err); cb([]); },
  );
}

/**
 * L'import : la candidature devient une fiche d'animation au statut
 * « piste », et la candidature garde la trace de la fiche née d'elle.
 * Rien n'est inventé au passage; ce que le formulaire ne demande pas
 * (cachet, montage, électricité) reste vide et attend Tristan.
 */
export async function importerCandidature(c: CandidatureAnimation): Promise<string> {
  const id = nouvelIdAnimation();
  const fiche = nouvelleFicheVide();
  const enFrancais = c.lang === 'FR';
  const notes = [
    c.duree ? `Durée d’une prestation : ${c.duree}.` : '',
    c.nbPassages ? `Passages souhaités : ${c.nbPassages}.` : '',
    c.dejaVenu ? 'Déjà venue au festival.' : '',
    c.message ? `Message reçu : ${c.message}` : '',
  ].filter(Boolean).join('\n');

  await creerAnimation(id, {
    ...fiche,
    nom: c.nom,
    type: c.type,
    statut: 'piste',
    annee: c.annee,
    contactNom: c.contactNom,
    courriel: c.courriel,
    telephone: c.telephone,
    siteWeb: c.siteWeb,
    provenance: c.provenance,
    nbPersonnes: c.nbPersonnes,
    descriptionFR: enFrancais ? c.description : '',
    descriptionEN: enFrancais ? '' : c.description,
    jours: c.jours,
    besoinsParticuliers: c.besoins,
    cachetNote: c.cachetDemande,
    transportNote: c.transport,
    hebergement: c.hebergement ? 'a-discuter' : 'aucun',
    notes: notes || undefined,
    candidatureId: c.id,
  });
  await marquerCandidature(c.id, 'importee', id);
  return id;
}

export async function marquerCandidature(
  id: string,
  statut: StatutCandidature,
  animationId?: string,
): Promise<void> {
  if (!db) throw new Error('Firestore n’est pas configuré');
  await updateDoc(doc(db, COL, id), sansUndefined({ statut, animationId }));
}
