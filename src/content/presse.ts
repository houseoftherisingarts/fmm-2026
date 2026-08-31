// ─── Le kit de presse, côté site ────────────────────────────────────
// Les fichiers vivent dans public/presse/ et se refabriquent d'une
// commande : `node scripts/presse/build-kit.mjs`. Les noms ci-dessous
// suivent ceux de scripts/presse/cards.mjs et scripts/presse/photos.mjs.
// Toucher l'un sans l'autre casse la page.
//
// Chaque entrée porte deux chemins : la vignette WebP de 640 px que la
// tuile affiche, et le PNG 1920 × 1080 que le bouton télécharge. Servir
// deux cents PNG pleine résolution dans une grille ferait des centaines
// de mégaoctets par visite.
//
// Depuis le 2026-08-31, chaque visuel existe en quatre versions et la
// tuile bascule de l'une à l'autre :
//   `file`     la carte avec son texte, dans la langue de la page
//   `fileNu`   la photographie seule, blason, adresse et signature
//   `-qr`      l'une ou l'autre, avec un code QR en bas à gauche
// La version avec texte mène à la page du site qui traite du sujet, la
// version nue mène à l'accueil.
//
// Les visuels se rangent en deux familles : le festival sur place
// (treize cartes et douze photographies) et le festival en ligne
// (quatre cartes bâties sur des captures du site).

export interface PresseAsset {
  /** Nom du fichier PNG avec texte, sans le dossier. */
  file: string;
  /** Le même visuel, photographie seule. Absent pour les logos. */
  fileNu?: string;
  labelFR: string;
  labelEN: string;
  /** Une variante `-qr` du même fichier existe. */
  qr?: boolean;
  /** La page que le code QR ouvre, pour l'afficher sous la tuile. */
  qrPath?: string;
  /** La page que le code QR de la version nue ouvre. */
  qrPathNu?: string;
  /** Le fond sur lequel poser un PNG transparent. Le blason noir
   *  disparaît sur du verre sombre, il lui faut du parchemin. */
  fond?: 'clair' | 'sombre';
}

const carte = (
  n: string,
  key: string,
  labelFR: string,
  labelEN: string,
  qrFR: string,
  qrEN: string,
) => {
  const base = `fmm-2026-${n}-${key}`;
  const commun = { labelFR, labelEN, qr: true, fileNu: `${base}-nu.png`, qrPathNu: '/' };
  return {
    fr: { ...commun, file: `${base}-fr-texte.png`, qrPath: qrFR },
    en: { ...commun, file: `${base}-en-texte.png`, qrPath: qrEN },
  };
};

const postale = (id: string, slug: string, labelFR: string, labelEN: string) => {
  const base = `fmm-carte-postale-${id}-${slug}`;
  const commun = { labelFR, labelEN, qr: true, fileNu: `${base}-nu.png`, qrPathNu: '/' };
  return {
    fr: { ...commun, file: `${base}-fr-texte.png`, qrPath: '/' },
    en: { ...commun, file: `${base}-en-texte.png`, qrPath: '/en' },
  };
};

// ─── Le festival sur place ──────────────────────────────────────────
const CARTES = [
  carte('01', 'festival', 'Le festival', 'The festival', '/', '/en'),
  carte('02', 'billets', 'Billets', 'Tickets', '/billets', '/en/tickets'),
  carte('03', 'chevaliers', 'Chevaliers', 'Knights', '/activites', '/en/activities'),
  carte('04', 'escrime', 'Escrime et combats', 'Fencing and combat', '/activites', '/en/activities'),
  carte('05', 'forge', 'La forge', 'The forge', '/activites', '/en/activities'),
  carte('06', 'tissage', 'Tissage et herboristerie', 'Weaving and herbalism', '/histoire', '/en/history'),
  carte('07', 'marche', 'Le marché', 'The market', '/marche', '/en/market'),
  carte('08', 'musique', 'Musique et spectacles', 'Music and shows', '/activites', '/en/activities'),
  carte('09', 'banquet', 'Le banquet', 'The banquet', '/nourriture', '/en/food'),
  carte('10', 'jeunesse', 'Village jeunesse', 'Youth village', '/activites', '/en/activities'),
  carte('11', 'camping', 'Camping', 'Camping', '/hebergement', '/en/lodging'),
  carte('12', 'mariages', 'Mariages et groupes', 'Weddings and groups', '/mariages', '/en/weddings'),
  carte('13', 'tresse-et-tisse', 'Tresse et Tisse', 'Tresse et Tisse', '/histoire', '/en/history'),
];

export const CARTES_FR: PresseAsset[] = CARTES.map((c) => c.fr);
export const CARTES_EN: PresseAsset[] = CARTES.map((c) => c.en);

