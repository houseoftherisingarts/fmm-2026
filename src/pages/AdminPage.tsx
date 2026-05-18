import React, { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSiteFlags } from '../contexts/SiteFlagsContext';
import { isFirebaseReady } from '../firebase';
import { canAccess, ROLE_LABELS } from '../lib/adminPermissions';
import {
  listBenevoles, listVendors,
  setBenevoleStatus, setVendorStatus,
  type AppStatus, type VendorStatus,
} from '../firebase/applications';
import {
  mockListBenevoles, mockListVendors,
  mockSetBenevoleStatus, mockSetVendorStatus,
} from '../firebase/mockApplications';
import {
  listMusicians, setMusicianStatus,
  type MusicianApp, type MusicianStatus,
} from '../firebase/musicians';
import {
  mockListMusicians, mockSetMusicianStatus,
} from '../firebase/mockMusicians';

// In dev mode (vite dev), always merge the mock showcase entries on top
// of the live list so the demo is visible without forcing DEV_BYPASS.
// Stripped from production builds because import.meta.env.DEV is false.
const SHOWCASE_IN_DEV = import.meta.env.DEV;
import SEO from '../components/SEO';

import AdminShell, { type AdminSectionId } from './admin/AdminShell';
import GateScreen from './admin/GateScreen';
import type { AdminRole } from '../lib/adminPermissions';

// Lazy-loaded sections — keeps the AdminPage entry bundle tight. Most
// admins only open 2–3 sections per session, and Pupitre alone drags in
// html2canvas + jspdf + dompurify (~500 kB combined) which previously
// shipped to every admin on login.
const DashboardSection    = lazy(() => import('./admin/sections/DashboardSection'));
const BenevolesSection    = lazy(() => import('./admin/sections/BenevolesSection'));
const EquipesSection      = lazy(() => import('./admin/sections/EquipesSection'));
const MarchandsSection    = lazy(() => import('./admin/sections/MarchandsSection'));
const MusiquesSection     = lazy(() => import('./admin/sections/MusiquesSection'));
const PupitreSection      = lazy(() => import('./admin/sections/PupitreSection'));
const SocialMediaSection  = lazy(() => import('./admin/sections/SocialMediaSection'));
const MatriceRolesSection = lazy(() => import('./admin/sections/MatriceRolesSection'));
const HoraireSection      = lazy(() => import('./admin/sections/HoraireSection'));
const BarSection          = lazy(() => import('./admin/sections/BarSection'));
const MariagesSection     = lazy(() => import('./admin/sections/MariagesSection'));
const ComptesSection      = lazy(() => import('./admin/sections/ComptesSection'));
const MessagesSection     = lazy(() => import('./admin/sections/MessagesSection'));
const NewsletterSection   = lazy(() => import('./admin/sections/NewsletterSection'));
const MediasSection       = lazy(() => import('./admin/sections/MediasSection'));
const AnalyticsSection    = lazy(() => import('./admin/sections/AnalyticsSection'));
const SplashSection       = lazy(() => import('./admin/sections/SplashSection'));
const ParametresSection   = lazy(() => import('./admin/sections/ParametresSection'));
const DiscordSection      = lazy(() => import('./admin/sections/DiscordSection'));
const RolesSection        = lazy(() => import('./admin/sections/RolesSection'));

const SectionFallback: React.FC = () => (
  <div className="flex items-center justify-center py-16">
    <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-brass animate-spin" />
  </div>
);

// DEV-ONLY auth bypass — toggled by VITE_ADMIN_DEV_BYPASS=true.
const DEV_BYPASS = import.meta.env.VITE_ADMIN_DEV_BYPASS === 'true' && import.meta.env.DEV;

// Wire CRUD to live Firestore vs in-memory mocks based on bypass flag.
// In vite dev, always splice in the mock showcase records so demo
// profiles (Béné Vole, Léa Marchand…) appear in the bénévoles list
// even without DEV_BYPASS. Mock uids start with `mock-`.
const fetchBenevoles = async () => {
  if (DEV_BYPASS) return mockListBenevoles();
  let live: Awaited<ReturnType<typeof listBenevoles>> = [];
  try { live = await listBenevoles(); }
  catch (e) {
    if (SHOWCASE_IN_DEV) console.warn('[admin] listBenevoles failed, using mock showcase only', e);
    else throw e;
  }
  if (!SHOWCASE_IN_DEV) return live;
  const mocks = await mockListBenevoles();
  const seen = new Set(live.map((b) => b.uid));
  return [...mocks.filter((b) => !seen.has(b.uid)), ...live];
};
const fetchVendors = async () => {
  if (DEV_BYPASS) return mockListVendors();
  let live: Awaited<ReturnType<typeof listVendors>> = [];
  try { live = await listVendors(); }
  catch (e) {
    if (SHOWCASE_IN_DEV) console.warn('[admin] listVendors failed, using mock showcase only', e);
    else throw e;
  }
  if (!SHOWCASE_IN_DEV) return live;
  const mocks = await mockListVendors();
  const seen = new Set(live.map((v) => v.uid));
  return [...mocks.filter((v) => !seen.has(v.uid)), ...live];
};
const updateBenevole = (uid: string, s: AppStatus, n?: string) => {
  if (DEV_BYPASS || uid.startsWith('mock-')) return mockSetBenevoleStatus(uid, s, n);
  return setBenevoleStatus(uid, s, n);
};
const updateVendor = (uid: string, year: number, s: VendorStatus, n?: string) => {
  if (DEV_BYPASS || uid.startsWith('mock-')) return mockSetVendorStatus(uid, s, n);
  return setVendorStatus(uid, year, s, n);
};

