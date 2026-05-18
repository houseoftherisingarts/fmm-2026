import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar, Award, Languages, Shirt, Car,
  Heart, Sparkles, Save, AlertTriangle, Instagram, Facebook, Globe, Clock,
  HandHeart, BadgeCheck, Crown, UsersRound,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { isFirebaseReady } from '../../firebase';
import SEO from '../../components/SEO';
import AdminShell from './AdminShell';
import { Card, EmptyState, Badge, fmtDate } from './primitives';
import MessageThread from '../../components/vendor/MessageThread';
import { setBenevoleTeam, type BenevoleTeamRole } from '../../firebase/applications';
import { listTeams, type Team } from '../../firebase/teams';
import { mockListTeams, mockSetBenevoleTeam } from '../../firebase/mockApplications';
import {
  getBenevoleApp, setBenevoleStatus,
  type BenevoleApp, type AppStatus,
} from '../../firebase/applications';
import { mockGetBenevole, mockSetBenevoleStatus } from '../../firebase/mockApplications';

const DEV_BYPASS = import.meta.env.VITE_ADMIN_DEV_BYPASS === 'true' && import.meta.env.DEV;
const BYPASS_USER = { email: 'dev@local', displayName: 'Dev (bypass)', photoURL: null };

const STATUS_LABEL: Record<AppStatus, string> = {
  pending: 'En attente', accepted: 'Acceptée', rejected: 'Refusée',
};
const TRANSPORT_LABEL: Record<NonNullable<BenevoleApp['transport']>, string> = {
  voiture: 'Voiture',
  covoiturage: 'Covoiturage',
  transport_collectif: 'Transport collectif',
  aucun: 'Aucun',
};
const LANG_LABEL: Record<NonNullable<BenevoleApp['languages']>[number], string> = {
  FR: 'Français', EN: 'Anglais', ES: 'Espagnol', AR: 'Arabe', DE: 'Allemand', IT: 'Italien',
};

