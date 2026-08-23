import React from 'react';
import { Link } from 'react-router-dom';
import { LogIn, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/AppContext';
import SEO from '../SEO';

// ─── La porte des jeux ───────────────────────────────────────────────
// Jouer demande un compte du festival (Alex, 2026-08-23) : c'est lui qui
// porte les parties en cours, les défis lancés à quelqu'un d'autre et
// les badges. Sans compte, la page montre la porte, pas le jeu.

const PorteDuJeu: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, openSignIn } = useAuth();
  const { lang } = useUI();
  const fr = lang === 'FR';

  // Échappatoire de développement seulement : `?apercu=1` ouvre la
  // table sans compte, pour vérifier le rendu à l'écran. Le test
  // disparaît du bundle de production (import.meta.env.DEV).
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('apercu') === '1') {
    return <>{children}</>;
  }

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-ivory-soft/60 font-sans text-sm">…</div>;
  }
  if (user) return <>{children}</>;

  return (
    <>
      <SEO
        title={fr ? 'Connectez-vous pour jouer' : 'Sign in to play'}
        description={fr
          ? 'Les jeux du festival se jouent avec un compte : parties en ligne, défis et badges y sont rattachés.'
          : 'Festival games need an account: online matches, challenges and badges live there.'}
      />
      <section className="min-h-[72vh] flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-lg text-center rounded-lg-card border border-brass/35 px-7 py-12 md:px-12"
             style={{
               background: 'linear-gradient(165deg, rgba(24,12,8,0.9), rgba(8,3,5,0.96))',
               backdropFilter: 'blur(12px)',
               boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
             }}>
          <p className="font-sans uppercase tracking-[0.28em] text-[10px] text-ivory-soft/55 mb-4">
            {fr ? 'La table de jeux' : 'The games table'}
          </p>
          <h1 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-4">
            {fr ? 'Connectez-vous pour jouer' : 'Sign in to play'}
          </h1>
          <div className="divider-brass w-16 mx-auto mb-5" />
          <p className="font-editorial text-base text-ivory-soft leading-relaxed mb-8">
            {fr
              ? 'Votre compte du festival porte vos parties, les défis que vous lancez à quelqu’un d’autre et les badges que vous ramassez sur le site. Créer le vôtre prend une minute.'
              : 'Your festival account carries your games, the challenges you send to someone else and the badges you gather across the site. Making one takes a minute.'}
          </p>
          <button
            type="button" onClick={openSignIn}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-brass/50 font-sans uppercase tracking-[0.2em] text-[11px] text-ivory hover:bg-brass/15 transition-colors"
          >
            <LogIn size={15} /> {fr ? 'Se connecter' : 'Sign in'}
          </button>
          <p className="mt-6 font-sans text-xs text-ivory-soft/55 inline-flex items-center justify-center gap-2">
            <Users size={13} /> {fr ? 'Le compte ouvre aussi les parties à deux.' : 'The account also opens two-player matches.'}
          </p>
          <div className="mt-8">
            <Link to={fr ? '/jeux' : '/en/games'}
                  className="font-sans uppercase tracking-[0.2em] text-[10px] text-ivory-soft/50 hover:text-brass transition-colors">
              {fr ? 'Retour aux jeux' : 'Back to the games'}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default PorteDuJeu;
