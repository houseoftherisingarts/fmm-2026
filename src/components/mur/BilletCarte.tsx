import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Trash2, ShieldCheck, MessageCircle, Share2, Pin, PinOff, Send, Loader2, ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { addLocale } from '../../lib/locale';
import { lireFiche } from '../../firebase/ordre';
import {
  retirerDuMur, epinglerBillet, voter, suivreMonVote, listerVotes,
  publierCommentaire, suivreCommentaires, retirerCommentaire, voterCommentaire, suivreMonVoteCommentaire,
  partagerSurMonFil, LONGUEUR_MAX_COMMENTAIRE, type PostMur, type CommentaireMur,
} from '../../firebase/mur';
import BadgeVerifie from '../compte/BadgeVerifie';
import VoteBar from './VoteBar';

// ─── La carte d'un billet ────────────────────────────────────────────
// Alex, 2026-08-28 : le corps commun à MurSocial et MurGuilde — vote,
// commentaires, partage et épinglage. Chaque carte gère ses propres
// abonnements (mon vote, les commentaires) pour que la boucle des
// billets au-dessus n'ait jamais à connaître les hooks d'un seul.

const quandTexte = (ms: number, fr: boolean): string => {
  const d = new Date(ms);
  const ecart = Date.now() - ms;
  if (ecart < 60_000) return fr ? 'à l’instant' : 'just now';
  if (ecart < 3_600_000) return `${Math.floor(ecart / 60_000)} min`;
  if (ecart < 86_400_000) return `${Math.floor(ecart / 3_600_000)} h`;
  return d.toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'long', year: 'numeric' });
};

const Medaillon: React.FC<{ nom: string; url?: string; hue?: number; taille?: number }> = ({ nom, url, hue, taille = 44 }) => (
  <span
    className="rounded-full overflow-hidden shrink-0 border border-brass/30 flex items-center justify-center font-display text-ivory/85"
    style={{ width: taille, height: taille, background: `hsl(${hue ?? 30} 40% 22%)`, fontSize: taille * 0.4 }}
  >
    {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : (nom || '?').slice(0, 1).toUpperCase()}
  </span>
);