function hueFor(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 360;
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const BenevoleProfilePage: React.FC = () => {
  const { uid = '' } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, loading, openSignIn, signOut } = useAuth();

  const [b, setB] = useState<BenevoleApp | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  // mock-prefixed uids always go through the in-memory showcase store —
  // lets demo profiles work in dev without needing DEV_BYPASS.
  const isMockUid = uid.startsWith('mock-');
  const useMock = DEV_BYPASS || isMockUid;
  const fetchOne  = (id: string) => useMock ? mockGetBenevole(id) : getBenevoleApp(id);
  const updateOne = (id: string, status: AppStatus, notes?: string) =>
    useMock ? mockSetBenevoleStatus(id, status, notes) : setBenevoleStatus(id, status, notes);

  useEffect(() => {
    fetchOne(uid).then((res) => { setB(res); setDataLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const reload = async () => { setB(await fetchOne(uid)); };

  // ── Auth gate (mirrors AdminPage) ──────────────────────────────
  if (DEV_BYPASS) {
    return (
      <>
        <SEO title={`Profil bénévole · ${b?.displayName || ''}`} />
        <AdminShell user={BYPASS_USER} section="benevoles"
          onSectionChange={(s) => navigate('/admin', { state: { section: s } })}
          onSignOut={signOut} devBanner>
          <Body b={b} loading={dataLoading} updateOne={updateOne} reload={reload}
            adminUid={'dev-bypass'} adminName={BYPASS_USER.displayName} />
        </AdminShell>
      </>
    );
  }
  if (!isFirebaseReady) return <Stub label="Firebase non configuré." />;
  if (loading)          return <Stub spinner />;
  if (!user)            return <Stub label="Connexion requise." action={{ label: 'Se connecter', fn: openSignIn }} />;
  if (!isAdmin)         return <Stub label="Accès refusé." action={{ label: 'Se déconnecter', fn: signOut }} />;

  return (
    <>
      <SEO title={`Profil bénévole · ${b?.displayName || ''}`} />
      <AdminShell user={user} section="benevoles"
        onSectionChange={(s) => navigate('/admin', { state: { section: s } })}
        onSignOut={signOut}>
        <Body b={b} loading={dataLoading} updateOne={updateOne} reload={reload}
          adminUid={user.uid} adminName={user.displayName || user.email || 'FMM'} />
      </AdminShell>
    </>
  );
};

// ─── Body ───────────────────────────────────────────────────────────
const Body: React.FC<{
  b: BenevoleApp | null;
  loading: boolean;
  updateOne: (uid: string, status: AppStatus, notes?: string) => Promise<void>;
  reload: () => Promise<void>;
  adminUid: string;
  adminName: string;
}> = ({ b, loading, updateOne, reload, adminUid, adminName }) => {
  const [notesDraft, setNotesDraft] = useState(b?.adminNotes || '');
  const [saving, setSaving] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => { setNotesDraft(b?.adminNotes || ''); }, [b?.adminNotes]);

  // Load teams once — small list, fine to merge live + mock as in EquipesSection.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let live: Team[] = [];
      try { live = await listTeams(); } catch { /* offline */ }
      const mocks = await mockListTeams();
      const seen = new Set(live.map((t) => t.id));
      if (!cancelled) setTeams([...mocks.filter((t) => !seen.has(t.id)), ...live]);
    })();
    return () => { cancelled = true; };
  }, []);

  const assignTeam = async (teamId: string | null, role: BenevoleTeamRole | null) => {
    if (!b) return;
    setSaving(true);
    try {
      if (b.uid.startsWith('mock-')) await mockSetBenevoleTeam(b.uid, teamId, role);
      else                            await setBenevoleTeam(b.uid, teamId, role);
      await reload();
    } finally { setSaving(false); }
  };

  const setStatus = async (status: AppStatus) => {
    if (!b) return;
    setSaving(true);
    try { await updateOne(b.uid, status, notesDraft); await reload(); }
    finally { setSaving(false); }
  };
  const saveNotes = async () => {
    if (!b) return;
    setSaving(true);
    try { await updateOne(b.uid, b.status, notesDraft); await reload(); }
    finally { setSaving(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-brass animate-spin" />
    </div>;
  }
  if (!b) {
    return <Card><EmptyState icon={HandHeart}>
      Bénévole introuvable. <Link to="/admin" className="text-brass underline">Retour au tableau de bord</Link>.
    </EmptyState></Card>;
  }

  const fullName = `${b.prenom || ''} ${b.nom || ''}`.trim() || b.displayName;
  const hue = hueFor(fullName);

  return (
    <div className="-m-4 md:-m-8">
      {/* Banner */}
      <div className="relative h-44 md:h-56 overflow-hidden"
        style={{ background:
          `linear-gradient(135deg, hsl(${hue} 38% 22%), hsl(${(hue + 35) % 360} 30% 14%) 70%, var(--color-midnight-deep))` }}>
        <div className="absolute inset-0 brume opacity-30 mix-blend-screen pointer-events-none" />
        <div className="absolute inset-0 grain pointer-events-none" />
        <Link to="/admin" state={{ section: 'benevoles' }}
          className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-card bg-midnight-deep/50 backdrop-blur border border-ivory-soft/15 text-ivory-soft hover:text-brass hover:border-brass transition font-sans text-xs uppercase tracking-widest">
          <ArrowLeft size={12} /> Retour aux bénévoles
        </Link>
        <div className="absolute top-4 right-4">
          <Badge tone={b.status}>{STATUS_LABEL[b.status]}</Badge>
        </div>
      </div>

      {/* Header */}
      <div className="px-4 md:px-8 -mt-16 md:-mt-20 relative">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-5 md:gap-7 items-start">
          <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-midnight-deep shadow-2xl flex items-center justify-center font-display title-medieval text-3xl md:text-4xl"
            style={{ backgroundColor: `hsl(${hue} 30% 18%)`, color: `hsl(${hue} 60% 70%)` }}>
            {initials(fullName)}
          </div>

          <div className="flex-1 min-w-0 pt-2 md:pt-12">
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px] mb-1">
              Profil bénévole · candidature {b.year}
            </p>
            <h1 className="font-display title-medieval text-3xl md:text-4xl text-ivory leading-tight">
              {fullName}
            </h1>
            <p className="font-editorial italic text-ivory-soft mt-2 leading-relaxed">
              {b.city ? `${b.city} · ` : ''}
              {b.pastYears && b.pastYears.length > 0
                ? `${b.pastYears.length} édition${b.pastYears.length > 1 ? 's' : ''} précédente${b.pastYears.length > 1 ? 's' : ''}`
                : 'Première édition'}
              {b.hoursLogged != null && ` · ${b.hoursLogged} h cumulées`}
            </p>

            {b.badges && b.badges.length > 0 && (
              <div className="flex items-center flex-wrap gap-1.5 mt-3">
                {b.badges.map((label) => (
                  <span key={label}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-card border border-brass/40 bg-brass/10 text-brass font-sans text-[10px] uppercase tracking-widest">
                    <BadgeCheck size={10} /> {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 md:px-8 mt-8 md:mt-10 pb-12">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-6">
          {/* Left column — main */}
          <div className="lg:col-span-8 space-y-5">

            {/* Message */}
            <Card className="p-5 md:p-6">
              <SectionTitle icon={Heart}>Message de candidature</SectionTitle>
              {b.message
                ? <p className="font-editorial text-base text-ivory-soft whitespace-pre-line leading-relaxed">{b.message}</p>
                : <p className="font-editorial italic text-ivory-soft/60">— aucun message —</p>}
            </Card>

            {/* Disponibilités */}
            {b.availability && Object.keys(b.availability).length > 0 && (
              <Card className="p-5 md:p-6">
                <SectionTitle icon={Calendar}>Disponibilités</SectionTitle>
                <ul className="space-y-2">
                  {(Object.entries(b.availability) as [string, string][]).map(([day, slot]) => (
                    <li key={day} className="flex items-baseline justify-between gap-3 px-3 py-2 rounded-card border border-ivory-soft/10 hover:bg-brass/5">
                      <span className="font-display title-medieval text-sm text-brass capitalize">{day}</span>
                      <span className="font-sans text-sm text-ivory text-right">{slot}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Quarts assignés */}
            {b.assignedShifts && b.assignedShifts.length > 0 && (
              <Card className="p-5 md:p-6">
                <SectionTitle icon={Clock}>Quarts assignés</SectionTitle>
                <div className="space-y-2">
                  {b.assignedShifts.map((s, i) => (
                    <div key={i} className="grid grid-cols-12 items-center gap-3 px-3 py-2 rounded-card border border-ivory-soft/10">
                      <span className="col-span-5 font-display title-medieval text-sm text-ivory">{s.day}</span>
                      <span className="col-span-3 font-sans text-sm text-ivory-soft tabular-nums">{s.start}–{s.end}</span>
                      <span className="col-span-4 font-sans text-xs text-brass uppercase tracking-widest text-right">{s.station}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Compétences + certifications */}
            {((b.skills && b.skills.length > 0) || (b.certifications && b.certifications.length > 0)) && (
              <Card className="p-5 md:p-6">
                <SectionTitle icon={Sparkles}>Compétences & certifications</SectionTitle>
                {b.skills && b.skills.length > 0 && (
                  <div className="mb-4">
                    <p className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest mb-1.5">Compétences</p>
                    <div className="flex flex-wrap gap-1.5">
                      {b.skills.map((s) => (
                        <span key={s}
                          className="inline-flex items-center px-2.5 py-1 rounded-card border border-ivory-soft/15 bg-ivory-soft/5 text-ivory text-xs font-sans">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {b.certifications && b.certifications.length > 0 && (
                  <div>
                    <p className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest mb-1.5">Certifications</p>
                    <div className="flex flex-wrap gap-1.5">
                      {b.certifications.map((c) => (
                        <span key={c}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-card border border-emerald-400/30 bg-emerald-400/5 text-emerald-300 text-xs font-sans">
                          <Award size={11} /> {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Stations préférées */}
            {b.preferredStations && b.preferredStations.length > 0 && (
              <Card className="p-5 md:p-6">
                <SectionTitle icon={MapPin}>Stations préférées</SectionTitle>
                <div className="flex flex-wrap gap-1.5">
                  {b.preferredStations.map((s) => (
                    <span key={s}
                      className="inline-flex items-center px-3 py-1.5 rounded-card border border-brass/30 bg-brass/8 text-brass text-xs font-sans uppercase tracking-widest">
                      {s}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* Messagerie bénévole ↔ FMM */}
            <Card className="p-5 md:p-6">
              <MessageThread
                vendorUid={b.uid}
                threadKind="benevole"
                currentUid={adminUid}
                currentName={adminName}
                currentRole="admin"
                height="h-72"
                title="Messagerie avec ce bénévole"
              />
            </Card>

            {/* Notes admin + actions */}
            <Card className="p-5 md:p-6 border border-brass/30">
              <SectionTitle icon={Save}>Notes admin (privées)</SectionTitle>
              <textarea rows={3} value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="Notes internes — ne sont jamais visibles par le bénévole."
                className="w-full bg-midnight-deep/60 border border-ivory-soft/20 px-3 py-2 text-sm font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-card resize-y" />
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button onClick={() => setStatus('accepted')} disabled={saving}
                  className="px-4 py-1.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/30 font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card disabled:opacity-50">
                  Accepter
                </button>
                <button onClick={() => setStatus('rejected')} disabled={saving}
                  className="px-4 py-1.5 bg-blush/20 border border-blush/40 text-blush hover:bg-blush/30 font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card disabled:opacity-50">
                  Refuser
                </button>
                <button onClick={() => setStatus('pending')} disabled={saving}
                  className="px-4 py-1.5 bg-brass/15 border border-brass/40 text-brass hover:bg-brass/25 font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card disabled:opacity-50">
                  En attente
                </button>
                <button onClick={saveNotes} disabled={saving}
                  className="ml-auto inline-flex items-center gap-1.5 px-4 py-1.5 border border-stone text-ivory hover:bg-ivory hover:text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card disabled:opacity-50">
                  <Save size={12} /> Enregistrer les notes
                </button>
              </div>
            </Card>
          </div>

          {/* Right column — meta */}
          <aside className="lg:col-span-4 space-y-5">

            <Card className="p-5">
              <SectionTitle icon={Phone} dense>Coordonnées</SectionTitle>
              <ul className="space-y-2 text-sm">
                <Coord icon={Mail}  value={b.email} href={`mailto:${b.email}`} />
                <Coord icon={Phone} value={b.telephone} href={b.telephone ? `tel:${b.telephone.replace(/[^\d+]/g, '')}` : undefined} />
                {b.city && <Coord icon={MapPin} value={b.city} />}
              </ul>
              {b.socials && Object.values(b.socials).some(Boolean) && (
                <div className="mt-3 pt-3 border-t border-ivory-soft/10 flex items-center gap-3">
                  {b.socials.instagram && <SocialLink icon={Instagram} label="Instagram" handle={b.socials.instagram} href={`https://instagram.com/${b.socials.instagram.replace(/^@/, '')}`} />}
                  {b.socials.facebook  && <SocialLink icon={Facebook}  label="Facebook"  handle={b.socials.facebook}  href={`https://facebook.com/${b.socials.facebook}`} />}
                  {b.socials.website   && <SocialLink icon={Globe}     label="Site"      handle={b.socials.website}   href={b.socials.website.startsWith('http') ? b.socials.website : `https://${b.socials.website}`} />}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <SectionTitle icon={UsersRound} dense>Équipe</SectionTitle>
              {b.teamId ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">{teams.find((t) => t.id === b.teamId)?.icon || '🏛️'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display title-medieval text-sm text-ivory truncate">
                        {teams.find((t) => t.id === b.teamId)?.name || b.teamId}
                      </p>
                      <p className={`font-editorial italic text-xs ${b.teamRole === 'leader' ? 'text-brass' : 'text-ivory-soft/70'}`}>
                        {b.teamRole === 'leader' ? '★ Leader (RESPONSABLE)' : 'Membre'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      onClick={() => assignTeam(b.teamId!, b.teamRole === 'leader' ? 'member' : 'leader')}
                      disabled={saving}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-card text-[10px] uppercase tracking-widest font-sans transition disabled:opacity-50 ${
                        b.teamRole === 'leader'
                          ? 'border border-ivory-soft/30 text-ivory-soft hover:border-brass hover:text-brass'
                          : 'border border-brass/40 bg-brass/10 text-brass hover:bg-brass/20'
                      }`}
                    >
                      <Crown size={10} /> {b.teamRole === 'leader' ? 'Démettre' : 'Promouvoir'}
                    </button>
                    <button
                      onClick={() => assignTeam(null, null)}
                      disabled={saving}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-card border border-blush/30 bg-blush/5 text-blush hover:bg-blush/15 text-[10px] uppercase tracking-widest font-sans transition disabled:opacity-50"
                    >
                      Retirer
                    </button>
                  </div>
                </>
              ) : (
                <p className="font-editorial italic text-xs text-ivory-soft/60 mb-3">
                  Pas encore affecté·e à une équipe.
                </p>
              )}
              <label className="block mt-3">
                <span className="block font-display title-medieval text-[10px] text-brass uppercase tracking-widest mb-1.5">
                  {b.teamId ? 'Réassigner' : 'Assigner à'}
                </span>
                <select
                  value={b.teamId || ''}
                  onChange={(e) => {
                    const id = e.target.value || null;
                    if (!id) assignTeam(null, null);
                    else     assignTeam(id, b.teamRole || 'member');
                  }}
                  disabled={saving || teams.length === 0}
                  className="w-full bg-midnight-deep/60 border border-ivory-soft/20 px-2.5 py-2 rounded-card text-sm font-sans text-ivory focus:border-brass focus:outline-none disabled:opacity-50"
                >
                  <option value="">— aucune —</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.icon ? `${t.icon} ` : ''}{t.name}</option>
                  ))}
                </select>
              </label>
            </Card>

            {b.emergencyContact && (
              <Card className="p-5 border border-blush/25 bg-blush/5">
                <SectionTitle icon={AlertTriangle} dense>Contact d'urgence</SectionTitle>
                <p className="font-sans text-sm text-ivory">{b.emergencyContact.name}</p>
                {b.emergencyContact.relation && <p className="font-editorial italic text-xs text-ivory-soft/70 mt-0.5">{b.emergencyContact.relation}</p>}
                <a href={`tel:${b.emergencyContact.phone.replace(/[^\d+]/g, '')}`}
                  className="inline-flex items-center gap-1.5 mt-1.5 text-blush text-sm font-sans hover:underline">
                  <Phone size={12} /> {b.emergencyContact.phone}
                </a>
              </Card>
            )}

            <Card className="p-5">
              <SectionTitle icon={Sparkles} dense>Logistique</SectionTitle>
              <dl className="space-y-2 text-sm">
                {b.languages && b.languages.length > 0 && (
                  <Row label="Langues" icon={Languages}>
                    {b.languages.map((l) => LANG_LABEL[l]).join(', ')}
                  </Row>
                )}
                {b.tShirtSize && (
                  <Row label="T-shirt" icon={Shirt}>{b.tShirtSize}</Row>
                )}
                {b.transport && (
                  <Row label="Transport" icon={Car}>{TRANSPORT_LABEL[b.transport]}</Row>
                )}
                {b.dietaryNotes && (
                  <Row label="Diète" icon={Heart}>{b.dietaryNotes}</Row>
                )}
                {b.allergies && b.allergies.toLowerCase() !== 'aucune' && (
                  <Row label="Allergies" icon={AlertTriangle}>
                    <span className="text-blush">{b.allergies}</span>
                  </Row>
                )}
              </dl>
            </Card>

            <Card className="p-5">
              <SectionTitle icon={Calendar} dense>Historique</SectionTitle>
              <dl className="space-y-2 text-sm">
                <Row label="Reçue le">{fmtDate(b.createdAt)}</Row>
                <Row label="Modifiée">{fmtDate(b.updatedAt)}</Row>
                {b.pastYears && b.pastYears.length > 0 && (
                  <Row label="Éditions">{b.pastYears.sort((a, b) => a - b).join(' · ')}</Row>
                )}
                {b.hoursLogged != null && (
                  <Row label="Heures">{b.hoursLogged} h cumulées</Row>
                )}
              </dl>
            </Card>

          </aside>
        </div>
      </div>
    </div>
  );
};

// ─── Tiny sub-components ────────────────────────────────────────────
const SectionTitle: React.FC<{ icon: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode; dense?: boolean }> = ({ icon: Icon, children, dense }) => (
  <div className={`flex items-center gap-2 ${dense ? 'mb-2.5' : 'mb-3.5'}`}>
    <Icon size={13} className="text-brass" />
    <p className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest">{children}</p>
  </div>
);

const Row: React.FC<{ label: string; icon?: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode }> = ({ label, icon: Icon, children }) => (
  <div className="flex items-baseline justify-between gap-3">
    <dt className="text-ivory-soft/70 font-sans text-xs flex items-center gap-1.5">
      {Icon && <Icon size={11} className="text-stone" />}{label}
    </dt>
    <dd className="text-ivory text-sm font-sans text-right min-w-0 truncate">{children}</dd>
  </div>
);

const Coord: React.FC<{ icon: React.ComponentType<{ size?: number; className?: string }>; value: string; href?: string }> = ({ icon: Icon, value, href }) => (
  <li className="flex items-center gap-2">
    <Icon size={12} className="text-stone shrink-0" />
    {href
      ? <a href={href} className="text-ivory hover:text-brass transition truncate">{value}</a>
      : <span className="text-ivory truncate">{value}</span>}
  </li>
);

const SocialLink: React.FC<{ icon: React.ComponentType<{ size?: number; className?: string }>; label: string; handle: string; href: string }> = ({ icon: Icon, label, handle, href }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" title={label}
    className="inline-flex items-center gap-1 text-ivory-soft hover:text-brass transition text-xs font-sans">
    <Icon size={13} /> <span className="truncate max-w-[8rem]">{handle}</span>
  </a>
);

const Stub: React.FC<{ label?: string; spinner?: boolean; action?: { label: string; fn: () => void } }> = ({ label, spinner, action }) => (
  <main className="min-h-screen bg-midnight-deep text-ivory flex items-center justify-center px-6">
    <div className="max-w-md text-center glass-light rounded-lg-card p-8">
      {spinner
        ? <div className="w-8 h-8 mx-auto rounded-full border-2 border-t-transparent border-brass animate-spin" />
        : (<>
            <p className="font-editorial text-ivory-soft mb-4">{label}</p>
            {action && <button onClick={action.fn}
              className="px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
              {action.label}
            </button>}
          </>)}
    </div>
  </main>
);

export default BenevoleProfilePage;
