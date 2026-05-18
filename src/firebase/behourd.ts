// Tournoi de Behourd 2027 — early-registration applications.
// Path: behourd/{autoId}. Single doc per submission; tally in admin
// happens later. Keep this lean — the form is one screen and the
// Zeffy hand-off is the payment of record.

import { addDoc, collection, getDocs, query, orderBy, serverTimestamp, type Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export type WeightClass = 'light' | 'medium' | 'heavy' | 'open';
export type SkillLevel  = 'beginner' | 'intermediate' | 'advanced' | 'experienced';

export interface BehourdApplication {
  // Identity
  fullName:        string;
  email:           string;
  phone:           string;
  teamName?:       string;
  age:             number;
  // Competition specs
  weightClass:     WeightClass;
  skillLevel:      SkillLevel;
  yearsTraining?:  number;
  pastCompetitions?:string;
  // Equipment
  ownsHelm:        boolean;
  ownsGambeson:    boolean;
  ownsArmor:       boolean;
  equipmentNotes?: string;
  // Health
  medicalNotes?:   string;
  // Open
  questions?:      string;
  // Audit
  year:            2027;
  zeffyPaid?:      boolean;       // toggled by admin once payment lands
  createdAt?:      Timestamp;
}

const COLLECTION = 'behourd';

const stripUndefined = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  const out: Partial<T> = {};
  for (const k of Object.keys(obj) as (keyof T)[]) {
    if (obj[k] === undefined) continue;
    out[k] = obj[k];
  }
  return out;
};

export async function submitBehourdApplication(app: BehourdApplication): Promise<string> {
  if (!db) throw new Error('Firestore not configured');
  const ref = await addDoc(collection(db, COLLECTION), {
    ...stripUndefined(app as unknown as Record<string, unknown>),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listBehourdApplications(): Promise<(BehourdApplication & { id: string })[]> {
  if (!db) return [];
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as BehourdApplication) }));
}
