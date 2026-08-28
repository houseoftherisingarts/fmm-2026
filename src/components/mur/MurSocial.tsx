import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useBadges } from '../../contexts/BadgesContext';
import { motion } from 'framer-motion';
import { Image as ImageIcon, Send, Megaphone, Loader2, X, Video, ImagePlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { lireFiche } from '../../firebase/ordre';
import {
  publierSurLeMur, suivreLeMur, suivreLeFilDe, LONGUEUR_MAX_POST,
  LONGUEUR_MAX_TITRE_VIDEO, LONGUEUR_MAX_DESCRIPTION_VIDEO, type PostMur, type GenrePost,
} from '../../firebase/mur';
import { suivreSansPub } from '../../firebase/sansPub';
import { ANNONCES } from '../../content/annonces';
import BilletCarte from './BilletCarte';

const TAILLE_MAX_VIDEO = 60 * 1024 * 1024;

// ─── Le mur social ───────────────────────────────────────────────────
// Alex, 2026-08-27 : les billets de tous les membres de l'Ordre, en
// ordre chronologique, avec les annonces du festival glissées dedans
// (la redondance est voulue). Le même composant sert le mur entier et
// le fil d'une seule personne (`uid`).

type Ligne =
  | { genre: 'post'; quand: number; post: PostMur }
  | { genre: 'annonce'; quand: number; annonce: typeof ANNONCES[number] };

const quandTexte = (ms: number, fr: boolean): string => {
  const d = new Date(ms);
  const ecart = Date.now() - ms;
  if (ecart < 60_000) return fr ? 'à l’instant' : 'just now';
  if (ecart < 3_600_000) return `${Math.floor(ecart / 60_000)} min`;
  if (ecart < 86_400_000) return `${Math.floor(ecart / 3_600_000)} h`;
  return d.toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Les teintes des genres : un léger glissement de ton dans la palette
// du site, jamais des couleurs franches (Alex, 2026-08-27).
export const TEINTE_GENRE: Record<GenrePost, { fond: string; bord: string; accent: string; nomFR: string; nomEN: string }> = {
  billet:  { fond: 'rgba(38, 30, 52, 0.45)',  bord: 'rgba(120, 130, 190, 0.32)', accent: '#9fb0e6', nomFR: 'Post',    nomEN: 'Post' },
  offre:   { fond: 'rgba(22, 44, 34, 0.45)',  bord: 'rgba(110, 170, 130, 0.35)', accent: '#8fd6b4', nomFR: 'Offre',   nomEN: 'Offer' },
  demande: { fond: 'rgba(56, 22, 26, 0.45)',  bord: 'rgba(200, 110, 100, 0.35)', accent: '#e08a6e', nomFR: 'Demande', nomEN: 'Request' },
};

const MurSocial: React.FC<{
  lang: 'FR' | 'EN'; uid?: string; avecAnnonces?: boolean; avecComposeur?: boolean;
  /** 'tout' (défaut), 'billets' (colonne de gauche) ou 'offres' (offres et demandes, colonne de droite). */
  filtre?: 'tout' | 'billets' | 'offres';
  /** Ne rend que le composeur (le mur en pleine largeur le pose au-dessus des colonnes). */
  seulementComposeur?: boolean;
}> = ({
  lang, uid, avecAnnonces = true, avecComposeur = true, filtre = 'tout', seulementComposeur = false,
}) => {
  const fr = lang === 'FR';
  const { user, isAdmin } = useAuth();
  const { gagnerBadge } = useBadges();
  const [posts, setPosts] = useState<PostMur[]>([]);
  useEffect(() => (uid ? suivreLeFilDe(uid, setPosts) : suivreLeMur(setPosts)), [uid]);

  // Le composeur
  const [texte, setTexte] = useState('');
  const [genre, setGenre] = useState<GenrePost>('billet');
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

  // La vidéo, réservée aux membres VIP (le don « sans publicité »,
  // Alex, 2026-08-28) — pour la bande passante.
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

  // Titre, description et vignette de la vidéo, façon YouTube (Alex,
  // 2026-08-28). Sans vignette choisie, publierSurLeMur en prend une
  // automatiquement dans la vidéo.
  const [videoTitre, setVideoTitre] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoVignette, setVideoVignette] = useState<File | null>(null);
  const [apercuVignette, setApercuVignette] = useState<string | null>(null);
  const fichierVignette = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!videoVignette) { setApercuVignette(null); return; }
    const u = URL.createObjectURL(videoVignette); setApercuVignette(u);
    return () => URL.revokeObjectURL(u);
  }, [videoVignette]);

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
        moderateur: isAdmin,
        verifie: fiche?.verifie,
        genre,
      });
      gagnerBadge('mur-premier');
      setTexte(''); setPhoto(null); setVideo(null); setGenre('billet');
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally { setEnvoi(false); }
  };

  const lignes = useMemo<Ligne[]>(() => {
    const garder = (p: PostMur) => {
      const g = p.genre || 'billet';
      if (filtre === 'billets') return g === 'billet';
      if (filtre === 'offres') return g !== 'billet';
      return true;
    };
    // Le tri du fil suit la chaleur (le serveur l'a déjà rangée, épinglés
    // en tête) : les billets gardent l'ordre reçu de `posts`, jamais
    // reclassés par date. Seules les annonces s'intercalent par date, en
    // fusion stable qui ne fait jamais passer un billet devant un autre
    // (Alex, 2026-08-28).
    const billets: Ligne[] = posts.filter(garder).map((p) => ({ genre: 'post', quand: p.creeLe?.toMillis?.() ?? Date.now(), post: p }));
    if (!avecAnnonces || uid) return billets;
    const annonces = ANNONCES.map((a) => ({ genre: 'annonce' as const, quand: new Date(a.date).getTime(), annonce: a }))
      .sort((a, b) => b.quand - a.quand);
    const resultat: Ligne[] = [];
    let i = 0;
    for (const annonce of annonces) {
      while (i < billets.length && billets[i].quand > annonce.quand) { resultat.push(billets[i]); i++; }
      resultat.push(annonce);
    }
    while (i < billets.length) { resultat.push(billets[i]); i++; }
    return resultat;
  }, [posts, avecAnnonces, uid, filtre]);

  const peutEcrire = avecComposeur && user && (!uid || uid === user.uid);

  return (
    <div className="space-y-5">
      {peutEcrire && (
        <section className="glass-light rounded-lg-card p-5 md:p-6">
          <textarea
            value={texte} onChange={(e) => setTexte(e.target.value.slice(0, LONGUEUR_MAX_POST))}
            rows={3}
            placeholder={fr ? 'Quoi de neuf sur votre route ?' : 'What’s new on your road?'}
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
          {apercuVideo && (
            <div className="relative mt-3 inline-block">
              <video src={apercuVideo} className="max-h-56 rounded-card" controls />
              <button type="button" onClick={() => setVideo(null)} aria-label={fr ? 'Retirer la vidéo' : 'Remove video'}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(10,2,7,0.8)', color: '#F4EFE3' }}><X size={13} /></button>
            </div>
          )}
          {erreurVideo && <p className="mt-2 font-sans text-xs" style={{ color: '#E08A6E' }}>{erreurVideo}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={fr ? 'Genre du billet' : 'Post kind'}>
            {(['billet', 'offre', 'demande'] as GenrePost[]).map((g) => {
              const tg = TEINTE_GENRE[g]; const actif = genre === g;
              return (
                <button key={g} type="button" role="radio" aria-checked={actif} onClick={() => setGenre(g)}
                        className="px-3 py-1.5 rounded-full font-sans uppercase tracking-[0.16em] text-[10px] transition-colors"
                        style={{ border: `1px solid ${actif ? tg.accent : 'rgba(244,239,227,0.18)'}`, background: actif ? tg.fond : 'transparent', color: actif ? tg.accent : 'rgba(244,239,227,0.55)' }}>
                  {fr ? tg.nomFR : tg.nomEN}
                </button>
              );
            })}
            <span className="font-sans text-[10px] text-ivory-soft/45 ml-1">
              {fr ? 'Les offres et les demandes paraissent dans la colonne de droite.' : 'Offers and requests show in the right column.'}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <button type="button" onClick={() => fichier.current?.click()}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full font-sans uppercase tracking-[0.18em] text-[10px] text-ivory-soft hover:text-brass transition-colors"
                    style={{ border: '1px solid rgba(244,239,227,0.2)' }}>
              <ImageIcon size={13} /> {fr ? 'Photo' : 'Photo'}
            </button>
            <input ref={fichier} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only"
                   onChange={(e) => { setPhoto(e.target.files?.[0] || null); e.target.value = ''; }} />
            {/* La vidéo est réservée aux membres VIP, pour la bande passante (Alex, 2026-08-28). */}
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
                    style={{ border: '1px solid rgba(244,239,227,0.2)' }}>
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
      )}

      {seulementComposeur ? null : lignes.length === 0 ? (
        <p className="font-editorial text-sm text-ivory-soft leading-relaxed">
          {uid ? (fr ? 'Rien sur ce fil pour le moment.' : 'Nothing on this feed yet.') : (fr ? 'Le mur est encore vide. Soyez la première voix.' : 'The wall is still empty. Be the first voice.')}
        </p>
      ) : lignes.map((l, i) => l.genre === 'annonce' ? (
        <motion.article
          key={`annonce-${l.annonce.id}`}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-lg-card p-5 md:p-6"
          style={{ background: 'rgba(216,176,90,0.07)', border: '1px solid rgba(216,176,90,0.35)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="witcher-tile shrink-0" style={{ width: 40, height: 40 }}>
              <span className="witcher-tile-inner" style={{ color: '#D8B05A' }}><Megaphone size={14} /></span>
            </span>
            <div className="min-w-0">
              <p className="font-display text-base text-ivory truncate">{fr ? 'Annonce du festival' : 'Festival notice'}</p>
              <p className="font-sans text-[11px] text-ivory-soft/55">{quandTexte(l.quand, fr)}</p>
            </div>
          </div>
          <h3 className="font-display title-medieval text-lg text-ivory mb-2">{fr ? l.annonce.titleFR : l.annonce.titleEN}</h3>
          <p className="font-editorial text-sm text-ivory-soft leading-relaxed whitespace-pre-line">{fr ? l.annonce.bodyFR : l.annonce.bodyEN}</p>
          {l.annonce.cta?.url && (
            <a href={l.annonce.cta.url} target="_blank" rel="noreferrer"
               className="mt-4 inline-flex items-center gap-2 px-4 py-2 border border-brass/40 text-brass hover:bg-brass/10 font-sans text-xs uppercase tracking-wider transition rounded-card">
              {fr ? l.annonce.cta.labelFR : l.annonce.cta.labelEN}
            </a>
          )}
        </motion.article>
      ) : (
        <BilletCarte
          key={l.post.id}
          lang={lang}
          post={l.post}
          delaiIndex={i}
          fond={TEINTE_GENRE[l.post.genre || 'billet'].fond}
          bord={TEINTE_GENRE[l.post.genre || 'billet'].bord}
          genreBadge={(l.post.genre || 'billet') !== 'billet' ? { texte: fr ? TEINTE_GENRE[l.post.genre!].nomFR : TEINTE_GENRE[l.post.genre!].nomEN, couleur: TEINTE_GENRE[l.post.genre!].accent } : undefined}
          peutEpingler={isAdmin}
          bandeauEpingle={fr ? 'Épinglé par l’équipe' : 'Pinned by the team'}
        />
      ))}
    </div>
  );
};

export default MurSocial;
