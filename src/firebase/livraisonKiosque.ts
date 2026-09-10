// ─── Repas livrés au kiosque · le fil vers le serveur ────────────────
// Le formulaire de /kiosque/livraison n'écrit rien lui-même : il passe
// par la fonction `reserverLivraisonKiosque`, qui compte les places
// restantes, dépose la fiche et rend l'adresse de la caisse Stripe.
// Le compteur public vit dans `siteFlags/livraisonKiosque` et se lit
// en direct, pour que la page dise combien de places tiennent encore.

import { collection, doc, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, firebaseApp } from '../firebase';
import { PLACES_PILOTE, type JourId } from '../content/livraisonKiosque';

export interface DemandeLivraison {
  kiosque: string;
  contact: string;
  courriel: string;
  telephone: string;
  personnes: number;
  jours: JourId[];
  restrictions: string;
  /** La langue de la page au moment de la réservation : la confirmation
   *  et la caisse Stripe repartent dans celle-là. */
  langue: 'FR' | 'EN';
  /** Vrai quand les dix places sont prises et que la fiche rejoint la
   *  liste d'attente au lieu de passer à la caisse. */
  liste?: boolean;
}

export interface ReponseLivraison {
  url?: string;
  complet?: boolean;
  enAttente?: boolean;
}

export async function reserverLivraisonKiosque(demande: DemandeLivraison): Promise<ReponseLivraison> {
  if (!firebaseApp) throw new Error('Firebase n’est pas configuré');
  const fn = httpsCallable<DemandeLivraison, ReponseLivraison>(
    getFunctions(firebaseApp, 'us-central1'),
    'reserverLivraisonKiosque',
  );
  const { data } = await fn(demande);
  return data;
}

/** Le nombre de places encore libres, en direct. Sans document, la
 *  page montre les dix : mieux vaut une porte ouverte qu'un faux
 *  complet, et le serveur tranche de toute façon à la réservation. */
export function watchPlacesLibres(cb: (libres: number) => void): () => void {
  if (!db) { cb(PLACES_PILOTE); return () => {}; }
  return onSnapshot(
    doc(db, 'siteFlags', 'livraisonKiosque'),
    (snap) => {
      const pris = Math.max(0, Math.floor(Number((snap.data() || {}).pris) || 0));
      cb(Math.max(0, PLACES_PILOTE - pris));
    },
    () => cb(PLACES_PILOTE),
  );
}

// ── Côté admin : les fiches, en direct ───────────────────────────────

export interface FicheLivraison {
  id: string;
  kiosque: string;
  contact: string;
  courriel: string;
  telephone: string;
  personnes: number;
  jours: JourId[];
  restrictions: string;
  troisJours: boolean;
  statut: 'en-attente' | 'paye' | 'attente';
  totalCents: number;
  payeCents?: number;
  creeLe?: { toMillis: () => number };
  payeLe?: { toMillis: () => number };
}

/** Les fiches, payées d'abord, puis les trois jours devant les autres.
 *  Le tri se fait ici plutôt que dans Firestore : trois jours et dix
 *  places ne valent pas un index composite. */
export function watchLivraisons(cb: (fiches: FicheLivraison[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    collection(db, 'livraisonsKiosque'),
    (snap) => {
      const rang = { paye: 0, 'en-attente': 1, attente: 2 } as Record<string, number>;
      const fiches = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FicheLivraison, 'id'>) }));
      fiches.sort((a, b) => {
        const parStatut = (rang[a.statut] ?? 9) - (rang[b.statut] ?? 9);
        if (parStatut) return parStatut;
        const parJours = (b.jours?.length || 0) - (a.jours?.length || 0);
        if (parJours) return parJours;
        return (a.creeLe?.toMillis() || 0) - (b.creeLe?.toMillis() || 0);
      });
      cb(fiches);
    },
    () => cb([]),
  );
}
