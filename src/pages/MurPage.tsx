import React from 'react';
import { Link } from 'react-router-dom';
import { Shield , Users} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import { addLocale } from '../lib/locale';
import SEO from '../components/SEO';
import Brume from '../components/Brume';
import PageHeader from '../components/layout/PageHeader';
import MurSocial from '../components/mur/MurSocial';
import PubMur from '../components/mur/PubMur';
import AnnoncesPanel from '../components/compte/AnnoncesPanel';

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
        {/* Pleine largeur (Alex, 2026-08-28) : le composeur centré au-dessus,
            puis deux colonnes égales, le fil à gauche, offres et demandes à droite. */}
        <div className="relative z-10 w-full px-4 md:px-8">
          <div>
          <div className="mb-6 flex flex-wrap gap-3">
            <Link to={addLocale('/guildes', lang)}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-brass text-midnight-deep font-sans uppercase tracking-[0.2em] text-sm font-semibold hover:bg-brass-soft transition rounded-card">
              <Shield size={18} /> {fr ? 'Voir les guildes et les clans' : 'See the guilds and clans'}
            </Link>
            <Link to={addLocale('/ordre', lang)}
                  className="inline-flex items-center gap-3 px-8 py-4 font-sans uppercase tracking-[0.2em] text-sm font-semibold transition rounded-card"
                  style={{ border: '1px solid rgba(var(--sk-gilt-rgb),0.45)', color: 'var(--sk-gilt)' }}>
              <Users size={18} /> {fr ? 'Voir les membres de l’Ordre' : 'See the members of the Order'}
            </Link>
          </div>
          {user ? (
            <>
              <div className="max-w-3xl mx-auto mb-8">
                <MurSocial lang={lang} seulementComposeur />
              </div>
              <div className="mb-8"><PubMur lang={lang} /></div>
              <div className="lg:grid lg:grid-cols-2 lg:gap-8 items-start">
                <div>
                  <p className="witcher-stat-label mb-3">{fr ? 'Le fil' : 'The feed'}</p>
                  <MurSocial lang={lang} filtre="billets" avecComposeur={false} avecAnnonces={false} />
                </div>
                <div className="mt-8 lg:mt-0">
                  <p className="witcher-stat-label mb-3">{fr ? 'Offres et demandes' : 'Offers and requests'}</p>
                  <MurSocial lang={lang} filtre="offres" avecComposeur={false} avecAnnonces={false} />
                </div>
              </div>
              {/* Les annonces du festival, au bas, sur le babillard Witcher
                  (Alex, 2026-08-28 : sinon personne ne les lit). */}
              <div className="mt-12">
                <AnnoncesPanel lang={lang} />
              </div>
            </>
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
        </div>
      </section>
    </main>
  );
};

export default MurPage;
