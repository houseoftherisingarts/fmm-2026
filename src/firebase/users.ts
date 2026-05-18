// Users collection — Firestore read-only for the admin CRM.
// Collection: `users/{uid}`. Documents are created/updated by the
// applications flow (upsertUserProfile in applications.ts) whenever
// a user signs in or submits a form.
//
// Shape mirrors MockUser from mockData.ts so ComptesSection can use
// a single type for both live and mock data.

import {
  collection, getDocs, query, orderBy, limit as fsLimit,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface AppUser {
  uid:            string;
  email:          string;
  displayName:    string;
  phone?:         string;
  lang?:          string;
  hasBenevoleApp: boolean;
  hasVendorApp:   boolean;
  createdAt?:     Timestamp | unknown;
}

const COL = 'users';

// List users ordered by creation date descending, capped at pageSize.
// Returns [] when Firestore is not configured (offline / missing env).
export async function listUsers(pageSize = 500): Promise<AppUser[]> {
  if (!db) return [];
  const q = query(
    collection(db, COL),
    orderBy('createdAt', 'desc'),
    fsLimit(pageSize),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      uid:            d.id,
      email:          String(data.email ?? ''),
      displayName:    String(data.displayName ?? ''),
      phone:          data.phone ? String(data.phone) : undefined,
      lang:           data.lang  ? String(data.lang)  : undefined,
      // flags array written by addUserFlag — derive booleans from it
      hasBenevoleApp: Array.isArray(data.flags) ? (data.flags as string[]).includes('benevole') : false,
      hasVendorApp:   Array.isArray(data.flags) ? (data.flags as string[]).includes('vendor')   : false,
      createdAt:      data.createdAt ?? null,
    };
  });
}
