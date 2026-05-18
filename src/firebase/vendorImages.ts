// Per-vendor image override map — lets Jesse swap a kiosk's photo
// from the CRM without redeploying. Public /marche reads the override
// on top of the hardcoded `image` field in src/content/marche.ts.
//
// Storage:
//   crm/vendor-image-overrides
//     overrides: Record<vendorId, imagePath>
//     updatedAt
//     updatedBy
//
// AVAILABLE_VENDOR_IMAGES is the manifest of every photo Jesse can
// pick from — manually maintained to match the contents of
// public/wix/marche/. Add new files to this list when they're added
// to /public.

import { doc, getDoc, setDoc, deleteField, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const DOC_PATH = ['crm', 'vendor-image-overrides'] as const;

export const AVAILABLE_VENDOR_IMAGES: string[] = [
  '/wix/marche/04065e6d.jpg',
  '/wix/marche/0b4c7ac8.jpg',
  '/wix/marche/0b69be84.jpg',
  '/wix/marche/17069f62.jpg',
  '/wix/marche/17be9b5e.jpg',
  '/wix/marche/1ad4a4cb.jpg',
  '/wix/marche/1d8aca4a.jpg',
  '/wix/marche/1d91324a.jpg',
  '/wix/marche/2889fca0.jpg',
  '/wix/marche/2c7e6c33.jpg',
  '/wix/marche/2de271eb.jpg',
  '/wix/marche/33c53efb.jpg',
  '/wix/marche/36bb3314.jpg',
  '/wix/marche/3ab269ab.jpg',
  '/wix/marche/3dbc2b58.jpg',
  '/wix/marche/3efa78c8.jpg',
  '/wix/marche/43b943d1.jpg',
  '/wix/marche/45169ca1.jpg',
  '/wix/marche/47376430.jpg',
  '/wix/marche/5660e1a5.jpg',
  '/wix/marche/58de2681.jpg',
  '/wix/marche/5a033682.jpg',
  '/wix/marche/5b12ccf8.jpg',
  '/wix/marche/64edb1ee.jpg',
  '/wix/marche/73932437.jpg',
  '/wix/marche/758c6f64.jpg',
  '/wix/marche/89000880.jpg',
  '/wix/marche/97646275.jpg',
  '/wix/marche/a2d1dca3.jpg',
  '/wix/marche/aa4c3fc3.jpg',
  '/wix/marche/aafa3c13.png',
  '/wix/marche/b4c19724.png',
  '/wix/marche/b4f50022.png',
  '/wix/marche/c266478f.jpg',
  '/wix/marche/c8a35365.jpg',
  '/wix/marche/dffaa31b.jpg',
  '/wix/marche/ea1c6a9a.jpg',
  '/wix/marche/ec6cf71c.jpg',
  '/wix/marche/ecbcaaf8.jpg',
  '/wix/marche/f7025e55.jpg',
];

/**
 * Load the full override map. Missing doc / unconfigured Firestore →
 * empty map. Public page calls this on mount; the result is merged on
 * top of the hardcoded vendor data.
 */
export async function loadVendorImageOverrides(): Promise<Record<string, string>> {
  if (!db) return {};
  try {
    const snap = await getDoc(doc(db, DOC_PATH[0], DOC_PATH[1]));
    if (!snap.exists()) return {};
    return (snap.data().overrides || {}) as Record<string, string>;
  } catch (err) {
    console.warn('[vendorImages] load failed', err);
    return {};
  }
}

/**
 * Persist a single vendor's chosen image. Merge-write so other
 * vendors' overrides are preserved.
 */
export async function saveVendorImageOverride(
  vendorId: string,
  imagePath: string,
  editorUid: string,
): Promise<void> {
  if (!db) throw new Error('Firestore not configured');
  await setDoc(
    doc(db, DOC_PATH[0], DOC_PATH[1]),
    {
      overrides: { [vendorId]: imagePath },
      updatedAt: serverTimestamp(),
      updatedBy: editorUid,
    },
    { merge: true },
  );
}

/**
 * Remove a vendor's override — reverts to the hardcoded `image` in
 * src/content/marche.ts.
 */
export async function clearVendorImageOverride(
  vendorId: string,
  editorUid: string,
): Promise<void> {
  if (!db) throw new Error('Firestore not configured');
  await setDoc(
    doc(db, DOC_PATH[0], DOC_PATH[1]),
    {
      overrides: { [vendorId]: deleteField() },
      updatedAt: serverTimestamp(),
      updatedBy: editorUid,
    },
    { merge: true },
  );
}

/**
 * Apply overrides to a list of vendors. Returns a new array; the
 * original is untouched.
 */
export function applyImageOverrides<T extends { id: string; image?: string }>(
  vendors: T[],
  overrides: Record<string, string>,
): T[] {
  return vendors.map((v) =>
    overrides[v.id] && overrides[v.id] !== v.image
      ? { ...v, image: overrides[v.id] }
      : v,
  );
}
