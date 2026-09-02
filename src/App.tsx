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
import PorteDuJeu from './components/auth/PorteDuJeu';
import { BadgesProvider } from './contexts/BadgesContext';
import AnnonceBadge from './components/badges/AnnonceBadge';
import RecompensesQuotidiennes from './components/compte/RecompensesQuotidiennes';
import { usePerfTier } from './lib/usePerfTier';
import { usePrefsFond, useAnimationsFond } from './lib/usePrefsFond';
import { useSkinActif } from './lib/useSkinActif';
import FondParticules from './components/layout/FondParticules';
import NavBar from './components/layout/NavBar';
import ErrorBoundary from './components/layout/ErrorBoundary';
import PageLoader from './components/layout/PageLoader';

// Defer below-the-fold + behind-modal chrome. SignInModal pulls
// framer-motion eagerly; ConsentBanner ne peint que tant que la
// question n'a pas été répondue, mais il reste monté partout, puisque
// c'est lui qui remet en marche ce qui a été accepté;
// Footer is below-the-fold on every route. Lazy = no entry-bundle hit.
const Footer        = lazy(() => import('./components/layout/Footer'));
const ConsentBanner = lazy(() => import('./components/layout/ConsentBanner'));
const PorteBilletterieGlobale = lazy(() =>
  import('./components/billets/PorteBilletterie').then((m) => ({ default: m.PorteBilletterieGlobale })));
const SignInModal   = lazy(() => import('./components/auth/SignInModal'));
// L'atterrissage du lien de connexion reçu par courriel. Monté au-dessus
// de tout le site : le lien peut ramener sur n'importe quelle page, et
// en mode « placeholder » l'intro couvre l'écran.
const FinaliserLien = lazy(() => import('./components/auth/FinaliserLien'));

import { logPageView } from './firebase';
import { trackPixelPageView } from './lib/metaPixel';
import { bumpPageView, bumpSessionSource } from './lib/siteStats';
import { getLocaleFromPath } from './lib/locale';
import { PILLARS, type PillarKey } from './content';
import { isPillarVisible, type SiteFlags } from './firebase/siteFlags';

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
const Partenaires2027Page = lazy(() => import('./pages/Partenaires2027Page'));
// Merged pillar pages (édition 2026 consolidation).
const ProgrammationPage    = lazy(() => import('./pages/ProgrammationPage'));
const MarchePage           = lazy(() => import('./pages/MarchePage'));
const WilliamPage          = lazy(() => import('./pages/WilliamPage'));
const SignerCuisinePage    = lazy(() => import('./pages/SignerCuisinePage'));
const MariagesGroupesPage  = lazy(() => import('./pages/MariagesGroupesPage'));
const HistoireApprendrePage = lazy(() => import('./pages/HistoireApprendrePage'));
const AdminPage        = lazy(() => import('./pages/AdminPage'));
const PersonProfilePage = lazy(() => import('./pages/admin/PersonProfilePage'));
const BenevoleProfilePage = lazy(() => import('./pages/admin/BenevoleProfilePage'));
const ComptePage       = lazy(() => import('./pages/ComptePage'));
const BilletsPage      = lazy(() => import('./pages/BilletsPage'));
const CommunautePage   = lazy(() => import('./pages/CommunautePage'));
const MurPage              = lazy(() => import('./pages/MurPage'));
const BabillardPage        = lazy(() => import('./pages/BabillardPage'));
const BoutiquePage         = lazy(() => import('./pages/BoutiquePage'));
const SoukPage             = lazy(() => import('./pages/SoukPage'));
// Le chantier : inventaire du personnage + salon 2D, réservé à l'équipe
// tant que ce n'est pas publié (Alex, 2026-08-27, dictée « inventaire
// Witcher/Diablo + Blablaland »). Sous src/chantier/, jamais dans
// src/pages/.
const ChantierPage         = lazy(() => import('./chantier/ChantierPage'));
const VotesBancEssai       = lazy(() => import('./chantier/VotesBancEssai'));
const SoukBancEssai        = lazy(() => import('./chantier/SoukBancEssai'));
const GuildesPage          = lazy(() => import('./pages/GuildesPage'));
const GuildePage           = lazy(() => import('./pages/GuildePage'));
const PublicProfilePage = lazy(() => import('./pages/PublicProfilePage'));
const OrdrePage           = lazy(() => import('./pages/OrdrePage'));
const AlliancePage        = lazy(() => import('./pages/AlliancePage'));
const VideosPage          = lazy(() => import('./pages/VideosPage'));
const DefiLobbyPage       = lazy(() => import('./pages/DefiLobbyPage'));
const MessagesPage     = lazy(() => import('./pages/MessagesPage'));
const VendorApplicationPage = lazy(() => import('./pages/VendorApplicationPage'));
const FaubourgPage = lazy(() => import('./pages/FaubourgPage'));
const MusicianApplicationPage = lazy(() => import('./pages/MusicianApplicationPage'));
const RessourcesPage          = lazy(() => import('./pages/RessourcesPage'));
const HnefataflGame           = lazy(() => import('./games/hnefatafl'));
const TarotGame               = lazy(() => import('./games/tarot'));
const DesGame                 = lazy(() => import('./games/des'));
const RenardGame              = lazy(() => import('./games/renard'));
const MerelleGame             = lazy(() => import('./games/merelle'));
const NotFoundPage     = lazy(() => import('./pages/NotFoundPage'));
const PrivacyPage      = lazy(() => import('./pages/PrivacyPage'));
const ContactPage      = lazy(() => import('./pages/ContactPage'));
const PressePage       = lazy(() => import('./pages/PressePage'));
const MedievalIntro    = lazy(() => import('./components/landing/MedievalIntro'));
const MedievalIntroMobile = lazy(() => import('./components/landing/MedievalIntroMobile'));

