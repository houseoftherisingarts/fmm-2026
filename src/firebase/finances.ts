// Finances — Firestore CRUD (catégories, comptes, répartition) +
// Firebase Storage (documents financiers). Admin only (voir
// firestore.rules / storage.rules).
//
// Collections :
//   financeCategories/{id}   — budget par catégorie
//   financeAccounts/{id}     — soldes des comptes (Desjardins, Square, Zeffy, dette…)
//   financeAllocation/settings — doc unique, répartition en 3 enveloppes (investir/épargner/essentiel)
//   financeDocuments/{id}    — métadonnées des documents téléversés dans Storage
//   financeReceivables/{id}  — argent promis mais pas encore en banque (subventions, commandites, factures)

import {
  collection, doc, addDoc, getDocs, updateDoc, deleteDoc, setDoc, getDoc, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';

// ── Types ─────────────────────────────────────────────────────────

export interface FinanceCategory {
  id: string;
  name: string;
  budgeted: number;
  actual: number;
  order: number;
}

export type AccountType = 'banque' | 'paiement' | 'dette' | 'autre';

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  banque: 'Compte bancaire',
  paiement: 'Plateforme de paiement',
  dette: 'Dette (marge / carte)',
  autre: 'Autre',
};

export interface FinanceAccount {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  order: number;
}

export interface FinanceAllocation {
  investir: number;
  epargne: number;
  essentiel: number;
}

export interface FinanceDocument {
  id: string;
  name: string;
  category: string;
  year: number;
  uploadedAt: unknown; // Firestore Timestamp
  url: string;
  path: string; // Storage path — nécessaire pour la suppression
  sizeKb: number;
}

export type ReceivableType = 'subvention' | 'commandite' | 'facture' | 'autre';

export const RECEIVABLE_TYPE_LABEL: Record<ReceivableType, string> = {
  subvention: 'Subvention promise',
  commandite: 'Commandite',
  facture: 'Facture client',
  autre: 'Autre',
};

export type ReceivableStatus = 'promis' | 'facture' | 'recu' | 'perdu';

export const RECEIVABLE_STATUS_LABEL: Record<ReceivableStatus, string> = {
  promis: 'Promis',
  facture: 'Facturé',
  recu: 'Reçu',
  perdu: 'Perdu',
};

export interface FinanceReceivable {
  id: string;
  source: string;      // qui doit l'argent
  amount: number;
  type: ReceivableType;
  expectedDate: string; // YYYY-MM-DD
  status: ReceivableStatus;
  notes: string;
  order: number;
}

const stripUndefined = (obj: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
};

// ── Catégories de budget ─────────────────────────────────────────

const CATEGORIES_COL = 'financeCategories';

export const DEFAULT_CATEGORIES: Omit<FinanceCategory, 'id'>[] = [
  { name: 'Assurances', budgeted: 0, actual: 0, order: 10 },
  { name: 'Artistes et performeurs', budgeted: 0, actual: 0, order: 20 },
  { name: 'Matériel', budgeted: 0, actual: 0, order: 30 },
  { name: 'Nourriture', budgeted: 0, actual: 0, order: 40 },
  { name: 'Taxes', budgeted: 0, actual: 0, order: 50 },
];

export async function listCategories(): Promise<FinanceCategory[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, CATEGORIES_COL));
  const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FinanceCategory, 'id'>) }));
  return rows.sort((a, b) => a.order - b.order);
}

// Sème les 5 catégories préchargées si la collection est encore vide.
// Appelé une fois au premier chargement de la section.
export async function seedDefaultCategories(): Promise<void> {
  if (!db) return;
  const existing = await listCategories();
  if (existing.length > 0) return;
  const database = db;
  await Promise.all(
    DEFAULT_CATEGORIES.map((cat) => addDoc(collection(database, CATEGORIES_COL), { ...cat, updatedAt: serverTimestamp() })),
  );
}

export async function addCategory(cat: Omit<FinanceCategory, 'id'>): Promise<FinanceCategory> {
  if (!db) throw new Error('Firebase non configuré');
  const ref2 = await addDoc(collection(db, CATEGORIES_COL), { ...cat, updatedAt: serverTimestamp() });
  return { ...cat, id: ref2.id };
}

export async function updateCategory(id: string, patch: Partial<Omit<FinanceCategory, 'id'>>): Promise<void> {
  if (!db) throw new Error('Firebase non configuré');
  await updateDoc(doc(db, CATEGORIES_COL, id), { ...stripUndefined(patch), updatedAt: serverTimestamp() });
}

export async function deleteCategory(id: string): Promise<void> {
  if (!db) throw new Error('Firebase non configuré');
  await deleteDoc(doc(db, CATEGORIES_COL, id));
}

// ── Comptes ───────────────────────────────────────────────────────

const ACCOUNTS_COL = 'financeAccounts';

export const DEFAULT_ACCOUNTS: Omit<FinanceAccount, 'id'>[] = [
  { name: 'Desjardins', type: 'banque',   balance: 0, currency: 'CAD', order: 10 },
  { name: 'Square',     type: 'paiement', balance: 0, currency: 'CAD', order: 20 },
  { name: 'Zeffy',      type: 'paiement', balance: 0, currency: 'CAD', order: 30 },
  { name: 'Dette (marge / carte)', type: 'dette', balance: 0, currency: 'CAD', order: 40 },
];

