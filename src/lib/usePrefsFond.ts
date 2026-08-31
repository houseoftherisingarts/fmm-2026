// ─── Les réglages de fond, appliqués partout sur le site ─────────────
// Alex, 2026-08-28 : deux préférences posées dans l'onglet Profil
// (animer le fond, choisir un skin VIP) doivent suivre la personne sur
// TOUTES les pages, pas seulement son espace. On les pose en classes
// sur <html>, lues par src/index.css.
//
// Le fallback localStorage évite le flash : la classe s'applique dès
// le premier rendu, avant même que Firestore ait répondu.

import { useEffect, useState } from 'react';
import { definirPref, suivreFiche, type SkinMembre } from '../firebase/ordre';
import { useAuth } from '../contexts/AuthContext';

const CLE = 'fmm.prefsFond';
const SKINS: SkinMembre[] = ['bleu', 'vert', 'dore'];

interface PrefsFond {
  animationsFond?: boolean;
  skin?: SkinMembre;
}

function appliquer(p: PrefsFond) {
  const html = document.documentElement;
  html.classList.toggle('sans-animations-fond', p.animationsFond === false);
  for (const s of SKINS) html.classList.toggle(`skin-${s}`, p.skin === s);
}

function lireLocal(): PrefsFond {
  try {
    const brut = localStorage.getItem(CLE);
    return brut ? (JSON.parse(brut) as PrefsFond) : {};
  } catch { return {}; }
}

function ecrireLocal(p: PrefsFond) {
  try { localStorage.setItem(CLE, JSON.stringify(p)); } catch { /* ignore */ }
}

/** Monté une seule fois, à la racine de l'app (voir App.tsx). */
export function usePrefsFond(): void {
  const { user } = useAuth();

  // Applique tout de suite ce que le navigateur connaît déjà.
  useEffect(() => { appliquer(lireLocal()); }, []);

  useEffect(() => {
    if (!user) return;
    return suivreFiche(user.uid, (m) => {
      const p: PrefsFond = { animationsFond: m?.prefs?.animationsFond, skin: m?.prefs?.skin };
      ecrireLocal(p);
      appliquer(p);
    });
  }, [user]);
}

// ── L'interrupteur « Animations du fond » (Alex, 2026-08-31) ─────────
// Il vit sous chaque carte de skin (boutique, coffre, espace VIP) et
// dans les Réglages du profil. Un seul état, lu sur <html> : la classe
// posée ci-dessus est la source de vérité, un MutationObserver suffit
// pour que tous les interrupteurs suivent le même clic (même patron que
// useSkinActif.ts). Sans compte, la préférence reste dans le navigateur.

export function useAnimationsFond(): boolean {
  const lire = () => typeof document === 'undefined'
    || !document.documentElement.classList.contains('sans-animations-fond');
  const [actif, setActif] = useState(lire);
  useEffect(() => {
    setActif(lire());
    const obs = new MutationObserver(() => setActif(lire()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return actif;
}

export function definirAnimationsFond(uid: string | undefined, valeur: boolean): void {
  const p = { ...lireLocal(), animationsFond: valeur };
  ecrireLocal(p);
  appliquer(p);
  if (uid) void definirPref(uid, 'animationsFond', valeur).catch(() => { /* hors ligne ou aperçu */ });
}
