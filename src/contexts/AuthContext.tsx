import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { publierFiche, anneesRetenues, oublierLesAnnees, ANNEES_POUR_VETERAN } from '../firebase/ordre';
import { gagner as gagnerUnBadge } from '../firebase/badges';
import { declarerMonParrain, codeRetenu, oublierLeCode } from '../firebase/parrainage';
import { marquerVuAujourdhui } from '../firebase/guildes';
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
import { assurerFiche } from '../firebase/ordre';
import type { AdminRole } from '../lib/adminPermissions';
import { codeAuth } from '../lib/authErreurs';

// Allowlist: who counts as a SUPER ADMIN by email. Sourced from
// VITE_ADMIN_EMAILS (comma-separated). Each entry is either a full
// email or a bare domain: domain entries grant super-admin to anyone
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

// Le domaine court sert de raccourci et redirige (301) vers le vrai
// domaine. Un lien de connexion qui repasserait par là risque de perdre
// ses paramètres en chemin, et de toute façon la mémoire du navigateur
// (l'adresse retenue) appartient à l'origine d'où part la demande. Le
// lien revient donc toujours sur le domaine canonique.
const ORIGINE_CANONIQUE = 'https://www.festivalmedievaldemontpellier.org';
const DOMAINES_RACCOURCIS = /(^|\.)festivalmedieval\.org$/i;

function origineDeRetour(): string {
  const h = window.location.hostname;
  return DOMAINES_RACCOURCIS.test(h) ? ORIGINE_CANONIQUE : window.location.origin;
}

export type EtatLien = 'aucun' | 'verification' | 'courrielRequis' | 'erreur';

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
  /** Où en est la finalisation d'un lien de connexion reçu par
   *  courriel. 'aucun' = la page n'est pas une page d'atterrissage.
   *  'verification' = le lien est en train d'être échangé contre une
   *  session. 'courrielRequis' = le lien s'ouvre dans un navigateur qui
   *  ne se souvient pas de l'adresse (autre appareil, autre fureteur,
   *  navigation privée), il faut la redemander. 'erreur' = le lien est
   *  mort ou l'échange a échoué. */
  lienEtat: EtatLien;
  /** Le code Firebase de la dernière erreur du lien, ou ''. */
  lienCode: string;
  /** Termine la connexion avec l'adresse que la personne vient de
   *  retaper. Ne jette pas : l'état du contexte porte le résultat. */
  finaliserLien: (email: string) => Promise<void>;
  /** Referme l'écran de finalisation et nettoie l'adresse du lien. */
  abandonnerLien: () => void;
  signInModalOpen: boolean;
  openSignIn: () => void;
  closeSignIn: () => void;
}

