// ─── Le fil des badges ───────────────────────────────────────────────
// Un seul endroit sait ce que le visiteur a gagné, décide s'il faut
// faire sonner la fanfare, et affiche l'annonce au centre de l'écran.
//
// Hors compte, le badge dort dans le navigateur : l'annonce invite
// alors à se connecter pour le réclamer. À la connexion, tout remonte.

import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { useAuth } from './AuthContext';
import {
  COLLECTIONS, avancement, badgeParId, badgesLocaux, collectionDuBadge,
  gagner, reclamerLesLocaux, suivreBadges, type Badge, type Collection,
} from '../firebase/badges';
import { sonnerBadge, sonnerFanfare } from '../lib/fanfare';

export interface AnnonceBadge {
  badge: Badge;
  /** La collection vient de se compléter avec ce badge. */
  collection?: Collection;
  /** Tous les badges du site sont réunis. */
  grandChelem?: boolean;
  /** Gagné hors compte : il reste à le réclamer. */
  aReclamer: boolean;
}

interface EtatBadges {
  obtenus: string[];
  possede: (id: string) => boolean;
  gagnerBadge: (id: string) => void;
  annonce: AnnonceBadge | null;
  fermerAnnonce: () => void;
}

const Ctx = createContext<EtatBadges | null>(null);

export const BadgesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [distants, setDistants] = useState<string[]>([]);
  const [locaux, setLocaux] = useState<string[]>(() => badgesLocaux());
  const [file, setFile] = useState<AnnonceBadge[]>([]);
  const enCours = useRef(new Set<string>());

  useEffect(() => {
    if (!user?.uid) { setDistants([]); return; }
    const stop = suivreBadges(user.uid, setDistants);
    void reclamerLesLocaux(user.uid).then(() => setLocaux(badgesLocaux()));
    return stop;
  }, [user?.uid]);

  const obtenus = useMemo(
    () => Array.from(new Set([...distants, ...locaux])),
    [distants, locaux],
  );

  const possede = useCallback((id: string) => obtenus.includes(id), [obtenus]);

  const gagnerBadge = useCallback((id: string) => {
    const badge = badgeParId(id);
    if (!badge) return;
    if (enCours.current.has(id)) return;
    enCours.current.add(id);
    void gagner(id, user?.uid).then((neuf) => {
      if (!neuf) return;
      const apres = Array.from(new Set([...obtenus, id]));
      if (!user?.uid) setLocaux(badgesLocaux());
      const etat = avancement(apres);
      const coll = collectionDuBadge(id);
      const completee = etat.parCollection.find(
        (c) => c.collection.id === coll?.id && c.complete,
      );
      setFile((f) => [...f, {
        badge,
        collection: completee ? coll : undefined,
        grandChelem: etat.tout,
        aReclamer: !user?.uid,
      }]);
    }).catch(() => { enCours.current.delete(id); });
  }, [obtenus, user?.uid]);

  // Deux badges se gagnent sans rien faire de particulier : pousser la
  // porte du site, et avoir un compte.
  // Jamais sur l'accueil : le chevalier et l'orbe ont droit à leur
  // entrée sans qu'une annonce leur passe devant (vérifié à l'écran,
  // 2026-08-23). Le badge tombe à la première vraie page.
  const surLaccueil = typeof window !== 'undefined'
    && (['/', '/en', '/en/'].includes(window.location.pathname)
        || (import.meta.env.DEV && new URLSearchParams(window.location.search).has('apercu')));
  useEffect(() => {
    if (surLaccueil) return;
    const t = window.setTimeout(() => gagnerBadge('visiteur'), 6000);
    return () => window.clearTimeout(t);
  }, [surLaccueil, gagnerBadge]);
  useEffect(() => {
    if (user?.uid) gagnerBadge('membre');
  }, [user?.uid, gagnerBadge]);

  const annonce = file[0] ?? null;
  const fermerAnnonce = useCallback(() => setFile((f) => f.slice(1)), []);

  // Le son suit l'annonce affichée, jamais l'attribution : le navigateur
  // refuse le son tant que la personne n'a rien touché de toute façon.
  const derniere = useRef<string | null>(null);
  useEffect(() => {
    if (!annonce) { derniere.current = null; return; }
    if (derniere.current === annonce.badge.id) return;
    derniere.current = annonce.badge.id;
    if (annonce.collection || annonce.grandChelem) sonnerFanfare();
    else sonnerBadge();
  }, [annonce]);

  const valeur = useMemo<EtatBadges>(
    () => ({ obtenus, possede, gagnerBadge, annonce, fermerAnnonce }),
    [obtenus, possede, gagnerBadge, annonce, fermerAnnonce],
  );

  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>;
};

export function useBadges(): EtatBadges {
  const v = useContext(Ctx);
  if (!v) {
    return {
      obtenus: [], possede: () => false, gagnerBadge: () => {},
      annonce: null, fermerAnnonce: () => {},
    };
  }
  return v;
}

/** Gagne un badge dès que la condition est vraie. Un seul appel suffit. */
export function useGagnerBadge(id: string, quand: boolean = true) {
  const { gagnerBadge } = useBadges();
  useEffect(() => {
    if (quand) gagnerBadge(id);
  }, [id, quand, gagnerBadge]);
}

export { COLLECTIONS };

/** Gagne un badge quand la personne a vraiment descendu la page. */
export function useBadgeAuBout(id: string, seuil = 0.82) {
  const { gagnerBadge } = useBadges();
  useEffect(() => {
    let fait = false;
    const regarder = () => {
      if (fait) return;
      const h = document.documentElement;
      const total = h.scrollHeight - h.clientHeight;
      if (total <= 0) return;
      if ((h.scrollTop || window.scrollY) / total >= seuil) {
        fait = true;
        gagnerBadge(id);
        window.removeEventListener('scroll', regarder);
      }
    };
    window.addEventListener('scroll', regarder, { passive: true });
    const t = window.setTimeout(regarder, 1200);
    return () => { window.removeEventListener('scroll', regarder); window.clearTimeout(t); };
  }, [id, seuil, gagnerBadge]);
}

/** Retient les jeux joués et décerne « joueur » quand la table est faite. */
const CLE_JEUX = 'fmm-jeux-joues';
export function useBadgeJeu(jeu: 'tafl' | 'tarot' | 'des') {
  const { gagnerBadge } = useBadges();
  useEffect(() => {
    gagnerBadge('petit-joueur');
    let joues: string[] = [];
    try { joues = JSON.parse(localStorage.getItem(CLE_JEUX) || '[]'); } catch { joues = []; }
    if (!joues.includes(jeu)) {
      joues = [...joues, jeu];
      try { localStorage.setItem(CLE_JEUX, JSON.stringify(joues)); } catch { /* rien */ }
    }
    if (['tafl', 'tarot', 'des'].every((j) => joues.includes(j))) gagnerBadge('joueur');
  }, [jeu, gagnerBadge]);
}
