// ─── Le kit de presse, côté site ────────────────────────────────────
// Les fichiers vivent dans public/presse/ et se refabriquent d'une
// commande : `node scripts/presse/build-kit.mjs`. Les noms ci-dessous
// suivent ceux de scripts/presse/cards.mjs et scripts/presse/photos.mjs.
// Toucher l'un sans l'autre casse la page.
//
// Chaque entrée porte deux chemins : la vignette WebP de 640 px que la
// tuile affiche, et le PNG 1920 × 1080 que le bouton télécharge. Servir
// vingt PNG pleine résolution dans une grille ferait 45 Mo par visite.

export interface PresseAsset {
  /** Nom du fichier PNG, sans le dossier. */
  file: string;
  labelFR: string;
  labelEN: string;
}

const carte = (n: string, key: string, labelFR: string, labelEN: string) => ({
  fr: { file: `fmm-2026-${n}-${key}-fr.png`, labelFR, labelEN },
  en: { file: `fmm-2026-${n}-${key}-en.png`, labelFR, labelEN },
});

const CARTES = [
  carte('01', 'festival', 'Le festival', 'The festival'),
  carte('02', 'billets', 'Billets', 'Tickets'),
  carte('03', 'combats', 'Combats et joutes', 'Combat and jousts'),
  carte('04', 'marche', 'Marché et démonstrations', 'Market and demos'),
  carte('05', 'musique', 'Musique et spectacles', 'Music and shows'),
  carte('06', 'banquet', 'Banquet, jeunesse, camping', 'Banquet, youth, camping'),
];

export const CARTES_FR: PresseAsset[] = CARTES.map((c) => c.fr);
export const CARTES_EN: PresseAsset[] = CARTES.map((c) => c.en);

export const CARTES_POSTALES: PresseAsset[] = [
  { file: 'fmm-carte-postale-01-vikings-boucliers.png', labelFR: 'Le mur de boucliers', labelEN: 'The shield wall' },
  { file: 'fmm-carte-postale-02-vikings-mur.png', labelFR: 'La ligne avant la charge', labelEN: 'The line before the charge' },
  { file: 'fmm-carte-postale-03-viking-lance.png', labelFR: 'Le guerrier à la lance', labelEN: 'The spear warrior' },
  { file: 'fmm-carte-postale-04-vikings-bataille.png', labelFR: 'La charge', labelEN: 'The charge' },
  { file: 'fmm-carte-postale-05-vikings-feu-nuit.png', labelFR: 'Le camp la nuit', labelEN: 'The camp at night' },
  { file: 'fmm-carte-postale-06-vikings-duel.png', labelFR: 'Le duel', labelEN: 'The duel' },
  { file: 'fmm-carte-postale-07-joute.png', labelFR: 'La joute équestre', labelEN: 'The mounted joust' },
  { file: 'fmm-carte-postale-08-cracheur-feu.png', labelFR: 'La proue en flammes', labelEN: 'The burning prow' },
];

export const LOGOS: PresseAsset[] = [
  { file: 'logos/fmm-logo-embossed-silver.png', labelFR: 'Blason argenté', labelEN: 'Silver crest' },
  { file: 'logos/fmm-logo-white.png', labelFR: 'Blason blanc', labelEN: 'White crest' },
];

export const PRESSE_ZIP = '/presse/fmm-kit-de-presse.zip';

/** Le PNG pleine résolution, celui que le bouton Télécharger sert. */
export const pleineRes = (a: PresseAsset) => `/presse/${a.file}`;

/** La vignette WebP de 640 px, celle que la tuile affiche. */
export const vignette = (a: PresseAsset) =>
  `/presse/thumbs/${a.file.replace(/^logos\//, '').replace(/\.png$/, '.webp')}`;
