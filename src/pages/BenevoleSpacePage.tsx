import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowUpRight, Calendar, MapPin, Phone, Shirt, Car,
  AlertTriangle, LogOut, Pencil, Sparkles, BadgeCheck, HandHeart, Languages,
  Heart, ListChecks, UsersRound, Crown,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/AppContext';
import { addLocale } from '../lib/locale';
import { useCaravanPage } from '../lib/useCaravanPage';
import {
  getBenevoleApp,
  type BenevoleApp,
} from '../firebase/applications';
import { mockGetBenevole, mockListTeams } from '../firebase/mockApplications';
import { listTeams, type Team } from '../firebase/teams';
import SEO from '../components/SEO';
import Brume from '../components/Brume';
import MessageThread from '../components/vendor/MessageThread';
import DocumentsShelf from '../components/benevole/DocumentsShelf';
import ApprovalDocs from '../components/benevole/ApprovalDocs';

// ─── Bénévole personal dashboard ───────────────────────────────────
// A *separate*, simplified post-acceptance space. Distinct from /admin:
// no CRM, no tasks, no role matrix — just the bénévole's own info,
// shifts, key contacts, and pickup/check-in instructions for the day.
//
// Gating: requires sign-in + bénévole app status === 'accepted'.
// Dev fallback: when running `vite dev` and the signed-in user has no
// bénévole record, surface Béné Vole's mock data with a "Démo" banner
// so the page is always demoable.

const SHOWCASE_IN_DEV = import.meta.env.DEV;
const DEMO_UID = 'mock-bene-vole';

const STATUS_LABEL = {
  pending:  { FR: 'En attente',   EN: 'Pending'  },
  accepted: { FR: 'Acceptée',     EN: 'Accepted' },
  rejected: { FR: 'Refusée',      EN: 'Declined' },
} as const;

