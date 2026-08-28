import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/AppContext';
import { addLocale } from '../lib/locale';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import Brume from '../components/Brume';
import FicheMembre from '../components/compte/FicheMembre';
// Banc d'essai des repères de photos, dev seulement (?bancPhotos=1) :
// à retirer une fois la vérification visuelle faite (Alex, 2026-08-28).
import BancPhotos from '../components/compte/BancPhotos';

// ─── Mon espace ──────────────────────────────────────────────────────
// La page ne garde plus que la porte : le pitch et la connexion pour
// qui n'a pas de compte. Dès qu'on est entré, c'est FicheMembre qui
// rend l'espace, et la même fiche sert la version publique du profil
// (Alex, 2026-08-23).

const USER_APERCU = { uid: 'apercu', email: 'apercu@fmm.test', displayName: 'Dame Aperçu' };

const ComptePage: React.FC = () => {
  useCaravanPage();
  const { user: compte, loading, openSignIn, signInWithGoogle } = useAuth();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;

  // Échappatoire de développement seulement, comme sur la porte du jeu :
  // `?apercu=1` montre l'espace sans compte, pour vérifier le rendu à
  // l'écran. Le test disparaît du bundle de production.
  const apercu = import.meta.env.DEV
    && new URLSearchParams(window.location.search).get('apercu') === '1';
  const user = compte ?? (apercu ? (USER_APERCU as unknown as typeof compte) : null);

  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleErr, setGoogleErr] = useState<string | null>(null);
  const handleGoogle = async () => {
    setGoogleBusy(true); setGoogleErr(null);
    try { await signInWithGoogle(); }
    catch (e) { setGoogleErr(e instanceof Error ? e.message : String(e)); }
    finally { setGoogleBusy(false); }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent border-brass animate-spin" />
      </main>
    );
  }

  // ── Sans compte : le pitch et la porte d'entrée ──
  if (!user) {
    return (
      <main className="min-h-screen text-ivory">
        <SEO title={t.title} noindex />
        <section className="relative caravan-stage bleed-edges pt-28 pb-16 md:pt-36 md:pb-20 overflow-hidden">
          <img decoding="async" fetchPriority="low" src="/wix/home/scene-cinematic.jpg" alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-b from-midnight-deep/90 via-midnight/90 to-midnight-deep" />
          <Brume />
          <div className="relative max-w-2xl mx-auto px-4 md:px-8 text-center">
            <Link to={addLocale('/', lang)} className="inline-flex items-center gap-2 font-sans text-xs uppercase tracking-widest text-ivory-soft hover:text-brass mb-8 transition">
              <ArrowLeft size={14} /> {t.home}
            </Link>
            <p className="font-editorial text-brass uppercase tracking-[0.3em] text-xs md:text-sm mb-4">{t.eyebrow}</p>
            <h1 className="font-display title-medieval text-4xl md:text-6xl text-ivory mb-5">{t.title}</h1>
            <div className="divider-brass w-24 mx-auto mb-5" />
            <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed mb-8 max-w-xl mx-auto">{t.signedOutLead}</p>
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-center max-w-md mx-auto">
              <button
                onClick={handleGoogle}
                disabled={googleBusy}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-3 bg-ivory text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.13 4.13 0 0 1-1.79 2.71v2.26h2.9c1.7-1.56 2.69-3.86 2.69-6.62z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.9-2.26c-.81.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.71H.96v2.33A8.99 8.99 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.95 10.71A5.41 5.41 0 0 1 3.66 9c0-.59.1-1.17.29-1.71V4.96H.96A8.99 8.99 0 0 0 0 9c0 1.45.35 2.83.96 4.04l2.99-2.33z"/>
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.42 0 9 0A8.99 8.99 0 0 0 .96 4.96l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"/>
                </svg>
                {googleBusy ? t.connexion : t.google}
              </button>
              <button onClick={openSignIn}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 border border-brass text-brass hover:bg-brass hover:text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card">
                {t.autresOptions} <ArrowUpRight size={14} />
              </button>
            </div>
            {googleErr && <p className="text-xs text-blush font-editorial mt-4">{googleErr}</p>}
          </div>
        </section>
      </main>
    );
  }

  const bancPhotos = import.meta.env.DEV
    && new URLSearchParams(window.location.search).get('bancPhotos') === '1';

  return (
    <>
      <FicheMembre
        mode="prive"
        uid={user.uid}
        lang={lang}
        compte={{ uid: user.uid, email: user.email, displayName: user.displayName }}
      />
      {bancPhotos && (
        <div className="max-w-4xl mx-auto px-4 md:px-8 pb-16">
          <BancPhotos />
        </div>
      )}
    </>
  );
};

const FR = {
  home: 'Accueil', eyebrow: 'Mon compte', title: 'Mon espace FMM',
  signedOutLead: 'Votre espace garde vos billets à l’abri, vous donne les avis du festival avant tout le monde, et ouvre le salon des jeux. C’est aussi d’ici que vous postulez comme bénévole ou marchand, et que vous suivez votre dossier.',
  google: 'Continuer avec Google', connexion: 'Connexion…', autresOptions: 'Autres options',
};

const EN: typeof FR = {
  home: 'Home', eyebrow: 'My account', title: 'My FMM space',
  signedOutLead: 'Your space keeps your tickets safe, gives you festival notices before anyone else, and opens the games room. It is also where you apply as a volunteer or merchant, and follow your application.',
  google: 'Continue with Google', connexion: 'Connecting…', autresOptions: 'More options',
};

export default ComptePage;
