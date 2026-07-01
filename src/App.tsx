import React, { lazy, Suspense, useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { useReducedMotion } from 'framer-motion';

import { AppProvider, useUI } from './contexts/AppContext';
import { SiteFlagsProvider } from './contexts/SiteFlagsContext';
import { AuthProvider } from './contexts/AuthContext';
import NavBar from './components/layout/NavBar';
import ErrorBoundary from './components/layout/ErrorBoundary';
import PageLoader from './components/layout/PageLoader';

// Defer below-the-fold + behind-modal chrome. SignInModal pulls
// framer-motion eagerly; ConsentBanner only mounts pre-consent;
// Footer is below-the-fold on every route. Lazy = no entry-bundle hit.
const Footer        = lazy(() => import('./components/layout/Footer'));
const ConsentBanner = lazy(() => import('./components/layout/ConsentBanner'));
const SignInModal   = lazy(() => import('./components/auth/SignInModal'));

import { logPageView } from './firebase';
import { trackPixelPageView } from './lib/metaPixel';
import { getLocaleFromPath } from './lib/locale';
import { PILLARS, type PillarKey } from './content';

// Lazy-loaded routes.
const OrbHomePage      = lazy(() => import('./pages/OrbHomePage'));
const WelcomePage      = lazy(() => import('./pages/WelcomePage'));
const AccueilPage      = lazy(() => import('./pages/AccueilPage'));
const TitleLab         = lazy(() => import('./pages/TitleLab'));
const PillarPage       = lazy(() => import('./pages/PillarPage'));
const BenevolePage     = lazy(() => import('./pages/BenevolePage'));
const BenevoleSpacePage = lazy(() => import('./pages/BenevoleSpacePage'));
const HebergementPage  = lazy(() => import('./pages/HebergementPage'));
const PartenairesPage  = lazy(() => import('./pages/PartenairesPage'));
// Merged pillar pages (édition 2026 consolidation).
const ProgrammationPage    = lazy(() => import('./pages/ProgrammationPage'));
const LeVillagePage        = lazy(() => import('./pages/LeVillagePage'));
const MariagesGroupesPage  = lazy(() => import('./pages/MariagesGroupesPage'));
const HistoireApprendrePage = lazy(() => import('./pages/HistoireApprendrePage'));
const AdminPage        = lazy(() => import('./pages/AdminPage'));
const PersonProfilePage = lazy(() => import('./pages/admin/PersonProfilePage'));
const BenevoleProfilePage = lazy(() => import('./pages/admin/BenevoleProfilePage'));
const ComptePage       = lazy(() => import('./pages/ComptePage'));
const CommunautePage   = lazy(() => import('./pages/CommunautePage'));
const PublicProfilePage = lazy(() => import('./pages/PublicProfilePage'));
const MessagesPage     = lazy(() => import('./pages/MessagesPage'));
const VendorApplicationPage = lazy(() => import('./pages/VendorApplicationPage'));
const MusicianApplicationPage = lazy(() => import('./pages/MusicianApplicationPage'));
const RessourcesPage          = lazy(() => import('./pages/RessourcesPage'));
const HnefataflGame           = lazy(() => import('./games/hnefatafl'));
const NotFoundPage     = lazy(() => import('./pages/NotFoundPage'));
const PrivacyPage      = lazy(() => import('./pages/PrivacyPage'));
const ContactPage      = lazy(() => import('./pages/ContactPage'));
const MedievalIntro    = lazy(() => import('./components/landing/MedievalIntro'));

// Every pillar now has its own custom page. PillarPage shell is kept
// as a defensive fallback; if any pillar is missing here it'll render
// the placeholder shell instead of 404-ing.
// Top-level pillar routes. The four merged primaries point to their merged
// page; absorbed pillars (nourriture, musique, jeunesse, groupes, apprendre)
// and the dropped chevaux are no longer in PILLARS, so their old slugs are
// handled by the redirects further down instead of by pillarRoutes().
const CUSTOM_PILLARS: Partial<Record<PillarKey, React.LazyExoticComponent<React.FC>>> = {
  activites:   ProgrammationPage,
  marche:      LeVillagePage,
  histoire:    HistoireApprendrePage,
  mariages:    MariagesGroupesPage,
  benevole:    BenevolePage,
  hebergement: HebergementPage,
  partenaires: PartenairesPage,
};

const SITE_MODE = (import.meta.env.VITE_SITE_MODE || 'live') as 'live' | 'placeholder';
// `/`  → OrbHomePage (HubOrb-style selector, all 13 pillars)
// `/accueil` → AccueilPage (the detailed festival home)
// `/backuppage` → legacy WelcomePage (Viking hero, kept for reference)
// In `placeholder` mode, `/` shows the same orb home but with the pillar menu
// swapped for a "coming soon" line + a single pre-sale tickets CTA (presale).
const OrbHome: React.FC = () =>
  SITE_MODE === 'placeholder' ? <OrbHomePage presale /> : <OrbHomePage />;

// App-level rotate-to-landscape prompt. Lives at the root (not inside the orb)
// so it also covers the cinematic intro — otherwise a portrait phone sees the
// intro first and never gets the prompt. Pure-CSS orientation gate: it shows on
// narrow portrait and vanishes the instant the device is turned to landscape.
// Its <style> is always in the DOM (unlike the orb's), so it works during the
// intro too. Placeholder/teaser only for now.
const RotatePrompt: React.FC = () => {
  const { lang } = useUI();
  if (SITE_MODE !== 'placeholder') return null;
  return (
    <div className="fmm-rotate-prompt" aria-live="polite">
      <div className="fmm-rotate-inner">
        <svg
          className="fmm-rotate-icon"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="8" y="2" width="8" height="20" rx="1.8" />
          <path d="M11 5h2" />
        </svg>
        <p className="fmm-rotate-title">
          {lang === 'EN' ? 'Rotate your device' : 'Tourne ton appareil'}
        </p>
        <p className="fmm-rotate-sub">
          {lang === 'EN'
            ? 'for the full festival experience'
            : 'pour vivre l’expérience du festival'}
        </p>
      </div>
      <style>{`
        .fmm-rotate-prompt { display: none; }
        @media (max-width: 900px) and (orientation: portrait) {
          .fmm-rotate-prompt {
            display: flex;
            position: fixed;
            inset: 0;
            z-index: 2147483000;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 2rem;
            background:
              radial-gradient(ellipse at 50% 38%, rgba(184,106,42,0.20), transparent 62%),
              rgba(9,11,18,0.97);
            -webkit-backdrop-filter: blur(8px);
            backdrop-filter: blur(8px);
          }
        }
        .fmm-rotate-inner {
          display: flex; flex-direction: column; align-items: center;
          gap: 1rem; max-width: 20rem;
        }
        .fmm-rotate-icon {
          width: 72px; height: 72px; color: #d8b46a;
          transform-origin: 50% 50%;
          animation: fmmRotateHint 2.6s ease-in-out infinite;
        }
        @keyframes fmmRotateHint {
          0%, 50%   { transform: rotate(0deg); }
          72%, 100% { transform: rotate(-90deg); }
        }
        .fmm-rotate-title {
          font-family: var(--font-display-alt, "Cormorant SC", serif);
          text-transform: uppercase; letter-spacing: 0.12em;
          color: #f4ece0; font-size: clamp(1.3rem, 6vw, 1.7rem);
          margin: 0; text-shadow: 0 2px 10px rgba(0,0,0,0.9);
        }
        .fmm-rotate-sub {
          font-family: var(--font-editorial, "Cormorant Garamond", Georgia, serif);
          font-style: italic; color: rgba(244,236,224,0.72);
          font-size: 1.05rem; line-height: 1.35; margin: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          .fmm-rotate-icon { animation: none; transform: rotate(-90deg); }
        }
      `}</style>
    </div>
  );
};

// `/` shows the cinematic medieval intro once per session, then hands off to
// the real home (OrbHomePage) which mounts underneath. Reduced-motion and
// placeholder mode skip the intro entirely.
const HomeWithIntro: React.FC = () => {
  const reduce = useReducedMotion();
  // ?intro in the URL forces the prologue to replay every load (handy while iterating)
  const force = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('intro');
  // Placeholder/presale mode: the knight intro IS the teaser, so it replays on
  // every visit — we don't honour the once-per-session `fmm_intro_seen` gate,
  // and we ignore reduced-motion (Alex runs with it on; see fmm_orb_logo_video).
  const presale = SITE_MODE === 'placeholder';
  const [entered, setEntered] = useState<boolean>(
    () => !force && !presale && typeof window !== 'undefined' && sessionStorage.getItem('fmm_intro_seen') === '1',
  );
  // Reduced-motion skips the prologue by default — but an explicit ?intro in
  // the URL forces it to play even under reduced-motion (handy for previewing
  // the cinematic hero without toggling the OS setting).
  const skipIntro = reduce && !presale;
  const showIntro = force || (!entered && !skipIntro);

  const handleEnter = () => {
    try { sessionStorage.setItem('fmm_intro_seen', '1'); } catch { /* ignore */ }
    setEntered(true);
  };

  // Clicking the wordmark on the home page replays the cinematic intro.
  useEffect(() => {
    const replay = () => setEntered(false);
    window.addEventListener('fmm:replayIntro', replay);
    return () => window.removeEventListener('fmm:replayIntro', replay);
  }, []);

  return (
    <>
      {/* Don't mount (and decode all its video) the home page while the intro
          covers it; mount it only once the prologue hands off. When the intro
          is skipped (reduced-motion or placeholder), mount immediately so those
          users land on the real home instead of a blank screen. */}
      {(entered || (skipIntro && !showIntro)) && <OrbHome />}
      {showIntro && (
        <Suspense fallback={null}>
          <MedievalIntro onEnter={handleEnter} />
        </Suspense>
      )}
    </>
  );
};

const HomeRoute = HomeWithIntro;

const LocaleSync: React.FC = () => {
  const location = useLocation();
  const { lang, setLang } = useUI();
  useEffect(() => {
    const next = getLocaleFromPath(location.pathname);
    if (next !== lang) setLang(next);
  }, [location.pathname, lang, setLang]);
  return null;
};

const AnalyticsPageViews: React.FC = () => {
  const location = useLocation();
  useEffect(() => {
    const path = location.pathname + location.search;
    logPageView(path);
    trackPixelPageView();
  }, [location.pathname, location.search]);
  return null;
};

// Routes treated as one-shot immersive landings — hide global chrome.
const isImmersive = (pathname: string) =>
  pathname === '/'
  || pathname === '/en'
  || pathname === '/labo-titre'
  || pathname === '/backuppage'
  || pathname === '/en/backuppage'
  || pathname === '/jeunesse/hnefatafl'
  || pathname === '/en/youth/hnefatafl';

const Chrome: React.FC = () => {
  const { pathname } = useLocation();
  if (pathname.startsWith('/admin')) return null;
  // Immersive landings hide the global NavBar; user navigates onward
  // via in-page CTAs (orb confirmation, Viking hero buttons).
  if (isImmersive(pathname)) return null;
  return <NavBar />;
};
const Footing: React.FC = () => {
  const { pathname } = useLocation();
  if (pathname.startsWith('/admin')) return null;
  // Immersive landings hide the footer + "Migrez vers Zeffy" banner, but
  // keep the consent banner so the LOI 25 prompt still appears on first visit.
  const immersive = isImmersive(pathname);
  return (
    <Suspense fallback={null}>
      {!immersive && <Footer />}
      <ConsentBanner />
    </Suspense>
  );
};

// Mounts the global fire backdrop only when a page has tagged <body> with
// `.fmm-caravan-page`. Avoids fetching fire.mp4 on routes that don't show it
// (like the orb landing, which renders its own FireCanvas). Also a no-op for
// prefers-reduced-motion users.
const GlobalFireBackdrop: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(
    typeof document !== 'undefined' && document.body.classList.contains('fmm-caravan-page')
  );
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const sync = () => setActive(document.body.classList.contains('fmm-caravan-page'));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  if (reduceMotion || !active) return null;
  return (
    <div aria-hidden className="fmm-fire-backdrop">
      <video src="/orb/fire.mp4" autoPlay muted loop playsInline preload="auto" />
    </div>
  );
};

