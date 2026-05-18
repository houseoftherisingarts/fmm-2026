import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth, isFirebaseReady } from '../firebase';
import { watchAdminRole, backfillUid } from '../firebase/adminRoles';
import type { AdminRole } from '../lib/adminPermissions';

// Allowlist: who counts as a SUPER ADMIN by email. Sourced from
// VITE_ADMIN_EMAILS (comma-separated). Each entry is either a full
// email or a bare domain — domain entries grant super-admin to anyone
// signed in with an email at that domain. Super-admins always have
// `adminRole === 'super'` regardless of any Firestore role doc.
function getSuperAdminAllowlist(): string[] {
  return (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function emailMatchesAllowlist(email: string, allow: string[]): boolean {
  const e = email.toLowerCase();
  const domain = e.includes('@') ? e.split('@')[1] : '';
  return allow.some((entry) => {
    if (entry.includes('@')) return entry === e;            // full email
    const bare = entry.startsWith('@') ? entry.slice(1) : entry;
    return !!domain && domain === bare;                     // domain match
  });
}

const STORAGE_EMAIL = 'fmm.auth.emailForSignIn';

interface AuthState {
  user: User | null;
  loading: boolean;
  /** True iff the user has ANY non-null admin role. */
  isAdmin: boolean;
  /** Specific admin role assigned to the current user, or null. */
  adminRole: AdminRole | null;
  /** True iff the user is in the super-admin email allowlist. */
  isSuperAdmin: boolean;
  /** True while we're still resolving the admin role from Firestore. */
  roleLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  /** Create a new email/password account. Sets the display name on the
   *  Firebase user and triggers a verification email best-effort. */
  signUpWithPassword: (email: string, password: string, displayName?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInModalOpen: boolean;
  openSignIn: () => void;
  closeSignIn: () => void;
}

const Ctx = createContext<AuthState | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signInModalOpen, setOpen] = useState(false);

  // Subscribe to auth state + handle email-link return.
  useEffect(() => {
    if (!auth) { setLoading(false); return; }

    // Complete sign-in if we landed back from a magic link.
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let savedEmail = window.localStorage.getItem(STORAGE_EMAIL) || '';
      if (!savedEmail) {
        savedEmail = window.prompt('Confirmez votre courriel pour terminer la connexion :') || '';
      }
      if (savedEmail) {
        signInWithEmailLink(auth, savedEmail, window.location.href)
          .then(() => {
            window.localStorage.removeItem(STORAGE_EMAIL);
            // Strip auth params from URL.
            const url = new URL(window.location.href);
            ['apiKey', 'oobCode', 'mode', 'lang', 'continueUrl'].forEach((k) => url.searchParams.delete(k));
            window.history.replaceState({}, '', url.pathname + url.search);
          })
          .catch((e) => console.warn('[Auth] email-link sign-in failed:', e));
      }
    }

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = async () => {
    if (!auth) throw new Error('Firebase not configured');
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    setOpen(false);
  };

  const signInWithPassword = async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase not configured');
    await signInWithEmailAndPassword(auth, email, password);
    setOpen(false);
  };

  const signUpWithPassword = async (email: string, password: string, displayName?: string) => {
    if (!auth) throw new Error('Firebase not configured');
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName && cred.user) {
      try { await updateProfile(cred.user, { displayName: displayName.trim() }); }
      catch (e) { console.warn('[Auth] updateProfile failed:', e); }
    }
    // No verification email — accounts are usable immediately on creation.
    setOpen(false);
  };

  const resetPassword = async (email: string) => {
    if (!auth) throw new Error('Firebase not configured');
    await sendPasswordResetEmail(auth, email);
  };

  const sendMagicLink = async (email: string) => {
    if (!auth) throw new Error('Firebase not configured');
    await sendSignInLinkToEmail(auth, email, {
      url: window.location.origin + window.location.pathname,
      handleCodeInApp: true,
    });
    window.localStorage.setItem(STORAGE_EMAIL, email);
  };

  const signOut = async () => {
    if (!auth) return;
    await fbSignOut(auth);
  };

  // Super-admin allowlist still wins — those emails are always 'super'
  // without needing a Firestore role doc.
  const isSuperAdmin = useMemo(() => {
    if (!user?.email) return false;
    const allow = getSuperAdminAllowlist();
    if (allow.length === 0) return false;
    return emailMatchesAllowlist(user.email, allow);
  }, [user]);

  // Everyone else's role is resolved from Firestore by email, watched
  // live so role changes (assign/revoke) propagate without a reload.
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  useEffect(() => {
    if (!user?.email) { setAdminRole(null); setRoleLoading(false); return; }
    // Super-admin shortcut: no Firestore round-trip needed.
    if (isSuperAdmin) { setAdminRole('super'); setRoleLoading(false); return; }
    setRoleLoading(true);
    const unsub = watchAdminRole(user.email, (role) => {
      setAdminRole(role);
      setRoleLoading(false);
    });
    // Safety net: if the snapshot listener never fires (network stall,
    // weird transport state, etc.) we don't want the admin page stuck
    // on a spinner. After 6s, give up and treat as "no role".
    const safety = window.setTimeout(() => {
      setRoleLoading(false);
    }, 6000);
    // Best-effort uid backfill so the role doc tracks who signed in.
    if (user.uid && user.email) {
      void backfillUid(user.email, user.uid).catch(() => { /* non-fatal */ });
    }
    return () => { window.clearTimeout(safety); unsub(); };
  }, [user, isSuperAdmin]);

  const isAdmin = adminRole !== null;

  const value = useMemo<AuthState>(() => ({
    user, loading, isAdmin, adminRole, isSuperAdmin, roleLoading,
    signInWithGoogle, signInWithPassword, signUpWithPassword, resetPassword, sendMagicLink, signOut,
    signInModalOpen,
    openSignIn: () => setOpen(true),
    closeSignIn: () => setOpen(false),
  }), [user, loading, isAdmin, adminRole, isSuperAdmin, roleLoading, signInModalOpen]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export const isFirebaseAuthReady = isFirebaseReady;
