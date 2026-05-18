import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, LogIn, Music } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/AppContext';
import { addLocale } from '../lib/locale';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import MusicianForm from '../components/musician/MusicianForm';

// DEV-only bypass — when on, we skip the sign-in gate so devs can fill
// the form against the mock store without authenticating.
const DEV_BYPASS = import.meta.env.VITE_ADMIN_DEV_BYPASS === 'true' && import.meta.env.DEV;

const MusicianApplicationPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  const { user, openSignIn } = useAuth();

  return (
    <>
      <SEO title={t.title} description={t.intro} />
      <section className="relative pt-28 pb-24 md:pt-32 md:pb-32 overflow-hidden text-ivory">
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <Link
            to={addLocale('/musique', lang)}
            className="inline-flex items-center gap-2 font-sans text-xs uppercase tracking-widest text-ivory-soft hover:text-brass mb-10 transition"
          >
            <ArrowLeft size={14} /> {t.back}
          </Link>

          <p className="font-editorial italic text-brass uppercase tracking-[0.4em] text-xs md:text-sm mb-3 text-center">
            <Music size={12} className="inline mr-1.5 -mt-0.5" />{t.eyebrow}
          </p>

          <h1 className="font-display title-medieval text-5xl md:text-7xl text-ivory mb-5 text-center leading-[1.05]">
            {t.title}
          </h1>

          <motion.div
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.3 }}
            className="h-px bg-gradient-to-r from-transparent via-brass to-transparent w-32 mx-auto mb-6 origin-center"
          />

          <p className="font-editorial italic text-base md:text-lg text-ivory-soft max-w-2xl mx-auto text-center mb-12">
            {t.intro}
          </p>

          {!user && !DEV_BYPASS ? (
            <div className="velvet-card rounded-lg-card p-10 md:p-12 text-center relative overflow-hidden max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-full bg-brass/15 border border-brass/45 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(212,168,87,0.4)]">
                <LogIn size={28} className="text-brass" />
              </div>
              <h2 className="font-display title-medieval text-3xl md:text-4xl text-ivory mb-4">{t.authTitle}</h2>
              <p className="font-editorial text-base md:text-lg text-ivory-soft mb-8 max-w-md mx-auto italic">{t.authBody}</p>
              <button
                onClick={openSignIn}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-sm font-semibold rounded-card hover:bg-brass-soft transition"
              >
                {t.signInCta} <ArrowUpRight size={16} />
              </button>
              <p className="font-editorial italic text-xs text-stone mt-5">{t.authNote}</p>
            </div>
          ) : (
            <MusicianForm />
          )}
        </div>
      </section>
    </>
  );
};

const FR = {
  back:      'Retour à la musique',
  eyebrow:   'Candidature musicale',
  title:     'Soumettre ma candidature',
  intro:     'Remplissez ce formulaire pour proposer votre groupe au FMM 2026. Pitch (Éric Pichette) lira chaque candidature et reviendra par courriel.',
  authTitle: 'Créez votre compte FMM',
  authBody:  'Pour soumettre et modifier votre candidature, créez un compte ou connectez-vous. Votre courriel sera utilisé pour la suite.',
  authNote:  'Connexion via Google ou par lien magique courriel.',
  signInCta: 'Continuer',
};

const EN: typeof FR = {
  back:      'Back to music',
  eyebrow:   'Music application',
  title:     'Submit my application',
  intro:     'Fill in this form to propose your band for FMM 2026. Pitch (Éric Pichette) will read every application and follow up by email.',
  authTitle: 'Create your FMM account',
  authBody:  'To submit and edit your application, create an account or sign in. Your email will be used for follow-ups.',
  authNote:  'Sign in with Google or an email magic link.',
  signInCta: 'Continue',
};

export default MusicianApplicationPage;
