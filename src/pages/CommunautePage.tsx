import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Send, Heart, MessageCircle, Trash2, Pin, Users, Car, Megaphone,
  MapPin, Clock, Plus, Sparkles, Hash, ChevronRight, MessagesSquare,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/AppContext';
import { addLocale } from '../lib/locale';
import { useCaravanPage } from '../lib/useCaravanPage';
import {
  type Post, type Comment, type ChannelId, type RideshareMeta, type PostKind,
  subscribeChannelFeed, createPost, deletePost,
  subscribeComments, addComment, setReaction, getMyReaction,
  toggleRideshareSubscription, teamChannelId,
} from '../firebase/community';
import {
  mockListChannelPosts, mockCreatePost, mockDeletePost,
  mockListComments, mockAddComment,
  mockSetReaction, mockGetReaction, mockToggleRideshareSub,
} from '../firebase/mockCommunity';
import { listTeams, type Team } from '../firebase/teams';
import { mockListTeams } from '../firebase/mockApplications';
import { getBenevoleApp, type BenevoleApp } from '../firebase/applications';
import { mockGetBenevole } from '../firebase/mockApplications';
import { hueFor } from '../firebase/publicProfile';
import SEO from '../components/SEO';

// ─── Bénévole community wall ───────────────────────────────────────
// One page, multiple channels. Open channel for everyone, plus a
// subspace per team. Every accepted bénévole + admin can post,
// comment, react, and offer/subscribe to rideshares.

const SHOWCASE_IN_DEV = import.meta.env.DEV;
const DEMO_UID = 'mock-bene-vole';

