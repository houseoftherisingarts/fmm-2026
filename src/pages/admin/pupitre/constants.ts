import { BrandingLogo, Translation } from './types';

export const PRESET_NAMES = [
  "Tristan Coté Hotte",
  "Alex T. St-Laurent",
  "Océane Leclair",
  "Jesse Dippy",
  "Maïté Fournel",
  "Eric Pichette",
  "Léna LeBozec",
  "Mikael Lamarche"
];

export const PRESET_ROLES = [
  "Président",
  "Vice Président",
  "Responsable Bénévoles",
  "Ressources Humaines",
  "Responsable des Médias",
  "Autre"
];

export const LOGOS: BrandingLogo[] = [
  {
    id: 'fmm',
    name: 'Festival Médiéval de Montpellier',
    url: 'https://storage.googleapis.com/salondesinconnus/FMM/FMM%20logo%20embossed%20silver.png',
    style: 'silver'
  }
];

export const TRANSLATIONS: Translation = {
  appTitle: {
    en: "Le Pupitre Médiéval de Montpellier",
    fr: "Le Pupitre Médiéval de Montpellier"
  },
  documentTitlePlaceholder: {
    en: "Titre du document...",
    fr: "Titre du document..."
  },
  documentBodyPlaceholder: {
    en: "Entrez votre texte ici. Le document créera automatiquement de nouvelles pages si le texte est trop long...",
    fr: "Entrez votre texte ici. Le document créera automatiquement de nouvelles pages si le texte est trop long..."
  },
  selectLogo: {
    en: "Choisir l'Identité",
    fr: "Choisir l'Identité"
  },
  signerNameLabel: {
    en: "Signer Name",
    fr: "Nom du signataire"
  },
  signerRoleLabel: {
    en: "Signer Role",
    fr: "Fonction du signataire"
  },
  customRolePlaceholder: {
    en: "Enter role manually...",
    fr: "Entrer la fonction manuellement..."
  },
  selectSignature: {
    en: "Choisir la Signature",
    fr: "Choisir la Signature"
  },
  signHere: {
    en: "Signez Ici",
    fr: "Signez Ici"
  },
  clearSignature: {
    en: "Effacer",
    fr: "Effacer"
  },
  downloadPdf: {
    en: "Exporter PDF",
    fr: "Exporter PDF"
  },
  downloadHtml: {
    en: "Exporter HTML",
    fr: "Exporter HTML"
  },
  downloadPng: {
    en: "Exporter PNG",
    fr: "Exporter PNG"
  },
  date: {
    en: "Date",
    fr: "Date"
  },
  editor: {
    en: "Éditeur",
    fr: "Éditeur"
  },
  officialDocument: {
    en: "Document Officiel",
    fr: "Document Officiel"
  },
  processing: {
    en: "Traitement",
    fr: "Traitement"
  },
  contentLabel: {
    en: "Contenu",
    fr: "Contenu"
  },
  titleLabel: {
    en: "Titre",
    fr: "Titre"
  },
  page: {
    en: "Page",
    fr: "Page"
  },
  of: {
    en: "sur",
    fr: "sur"
  },
  titleSize: {
    en: "Taille du Titre",
    fr: "Taille du Titre"
  },
  textSize: {
    en: "Taille du Texte",
    fr: "Taille du Texte"
  },
  paperStyle: {
    en: "Paper Texture",
    fr: "Texture du papier"
  },
  paperWhite: {
    en: "White",
    fr: "Blanc"
  },
  paperParchment: {
    en: "Parchment",
    fr: "Parchemin"
  }
};