// La douzième portait un titre faux, alors elle n'en avait plus du tout
// (Alex, 2026-08-31). Elle en a repris un depuis, celui de ce que la
// photo montre vraiment : une tête de bête sculptée, éclairée au feu.
const POSTALES = [
  postale('01', 'chevalier-plumet', 'Le chevalier au plumet', 'The plumed knight'),
  postale('02', 'chevalier-lice', 'Le chevalier en lice', 'The knight in the lists'),
  postale('03', 'joute', 'La joute équestre', 'The mounted joust'),
  postale('04', 'forge', 'La forge', 'The forge'),
  postale('05', 'rouet', 'Le rouet', 'The spinning wheel'),
  postale('06', 'poteries', 'Les poteries', 'The pottery'),
  postale('07', 'vielle-a-roue', 'La vielle à roue', 'The hurdy-gurdy'),
  postale('08', 'convives', 'Les convives', 'The guests at table'),
  postale('09', 'paniers-herbes', 'Les paniers d’herbes', 'The herb baskets'),
  postale('10', 'mur-de-boucliers', 'Le mur de boucliers', 'The shield wall'),
  postale('11', 'guerrier-epee', 'Le guerrier à l’épée', 'The warrior with the sword'),
  postale('12', 'feu-dragon', 'La tête sculptée, au feu', 'The carved head by firelight'),
];

export const CARTES_POSTALES_FR: PresseAsset[] = POSTALES.map((c) => c.fr);
export const CARTES_POSTALES_EN: PresseAsset[] = POSTALES.map((c) => c.en);

// ─── Le festival en ligne ───────────────────────────────────────────
const LIGNE = [
  carte('21', 'jeux', 'Les jeux en ligne', 'The online games', '/jeux-en-ligne', '/en/online-games'),
  carte('22', 'ordre', 'Le registre de l’Ordre', 'The roll of the Order', '/ordre', '/en/order'),
  carte('23', 'montpellois', 'Le Montpellois', 'The Montpellois', '/boutique', '/en/shop'),
  carte('24', 'apprendre', 'Apprendre', 'Learning', '/histoire', '/en/history'),
];

export const CARTES_LIGNE_FR: PresseAsset[] = LIGNE.map((c) => c.fr);
export const CARTES_LIGNE_EN: PresseAsset[] = LIGNE.map((c) => c.en);

export const LOGOS: PresseAsset[] = [
  { file: 'logos/fmm-logo-embossed-silver.png', labelFR: 'Blason argenté', labelEN: 'Silver crest', fond: 'sombre' },
  { file: 'logos/fmm-logo-argent-1024.png', labelFR: 'Blason argenté, 1024 px', labelEN: 'Silver crest, 1024 px', fond: 'sombre' },
  { file: 'logos/fmm-logo-white.png', labelFR: 'Blason blanc', labelEN: 'White crest', fond: 'sombre' },
  { file: 'logos/fmm-logo-blanc-1024.png', labelFR: 'Blason blanc, 1024 px', labelEN: 'White crest, 1024 px', fond: 'sombre' },
  { file: 'logos/fmm-logo-noir.png', labelFR: 'Blason noir', labelEN: 'Black crest', fond: 'clair' },
  { file: 'logos/fmm-logo-noir-1024.png', labelFR: 'Blason noir, 1024 px', labelEN: 'Black crest, 1024 px', fond: 'clair' },
];

/** Les fichiers texte du kit. Pas de vignette : la tuile est un feuillet. */
export const TEXTES: PresseAsset[] = [
  { file: 'textes/festival-fr.txt', labelFR: 'Présentation du festival, en français', labelEN: 'Festival presentation, in French' },
  { file: 'textes/festival-en.txt', labelFR: 'Présentation du festival, en anglais', labelEN: 'Festival presentation, in English' },
  { file: 'textes/credits.txt', labelFR: 'Crédits photographiques', labelEN: 'Photo credits' },
  { file: 'textes/LISEZ-MOI.txt', labelFR: 'Ce que contient le kit', labelEN: 'Kit contents, in French' },
  { file: 'textes/README.txt', labelFR: 'Ce que contient le kit, en anglais', labelEN: 'What is in the kit' },
];

export const PRESSE_ZIP = '/presse/fmm-kit-de-presse.zip';

/** Le domaine court que portent les codes QR. Il redirige en 301 vers
 *  le long en gardant le chemin, et il tient sur une ligne de carte. */
export const QR_BASE = 'https://festivalmedieval.org';

/** Options d'affichage d'une tuile : photo seule, code QR, ou les deux. */
export interface Variante { nu?: boolean; qr?: boolean }

/** Le fichier qui correspond à l'état de la tuile. */
export const variante = (a: PresseAsset, v: Variante): PresseAsset => {
  const socle = v.nu && a.fileNu ? a.fileNu : a.file;
  const file = v.qr && a.qr ? socle.replace(/\.png$/, '-qr.png') : socle;
  return { ...a, file };
};

/** La page que le code QR de cette version ouvre. */
export const cibleQR = (a: PresseAsset, v: Variante) =>
  (v.nu ? a.qrPathNu : a.qrPath) ?? a.qrPath;

/** Le PNG pleine résolution, celui que le bouton Télécharger sert. */
export const pleineRes = (a: PresseAsset) => `/presse/${a.file}`;

/** La vignette WebP de 640 px, celle que la tuile affiche. */
export const vignette = (a: PresseAsset) =>
  `/presse/thumbs/${a.file.replace(/^logos\//, '').replace(/\.png$/, '.webp')}`;
