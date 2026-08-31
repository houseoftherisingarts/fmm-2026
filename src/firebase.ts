// Firebase init: offline-safe pattern.
// All Firebase features are gated on the project ID being configured in
// .env.local. Without it, the site renders as a static SPA: forms degrade
// gracefully, analytics no-ops, admin route refuses sign-in.
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
// firebase/analytics is dynamically imported only after LOI 25 consent:
// keeps it out of the eager vendor-firebase chunk on first paint.

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

const isConfigured =
  !!firebaseConfig.projectId && firebaseConfig.projectId !== 'undefined';

// `VITE_USE_EMULATORS=1 npx vite` : voir plus bas.
const auxEmulateurs = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === '1';

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    _auth = getAuth(app);
    _db = getFirestore(app);
    _storage = getStorage(app);
  } catch (e) {
    console.warn('[Firebase] Init failed, running in offline mode:', e);
  }
} else {
  console.info(
    '[Firebase] Not configured. Running in offline mode. Add VITE_FIREBASE_* to .env.local',
  );
}

// ── Les émulateurs, en développement seulement ──────────────────────
// `VITE_USE_EMULATORS=1 npx vite` fait parler le site aux émulateurs
// locaux au lieu du vrai projet. C'est ainsi qu'une partie à deux se
// vérifie avec deux comptes sans rien écrire en production, et que les
// règles de firestore.rules sont mises à l'épreuve pour de vrai.
// Hors développement, la condition est fausse et le code disparaît au
// build.
if (auxEmulateurs && _auth && _db) {
  connectAuthEmulator(_auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(_db, '127.0.0.1', 8080);
  console.info('[Firebase] Émulateurs locaux : auth 9099, firestore 8080.');
}

// L'instance elle-même : les Cloud Functions appelables en ont besoin
// pour se brancher sur le bon projet et la bonne région.
export const firebaseApp = app;

export const auth = _auth;
export const db = _db;
export const storage = _storage;
export const isFirebaseReady = isConfigured && !!app;

// Analytics intentionally NOT initialized at module load: gated behind
// LOI 25 consent. The firebase/analytics module itself is dynamically
// imported only when consent is granted, so the eager firebase chunk
// stays small. Call enableAnalytics() from the consent banner.
//
// We type the runtime values as `any` here so the analytics module
// never appears in the static import graph; logPageView falls through
// silently until enableAnalytics() resolves.
let _analytics: any = null;
let _logEvent:  ((analytics: any, name: string, params?: Record<string, unknown>) => void) | null = null;

export function enableAnalytics() {
  if (!app || _analytics) return;
  // Dynamic import keeps analytics off the critical path.
  import('firebase/analytics').then(async ({ getAnalytics, isSupported, logEvent }) => {
    try {
      const ok = await isSupported();
      if (!ok || !app) return;
      _analytics = getAnalytics(app);
      _logEvent  = logEvent;
    } catch { /* offline/unsupported */ }
  }).catch(() => null);
}

export function logPageView(path: string, title?: string) {
  if (!_analytics || !_logEvent) return;
  try {
    _logEvent(_analytics, 'page_view', {
      page_path: path,
      page_location:
        typeof window !== 'undefined' ? window.location.href : path,
      page_title:
        title ||
        (typeof document !== 'undefined' ? document.title : ''),
    });
  } catch {
    /* noop */
  }
}

export default app;
