import React, { useEffect, useMemo, useState } from 'react';
import {
  Megaphone, Send, Calendar as CalIcon, Sparkles, Image as ImageIcon, Crown, Trash2, Check, ExternalLink,
  Facebook, Instagram, Music as TikTokIcon, Twitter, Linkedin, Youtube,
} from 'lucide-react';
import { Card, EmptyState, Badge } from '../primitives';
import { useAuth } from '../../../contexts/AuthContext';
import {
  createSocialPost, updateSocialPost, deleteSocialPost, listSocialPosts,
  type SocialPost, type SocialPlatform, type SocialStatus,
} from '../../../firebase/socialPosts';
import {
  mockCreateSocialPost, mockUpdateSocialPost, mockDeleteSocialPost, mockListSocialPosts,
} from '../../../firebase/mockSocialPosts';

const DEV_BYPASS = import.meta.env.VITE_ADMIN_DEV_BYPASS === 'true' && import.meta.env.DEV;

const PLATFORM_META: Record<SocialPlatform, { label: string; icon: React.ComponentType<{ size?: number }> }> = {
  facebook:  { label: 'Facebook',  icon: Facebook },
  instagram: { label: 'Instagram', icon: Instagram },
  tiktok:    { label: 'TikTok',    icon: TikTokIcon },
  twitter:   { label: 'X',         icon: Twitter },
  linkedin:  { label: 'LinkedIn',  icon: Linkedin },
  youtube:   { label: 'YouTube',   icon: Youtube },
};

const STATUS_TONE: Record<SocialStatus, 'pending' | 'info' | 'accepted' | 'rejected'> = {
  requested: 'pending',
  scheduled: 'info',
  posted:    'accepted',
  rejected:  'rejected',
};
const STATUS_LABEL: Record<SocialStatus, string> = {
  requested: 'Demandée',
  scheduled: 'Planifiée',
  posted:    'Publiée',
  rejected:  'Refusée',
};

type TabId = 'request' | 'calendar' | 'studio';

const fetchAll = async (): Promise<SocialPost[]> => {
  if (DEV_BYPASS) return mockListSocialPosts();
  try { return await listSocialPosts(); }
  catch (e) { console.warn('[social] live fetch failed, mock fallback', e); return mockListSocialPosts(); }
};
const create = async (p: SocialPost): Promise<string> => {
  if (DEV_BYPASS) return mockCreateSocialPost(p);
  try { return await createSocialPost(p); }
  catch (e) { console.warn('[social] live create failed, mock fallback', e); return mockCreateSocialPost(p); }
};
const update = async (id: string, patch: Partial<SocialPost>): Promise<void> => {
  if (DEV_BYPASS || id.startsWith('mock-')) return mockUpdateSocialPost(id, patch);
  try { return await updateSocialPost(id, patch); }
  catch (e) { console.warn('[social] live update failed, mock fallback', e); return mockUpdateSocialPost(id, patch); }
};
const remove = async (id: string): Promise<void> => {
  if (DEV_BYPASS || id.startsWith('mock-')) return mockDeleteSocialPost(id);
  try { return await deleteSocialPost(id); }
  catch (e) { console.warn('[social] live delete failed, mock fallback', e); return mockDeleteSocialPost(id); }
};

