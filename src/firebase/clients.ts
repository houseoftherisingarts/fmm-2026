// ─── Le registre des clients ─────────────────────────────────────────
// Alex, 2026-08-24 : « la liste des clients, regroupés par année et par
// catégorie ». Tout ce que le festival a vendu depuis 2023 dort dans des
// exports Zeffy éparpillés. Ce fichier tient le modèle commun, l'outil
// tools/importer-clients.mjs les verse dans Firestore, et la section
// d'admin les relit.
//
//   /clients/{annee__categorie__courriel}
//
// ⚠️ DONNÉES PERSONNELLES RÉELLES. Des noms, des courriels et des
// numéros de téléphone de vraies personnes. La collection se lit et
// s'écrit par l'équipe seulement (voir firestore.rules), elle n'a
// AUCUN chemin de lecture publique, et rien de tout cela ne se recopie
// dans un fichier suivi par git.
//
// La règle du registre : une personne apparaît une seule fois par année
// et par catégorie. Quelqu'un qui achète douze billets donne douze
// lignes dans l'export et une seule fiche ici, avec douze au compteur.

import {
  collection, getDocs, limit as fbLimit, orderBy, query,
} from 'firebase/firestore';
import { db } from '../firebase';

// ── Les catégories ──────────────────────────────────────────────────
export type CategorieClient = 'billets' | 'kiosques' | 'camping' | 'bal-folk' | 'mecenes';

export const CATEGORIES_CLIENT: CategorieClient[] = [
  'billets', 'kiosques', 'camping', 'bal-folk', 'mecenes',
];

export const LIBELLE_CATEGORIE: Record<CategorieClient, string> = {
  'billets':  'Billets',
  'kiosques': 'Kiosques',
  'camping':  'Camping',
  'bal-folk': 'Bal folk',
  'mecenes':  'Mécènes',
};

/** Le mot qui compte dans la colonne « quantité » de chaque catégorie. */
export const UNITE_CATEGORIE: Record<CategorieClient, [string, string]> = {
  'billets':  ['billet', 'billets'],
  'kiosques': ['kiosque', 'kiosques'],
  'camping':  ['emplacement', 'emplacements'],
  'bal-folk': ['billet', 'billets'],
  'mecenes':  ['don', 'dons'],
};

// Les trois formes de colonnes que Zeffy produit. La forme se devine
// aux en-têtes du fichier, jamais à son nom : deux exports du même
// camping peuvent sortir dans deux formes différentes selon que la
// vente passait par la billetterie ou par la boutique.
export type FormeExport = 'billets' | 'boutique' | 'dons';

/** L'année qui n'a pas pu se lire, ni dans le nom ni dans les données. */
export const ANNEE_INCONNUE = 'inconnue';

// ── La fiche ────────────────────────────────────────────────────────
export interface Client {
  /** `2026__billets__jean@exemple.com`, calculé, jamais tiré au hasard :
   *  c'est ce qui rend l'import rejouable sans dégât. */
  id: string;
  /** En minuscules, sans espaces. La clé d'unicité. */
  courriel: string;
  nom: string;
  telephone?: string;
  /** `null` quand ni le nom du fichier ni les données ne tranchent. */
  annee: number | null;
  /** Vrai quand l'année reste à confirmer par quelqu'un de l'équipe. */
  anneeAConfirmer?: boolean;
  categorie: CategorieClient;
  /** L'édition thématique, quand l'export en nomme une (Nouvelle France). */
  edition?: string;
  /** Ce qu'il a pris, en clair : « 3 × Adulte Passe Weekend ». */
  detail: string;
  /** Le total, tous articles confondus. */
  quantite: number;
  /** Le total donné, en dollars. Les mécènes seulement. */
  montant?: number;
  /** Le nombre de lignes de l'export fondues dans cette fiche. */
  lignes: number;
  dejaVenu?: boolean | null;
  /** Comment il a entendu parler du festival. */
  source?: string;
  municipalite?: string;
  /** Ce que la personne a écrit dans le formulaire de commande. */
  notes?: string;
  statut: 'confirme' | 'annule';
  /** Date d'import, posée par l'outil. */
  importe?: unknown;
}

/** Une ligne d'export, avant fusion. */
export interface LigneClient {
  courriel: string;
  nom: string;
  telephone?: string;
  annee: number | null;
  categorie: CategorieClient;
  edition?: string;
  articles?: { libelle: string; quantite: number }[];
  montant?: number;
  dejaVenu?: boolean | null;
  source?: string;
  municipalite?: string;
  notes?: string;
  annule?: boolean;
}

// ── Normalisation ───────────────────────────────────────────────────

/** Le courriel se range avant de servir de clé : minuscules, sans
 *  espaces, et vide dès qu'il ne ressemble pas à une adresse. Une clé
 *  approximative fabriquerait des doublons invisibles. */
export function normaliserCourriel(valeur: unknown): string {
  const v = String(valeur ?? '').trim().toLowerCase().replace(/\s+/g, '');
  if (!v || v === 'none' || v === 'null') return '';
  // Une arobase, un point après elle, rien d'autre à prouver ici.
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return '';
  return v;
}