export async function listAccounts(): Promise<FinanceAccount[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, ACCOUNTS_COL));
  const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FinanceAccount, 'id'>) }));
  return rows.sort((a, b) => a.order - b.order);
}

export async function seedDefaultAccounts(): Promise<void> {
  if (!db) return;
  const existing = await listAccounts();
  if (existing.length > 0) return;
  const database = db;
  await Promise.all(
    DEFAULT_ACCOUNTS.map((acc) => addDoc(collection(database, ACCOUNTS_COL), { ...acc, updatedAt: serverTimestamp() })),
  );
}

export async function addAccount(acc: Omit<FinanceAccount, 'id'>): Promise<FinanceAccount> {
  if (!db) throw new Error('Firebase non configuré');
  const ref2 = await addDoc(collection(db, ACCOUNTS_COL), { ...acc, updatedAt: serverTimestamp() });
  return { ...acc, id: ref2.id };
}

export async function updateAccount(id: string, patch: Partial<Omit<FinanceAccount, 'id'>>): Promise<void> {
  if (!db) throw new Error('Firebase non configuré');
  await updateDoc(doc(db, ACCOUNTS_COL, id), { ...stripUndefined(patch), updatedAt: serverTimestamp() });
}

export async function deleteAccount(id: string): Promise<void> {
  if (!db) throw new Error('Firebase non configuré');
  await deleteDoc(doc(db, ACCOUNTS_COL, id));
}

// ── Répartition en 3 enveloppes (investir / épargner / essentiel) ──

const ALLOCATION_COL = 'financeAllocation';
const ALLOCATION_DOC = 'settings';

export const DEFAULT_ALLOCATION: FinanceAllocation = { investir: 20, epargne: 30, essentiel: 50 };

export async function getAllocation(): Promise<FinanceAllocation> {
  if (!db) return DEFAULT_ALLOCATION;
  const snap = await getDoc(doc(db, ALLOCATION_COL, ALLOCATION_DOC));
  if (!snap.exists()) return DEFAULT_ALLOCATION;
  const data = snap.data() as Partial<FinanceAllocation>;
  return {
    investir: data.investir ?? DEFAULT_ALLOCATION.investir,
    epargne: data.epargne ?? DEFAULT_ALLOCATION.epargne,
    essentiel: data.essentiel ?? DEFAULT_ALLOCATION.essentiel,
  };
}

export async function setAllocation(allocation: FinanceAllocation): Promise<void> {
  if (!db) throw new Error('Firebase non configuré');
  await setDoc(doc(db, ALLOCATION_COL, ALLOCATION_DOC), { ...allocation, updatedAt: serverTimestamp() });
}

// ── Documents (Firebase Storage) ────────────────────────────────────

const DOCUMENTS_COL = 'financeDocuments';
const STORAGE_ROOT = 'finances';

export async function listDocuments(): Promise<FinanceDocument[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, DOCUMENTS_COL));
  const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FinanceDocument, 'id'>) }));
  return rows.sort((a, b) => (b.year - a.year) || String(b.uploadedAt).localeCompare(String(a.uploadedAt)));
}

export async function uploadDocument(
  file: File, meta: { name: string; category: string; year: number },
): Promise<FinanceDocument> {
  if (!db || !storage) throw new Error('Firebase non configuré');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${STORAGE_ROOT}/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type || 'application/octet-stream' });
  const url = await getDownloadURL(storageRef);
  const sizeKb = Math.round(file.size / 1024);
  const payload = {
    name: meta.name.trim() || safeName,
    category: meta.category,
    year: meta.year,
    url,
    path,
    sizeKb,
    uploadedAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, DOCUMENTS_COL), payload);
  return { id: docRef.id, ...payload };
}

export async function deleteDocument(d: FinanceDocument): Promise<void> {
  if (!db) throw new Error('Firebase non configuré');
  await deleteDoc(doc(db, DOCUMENTS_COL, d.id));
  if (storage && d.path) {
    try {
      await deleteObject(ref(storage, d.path));
    } catch (e) {
      // Le doc Firestore est déjà supprimé ; un fichier orphelin dans
      // Storage n'est pas bloquant, on log seulement.
      console.warn('[finances] deleteObject failed:', e);
    }
  }
}

// ── À recevoir (subventions promises, commandites, factures clients) ──
// Argent promis mais pas encore encaissé. Volontairement séparé des
// comptes de trésorerie : ce n'est pas de l'argent en banque.

const RECEIVABLES_COL = 'financeReceivables';

export async function listReceivables(): Promise<FinanceReceivable[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, RECEIVABLES_COL));
  const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FinanceReceivable, 'id'>) }));
  return rows.sort((a, b) => a.order - b.order);
}

export async function addReceivable(r: Omit<FinanceReceivable, 'id'>): Promise<FinanceReceivable> {
  if (!db) throw new Error('Firebase non configuré');
  const ref2 = await addDoc(collection(db, RECEIVABLES_COL), { ...r, updatedAt: serverTimestamp() });
  return { ...r, id: ref2.id };
}

export async function updateReceivable(id: string, patch: Partial<Omit<FinanceReceivable, 'id'>>): Promise<void> {
  if (!db) throw new Error('Firebase non configuré');
  await updateDoc(doc(db, RECEIVABLES_COL, id), { ...stripUndefined(patch), updatedAt: serverTimestamp() });
}

export async function deleteReceivable(id: string): Promise<void> {
  if (!db) throw new Error('Firebase non configuré');
  await deleteDoc(doc(db, RECEIVABLES_COL, id));
}
