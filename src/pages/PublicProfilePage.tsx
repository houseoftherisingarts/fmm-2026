import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, MessageCircle, MapPin, BadgeCheck, Globe, Instagram, Crown, Sparkles, Calendar,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/AppContext';
import { addLocale } from '../lib/locale';
import { useCaravanPage } from '../lib/useCaravanPage';
import { type PublicProfile, getPublicProfile } from '../firebase/publicProfile';
import { mockGetPublicProfile } from '../firebase/mockCommunity';
import { listTeams, type Team } from '../firebase/teams';
import { mockListTeams } from '../firebase/mockApplications';
import SEO from '../components/SEO';
import Brume from '../components/Brume';

const SHOWCASE_IN_DEV = import.meta.env.DEV;

const PublicProfilePage: React.FC = () => {
  useCaravanPage();
  const { uid = '' } = useParams<{ uid: string }>();
  const { lang } = useUI();
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (async () => {
      let p: PublicProfile | null = null;
      if (uid.startsWith('mock-')) {
        p = await mockGetPublicProfile(uid);
      } else {
        try { p = await getPublicProfile(uid); }
        catch { /* offline */ }
        if (!p && SHOWCASE_IN_DEV) p = await mockGetPublicProfile(uid);
      }
      setProfile(p);
      if (p?.teamId) {
        let teams: Team[] = [];
        try { teams = await listTeams(); } catch { /* offline */ }
        // Only fall through to mock teams in development. Otherwise we
        // could surface mock team names on the live public profile page.
        if (teams.length === 0 && SHOWCASE_IN_DEV) teams = await mockListTeams();
        setTeam(teams.find((t) => t.id === p.teamId) || null);
      }
      setLoading(false);
    })();
  }, [uid]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent border-brass animate-spin" />
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen text-ivory flex items-center justify-center px-6">
        <div className="max-w-md text-center glass-light rounded-lg-card p-8">
          <h1 className="font-display title-medieval text-2xl text-ivory mb-3">
            {lang === 'FR' ? 'Profil introuvable' : 'Profile not found'}
          </h1>
          <Link to={addLocale('/communaute', lang)}
            className="px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card inline-block">
            {lang === 'FR' ? 'Retour à la communauté' : 'Back to community'}
          </Link>
        </div>
      </main>
    );
  }

  const isMe = user?.uid === uid;
  const init = (() => {
    const parts = profile.displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  return (
    <>
      <SEO title={`${profile.displayName} · ${lang === 'FR' ? 'Profil bénévole' : 'Volunteer profile'}`} />

      <div className="min-h-screen text-ivory">
        {/* Hero band */}
        <section className="relative pt-20 pb-12 md:pt-24 md:pb-16 overflow-hidden"
          style={{ background:
            `linear-gradient(135deg, hsl(${profile.avatarHue} 38% 22%), hsl(${(profile.avatarHue + 35) % 360} 30% 14%) 70%, var(--color-midnight-deep))` }}>
          <Brume />
          <div className="absolute inset-0 grain pointer-events-none opacity-50" />
          <div className="relative max-w-3xl mx-auto px-4 md:px-8">
            <Link to={addLocale('/communaute', lang)}
              className="inline-flex items-center gap-1.5 font-sans text-xs uppercase tracking-widest text-ivory-soft hover:text-brass transition mb-6">
              <ArrowLeft size={12} /> {lang === 'FR' ? 'Communauté' : 'Community'}
            </Link>
            <div className="flex flex-col md:flex-row gap-5 md:gap-7 items-start">
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-midnight-deep shadow-2xl flex items-center justify-center font-display title-medieval text-4xl shrink-0"
                style={{ backgroundColor: `hsl(${profile.avatarHue} 30% 18%)`, color: `hsl(${profile.avatarHue} 60% 70%)` }}>
                {init}
              </div>
              <div className="flex-1 min-w-0 pt-2">
                <h1 className="font-display title-medieval text-3xl md:text-5xl text-ivory leading-tight">{profile.displayName}</h1>
                {profile.pronouns && (
                  <p className="font-editorial italic text-sm text-ivory-soft mt-1">{profile.pronouns}</p>
                )}
                {profile.city && (
                  <p className="font-editorial italic text-sm text-ivory-soft mt-1 flex items-center gap-1.5">
                    <MapPin size={12} className="text-brass" /> {profile.city}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  {profile.flags?.includes('organizer') && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-card border border-brass/40 bg-brass/15 text-brass font-sans text-[10px] uppercase tracking-widest">
                      <Crown size={10} /> {lang === 'FR' ? 'Organisation' : 'Organizer'}
                    </span>
                  )}
                  {profile.teamRole === 'leader' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-card border border-brass/40 bg-brass/15 text-brass font-sans text-[10px] uppercase tracking-widest">
                      <Crown size={10} /> {lang === 'FR' ? 'Leader' : 'Lead'}
                    </span>
                  )}
                  {(profile.badges || []).map((b) => (
                    <span key={b}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-card border bg-ivory-soft/10 text-ivory-soft font-sans text-[10px] uppercase tracking-widest">
                      <BadgeCheck size={10} /> {b}
                    </span>
                  ))}
                </div>
                {!isMe && (
                  <div className="mt-5 flex items-center gap-2">
                    <Link to={addLocale(`/messages/${uid}`, lang)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
                      <MessageCircle size={12} /> {lang === 'FR' ? 'Envoyer un message' : 'Send message'}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-4 md:px-8 py-8 md:py-12 grid md:grid-cols-3 gap-5">
          <div className="md:col-span-2 space-y-5">
            {profile.bio ? (
              <div className="glass-light rounded-card p-5 md:p-6">
                <p className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Sparkles size={11} /> {lang === 'FR' ? 'Présentation' : 'About'}
                </p>
                <p className="font-editorial text-base text-ivory-soft leading-relaxed whitespace-pre-line">{profile.bio}</p>
              </div>
            ) : (
              <div className="glass-light rounded-card p-5 md:p-6 text-center text-ivory-soft/50">
                <p className="font-editorial italic text-sm">
                  {lang === 'FR'
                    ? `${profile.displayName} n'a pas encore rédigé de présentation.`
                    : `${profile.displayName} hasn't written an intro yet.`}
                </p>
              </div>
            )}
          </div>

          <aside className="space-y-5">
            {team && (
              <div className="rounded-card border p-5"
                style={{ borderColor: `${team.color || '#c9a05a'}55`, background: `${team.color || '#c9a05a'}10` }}>
                <p className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest mb-2">
                  {lang === 'FR' ? 'Équipe' : 'Team'}
                </p>
                <Link to={addLocale(`/communaute/equipe/${team.id}`, lang)} className="flex items-center gap-3 hover:opacity-90 transition">
                  <span className="text-2xl">{team.icon || '🏛️'}</span>
                  <div className="min-w-0">
                    <p className="font-display title-medieval text-base text-ivory">{team.name}</p>
                    <p className={`font-editorial italic text-xs ${profile.teamRole === 'leader' ? 'text-brass' : 'text-ivory-soft/70'}`}>
                      {profile.teamRole === 'leader'
                        ? (lang === 'FR' ? '★ Responsable' : '★ Lead')
                        : (lang === 'FR' ? 'Membre'        : 'Member')}
                    </p>
                  </div>
                </Link>
              </div>
            )}

            {(profile.pastYears && profile.pastYears.length > 0) || profile.hoursLogged != null ? (
              <div className="glass-light rounded-card p-5">
                <p className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Calendar size={11} /> {lang === 'FR' ? 'Historique' : 'History'}
                </p>
                {profile.pastYears && profile.pastYears.length > 0 && (
                  <p className="font-editorial text-sm text-ivory-soft mb-1">
                    {profile.pastYears.length} {lang === 'FR' ? 'édition(s)' : 'edition(s)'}
                    <span className="text-ivory-soft/60"> · {profile.pastYears.sort().join(' · ')}</span>
                  </p>
                )}
                {profile.hoursLogged != null && (
                  <p className="font-editorial text-sm text-ivory-soft">
                    {profile.hoursLogged} h {lang === 'FR' ? 'cumulées' : 'logged'}
                  </p>
                )}
              </div>
            ) : null}

            {profile.socials && (profile.socials.instagram || profile.socials.website) && (
              <div className="glass-light rounded-card p-5 space-y-2">
                <p className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest mb-1">
                  {lang === 'FR' ? 'En ligne' : 'Online'}
                </p>
                {profile.socials.instagram && (
                  <a href={`https://instagram.com/${profile.socials.instagram.replace(/^@/, '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-ivory-soft hover:text-brass transition">
                    <Instagram size={13} /> <span className="truncate">{profile.socials.instagram}</span>
                  </a>
                )}
                {profile.socials.website && (
                  <a href={profile.socials.website.startsWith('http') ? profile.socials.website : `https://${profile.socials.website}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-ivory-soft hover:text-brass transition">
                    <Globe size={13} /> <span className="truncate">{profile.socials.website}</span>
                  </a>
                )}
              </div>
            )}
          </aside>
        </section>
      </div>
    </>
  );
};

export default PublicProfilePage;
