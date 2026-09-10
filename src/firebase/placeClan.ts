// ─── Ta place dans le clan : les appels au serveur ──────────────────
// Le verdict se calcule dans le navigateur (src/lib/placeClan.ts). Tout
// ce qui regarde les autres passe par functions/placeClan.js.
import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp } from '../firebase';
import type { Archetype, Fonction, Groupe } from '../content/placeClan';
import type { Scores } from '../lib/placeClan';

export interface MembreEquipe { uid: string; nom: string; avatarHue: number | null; avatarUrl: string | null }
export interface Place { fonction: Fonction; uid: string | null; parDefaut: boolean; membre: MembreEquipe | null }
export interface ResultatClan {
  groupe: Groupe; fonction: Fonction; seconde: Fonction; archetype: Archetype;
  scores?: Scores; reponses?: number[]; clanId: string | null;
  /** Le verdict est épinglé sur la fiche du membre, sauf s'il l'a retiré. */
  badge?: boolean;
}
export interface InvitationClan { id: string; guildeId: string; nomClan: string; groupe: Groupe; de: MembreEquipe | null }
export interface EtatClan { resultat: ResultatClan | null; places: Place[] | null; invitations: InvitationClan[] }
export interface StatsClan {
  total: number; parGroupe: Record<string, number>; parFonction: Record<string, number>;
  parArchetype: Record<string, number>; croise: Record<string, number>; clans: number; equipes: number;
  invitations: { total: number; acceptees: number; refusees: number; enAttente: number };
}

function appeler<TIn extends object, TOut>(nom: string) {
  return async (data: TIn): Promise<TOut> => {
    if (!firebaseApp) throw new Error('Firebase n’est pas configuré');
    const fn = httpsCallable<TIn, TOut>(getFunctions(firebaseApp, 'us-central1'), nom);
    const { data: reponse } = await fn(data);
    return reponse;
  };
}

export const enregistrerPlace = appeler<
  { groupe: Groupe; reponses: number[]; fonction: Fonction; seconde: Fonction; archetype: Archetype; scores: Scores },
  { ok: true }
>('placeClanEnregistrer');
export const composerMonEquipe = appeler<{ exclure?: string[] }, { places: Place[]; nbCandidats: number }>('placeClanEquipe');
export const lireMaPlace = appeler<Record<string, never>, EtatClan>('placeClanLire');
export const lirePlaceDe = appeler<{ uid: string }, { resultat: ResultatClan | null; places: Place[] | null }>('placeClanProfil');
export const formerClan = appeler<{ nom: string }, { id: string; slug: string; invites: number }>('placeClanFormer');
export const repondreInvitation = appeler<{ invitationId: string; accepter: boolean }, { ok: true; guildeId: string; slug: string | null }>('placeClanRepondre');
export const statsPlaceClan = appeler<Record<string, never>, StatsClan>('placeClanStats');
export const epinglerPlace = appeler<{ afficher: boolean }, { ok: true; badge: boolean }>('placeClanBadge');

/** Le brouillon local : les réponses survivent à une connexion en cours de route. */
const CLE = 'fmm.placeClan.brouillon';
export interface Brouillon { groupe: Groupe | null; reponses: number[] }
export function lireBrouillon(): Brouillon | null {
  try { const r = localStorage.getItem(CLE); return r ? JSON.parse(r) : null; } catch { return null; }
}
export function garderBrouillon(b: Brouillon) { try { localStorage.setItem(CLE, JSON.stringify(b)); } catch { /* privé */ } }
export function effacerBrouillon() { try { localStorage.removeItem(CLE); } catch { /* privé */ } }
