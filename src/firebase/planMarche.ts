// ─── Le plan du marché · les kiosques et qui s'y tient ───────────────
// Alex, 12 septembre 2026 : Jesse (Master Kiosque) doit voir une carte
// des kiosques, dire pour chacun son prix, s'il a de l'électricité, la
// qualité du wifi et s'il prend l'option des repas livrés, puis glisser
// les marchands acceptés sur les kiosques et les échanger entre eux.
// L'exposant, dans son espace, voit le kiosque qui lui est attribué.
//
// Tant que Jesse n'a pas dessiné la carte, le plan se lit en trois
// rangées. Le jour où sa photo arrive, elle se dépose ici même et
// chaque kiosque reçoit une position en pourcentage de l'image, ce qui
// tient peu importe la largeur de l'écran qui la regarde.
//
// Tout le plan d'une année vit dans UN document, planMarche/{annee},
// pour qu'un échange de deux marchands soit une seule écriture et
// qu'aucun kiosque ne se retrouve avec deux occupants entre deux
// lectures. Lecture pour tout compte connecté (l'exposant y trouve son
// kiosque), écriture pour l'équipe et les rôles admin.

import {
  doc, onSnapshot, runTransaction, serverTimestamp,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { db, storage } from '../firebase';
import { versWebp } from './photosPubliques';
import { planParDefaut, normaliserKiosque, type CartePlan, type PlanMarche } from '../lib/planMarche';

export * from '../lib/planMarche';
// ── Firestore ────────────────────────────────────────────────────────

const planDoc = (annee: number) => doc(db!, 'planMarche', String(annee));

/** Lit un document brut de Firestore (ou son absence) et rend un plan
 *  complet : le même repli sert la lecture en direct et la transaction
 *  de sauvegarde ci-dessous. */
function depuisDoc(annee: number, d: Partial<PlanMarche> | undefined): PlanMarche {
  if (!d) return planParDefaut(annee);
  return {
    annee,
    rangees: Array.isArray(d.rangees) ? d.rangees : [],
    kiosques: Array.isArray(d.kiosques) ? d.kiosques.map(normaliserKiosque) : [],
    carte: d.carte ?? null,
    maj: d.maj,
  };
}

/** Le plan en direct. Sans document, le plan par défaut : trois
 *  rangées de huit, que la première sauvegarde de Jesse remplace. */
export function watchPlanMarche(
  annee: number,
  cb: (plan: PlanMarche, existe: boolean) => void,
): () => void {
  if (!db) { cb(planParDefaut(annee), false); return () => {}; }
  return onSnapshot(
    planDoc(annee),
    (snap) => {
      if (!snap.exists()) { cb(planParDefaut(annee), false); return; }
      cb(depuisDoc(annee, snap.data() as Partial<PlanMarche>), true);
    },
    (err) => { console.warn('[planMarche] lecture refusée', err); cb(planParDefaut(annee), false); },
  );
}

/** Applique `mut` au plan tel qu'il est vraiment sur le serveur à l'instant
 *  de l'écriture, dans une transaction Firestore, plutôt que d'écraser le
 *  document avec une copie locale déjà périmée. Deux admins qui déplacent
 *  chacun un marchand à la même seconde repartent donc tous les deux du
 *  geste de l'autre au lieu de l'effacer sans le savoir. */
export async function sauverPlanMarche(annee: number, mut: (planActuel: PlanMarche) => PlanMarche): Promise<void> {
  if (!db) throw new Error('Firestore n’est pas configuré');
  await runTransaction(db, async (tx) => {
    const ref = planDoc(annee);
    const snap = await tx.get(ref);
    const actuel = depuisDoc(annee, snap.exists() ? (snap.data() as Partial<PlanMarche>) : undefined);
    const suivant = mut(actuel);
    const kiosques = suivant.kiosques.map((k) => {
      const propre: Record<string, unknown> = {};
      for (const [cle, v] of Object.entries(k)) if (v !== undefined) propre[cle] = v;
      return propre;
    });
    tx.set(ref, {
      annee: suivant.annee,
      rangees: suivant.rangees,
      kiosques,
      carte: suivant.carte ?? null,
      maj: serverTimestamp(),
    });
  });
}

/** La photo de la carte de Jesse : réduite en WebP de 2560 px de côté
 *  et déposée dans plan-marche/{annee}/carte.webp. Rend ce qu'il faut
 *  écrire dans plan.carte. */
export async function televerserCartePlan(
  annee: number,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<CartePlan> {
  if (!storage) throw new Error('Le stockage n’est pas configuré');
  const { blob, largeur, hauteur } = await versWebp(file, 2560, 0.86);
  const chemin = `plan-marche/${annee}/carte.webp`;
  const task = uploadBytesResumable(ref(storage, chemin), blob, { contentType: 'image/webp' });
  await new Promise<void>((resolve, reject) => {
    task.on(
      'state_changed',
      (s) => onProgress?.(Math.round((s.bytesTransferred / Math.max(1, s.totalBytes)) * 100)),
      reject,
      () => resolve(),
    );
  });
  const url = await getDownloadURL(task.snapshot.ref);
  return { url, chemin, largeur, hauteur };
}
