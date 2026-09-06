import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { lireGuildeParSlug, type Guilde } from '../firebase/guildes';
import { ongletDepuisSlug } from '../components/guilde/Onglets';
import GuildePage from './GuildePage';
import GuildePublique from './GuildePublique';
import NotFoundPage from './NotFoundPage';

// ─── L'adresse d'un groupe ───────────────────────────────────────────
// Alex, 6 septembre 2026 : « all under /groupnameclan ». Cette route
// attrape ce qu'aucune page du festival n'a réclamé, cherche un groupe
// portant ce nom, et lui passe la main. Rien à ce nom, ou un onglet qui
// n'existe pas : la page 404 habituelle prend le relais. Sans compte, le
// visiteur voit la page publique du groupe (addendum du 6 septembre,
// ordre 8), quel que soit l'onglet demandé.

const GuildeParSlug: React.FC = () => {
  const { slug, onglet } = useParams<{ slug: string; onglet?: string }>();
  const { user, loading } = useAuth();
  const [guilde, setGuilde] = useState<Guilde | null | undefined>(undefined);

  // La fiche se lit entre membres : on attend que la session soit
  // restaurée avant de demander, sinon un membre qui recharge la page
  // tombe sur la 404 le temps que Firebase se réveille.
  useEffect(() => {
    let vivant = true;
    setGuilde(undefined);
    if (!slug) { setGuilde(null); return; }
    if (loading || !user) return;
    void lireGuildeParSlug(slug)
      .then((g) => { if (vivant) setGuilde(g); })
      .catch(() => { if (vivant) setGuilde(null); });
    return () => { vivant = false; };
  }, [slug, loading, user]);

  if (!loading && !user) return slug ? <GuildePublique slug={slug} /> : <NotFoundPage />;

  if (guilde === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-brass animate-spin" />
      </main>
    );
  }

  const cle = ongletDepuisSlug(onglet);
  if (guilde === null || (onglet && !cle)) return <NotFoundPage />;

  return <GuildePage guildeInitiale={guilde} onglet={cle || 'mur'} />;
};

export default GuildeParSlug;
