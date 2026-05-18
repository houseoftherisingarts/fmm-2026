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
const PlaceholderHome  = lazy(() => import('./pages/PlaceholderHome'));
const PillarPage       = lazy(() => import('./pages/PillarPage'));
const ActivitesPage    = lazy(() => import('./pages/ActivitesPage'));
const NourriturePage   = lazy(() => import('./pages/NourriturePage'));
const MusiquePage      = lazy(() => import('./pages/MusiquePage'));
const BenevolePage     = lazy(() => import('./pages/BenevolePage'));
const BenevoleSpacePage = lazy(() => import('./pages/BenevoleSpacePage'));
const MarchePage       = lazy(() => import('./pages/MarchePage'));
const JeunessePage     = lazy(() => import('./pages/JeunessePage'));
const ChevauxPage      = lazy(() => import('./pages/ChevauxPage'));
const ApprendrePage    = lazy(() => import('./pages/ApprendrePage'));
const HebergementPage  = lazy(() => import('./pages/HebergementPage'));
const PartenairesPage  = lazy(() => import('./pages/PartenairesPage'));
const HistoirePage     = lazy(() => import('./pages/HistoirePage'));
const MariagesPage     = lazy(() => import('./pages/MariagesPage'));
const GroupesPage      = lazy(() => import('./pages/GroupesPage'));
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

// Every pillar now has its own custom page. PillarPage shell is kept
// as a defensive fallback; if any pillar is missing here it'll render
// the placeholder shell instead of 404-ing.
const CUSTOM_PILLARS: Partial<Record<PillarKey, React.LazyExoticComponent<React.FC>>> = {
  activites:   ActivitesPage,
  nourriture:  NourriturePage,
  musique:     MusiquePage,
  benevole:    BenevolePage,
  marche:      MarchePage,
  jeunesse:    JeunessePage,
  chevaux:     ChevauxPage,
  apprendre:   ApprendrePage,
  hebergement: HebergementPage,
  partenaires: PartenairesPage,
  histoire:    HistoirePage,
  mariages:    MariagesPage,
  groupes:     GroupesPage,
};

const SITE_MODE = (import.meta.env.VITE_SITE_MODE || 'live') as 'live' | 'placeholder';
// `/`  → OrbHomePage (HubOrb-style selector, all 13 pillars)
// `/accueil` → AccueilPage (the detailed festival home)
// `/backuppage` → legacy WelcomePage (Viking hero, kept for reference)
// In `placeholder` mode, `/` shows the misty-sword teaser instead.
const HomeRoute = SITE_MODE === 'placeholder' ? PlaceholderHome : OrbHomePage;

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
                <Route path="/banquet"            element={<Navigate to="/nourriture" replace />} />
                <Route path="/benevoles"          element={<Navigate to="/benevole" replace />} />
                <Route path="/archives"           element={<Navigate to="/histoire" replace />} />
                <Route path="/groupe"             element={<Navigate to="/groupes" replace />} />
                <Route path="/contact"            element={<Navigate to="/#contact" replace />} />

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
