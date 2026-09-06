import React, { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Send, Loader2, X, Video } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { lireFiche } from '../../firebase/ordre';
import { lireGuilde } from '../../firebase/guildes';
import { publierSurLeMur, suivreLeMurDeGuilde, LONGUEUR_MAX_POST, type PostMur } from '../../firebase/mur';
import { suivreSansPub } from '../../firebase/sansPub';
import BilletCarte from './BilletCarte';

const TAILLE_MAX_VIDEO = 60 * 1024 * 1024;

// ─── Le mur d'une guilde ───────────────────────────────────────────
// Alex, 2026-08-27 : même grammaire visuelle que MurSocial (le mur
// général), mais scopée à une seule guilde et sans les annonces du
// festival. MurSocial ne prend pas de prop `guildeId`, d'où ce
// composant séparé plutôt qu'une modification du fichier partagé.
// Sur un grand écran, le composeur reste collé à gauche et les billets
// défilent à droite (addendum du 6 septembre 2026, ordre 1). L'auteur
// de chaque billet mène à son profil depuis BilletCarte.

const MurGuilde: React.FC<{ lang: 'FR' | 'EN'; guildeId: string; peutEcrire: boolean }> = ({
  lang, guildeId, peutEcrire,
}) => {
  const fr = lang === 'FR';
  const { user, isAdmin } = useAuth();
  const [posts, setPosts] = useState<PostMur[]>([]);
  useEffect(() => suivreLeMurDeGuilde(guildeId, setPosts), [guildeId]);

  // L'admin de la guilde peut épingler, comme l'équipe (Alex, 2026-08-28).
  const [adminsGuilde, setAdminsGuilde] = useState<string[]>([]);
  useEffect(() => { void lireGuilde(guildeId).then((g) => setAdminsGuilde(g?.admins || [])); }, [guildeId]);
  const peutEpingler = isAdmin || (!!user && adminsGuilde.includes(user.uid));

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

  // La vidéo, réservée aux membres VIP (Alex, 2026-08-28), pour la bande passante.
  const [estVip, setEstVip] = useState(false);
  useEffect(() => (user ? suivreSansPub(user.uid, setEstVip) : undefined), [user]);
  const [video, setVideo] = useState<File | null>(null);
  const [apercuVideo, setApercuVideo] = useState<string | null>(null);
  const [erreurVideo, setErreurVideo] = useState<string | null>(null);
  const fichierVideo = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!video) { setApercuVideo(null); return; }
    const u = URL.createObjectURL(video); setApercuVideo(u);
    return () => URL.revokeObjectURL(u);
  }, [video]);

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
        texte, photo: photo || undefined, video: video || undefined,
        guildeId,
      });
      setTexte(''); setPhoto(null); setVideo(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally { setEnvoi(false); }
  };

  // posts arrive déjà rangés par suivreLeMurDeGuilde (chaleur, épinglés
  // en tête) : ne pas les reclasser ici (Alex, 2026-08-28).
  const lignes = posts;
  const composeur = peutEcrire && !!user;

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {composeur && (
        <div className="lg:col-span-5 xl:col-span-4">
          <section className="glass-light rounded-lg-card p-5 md:p-6 lg:sticky lg:top-24">
            <textarea
              value={texte} onChange={(e) => setTexte(e.target.value.slice(0, LONGUEUR_MAX_POST))}
              rows={5}
              placeholder={fr ? 'Quoi de neuf dans la guilde ?' : 'What’s new in the guild?'}
              className="w-full px-4 py-3 rounded-card font-sans text-sm text-ivory placeholder:text-ivory-soft/40 leading-relaxed"
              style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(var(--sk-glow-rgb),0.22)' }}
            />
            {apercu && (
              <div className="relative mt-3 inline-block">
                <img src={apercu} alt="" className="max-h-56 rounded-card object-cover" />
                <button type="button" onClick={() => setPhoto(null)} aria-label={fr ? 'Retirer la photo' : 'Remove photo'}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(var(--sk-ink-rgb),0.8)', color: 'var(--sk-parchment)' }}><X size={13} /></button>
              </div>
            )}
            {apercuVideo && (
              <div className="relative mt-3 inline-block">
                <video src={apercuVideo} className="max-h-56 rounded-card" controls />
                <button type="button" onClick={() => setVideo(null)} aria-label={fr ? 'Retirer la vidéo' : 'Remove video'}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(var(--sk-ink-rgb),0.8)', color: 'var(--sk-parchment)' }}><X size={13} /></button>
              </div>
            )}
            {erreurVideo && <p className="mt-2 font-sans text-xs" style={{ color: '#E08A6E' }}>{erreurVideo}</p>}
            <div className="mt-3 flex items-center flex-wrap gap-2">
              <button type="button" onClick={() => fichier.current?.click()}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full font-sans uppercase tracking-[0.18em] text-[10px] text-ivory-soft hover:text-brass transition-colors"
                      style={{ border: '1px solid rgba(var(--sk-parchment-rgb),0.2)' }}>
                <ImageIcon size={13} /> {fr ? 'Photo' : 'Photo'}
              </button>
              <input ref={fichier} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only"
                     onChange={(e) => { setPhoto(e.target.files?.[0] || null); e.target.value = ''; }} />
              <button type="button"
                      onClick={() => {
                        if (!estVip) {
                          setErreurVideo(fr
                            ? 'La vidéo est réservée aux membres VIP. Votre don retire les publicités et ouvre la vidéo.'
                            : 'Video is reserved for VIP members. Your donation removes ads and unlocks video.');
                          return;
                        }
                        fichierVideo.current?.click();
                      }}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full font-sans uppercase tracking-[0.18em] text-[10px] text-ivory-soft hover:text-brass transition-colors"
                      style={{ border: '1px solid rgba(var(--sk-parchment-rgb),0.2)' }}>
                <Video size={13} /> {fr ? 'Vidéo' : 'Video'}
              </button>
              <input ref={fichierVideo} type="file" accept="video/mp4,video/webm" className="sr-only"
                     onChange={(e) => {
                       const f = e.target.files?.[0] || null; e.target.value = '';
                       if (!f) return;
                       if (f.size > TAILLE_MAX_VIDEO) {
                         setErreurVideo(fr ? 'La vidéo dépasse 60 Mo.' : 'The video is over 60 MB.');
                         return;
                       }
                       setErreurVideo(null); setVideo(f);
                     }} />
              <span className="ml-auto font-sans text-[10px] text-ivory-soft/45">{texte.length}/{LONGUEUR_MAX_POST}</span>
              <button type="button" onClick={publier} disabled={envoi || (!texte.trim() && !photo && !video)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50">
                {envoi ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} {fr ? 'Publier' : 'Post'}
              </button>
            </div>
            {erreur && <p className="mt-2 font-sans text-xs" style={{ color: '#E08A6E' }}>{erreur}</p>}
          </section>
        </div>
      )}

      <div className={`space-y-5 ${composeur ? 'lg:col-span-7 xl:col-span-8' : 'lg:col-span-12'}`}>
        {lignes.length === 0 ? (
          <p className="font-editorial text-sm text-ivory-soft leading-relaxed">
            {fr ? 'Rien sur ce mur pour le moment.' : 'Nothing on this wall yet.'}
          </p>
        ) : lignes.map((post, i) => (
          <BilletCarte
            key={post.id}
            lang={lang}
            post={post}
            delaiIndex={i}
            fond="rgba(var(--sk-deep-rgb), 0.45)"
            bord="rgba(var(--sk-glow-rgb),0.2)"
            peutEpingler={peutEpingler}
            bandeauEpingle={fr ? 'Épinglé dans la guilde' : 'Pinned in the guild'}
          />
        ))}
      </div>
    </div>
  );
};

export default MurGuilde;
