import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, LogIn, ShoppingBag, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/AppContext';
import { addLocale } from '../lib/locale';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import VendorQuestForm from '../components/vendor/VendorQuestForm';
import OvertureScroll from '../components/vendor/OvertureScroll';
import EmberCanvas from '../components/vendor/EmberCanvas';
import CandleSpotlight from '../components/vendor/CandleSpotlight';
import LanternRow from '../components/vendor/LanternRow';
import ApprovedVendorsList from '../components/vendor/ApprovedVendorsList';
import { CURRENT_YEAR } from '../firebase/applications';

const VendorApplicationPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  const { user, openSignIn } = useAuth();
  const reduceMotion = useReducedMotion();

  // ?year= drives which festival year this application lands under.
  // Accepted: CURRENT_YEAR (2026) or CURRENT_YEAR+1 (2027 — early reservation).
  // Anything else falls back to CURRENT_YEAR so a typo doesn't strand
  // the form against a year that has no admin tooling yet.
  const [params] = useSearchParams();
  const parsedYear = Number(params.get('year'));
  const targetYear =
    parsedYear === CURRENT_YEAR + 1 ? CURRENT_YEAR + 1 : CURRENT_YEAR;
  const isEarly = targetYear === CURRENT_YEAR + 1;

  // Three-step flow: Overture → Auth gate → Form. Overture is always shown
  // first so newcomers must read the rules before being asked to sign in.
  const [overtureClosed, setOvertureClosed] = useState(false);

  const titleWords = t.title.split(' ');

  return (
    <>
      <SEO title={t.title} description={t.intro} />

      <section className="relative cabaret-stage text-ivory pt-28 pb-24 md:pt-32 md:pb-32 overflow-hidden">
        <div className="cabaret-curtain-l" aria-hidden />
        <div className="cabaret-curtain-r" aria-hidden />
        <EmberCanvas />
        <CandleSpotlight />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-40 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)' }}
        />

        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <Link
            to={addLocale('/marche', lang)}
            className="inline-flex items-center gap-2 font-sans text-xs uppercase tracking-widest text-ivory-soft hover:text-amber-200 mb-10 transition"
          >
            <ArrowLeft size={14} /> {t.backToMarket}
          </Link>

          <LanternRow className="max-w-md mx-auto mb-2" />

          <p className="font-editorial italic text-amber-200 uppercase tracking-[0.4em] text-xs md:text-sm mb-3 text-center">
            <ShoppingBag size={12} className="inline mr-1.5 -mt-0.5" />{t.eyebrow}
          </p>

          <h1 className="font-display title-medieval text-5xl md:text-7xl text-ivory mb-5 text-center leading-[1.05]">
            {titleWords.map((w, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 24, rotateX: -45 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.65, delay: 0.1 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                className="inline-block mr-3 last:mr-0 copper-sheen"
                style={{ transformStyle: 'preserve-3d', transformOrigin: 'center bottom' }}
              >
                {w}
              </motion.span>
            ))}
          </h1>

          <motion.div
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.4 }}
            className="h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent w-32 mx-auto mb-6 origin-center"
          />

          <motion.p
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}
            className="font-editorial text-lg md:text-xl text-ivory/90 leading-relaxed max-w-2xl mx-auto text-center italic"
          >
            {isEarly ? t.intro2027 : t.intro}
          </motion.p>

          {/* Year banner — shows which festival year this submission targets. */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.6 }}
            className="mt-7 mx-auto inline-flex items-center gap-2 px-4 py-2 rounded-pill bg-amber-300/10 border border-amber-300/45 text-amber-200 font-sans uppercase tracking-widest text-[11px] backdrop-blur"
          >
            <Calendar size={12} />
            {isEarly ? t.banner2027 : t.banner2026}
          </motion.div>
        </div>

        {/* ── Form well: Overture → Auth → Form ─────────────────────── */}
        <div className="relative z-10 w-full px-4 md:px-8 mt-14 stage-3d">
          {!overtureClosed ? (
            <OvertureScroll
              lang={lang}
              reduceMotion={!!reduceMotion}
              onEnter={() => setOvertureClosed(true)}
            />
          ) : !user ? (
            <SignedOutCard onSignIn={openSignIn} t={t} />
          ) : (
            <VendorQuestForm onReopenOverture={() => setOvertureClosed(false)} year={targetYear} />
          )}
        </div>

        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-48 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(10,2,7,0.85), transparent)' }}
        />
      </section>

      {/* ── Approved vendors so far ───────────────────────────────── */}
      <ApprovedVendorsList />
    </>
  );
};

const SignedOutCard: React.FC<{ onSignIn: () => void; t: typeof FR }> = ({ onSignIn, t }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}
    className="velvet-card rounded-lg-card p-10 md:p-12 text-center relative overflow-hidden max-w-2xl mx-auto"
  >
    <div className="w-16 h-16 rounded-full bg-amber-300/15 border border-amber-300/45 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(232,177,74,0.4)]">
      <LogIn size={28} className="text-amber-200" />
    </div>
    <h2 className="font-display title-medieval text-3xl md:text-4xl text-ivory mb-4 copper-sheen">{t.authTitle}</h2>
    <p className="font-editorial text-base md:text-lg text-ivory-soft mb-8 max-w-md mx-auto italic">{t.authBody}</p>
    <motion.button
      onClick={onSignIn}
      whileHover={{ y: -3, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-b from-amber-300 via-brass-soft to-brass text-midnight-deep font-sans uppercase tracking-wider text-sm font-semibold rounded-card border border-amber-200/60 shadow-[0_0_36px_rgba(232,177,74,0.5),0_8px_24px_-4px_rgba(216,155,58,0.6)]"
    >
      {t.signInCta} <ArrowUpRight size={16} />
    </motion.button>
    <p className="font-editorial italic text-xs text-stone mt-5">{t.authNote}</p>
  </motion.div>
);

const FR = {
  backToMarket: 'Retour au marché',
  eyebrow: 'Inscription marchand',
  title: 'Rejoindre la caravane',
  intro: 'Soumettez votre candidature pour tenir un kiosque au marché du FMM 2026. Nous étudions chaque demande individuellement et vous reviendrons via votre compte.',
  intro2027: 'Réservez votre place sur la liste 2027. Vos réponses sont enregistrées dans la cohorte 2027 — Jesse vous reviendra dès l’ouverture officielle des inscriptions.',
  banner2026: 'Cohorte 2026 · 25–27 septembre',
  banner2027: 'Réservation 2027 · Liste anticipée',
  authTitle: 'Créez votre compte FMM',
  authBody: 'Pour soumettre votre candidature et suivre son statut, créez un compte ou connectez-vous. Votre courriel sera utilisé pour la suite.',
  authNote: 'Connexion via Google ou par lien magique courriel.',
  signInCta: 'Continuer',
};

const EN: typeof FR = {
  backToMarket: 'Back to market',
  eyebrow: 'Vendor registration',
  title: 'Join the caravan',
  intro: 'Submit your application to hold a stall at the FMM 2026 market. We review each application individually and respond via your account.',
  intro2027: 'Reserve your seat on the 2027 list. Your answers are stored in the 2027 cohort — Jesse will reach out as soon as registrations officially open.',
  banner2026: '2026 cohort · 25–27 September',
  banner2027: '2027 reservation · Early list',
  authTitle: 'Create your FMM account',
  authBody: 'To submit your application and track its status, create an account or sign in. Your email will be used for follow-ups.',
  authNote: 'Sign in with Google or an email magic link.',
  signInCta: 'Continue',
};

export default VendorApplicationPage;
