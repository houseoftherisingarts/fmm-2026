// ─── Plan du marché · petits calculs partagés ────────────────────────
// Rien de propre à Firestore ici : uniquement des lectures croisées
// entre le plan, les marchands et les fiches de livraison, dont se
// servent PlanMarcheSection et ses sous-composants.

import type { VendorApp } from '../../../../firebase/applications';
import type { FicheLivraison } from '../../../../firebase/livraisonKiosque';

/** Ce qu'un marchand ou un kiosque tient « en main » pendant la pose
 *  tactile : toucher l'un, puis toucher un kiosque pour le poser ou
 *  l'échanger. Nul quand rien n'est sélectionné. */
export type CibleEnMain =
  | { type: 'vendor'; uid: string }
  | { type: 'kiosque'; id: string }
  | null;

/** La fiche de livraison d'un marchand, retrouvée par courriel puis
 *  par le nom du kiosque : les deux champs que le formulaire public
 *  demande, dans le même ordre que la logique déjà décrite dans
 *  firebase/livraisonKiosque.ts. */
export function ficheDeVendor(vendor: VendorApp, fiches: FicheLivraison[]): FicheLivraison | null {
  const courriel = vendor.email?.toLowerCase();
  return (
    fiches.find((f) => courriel && f.courriel?.toLowerCase() === courriel) ||
    fiches.find((f) => f.kiosque === vendor.kioskName) ||
    null
  );
}

/** L'option nourriture est prise dès que la fiche a passé la caisse ou
 *  l'attend : seule une fiche en liste d'attente ne compte pas encore. */
export function optionNourriturePrise(fiche: FicheLivraison | null): boolean {
  return !!fiche && (fiche.statut === 'paye' || fiche.statut === 'en-attente');
}

export function besoinElectriciteLabel(v: VendorApp): string {
  if (v.electricityNeed === 'oui') return '100 % requis';
  if (v.electricityNeed === 'phone') return 'Charge téléphone';
  if (v.electricityNeed === 'non') return 'Aucun';
  return v.needsElectricity ? 'Requis (ancien formulaire)' : 'Non précisé';
}

export function nomAffiche(v: VendorApp): string {
  return v.companyName || v.kioskName || v.contact || v.email;
}
