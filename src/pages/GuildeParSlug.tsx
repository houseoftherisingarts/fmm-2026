import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/AppContext';
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
  const { user, loading, openSignIn } = useAuth();
  const { lang } = useUI();
  const fr = lang === 'FR';
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

  if (!loading && !user) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-light rounded-lg-card p-8 text-center max-w-md">
          <p className="font-editorial text-base text-ivory-soft leading-relaxed mb-5">
            {fr ? 'Ce groupe se lit entre membres. Connectez-vous pour l’ouvrir.' : 'This group is read among members. Sign in to open it.'}
          </p>
          <button type="button" onClick={openSignIn}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
            {fr ? 'Se connecter' : 'Sign in'}
          </button>
        </div>
      </main>
    );
  }

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
