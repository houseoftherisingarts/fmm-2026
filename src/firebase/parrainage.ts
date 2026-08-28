// ─── Le parrainage ───────────────────────────────────────────────────
// Alex, 2026-08-28 : chacun porte un code unique. Quelqu'un qui se crée
// un compte peut le donner, et l'arbre des filleuls se dessine.
//
//   /codesParrain/{code}        { uid }            la table d'unicité
//   /parrainages/{filleulUid}   { parrainUid, code, creeLe }
//   /users/{uid}.filleuls       le compte, écrit par la fonction serveur
//
// Le compteur ne se touche JAMAIS depuis le navigateur : sans quoi
// n'importe qui s'offrirait vingt filleuls et le billet qui vient avec.
// La fonction `parrainageFilleul` (functions/index.js) le tient à jour,
// décerne les badges, ouvre le compte VIP à dix et note le billet à
// vingt.

import {
  collection, doc, getDoc, getDocs, query, setDoc, where, onSnapshot,
  serverTimestamp, type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface Parrainage {
  filleulUid: string;
  parrainUid: string;
  code: string;
  /** Recopié à la création, pour afficher l'arbre sans lire chaque fiche. */
  filleulNom?: string;
  creeLe: Timestamp | null;
}

/** Les paliers, tels qu'Alex les a dictés. */
export const PALIERS_PARRAINAGE = [
  { filleuls: 1,  cleFR: 'Un premier filleul',        cleEN: 'A first godchild',      recompenseFR: 'Le badge du parrainage',          recompenseEN: 'The sponsorship badge' },
  { filleuls: 5,  cleFR: 'Cinq filleuls',             cleEN: 'Five godchildren',      recompenseFR: 'Le badge « Le Parrain »',         recompenseEN: 'The “Godfather” badge' },
  { filleuls: 10, cleFR: 'Dix filleuls',              cleEN: 'Ten godchildren',       recompenseFR: 'Le compte VIP, à vie',            recompenseEN: 'The VIP account, for life' },
  { filleuls: 20, cleFR: 'Vingt filleuls',            cleEN: 'Twenty godchildren',    recompenseFR: 'Un billet du festival, offert',   recompenseEN: 'A festival ticket, on the house' },
];

// Sans I, O, 0 ni 1 : un code se lit à voix haute sans se tromper.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const tirerCode = (n = 6) =>
  Array.from({ length: n }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

/** Le code de la personne, créé à la première visite de son espace. */
export async function monCodeParrain(uid: string): Promise<string> {
  if (!db) throw new Error('Firestore non configuré');
  const fiche = await getDoc(doc(db, 'users', uid));
  const deja = fiche.exists() ? (fiche.data().codeParrain as string | undefined) : undefined;
  if (deja) return deja;
  // Cinq essais suffisent largement : l'alphabet donne un milliard de
  // codes, et la table d'unicité tranche les rares collisions.
  for (let i = 0; i < 5; i++) {
    const code = tirerCode();
    const place = doc(db, 'codesParrain', code);
    if ((await getDoc(place)).exists()) continue;
    await setDoc(place, { uid, creeLe: serverTimestamp() });
    await setDoc(doc(db, 'users', uid), { codeParrain: code }, { merge: true });
    return code;
  }
  throw new Error('Le code ne s’est pas généré. Réessayez dans un instant.');
}

/** À qui appartient ce code ? Rend l'uid du parrain, ou null. */
export async function parrainDuCode(code: string): Promise<string | null> {
  if (!db || !code.trim()) return null;
  const snap = await getDoc(doc(db, 'codesParrain', code.trim().toUpperCase()));
  return snap.exists() ? ((snap.data().uid as string) || null) : null;
}

/**
 * La personne qui vient de créer son compte déclare son parrain. Une
 * seule fois dans sa vie : le document porte son propre identifiant et
 * la règle refuse toute réécriture.
 */
export async function declarerMonParrain(filleulUid: string, filleulNom: string, code: string): Promise<'ok' | 'inconnu' | 'soi-meme' | 'deja'> {
  if (!db) return 'inconnu';
  const parrainUid = await parrainDuCode(code);
  if (!parrainUid) return 'inconnu';
  if (parrainUid === filleulUid) return 'soi-meme';
  const place = doc(db, 'parrainages', filleulUid);
  if ((await getDoc(place)).exists()) return 'deja';
  await setDoc(place, {
    filleulUid, parrainUid, code: code.trim().toUpperCase(), filleulNom,
    creeLe: serverTimestamp(),
  });
  return 'ok';
}

/** Mes filleuls, en direct. */
export function suivreMesFilleuls(uid: string, cb: (rows: Parrainage[]) => void): () => void {
  if (!db) { cb([]); return () => {}; }
  const q = query(collection(db, 'parrainages'), where('parrainUid', '==', uid));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({ ...(d.data() as Parrainage) }));
    rows.sort((a, b) => (b.creeLe?.toMillis?.() ?? 0) - (a.creeLe?.toMillis?.() ?? 0));
    cb(rows);
  }, () => cb([]));
}

/** Le rang suivant de l'arbre : les filleuls de mes filleuls. */
export async function filleulsDeMesFilleuls(uids: string[]): Promise<Record<string, Parrainage[]>> {
  if (!db || uids.length === 0) return {};
  const par: Record<string, Parrainage[]> = {};
  // `in` accepte trente valeurs par requête.
  for (let i = 0; i < uids.length; i += 30) {
    const lot = uids.slice(i, i + 30);
    const snap = await getDocs(query(collection(db, 'parrainages'), where('parrainUid', 'in', lot)));
    snap.docs.forEach((d) => {
      const p = d.data() as Parrainage;
      (par[p.parrainUid] ||= []).push(p);
    });
  }
  return par;
}

/** Mon parrain, s'il y en a un. */
export async function monParrain(uid: string): Promise<Parrainage | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'parrainages', uid));
  return snap.exists() ? (snap.data() as Parrainage) : null;
}
