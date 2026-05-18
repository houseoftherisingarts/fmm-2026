
export type Language = 'en' | 'fr';

export type DocumentType = 'letter' | 'invoice';

export interface BrandingLogo {
  id: string;
  name: string;
  url: string;
  style: 'dark' | 'light' | 'silver'; // Helps with background contrast if needed
}

export interface SignatureRole {
  id: string;
  labelEn: string;
  labelFr: string;
}

export interface InvoiceService {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  discount: number;
}

export interface DocumentState {
  type: DocumentType;
  title: string;
  content: string;
  logoId: string;
  logoImage: string | null; // Base64 data of the selected logo
  signerName: string;
  signerRole: string;
  customRole: string;
  signatureImage: string | null;
  date: string;
  titleSize: number; // Font size in px (approx) or tailwind class equivalent scale
  textSize: number;  // Font size in px
  
  // Invoice specific fields
  invoiceType: 'quote' | 'invoice';
  invoiceNumber: string;
  clientName: string;
  clientAddress: string;
  services: InvoiceService[];
  tpsNumber: string;
  tvqNumber: string;
  paperStyle: 'white' | 'parchment';
}

export interface Translation {
  [key: string]: {
    en: string;
    fr: string;
  };
}