const CommunautePage: React.FC = () => {
  useCaravanPage();
  const { teamId } = useParams<{ teamId?: string }>();
  const navigate = useNavigate();
  const { user, loading, isAdmin, openSignIn, signOut } = useAuth();
  const { lang } = useUI();

  const [b, setB] = useState<BenevoleApp | null>(null);
  const [hydrating, setHydrating] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  // ── Resolve current channel ──
  const channelId: ChannelId = teamId ? teamChannelId(teamId) : 'open';
  const currentTeam = teamId ? teams.find((t) => t.id === teamId) : null;

  // ── Hydrate user's benevole record + teams (for sidebar + auth gating) ──
  useEffect(() => {
    if (!user) { setHydrating(false); return; }
    setHydrating(true);
    (async () => {
      try {
        const rec = await getBenevoleApp(user.uid);
        if (rec) { setB(rec); setIsDemo(false); }
        else if (SHOWCASE_IN_DEV) {
          const demo = await mockGetBenevole(DEMO_UID);
          if (demo) { setB(demo); setIsDemo(true); }
        }
      } catch {
        if (SHOWCASE_IN_DEV) {
          const demo = await mockGetBenevole(DEMO_UID);
          if (demo) { setB(demo); setIsDemo(true); }
        }
      } finally {
        setHydrating(false);
      }
    })();
  }, [user]);

  // ── Hydrate teams ──
  // Mock teams only get spliced in development so the showcase profiles
  // have somewhere to belong; production never merges mock data into
  // the rendered list.
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

  // ── Subscribe / load channel feed ──
  useEffect(() => {
    setPostsLoading(true);
    let unsub: (() => void) | null = null;
    if (isDemo || !user) {
      mockListChannelPosts(channelId).then((p) => {
        setPosts(p);
        setPostsLoading(false);
      });
    } else {
      unsub = subscribeChannelFeed(channelId, (p) => {
        // Merge with mock seed in dev so the UI is alive even when Firestore is empty.
        if (SHOWCASE_IN_DEV) {
          mockListChannelPosts(channelId).then((mocks) => {
            const seen = new Set(p.map((x) => x.id));
            const merged = [...p, ...mocks.filter((m) => !seen.has(m.id))];
            merged.sort((a, b) => ((b.createdAt as any)?.seconds || 0) - ((a.createdAt as any)?.seconds || 0));
            setPosts(merged);
            setPostsLoading(false);
          });
        } else {
          setPosts(p);
          setPostsLoading(false);
        }
      });
    }
    return () => { if (unsub) unsub(); };
  }, [channelId, user, isDemo]);

  // ── Gates ──
  if (loading || hydrating) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent border-brass animate-spin" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen text-ivory flex items-center justify-center px-6">
        <div className="max-w-md text-center glass-light rounded-lg-card p-8">
          <h1 className="font-display title-medieval text-2xl text-ivory mb-3">
            {lang === 'FR' ? 'Espace communauté' : 'Community space'}
          </h1>
          <p className="font-editorial text-ivory-soft mb-6">
            {lang === 'FR'
              ? 'Connectez-vous pour rejoindre la communauté bénévole.'
              : 'Sign in to join the volunteer community.'}
          </p>
          <button onClick={openSignIn}
            className="px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
            {lang === 'FR' ? 'Se connecter' : 'Sign in'}
          </button>
        </div>
      </main>
    );
  }

  // Must be accepted bénévole or admin to enter the space.
  if (!isAdmin && !isDemo && (!b || b.status !== 'accepted')) {
    return (
      <main className="min-h-screen text-ivory flex items-center justify-center px-6">
        <div className="max-w-md text-center glass-light rounded-lg-card p-8">
          <h1 className="font-display title-medieval text-2xl text-ivory mb-3">
            {lang === 'FR' ? 'Accès réservé' : 'Members only'}
          </h1>
          <p className="font-editorial text-ivory-soft mb-6">
            {lang === 'FR'
              ? "L'espace communauté est réservé aux bénévoles confirmé·es. Votre candidature doit être acceptée."
              : 'The community space is for confirmed volunteers only. Your application must be accepted.'}
          </p>
          <Link to={addLocale('/espace-benevole', lang)}
            className="px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card inline-block">
            {lang === 'FR' ? 'Mon espace' : 'My space'}
          </Link>
        </div>
      </main>
    );
  }

  // The "me" identity used when posting / commenting.
  const meUid  = user.uid;
  const meName = user.displayName || (b ? `${b.prenom} ${b.nom}`.trim() : null) || user.email || 'Anonyme';
  const meHue  = hueFor(meName);
  const meIsDemo = isDemo;

  // ── Channel sidebar items ──
  const channels: { id: ChannelId; label: string; icon: React.ReactNode; tone: string; routeTo: string }[] = useMemo(() => {
    const out = [{
      id: 'open' as ChannelId,
      label: lang === 'FR' ? 'Place du village (ouvert)' : 'Village square (open)',
      icon: <Hash size={13} />,
      tone: '#c9a05a',
      routeTo: addLocale('/communaute', lang),
    }];
    for (const t of teams) {
      out.push({
        id: teamChannelId(t.id),
        label: `${t.icon || '🏛️'} ${t.name}`,
        icon: <Users size={13} />,
        tone: t.color || '#c9a05a',
        routeTo: addLocale(`/communaute/equipe/${t.id}`, lang),
      });
    }
    return out;
  }, [teams, lang]);

  return (
    <>
      <SEO title={lang === 'FR' ? 'Espace communauté' : 'Community space'} />

      <div className="min-h-screen text-ivory pt-20 pb-16">
        <div className="max-w-screen-2xl mx-auto px-3 md:px-6">

          {/* Top bar */}
          <div className="flex items-center justify-between gap-4 mb-5">
            <Link to={addLocale('/espace-benevole', lang)}
              className="inline-flex items-center gap-1.5 font-sans text-xs uppercase tracking-widest text-ivory-soft hover:text-brass transition">
              <ArrowLeft size={12} /> {lang === 'FR' ? 'Mon espace' : 'My space'}
            </Link>
            <div className="flex items-center gap-3">
              <Link to={addLocale('/messages', lang)}
                className="inline-flex items-center gap-1.5 font-sans text-xs uppercase tracking-widest text-ivory-soft hover:text-brass transition">
                <MessagesSquare size={13} /> {lang === 'FR' ? 'Messages' : 'Messages'}
              </Link>
              <button onClick={signOut}
                className="font-sans text-[11px] uppercase tracking-widest text-ivory-soft hover:text-blush transition">
                {lang === 'FR' ? 'Déconnexion' : 'Sign out'}
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-5">

            {/* ── Channel sidebar ── */}
            <aside className="lg:col-span-3">
              <div className="lg:sticky lg:top-24 space-y-2">
                <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px] mb-2 px-3">
                  {lang === 'FR' ? 'Canaux' : 'Channels'}
                </p>
                <div className="border rounded-card p-1.5 space-y-0.5">
                  {channels.map((c) => {
                    const active = c.id === channelId;
                    return (
                      <button key={c.id}
                        onClick={() => navigate(c.routeTo)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-card text-left transition ${
                          active ? 'bg-brass/15 border-l-2 border-brass' : 'hover:bg-ivory-soft/5'
                        }`}
                      >
                        <span className="shrink-0" style={{ color: active ? c.tone : 'var(--color-ivory-soft)' }}>{c.icon}</span>
                        <span className={`flex-1 truncate font-sans text-xs ${active ? 'text-ivory' : 'text-ivory-soft'}`}>
                          {c.label}
                        </span>
                        <ChevronRight size={11} className={`shrink-0 transition ${active ? 'text-brass opacity-100' : 'text-ivory-soft/30 opacity-60'}`} />
                      </button>
                    );
                  })}
                </div>

                <div className="px-3 pt-3">
                  <p className="font-editorial italic text-[10px] text-ivory-soft/60 leading-relaxed">
                    {lang === 'FR'
                      ? 'Chaque équipe a son propre canal pour coordonner. Le canal Place du village est ouvert à tout le monde.'
                      : 'Each team has its own channel for coordination. The Village square channel is open to everyone.'}
                  </p>
                </div>
              </div>
            </aside>

            {/* ── Feed ── */}
            <div className="lg:col-span-6">

              {/* Channel header */}
              <header className="rounded-card border p-5 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-card flex items-center justify-center text-xl"
                    style={{ background: `${currentTeam?.color || '#c9a05a'}22`, border: `1px solid ${currentTeam?.color || '#c9a05a'}55` }}>
                    {currentTeam?.icon || '🏛️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px]">
                      {currentTeam ? (lang === 'FR' ? 'Canal d\'équipe' : 'Team channel') : (lang === 'FR' ? 'Canal ouvert' : 'Open channel')}
                    </p>
                    <h1 className="font-display title-medieval text-xl md:text-2xl text-ivory truncate">
                      {currentTeam ? currentTeam.name : (lang === 'FR' ? 'Place du village' : 'Village square')}
                    </h1>
                    {currentTeam?.description && (
                      <p className="font-editorial italic text-xs text-ivory-soft/60 mt-1 truncate">{currentTeam.description}</p>
                    )}
                  </div>
                </div>
              </header>

              {/* Composer */}
              <Composer
                channelId={channelId}
                isOpenChannel={!currentTeam}
                meUid={meUid}
                meName={meName}
                meHue={meHue}
                meIsDemo={meIsDemo}
                lang={lang}
                onPosted={() => { /* realtime listener handles refresh; mock path triggers re-fetch below */
                  if (meIsDemo) mockListChannelPosts(channelId).then(setPosts);
                }}
              />

              {/* Feed */}
              {postsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-brass animate-spin" />
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-16 text-ivory-soft/60">
                  <Megaphone size={32} className="mx-auto mb-3 opacity-50" />
                  <p className="font-editorial italic text-sm">
                    {lang === 'FR' ? 'Pas encore de publications dans ce canal. Soyez les premier·es !' : 'No posts yet in this channel. Be the first!'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {posts.map((p) => (
                      <PostCard key={p.id} post={p} meUid={meUid} meName={meName} isDemo={meIsDemo}
                        canDelete={p.authorUid === meUid || isAdmin} lang={lang}
                        onChanged={() => { if (meIsDemo) mockListChannelPosts(channelId).then(setPosts); }}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* ── Right rail: who's around ── */}
            <aside className="lg:col-span-3 space-y-3">
              <RightRail teams={teams} currentTeamId={teamId} lang={lang} />
            </aside>
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Composer ──────────────────────────────────────────────────────
const Composer: React.FC<{
  channelId: ChannelId;
  isOpenChannel: boolean;
  meUid: string;
  meName: string;
  meHue: number;
  meIsDemo: boolean;
  lang: 'FR' | 'EN';
  onPosted: () => void;
}> = ({ channelId, isOpenChannel, meUid, meName, meHue, meIsDemo, lang, onPosted }) => {
  const [kind, setKind] = useState<PostKind>('post');
  const [body, setBody] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo]     = useState('');
  const [when, setWhen] = useState('');
  const [seats, setSeats] = useState('');
  const [busy, setBusy] = useState(false);

  const isRideshare = kind === 'rideshare-offer' || kind === 'rideshare-request';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() && !isRideshare) return;
    if (isRideshare && !from.trim() && !to.trim()) return;
    setBusy(true);
    const meta: RideshareMeta | undefined = isRideshare ? {
      from: from.trim() || undefined,
      to:   to.trim()   || undefined,
      when: when.trim() || undefined,
      seats: seats ? Number(seats) : undefined,
      direction: kind === 'rideshare-offer' ? 'aller' : undefined,
    } : undefined;
    const payload = {
      channel: channelId,
      kind,
      authorUid:  meUid,
      authorName: meName,
      authorAvatarHue: meHue,
      body: body.trim(),
      meta,
    };
    try {
      if (meIsDemo) await mockCreatePost(payload);
      else          await createPost(payload);
      setBody(''); setFrom(''); setTo(''); setWhen(''); setSeats('');
      onPosted();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-card border p-4 mb-4">
      {/* Kind picker */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {([
          ['post',               lang === 'FR' ? 'Publication' : 'Post',           Plus],
          ['rideshare-offer',    lang === 'FR' ? 'J\'offre un trajet' : 'Offer a ride', Car],
          ['rideshare-request',  lang === 'FR' ? 'Je cherche un trajet' : 'Need a ride', Car],
          ...(isOpenChannel ? [['announcement', lang === 'FR' ? 'Annonce' : 'Announcement', Megaphone] as const] : []),
        ] as const).map(([k, label, Icon]) => (
          <button key={k} type="button" onClick={() => setKind(k)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-card text-[10px] uppercase tracking-widest font-sans font-semibold transition ${
              kind === k ? 'bg-brass text-midnight-deep' : 'text-ivory-soft hover:text-brass border border-ivory-soft/20'
            }`}
          >
            <Icon size={11} /> {label}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <Avatar name={meName} hue={meHue} size={36} />
        <div className="flex-1 min-w-0 space-y-2">
          <textarea
            rows={isRideshare ? 2 : 3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              kind === 'rideshare-offer'   ? (lang === 'FR' ? 'Détails / restrictions / contact… (optionnel)' : 'Details / contact… (optional)')
            : kind === 'rideshare-request' ? (lang === 'FR' ? 'Détails / flexibilité… (optionnel)' : 'Details / flexibility… (optional)')
            : kind === 'announcement'      ? (lang === 'FR' ? 'Annonce officielle…' : 'Official announcement…')
            : (lang === 'FR' ? "Quoi de neuf ? Partagez avec l'équipe…" : "What's up? Share with the team…")
            }
            className="w-full /50 border px-3 py-2.5 text-sm font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-card resize-y"
          />
          {isRideshare && (
            <div className="grid grid-cols-2 gap-2">
              <input value={from} onChange={(e) => setFrom(e.target.value)}
                placeholder={lang === 'FR' ? 'Départ (ville)' : 'From (city)'}
                className="/50 border px-3 py-2 text-xs font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-card" />
              <input value={to} onChange={(e) => setTo(e.target.value)}
                placeholder={lang === 'FR' ? 'Arrivée' : 'To'}
                className="/50 border px-3 py-2 text-xs font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-card" />
              <input value={when} onChange={(e) => setWhen(e.target.value)}
                placeholder={lang === 'FR' ? 'Quand ? (ex. Vendredi 15h)' : 'When? (e.g. Friday 3pm)'}
                className="/50 border px-3 py-2 text-xs font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-card" />
              <input type="number" min={1} max={8} value={seats} onChange={(e) => setSeats(e.target.value)}
                placeholder={kind === 'rideshare-offer' ? (lang === 'FR' ? 'Places dispo' : 'Seats available') : (lang === 'FR' ? 'Places voulues' : 'Seats needed')}
                className="/50 border px-3 py-2 text-xs font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-card" />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 mt-3">
        <button type="submit" disabled={busy}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50">
          <Send size={11} /> {busy ? '…' : (lang === 'FR' ? 'Publier' : 'Post')}
        </button>
      </div>
    </form>
  );
};

// ─── Post card ─────────────────────────────────────────────────────
const PostCard: React.FC<{
  post: Post;
  meUid: string;
  meName: string;
  isDemo: boolean;
  canDelete: boolean;
  lang: 'FR' | 'EN';
  onChanged: () => void;
}> = ({ post, meUid, meName, isDemo, canDelete, lang, onChanged }) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState('');
  const [myReaction, setMyReaction] = useState<'like' | 'heart' | 'star' | 'laugh' | null>(null);

  // Load my reaction
  useEffect(() => {
    if (!post.id) return;
    if (isDemo) mockGetReaction(post.id, meUid).then(setMyReaction);
    else        getMyReaction(post.id, meUid).then(setMyReaction);
  }, [post.id, meUid, isDemo]);

  // Subscribe to comments only when expanded
  useEffect(() => {
    if (!showComments || !post.id) return;
    if (isDemo) {
      mockListComments(post.id).then(setComments);
      return;
    }
    return subscribeComments(post.id, setComments);
  }, [showComments, post.id, isDemo]);

  const toggleHeart = async () => {
    if (!post.id) return;
    const next: 'heart' | null = myReaction === 'heart' ? null : 'heart';
    setMyReaction(next);
    if (isDemo) await mockSetReaction(post.id, meUid, next);
    else        await setReaction(post.id, meUid, next);
    onChanged();
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !post.id) return;
    const c: Omit<Comment, 'id' | 'createdAt'> = {
      authorUid: meUid, authorName: meName, authorAvatarHue: hueFor(meName), body: draft.trim(),
    };
    if (isDemo) await mockAddComment(post.id, c);
    else        await addComment(post.id, c);
    setDraft('');
    if (isDemo) mockListComments(post.id).then(setComments);
    onChanged();
  };

  const onDelete = async () => {
    if (!post.id) return;
    if (!confirm(lang === 'FR' ? 'Supprimer cette publication ?' : 'Delete this post?')) return;
    if (isDemo) await mockDeletePost(post.id);
    else        await deletePost(post.id);
    onChanged();
  };

  const onSubscribeRideshare = async () => {
    if (!post.id) return;
    if (isDemo) await mockToggleRideshareSub(post.id, meUid, meName);
    else        await toggleRideshareSubscription(post.id, meUid, meName);
    onChanged();
  };

  const isMine = post.authorUid === meUid;
  const isRideshare = post.kind === 'rideshare-offer' || post.kind === 'rideshare-request';
  const isAnnouncement = post.kind === 'announcement';
  const subscribers = post.rideshareSubscribers || [];
  const subscribed = subscribers.includes(meUid);
  const cardBorder = isAnnouncement
    ? 'border-brass/40 bg-brass/5'
    : isRideshare
      ? 'border-blue-300/30 bg-blue-300/[0.04]'
      : 'border-ivory-soft/15 bg-midnight';

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`rounded-card border p-4 ${cardBorder}`}
    >
      <header className="flex items-start gap-3 mb-2">
        <Link to={`/profil/${post.authorUid}`} className="shrink-0">
          <Avatar name={post.authorName} hue={post.authorAvatarHue ?? hueFor(post.authorName)} size={38} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/profil/${post.authorUid}`}
              className="font-display title-medieval text-sm text-ivory hover:text-brass transition truncate">
              {post.authorName}
            </Link>
            {isAnnouncement && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-card border border-brass/40 bg-brass/10 text-brass text-[9px] uppercase tracking-widest">
                <Pin size={9} /> {lang === 'FR' ? 'Annonce' : 'Announcement'}
              </span>
            )}
            {post.kind === 'rideshare-offer' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-card border border-blue-300/40 bg-blue-300/10 text-blue-300 text-[9px] uppercase tracking-widest">
                <Car size={9} /> {lang === 'FR' ? 'Offre covoiturage' : 'Ride offer'}
              </span>
            )}
            {post.kind === 'rideshare-request' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-card border border-amber-300/40 bg-amber-300/10 text-amber-300 text-[9px] uppercase tracking-widest">
                <Car size={9} /> {lang === 'FR' ? 'Recherche covoiturage' : 'Ride request'}
              </span>
            )}
          </div>
          <p className="font-editorial italic text-[11px] text-ivory-soft/60">{relTime(post.createdAt, lang)}</p>
        </div>
        {!isMine && (
          <Link to={`/messages/${post.authorUid}`}
            title={lang === 'FR' ? 'Envoyer un message' : 'Send a message'}
            className="shrink-0 p-1.5 rounded-card text-ivory-soft hover:text-brass hover:bg-brass/10 transition">
            <MessageCircle size={13} />
          </Link>
        )}
        {canDelete && (
          <button onClick={onDelete}
            title={lang === 'FR' ? 'Supprimer' : 'Delete'}
            className="shrink-0 p-1.5 rounded-card text-ivory-soft hover:text-blush hover:bg-blush/10 transition">
            <Trash2 size={13} />
          </button>
        )}
      </header>

      {isRideshare && post.meta && (
        <div className="mb-3 px-3 py-2.5 rounded-card border border-blue-300/20 bg-blue-300/[0.06] grid grid-cols-2 gap-2 text-xs font-sans text-ivory">
          {(post.meta.from || post.meta.to) && (
            <div className="col-span-2 flex items-center gap-2">
              <MapPin size={11} className="text-blue-300" />
              <span><span className="text-ivory-soft/60">{post.meta.from || '?'}</span> → <span className="text-ivory">{post.meta.to || '?'}</span></span>
            </div>
          )}
          {post.meta.when && (
            <div className="flex items-center gap-2">
              <Clock size={11} className="text-blue-300" />
              <span>{post.meta.when}</span>
            </div>
          )}
          {post.meta.seats != null && (
            <div className="flex items-center gap-2">
              <Users size={11} className="text-blue-300" />
              <span>{post.meta.seats} {lang === 'FR' ? 'place(s)' : 'seat(s)'}</span>
            </div>
          )}
        </div>
      )}

      {post.body && (
        <p className="font-editorial text-sm text-ivory-soft leading-relaxed whitespace-pre-line mb-3">
          {post.body}
        </p>
      )}

      {/* Footer actions */}
      <footer className="flex items-center gap-1.5 pt-2">
        <button onClick={toggleHeart}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-card text-[11px] font-sans transition ${
            myReaction === 'heart' ? 'bg-blush/15 text-blush' : 'text-ivory-soft hover:bg-ivory-soft/5 hover:text-blush'
          }`}>
          <Heart size={11} className={myReaction === 'heart' ? 'fill-current' : ''} /> {post.reactionCount || 0}
        </button>
        <button onClick={() => setShowComments((s) => !s)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-card text-[11px] font-sans transition ${
            showComments ? 'bg-brass/15 text-brass' : 'text-ivory-soft hover:bg-ivory-soft/5 hover:text-brass'
          }`}>
          <MessageCircle size={11} /> {post.commentCount || 0}
        </button>
        {isRideshare && (
          <button onClick={onSubscribeRideshare}
            className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-card text-[10px] uppercase tracking-widest font-sans font-semibold transition ${
              subscribed
                ? 'bg-emerald-500/15 border border-emerald-400/40 text-emerald-300'
                : 'border border-blue-300/40 text-blue-300 hover:bg-blue-300/10'
            }`}>
            <Car size={11} /> {subscribed
              ? (lang === 'FR' ? `Inscrit·e (${subscribers.length})` : `Subscribed (${subscribers.length})`)
              : (lang === 'FR' ? `M'inscrire (${subscribers.length})` : `Subscribe (${subscribers.length})`)}
          </button>
        )}
      </footer>

      {/* Comments */}
      {showComments && (
        <div className="mt-3 pt-3 space-y-2.5">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <Link to={`/profil/${c.authorUid}`} className="shrink-0">
                <Avatar name={c.authorName} hue={c.authorAvatarHue ?? hueFor(c.authorName)} size={28} />
              </Link>
              <div className="flex-1 min-w-0 bg-ivory-soft/[0.04] rounded-card px-3 py-2">
                <Link to={`/profil/${c.authorUid}`} className="font-display title-medieval text-xs text-ivory hover:text-brass transition">
                  {c.authorName}
                </Link>
                <p className="font-editorial text-xs text-ivory-soft mt-0.5 whitespace-pre-line leading-relaxed">{c.body}</p>
                <p className="font-editorial italic text-[10px] text-ivory-soft/50 mt-0.5">{relTime(c.createdAt, lang)}</p>
              </div>
            </div>
          ))}
          <form onSubmit={submitComment} className="flex gap-2 items-start">
            <Avatar name={meName} hue={hueFor(meName)} size={28} />
            <div className="flex-1 flex gap-2">
              <input value={draft} onChange={(e) => setDraft(e.target.value)}
                placeholder={lang === 'FR' ? 'Écrire un commentaire…' : 'Write a comment…'}
                className="flex-1 /50 border px-3 py-1.5 text-xs font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-card" />
              <button type="submit" disabled={!draft.trim()}
                className="px-3 py-1.5 bg-brass text-midnight-deep font-sans text-xs rounded-card disabled:opacity-40 hover:bg-brass-soft transition">
                <Send size={11} />
              </button>
            </div>
          </form>
        </div>
      )}
    </motion.article>
  );
};

