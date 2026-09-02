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

// La moitié des entrées anglaises étaient du français recopié : le
// bouton de langue existait dans le code mais aucune traduction ne
// suivait derrière. Les deux colonnes sont maintenant réellement
// remplies, et le bouton FR/EN est remonté dans la barre de l'outil.
export const TRANSLATIONS: Translation = {
  appTitle: {
    en: "The Scriptorium",
    fr: "Le Pupitre"
  },
  appSubtitle: {
    en: "Festival Médiéval de Montpellier",
    fr: "Festival Médiéval de Montpellier"
  },
  loading: {
    en: "Opening the scriptorium…",
    fr: "Ouverture du pupitre…"
  },
  chooseQuestion: {
    en: "What are we writing today?",
    fr: "Qu’écrivons-nous aujourd’hui ?"
  },
  chooseLetter: {
    en: "Write a letter",
    fr: "Écrire une lettre"
  },
  chooseLetterNote: {
    en: "An official notice, a letter or a memo, on festival letterhead, signed and sealed.",
    fr: "Un avis officiel, une lettre ou un mémo, sur le papier du festival, signé de votre main."
  },
  letterWord: {
    en: "Letter",
    fr: "Lettre"
  },
  chooseInvoice: {
    en: "Invoice or quote",
    fr: "Facture ou devis"
  },
  chooseInvoiceNote: {
    en: "Line up the services, the taxes are worked out and the total falls into place.",
    fr: "Alignez les services, les taxes se calculent et le total se pose tout seul."
  },
  changeType: {
    en: "Change document",
    fr: "Changer de document"
  },
  documentTitlePlaceholder: {
    en: "Title of the document…",
    fr: "Titre du document…"
  },
  documentBodyPlaceholder: {
    en: "Write your text here. The document adds pages on its own when the text runs long…",
    fr: "Entrez votre texte ici. Le document ajoute des pages tout seul quand le texte s’allonge…"
  },
  selectLogo: {
    en: "Crest",
    fr: "Choisir l’identité"
  },
  signerNameLabel: {
    en: "Signed by",
    fr: "Nom du signataire"
  },
  signerRoleLabel: {
    en: "Title of the signer",
    fr: "Fonction du signataire"
  },
  signerLocked: {
    en: "locked",
    fr: "verrouillé"
  },
  customRolePlaceholder: {
    en: "Type the title yourself…",
    fr: "Entrer la fonction manuellement…"
  },
  selectSignature: {
    en: "Choose the signature",
    fr: "Choisir la signature"
  },
  signHere: {
    en: "Sign here",
    fr: "Signez ici"
  },
  signNote: {
    en: "Sign straight onto the sheet on the right, with the mouse or a finger.",
    fr: "Signez directement sur la feuille, à la souris ou au doigt."
  },
  clearSignature: {
    en: "Clear",
    fr: "Effacer"
  },
  downloadPdf: {
    en: "Export PDF",
    fr: "Exporter PDF"
  },
  downloadHtml: {
    en: "Export HTML",
    fr: "Exporter HTML"
  },
  downloadPng: {
    en: "Export PNG",
    fr: "Exporter PNG"
  },
  date: {
    en: "Date",
    fr: "Date"
  },
  editor: {
    en: "Write",
    fr: "Écrire"
  },
  preview: {
    en: "The sheet",
    fr: "La feuille"
  },
  officialDocument: {
    en: "Official document",
    fr: "Document officiel"
  },
  processing: {
    en: "Working",
    fr: "Traitement"
  },
  contentLabel: {
    en: "Body",
    fr: "Contenu"
  },
  titleLabel: {
    en: "Title",
    fr: "Titre"
  },
  page: {
    en: "Page",
    fr: "Page"
  },
  of: {
    en: "of",
    fr: "sur"
  },
  titleSize: {
    en: "Title size",
    fr: "Taille du titre"
  },
  textSize: {
    en: "Body size",
    fr: "Taille du texte"
  },
  paperStyle: {
    en: "Paper",
    fr: "Papier"
  },
  paperWhite: {
    en: "White",
    fr: "Blanc"
  },
  paperParchment: {
    en: "Parchment",
    fr: "Parchemin"
  },
  sectionText: {
    en: "The text",
    fr: "Le texte"
  },
  sectionPaper: {
    en: "The paper",
    fr: "Le papier"
  },
  sectionSeal: {
    en: "The signature",
    fr: "La signature"
  },
  sectionInvoice: {
    en: "Invoice or quote",
    fr: "Facture ou devis"
  },
  docTypeLabel: {
    en: "Document type",
    fr: "Type de document"
  },
  invoiceWord: {
    en: "Invoice",
    fr: "Facture"
  },
  quoteWord: {
    en: "Quote",
    fr: "Devis"
  },
  invoiceNumber: {
    en: "Invoice no.",
    fr: "Facture nº"
  },
  quoteNumber: {
    en: "Quote no.",
    fr: "Devis nº"
  },
  clientName: {
    en: "Client",
    fr: "Nom du client"
  },
  clientAddress: {
    en: "Client address",
    fr: "Adresse du client"
  },
  services: {
    en: "Services",
    fr: "Services"
  },
  addService: {
    en: "Add a service",
    fr: "Ajouter un service"
  },
  removeService: {
    en: "Remove this service",
    fr: "Retirer ce service"
  },
  description: {
    en: "Description",
    fr: "Description"
  },
  quantity: {
    en: "Qty",
    fr: "Qté"
  },
  rate: {
    en: "Rate",
    fr: "Taux"
  },
  discount: {
    en: "Discount",
    fr: "Rabais"
  },
  amount: {
    en: "Amount",
    fr: "Montant"
  },
  subtotal: {
    en: "Subtotal",
    fr: "Sous-total"
  },
  total: {
    en: "Total",
    fr: "Total"
  },
  noServices: {
    en: "No service listed yet.",
    fr: "Aucun service inscrit pour l’instant."
  },
  invoiceNotesPlaceholder: {
    en: "Notes to add under the table…",
    fr: "Notes à ajouter sous le tableau…"
  },
  notes: {
    en: "Notes",
    fr: "Notes"
  },
  billedTo: {
    en: "Billed to",
    fr: "Facturé à"
  },
  preparedFor: {
    en: "Prepared for",
    fr: "Préparé pour"
  },
  paymentDetails: {
    en: "Payment details",
    fr: "Détails de paiement"
  },
  payOnline: {
    en: "Pay online",
    fr: "Payer en ligne"
  },
  redirecting: {
    en: "Redirecting…",
    fr: "Redirection…"
  },
  newDocument: {
    en: "Start a new document",
    fr: "Repartir à neuf"
  },
  exportFailed: {
    en: "The export failed. Details are in the console.",
    fr: "L’export a échoué. Le détail est dans la console."
  }
};