// Every pillar now has its own custom page. PillarPage shell is kept
// as a defensive fallback; if any pillar is missing here it'll render
// the placeholder shell instead of 404-ing.
// Top-level pillar routes. The merged primaries point to their merged
// page; absorbed pillars (musique, jeunesse, groupes, apprendre) and the
// dropped chevaux are no longer in PILLARS, so their old slugs are handled
// by the redirects further down instead of by pillarRoutes(). Petite
// Monnaie is absorbed too (2026-08-27): it's a chapter inside
// PartenairesPage now, not its own route; /petite-monnaie redirects to
// the anchor (see redirects below).
const JeuxEnLignePage   = lazy(() => import('./pages/JeuxEnLignePage'));

const CUSTOM_PILLARS: Partial<Record<PillarKey, React.LazyExoticComponent<React.FC>>> = {
  activites:   ProgrammationPage,
  jeux:        JeuxEnLignePage,
  marche:      MarchePage,
  // Commandite William J. Walter acceptée (2026-08-29) : la version
  // présentée par WJW devient la vraie page du Village Nourriture.
  nourriture:  WilliamPage,
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
  // every visit: we don't honour the once-per-session `fmm_intro_seen` gate,
  // and we ignore reduced-motion (Alex runs with it on; see fmm_orb_logo_video).
  const presale = SITE_MODE === 'placeholder';
  const [entered, setEntered] = useState<boolean>(
    () => !force && !presale && typeof window !== 'undefined' && sessionStorage.getItem('fmm_intro_seen') === '1',
  );
  // Reduced-motion skips the prologue by default, but an explicit ?intro in
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
    bumpPageView(location.pathname);
    bumpSessionSource(location.search);
  }, [location.pathname, location.search]);
  return null;
};

// Routes treated as one-shot immersive landings: hide global chrome.
// La barre du haut (Billets, FR/EN, Mon espace) suit le visiteur partout,
// y compris sur la page du menu principal : Alex la veut visible dès
// l'accueil (2026-08-23). Seuls les laboratoires restent nus.
const isImmersive = (pathname: string) =>
  pathname === '/labo-titre'
  || pathname === '/backuppage'
  || pathname === '/en/backuppage';
// Hnefatafl a quitté cette liste le 2026-08-03 : le jeu vivait dans un
// noir absolu, sans barre de navigation ni pied de page, avec sa propre
// palette. Il est maintenant une vraie page du site (en-tête, brumes,
// laiton, typographie Cinzel) et le plateau tient dans une scène cadrée.

