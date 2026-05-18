// In-memory mock for adminRoles — used in DEV_BYPASS mode so the role
// gate and the Rôles management section can be exercised without a
// live Firestore. Mirrors src/firebase/adminRoles.ts's surface.

import type { AdminRole } from '../lib/adminPermissions';
import type { AdminRoleDoc } from './adminRoles';

// Seed with a few illustrative entries — the dev-bypass user logs in
// as `dev@local` which is auto-promoted to 'super' by AuthContext.
const STORE = new Map<string, AdminRoleDoc>([
  ['krystine@inspiratanature.com', {
    email: 'krystine@inspiratanature.com',
    role: 'ca',
    displayName: 'Krystine',
    assignedBy: 'mock-super-uid',
    assignedByEmail: 'houseoftherisingarts@gmail.com',
    assignedAt: new Date().toISOString(),
  }],
  ['organisateur@example.com', {
    email: 'organisateur@example.com',
    role: 'organisateur',
    displayName: 'Sam Organisateur',
    assignedBy: 'mock-super-uid',
    assignedByEmail: 'houseoftherisingarts@gmail.com',
    assignedAt: new Date().toISOString(),
  }],
  ['cuisine@example.com', {
    email: 'cuisine@example.com',
    role: 'kitchen',
    displayName: 'Chef Bar',
    assignedBy: 'mock-super-uid',
    assignedByEmail: 'houseoftherisingarts@gmail.com',
    assignedAt: new Date().toISOString(),
  }],
]);

function key(email: string) { return email.trim().toLowerCase(); }

export async function mockGetAdminRole(email: string): Promise<AdminRole | null> {
  return STORE.get(key(email))?.role ?? null;
}

export async function mockListAdminRoles(): Promise<AdminRoleDoc[]> {
  return Array.from(STORE.values()).sort((a, b) => a.email.localeCompare(b.email));
}

export async function mockSetAdminRole(
  email: string,
  role: AdminRole | null,
  meta: { displayName?: string; assignedBy: string; assignedByEmail: string },
): Promise<void> {
  const k = key(email);
  if (role === null) { STORE.delete(k); return; }
  STORE.set(k, {
    email: k,
    role,
    displayName: meta.displayName ?? '',
    assignedBy: meta.assignedBy,
    assignedByEmail: meta.assignedByEmail,
    assignedAt: new Date().toISOString(),
  });
}

// Simple in-memory listeners — fire on every mutation so the Rôles
// section UI can rely on a watch pattern even in mock mode.
const LISTENERS = new Set<(email: string) => void>();

export function mockWatchAdminRole(email: string, cb: (role: AdminRole | null) => void): () => void {
  cb(STORE.get(key(email))?.role ?? null);
  const fn = (changed: string) => {
    if (changed === key(email)) cb(STORE.get(key(email))?.role ?? null);
  };
  LISTENERS.add(fn);
  return () => { LISTENERS.delete(fn); };
}

// Notify listeners when a role changes. Called from mockSetAdminRole.
// (Kept out of the setter signature above so the public surface stays
// simple; we patch it here.)
const origSet = mockSetAdminRole;
export const _notifyAfterSet = async (...args: Parameters<typeof origSet>) => {
  const [email] = args;
  await origSet(...args);
  for (const fn of LISTENERS) fn(key(email));
};
