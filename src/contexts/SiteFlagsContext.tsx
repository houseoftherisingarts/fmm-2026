import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  type SiteFlags, SITE_FLAGS_DEFAULTS,
  subscribeSiteFlags, setSiteFlag as setSiteFlagRemote,
} from '../firebase/siteFlags';

// Site-wide feature flags. Live-synced from Firestore (siteFlags/global).
// localStorage is kept as a same-device offline fallback so the first
// paint isn't visibly defaults-then-real if Firestore is reachable.

const STORAGE_KEY = 'fmm.siteFlags.v1';

interface SiteFlagsCtx {
  flags: SiteFlags;
  // True once the first Firestore snapshot (or its error fallback) has
  // arrived — before that, `flags` may still be the all-off defaults on a
  // first-ever visit, so gates must not take a "not published" decision yet.
  ready: boolean;
  setFlag: <K extends keyof SiteFlags>(k: K, v: SiteFlags[K]) => Promise<void>;
}

const Ctx = createContext<SiteFlagsCtx | null>(null);

export const SiteFlagsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [flags, setFlags] = useState<SiteFlags>(() => {
    if (typeof localStorage === 'undefined') return SITE_FLAGS_DEFAULTS;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...SITE_FLAGS_DEFAULTS, ...JSON.parse(raw) } : SITE_FLAGS_DEFAULTS;
    } catch {
      return SITE_FLAGS_DEFAULTS;
    }
  });

  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = subscribeSiteFlags((next) => {
      setFlags(next);
      setReady(true);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* noop */ }
    });
    return unsub;
  }, []);

  const value = useMemo<SiteFlagsCtx>(
    () => ({
      flags,
      ready,
      setFlag: async (k, v) => {
        // Optimistic local update; Firestore subscription will reconcile.
        setFlags((prev) => ({ ...prev, [k]: v }));
        try { await setSiteFlagRemote(k, v); }
        catch (e) { console.warn('[siteFlags] remote write failed', e); }
      },
    }),
    [flags, ready],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useSiteFlags(): SiteFlagsCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSiteFlags must be used within SiteFlagsProvider');
  return ctx;
}

export type { SiteFlags };