// ─── ScrollToTop ────────────────────────────────────────────────────
// React Router ne réinitialise pas le défilement en changeant de route :
// on gardait la position de l'ancienne page. Depuis le bas d'une page
// longue, cliquer « Mon compte » ou n'importe quel lien atterrissait
// directement dans le pied de page de la nouvelle. Posé 2026-08-02.
// Les ancres (#section) et le retour arrière du navigateur sont
// respectés : on ne remonte que sur une vraie navigation vers le haut.
const ScrollToTop: React.FC = () => {
  const { pathname, hash, search } = useLocation();
  const navType = useNavigationType();
  useEffect(() => {
    if (hash) return;                 // lien vers une ancre : on laisse faire
    if (navType === 'POP') return;    // retour arrière : le navigateur restaure
    // `?banquet=…` : la page Nourriture déplie son chapitre et vise
    // elle-même le banquet. Remonter en haut ici revenait à lui tirer le
    // tapis sous les pieds, et le visiteur restait devant l'en-tête
    // pendant que la page cherchait sa place (Alex, 2026-08-23).
    if (new URLSearchParams(search).get('banquet')) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, hash, search, navType]);
  return null;
};

/** L'Alliance ne s'ouvre que si le drapeau est levé. Sinon, la page
 *  n'existe pas pour le public (Alex, 2026-08-23). */
const PorteAlliance: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { flags } = useSiteFlags();
  if (!flags.pubAlliance && SITE_MODE !== 'live') return <NotFoundPage />;
  return <>{children}</>;
};

