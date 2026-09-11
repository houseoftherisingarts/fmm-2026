import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import { addLocale } from '../lib/locale';
import SEO from '../components/SEO';
import Brume from '../components/Brume';
import EnteteGuilde from '../components/guilde/EnteteGuilde';
import { motDeLaForme, nomMonnaie } from '../firebase/guildes';
import { lireGuildePubliqueParSlug, suivreGuildePublique, type GuildePublique as FichePublique } from '../firebase/guildesPubliques';
import Vitrine from '../components/guilde/Vitrine';
import NotFoundPage from './NotFoundPage';

// ─── La page publique d'un groupe ────────────────────────────────────
// Addendum du 6 septembre 2026, ordre 8. Ce qu'un visiteur sans compte
// voit en ouvrant /{slug} : le hero avec le blason, la bannière d'un
// bord à l'autre, la description, la vitrine, et un bouton Rejoindre
// qui ouvre la connexion. Tout vient du miroir guildesPubliques/{id},
// que le serveur tient à jour; la fiche complète reste entre membres.


const GuildePublique: React.FC<{ slug: string }> = ({ slug }) => {
  useCaravanPage();
  const { lang } = useUI();
  const { user, openSignIn } = useAuth();
  const { search } = useLocation();
  const fr = lang === 'FR';

  const [guilde, setGuilde] = useState<FichePublique | null | undefined>(undefined);
  useEffect(() => {
    let vivant = true;
    setGuilde(undefined);
    void lireGuildePubliqueParSlug(slug)
      .then((g) => { if (vivant) setGuilde(g); })
      .catch(() => { if (vivant) setGuilde(null); });
    return () => { vivant = false; };
  }, [slug]);

  // Une fois le groupe trouvé, la fiche se suit en direct : une
  // bannière changée par un chef paraît sans recharger.
  const id = guilde?.id;
  useEffect(() => (id ? suivreGuildePublique(id, (g) => { if (g) setGuilde(g); }) : undefined), [id]);

  if (guilde === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-brass animate-spin" />
      </main>
    );
  }
  if (guilde === null) return <NotFoundPage />;

  const mot = motDeLaForme(guilde.forme, lang);
  const nb = guilde.nbMembres ?? 0;
  const rejoindre = (
    <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
      <KeyRound size={13} /> {fr ? 'Rejoindre' : 'Join'}
    </span>
  );

  return (
    <main className="min-h-screen text-ivory">
      <SEO title={guilde.nom} description={guilde.description || undefined} image={guilde.banniereUrl || guilde.blason} />
      <EnteteGuilde guilde={guilde} lang={lang} />

      <section className="relative caravan-stage bleed-edges pt-8 pb-20 overflow-hidden">
        <Brume />
        <div className="relative z-10 px-5 md:px-10 xl:px-16 space-y-6">

          {/* ── Le blason, le compte des membres, la porte ── */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="font-sans uppercase tracking-[0.22em] text-[10px]" style={{ color: 'var(--sk-gilt)' }}>{mot}</p>
              <p className="font-sans text-sm text-ivory-soft mt-1 inline-flex items-center gap-1.5">
                <Users size={12} /> {nb} {fr ? (nb > 1 ? 'membres' : 'membre') : (nb > 1 ? 'members' : 'member')}
                {guilde.monnaie && <span className="text-ivory-soft/50"> · {nomMonnaie(guilde, lang)}</span>}
              </p>
            </div>
            <div className="w-full sm:w-auto sm:ml-auto flex items-center gap-4 flex-wrap">
              <p className="font-editorial text-sm text-ivory-soft leading-relaxed">
                {user
                  ? (fr ? 'Vous avez un compte. La porte est là.' : 'You have an account. The door is right here.')
                  : (fr ? 'Connectez-vous pour demander à entrer.' : 'Sign in to ask to join.')}
              </p>
              {user
                ? <Link to={{ pathname: addLocale(`/guildes/${guilde.id}`, lang), search }}>{rejoindre}</Link>
                : <button type="button" onClick={openSignIn}>{rejoindre}</button>}
            </div>
          </div>

          {/* ── La vitrine, en lecture seule ── */}
          <Vitrine
            guilde={{ id: guilde.id, nom: guilde.nom, forme: guilde.forme, admins: [], membres: [] }}
            uid={user?.uid ?? null}
            estChef={false}
            publique
          />
        </div>
      </section>
    </main>
  );
};

export default GuildePublique;
