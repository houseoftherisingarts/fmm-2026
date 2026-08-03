import React, { lazy, Suspense, useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigationType,
} from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { useReducedMotion } from 'framer-motion';

import { AppProvider, useUI } from './contexts/AppContext';
import { SiteFlagsProvider, useSiteFlags } from './contexts/SiteFlagsContext';
import { AuthProvider } from './contexts/AuthContext';
import { usePerfTier } from './lib/usePerfTier';
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
import { isPillarVisible } from './firebase/siteFlags';

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
const MedievalIntroMobile = lazy(() => import('./components/landing/MedievalIntroMobile'));

// Every pillar now has its own custom page. PillarPage shell is kept
// as a defensive fallback; if any pillar is missing here it'll render
// the placeholder shell instead of 404-ing.
// Top-level pillar routes. The four merged primaries point to their merged
// page; absorbed pillars (nourriture, musique, jeunesse, groupes, apprendre)
// and the dropped chevaux are no longer in PILLARS, so their old slugs are
// handled by the redirects further down instead of by pillarRoutes().
const PetiteMonnaiePage = lazy(() => import('./pages/PetiteMonnaiePage'));

const CUSTOM_PILLARS: Partial<Record<PillarKey, React.LazyExoticComponent<React.FC>>> = {
  activites:   ProgrammationPage,
  'petite-monnaie': PetiteMonnaiePage,
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
// The orb home decides its own teaser-vs-menu state from the per-page
// publication flags (see OrbHomePage): while nothing is published it shows the
// "coming soon" teaser + pre-sale CTA; each published pillar then joins the menu.
const OrbHome: React.FC = () => <OrbHomePage />;

// Portrait phones (incl. the Facebook in-app browser, which locks orientation)
// get a purpose-built vertical intro instead of a "rotate your device" wall.
// Reacts to orientation changes, not just mount, so turning the phone swaps
// the intro live.
function useIsMobilePortrait() {
  const query = '(max-width: 900px) and (orientation: portrait)';
  const [match, setMatch] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return match;
}

// `/` shows the cinematic medieval intro once per session, then hands off to
// the real home (OrbHomePage) which mounts underneath. Reduced-motion and
// placeholder mode skip the intro entirely.
const HomeWithIntro: React.FC = () => {
  const reduce = useReducedMotion();
  const mobilePortrait = useIsMobilePortrait();
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
          {mobilePortrait
            ? <MedievalIntroMobile onEnter={handleEnter} />
            : <MedievalIntro onEnter={handleEnter} />}
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

// ─── ScrollToTop ────────────────────────────────────────────────────
// React Router ne réinitialise pas le défilement en changeant de route :
// on gardait la position de l'ancienne page. Depuis le bas d'une page
// longue, cliquer « Mon compte » ou n'importe quel lien atterrissait
// directement dans le pied de page de la nouvelle. Posé 2026-08-02.
// Les ancres (#section) et le retour arrière du navigateur sont
// respectés : on ne remonte que sur une vraie navigation vers le haut.
const ScrollToTop: React.FC = () => {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType();
  useEffect(() => {
    if (hash) return;                 // lien vers une ancre : on laisse faire
    if (navType === 'POP') return;    // retour arrière : le navigateur restaure
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, hash, navType]);
  return null;
};

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
// Le feu du site : la vraie vidéo de flammes, masquée pour se fondre
// dans la nuit et fusionnée en `screen` pour que seules les flammes
// peignent. C'est l'effet des premières versions, celui qu'Alex
// reconnaît; les points de braise en canevas ont été retirés.
//
// Il ne dépendait que de la classe `.fmm-caravan-page`, donc il
// manquait sur toute page qui n'appelle pas useCaravanPage().
// Maintenant : partout, sauf l'admin (tableau de bord) et l'accueil-orbe
// (qui porte déjà sa propre flamme).
const GlobalFireBackdrop: React.FC = () => {
  const { pathname } = useLocation();
  const { lite } = usePerfTier();
  if (lite) return null;                                   // machine modeste
  if (pathname.startsWith('/admin')) return null;
  if (pathname === '/' || pathname === '/en') return null;  // FireCanvas y est déjà
  return (
    <div aria-hidden className="fmm-fire-backdrop" data-always>
      <video src="/orb/fire.mp4" autoPlay muted loop playsInline preload="auto" />
    </div>
  );
};

// Gate a pillar route: until its page is published (or we're previewing all in
// local dev) a direct hit bounces to the teaser home, so no one lands on an
// unfinished section even with the URL in hand.
const PillarGate: React.FC<{ pillarKey: PillarKey; children: React.ReactElement }> = ({ pillarKey, children }) => {
  const { flags, ready } = useSiteFlags();
  if (isPillarVisible(flags, pillarKey, SITE_MODE === 'live')) return children;
  // First-ever visit: flags are still the all-off defaults until the first
  // Firestore snapshot lands. Bouncing now would send a shared link to a
  // PUBLISHED pillar back to the teaser — hold until we actually know.
  if (!ready) return null;
  return <Navigate to="/" replace />;
};

function pillarRoutes() {
  const out: React.ReactNode[] = [];
  for (const p of PILLARS) {
    const Custom = CUSTOM_PILLARS[p.key as PillarKey];
    const inner = Custom
      ? <Custom />
      : <PillarPage pillarKey={p.key as PillarKey} />;
    const element = <PillarGate pillarKey={p.key as PillarKey}>{inner}</PillarGate>;
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
          <ScrollToTop />
          <LocaleSync />
          <AnalyticsPageViews />
          <Chrome />
          {/* Global fire backdrop — only mounted while <body> carries
              `.fmm-caravan-page` (set by useCaravanPage()). Skipping the
              feu global : présent sur toutes les pages sauf l'admin et
              l'accueil-orbe, qui rend sa propre FireCanvas (évite de
              télécharger fire.mp4 deux fois). */}
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

                {/* Safety net: FR slugs that circulated with a bare `/en`
                    prefix (old addLocale didn't translate slugs). Redirect
                    to the real translated EN routes. */}
                <Route path="/en/activites"          element={<Navigate to="/en/activities" replace />} />
                <Route path="/en/marche"             element={<Navigate to="/en/market" replace />} />
                <Route path="/en/marche/inscription" element={<Navigate to="/en/market/registration" replace />} />
                <Route path="/en/histoire"           element={<Navigate to="/en/history" replace />} />
                <Route path="/en/mariages"           element={<Navigate to="/en/weddings" replace />} />
                <Route path="/en/hebergement"        element={<Navigate to="/en/lodging" replace />} />
                <Route path="/en/partenaires"        element={<Navigate to="/en/partners" replace />} />
                <Route path="/en/benevole"           element={<Navigate to="/en/volunteer" replace />} />
                <Route path="/en/compte"             element={<Navigate to="/en/account" replace />} />
                <Route path="/en/communaute"         element={<Navigate to="/en/community" replace />} />
                <Route path="/en/espace-benevole"    element={<Navigate to="/en/volunteer-space" replace />} />
                <Route path="/en/musique/inscription" element={<Navigate to="/en/music/registration" replace />} />

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