function pillarRoutes() {
  const out: React.ReactNode[] = [];
  for (const p of PILLARS) {
    const Custom = CUSTOM_PILLARS[p.key as PillarKey];
    const element = Custom
      ? <Custom />
      : <PillarPage pillarKey={p.key as PillarKey} />;
    out.push(<Route key={`fr-${p.key}`} path={p.slug.FR} element={element} />);
    out.push(<Route key={`en-${p.key}`} path={p.slug.EN} element={element} />);
  }
  return out;
}

const App: React.FC = () => (
  <HelmetProvider>
    <AppProvider>
      <SiteFlagsProvider>
        <AuthProvider>
        <BrowserRouter>
          <LocaleSync />
          <AnalyticsPageViews />
          <Chrome />
          {/* Global fire backdrop — only mounted while <body> carries
              `.fmm-caravan-page` (set by useCaravanPage()). Skipping the
              mount on non-caravan pages avoids fetching fire.mp4 (1.1 MB)
              twice on /, since OrbHomePage renders its own FireCanvas.
              Also skipped entirely for prefers-reduced-motion users. */}
          <GlobalFireBackdrop />
          <Suspense fallback={null}>
            <SignInModal />
          </Suspense>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/"   element={<HomeRoute />} />
                <Route path="/en" element={<HomeRoute />} />
                <Route path="/labo-titre" element={<TitleLab />} />
                <Route path="/accueil"    element={<AccueilPage />} />
                <Route path="/en/accueil" element={<AccueilPage />} />
                {/* Legacy Viking WelcomePage — kept hidden for reference. */}
                <Route path="/backuppage"    element={<WelcomePage />} />
                <Route path="/en/backuppage" element={<WelcomePage />} />
                {pillarRoutes()}
                <Route path="/admin"  element={<AdminPage />} />
                <Route path="/admin/personne/:slug" element={<PersonProfilePage />} />
                <Route path="/admin/benevole/:uid"  element={<BenevoleProfilePage />} />
                <Route path="/espace-benevole"      element={<BenevoleSpacePage />} />
                <Route path="/en/volunteer-space"   element={<BenevoleSpacePage />} />
                <Route path="/communaute"                       element={<CommunautePage />} />
                <Route path="/communaute/equipe/:teamId"        element={<CommunautePage />} />
                <Route path="/en/community"                     element={<CommunautePage />} />
                <Route path="/en/community/team/:teamId"        element={<CommunautePage />} />
                <Route path="/profil/:uid"                      element={<PublicProfilePage />} />
                <Route path="/en/profile/:uid"                  element={<PublicProfilePage />} />
                <Route path="/messages"                         element={<MessagesPage />} />
                <Route path="/messages/:otherUid"               element={<MessagesPage />} />
                <Route path="/en/messages"                      element={<MessagesPage />} />
                <Route path="/en/messages/:otherUid"            element={<MessagesPage />} />
                <Route path="/compte" element={<ComptePage />} />
                <Route path="/en/account" element={<ComptePage />} />
                <Route path="/marche/inscription"   element={<VendorApplicationPage />} />
                <Route path="/en/market/registration" element={<VendorApplicationPage />} />
                <Route path="/musique/inscription"  element={<MusicianApplicationPage />} />
                <Route path="/en/music/registration" element={<MusicianApplicationPage />} />
                <Route path="/ressources"           element={<RessourcesPage />} />
                <Route path="/en/resources"         element={<RessourcesPage />} />
                <Route path="/jeunesse/hnefatafl"   element={<HnefataflGame />} />
                <Route path="/en/youth/hnefatafl"   element={<HnefataflGame />} />
                <Route path="/politique-de-confidentialite" element={<PrivacyPage />} />
                <Route path="/en/privacy" element={<PrivacyPage />} />
                <Route path="/contact"    element={<ContactPage />} />
                <Route path="/en/contact" element={<ContactPage />} />

                {/* Legacy slug redirects — old scaffold paths and Wix variants. */}
                <Route path="/festival-medieval-de-montpellier" element={<Navigate to="/" replace />} />
                <Route path="/horaire"            element={<Navigate to="/activites" replace />} />
                <Route path="/banquet"            element={<Navigate to="/marche" replace />} />
                <Route path="/benevoles"          element={<Navigate to="/benevole" replace />} />
                <Route path="/archives"           element={<Navigate to="/histoire" replace />} />

                {/* Édition 2026 merge — absorbed pillars redirect to their
                    new merged page; Chevaux is retired to the home. */}
                <Route path="/musique"     element={<Navigate to="/activites" replace />} />
                <Route path="/en/music"    element={<Navigate to="/en/activities" replace />} />
                <Route path="/jeunesse"    element={<Navigate to="/activites" replace />} />
                <Route path="/en/youth"    element={<Navigate to="/en/activities" replace />} />
                <Route path="/nourriture"  element={<Navigate to="/marche" replace />} />
                <Route path="/en/food"     element={<Navigate to="/en/market" replace />} />
                <Route path="/groupes"     element={<Navigate to="/mariages" replace />} />
                <Route path="/groupe"      element={<Navigate to="/mariages" replace />} />
                <Route path="/en/groups"   element={<Navigate to="/en/weddings" replace />} />
                <Route path="/apprendre"   element={<Navigate to="/histoire" replace />} />
                <Route path="/en/learn"    element={<Navigate to="/en/history" replace />} />
                <Route path="/chevaux"     element={<Navigate to="/" replace />} />
                <Route path="/en/horses"   element={<Navigate to="/en" replace />} />

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
          <Footing />
        </BrowserRouter>
        </AuthProvider>
      </SiteFlagsProvider>
    </AppProvider>
  </HelmetProvider>
);

export default App;
