import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { lireGuildeParSlug, type Guilde } from '../firebase/guildes';
import { ongletDepuisSlug } from '../components/guilde/Onglets';
import GuildePage from './GuildePage';
import NotFoundPage from './NotFoundPage';

// ─── L'adresse d'un groupe ───────────────────────────────────────────
// Alex, 6 septembre 2026 : « all under /groupnameclan ». Cette route
// attrape ce qu'aucune page du festival n'a réclamé, cherche un groupe
// portant ce nom, et lui passe la main. Rien à ce nom, ou un onglet qui
// n'existe pas : la page 404 habituelle prend le relais.

const GuildeParSlug: React.FC = () => {
  const { slug, onglet } = useParams<{ slug: string; onglet?: string }>();
  const [guilde, setGuilde] = useState<Guilde | null | undefined>(undefined);

  useEffect(() => {
    let vivant = true;
    setGuilde(undefined);
    if (!slug) { setGuilde(null); return; }
    void lireGuildeParSlug(slug)
      .then((g) => { if (vivant) setGuilde(g); })
      .catch(() => { if (vivant) setGuilde(null); });
    return () => { vivant = false; };
  }, [slug]);

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