const SocialMediaSection: React.FC = () => {
  const { user, adminRole, isSuperAdmin } = useAuth();

  // Léna detection — by displayName / email. Lena gets the studio
  // tab open by default + admin actions; everyone else lands on the
  // request tab. Super-admins always see everything.
  const displayName = (user?.displayName || '').toLowerCase();
  const email       = (user?.email || '').toLowerCase();
  const isLena =
    /lena|léna/i.test(displayName) ||
    email.includes('lena') || email.includes('lebozec');
  const canManage = isSuperAdmin || adminRole === 'super' || adminRole === 'ca' || adminRole === 'organisateur' || isLena;

  const [tab, setTab] = useState<TabId>(isLena ? 'studio' : 'request');
  const [items, setItems] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => { setLoading(true); fetchAll().then((r) => { setItems(r); setLoading(false); }); };
  useEffect(() => { refresh(); }, []);

  return (
    <div className="space-y-6">
      {/* Header — personalised for Lena */}
      <Card className="p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-card bg-brass/15 border border-brass/40 text-brass flex items-center justify-center shrink-0">
            {isLena ? <Crown size={20} /> : <Megaphone size={20} />}
          </div>
          <div className="flex-1">
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px] font-semibold mb-1">
              {isLena ? 'Studio social — bienvenue Léna' : 'Médias sociaux · responsable Léna LeBozec'}
            </p>
            <h2 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-1">
              {isLena ? 'Ton calendrier de publications' : 'Demander une publication à Léna'}
            </h2>
            <p className="font-editorial italic text-sm text-ivory-soft">
              {isLena
                ? 'Toutes les demandes de publications atterrissent ici. Planifie, compose, marque comme publié — les publications "posted" remontent automatiquement dans la Médiathèque.'
                : 'Soumettez une demande de publication. Léna voit toutes les demandes ici, les planifie et les publie sur les réseaux du festival.'}
            </p>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-ivory-soft/15">
        <TabBtn on={tab === 'request'}  onClick={() => setTab('request')}  icon={Send}>Demander à Léna</TabBtn>
        <TabBtn on={tab === 'calendar'} onClick={() => setTab('calendar')} icon={CalIcon}>Calendrier</TabBtn>
        {canManage && (
          <TabBtn on={tab === 'studio'} onClick={() => setTab('studio')} icon={Sparkles}>Studio</TabBtn>
        )}
      </div>

      {tab === 'request'  && <RequestTab  user={user} onCreated={refresh} />}
      {tab === 'calendar' && <CalendarTab items={items} loading={loading} />}
      {tab === 'studio'   && canManage && <StudioTab items={items} loading={loading} onChange={refresh} onUpdate={update} onDelete={remove} />}
    </div>
  );
};

// ─── Tabs ──────────────────────────────────────────────────────────────
const TabBtn: React.FC<{
  on: boolean; onClick: () => void; icon: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode;
}> = ({ on, onClick, icon: Icon, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-2 px-4 py-2.5 -mb-px border-b-2 transition font-sans text-xs uppercase tracking-widest ${
      on ? 'border-brass text-brass' : 'border-transparent text-ivory-soft hover:text-ivory'
    }`}
  >
    <Icon size={14} /> {children}
  </button>
);

// ─── Request tab ───────────────────────────────────────────────────────
interface RequestTabProps {
  user: { displayName?: string | null; email?: string | null } | null | undefined;
  onCreated: () => void;
}
const RequestTab: React.FC<RequestTabProps> = ({ user, onCreated }) => {
  const [title, setTitle]           = useState('');
  const [message, setMessage]       = useState('');
  const [platforms, setPlatforms]   = useState<SocialPlatform[]>(['facebook', 'instagram']);
  const [imageUrl, setImageUrl]     = useState('');
  const [link, setLink]             = useState('');
  const [hashtags, setHashtags]     = useState('');
  const [suggestedDate, setSuggestedDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent]             = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const togglePlatform = (p: SocialPlatform) => {
    setPlatforms((cur) => cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim() || platforms.length === 0) {
      setError('Titre, message et au moins une plateforme sont obligatoires.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await create({
        title:        title.trim(),
        message:      message.trim(),
        platforms,
        imageUrl:     imageUrl.trim() || undefined,
        link:         link.trim() || undefined,
        hashtags:     hashtags.trim() || undefined,
        suggestedDate: suggestedDate || undefined,
        requestedBy:  user?.displayName || user?.email || 'Inconnu',
        requestedByEmail: user?.email || undefined,
        status:       'requested',
      });
      setSent(true);
      onCreated();
      // Reset for the next request
      setTitle(''); setMessage(''); setImageUrl(''); setLink(''); setHashtags(''); setSuggestedDate('');
    } catch (err) {
      console.error(err);
      setError('Échec de l’enregistrement. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5 max-w-3xl">
      {sent && (
        <Card className="p-4 border border-emerald-400/40 bg-emerald-400/5">
          <p className="font-editorial italic text-sm text-emerald-300 flex items-center gap-2">
            <Check size={14} /> Demande envoyée à Léna. Vous pouvez en soumettre une autre ou voir le calendrier.
          </p>
        </Card>
      )}

      <Card className="p-6 md:p-8 space-y-5">
        <Row label="Titre interne *">
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Annonce — Programmation musicale" />
        </Row>
        <Row label="Message à publier *">
          <textarea rows={5} className={inputClass} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ce que tu veux que Léna publie. Léna peut peaufiner avant de poster." />
        </Row>
        <Row label="Plateformes *">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PLATFORM_META) as SocialPlatform[]).map((p) => {
              const Meta = PLATFORM_META[p];
              const on = platforms.includes(p);
              return (
                <button
                  type="button"
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-pill border text-xs font-sans uppercase tracking-widest transition ${
                    on
                      ? 'bg-brass/25 border-brass text-brass'
                      : 'bg-midnight-deep/40 border-ivory-soft/25 text-ivory-soft hover:border-ivory-soft/50'
                  }`}
                >
                  <Meta.icon size={12} /> {Meta.label}
                </button>
              );
            })}
          </div>
        </Row>
        <Row label="URL de l’image (optionnelle)">
          <input className={inputClass} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Coller un lien d’image ou un chemin de la médiathèque" />
        </Row>
        <Row label="Lien à pousser (optionnel)">
          <input className={inputClass} value={link} onChange={(e) => setLink(e.target.value)} placeholder="Ex.: https://festivalmedievaldemontpellier.org/benevole" />
        </Row>
        <Row label="Hashtags suggérés">
          <input className={inputClass} value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="#FMM2026 #medieval #montpellier" />
        </Row>
        <Row label="Date suggérée (optionnelle)">
          <input type="date" className={inputClass} value={suggestedDate} onChange={(e) => setSuggestedDate(e.target.value)} />
        </Row>

        {error && <p className="font-editorial italic text-sm text-blush">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-6 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50"
        >
          {submitting ? 'Envoi…' : 'Demander à Léna'} <Send size={14} />
        </button>
      </Card>
    </form>
  );
};

