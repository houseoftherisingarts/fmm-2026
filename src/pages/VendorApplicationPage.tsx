import React, { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, LogIn, ShoppingBag, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/AppContext';
import { addLocale } from '../lib/locale';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import VendorQuestForm from '../components/vendor/VendorQuestForm';
import OvertureScroll from '../components/vendor/OvertureScroll';
import EmberCanvas from '../components/vendor/EmberCanvas';
import ApprovedVendorsList from '../components/vendor/ApprovedVendorsList';
import { CURRENT_YEAR } from '../firebase/applications';

const VendorApplicationPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  const { user, openSignIn } = useAuth();
  const reduceMotion = useReducedMotion();

  // ?year= drives which festival year this application lands under.
  // Accepted: CURRENT_YEAR (2026) or CURRENT_YEAR+1 (2027, early reservation).
  // Anything else falls back to CURRENT_YEAR so a typo doesn't strand
  // the form against a year that has no admin tooling yet.
  // La cohorte 2026 est complète : tout ce qui arrive ici vise 2027.
  // ?year=2026 reste accepté pour qu'un marchand déjà inscrit puisse
  // rouvrir et modifier son dossier de l'an dernier depuis son compte.
  const [params] = useSearchParams();
  const targetYear = Number(params.get('year')) === CURRENT_YEAR
    ? CURRENT_YEAR
    : CURRENT_YEAR + 1;
  const isEarly = targetYear === CURRENT_YEAR + 1;

  // Three-step flow: Overture → Auth gate → Form. Overture is always shown
  // first so newcomers must read the rules before being asked to sign in.
  const [overtureClosed, setOvertureClosed] = useState(false);

  const wellRef = useRef<HTMLDivElement | null>(null);
  const focusWell = () => {
    requestAnimationFrame(() => {
      const el = wellRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    });
  };

  const titleWords = t.title.split(' ');

  return (
    <>
      <SEO title={t.title} description={t.intro} />

      {/* Grammaire Witcher : continuité directe de la page Village
          (caravan-stage, hairlines, registres, prompt A). Les rideaux
          de cabaret et lanternes de l'ancienne version sont partis. */}
      <section className="relative caravan-stage bleed-edges text-[var(--color-bone)] pt-28 pb-24 md:pt-32 md:pb-32 overflow-hidden">
        <EmberCanvas />

        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          {/* Rail supérieur : retour + registre d'année */}
          <div
            className="flex items-center justify-between gap-4 mb-12 md:mb-16 pb-2"
            style={{ borderBottom: '1px solid rgba(var(--sk-parchment-rgb), 0.10)' }}
          >
            <Link
              to={addLocale('/marche', lang)}
              className="inline-flex items-center gap-2 font-sans text-[11px] uppercase tracking-[0.3em] text-[var(--color-bone)]/60 hover:text-[var(--sk-gilt)] transition"
            >
              <ArrowLeft size={13} /> {t.backToMarket}
            </Link>
            <div className="hidden md:flex items-center gap-3">
              <Calendar size={12} style={{ color: 'var(--sk-gilt)' }} />
              <span className="witcher-stat-label">{isEarly ? t.banner2027 : t.banner2026}</span>
            </div>
          </div>

          <div>
            <p
              className="font-sans uppercase tracking-[0.45em] text-[10px] md:text-[11px] mb-7 inline-flex items-center gap-2"
              style={{ color: 'var(--sk-gilt)' }}
            >
              <ShoppingBag size={12} />{t.eyebrow}
            </p>

            {/* Le titre tenait dans un max-w-2xl : il cassait en deux
                lignes avec un grand vide à droite. Il court maintenant sur
                toute la largeur et reste sur une ligne dès sm. */}
            <h1
              className="font-display leading-[1.02] tracking-[-0.005em] text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-8 sm:whitespace-nowrap"
              style={{
                color: 'var(--color-bone)',
                fontWeight: 400,
                textShadow: '0 0 24px rgba(var(--sk-glow-rgb), 0.28), 0 0 60px rgba(var(--sk-copper-rgb), 0.22)',
              }}
            >
              {titleWords.map((w, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, delay: 0.1 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                  className="inline-block mr-3 last:mr-0"
                >
                  {w}
                </motion.span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
              className="font-sans text-base md:text-lg leading-[1.75] max-w-2xl"
              style={{ color: 'rgba(var(--sk-parchment-rgb), 0.78)', fontWeight: 300 }}
            >
              {isEarly ? t.intro2027 : t.intro}
            </motion.p>
          </div>
        </div>

        {/* ── Form well: Overture → Auth → Form ─────────────────────── */}
        {/* L'ouverture est très haute; la carte de connexion et le
            formulaire le sont beaucoup moins. En passant de l'une à
            l'autre la page rétrécissait sous le curseur de défilement et
            le visiteur atterrissait dans le pied de page. On recale la
            vue sur le puits à chaque bascule. */}
        <div ref={wellRef} className="relative z-10 w-full px-4 md:px-8 mt-14 stage-3d">
          {!overtureClosed ? (
            <OvertureScroll
              lang={lang}
              reduceMotion={!!reduceMotion}
              onEnter={() => { setOvertureClosed(true); focusWell(); }}
            />
          ) : !user ? (
            <SignedOutCard onSignIn={openSignIn} t={t} />
          ) : (
            <VendorQuestForm
              onReopenOverture={() => { setOvertureClosed(false); focusWell(); }}
              year={targetYear}
            />
          )}
        </div>

        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-48 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(var(--sk-ink-rgb),0.85), transparent)' }}
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
    className="velvet-card p-10 md:p-12 text-center relative overflow-hidden max-w-2xl mx-auto"
    style={{ border: '1px solid rgba(var(--sk-gilt-rgb), 0.3)' }}
  >
    <span className="witcher-tile mx-auto mb-8 block" style={{ width: 54, height: 54 }}>
      <span className="witcher-tile-inner" style={{ color: 'var(--sk-gilt)' }}>
        <LogIn size={18} />
      </span>
    </span>
    <h2 className="font-display text-3xl md:text-4xl mb-4" style={{ color: 'var(--color-bone)', fontWeight: 400 }}>{t.authTitle}</h2>
    <p className="font-sans text-base mb-9 max-w-md mx-auto" style={{ color: 'rgba(var(--sk-parchment-rgb),0.7)', fontWeight: 300 }}>{t.authBody}</p>
    <div className="flex justify-center">
      <button type="button" className="witcher-prompt" data-primary="true" onClick={onSignIn}>
        <span className="witcher-prompt-glyph"><span>A</span></span>
        {t.signInCta}
      </button>
    </div>
    <p className="font-sans text-xs mt-6" style={{ color: 'rgba(var(--sk-parchment-rgb),0.4)', fontWeight: 300 }}>{t.authNote}</p>
  </motion.div>
);

const FR = {
  backToMarket: 'Retour au marché',
  eyebrow: 'Inscription marchand',
  title: 'Rejoindre le marché',
  intro: 'La cohorte 2026 est complète. Si vous avez déjà un dossier 2026, consultez-le et modifiez-le ici via votre compte.',
  intro2027: 'Réservez votre place sur la liste 2027. Les dates et les tarifs seront dévoilés sous peu; vos réponses sont gardées et Jesse vous reviendra dès l’ouverture officielle des inscriptions.',
  banner2026: 'Dossier 2026 · cohorte complète',
  banner2027: 'Marché 2027 · Liste anticipée',
  authTitle: 'Créez votre compte FMM',
  authBody: 'Pour soumettre votre candidature et suivre son statut, créez un compte ou connectez-vous. Votre courriel sera utilisé pour la suite.',
  authNote: 'Connexion via Google ou par lien magique courriel.',
  signInCta: 'Continuer',
};

const EN: typeof FR = {
  backToMarket: 'Back to market',
  eyebrow: 'Vendor registration',
  title: 'Join the market',
  intro: 'The 2026 cohort is full. If you already have a 2026 application, review and edit it here through your account.',
  intro2027: 'Reserve your seat on the 2027 list. Dates and rates will be revealed shortly; your answers are kept and Jesse will reach out as soon as registrations officially open.',
  banner2026: '2026 application · cohort full',
  banner2027: '2027 market · Early list',
  authTitle: 'Create your FMM account',
  authBody: 'To submit your application and track its status, create an account or sign in. Your email will be used for follow-ups.',
  authNote: 'Sign in with Google or an email magic link.',
  signInCta: 'Continue',
};

export default VendorApplicationPage;
