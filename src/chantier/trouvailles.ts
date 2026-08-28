// ─── Les trouvailles : la découverte au hasard ────────────────────────
// Alex, 2026-08-28 : une visite du chantier tire au sort un objet rare
// au plus une fois par jour. Le tirage vient du SERVEUR (sinon le sac
// se remplit tout seul depuis la console du navigateur) : cette fonction
// ne fait qu'appeler la Cloud Function, patron de src/firebase/users.ts.
// Le code de la fonction (le tirage pondéré, la garde « une fois par
// jour ») est donné dans le rapport de livraison, pas ici.

import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp } from '../firebase';

/** Les chances de rareté du tirage quotidien, sur 100 — répétées ici
 *  pour que l'écran du chantier explique la règle, le vrai tirage
 *  tourne côté serveur avec les mêmes chiffres. */
export const CHANCES_TROUVAILLE: Record<'commune' | 'rare' | 'legendaire', number> = {
  commune: 70,
  rare: 25,
  legendaire: 5,
};

export interface ResultatTrouvaille {
  /** null = rien tiré cette fois (le sort ne donne pas toujours un objet), */
  objetId: string | null;
  /** ou déjà réclamée aujourd'hui. */
  dejaFaiteAujourdhui: boolean;
}

/** Tente une trouvaille pour la journée. Rappelable sans risque : le
 *  serveur refuse simplement une deuxième fois (dejaFaiteAujourdhui). */
export async function tenterUneTrouvaille(): Promise<ResultatTrouvaille> {
  if (!firebaseApp) throw new Error('Firebase n’est pas configuré');
  const fn = httpsCallable<Record<string, never>, ResultatTrouvaille>(
    getFunctions(firebaseApp, 'us-central1'), 'tenterUneTrouvaille',
  );
  const { data } = await fn({});
  return data;
}