// ─── Calendar tab ──────────────────────────────────────────────────────
const CalendarTab: React.FC<{ items: SocialPost[]; loading: boolean }> = ({ items, loading }) => {
  // Group by month → date for the upcoming/recent items.
  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const da = a.scheduledDate || a.postedDate || a.suggestedDate || '';
      const db = b.scheduledDate || b.postedDate || b.suggestedDate || '';
      return (db || '').localeCompare(da || '');
    });
  }, [items]);

  if (loading) return <EmptyState icon={CalIcon}>Chargement…</EmptyState>;
  if (sorted.length === 0) return <Card><EmptyState icon={CalIcon}>Aucune publication.</EmptyState></Card>;

  return (
    <div className="space-y-3">
      {sorted.map((p) => <PostRow key={p.id} post={p} />)}
    </div>
  );
};

// ─── Studio tab ───────────────────────────────────────────────────────
interface StudioTabProps {
  items: SocialPost[]; loading: boolean;
  onChange: () => void;
  onUpdate: (id: string, patch: Partial<SocialPost>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}
const StudioTab: React.FC<StudioTabProps> = ({ items, loading, onChange, onUpdate, onDelete }) => {
  const [filter, setFilter] = useState<SocialStatus | 'all'>('all');
  const filtered = filter === 'all' ? items : items.filter((p) => p.status === filter);

  if (loading) return <EmptyState icon={Sparkles}>Chargement…</EmptyState>;

  const setStatus = async (post: SocialPost, status: SocialStatus, extra: Partial<SocialPost> = {}) => {
    if (!post.id) return;
    await onUpdate(post.id, { status, ...extra });
    onChange();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1">
        {(['all', 'requested', 'scheduled', 'posted', 'rejected'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-pill border text-xs font-sans uppercase tracking-widest transition ${
              filter === f ? 'bg-brass/25 border-brass text-brass' : 'bg-midnight-deep/40 border-ivory-soft/25 text-ivory-soft hover:border-ivory-soft/50'
            }`}
          >
            {f === 'all' ? 'Toutes' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card><EmptyState icon={Sparkles}>Aucune publication.</EmptyState></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <PostRow
              key={p.id}
              post={p}
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  {p.status !== 'scheduled' && (
                    <button
                      type="button"
                      onClick={() => {
                        const date = window.prompt('Date de publication (YYYY-MM-DD)', p.scheduledDate || new Date().toISOString().slice(0, 10));
                        if (!date) return;
                        setStatus(p, 'scheduled', { scheduledDate: date });
                      }}
                      className="px-3 py-1.5 rounded-pill border text-[10px] uppercase tracking-widest border-blue-300/40 text-blue-300 hover:bg-blue-300/15 transition"
                    >
                      Planifier
                    </button>
                  )}
                  {p.status !== 'posted' && (
                    <button
                      type="button"
                      onClick={() => setStatus(p, 'posted', { postedDate: new Date().toISOString().slice(0, 10) })}
                      className="px-3 py-1.5 rounded-pill border text-[10px] uppercase tracking-widest border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/15 transition"
                    >
                      Marquer publié
                    </button>
                  )}
                  {p.status !== 'rejected' && (
                    <button
                      type="button"
                      onClick={() => setStatus(p, 'rejected')}
                      className="px-3 py-1.5 rounded-pill border text-[10px] uppercase tracking-widest border-blush/40 text-blush hover:bg-blush/15 transition"
                    >
                      Refuser
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      if (!p.id) return;
                      if (!window.confirm('Supprimer cette demande ?')) return;
                      await onDelete(p.id);
                      onChange();
                    }}
                    className="px-2 py-1.5 rounded-pill border border-ivory-soft/25 text-ivory-soft/70 hover:text-blush hover:border-blush/50 transition"
                    title="Supprimer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Shared post row ───────────────────────────────────────────────────
const PostRow: React.FC<{ post: SocialPost; actions?: React.ReactNode }> = ({ post, actions }) => (
  <Card className="p-5">
    <div className="flex items-start gap-4">
      {post.imageUrl ? (
        <img
          src={post.imageUrl}
          alt=""
          loading="lazy"
          className="w-20 h-20 object-cover rounded-card border border-ivory-soft/15 shrink-0"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div className="w-20 h-20 rounded-card border border-ivory-soft/15 bg-midnight-deep/40 flex items-center justify-center shrink-0">
          <ImageIcon size={20} className="text-ivory-soft/40" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="font-display title-medieval text-base text-ivory truncate">{post.title}</p>
          <Badge tone={STATUS_TONE[post.status]}>{STATUS_LABEL[post.status]}</Badge>
        </div>
        <p className="font-editorial italic text-xs text-ivory-soft/70 mb-2">
          {post.requestedBy} ·{' '}
          {post.scheduledDate ? `planifiée ${post.scheduledDate}`
            : post.postedDate ? `publiée ${post.postedDate}`
            : post.suggestedDate ? `suggérée ${post.suggestedDate}`
            : 'sans date'}
        </p>
        <p className="font-sans text-sm text-ivory whitespace-pre-line line-clamp-3">{post.message}</p>
        <div className="flex items-center gap-2 flex-wrap mt-2">
          {post.platforms.map((p) => {
            const M = PLATFORM_META[p];
            return (
              <span key={p} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill border border-ivory-soft/20 text-[10px] uppercase tracking-widest text-ivory-soft">
                <M.icon size={10} /> {M.label}
              </span>
            );
          })}
          {post.link && (
            <a href={post.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-brass hover:text-brass-soft">
              lien <ExternalLink size={10} />
            </a>
          )}
        </div>
        {post.hashtags && (
          <p className="font-sans text-[11px] text-brass/80 mt-1.5">{post.hashtags}</p>
        )}
        {actions && <div className="mt-3">{actions}</div>}
      </div>
    </div>
  </Card>
);

const inputClass =
  'w-full bg-midnight-deep/50 border border-ivory-soft/20 rounded-card px-3 py-2 text-sm text-ivory placeholder:text-ivory-soft/40 focus:outline-none focus:border-brass/70 focus:ring-1 focus:ring-brass/40 transition';

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="font-sans text-xs uppercase tracking-widest text-ivory-soft/80 mb-1.5 inline-block">{label}</span>
    {children}
  </label>
);

export default SocialMediaSection;
