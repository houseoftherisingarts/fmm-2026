// Vendor broadcast templates — the library Jesse uses to fan a single
// instruction message out to every accepted kiosk in one click.
//
// Storage shape:
//   crm/vendor-broadcasts (singleton doc)
//     templates: Record<TemplateId, BroadcastTemplate>
//     updatedAt
//     updatedBy
//
// Templates are stable IDs (defined below); when Jesse edits a template
// the doc is merged so missing/older IDs are preserved. The defaults
// live in this file so a fresh install has a ready library; reads
// merge stored values on top of defaults.

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export type BroadcastTemplateId =
  | 'welcome'
  | 'arrival'
  | 'camping'
  | 'decorum'
  | 'electricity'
  | 'safety'
  | 'schedule';

export interface BroadcastTemplate {
  /** Stable ID — also used as the URL slug for edits. */
  id:        BroadcastTemplateId;
  /** Title shown in the invitation card (e.g. "Arrival instructions"). */
  title:     string;
  /** Eyebrow shown above the title. */
  eyebrow:   string;
  /** Body paragraph(s). Newlines preserved. */
  body:      string;
  /** Optional CTA inside the card (e.g. linking to a map). */
  ctaLabel?: string;
  ctaHref?:  string;
}

// ─── Defaults ───────────────────────────────────────────────────────
// Drawn from the four chapters of VendorQuestForm so the language
// register is consistent for the recipient. Jesse can edit each via
// the pencil icon and her edits persist server-side.
export const DEFAULT_TEMPLATES: Record<BroadcastTemplateId, BroadcastTemplate> = {
  welcome: {
    id: 'welcome',
    title:   'Bienvenue dans la caravane',
    eyebrow: 'Pacte scellé',
    body:
`Votre dossier a été accepté pour le marché médiéval du FMM. Bienvenue parmi les marchands de la caravane.

Cette boîte de réception sera notre canal principal pour les consignes pratiques d’ici l’ouverture. Tu peux y répondre à tout moment — Jesse et l’équipe lisent chaque message.

Au plaisir de te recevoir sur le site.`,
    ctaLabel: 'Ouvrir mon espace',
    ctaHref:  '/compte',
  },
  arrival: {
    id: 'arrival',
    title:   'L’arrivée sur le site',
    eyebrow: 'Avant le festival',
    body:
`Le montage des kiosques commence le jeudi à 13 h. Arrivée des marchands à partir de cette heure-là — pas avant, le terrain est encore en aménagement.

À l’entrée, présente-toi à l’accueil marchand : tu recevras ta carte d’emplacement et un plan détaillé. Le déchargement se fait au pas de marche du kiosque assigné ; les véhicules quittent ensuite le site avant l’ouverture publique du vendredi 10 h.

Apporte ta confirmation par courriel (ce message suffit) et ta pièce d’identité.`,
  },
  camping: {
    id: 'camping',
    title:   'Le campement',
    eyebrow: 'Logement sur place',
    body:
`Pour les marchands qui ont coché « emplacement de camping », ton site est situé dans la zone marchande, derrière la rangée de kiosques. Identification à l’accueil le jeudi.

Feux ouverts uniquement aux foyers désignés. Eau potable disponible à 80 m. Toilettes sèches et douches solaires accessibles sur place.

Le campement reste ouvert jusqu’au lundi midi pour le démontage.`,
  },
  decorum: {
    id: 'decorum',
    title:   'Le décorum du kiosque',
    eyebrow: 'Esprit médiéval',
    body:
`Le FMM est une fête de reconstitution médiévale-fantastique. Nous demandons que chaque kiosque soit habillé en cohérence avec cet univers : tissus naturels, bois apparent, métal patiné, peu ou pas de plastique visible.

Évite :
— Les bannières imprimées en grand format (bannières manuscrites bienvenues)
— Les enseignes néon ou rétro-éclairées
— Les emballages plastique apparents (boîtes en carton ou en bois OK)

Si tu as un doute sur un élément, envoie-nous une photo ici, on te répondra.`,
  },
  electricity: {
    id: 'electricity',
    title:   'L’électricité sur le site',
    eyebrow: 'Accès limité',
    body:
`L’électricité sur le site est limitée et réservée prioritairement aux kiosques qui en ont besoin (paiement, conservation, éclairage essentiel).

Si tu as coché « oui » à l’électricité dans ton dossier : ton kiosque sera placé à proximité d’un boîtier. Apporte ta propre rallonge extérieure (50 pi minimum recommandé) et une multiprise de qualité.

Si tu as coché « charge de téléphone seulement » : une zone commune sera disponible à l’accueil marchand.`,
  },
  safety: {
    id: 'safety',
    title:   'Santé et sécurité',
    eyebrow: 'Avant l’ouverture',
    body:
`Quelques rappels essentiels avant le festival :

— Assurance responsabilité civile : obligatoire pour tout kiosque qui vend ou fait manipuler des produits. Si tu n’en as pas, contacte-nous, on a des options collectives.
— Manipulation alimentaire : permis MAPAQ pour la vente de nourriture préparée. Communique tes documents à l’avance.
— Trousse de premiers soins : un poste médical est installé sur le site. Pour toute urgence, signale-le à un bénévole en t-shirt mauve.

Numéro d’urgence pendant le festival : (à venir).`,
  },
  schedule: {
    id: 'schedule',
    title:   'L’horaire du marché',
    eyebrow: 'Heures d’ouverture',
    body:
`Voici l’horaire officiel des allées marchandes pour l’édition 2026 :

— Vendredi 25 septembre : 10 h — 22 h
— Samedi 26 septembre : 9 h — 23 h (cérémonie d’ouverture à 11 h, défilé à 19 h)
— Dimanche 27 septembre : 10 h — 17 h (fermeture officielle à 17 h, démontage 17 h–22 h)

Présence obligatoire pendant les heures d’ouverture. Pauses entre marchands voisins encouragées — entends-toi avec ton ou ta voisine.`,
  },
};