// Musicians — same DEV_BYPASS pattern as vendors. Mock store is also
// spliced in dev so Pitch can see demo applications without Firestore.
const fetchMusicians = async (): Promise<MusicianApp[]> => {
  if (DEV_BYPASS) return mockListMusicians();
  let live: MusicianApp[] = [];
  try { live = await listMusicians(); }
  catch (e) {
    if (SHOWCASE_IN_DEV) console.warn('[admin] listMusicians failed, using mock showcase only', e);
    else throw e;
  }
  if (!SHOWCASE_IN_DEV) return live;
  const mocks = await mockListMusicians();
  const seen = new Set(live.map((m) => `${m.uid}_${m.year}`));
  return [...mocks.filter((m) => !seen.has(`${m.uid}_${m.year}`)), ...live];
};
const updateMusician = (uid: string, year: number, s: MusicianStatus, n?: string) => {
  if (DEV_BYPASS || uid.startsWith('mock-')) return mockSetMusicianStatus(uid, year, s, n);
  return setMusicianStatus(uid, year, s, n);
};

const BYPASS_USER = {
  email: 'dev@local',
  displayName: 'Dev (bypass)',
  photoURL: null,
};

const AdminPage: React.FC = () => {
  const { user, loading, openSignIn, signOut, adminRole, isSuperAdmin, roleLoading } = useAuth();
  const { flags, setFlag } = useSiteFlags();
  const location = useLocation();
  const initialSection = (location.state as { section?: AdminSectionId } | null)?.section ?? 'dashboard';
  const [section, setSection] = useState<AdminSectionId>(initialSection);

  // The role the visitor walked through the gate as. Super-admins can
  // pick anyone's door for preview; everyone else can only pick their
  // own. Null = still standing in front of the gate.
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);

  // Effective role used by every permission check inside the shell —
  // the role the visitor entered as, not necessarily their real one.
  // Super-admins picking the CA door, for instance, see the CA scope.
  const effectiveRole: AdminRole | null = selectedRole;

  // Guard: if the URL state landed on a section this role can't open,
  // bounce them back to the dashboard. Also runs when the effective
  // role changes (e.g., super-admin switched gates mid-session).
  useEffect(() => {
    if (!effectiveRole) return;
    if (!canAccess(effectiveRole, section)) setSection('dashboard');
  }, [effectiveRole, section]);

  const renderSection = () => {
    switch (section) {
      case 'dashboard':  return <DashboardSection  onNavigate={setSection} devBypass={DEV_BYPASS} />;
      case 'benevoles':  return <BenevolesSection  fetchAll={fetchBenevoles} updateOne={updateBenevole} />;
      case 'equipes':    return <EquipesSection    devBypass={DEV_BYPASS} />;
      case 'marchands':  return <MarchandsSection  fetchAll={fetchVendors}   updateOne={updateVendor} />;
      case 'musiciens':  return <MusiquesSection   fetchAll={fetchMusicians} updateOne={updateMusician} />;
      case 'pupitre':    return <PupitreSection />;
      case 'matrice':    return <MatriceRolesSection devBypass={DEV_BYPASS} />;
      case 'horaire':    return <HoraireSection      devBypass={DEV_BYPASS} />;
      case 'bar':        return <BarSection         devBypass={DEV_BYPASS} />;
      case 'mariages':   return <MariagesSection    devBypass={DEV_BYPASS} />;
      case 'comptes':    return <ComptesSection    devBypass={DEV_BYPASS} />;
      case 'messages':   return <MessagesSection   devBypass={DEV_BYPASS} />;
      case 'newsletter': return <NewsletterSection devBypass={DEV_BYPASS} />;
      case 'social':     return <SocialMediaSection />;
      case 'medias':     return <MediasSection     devBypass={DEV_BYPASS} />;
      case 'analytics':  return <AnalyticsSection  devBypass={DEV_BYPASS} />;
      case 'splash':     return <SplashSection />;
      case 'parametres': return <ParametresSection flags={flags as unknown as Record<string, unknown>} setFlag={setFlag as any} />;
      case 'discord':    return <DiscordSection    devBypass={DEV_BYPASS} />;
      case 'roles':      return <RolesSection      devBypass={DEV_BYPASS} />;
    }
  };

  // ── DEV BYPASS — skip auth but still walk through the gate so the
  //    role-preview behaviour can be exercised offline.
  if (DEV_BYPASS) {
    if (!selectedRole) {
      return (
        <>
          <SEO title="Admin (DEV) · Chambre du Conseil" />
          <GateScreen
            actualRole={null}
            isSuperAdmin
            signedIn
            userEmail={BYPASS_USER.email}
            onSignOut={signOut}
            onEnter={(role) => { setSelectedRole(role); setSection('dashboard'); }}
          />
        </>
      );
    }
    const isPreviewingDev = selectedRole !== 'super';
    return (
      <>
        <SEO title={`Admin (DEV) · ${ROLE_LABELS[selectedRole].FR}`} />
        <AdminShell
          user={BYPASS_USER}
          section={section}
          onSectionChange={setSection}
          onSignOut={signOut}
          devBanner
          adminRole={selectedRole}
          actualAdminRole="super"
          onAdminRoleChange={setSelectedRole}
          previewBanner={
            isPreviewingDev
              ? { role: selectedRole, onBack: () => setSelectedRole(null) }
              : null
          }
          onBackToGates={() => setSelectedRole(null)}
        >
          <Suspense fallback={<SectionFallback />}>
            {renderSection()}
          </Suspense>
        </AdminShell>
      </>
    );
  }

  if (!isFirebaseReady) {
    return (
      <main className="min-h-screen bg-midnight-deep text-ivory flex items-center justify-center px-6">
        <SEO title="Admin" />
        <div className="max-w-md text-center glass-light rounded-lg-card p-8">
          <h1 className="font-display title-medieval text-3xl text-brass mb-4">Admin</h1>
          <p className="font-editorial text-ivory-soft mb-4">
            Firebase n’est pas configuré. Ajoutez les valeurs <code className="text-brass">VITE_FIREBASE_*</code> et <code className="text-brass">VITE_ADMIN_EMAILS</code> dans <code className="text-brass">.env.local</code> puis redémarrez le serveur.
          </p>
          <p className="font-editorial italic text-sm text-stone">
            Astuce : pour itérer sur le dashboard sans Firebase, mettez <code className="text-brass">VITE_ADMIN_DEV_BYPASS=true</code> dans <code className="text-brass">.env.local</code>.
          </p>
        </div>
      </main>
    );
  }
  if (loading || roleLoading) {
    return (
      <main className="min-h-screen bg-midnight-deep flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent border-brass animate-spin" />
      </main>
    );
  }
  // Anonymous + signed-in visitors both land on the gate. Anonymous
  // visitors see all doors locked; knocking on any door opens the
  // sign-in modal instead of the HALT page. Signed-in visitors with
  // no role see locked doors too — clicking triggers HALT. Whoever
  // walks in legitimately can pick their door from there. The `!user`
  // guard also ensures we never reach the shell render below without
  // an authenticated user.
  if (!selectedRole || !user) {
    return (
      <>
        <SEO title="Admin · Chambre du Conseil" />
        <GateScreen
          actualRole={adminRole}
          isSuperAdmin={isSuperAdmin}
          signedIn={!!user}
          userEmail={user?.email ?? ''}
          onSignIn={openSignIn}
          onSignOut={signOut}
          onEnter={(role) => { setSelectedRole(role); setSection('dashboard'); }}
        />
      </>
    );
  }

  // Through the gate — render the shell scoped to the chosen role.
  // Preview banner fires whenever the role they're VIEWING AS differs
  // from their actual clearance (super-admin via gate, or any admin
  // who hit the "View as" toggle in the sidebar).
  const actualRoleForShell = isSuperAdmin ? 'super' : adminRole;
  const isPreviewing = selectedRole !== actualRoleForShell;
  return (
    <>
      <SEO title={`Admin · ${ROLE_LABELS[effectiveRole ?? 'super'].FR}`} />
      <AdminShell
        user={user}
        section={section}
        onSectionChange={setSection}
        onSignOut={signOut}
        adminRole={effectiveRole}
        actualAdminRole={actualRoleForShell}
        onAdminRoleChange={setSelectedRole}
        previewBanner={
          isPreviewing
            ? {
                role: selectedRole,
                onBack: () => setSelectedRole(null),
              }
            : null
        }
        onBackToGates={() => setSelectedRole(null)}
      >
        <Suspense fallback={<SectionFallback />}>
          {renderSection()}
        </Suspense>
      </AdminShell>
    </>
  );
};

export default AdminPage;
