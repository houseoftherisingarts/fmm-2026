import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import BoutiqueMontpellois from '../components/boutique/BoutiqueMontpellois';

// ─── /boutique · La boutique en Montpellois ───────────────────────────
// Routes /boutique et /en/shop posées par Alex dans App.tsx (composant :
// BoutiquePage). `?apercu=1` (dev seulement) saute le mur de connexion
// pour la vérification visuelle, même patron que ChantierPage.
// Alex, 2026-08-28.
const BoutiquePage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const fr = lang === 'FR';
  const { user, openSignIn } = useAuth();
  const location = useLocation();
  const apercu = import.meta.env.DEV && new URLSearchParams(location.search).get('apercu') === '1';

  return (
    <main className="min-h-screen text-ivory">
      <SEO title={fr ? 'La boutique' : 'The shop'} noindex />
      <PageHeader
        eyebrow={fr ? 'L’Ordre · les Montpellois' : 'The Order · the Montpellois'}
        titleA={fr ? 'La boutique' : 'The shop'}
        intro={fr
          ? 'Des cosmétiques pour votre personnage, des skins pour le site, et bientôt les albums des groupes, contre les Montpellois gagnés en explorant le festival.'
          : 'Cosmetics for your character, skins for the site, and soon band albums, for the Montpellois earned while exploring the festival.'}
        orbImage="/orb/marche.jpg"
      />
      <section className="relative bleed-edges pt-4 pb-24 overflow-hidden">
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          {!user ? (
            <div className="glass-light rounded-lg-card p-8 text-center max-w-xl mx-auto">
              <p className="font-editorial text-base text-ivory-soft leading-relaxed mb-5">
                {fr ? 'La boutique se visite entre membres. Connectez-vous pour voir votre bourse.' : 'The shop is for members only. Sign in to see your purse.'}
              </p>
              <button type="button" onClick={openSignIn}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
                {fr ? 'Se connecter' : 'Sign in'}
              </button>
            </div>
          ) : (
            <BoutiqueMontpellois lang={lang} />
          )}
        </div>
      </section>
    </main>
  );
};

export default BoutiquePage;