const DOC_PATH = ['crm', 'vendor-broadcasts'] as const;

/**
 * Load the broadcast template library. Returns defaults if the doc
 * doesn't exist yet, or if Firestore isn't configured. Stored values
 * are merged on top of defaults so new template IDs added in code show
 * up automatically without overwriting Jesse's edits.
 */
export async function loadBroadcastTemplates(): Promise<Record<BroadcastTemplateId, BroadcastTemplate>> {
  if (!db) return DEFAULT_TEMPLATES;
  try {
    const snap = await getDoc(doc(db, DOC_PATH[0], DOC_PATH[1]));
    if (!snap.exists()) return DEFAULT_TEMPLATES;
    const stored = (snap.data().templates || {}) as Partial<Record<BroadcastTemplateId, BroadcastTemplate>>;
    const merged: Record<BroadcastTemplateId, BroadcastTemplate> = { ...DEFAULT_TEMPLATES };
    (Object.keys(DEFAULT_TEMPLATES) as BroadcastTemplateId[]).forEach((id) => {
      if (stored[id]) merged[id] = { ...DEFAULT_TEMPLATES[id], ...stored[id], id };
    });
    return merged;
  } catch (err) {
    console.warn('[broadcasts] load failed, using defaults', err);
    return DEFAULT_TEMPLATES;
  }
}

/**
 * Persist a single template edit. Merges into the doc so other
 * templates aren't disturbed.
 */
export async function saveBroadcastTemplate(
  tpl: BroadcastTemplate,
  editorUid: string,
): Promise<void> {
  if (!db) throw new Error('Firestore not configured');
  await setDoc(
    doc(db, DOC_PATH[0], DOC_PATH[1]),
    {
      templates: { [tpl.id]: tpl },
      updatedAt: serverTimestamp(),
      updatedBy: editorUid,
    },
    { merge: true },
  );
}