const TRANSPORT_LABEL: Record<NonNullable<BenevoleApp['transport']>, string> = {
  voiture: 'Voiture personnelle',
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

const BenevoleSpacePage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const { user, loading, openSignIn, signOut } = useAuth();

  const [b, setB] = useState<BenevoleApp | null>(null);
  const [hydrating, setHydrating] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);

  // Hydrate team list once — we just need to render the bénévole's team.
  // Mock teams only merge in development; production stays clean.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let live: Team[] = [];
      try { live = await listTeams(); } catch { /* offline */ }
      if (!SHOWCASE_IN_DEV) {
        if (!cancelled) setTeams(live);
        return;
      }
      const mocks = await mockListTeams();
      const seen = new Set(live.map((t) => t.id));
      if (!cancelled) setTeams([...mocks.filter((t) => !seen.has(t.id)), ...live]);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user) { setHydrating(false); return; }
    setHydrating(true);
    getBenevoleApp(user.uid)
      .then(async (rec) => {
        if (rec) { setB(rec); setIsDemo(false); }
        else if (SHOWCASE_IN_DEV) {
          const demo = await mockGetBenevole(DEMO_UID);
          if (demo) { setB(demo); setIsDemo(true); }
        }
      })
      .catch(async (e) => {
        console.warn('[espace bénévole] live fetch failed', e);
        if (SHOWCASE_IN_DEV) {
          const demo = await mockGetBenevole(DEMO_UID);
          if (demo) { setB(demo); setIsDemo(true); }
        }
      })
      .finally(() => setHydrating(false));
  }, [user]);

  // ─── Gates ──────────────────────────────────────────────────────
  if (loading) return <FullPageStub spinner />;

  if (!user) {
    return (
      <FullPageStub
        title={lang === 'FR' ? 'Espace bénévole' : 'Volunteer space'}
        body={lang === 'FR'
          ? 'Connectez-vous pour accéder à votre tableau de bord bénévole.'
          : 'Sign in to access your volunteer dashboard.'}
        primary={{ label: lang === 'FR' ? 'Se connecter' : 'Sign in', fn: openSignIn }}
        secondary={{ label: lang === 'FR' ? 'Retour' : 'Back', to: addLocale('/benevole', lang) }}
      />
    );
  }

  if (hydrating) return <FullPageStub spinner />;

  if (!b) {
    return (
      <FullPageStub
        title={lang === 'FR' ? 'Aucune candidature trouvée' : 'No application found'}
        body={lang === 'FR'
          ? "Nous n'avons pas trouvé de candidature de bénévole liée à votre compte. Soumettez-en une pour rejoindre l'équipe."
          : "We couldn't find a volunteer application linked to your account. Submit one to join the team."}
        primary={{ label: lang === 'FR' ? 'Postuler' : 'Apply', to: addLocale('/benevole', lang) }}
        secondary={{ label: lang === 'FR' ? 'Déconnexion' : 'Sign out', fn: signOut }}
      />
    );
  }

  if (b.status === 'pending') {
    return (
      <FullPageStub
        title={lang === 'FR' ? 'Candidature en attente' : 'Application pending'}
        body={lang === 'FR'
          ? 'Votre candidature a bien été reçue. L’équipe Bénévoles vous contactera bientôt. Le tableau de bord s’ouvrira dès l’acceptation.'
          : 'Your application has been received. The volunteer team will reach out soon. The dashboard unlocks once accepted.'}
        primary={{ label: lang === 'FR' ? 'Modifier ma candidature' : 'Edit my application', to: addLocale('/benevole', lang) }}
        secondary={{ label: lang === 'FR' ? 'Déconnexion' : 'Sign out', fn: signOut }}
      />
    );
  }

  if (b.status === 'rejected') {
    return (
      <FullPageStub
        title={lang === 'FR' ? 'Candidature non retenue' : 'Application not retained'}
        body={lang === 'FR'
          ? "Pour cette édition, votre candidature n'a pas été retenue. Merci pour l'intérêt — n'hésitez pas à postuler de nouveau l'an prochain."
          : "For this edition, your application was not retained. Thanks for your interest — feel free to apply again next year."}
        primary={{ label: lang === 'FR' ? 'Retour' : 'Back', to: addLocale('/', lang) }}
        secondary={{ label: lang === 'FR' ? 'Déconnexion' : 'Sign out', fn: signOut }}
      />
    );
  }

  // ─── Accepted dashboard ─────────────────────────────────────────
  const fullName = `${b.prenom || ''} ${b.nom || ''}`.trim() || b.displayName;
  const hue = hueFor(fullName);
  const totalHours = (b.assignedShifts || []).reduce((s, sh) => {
    const [h1, m1] = sh.start.split(':').map(Number);
    const [h2, m2] = sh.end.split(':').map(Number);
    return s + Math.max(0, (h2 + (m2 || 0) / 60) - (h1 + (m1 || 0) / 60));
  }, 0);
  const stations = Array.from(new Set((b.assignedShifts || []).map((s) => s.station)));
  const nextShift = (b.assignedShifts || [])[0];

  return (
    <>
      <SEO title={lang === 'FR' ? `Espace bénévole · ${fullName}` : `Volunteer space · ${fullName}`} />

      {/* Hero band */}
      <section className="relative pt-28 pb-10 md:pt-32 md:pb-14 overflow-hidden text-ivory"
        style={{ background:
          `linear-gradient(135deg, hsl(${hue} 38% 22%), hsl(${(hue + 35) % 360} 30% 14%) 70%, var(--color-midnight-deep))` }}>
        <Brume />
        <div className="absolute inset-0 grain pointer-events-none" />
        <div className="relative max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <Link to={addLocale('/', lang)} className="inline-flex items-center gap-2 font-sans text-xs uppercase tracking-widest text-ivory-soft hover:text-brass transition">
              <ArrowLeft size={14} /> {lang === 'FR' ? 'Site' : 'Site'}
            </Link>
            <button onClick={signOut} className="inline-flex items-center gap-1.5 font-sans text-xs uppercase tracking-widest text-ivory-soft hover:text-blush transition">
              <LogOut size={12} /> {lang === 'FR' ? 'Déconnexion' : 'Sign out'}
            </button>
          </div>

          {isDemo && (
            <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-card border border-brass/40 bg-brass/10 text-brass font-sans text-[11px] uppercase tracking-widest">
              <Sparkles size={12} /> {lang === 'FR' ? 'Aperçu démo (Béné Vole)' : 'Demo preview (Béné Vole)'}
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-5 md:gap-7 items-start">
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-midnight-deep shadow-2xl flex items-center justify-center font-display title-medieval text-3xl"
              style={{ backgroundColor: `hsl(${hue} 30% 18%)`, color: `hsl(${hue} 60% 70%)` }}>
              {initials(fullName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px] mb-1">
                {lang === 'FR' ? 'Espace bénévole' : 'Volunteer space'} · FMM 2026
              </p>
              <h1 className="font-display title-medieval text-3xl md:text-5xl text-ivory leading-tight">
                {lang === 'FR' ? `Bienvenue, ${b.prenom || fullName}` : `Welcome, ${b.prenom || fullName}`}
              </h1>
              <p className="font-editorial italic text-ivory-soft mt-2 leading-relaxed">
                {lang === 'FR'
                  ? `Édition 2026 · 25-27 septembre · ${stations.length || '—'} ${stations.length > 1 ? 'stations' : 'station'} attribuée${stations.length > 1 ? 's' : ''}`
                  : `2026 edition · September 25-27 · ${stations.length || '—'} station${stations.length > 1 ? 's' : ''} assigned`}
              </p>

              <div className="flex items-center flex-wrap gap-1.5 mt-4">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-card border border-emerald-400/40 bg-emerald-400/10 text-emerald-300 font-sans text-[10px] uppercase tracking-widest">
                  <BadgeCheck size={10} /> {lang === 'FR' ? STATUS_LABEL[b.status].FR : STATUS_LABEL[b.status].EN}
                </span>
                {b.status === 'accepted' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-card border border-brass/50 bg-brass/15 text-brass font-display title-medieval text-[10px] uppercase tracking-widest">
                    <Sparkles size={10} /> {lang === 'FR' ? 'Approuvé·e — bienvenue !' : 'Approved — welcome!'}
                  </span>
                )}
                {(b.badges || []).map((label) => (
                  <span key={label}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-card border border-brass/40 bg-brass/10 text-brass font-sans text-[10px] uppercase tracking-widest">
                    <BadgeCheck size={10} /> {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8 py-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat
            label={lang === 'FR' ? 'Prochain quart' : 'Next shift'}
            value={nextShift ? nextShift.day.replace(/^.{0,5}/, '') || nextShift.day : (lang === 'FR' ? 'Aucun' : 'None')}
            sub={nextShift ? `${nextShift.start}–${nextShift.end} · ${nextShift.station}` : undefined}
          />
          <Stat
            label={lang === 'FR' ? 'Heures prévues' : 'Hours scheduled'}
            value={`${totalHours.toFixed(0)} h`}
            sub={(b.assignedShifts || []).length + (lang === 'FR' ? ' quart(s)' : ' shift(s)')}
          />
          <Stat
            label={lang === 'FR' ? 'Stations' : 'Stations'}
            value={String(stations.length || 0)}
            sub={stations.slice(0, 2).join(', ') || undefined}
          />
          <Stat
            label={lang === 'FR' ? 'Heures cumulées' : 'Total hours'}
            value={`${b.hoursLogged ?? 0} h`}
            sub={(b.pastYears && b.pastYears.length > 0)
              ? `${b.pastYears.length} ${lang === 'FR' ? 'éditions' : 'editions'}`
              : (lang === 'FR' ? '1ère édition' : '1st edition')}
          />
        </div>
      </section>

      {/* Main */}
      <section className="py-10 md:py-14">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8 grid lg:grid-cols-12 gap-6">
          {/* Left — schedule + practical info */}
          <div className="lg:col-span-8 space-y-5">

            {/* Documents à signer (post-acceptance) */}
            <Card className="border border-emerald-400/25 bg-emerald-500/[0.04]">
              <ApprovalDocs b={b} isDemo={isDemo} lang={lang} onChanged={(next) => setB(next)} />
            </Card>

            {/* Communauté CTA */}
            <Card>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="font-display title-medieval text-[10px] uppercase tracking-widest text-brass mb-1">
                    {lang === 'FR' ? 'Espace communauté' : 'Community space'}
                  </p>
                  <p className="font-editorial text-sm text-ivory-soft">
                    {lang === 'FR'
                      ? 'Rejoignez le mur des bénévoles : annonces, covoiturage, canaux d’équipe et messages directs.'
                      : 'Join the volunteer wall: announcements, rideshares, team channels, direct messages.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link to={addLocale('/communaute', lang)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
                    {lang === 'FR' ? 'Ouvrir' : 'Open'} <ArrowUpRight size={12} />
                  </Link>
                  <Link to={addLocale('/messages', lang)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 border border-brass text-brass hover:bg-brass hover:text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card">
                    {lang === 'FR' ? 'Messages' : 'Messages'}
                  </Link>
                </div>
              </div>
            </Card>

            {/* Schedule */}
            <Card>
              <SectionTitle icon={Calendar}>
                {lang === 'FR' ? 'Mes quarts' : 'My shifts'}
              </SectionTitle>
              {(b.assignedShifts && b.assignedShifts.length > 0) ? (
                <ol className="space-y-2">
                  {b.assignedShifts.map((s, i) => (
                    <li key={i} className="grid grid-cols-12 items-center gap-3 px-4 py-3 rounded-card border bg-ivory-soft/5">
                      <span className="col-span-12 sm:col-span-5 font-display title-medieval text-sm md:text-base text-ivory">{s.day}</span>
                      <span className="col-span-6 sm:col-span-3 font-sans text-sm text-ivory-soft tabular-nums">{s.start}–{s.end}</span>
                      <span className="col-span-6 sm:col-span-4 font-sans text-xs text-brass uppercase tracking-widest sm:text-right">
                        <MapPin size={11} className="inline mr-1" />{s.station}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="font-editorial italic text-ivory-soft/60">
                  {lang === 'FR'
                    ? 'Vos quarts seront attribués prochainement par l’équipe Bénévoles.'
                    : 'Your shifts will be assigned shortly by the volunteer team.'}
                </p>
              )}
            </Card>

            {/* Documents importants — programmation, carte, contacts, rôles */}
            <Card>
              <DocumentsShelf lang={lang} />
            </Card>

            {/* Practical info */}
            <Card>
              <SectionTitle icon={ListChecks}>
                {lang === 'FR' ? 'Infos pratiques' : 'Practical info'}
              </SectionTitle>
              <ul className="space-y-2.5 font-sans text-sm text-ivory-soft leading-relaxed">
                <Li icon="📍">{lang === 'FR'
                  ? 'Point de ralliement bénévole : tente Maïté, près de l’entrée principale, ouverte dès le jeudi 16h.'
                  : 'Volunteer rally point: Maïté tent, near the main entrance, open from Thursday 4pm.'}</Li>
                <Li icon="🅿️">{lang === 'FR'
                  ? 'Stationnement bénévoles : entrée latérale, signalez-vous au Lead Parking (Clément).'
                  : 'Volunteer parking: side entrance, check in with Lead Parking (Clément).'}</Li>
                <Li icon="👕">{lang === 'FR'
                  ? `T-shirt FMM (taille ${b.tShirtSize || 'à confirmer'}) à récupérer au point de ralliement.`
                  : `FMM t-shirt (size ${b.tShirtSize || 'to confirm'}) to pick up at the rally point.`}</Li>
                <Li icon="🍲">{lang === 'FR'
                  ? 'Repas bénévoles : trois repas chauds par jour à la cantine équipe (10h, 14h, 19h).'
                  : 'Volunteer meals: three hot meals per day at the team canteen (10am, 2pm, 7pm).'}</Li>
                <Li icon="🎟️">{lang === 'FR'
                  ? 'Vos invitations gratuites pour proches sont disponibles via le lien envoyé par courriel.'
                  : 'Your free guest passes are available via the link emailed to you.'}</Li>
              </ul>
            </Card>

            {/* Messagerie avec Maïté / FMM */}
            <Card>
              <MessageThread
                vendorUid={user.uid}
                threadKind="benevole"
                currentUid={user.uid}
                currentName={user.displayName || `${b.prenom} ${b.nom}`.trim() || 'Bénévole'}
                currentRole="benevole"
                lang={lang}
                title={lang === 'FR' ? 'Messages avec l’équipe FMM' : 'Messages with the FMM team'}
              />
            </Card>

            {/* Update application */}
            <Card>
              <SectionTitle icon={Pencil}>
                {lang === 'FR' ? 'Ma candidature' : 'My application'}
              </SectionTitle>
              <p className="font-editorial italic text-sm text-ivory-soft mb-3">
                {lang === 'FR'
                  ? 'Vous pouvez mettre à jour vos coordonnées ou disponibilités à tout moment.'
                  : 'You can update your contact details or availability at any time.'}
              </p>
              <Link to={addLocale('/benevole', lang)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-brass text-brass hover:bg-brass hover:text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card">
                {lang === 'FR' ? 'Modifier' : 'Edit'} <ArrowUpRight size={12} />
              </Link>
            </Card>
          </div>

          {/* Right — me + contacts */}
          <aside className="lg:col-span-4 space-y-5">
            <Card>
              <SectionTitle icon={Sparkles} dense>
                {lang === 'FR' ? 'Mon profil' : 'My profile'}
              </SectionTitle>
              <dl className="space-y-2 text-sm">
                <Row label={lang === 'FR' ? 'Courriel' : 'Email'}><a href={`mailto:${b.email}`} className="text-ivory hover:text-brass transition">{b.email}</a></Row>
                {b.telephone && <Row label={lang === 'FR' ? 'Téléphone' : 'Phone'} icon={Phone}><a href={`tel:${b.telephone.replace(/[^\d+]/g, '')}`} className="text-ivory hover:text-brass transition">{b.telephone}</a></Row>}
                {b.city && <Row label={lang === 'FR' ? 'Ville' : 'City'} icon={MapPin}>{b.city}</Row>}
                {b.languages && b.languages.length > 0 && (
                  <Row label={lang === 'FR' ? 'Langues' : 'Languages'} icon={Languages}>
                    {b.languages.map((l) => LANG_LABEL[l]).join(', ')}
                  </Row>
                )}
                {b.tShirtSize && <Row label="T-shirt" icon={Shirt}>{b.tShirtSize}</Row>}
                {b.transport && <Row label="Transport" icon={Car}>{TRANSPORT_LABEL[b.transport]}</Row>}
                {b.dietaryNotes && <Row label={lang === 'FR' ? 'Diète' : 'Dietary'} icon={Heart}>{b.dietaryNotes}</Row>}
                {b.allergies && b.allergies.toLowerCase() !== 'aucune' && b.allergies.toLowerCase() !== 'aucune connue' && (
                  <Row label="Allergies" icon={AlertTriangle}><span className="text-blush">{b.allergies}</span></Row>
                )}
              </dl>
            </Card>

            {b.teamId && (() => {
              const team = teams.find((t) => t.id === b.teamId);
              if (!team) return null;
              return (
                <Card className="border" style={team.color ? { borderColor: `${team.color}55`, background: `${team.color}10` } : undefined}>
                  <SectionTitle icon={UsersRound} dense>
                    {lang === 'FR' ? 'Mon équipe' : 'My team'}
                  </SectionTitle>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{team.icon || '🏛️'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display title-medieval text-base text-ivory truncate">{team.name}</p>
                      {b.teamRole === 'leader' ? (
                        <p className="font-editorial italic text-xs text-brass flex items-center gap-1">
                          <Crown size={11} /> {lang === 'FR' ? 'Responsable de station' : 'Station lead'}
                        </p>
                      ) : (
                        <p className="font-editorial italic text-xs text-ivory-soft/70">
                          {lang === 'FR' ? 'Membre' : 'Member'}
                        </p>
                      )}
                    </div>
                  </div>
                  {team.description && (
                    <p className="font-editorial text-xs text-ivory-soft/70 mt-3 leading-relaxed">{team.description}</p>
                  )}
                </Card>
              );
            })()}

            <Card>
              <SectionTitle icon={HandHeart} dense>
                {lang === 'FR' ? 'Contacts importants' : 'Key contacts'}
              </SectionTitle>
              <ul className="space-y-3 text-sm">
                <Contact name="Maïté"  role="Master Bénévole"   phone="438-555-0907" />
                <Contact name="Tristan" role="Coordo Général"     phone="514-555-0142" />
                <Contact name="Lead Sécurité" role="Sur place"  phone="911 / interne" tone="blush" />
              </ul>
            </Card>

            {b.emergencyContact && (
              <Card className="border border-blush/25 bg-blush/5">
                <SectionTitle icon={AlertTriangle} dense>
                  {lang === 'FR' ? 'Contact d’urgence' : 'Emergency contact'}
                </SectionTitle>
                <p className="font-sans text-sm text-ivory">{b.emergencyContact.name}</p>
                {b.emergencyContact.relation && <p className="font-editorial italic text-xs text-ivory-soft/70 mt-0.5">{b.emergencyContact.relation}</p>}
                <a href={`tel:${b.emergencyContact.phone.replace(/[^\d+]/g, '')}`}
                  className="inline-flex items-center gap-1.5 mt-1.5 text-blush text-sm font-sans hover:underline">
                  <Phone size={12} /> {b.emergencyContact.phone}
                </a>
              </Card>
            )}

            {/* Visual padding */}
            <div className="text-center pt-2">
              <Link to={addLocale('/compte', lang)} className="font-editorial italic text-xs text-ivory-soft/60 hover:text-brass transition">
                {lang === 'FR' ? 'Voir mon compte complet →' : 'View my full account →'}
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
};

// ─── Tiny helpers ──────────────────────────────────────────────────
const Card: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({ children, className = '', style }) => (
  <div className={`glass-light rounded-card p-5 md:p-6 ${className}`} style={style}>{children}</div>
);

const SectionTitle: React.FC<{ icon: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode; dense?: boolean }> = ({ icon: Icon, children, dense }) => (
  <div className={`flex items-center gap-2 ${dense ? 'mb-2.5' : 'mb-3.5'}`}>
    <Icon size={13} className="text-brass" />
    <p className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest">{children}</p>
  </div>
);

const Li: React.FC<{ icon?: string; children: React.ReactNode }> = ({ icon, children }) => (
  <li className="flex items-start gap-2.5">
    {icon && <span aria-hidden className="text-base leading-tight shrink-0 mt-0.5">{icon}</span>}
    <span>{children}</span>
  </li>
);

const Stat: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
  <div>
    <p className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest">{label}</p>
    <p className="font-display title-medieval text-xl text-ivory mt-1 leading-tight">{value}</p>
    {sub && <p className="font-editorial italic text-[11px] text-ivory-soft/60 mt-0.5 truncate">{sub}</p>}
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

const Contact: React.FC<{ name: string; role: string; phone: string; tone?: 'brass' | 'blush' }> = ({ name, role, phone, tone = 'brass' }) => (
  <li className="flex items-start justify-between gap-2">
    <div className="min-w-0">
      <p className="font-display title-medieval text-sm text-ivory truncate">{name}</p>
      <p className="font-editorial italic text-[11px] text-ivory-soft/70">{role}</p>
    </div>
    <a href={`tel:${phone.replace(/[^\d+]/g, '')}`}
      className={`inline-flex items-center gap-1 font-sans text-xs ${tone === 'blush' ? 'text-blush' : 'text-brass'} hover:underline shrink-0`}>
      <Phone size={11} /> {phone}
    </a>
  </li>
);

// ─── Full-page stub for gates / empty states ──────────────────────
const FullPageStub: React.FC<{
  spinner?: boolean;
  title?: string;
  body?: string;
  primary?: { label: string; fn?: () => void; to?: string };
  secondary?: { label: string; fn?: () => void; to?: string };
}> = ({ spinner, title, body, primary, secondary }) => (
  <main className="min-h-screen text-ivory flex items-center justify-center px-6 py-20">
    {spinner ? (
      <div className="w-10 h-10 rounded-full border-2 border-t-transparent border-brass animate-spin" />
    ) : (
      <div className="w-full max-w-md text-center glass-light rounded-lg-card p-8 md:p-10">
        <div className="w-14 h-14 rounded-full bg-brass/15 border border-brass/40 flex items-center justify-center mx-auto mb-5">
          <HandHeart size={26} className="text-brass" />
        </div>
        {title && <h1 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-3">{title}</h1>}
        {body && <p className="font-editorial text-base text-ivory-soft mb-6 leading-relaxed">{body}</p>}
        <div className="flex flex-col sm:flex-row gap-2 items-center justify-center">
          {primary && (
            primary.to
              ? <Link to={primary.to} className="px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">{primary.label}</Link>
              : <button onClick={primary.fn} className="px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">{primary.label}</button>
          )}
          {secondary && (
            secondary.to
              ? <Link to={secondary.to} className="px-5 py-2.5 border text-ivory-soft hover:border-brass hover:text-brass font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card">{secondary.label}</Link>
              : <button onClick={secondary.fn} className="px-5 py-2.5 border text-ivory-soft hover:border-brass hover:text-brass font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card">{secondary.label}</button>
          )}
        </div>
      </div>
    )}
  </main>
);

export default BenevoleSpacePage;
