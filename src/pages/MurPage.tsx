import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import { addLocale } from '../lib/locale';
import SEO from '../components/SEO';
import Brume from '../components/Brume';
import PageHeader from '../components/layout/PageHeader';
import MurSocial from '../components/mur/MurSocial';
import PubMur from '../components/mur/PubMur';

// ─── Le mur social ───────────────────────────────────────────────────
// Les billets de tous les membres de l'Ordre et les annonces du
// festival, en ordre chronologique (Alex, 2026-08-27).
const MurPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const { user, openSignIn } = useAuth();
  const fr = lang === 'FR';
  return (
    <main className="min-h-screen text-ivory">
      <SEO title={fr ? 'Mur social' : 'Social wall'} noindex />
      <PageHeader
        eyebrow={fr ? 'L’Ordre' : 'The Order'}
        titleA={fr ? 'Mur social' : 'Social wall'}
        intro={fr
          ? 'Ce que les membres de l’Ordre racontent, et les annonces du festival, dans le même fil.'
          : 'What members of the Order share, and the festival notices, in one feed.'}
        orbImage="/histoire/archives/lievre/2022-e9ed2ea5.webp"
      />
      <section className="relative caravan-stage bleed-edges pt-4 pb-20 overflow-hidden">
        <Brume />
        <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-8 lg:grid lg:grid-cols-12 lg:gap-8 items-start">
          <div className="lg:col-span-8">
          <div className="mb-5">
            <Link to={addLocale('/guildes', lang)}
                  className="inline-flex items-center gap-2 font-sans text-xs uppercase tracking-wider text-ivory-soft hover:text-brass transition">
              <Shield size={13} /> {fr ? 'Voir les guildes' : 'See the guilds'}
            </Link>
          </div>
          {user ? (
            <MurSocial lang={lang} />
          ) : (
            <div className="glass-light rounded-lg-card p-8 text-center">
              <p className="font-editorial text-base text-ivory-soft leading-relaxed mb-5">
                {fr ? 'Le mur se lit entre membres. Connectez-vous pour l’ouvrir.' : 'The wall is read among members. Sign in to open it.'}
              </p>
              <button type="button" onClick={openSignIn}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
                {fr ? 'Se connecter' : 'Sign in'}
              </button>
            </div>
          )}
          </div>
          {/* La bannière publicitaire, sur le côté (Alex, 2026-08-27). */}
          <div className="lg:col-span-4 mt-8 lg:mt-0 lg:sticky lg:top-24">
            <PubMur lang={lang} />
          </div>
        </div>
      </section>
    </main>
  );
};

export default MurPage;
