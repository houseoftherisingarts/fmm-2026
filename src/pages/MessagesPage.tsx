import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Send, Search, MessageCircle, ChevronLeft, UserCircle2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/AppContext';
import { addLocale } from '../lib/locale';
import { useCaravanPage } from '../lib/useCaravanPage';
import {
  type DMThread, type DM,
  threadId as makeThreadId, ensureThread, subscribeDMThread, sendDM, subscribeInbox, markThreadRead,
} from '../firebase/dms';
import {
  mockListThreads, mockListDMs, mockSendDM, mockGetPublicProfile,
} from '../firebase/mockCommunity';
import { hueFor, type PublicProfile, getPublicProfile } from '../firebase/publicProfile';
import SEO from '../components/SEO';

// ─── Inbox + thread (Messenger-clone) ─────────────────────────────
// /messages           → inbox
// /messages/:otherUid → focused thread (creates the thread on first send)
//
// Threads are 1-on-1; the id is the sorted uid pair so duplicates can't
// exist. Inbox is realtime via subscribeInbox, threads via
// subscribeDMThread. In dev/showcase we fall through to the in-memory
// mock store so the UI is alive without Firestore.

const SHOWCASE_IN_DEV = import.meta.env.DEV;
const DEMO_UID = 'mock-bene-vole';