const Ctx = createContext<AuthState | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signInModalOpen, setOpen] = useState(false);
  const [lienEtat, setLienEtat] = useState<EtatLien>(() =>
    auth && typeof window !== 'undefined' && isSignInWithEmailLink(auth, window.location.href)
      ? 'verification' : 'aucun');
  const [lienCode, setLienCode] = useState('');

  // Une fois la session ouverte, l'adresse du lien n'a plus rien à faire
  // dans la barre : elle contient un code à usage unique, et un
  // rafraîchissement la rejouerait pour rien.
  const nettoyerAdresse = () => {
    const url = new URL(window.location.href);
    ['apiKey', 'oobCode', 'mode', 'lang', 'continueUrl', 'tenantId'].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  };

  /** L'échange du lien contre une vraie session. Ne jette jamais :
   *  l'écran de finalisation lit `lienEtat` et `lienCode`. */
  const finaliserLien = async (email: string) => {
    if (!auth) return;
    const propre = email.trim();
    if (!propre.includes('@')) { setLienCode('auth/invalid-email'); setLienEtat('courrielRequis'); return; }
    setLienEtat('verification'); setLienCode('');
    try {
      await signInWithEmailLink(auth, propre, window.location.href);
      window.localStorage.removeItem(STORAGE_EMAIL);
      nettoyerAdresse();
      setLienEtat('aucun'); setLienCode('');
      setOpen(false);
    } catch (e) {
      const code = codeAuth(e);
      // Une adresse qui ne correspond pas au lien laisse le code intact :
      // la personne retape et réessaie. Un lien mort, lui, est mort.
      const recuperable = code === 'auth/invalid-email' || code === 'auth/missing-email';
      setLienCode(code === 'auth/invalid-email' ? 'lien/adresse-differente' : (code || 'auth/invalid-action-code'));
      setLienEtat(recuperable ? 'courrielRequis' : 'erreur');
      console.warn('[Auth] finalisation du lien refusée :', code || e);
    }
  };

  const abandonnerLien = () => {
    window.localStorage.removeItem(STORAGE_EMAIL);
    nettoyerAdresse();
    setLienEtat('aucun'); setLienCode('');
  };

  // Subscribe to auth state + handle email-link return.
  useEffect(() => {
    if (!auth) { setLoading(false); return; }

    // Le retour du lien reçu par courriel. L'adresse retenue au départ
    // n'existe que sur l'origine et le navigateur d'où la demande est
    // partie : ouvrir le lien sur le téléphone, dans un autre fureteur
    // ou en navigation privée tombe forcément à vide. Dans ce cas
    // l'écran de finalisation la redemande, au lieu du `window.prompt`
    // que les navigateurs mobiles avalent sans rien dire.
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const retenue = window.localStorage.getItem(STORAGE_EMAIL) || '';
      if (retenue) void finaliserLien(retenue);
      else { setLienEtat('courrielRequis'); setLienCode(''); }
    }

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      // Toute personne connectée entre au registre de l'Ordre, quel que
      // soit le chemin pris : Google, mot de passe, ou le lien reçu
      // après une inscription à l'infolettre du pied de page. La fiche
      // se pose une seule fois et l'échec reste sans conséquence, la
      // page « Ma fiche » repassera derrière (Alex, 2026-08-24).
      if (u) {
        const nom = u.displayName?.trim()
          || (window.location.pathname.startsWith('/en') ? 'A stranger' : 'Un inconnu');
        void assurerFiche(u.uid, nom, u.photoURL).catch(() => { /* hors ligne */ });
      }
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
    // No verification email: accounts are usable immediately on creation.
    setOpen(false);
  };

  const resetPassword = async (email: string) => {
    if (!auth) throw new Error('Firebase not configured');
    await sendPasswordResetEmail(auth, email);
  };

  const sendMagicLink = async (email: string) => {
    if (!auth) throw new Error('Firebase not configured');
    const propre = email.trim();
    // Le projet Firebase envoie ses courriels en anglais par défaut
    // (`defaultLocale: en` dans la configuration). Une personne qui
    // demande son lien depuis une page française doit le recevoir en
    // français, sinon le courriel ressemble à un pourriel et finit
    // ignoré : c'est là qu'une inscription se perd.
    auth.languageCode = window.location.pathname.startsWith('/en') ? 'en' : 'fr';
    await sendSignInLinkToEmail(auth, propre, {
      url: origineDeRetour() + window.location.pathname,
      handleCodeInApp: true,
    });
    window.localStorage.setItem(STORAGE_EMAIL, propre);
  };

  const signOut = async () => {
    if (!auth) return;
    await fbSignOut(auth);
  };

  // Super-admin allowlist still wins: those emails are always 'super'
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
    lienEtat, lienCode, finaliserLien, abandonnerLien,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [user, loading, isAdmin, adminRole, isSuperAdmin, roleLoading, signInModalOpen, lienEtat, lienCode]);

  // Une fiche importée se réclame à la première vraie connexion : le
  // petit « i » du registre disparaît alors (Alex, 2026-08-28).
  useEffect(() => {
    if (!user) return;
    void publierFiche(user.uid, { importe: false }).catch(() => { /* hors ligne */ });
  }, [user]);

  // Les éditions cochées à l'inscription rejoignent la fiche, et deux
  // années valent le badge du vétéran (Alex, 2026-08-28).
  useEffect(() => {
    const annees = anneesRetenues();
    if (!user || annees.length === 0) return;
    void publierFiche(user.uid, { anneesPresence: annees })
      .then(async () => {
        if (annees.length >= ANNEES_POUR_VETERAN) await gagnerUnBadge('veteran', user.uid);
        oublierLesAnnees();
      })
      .catch(() => { /* le prochain passage réessaiera */ });
  }, [user]);

  // La marque de passage, une fois par jour (contrat
  // CLAN-MONNAIE-CONTRAT.md, 6 septembre 2026). Le taux d'une guilde
  // suit le nombre de ses membres vus dans les trente derniers jours,
  // et c'est cette écriture qui le dit. La garde en localStorage évite
  // de réécrire à chaque page ouverte.
  useEffect(() => {
    if (!user) return;
    void marquerVuAujourdhui(user.uid).catch(() => { /* le prochain passage réessaiera */ });
  }, [user]);

  // Le parrainage : un compte qui vient de naître avec un code retenu
  // entre dans la lignée de son parrain, une seule fois (Alex,
  // 2026-08-28). Un compte ancien qui se reconnecte n'y touche pas.
  useEffect(() => {
    const code = codeRetenu();
    if (!user || !code) return;
    const neuf = user.metadata?.creationTime === user.metadata?.lastSignInTime;
    if (!neuf) { oublierLeCode(); return; }
    void declarerMonParrain(user.uid, user.displayName || '', code)
      .then(() => oublierLeCode())
      .catch(() => { /* le prochain passage réessaiera */ });
  }, [user]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export const isFirebaseAuthReady = isFirebaseReady;
