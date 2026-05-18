import React, { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Upload, Search, ExternalLink, Copy, Check, Megaphone, Facebook, Instagram, Music as TikTokIcon, Twitter, Linkedin, Youtube } from 'lucide-react';
import { Card, EmptyState, GhostButton } from '../primitives';
import { mockMedia } from '../../../firebase/mockData';
import {
  listMediaLibrary, uploadMediaItem, type MediaItem,
} from '../../../firebase/media';
import {
  subscribePostedSocialPosts,
  type SocialPost, type SocialPlatform,
} from '../../../firebase/socialPosts';
import { mockListSocialPosts } from '../../../firebase/mockSocialPosts';

const PLATFORM_ICON: Record<SocialPlatform, React.ComponentType<{ size?: number }>> = {
  facebook: Facebook, instagram: Instagram, tiktok: TikTokIcon,
  twitter: Twitter, linkedin: Linkedin, youtube: Youtube,
};

interface Props { devBypass: boolean }

const MediasSection: React.FC<Props> = ({ devBypass }) => {
  const [search,    setSearch]    = useState('');
  const [folder,    setFolder]    = useState<string>('all');
  const [copied,    setCopied]    = useState<string | null>(null);
  const [items,     setItems]     = useState<MediaItem[]>([]);
  const [mediaErr,  setMediaErr]  = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load media library from Storage
  const loadMedia = () => {
    listMediaLibrary()
      .then((live) => {
        if (live.length > 0) {
          setItems(live);
          setMediaErr(null);
        } else if (devBypass) {
          setItems(mockMedia);
        }
      })
      .catch((err) => {
        console.warn('[MediasSection] listMediaLibrary failed:', err);
        setMediaErr('Impossible de charger la médiathèque depuis Firebase Storage.');
        if (devBypass) setItems(mockMedia);
      });
  };

  useEffect(() => { loadMedia(); }, [devBypass]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle file upload
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const targetFolder = folder !== 'all' ? folder : 'general';
      await Promise.all(
        Array.from(files).map((f) => uploadMediaItem(f, targetFolder)),
      );
      loadMedia();
    } catch (err) {
      console.warn('[MediasSection] upload failed:', err);
      setMediaErr('Erreur lors du téléversement. Vérifiez Firebase Storage.');
    } finally {
      setUploading(false);
    }
  };

  // "Déjà publié" — live-streamed from socialPosts where status='posted'.
  // Falls back to the mock store in dev so the section reads cleanly
  // even without Firestore.
  const [posted, setPosted] = useState<SocialPost[]>([]);
  useEffect(() => {
    if (devBypass) {
      mockListSocialPosts().then((rows) => setPosted(rows.filter((p) => p.status === 'posted')));
      return;
    }
    const unsub = subscribePostedSocialPosts((rows) => setPosted(rows));
    // Mock fallback alongside if the live query errors out (subscribe
    // already logs + cb([]) — splice in mocks so the section isn't empty).
    mockListSocialPosts().then((rows) => {
      const mockPosted = rows.filter((p) => p.status === 'posted');
      setPosted((cur) => cur.length === 0 ? mockPosted : cur);
    });
    return unsub;
  }, [devBypass]);

  const folders = Array.from(new Set(items.map((m) => m.folder)));

  const filtered = items.filter((m) =>
    (folder === 'all' || m.folder === folder) &&
    (search === '' || m.alt.toLowerCase().includes(search.toLowerCase()) || m.src.toLowerCase().includes(search.toLowerCase())),
  );

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Hidden file input wired to the Téléverser button */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,application/pdf"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {mediaErr && (
        <Card className="p-5 border border-blush/30 bg-blush/5">
          <p className="font-editorial italic text-sm text-ivory-soft">{mediaErr}</p>
        </Card>
      )}

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <p className="font-editorial italic text-sm text-ivory-soft">{filtered.length} fichier{filtered.length > 1 ? "s" : ""} affichés</p>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-ivory-soft" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Recherche…"
              className="pl-8 pr-3 py-1.5 rounded-card border border-ivory-soft/20 bg-midnight-deep/50 text-ivory placeholder:text-stone focus:border-brass focus:outline-none text-xs font-sans" />
          </div>
          <select value={folder} onChange={(e) => setFolder(e.target.value)}
            className="px-3 py-1.5 rounded-card border border-ivory-soft/20 bg-midnight-deep/50 text-ivory focus:border-brass focus:outline-none text-xs font-sans">
            <option value="all">Tous les dossiers</option>
            {folders.map((f) => <option key={f} value={f}>/{f}</option>)}
          </select>
          <GhostButton
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title={uploading ? "Téléversement en cours..." : "Téléverser des fichiers"}
          >
            <Upload size={12} /> {uploading ? "Téléversement..." : "Téléverser"}
          </GhostButton>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card><EmptyState icon={ImageIcon}>Aucun fichier.</EmptyState></Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {filtered.map((m) => (
            <figure key={m.id} className="glass-light rounded-card overflow-hidden group">
              <div className="aspect-square bg-midnight-deep/40 overflow-hidden">
                <img decoding="async" src={m.src} alt={m.alt} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <figcaption className="p-3">
                <p className="font-display title-medieval text-xs text-ivory truncate">{m.alt}</p>
                <p className="font-editorial italic text-[10px] text-ivory-soft/60 mt-0.5 truncate">/{m.folder} · {m.sizeKb}kb</p>
                <div className="flex items-center gap-1 mt-2">
                  <button onClick={() => copyUrl(m.src)}
                    className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-ivory-soft hover:text-brass transition font-sans"
                    title="Copier l’URL">
                    {copied === m.src ? <><Check size={10} className="text-emerald-400" /> Copié</> : <><Copy size={10} /> URL</>}
                  </button>
                  <a href={m.src} target="_blank" rel="noopener noreferrer"
                    className="ml-auto text-ivory-soft hover:text-brass transition" title="Ouvrir dans un nouvel onglet">
                    <ExternalLink size={10} />
                  </a>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {/* ── Déjà publié — fed by socialPosts where status='posted' ── */}
      <div className="pt-8 border-t border-ivory-soft/15">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display title-medieval text-base md:text-lg text-brass uppercase tracking-widest flex items-center gap-2">
            <Megaphone size={14} /> Déjà publié
          </h3>
          <p className="font-editorial italic text-xs text-ivory-soft">
            {posted.length} publication{posted.length > 1 ? 's' : ''} archivée{posted.length > 1 ? 's' : ''}
          </p>
        </div>
        {posted.length === 0 ? (
          <Card><EmptyState icon={Megaphone}>Aucune publication marquée comme « publiée » pour l’instant.</EmptyState></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {posted.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex gap-3">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt="" loading="lazy"
                      className="w-16 h-16 object-cover rounded-card border border-ivory-soft/15 shrink-0"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="w-16 h-16 rounded-card border border-ivory-soft/15 bg-midnight-deep/40 flex items-center justify-center shrink-0">
                      <ImageIcon size={16} className="text-ivory-soft/40" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-display title-medieval text-sm text-ivory truncate">{p.title}</p>
                    <p className="font-editorial italic text-[11px] text-ivory-soft/60 mt-0.5">
                      {p.postedDate || '—'} · par {p.requestedBy}
                    </p>
                    <p className="font-sans text-xs text-ivory-soft line-clamp-2 mt-1">{p.message}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      {p.platforms.map((pl) => {
                        const Icon = PLATFORM_ICON[pl];
                        const liveUrl = p.postedUrls?.find((u) => u.platform === pl)?.url;
                        return liveUrl ? (
                          <a key={pl} href={liveUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill border border-brass/30 text-[10px] uppercase tracking-widest text-brass hover:bg-brass/10 transition">
                            <Icon size={10} /> Voir
                          </a>
                        ) : (
                          <span key={pl} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill border border-ivory-soft/20 text-[10px] uppercase tracking-widest text-ivory-soft">
                            <Icon size={10} />
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediasSection;
