import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Image as ImageIcon, Send, Trash2, Loader2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { addLocale } from '../../lib/locale';
import { lireFiche } from '../../firebase/ordre';
import { publierSurLeMur, retirerDuMur, suivreLeMurDeGuilde, LONGUEUR_MAX_POST, type PostMur } from '../../firebase/mur';

// ─── Le mur d'une guilde ───────────────────────────────────────────
// Alex, 2026-08-27 : même grammaire visuelle que MurSocial (le mur
// général), mais scopée à une seule guilde et sans les annonces du
// festival. MurSocial ne prend pas de prop `guildeId`, d'où ce
// composant séparé plutôt qu'une modification du fichier partagé.

const quandTexte = (ms: number, fr: boolean): string => {
  const d = new Date(ms);
  const ecart = Date.now() - ms;
  if (ecart < 60_000) return fr ? 'à l’instant' : 'just now';
  if (ecart < 3_600_000) return `${Math.floor(ecart / 60_000)} min`;
  if (ecart < 86_400_000) return `${Math.floor(ecart / 3_600_000)} h`;
  return d.toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'long', year: 'numeric' });
};

const Medaillon: React.FC<{ nom: string; url?: string; hue?: number }> = ({ nom, url, hue }) => (
  <span className="w-11 h-11 rounded-full overflow-hidden shrink-0 border border-brass/30 flex items-center justify-center font-display text-lg text-ivory/85"
        style={{ background: `hsl(${hue ?? 30} 40% 22%)` }}>
    {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : (nom || '?').slice(0, 1).toUpperCase()}
  </span>
);

const MurGuilde: React.FC<{ lang: 'FR' | 'EN'; guildeId: string; peutEcrire: boolean }> = ({
  lang, guildeId, peutEcrire,
}) => {
  const fr = lang === 'FR';
  const { user, isAdmin } = useAuth();
  const [posts, setPosts] = useState<PostMur[]>([]);
  useEffect(() => suivreLeMurDeGuilde(guildeId, setPosts), [guildeId]);

  // Le composeur
  const [texte, setTexte] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const fichier = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!photo) { setApercu(null); return; }
    const u = URL.createObjectURL(photo); setApercu(u);
    return () => URL.revokeObjectURL(u);
  }, [photo]);

  const publier = async () => {
    if (!user) return;
    setEnvoi(true); setErreur(null);
    try {
      const fiche = await lireFiche(user.uid).catch(() => null);
      await publierSurLeMur({
        uid: user.uid,
        nom: fiche?.nom || user.displayName || (fr ? 'Un inconnu' : 'A stranger'),
        avatarUrl: fiche?.avatarUrl || user.photoURL || undefined,
        avatarHue: fiche?.avatarHue,
        texte, photo: photo || undefined,
        guildeId,
      });
      setTexte(''); setPhoto(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally { setEnvoi(false); }
  };

  const lignes = useMemo(
    () => [...posts].sort((a, b) => (b.creeLe?.toMillis?.() ?? 0) - (a.creeLe?.toMillis?.() ?? 0)),
    [posts],
  );

  return (
    <div className="space-y-5">
      {peutEcrire && user && (
        <section className="glass-light rounded-lg-card p-5 md:p-6">
          <textarea
            value={texte} onChange={(e) => setTexte(e.target.value.slice(0, LONGUEUR_MAX_POST))}
            rows={3}
            placeholder={fr ? 'Quoi de neuf dans la guilde ?' : 'What’s new in the guild?'}
            className="w-full px-4 py-3 rounded-card font-sans text-sm text-ivory placeholder:text-ivory-soft/40 leading-relaxed"
            style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(232,177,74,0.22)' }}
          />
          {apercu && (
            <div className="relative mt-3 inline-block">
              <img src={apercu} alt="" className="max-h-56 rounded-card object-cover" />
              <button type="button" onClick={() => setPhoto(null)} aria-label={fr ? 'Retirer la photo' : 'Remove photo'}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(10,2,7,0.8)', color: '#F4EFE3' }}><X size={13} /></button>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between gap-3">
            <button type="button" onClick={() => fichier.current?.click()}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full font-sans uppercase tracking-[0.18em] text-[10px] text-ivory-soft hover:text-brass transition-colors"
                    style={{ border: '1px solid rgba(244,239,227,0.2)' }}>
              <ImageIcon size={13} /> {fr ? 'Photo' : 'Photo'}
            </button>
            <input ref={fichier} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only"
                   onChange={(e) => { setPhoto(e.target.files?.[0] || null); e.target.value = ''; }} />
            <span className="ml-auto font-sans text-[10px] text-ivory-soft/45">{texte.length}/{LONGUEUR_MAX_POST}</span>
            <button type="button" onClick={publier} disabled={envoi || (!texte.trim() && !photo)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50">
              {envoi ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} {fr ? 'Publier' : 'Post'}
            </button>
          </div>
          {erreur && <p className="mt-2 font-sans text-xs" style={{ color: '#E08A6E' }}>{erreur}</p>}
        </section>
      )}

      {lignes.length === 0 ? (
        <p className="font-editorial text-sm text-ivory-soft leading-relaxed">
          {fr ? 'Rien sur ce mur pour le moment.' : 'Nothing on this wall yet.'}
        </p>
      ) : lignes.map((post, i) => (
        <motion.article
          key={post.id}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-lg-card p-5 md:p-6"
          style={{ background: 'rgba(26, 5, 11, 0.45)', border: '1px solid rgba(232,177,74,0.2)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <Link to={`${addLocale('/profil', lang)}/${post.uid}`}><Medaillon nom={post.nom} url={post.avatarUrl} hue={post.avatarHue} /></Link>
            <div className="min-w-0 flex-1">
              <Link to={`${addLocale('/profil', lang)}/${post.uid}`} className="font-display text-base text-ivory hover:text-brass transition-colors truncate block">
                {post.nom}
              </Link>
              <p className="font-sans text-[11px] text-ivory-soft/55">{quandTexte(post.creeLe?.toMillis?.() ?? Date.now(), fr)}</p>
            </div>
            {user && (user.uid === post.uid || isAdmin) && (
              <button type="button" onClick={() => { void retirerDuMur(post); }} aria-label={fr ? 'Retirer' : 'Remove'}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-ivory-soft/50 hover:text-[#E08A6E] transition-colors">
                <Trash2 size={14} />
              </button>
            )}
          </div>
          {post.texte && <p className="font-editorial text-[15px] text-ivory leading-relaxed whitespace-pre-line">{post.texte}</p>}
          {post.photoUrl && (
            <img src={post.photoUrl} alt="" loading="lazy" className="mt-4 w-full max-h-[32rem] object-cover rounded-card" style={{ border: '1px solid rgba(244,239,227,0.12)' }} />
          )}
        </motion.article>
      ))}
    </div>
  );
};

export default MurGuilde;
