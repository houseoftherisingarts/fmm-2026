// ─── Le don « sans publicité à vie » ─────────────────────────────────
// Alex, 2026-08-27 : depuis le profil, un don unique de 10 à 100 $ au
// festival, payé par Square; le webhook marque users/{uid}.sansPub et
// la personne ne voit plus jamais de publicité avec ce compte.
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const LIEN = 'https://us-central1-festivalmedieval.cloudfunctions.net/sansPubLien';
export const DONS_PROPOSES = [10, 25, 50, 100];

export async function ouvrirLienSansPub(opts: { uid: string; montant: number; courriel?: string }): Promise<string> {
  const r = await fetch(LIEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid: opts.uid, montant: opts.montant, courriel: opts.courriel || '',
      retour: window.location.origin + window.location.pathname,
    }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.url) throw new Error(d.erreur || 'Le paiement est indisponible pour le moment.');
  return d.url as string;
}

/** Le compte est-il sans publicité ? (users/{uid}.sansPub, lisible par le propriétaire) */
export function suivreSansPub(uid: string, cb: (sansPub: boolean) => void): () => void {
  if (!db) { cb(false); return () => {}; }
  return onSnapshot(doc(db, 'users', uid), (snap) => cb(Boolean(snap.data()?.sansPub)), () => cb(false));
}