/** Une ligne de commentaire : son propre vote, sa propre suppression. */
const LigneCommentaire: React.FC<{
  fr: boolean; lang: 'FR' | 'EN'; postId: string; postAuteurUid: string; c: CommentaireMur;
}> = ({ fr, lang, postId, postAuteurUid, c }) => {
  const { user, isAdmin } = useAuth();
  const [monVote, setMonVote] = useState<1 | -1 | 0>(0);
  useEffect(() => (user ? suivreMonVoteCommentaire(postId, c.id, user.uid, setMonVote) : undefined), [postId, c.id, user]);

  const voterIci = (valeur: 1 | -1 | 0) => {
    if (!user) return;
    void voterCommentaire(postId, c.id, user.uid, user.displayName || (fr ? 'Un inconnu' : 'A stranger'), valeur);
  };

  const peutSupprimer = !!user && (isAdmin || user.uid === c.uid || user.uid === postAuteurUid);

  return (
    <div className="flex gap-2.5 py-2.5 first:pt-0">
      <Link to={`${addLocale('/profil', lang)}/${c.uid}`}><Medaillon nom={c.nom} url={c.avatarUrl} hue={c.avatarHue} taille={30} /></Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link to={`${addLocale('/profil', lang)}/${c.uid}`} className="font-display text-[13px] text-ivory hover:text-brass transition-colors">
            {c.nom}
          </Link>
          {c.verifie && <BadgeVerifie size={12} titre={fr ? 'Membre vérifié' : 'Verified member'} />}
          <span className="font-sans text-[10px] text-ivory-soft/45">{quandTexte(c.creeLe?.toMillis?.() ?? Date.now(), fr)}</span>
        </div>
        <p className="font-editorial text-[13px] text-ivory leading-relaxed whitespace-pre-line mt-0.5">{c.texte}</p>
        <div className="mt-1.5 flex items-center gap-3">
          <VoteBar
            fr={fr} pour={c.pour ?? 0} contre={c.contre ?? 0} score={c.score ?? 0} monVote={monVote}
            onVoter={voterIci}
            listerPour={() => listerVotes(postId, 1)}
            listerContre={() => listerVotes(postId, -1)}
            petit
          />
          {peutSupprimer && (
            <button type="button" onClick={() => { void retirerCommentaire(postId, c.id); }}
                    aria-label={fr ? 'Retirer' : 'Remove'}
                    className="text-ivory-soft/40 hover:text-[#E08A6E] transition-colors">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const BilletCarte: React.FC<{
  lang: 'FR' | 'EN';
  post: PostMur;
  delaiIndex: number;
  fond: string; bord: string;
  genreBadge?: { texte: string; couleur: string };
  peutEpingler: boolean;
  bandeauEpingle: string;
}> = ({ lang, post, delaiIndex, fond, bord, genreBadge, peutEpingler, bandeauEpingle }) => {
  const fr = lang === 'FR';
  const { user, isAdmin } = useAuth();

  const [monVote, setMonVote] = useState<1 | -1 | 0>(0);
  useEffect(() => (user ? suivreMonVote(post.id, user.uid, setMonVote) : undefined), [post.id, user]);

  const voterIci = (valeur: 1 | -1 | 0) => {
    if (!user) return;
    void voter(post.id, user.uid, user.displayName || (fr ? 'Un inconnu' : 'A stranger'), valeur);
  };

  // ── Commentaires : abonnés seulement une fois le panneau ouvert ────
  const [commentairesOuverts, setCommentairesOuverts] = useState(false);
  const [commentaires, setCommentaires] = useState<CommentaireMur[]>([]);
  useEffect(() => {
    if (!commentairesOuverts) return;
    return suivreCommentaires(post.id, setCommentaires);
  }, [commentairesOuverts, post.id]);
  const [texteComment, setTexteComment] = useState('');
  const [envoiComment, setEnvoiComment] = useState(false);

  const publierCommentaireIci = async () => {
    if (!user || !texteComment.trim()) return;
    setEnvoiComment(true);
    try {
      const fiche = await lireFiche(user.uid).catch(() => null);
      await publierCommentaire(post.id, {
        uid: user.uid,
        nom: fiche?.nom || user.displayName || (fr ? 'Un inconnu' : 'A stranger'),
        avatarUrl: fiche?.avatarUrl || user.photoURL || undefined,
        avatarHue: fiche?.avatarHue,
        texte: texteComment,
        verifie: fiche?.verifie,
      });
      setTexteComment('');
    } finally { setEnvoiComment(false); }
  };

  // ── Partager ────────────────────────────────────────────────────
  const [partageOuvert, setPartageOuvert] = useState(false);
  const [motPartage, setMotPartage] = useState('');
  const [envoiPartage, setEnvoiPartage] = useState(false);
  const [erreurPartage, setErreurPartage] = useState<string | null>(null);

  const partagerIci = async () => {
    if (!user) return;
    setEnvoiPartage(true); setErreurPartage(null);
    try {
      const fiche = await lireFiche(user.uid).catch(() => null);
      await partagerSurMonFil({
        uid: user.uid,
        nom: fiche?.nom || user.displayName || (fr ? 'Un inconnu' : 'A stranger'),
        avatarUrl: fiche?.avatarUrl || user.photoURL || undefined,
        avatarHue: fiche?.avatarHue,
        texte: motPartage,
        partage: {
          genre: 'billet',
          postId: post.id,
          auteurNom: post.nom,
          extrait: post.texte.slice(0, 240),
          imageUrl: post.photoUrl,
        },
      });
      setPartageOuvert(false); setMotPartage('');
    } catch (e) {
      setErreurPartage(e instanceof Error ? e.message : String(e));
    } finally { setEnvoiPartage(false); }
  };

  const basculerEpingle = () => { void epinglerBillet(post, !post.epingle); };

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(delaiIndex, 8) * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-lg-card p-5 md:p-6"
      style={{ background: fond, border: `1px solid ${bord}` }}
    >
      {post.epingle && (
        <p className="flex items-center gap-1.5 mb-3 font-sans uppercase tracking-[0.18em] text-[9px]" style={{ color: '#D8B05A' }}>
          <Pin size={11} /> {bandeauEpingle}
        </p>
      )}

      <div className="flex items-center gap-3 mb-3">
        <Link to={`${addLocale('/profil', lang)}/${post.uid}`}><Medaillon nom={post.nom} url={post.avatarUrl} hue={post.avatarHue} /></Link>
        <div className="min-w-0 flex-1">
          <span className="flex items-center gap-2 min-w-0">
            <Link to={`${addLocale('/profil', lang)}/${post.uid}`} className="font-display text-base text-ivory hover:text-brass transition-colors truncate">
              {post.nom}
            </Link>
            {post.verifie && <BadgeVerifie size={15} titre={fr ? 'Membre vérifié' : 'Verified member'} />}
            {post.moderateur && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-sans uppercase tracking-[0.16em] text-[9px] shrink-0"
                    style={{ background: 'rgba(216,176,90,0.16)', border: '1px solid #D8B05A', color: '#D8B05A' }}>
                <ShieldCheck size={10} /> {fr ? 'Admin · Modérateur' : 'Admin · Moderator'}
              </span>
            )}
          </span>
          <p className="font-sans text-[11px] text-ivory-soft/55">
            {quandTexte(post.creeLe?.toMillis?.() ?? Date.now(), fr)}
            {genreBadge && (
              <span className="ml-2 px-2 py-0.5 rounded-full font-sans uppercase tracking-[0.16em] text-[9px]"
                    style={{ border: `1px solid ${genreBadge.couleur}`, color: genreBadge.couleur }}>
                {genreBadge.texte}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {peutEpingler && (
            <button type="button" onClick={basculerEpingle}
                    aria-label={post.epingle ? (fr ? 'Décrocher' : 'Unpin') : (fr ? 'Épingler' : 'Pin')}
                    aria-pressed={!!post.epingle}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                    style={{ color: post.epingle ? '#D8B05A' : 'rgba(244,239,227,0.4)' }}>
              {post.epingle ? <Pin size={14} fill="currentColor" /> : <PinOff size={14} />}
            </button>
          )}
          {user && (user.uid === post.uid || isAdmin) && (
            <button type="button" onClick={() => { void retirerDuMur(post); }} aria-label={fr ? 'Retirer' : 'Remove'}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-ivory-soft/50 hover:text-[#E08A6E] transition-colors">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {post.texte && <p className="font-editorial text-[15px] text-ivory leading-relaxed whitespace-pre-line">{post.texte}</p>}
      {post.photoUrl && (
        <img src={post.photoUrl} alt="" loading="lazy" className="mt-4 w-full max-h-[32rem] object-cover rounded-card" style={{ border: '1px solid rgba(244,239,227,0.12)' }} />
      )}

      {/* La carte citée d'un partage (Alex, 2026-08-28). */}
      {post.partage && (
        <div className="mt-4 rounded-card p-4" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(244,239,227,0.14)' }}>
          {post.partage.auteurNom && (
            <p className="font-sans text-[11px] text-ivory-soft/60 mb-1.5">
              {fr ? `Partagé de ${post.partage.auteurNom}` : `Shared from ${post.partage.auteurNom}`}
            </p>
          )}
          {post.partage.titre && <p className="font-display text-sm text-brass mb-1">{post.partage.titre}</p>}
          {post.partage.extrait && <p className="font-editorial text-[13px] text-ivory-soft leading-relaxed">{post.partage.extrait}</p>}
          {post.partage.imageUrl && (
            <img src={post.partage.imageUrl} alt="" loading="lazy" className="mt-3 w-full max-h-72 object-cover rounded-card" style={{ border: '1px solid rgba(244,239,227,0.1)' }} />
          )}
          {post.partage.url && (
            <a href={post.partage.url} target="_blank" rel="noreferrer"
               className="mt-2 inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-[0.16em] text-brass hover:text-brass-soft transition-colors">
              {fr ? 'Voir' : 'See'} <ExternalLink size={11} />
            </a>
          )}
        </div>
      )}

      {/* La barre : vote, commenter, partager (Alex, 2026-08-28). */}
      <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-4">
        <VoteBar
          fr={fr} pour={post.pour ?? 0} contre={post.contre ?? 0} score={post.score ?? 0} monVote={monVote}
          onVoter={voterIci}
          listerPour={() => listerVotes(post.id, 1)}
          listerContre={() => listerVotes(post.id, -1)}
          vertical
        />
        <button type="button" onClick={() => setCommentairesOuverts((v) => !v)}
                className="inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-[0.14em] text-ivory-soft/70 hover:text-ivory transition-colors">
          <MessageCircle size={14} /> {fr ? 'Commenter' : 'Comment'} {(post.nbCommentaires ?? 0) > 0 && `(${post.nbCommentaires})`}
        </button>
        <button type="button" onClick={() => setPartageOuvert((v) => !v)}
                className="inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-[0.14em] text-ivory-soft/70 hover:text-ivory transition-colors">
          <Share2 size={14} /> {fr ? 'Partager' : 'Share'}
        </button>
      </div>

      {partageOuvert && user && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <textarea
            value={motPartage} onChange={(e) => setMotPartage(e.target.value)}
            rows={2}
            placeholder={fr ? 'Ajoutez un mot…' : 'Add a word…'}
            className="w-full px-3 py-2 rounded-card font-sans text-[13px] text-ivory placeholder:text-ivory-soft/40"
            style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(232,177,74,0.22)' }}
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            {erreurPartage && <p className="mr-auto font-sans text-[11px]" style={{ color: '#E08A6E' }}>{erreurPartage}</p>}
            <button type="button" onClick={partagerIci} disabled={envoiPartage}
                    className="inline-flex items-center gap-2 px-4 py-1.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-[10px] font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50">
              {envoiPartage ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} {fr ? 'Partager sur mon fil' : 'Share to my feed'}
            </button>
          </div>
        </div>
      )}

      {commentairesOuverts && (
        <div className="mt-3 pt-3 border-t border-white/10">
          {user && (
            <div className="flex items-start gap-2 mb-2">
              <textarea
                value={texteComment} onChange={(e) => setTexteComment(e.target.value.slice(0, LONGUEUR_MAX_COMMENTAIRE))}
                rows={1}
                placeholder={fr ? 'Écrire un commentaire…' : 'Write a comment…'}
                className="flex-1 px-3 py-2 rounded-card font-sans text-[13px] text-ivory placeholder:text-ivory-soft/40"
                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(244,239,227,0.14)' }}
              />
              <button type="button" onClick={publierCommentaireIci} disabled={envoiComment || !texteComment.trim()}
                      aria-label={fr ? 'Envoyer' : 'Send'}
                      className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-brass text-midnight-deep disabled:opacity-50">
                {envoiComment ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              </button>
            </div>
          )}
          {commentaires.length === 0 ? (
            <p className="font-editorial text-[12px] text-ivory-soft/50">{fr ? 'Aucun commentaire pour le moment.' : 'No comments yet.'}</p>
          ) : (
            <div className="divide-y divide-white/5">
              {commentaires.map((c) => (
                <LigneCommentaire key={c.id} fr={fr} lang={lang} postId={post.id} postAuteurUid={post.uid} c={c} />
              ))}
            </div>
          )}
        </div>
      )}
    </motion.article>
  );
};

export default BilletCarte;
