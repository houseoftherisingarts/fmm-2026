// ─── Firestore CRUD for admin role assignments ──────────────────────
// One doc per admin keyed by lowercased email. Keying by email (not uid)
// means the super admin can pre-provision roles before someone has ever
// signed in — the role takes effect the moment they auth with that
// email. On first sign-in we backfill the user's uid into the doc.
//
// Collection layout: adminRoles/{email}
//   { email, role, displayName, uid?, assignedBy, assignedByEmail, assignedAt }
//
// Auth is enforced by Firestore security rules (NOT by this client) —
// only super-admin uids should be allowed to write to this collection.
// Rules sketch:
//   match /adminRoles/{email} {
//     allow read:  if request.auth != null && request.auth.token.email == email;
//     allow read, write: if isSuperAdmin();   // helper checking email allowlist
//   }

import {
  collection, doc, getDoc, setDoc, deleteDoc, getDocs,
  onSnapshot, query, orderBy, serverTimestamp,
  type DocumentSnapshot, type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { AdminRole } from '../lib/adminPermissions';

export interface AdminRoleDoc {
  email:           string;   // lowercased; also the doc id
  role:            AdminRole;
  displayName:     string;
  uid?:            string;   // backfilled on first sign-in
  assignedBy:      string;   // uid of the super-admin who set it
  assignedByEmail: string;
  // Firestore Timestamp on read; we keep it loose so callers don't need
  // to import the FieldValue type for serverTimestamp() in writes.
  assignedAt:      unknown;
}

const COL = 'adminRoles';

function key(email: string): string {
  return email.trim().toLowerCase();
}

function fromSnap(snap: DocumentSnapshot<DocumentData>): AdminRoleDoc | null {
  if (!snap.exists()) return null;
  return snap.data() as AdminRoleDoc;
}

export async function getAdminRoleDoc(email: string): Promise<AdminRoleDoc | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, COL, key(email)));
  return fromSnap(snap);
}

export async function getAdminRole(email: string): Promise<AdminRole | null> {
  const d = await getAdminRoleDoc(email);
  return d?.role ?? null;
}

// Live listener for the current user's role — used by AuthContext so the
// shell re-renders the instant a super-admin assigns or revokes a role.
// IMPORTANT: an explicit error handler is required so that a denied read
// (no doc + restrictive Firestore rules) still resolves the loading
// state instead of leaving the admin page stuck on a spinner. Denied
// or missing → treat as "no role".
export function watchAdminRole(email: string, cb: (role: AdminRole | null) => void): () => void {
  if (!db) { cb(null); return () => {}; }
  return onSnapshot(
    doc(db, COL, key(email)),
    (snap) => {
      const d = fromSnap(snap);
      cb(d?.role ?? null);
    },
    (err) => {
      // Permission-denied / unavailable / etc. — log and resolve as null
      // so AuthContext can fall through to the "access refused" gate.
      console.warn('[adminRoles] watchAdminRole snapshot error:', err);
      cb(null);
    },
  );
}

export async function setAdminRole(
  email: string,
  role: AdminRole | null,
  meta: {
    displayName?: string;
    assignedBy: string;
    assignedByEmail: string;
  },
): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  const ref = doc(db, COL, key(email));
  if (role === null) {
    await deleteDoc(ref);
    return;
  }
  await setDoc(ref, {
    email: key(email),
    role,
    displayName: meta.displayName ?? '',
    assignedBy: meta.assignedBy,
    assignedByEmail: meta.assignedByEmail,
    assignedAt: serverTimestamp(),
  }, { merge: true });
}

// Backfill the uid on the role doc the first time a user signs in with
// the matching email. Safe to call on every sign-in — merges only the
// uid field if the doc exists.
export async function backfillUid(email: string, uid: string): Promise<void> {
  if (!db) return;
  const ref = doc(db, COL, key(email));
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data() as AdminRoleDoc;
  if (data.uid === uid) return;
  await setDoc(ref, { uid }, { merge: true });
}

export async function listAdminRoles(): Promise<AdminRoleDoc[]> {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, COL), orderBy('email')));
  return snap.docs.map((d) => d.data() as AdminRoleDoc);
}