const Chrome: React.FC = () => {
  const { pathname } = useLocation();
  if (pathname.startsWith('/admin')) return null;
  // Immersive landings hide the global NavBar; user navigates onward
  // via in-page CTAs (orb confirmation, Viking hero buttons).
  if (isImmersive(pathname)) return null;
  return <NavBar />;
};
// Les jeux occupent l'écran d'un bord à l'autre : aucun pied de page ne
// doit se dresser dessous (Alex, 2026-08-23 : « une seule fenêtre »).
const SANS_PIED = [
  '/jeux/renard', '/en/games/fox-and-geese', '/jeux/merelle', '/en/games/merelle',
  '/', '/en', '/labo-titre', '/backuppage', '/en/backuppage',
  '/jeux/des', '/en/games/dice',
  '/jeux/tarot', '/en/games/tarot',
  '/jeunesse/hnefatafl', '/en/youth/hnefatafl',
];
const Footing: React.FC = () => {
  const { pathname } = useLocation();
  if (pathname.startsWith('/admin')) return null;
  // Le pied de page reste absent des accueils cinématiques (la page du
  // menu principal se termine sur l'orbe, pas sur un pied), même si la
  // barre du haut, elle, s'y affiche maintenant.
  const immersive = SANS_PIED.includes(pathname);
  return (
    <Suspense fallback={null}>
      {!immersive && <Footer />}
      <PorteBilletterieGlobale />
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
// Les réglages de fond d'une personne (animer le fond, skin VIP)
// suivent le compte sur tout le site (Alex, 2026-08-28).
const PrefsFondWatcher: React.FC = () => { usePrefsFond(); return null; };

const GlobalFireBackdrop: React.FC = () => {
  const { pathname } = useLocation();
  const { lite } = usePerfTier();
  const skin = useSkinActif();
  const animations = useAnimationsFond();
  if (lite) return null;                                   // machine modeste
  if (!animations) return null;                            // réglage « Animations du fond » éteint
  if (pathname.startsWith('/admin')) return null;
  if (pathname === '/' || pathname === '/en') return null;  // l'accueil porte le sien
  // Chaque peau a son ciel (Alex, 2026-08-31) : la neige d'hiver sous
  // le bleu et argent, les bulles qui montent sous le doré et noir. Le
  // rouge d'origine et le vert gardent la flamme filmée.
  if (skin === 'bleu') return <FondParticules variante="neige" />;
  if (skin === 'dore') return <FondParticules variante="bulles" />;
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
  // PUBLISHED pillar back to the teaser: hold until we actually know.
  if (!ready) return null;
  return <Navigate to="/" replace />;
};

// Même logique que PillarGate, mais adossée à un drapeau libre plutôt
// qu'à un pilier. Sert /partenaires-2027 : la page du commanditaire de
// l'édition SUIVANTE ne doit pas s'ouvrir parce que /partenaires, la page
// de l'édition courante, a été publiée. Les deux vies sont séparées.
const FlagGate: React.FC<{ flag: keyof SiteFlags; children: React.ReactElement }> = ({ flag, children }) => {
  const { flags, ready } = useSiteFlags();
  if (SITE_MODE === 'live' || flags[flag]) return children;
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
        <BadgesProvider>
          <ScrollToTop />
          <LocaleSync />
          <PrefsFondWatcher />
          <AnalyticsPageViews />
          <Chrome />
          {/* Global fire backdrop: only mounted while <body> carries
              `.fmm-caravan-page` (set by useCaravanPage()). Skipping the
              feu global : présent sur toutes les pages sauf l'admin et
              l'accueil-orbe, qui rend sa propre FireCanvas (évite de
              télécharger fire.mp4 deux fois). */}
          <GlobalFireBackdrop />
          <Suspense fallback={null}>
            <SignInModal />
            <FinaliserLien />
            {/* La bannière de consentement se monte au-dessus du
                routeur, et non dans le pied de page : le pied de page
                disparaît sur l'admin et sur les accueils cinématiques,
                et la question du consentement, elle, se pose partout
                (Loi 25, article 8.1). */}
            <ConsentBanner />
          </Suspense>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/"   element={<HomeRoute />} />
                <Route path="/en" element={<HomeRoute />} />
                <Route path="/labo-titre" element={<TitleLab />} />
                <Route path="/accueil"    element={<AccueilPage />} />
                <Route path="/en/accueil" element={<AccueilPage />} />
                {/* Legacy Viking WelcomePage: kept hidden for reference. */}
                <Route path="/backuppage"    element={<WelcomePage />} />
                <Route path="/en/backuppage" element={<WelcomePage />} />
                {pillarRoutes()}
                {/* Page à part, sur son propre slug, gardée par son propre
                    drapeau : publier /partenaires n'ouvre pas celle-ci. */}
                <Route path="/partenaires-2027" element={<FlagGate flag="showCommanditaire"><Partenaires2027Page /></FlagGate>} />
                <Route path="/en/partners-2027" element={<FlagGate flag="showCommanditaire"><Partenaires2027Page /></FlagGate>} />
                {/* La grille des plans de commandite vit maintenant en
                    tête de la page fusionnée /partenaires (Alex,
                    2026-08-12) : les anciens slugs redirigent. */}
                <Route path="/commanditaires" element={<Navigate to="/partenaires" replace />} />
                {/* Le jeu d'échecs viking vit sous /jeunesse; l'adresse courte
                    tapée à la main tombait sur la page 404 (Alex, 2026-08-31). */}
                <Route path="/jeux/hnefatafl" element={<Navigate to="/jeunesse/hnefatafl" replace />} />
                <Route path="/en/games/hnefatafl" element={<Navigate to="/en/youth/hnefatafl" replace />} />
                <Route path="/en/sponsors"    element={<Navigate to="/en/partners" replace />} />
                <Route path="/admin"  element={<AdminPage />} />
                <Route path="/admin/personne/:slug" element={<PersonProfilePage />} />
                <Route path="/admin/benevole/:uid"  element={<BenevoleProfilePage />} />
                {/* Named section routes: /admin/finances, /admin/carnet, etc.
                    :section is validated against ADMIN_SECTION_IDS inside
                    AdminPage; an unknown or forbidden segment falls back to
                    the dashboard, same as today. */}
                <Route path="/admin/:section" element={<AdminPage />} />
                <Route path="/espace-benevole"      element={<BenevoleSpacePage />} />
                <Route path="/en/volunteer-space"   element={<BenevoleSpacePage />} />
                <Route path="/communaute"                       element={<CommunautePage />} />
                <Route path="/communaute/equipe/:teamId"        element={<CommunautePage />} />
                <Route path="/en/community"                     element={<CommunautePage />} />
                <Route path="/en/community/team/:teamId"        element={<CommunautePage />} />
                <Route path="/videos"                           element={<VideosPage />} />
                <Route path="/en/films"                         element={<VideosPage />} />
                <Route path="/ordre"                            element={<OrdrePage />} />
                {/* L'Alliance dort tant qu'Alex ne l'allume pas depuis
                    l'admin (drapeau pubAlliance). */}
                <Route path="/alliance"                         element={<PorteAlliance><AlliancePage /></PorteAlliance>} />
                <Route path="/en/alliance"                      element={<PorteAlliance><AlliancePage /></PorteAlliance>} />
                <Route path="/en/order"                         element={<OrdrePage />} />
                <Route path="/defi/:id"                         element={<DefiLobbyPage />} />
                <Route path="/en/challenge/:id"                 element={<DefiLobbyPage />} />
                <Route path="/profil/:uid"                      element={<PublicProfilePage />} />
                <Route path="/en/profile/:uid"                  element={<PublicProfilePage />} />
                <Route path="/boutique" element={<BoutiquePage />} />
                <Route path="/en/shop"  element={<BoutiquePage />} />
                <Route path="/mur"     element={<MurPage />} />
                <Route path="/en/wall" element={<MurPage />} />
                {/* Le babillard a son adresse depuis le 2026-09-02 : le
                    règlement des armes doit se lire sans compte. */}
                <Route path="/babillard"        element={<BabillardPage />} />
                <Route path="/en/notice-board"  element={<BabillardPage />} />
                {/* Chantier : slug identique dans les deux langues, pas
                    d'entrée dans locale.ts (comme /contact, /messages).
                    Gaté isAdmin à l'intérieur de la page elle-même. */}
                <Route path="/chantier"    element={<ChantierPage />} />
                <Route path="/en/chantier" element={<ChantierPage />} />
                {/* Banc d'essai voter/commenter/partager (Alex, 2026-08-28) :
                    même gate ?apercu=1, jamais publié tel quel. */}
                <Route path="/chantier/votes"    element={<VotesBancEssai />} />
                <Route path="/en/chantier/votes" element={<VotesBancEssai />} />
                <Route path="/chantier/souk"    element={<SoukBancEssai />} />
                <Route path="/en/chantier/souk" element={<SoukBancEssai />} />
                <Route path="/souk"    element={<SoukPage />} />
                <Route path="/en/souk" element={<SoukPage />} />
                <Route path="/guildes"           element={<GuildesPage />} />
                <Route path="/en/guilds"         element={<GuildesPage />} />
                <Route path="/guildes/:id"       element={<GuildePage />} />
                <Route path="/en/guilds/:id"     element={<GuildePage />} />
                <Route path="/messages"                         element={<MessagesPage />} />
                <Route path="/messages/:otherUid"               element={<MessagesPage />} />
                <Route path="/en/messages"                      element={<MessagesPage />} />
                <Route path="/en/messages/:otherUid"            element={<MessagesPage />} />
                <Route path="/compte" element={<ComptePage />} />
                {/* Billetterie en cartes. Publiee le 2026-08-03 apres
                    qu'Alex a confirme que les montants Zeffy sont taxes
                    comprises : les cartes montrent donc le hors-taxes,
                    avec le montant reellement debite juste en dessous. */}
                <Route path="/billets" element={<BilletsPage />} />
                <Route path="/en/tickets" element={<BilletsPage />} />
                <Route path="/en/account" element={<ComptePage />} />
                <Route path="/marche/inscription"   element={<VendorApplicationPage />} />
                <Route path="/en/market/registration" element={<VendorApplicationPage />} />
                <Route path="/marche/faubourg"      element={<FaubourgPage />} />
                <Route path="/en/market/faubourg"   element={<FaubourgPage />} />
                <Route path="/musique/inscription"  element={<MusicianApplicationPage />} />
                <Route path="/en/music/registration" element={<MusicianApplicationPage />} />
                <Route path="/ressources"           element={<RessourcesPage />} />
                <Route path="/en/resources"         element={<RessourcesPage />} />
                <Route path="/jeunesse/hnefatafl"   element={<PorteDuJeu><HnefataflGame /></PorteDuJeu>} />
                <Route path="/jeux/tarot"           element={<PorteDuJeu><TarotGame /></PorteDuJeu>} />
                <Route path="/jeux/des"             element={<PorteDuJeu><DesGame /></PorteDuJeu>} />
                <Route path="/jeux/renard"          element={<PorteDuJeu><RenardGame /></PorteDuJeu>} />
                <Route path="/en/games/fox-and-geese" element={<PorteDuJeu><RenardGame /></PorteDuJeu>} />
                <Route path="/jeux/merelle"         element={<PorteDuJeu><MerelleGame /></PorteDuJeu>} />
                <Route path="/en/games/merelle"     element={<PorteDuJeu><MerelleGame /></PorteDuJeu>} />
                <Route path="/en/games/dice"        element={<PorteDuJeu><DesGame /></PorteDuJeu>} />
                <Route path="/en/games/tarot"       element={<PorteDuJeu><TarotGame /></PorteDuJeu>} />
                <Route path="/en/youth/hnefatafl"   element={<PorteDuJeu><HnefataflGame /></PorteDuJeu>} />
                <Route path="/politique-de-confidentialite" element={<PrivacyPage />} />
                <Route path="/en/privacy" element={<PrivacyPage />} />
                <Route path="/contact"    element={<ContactPage />} />
                <Route path="/en/contact" element={<ContactPage />} />

                {/* Salle de presse. Alex envoie le raccourci
                    festivalmedieval.org/presskit dans ses courriels, et
                    il l'écrit tantôt collé, tantôt avec un trait
                    d'union : les trois orthographes rendent la même
                    page plutôt qu'un 404, dans les deux langues. */}
                <Route path="/presse"       element={<PressePage />} />
                <Route path="/presskit"     element={<PressePage />} />
                <Route path="/press-kit"    element={<PressePage />} />
                <Route path="/en/press"     element={<PressePage />} />
                <Route path="/en/presskit"  element={<PressePage />} />
                <Route path="/en/press-kit" element={<PressePage />} />

                {/* Legacy slug redirects: old scaffold paths and Wix variants. */}
                <Route path="/festival-medieval-de-montpellier" element={<Navigate to="/" replace />} />
                <Route path="/horaire"            element={<Navigate to="/activites" replace />} />
                <Route path="/banquet"            element={<Navigate to="/nourriture" replace />} />
                <Route path="/benevoles"          element={<Navigate to="/benevole" replace />} />
                <Route path="/archives"           element={<Navigate to="/histoire" replace />} />

                {/* Édition 2026 merge: absorbed pillars redirect to their
                    new merged page; Chevaux is retired to the home. */}
                <Route path="/musique"     element={<Navigate to="/activites" replace />} />
                <Route path="/en/music"    element={<Navigate to="/en/activities" replace />} />
                <Route path="/jeunesse"    element={<Navigate to="/activites" replace />} />
                <Route path="/en/youth"    element={<Navigate to="/en/activities" replace />} />
                {/* La chaîne de requête doit survivre : c'est elle qui
                    porte le ?banquet=merci du retour de Square et le
                    ?banquet=1 des boutons du banquet. La version anglaise
                    la perdait en chemin, donc un lecteur anglophone
                    arrivait sur un chapitre replié (Alex, 2026-08-23). */}
                {/* Commandite acceptée : l'ancien slug de maquette suit
                    la règle de la branche unique et redirige vers la
                    vraie page, pour que le lien envoyé à Xavier vive. */}
                <Route path="/william"     element={<Navigate to="/nourriture" replace />} />
                {/* Signature au doigt de l'entente des cuisiniers,
                    partagée par lien Messenger. Hors menus. */}
                <Route path="/signer-cuisine" element={<SignerCuisinePage />} />
                {/* Petite Monnaie a rejoint Commanditaires & Partenaires sur
                    une seule vitrine (Alex, 2026-08-27) : son ancien pilier
                    redirige vers l'ancre de son chapitre. */}
                <Route path="/boissons"    element={<Navigate to={{ pathname: '/nourriture', hash: '#boissons' }} replace />} />
                <Route path="/en/drinks"   element={<Navigate to={{ pathname: '/en/food', hash: '#boissons' }} replace />} />
                <Route path="/petite-monnaie"    element={<Navigate to={{ pathname: '/partenaires', hash: '#petite-monnaie' }} replace />} />
                <Route path="/en/petite-monnaie" element={<Navigate to={{ pathname: '/en/partners', hash: '#petite-monnaie' }} replace />} />
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
          {/* L'annonce d'un badge se pose au centre de l'écran, par-dessus
              tout le reste. Un seul exemplaire pour tout le site. */}
          <AnnonceBadge />
          {/* La roue des sept jours : la récompense de la visite
              quotidienne tombe d'elle-même, avec la fanfare. */}
          <RecompensesQuotidiennes />
        </BadgesProvider>
        </BrowserRouter>
        </AuthProvider>
      </SiteFlagsProvider>
    </AppProvider>
  </HelmetProvider>
);

export default App;