/** Les espaces doubles et les espaces de bout tombent. Zeffy en laisse
 *  traîner partout, et « Jonathan  Guay » n'est pas un autre humain que
 *  « Jonathan Guay ». */
export function normaliserTexte(valeur: unknown): string {
  const v = String(valeur ?? '').trim().replace(/\s+/g, ' ');
  return v === 'None' || v === 'none' ? '' : v;
}

/** L'identifiant du document. Deux imports du même fichier écrivent au
 *  même endroit, donc rien ne se dédouble. */
export function identifiantClient(
  annee: number | null,
  categorie: CategorieClient,
  courriel: string,
): string {
  const c = normaliserCourriel(courriel);
  // La barre oblique est le seul caractère qu'un identifiant Firestore
  // refuse. Aucune adresse n'en porte, mais un export sale, oui.
  return `${annee ?? ANNEE_INCONNUE}__${categorie}__${c}`.replace(/\//g, '_');
}

/** « 3 × Prévente » se lit trois préventes. Un libellé sans compteur
 *  vaut un. Le séparateur exige une espace après lui, sans quoi
 *  « 10x20 » se lirait dix fois vingt. */
export function analyserArticle(valeur: unknown): { libelle: string; quantite: number } {
  const v = normaliserTexte(valeur);
  const m = v.match(/^(\d+)\s*[×xX]\s+(.+)$/);
  if (m) return { libelle: normaliserTexte(m[2]), quantite: Number(m[1]) || 1 };
  return { libelle: v, quantite: 1 };
}

/** Trois formes de colonnes, reconnues à ce qu'elles portent. */
export function formeDuFichier(entetes: string[]): FormeExport {
  const has = (mot: string) => entetes.some((e) => e.toLowerCase().includes(mot));
  if (has('articles')) return 'boutique';
  if (has('type de billet')) return 'billets';
  if (has('montant total')) return 'dons';
  // Rien ne colle : la forme billets est la plus répandue, et l'outil
  // d'import refusera de toute façon les lignes sans courriel.
  return 'billets';
}

/** La catégorie et l'année, lues dans le nom du fichier.
 *
 *  L'année ne se devine JAMAIS. Quand le nom ne la porte pas, cette
 *  fonction rend `null` et l'outil d'import va la chercher dans les
 *  données (une date de paiement). Quand rien ne tranche, la fiche
 *  reste marquée à confirmer et Alex décide. */
export function categorieEtAnnee(nomFichier: string): {
  categorie: CategorieClient;
  annee: number | null;
  edition?: string;
} {
  const base = String(nomFichier).replace(/\.xlsx?$/i, '');
  // Zeffy colle la date d'export à la fin : « _8-24-2026 ». Elle dit
  // quand le fichier a été tiré, pas de quelle année sont les ventes.
  const sansDate = base.replace(/_\d{1,2}-\d{1,2}-\d{4}$/, '');
  const annee = Number(sansDate.match(/(20\d\d)/)?.[1]) || null;

  const bas = sansDate.toLowerCase();
  const categorie: CategorieClient =
      /kiosque/.test(bas)                        ? 'kiosques'
    : /camping/.test(bas)                        ? 'camping'
    : /bal[\s-]?folk/.test(bas)                  ? 'bal-folk'
    : /m[ée]c[eè]ne|don(s|ateur)?\b/.test(bas)   ? 'mecenes'
    :                                              'billets';

  const edition = sansDate.match(/[ée]dition\s+(.+?)\s*$/i)?.[1];
  return { categorie, annee, edition: edition ? normaliserTexte(edition) : undefined };
}

// ── La fusion ───────────────────────────────────────────────────────

/** Le résumé lisible de ce qu'une personne a pris, du plus gros au plus
 *  petit : « 3 × Adulte Passe Weekend · 1 × Enfant Passe Weekend ». */
export function resumerArticles(articles: { libelle: string; quantite: number }[]): string {
  return [...articles]
    .sort((a, b) => b.quantite - a.quantite || a.libelle.localeCompare(b.libelle, 'fr'))
    .map((a) => `${a.quantite} × ${a.libelle}`)
    .join(' · ');
}

/** Le montant en dollars, écrit comme au Québec : « 33,01 $ ». */
export function ecrireMontant(montant: number): string {
  return `${montant.toFixed(2).replace('.', ',')} $`;
}

/**
 * Fond les lignes d'un export en fiches : une personne, une année, une
 * catégorie. Les lignes annulées ne comptent pas dans les quantités,
 * et une personne dont TOUTES les lignes sont annulées garde une fiche
 * marquée annulée plutôt que de disparaître sans laisser de trace.
 */
export function fusionnerClients(lignes: LigneClient[]): Client[] {
  const parId = new Map<string, Client & { _articles: Map<string, number>; _sources: Set<string>; _notes: Set<string> }>();

  for (const ligne of lignes) {
    const courriel = normaliserCourriel(ligne.courriel);
    if (!courriel) continue;  // Sans clé, pas de fiche.

    const id = identifiantClient(ligne.annee, ligne.categorie, courriel);
    let fiche = parId.get(id);
    if (!fiche) {
      fiche = {
        id,
        courriel,
        nom: '',
        annee: ligne.annee ?? null,
        categorie: ligne.categorie,
        detail: '',
        quantite: 0,
        lignes: 0,
        statut: 'annule',
        _articles: new Map(),
        _sources: new Set(),
        _notes: new Set(),
      };
      if (ligne.annee == null) fiche.anneeAConfirmer = true;
      parId.set(id, fiche);
    }

    fiche.lignes += 1;
    if (!fiche.nom) fiche.nom = normaliserTexte(ligne.nom);
    if (!fiche.telephone && ligne.telephone) fiche.telephone = normaliserTexte(ligne.telephone);
    if (!fiche.municipalite && ligne.municipalite) fiche.municipalite = normaliserTexte(ligne.municipalite);
    if (!fiche.edition && ligne.edition) fiche.edition = ligne.edition;
    if (ligne.source) fiche._sources.add(normaliserTexte(ligne.source));
    if (ligne.notes) fiche._notes.add(normaliserTexte(ligne.notes));

    // « Déjà venu » se souvient du oui : quelqu'un qui a coché oui une
    // fois est déjà venu, même si une autre ligne reste muette.
    if (ligne.dejaVenu === true) fiche.dejaVenu = true;
    else if (ligne.dejaVenu === false && fiche.dejaVenu !== true) fiche.dejaVenu = false;

    if (ligne.annule) continue;

    fiche.statut = 'confirme';
    for (const art of ligne.articles ?? []) {
      const libelle = normaliserTexte(art.libelle);
      if (!libelle) continue;
      fiche._articles.set(libelle, (fiche._articles.get(libelle) ?? 0) + art.quantite);
      fiche.quantite += art.quantite;
    }
    if (typeof ligne.montant === 'number' && Number.isFinite(ligne.montant)) {
      fiche.montant = Number(((fiche.montant ?? 0) + ligne.montant).toFixed(2));
      // Un don n'a pas d'article : chaque paiement compte pour un.
      if (!(ligne.articles ?? []).length) fiche.quantite += 1;
    }
  }

  return [...parId.values()].map((f) => {
    const { _articles, _sources, _notes, ...fiche } = f;
    const articles = [..._articles].map(([libelle, quantite]) => ({ libelle, quantite }));
    const sources = [..._sources].filter(Boolean);
    const notes = [..._notes].filter(Boolean).join(' · ').slice(0, 700);

    let detail = resumerArticles(articles);
    if (fiche.categorie === 'mecenes') {
      const [un, plusieurs] = UNITE_CATEGORIE.mecenes;
      const nb = fiche.quantite;
      detail = `${nb} ${nb > 1 ? plusieurs : un} · ${ecrireMontant(fiche.montant ?? 0)}`;
    }

    return {
      ...fiche,
      detail,
      ...(sources.length ? { source: sources.join(' · ') } : {}),
      ...(notes ? { notes } : {}),
    } as Client;
  });
}

// ── La lecture, côté site ───────────────────────────────────────────

const COL = 'clients';

/** Tout le registre, trié par nom. Réservé à l'équipe : la règle
 *  Firestore refuse cette collection à tout le monde d'autre. */
export async function listerClients(max = 3000): Promise<Client[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(query(collection(db, COL), orderBy('nom'), fbLimit(max)));
    return snap.docs.map((d) => ({ ...(d.data() as Client), id: d.id }));
  } catch {
    const snap = await getDocs(query(collection(db, COL), fbLimit(max)));
    return snap.docs.map((d) => ({ ...(d.data() as Client), id: d.id }));
  }
}