const MessagesPage: React.FC = () => {
  useCaravanPage();
  const { otherUid } = useParams<{ otherUid?: string }>();
  const navigate = useNavigate();
  const { user, loading, openSignIn } = useAuth();
  const { lang } = useUI();

  const [threads, setThreads] = useState<DMThread[]>([]);
  const [search, setSearch]   = useState('');
  const [otherProfile, setOtherProfile] = useState<PublicProfile | null>(null);
  const [msgs, setMsgs]       = useState<DM[]>([]);
  const [draft, setDraft]     = useState('');
  const [sending, setSending] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Resolve "me" identity ──
  const meUid  = user?.uid || DEMO_UID;
  const meName = user?.displayName || 'Béné Vole';
  const meHue  = hueFor(meName);
  const useMock = SHOWCASE_IN_DEV && (!user || meUid === DEMO_UID || (otherUid?.startsWith('mock-')));

  // ── Inbox subscription ──
  useEffect(() => {
    if (!user && !SHOWCASE_IN_DEV) return;
    if (useMock) {
      mockListThreads(meUid).then(setThreads);
      return;
    }
    return subscribeInbox(meUid, setThreads);
  }, [meUid, useMock, user]);

  // ── Resolve other party's profile + thread for the focused view ──
  useEffect(() => {
    if (!otherUid) { setOtherProfile(null); setActiveThreadId(null); setMsgs([]); return; }
    let cancelled = false;
    (async () => {
      // public profile (for header)
      let p: PublicProfile | null = null;
      if (otherUid.startsWith('mock-')) p = await mockGetPublicProfile(otherUid);
      else {
        try { p = await getPublicProfile(otherUid); } catch { /* offline */ }
        if (!p && SHOWCASE_IN_DEV) p = await mockGetPublicProfile(otherUid);
      }
      if (cancelled) return;
      setOtherProfile(p);

      // thread id
      const id = makeThreadId(meUid, otherUid);
      setActiveThreadId(id);

      // messages
      if (useMock) {
        const list = await mockListDMs(id);
        if (!cancelled) setMsgs(list);
      } else {
        // ensure thread doc exists so future inbox queries find it
        try { await ensureThread(meUid, meName, meHue, otherUid, p?.displayName || 'Bénévole', p?.avatarHue ?? hueFor(p?.displayName || '')); }
        catch { /* offline */ }
        const unsub = subscribeDMThread(id, (list) => { if (!cancelled) setMsgs(list); });
        return () => unsub();
      }
    })();
    return () => { cancelled = true; };
  }, [otherUid, meUid, useMock, meName, meHue]);

  // mark read when entering
  useEffect(() => {
    if (activeThreadId && !useMock) markThreadRead(activeThreadId, meUid).catch(() => {});
  }, [activeThreadId, meUid, useMock]);

  // auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [msgs.length, activeThreadId]);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otherUid || !draft.trim() || !activeThreadId) return;
    setSending(true);
    try {
      const payload = { senderUid: meUid, senderName: meName, body: draft.trim() };
      if (useMock) {
        const op = otherProfile;
        await mockSendDM(activeThreadId, payload, otherUid, op?.displayName || 'Bénévole', op?.avatarHue ?? hueFor(op?.displayName || ''));
        setMsgs(await mockListDMs(activeThreadId));
        setThreads(await mockListThreads(meUid));
      } else {
        await sendDM(activeThreadId, payload, otherUid);
      }
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  // ── Auth gate ──
  if (loading) {
    return <main className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-t-transparent border-brass animate-spin" />
    </main>;
  }
  if (!user && !SHOWCASE_IN_DEV) {
    return (
      <main className="min-h-screen text-ivory flex items-center justify-center px-6">
        <div className="max-w-md text-center glass-light rounded-lg-card p-8">
          <h1 className="font-display title-medieval text-2xl text-ivory mb-3">{lang === 'FR' ? 'Messages' : 'Messages'}</h1>
          <p className="font-editorial text-ivory-soft mb-6">
            {lang === 'FR' ? 'Connectez-vous pour voir vos conversations.' : 'Sign in to see your conversations.'}
          </p>
          <button onClick={openSignIn}
            className="px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
            {lang === 'FR' ? 'Se connecter' : 'Sign in'}
          </button>
        </div>
      </main>
    );
  }

  const filtered = threads.filter((t) => {
    const otherUidInThread = t.participantUids.find((u) => u !== meUid);
    const otherName = otherUidInThread ? t.participantNames?.[otherUidInThread] || '' : '';
    return search === '' || otherName.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <>
      <SEO title={lang === 'FR' ? 'Messages' : 'Messages'} />
      <div className="min-h-screen text-ivory pt-20 pb-10">
        <div className="max-w-screen-xl mx-auto px-3 md:px-6">
          <div className="flex items-center gap-3 mb-4">
            <Link to={addLocale('/communaute', lang)}
              className="inline-flex items-center gap-1.5 font-sans text-xs uppercase tracking-widest text-ivory-soft hover:text-brass transition">
              <ArrowLeft size={12} /> {lang === 'FR' ? 'Communauté' : 'Community'}
            </Link>
          </div>

          <div className="grid lg:grid-cols-12 gap-4 h-[calc(100vh-10rem)] min-h-[36rem]">
            {/* ── Inbox sidebar ── */}
            <aside className={`lg:col-span-4 ${otherUid ? 'hidden lg:flex' : 'flex'} flex-col rounded-card border border-ivory-soft/15 bg-midnight overflow-hidden`}>
              <div className="px-4 py-3">
                <h2 className="font-display title-medieval text-sm text-ivory mb-2 flex items-center gap-2">
                  <MessageCircle size={14} className="text-brass" /> {lang === 'FR' ? 'Conversations' : 'Conversations'}
                </h2>
                <div className="relative">
                  <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder={lang === 'FR' ? 'Rechercher…' : 'Search…'}
                    className="w-full pl-8 pr-3 py-1.5 /40 border rounded-card text-xs font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="p-6 text-center text-ivory-soft/60">
                    <UserCircle2 size={28} className="mx-auto mb-2 opacity-50" />
                    <p className="font-editorial italic text-xs">
                      {lang === 'FR' ? 'Aucune conversation. Allez sur un profil pour démarrer.' : 'No conversations yet. Go to a profile to start one.'}
                    </p>
                  </div>
                ) : filtered.map((t) => {
                  const otherU = t.participantUids.find((u) => u !== meUid) || '';
                  const otherN = t.participantNames?.[otherU] || 'Bénévole';
                  const otherH = t.participantHues?.[otherU]  ?? hueFor(otherN);
                  const active = otherU === otherUid;
                  const unread = (t.unread?.[meUid] || 0) > 0;
                  return (
                    <button key={t.id} onClick={() => navigate(addLocale(`/messages/${otherU}`, lang))}
                      className={`w-full flex items-center gap-2.5 px-4 py-3 text-left transition border-b border-ivory-soft/[0.06] ${
                        active ? 'bg-brass/10' : 'hover:bg-ivory-soft/[0.04]'
                      }`}>
                      <Avatar name={otherN} hue={otherH} size={36} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-display title-medieval text-sm truncate ${active ? 'text-brass' : unread ? 'text-ivory' : 'text-ivory-soft'}`}>{otherN}</p>
                          {unread && <span className="w-1.5 h-1.5 rounded-full bg-brass shrink-0" />}
                        </div>
                        <p className="font-editorial italic text-[11px] text-ivory-soft/60 truncate">
                          {t.lastSenderUid === meUid ? (lang === 'FR' ? 'Vous : ' : 'You: ') : ''}{t.lastMessage || '…'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* ── Thread pane ── */}
            <section className={`lg:col-span-8 ${otherUid ? 'flex' : 'hidden lg:flex'} flex-col rounded-card border border-ivory-soft/15 bg-midnight overflow-hidden`}>
              {!otherUid ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-ivory-soft/60 px-6">
                  <MessageCircle size={36} className="opacity-40 mb-3" />
                  <p className="font-editorial italic text-sm">
                    {lang === 'FR'
                      ? 'Sélectionnez une conversation, ou démarrez-en une depuis un profil bénévole.'
                      : 'Pick a conversation, or start one from a volunteer profile.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Thread header */}
                  <header className="px-4 py-3 flex items-center gap-3">
                    <button onClick={() => navigate(addLocale('/messages', lang))}
                      className="lg:hidden text-ivory-soft hover:text-brass transition">
                      <ChevronLeft size={16} />
                    </button>
                    <Link to={addLocale(`/profil/${otherUid}`, lang)} className="flex items-center gap-2.5 hover:opacity-80 transition flex-1 min-w-0">
                      <Avatar name={otherProfile?.displayName || 'Bénévole'} hue={otherProfile?.avatarHue ?? hueFor(otherProfile?.displayName || '')} size={34} />
                      <div className="min-w-0">
                        <p className="font-display title-medieval text-sm text-ivory truncate">{otherProfile?.displayName || 'Bénévole'}</p>
                        {otherProfile?.pronouns && (
                          <p className="font-editorial italic text-[10px] text-ivory-soft/60">{otherProfile.pronouns}</p>
                        )}
                      </div>
                    </Link>
                  </header>

                  {/* Thread body */}
                  <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
                    {msgs.length === 0 ? (
                      <div className="text-center pt-12 text-ivory-soft/50">
                        <p className="font-editorial italic text-sm">
                          {lang === 'FR' ? `Démarrez la conversation avec ${otherProfile?.displayName || 'cette personne'}.` : `Start a conversation with ${otherProfile?.displayName || 'this person'}.`}
                        </p>
                      </div>
                    ) : (
                      <AnimatePresence initial={false}>
                        {msgs.map((m) => {
                          const mine = m.senderUid === meUid;
                          return (
                            <motion.div key={m.id}
                              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                              className={`flex ${mine ? 'justify-end' : 'justify-start'} gap-2`}>
                              {!mine && (
                                <Avatar name={m.senderName} hue={hueFor(m.senderName)} size={26} />
                              )}
                              <div className={`max-w-[78%] px-3.5 py-2 text-sm font-sans whitespace-pre-wrap break-words rounded-card ${
                                mine
                                  ? 'bg-brass text-midnight-deep'
                                  : 'bg-ivory-soft/[0.07] text-ivory-soft border border-ivory-soft/10'
                              }`}>
                                {m.body}
                                <p className={`font-editorial italic text-[9px] mt-1 ${mine ? 'text-midnight-deep/60' : 'text-ivory-soft/50'}`}>
                                  {fmtTs(m.createdAt)}
                                </p>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    )}
                  </div>

                  {/* Composer */}
                  <form onSubmit={onSend} className="px-4 py-3 flex items-end gap-2">
                    <textarea
                      rows={1}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          onSend(e as unknown as React.FormEvent);
                        }
                      }}
                      placeholder={lang === 'FR' ? 'Écrire un message… (Entrée pour envoyer)' : 'Type a message… (Enter to send)'}
                      className="flex-1 /50 border px-3 py-2 text-sm font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-card resize-none max-h-32"
                    />
                    <button type="submit" disabled={sending || !draft.trim()}
                      className="inline-flex items-center justify-center w-10 h-10 bg-brass text-midnight-deep font-sans rounded-card hover:bg-brass-soft transition disabled:opacity-40 disabled:cursor-not-allowed">
                      <Send size={14} />
                    </button>
                  </form>
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

const Avatar: React.FC<{ name: string; hue: number; size?: number }> = ({ name, hue, size = 36 }) => {
  const init = (() => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();
  return (
    <div className="rounded-full flex items-center justify-center font-display title-medieval shrink-0"
      style={{
        width: size, height: size,
        backgroundColor: `hsl(${hue} 30% 22%)`,
        color: `hsl(${hue} 60% 70%)`,
        fontSize: size * 0.4,
      }}>
      {init}
    </div>
  );
};

function fmtTs(ts: any): string {
  if (!ts) return '…';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default MessagesPage;
