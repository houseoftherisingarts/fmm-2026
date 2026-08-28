import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Image as ImageIcon, Send, Trash2, Megaphone, Loader2, X, ShieldCheck, BadgeCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { addLocale } from '../../lib/locale';
import { lireFiche } from '../../firebase/ordre';
import { publierSurLeMur, retirerDuMur, suivreLeMur, suivreLeFilDe, LONGUEUR_MAX_POST, type PostMur, type GenrePost } from '../../firebase/mur';
import { ANNONCES } from '../../content/annonces';
import BadgeVerifie from '../compte/BadgeVerifie';

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

const Medaillon: React.FC<{ nom: string; url?: string; hue?: number }> = ({ nom, url, hue }) => (
  <span className="w-11 h-11 rounded-full overflow-hidden shrink-0 border border-brass/30 flex items-center justify-center font-display text-lg text-ivory/85"
        style={{ background: `hsl(${hue ?? 30} 40% 22%)` }}>
    {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : (nom || '?').slice(0, 1).toUpperCase()}
  </span>
);

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
        moderateur: isAdmin,
        verifie: fiche?.verifie,
        genre,
      });
      setTexte(''); setPhoto(null); setGenre('billet');
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
    const l: Ligne[] = posts.filter(garder).map((p) => ({ genre: 'post', quand: p.creeLe?.toMillis?.() ?? Date.now(), post: p }));
    if (avecAnnonces && !uid) {
      ANNONCES.forEach((a) => l.push({ genre: 'annonce', quand: new Date(a.date).getTime(), annonce: a }));
    }
    return l.sort((a, b) => b.quand - a.quand);
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
            <span className="ml-auto font-sans text-[10px] text-ivory-soft/45">{texte.length}/{LONGUEUR_MAX_POST}</span>
            <button type="button" onClick={publier} disabled={envoi || (!texte.trim() && !photo)}
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
      ) : lignes.map((l, i) => (
        <motion.article
          key={l.genre === 'post' ? l.post.id : `annonce-${l.annonce.id}`}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-lg-card p-5 md:p-6"
          style={l.genre === 'annonce'
            ? { background: 'rgba(216,176,90,0.07)', border: '1px solid rgba(216,176,90,0.35)' }
            : { background: TEINTE_GENRE[l.post.genre || 'billet'].fond, border: `1px solid ${TEINTE_GENRE[l.post.genre || 'billet'].bord}` }}
        >
          {l.genre === 'annonce' ? (
            <>
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
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3">
                <Link to={`${addLocale('/profil', lang)}/${l.post.uid}`}><Medaillon nom={l.post.nom} url={l.post.avatarUrl} hue={l.post.avatarHue} /></Link>
                <div className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 min-w-0">
                    <Link to={`${addLocale('/profil', lang)}/${l.post.uid}`} className="font-display text-base text-ivory hover:text-brass transition-colors truncate">
                      {l.post.nom}
                    </Link>
                    {l.post.moderateur && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-sans uppercase tracking-[0.16em] text-[9px] shrink-0"
                            style={{ background: 'rgba(216,176,90,0.16)', border: '1px solid #D8B05A', color: '#D8B05A' }}>
                        <ShieldCheck size={10} /> {fr ? 'Admin · Modérateur' : 'Admin · Moderator'}
                      </span>
                    )}
                  </span>
                  <p className="font-sans text-[11px] text-ivory-soft/55">
                    {quandTexte(l.quand, fr)}
                    {(l.post.genre || 'billet') !== 'billet' && (
                      <span className="ml-2 px-2 py-0.5 rounded-full font-sans uppercase tracking-[0.16em] text-[9px]"
                            style={{ border: `1px solid ${TEINTE_GENRE[l.post.genre!].accent}`, color: TEINTE_GENRE[l.post.genre!].accent }}>
                        {fr ? TEINTE_GENRE[l.post.genre!].nomFR : TEINTE_GENRE[l.post.genre!].nomEN}
                      </span>
                    )}
                  </p>
                </div>
                {user && (user.uid === l.post.uid || isAdmin) && (
                  <button type="button" onClick={() => { void retirerDuMur(l.post); }} aria-label={fr ? 'Retirer' : 'Remove'}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-ivory-soft/50 hover:text-[#E08A6E] transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {l.post.texte && <p className="font-editorial text-[15px] text-ivory leading-relaxed whitespace-pre-line">{l.post.texte}</p>}
              {l.post.photoUrl && (
                <img src={l.post.photoUrl} alt="" loading="lazy" className="mt-4 w-full max-h-[32rem] object-cover rounded-card" style={{ border: '1px solid rgba(244,239,227,0.12)' }} />
              )}
            </>
          )}
        </motion.article>
      ))}
    </div>
  );
};

export default MurSocial;