// ── Les regroupements de la section d'admin ─────────────────────────

const sansAccents = (v: string) =>
  v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** La recherche par nom ou par courriel, accents et casse ignorés. */
export function filtrerClients(clients: Client[], terme: string): Client[] {
  const t = sansAccents(terme.trim());
  if (!t) return clients;
  return clients.filter((c) =>
    sansAccents(c.nom || '').includes(t)
    || sansAccents(c.courriel || '').includes(t)
    || sansAccents(c.detail || '').includes(t));
}

/** Les années présentes dans le registre, de la plus récente à la plus
 *  ancienne. Les fiches sans année se rangent à la fin. */
export function anneesDuRegistre(clients: Client[]): number[] {
  const vues = new Set<number>();
  for (const c of clients) if (typeof c.annee === 'number') vues.add(c.annee);
  return [...vues].sort((a, b) => b - a);
}

/**
 * Les courriels qui ont acheté quelque chose pour l'année de référence,
 * quelle que soit la catégorie. Une commande annulée ne compte pas.
 * C'est ce qui permet d'inviter les gens des années passées sans écrire
 * à ceux qui sont déjà revenus.
 */
export function courrielsDeLAnnee(clients: Client[], annee: number): Set<string> {
  const vus = new Set<string>();
  for (const c of clients) {
    if (c.annee === annee && c.statut !== 'annule') vus.add(c.courriel);
  }
  return vus;
}
