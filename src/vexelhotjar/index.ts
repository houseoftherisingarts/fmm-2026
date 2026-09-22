// ─── VexelHotjar : le point d'entrée du site ────────────────────────────────
// La bannière de consentement appelle `activerVexelHotjar()` quand la
// visiteuse accepte les témoins (et au chargement suivant si elle a déjà
// accepté). Les réglages posés dans l'admin (`settings/vexelhotjar`) disent
// si la mesure est allumée, quelle part des visites s'enregistre et quels
// chemins s'ignorent; à défaut, la mesure tourne sans enregistrement.

import { doc, getDoc } from 'firebase/firestore';
import { db, isFirebaseReady } from '../firebase';
import { demarrerVexelHotjar } from './tracker';

export const SITE_VEXELHOTJAR = 'fmm';

export interface ReglagesVexelHotjar {
  actif: boolean;
  echantillonReplay: number;      // 0 à 1
  exclure: string[];
  entonnoirs?: { id: string; nom: string; etapes: string[] }[];
}

export const REGLAGES_DEFAUT: ReglagesVexelHotjar = { actif: true, echantillonReplay: 0.25, exclure: ['/admin'] };

let lance = false;

export async function activerVexelHotjar() {
  if (lance || typeof window === 'undefined' || !isFirebaseReady || !db) return;
  lance = true;
  let r = REGLAGES_DEFAUT;
  try {
    const snap = await getDoc(doc(db, 'settings', 'vexelhotjar'));
    if (snap.exists()) r = { ...REGLAGES_DEFAUT, ...(snap.data() as Partial<ReglagesVexelHotjar>) };
  } catch { /* les réglages par défaut suffisent */ }
  if (!r.actif) return;
  demarrerVexelHotjar({
    site: SITE_VEXELHOTJAR,
    exclure: r.exclure,
    echantillonReplay: r.echantillonReplay,
    chargerReplay: () => import('./replay'),
  });
}
