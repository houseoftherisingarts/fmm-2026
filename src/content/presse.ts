// ─── Le kit de presse, côté site ────────────────────────────────────
// Les fichiers vivent dans public/presse/ et se refabriquent d'une
// commande : `node scripts/presse/build-kit.mjs`. Les noms ci-dessous
// suivent ceux de scripts/presse/cards.mjs et scripts/presse/photos.mjs.
// Toucher l'un sans l'autre casse la page.
//
// Chaque entrée porte deux chemins : la vignette WebP de 640 px que la
// tuile affiche, et le PNG 1920 × 1080 que le bouton télécharge. Servir
// soixante PNG pleine résolution dans une grille ferait des dizaines de
// mégaoctets par visite.
//
// Les cartes et les cartes postales existent en deux versions : la
// nue, et la même avec un code QR en bas à gauche (suffixe `-qr`) qui
// mène à la page du site qui traite du sujet. Le bouton « Version QR »
// de la tuile bascule de l'une à l'autre.

export interface PresseAsset {
  /** Nom du fichier PNG, sans le dossier. */
  file: string;
  labelFR: string;
  labelEN: string;
  /** Une variante `-qr` du même fichier existe. */
  qr?: boolean;
  /** La page que ce code QR ouvre, pour l'afficher sous la tuile. */
  qrPath?: string;
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
) => ({
  fr: { file: `fmm-2026-${n}-${key}-fr.png`, labelFR, labelEN, qr: true, qrPath: qrFR },
  en: { file: `fmm-2026-${n}-${key}-en.png`, labelFR, labelEN, qr: true, qrPath: qrEN },
});

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
];

export const CARTES_FR: PresseAsset[] = CARTES.map((c) => c.fr);
export const CARTES_EN: PresseAsset[] = CARTES.map((c) => c.en);

// La douzième n'a ni titre ni légende : la scène n'est ni une proue ni
// des flammes, et une légende fausse vaut moins que le silence
// (Alex, 2026-08-31).
export const CARTES_POSTALES: PresseAsset[] = [
  { file: 'fmm-carte-postale-01-chevalier-plumet.png', labelFR: 'Le chevalier au plumet', labelEN: 'The plumed knight', qr: true, qrPath: '/' },
  { file: 'fmm-carte-postale-02-chevalier-lice.png', labelFR: 'Le chevalier en lice', labelEN: 'The knight in the lists', qr: true, qrPath: '/' },
  { file: 'fmm-carte-postale-03-joute.png', labelFR: 'La joute équestre', labelEN: 'The mounted joust', qr: true, qrPath: '/' },
  { file: 'fmm-carte-postale-04-forge.png', labelFR: 'La forge', labelEN: 'The forge', qr: true, qrPath: '/' },
  { file: 'fmm-carte-postale-05-rouet.png', labelFR: 'Le rouet', labelEN: 'The spinning wheel', qr: true, qrPath: '/' },
  { file: 'fmm-carte-postale-06-poteries.png', labelFR: 'Les poteries', labelEN: 'The pottery', qr: true, qrPath: '/' },
  { file: 'fmm-carte-postale-07-vielle-a-roue.png', labelFR: 'La vielle à roue', labelEN: 'The hurdy-gurdy', qr: true, qrPath: '/' },
  { file: 'fmm-carte-postale-08-convives.png', labelFR: 'Les convives', labelEN: 'The guests at table', qr: true, qrPath: '/' },
  { file: 'fmm-carte-postale-09-paniers-herbes.png', labelFR: 'Les paniers d’herbes', labelEN: 'The herb baskets', qr: true, qrPath: '/' },
  { file: 'fmm-carte-postale-10-mur-de-boucliers.png', labelFR: 'Le mur de boucliers', labelEN: 'The shield wall', qr: true, qrPath: '/' },
  { file: 'fmm-carte-postale-11-guerrier-epee.png', labelFR: 'Le guerrier à l’épée', labelEN: 'The warrior with the sword', qr: true, qrPath: '/' },
  { file: 'fmm-carte-postale-12-feu-dragon.png', labelFR: '', labelEN: '', qr: true, qrPath: '/' },
];

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

/** L'adresse complète que porte un code QR. */
export const QR_BASE = 'https://www.festivalmedievaldemontpellier.org';

/** La même carte, version code QR. Rendue telle quelle si elle n'en a pas. */
export const versionQR = (a: PresseAsset): PresseAsset =>
  a.qr ? { ...a, file: a.file.replace(/\.png$/, '-qr.png') } : a;

/** Le PNG pleine résolution, celui que le bouton Télécharger sert. */
export const pleineRes = (a: PresseAsset) => `/presse/${a.file}`;

/** La vignette WebP de 640 px, celle que la tuile affiche. */
export const vignette = (a: PresseAsset) =>
  `/presse/thumbs/${a.file.replace(/^logos\//, '').replace(/\.png$/, '.webp')}`;