// ─── Right rail ────────────────────────────────────────────────────
const RightRail: React.FC<{ teams: Team[]; currentTeamId?: string; lang: 'FR' | 'EN' }> = ({ teams, lang }) => (
  <>
    <div className="rounded-card border p-4">
      <p className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest mb-3 flex items-center gap-1.5">
        <Sparkles size={11} /> {lang === 'FR' ? 'Vos équipes' : 'Your teams'}
      </p>
      <div className="space-y-1.5">
        {teams.slice(0, 6).map((t) => (
          <Link key={t.id} to={addLocale(`/communaute/equipe/${t.id}`, lang)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-card hover:bg-ivory-soft/5 transition">
            <span className="text-base">{t.icon || '🏛️'}</span>
            <span className="font-sans text-xs text-ivory-soft truncate flex-1">{t.name}</span>
          </Link>
        ))}
      </div>
    </div>
    <div className="rounded-card border border-blue-300/20 bg-blue-300/[0.04] p-4">
      <p className="font-display title-medieval text-[10px] text-blue-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
        <Car size={11} /> {lang === 'FR' ? 'Conseils covoiturage' : 'Rideshare tips'}
      </p>
      <ul className="font-editorial italic text-[11px] text-ivory-soft/70 space-y-1.5 leading-relaxed">
        <li>• {lang === 'FR' ? 'Précisez ville de départ + heure approx.' : 'Specify departure city + approx time.'}</li>
        <li>• {lang === 'FR' ? 'Inscrivez-vous avant de contacter.' : 'Subscribe before contacting.'}</li>
        <li>• {lang === 'FR' ? 'On suggère 0.10 $ / km par passager.' : 'Suggested $0.10/km per passenger.'}</li>
      </ul>
    </div>
  </>
);

// ─── Avatar ────────────────────────────────────────────────────────
const Avatar: React.FC<{ name: string; hue: number; size?: number }> = ({ name, hue, size = 36 }) => {
  const init = (() => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();
  return (
    <div
      className="rounded-full flex items-center justify-center font-display title-medieval shrink-0"
      style={{
        width: size, height: size,
        backgroundColor: `hsl(${hue} 30% 22%)`,
        color: `hsl(${hue} 60% 70%)`,
        fontSize: size * 0.4,
      }}
      title={name}
    >
      {init}
    </div>
  );
};

function relTime(ts: any, lang: 'FR' | 'EN'): string {
  if (!ts) return '…';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60)        return lang === 'FR' ? 'à l’instant' : 'just now';
  if (diff < 3600)      return `${Math.floor(diff / 60)} ${lang === 'FR' ? 'min' : 'min'}`;
  if (diff < 86400)     return `${Math.floor(diff / 3600)} ${lang === 'FR' ? 'h' : 'h'}`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} ${lang === 'FR' ? 'j' : 'd'}`;
  return d.toLocaleDateString(lang === 'FR' ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'short' });
}

export default CommunautePage;
