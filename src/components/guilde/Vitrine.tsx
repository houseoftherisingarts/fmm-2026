import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Type, Image as ImageIcon, Video, GraduationCap, Pin, PinOff, Trash2, Send, Loader2, X, ExternalLink, FileText,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/AppContext';
import { addLocale } from '../../lib/locale';
import { lireFiche } from '../../firebase/ordre';
import type { Guilde } from '../../firebase/guildes';
import { TYPES_ACCEPTES } from '../../firebase/photosPubliques';
import {
  suivreVitrine, publier, supprimer, epingler, lienEmbed,
  LONGUEUR_MAX_TEXTE, LONGUEUR_MAX_TITRE, POIDS_MAX_VIDEO, POIDS_MAX_PDF,
  type BilletVitrine, type TypeVitrine,
} from '../../firebase/guildeVitrine';

// ─── La vitrine publique ─────────────────────────────────────────────
// Addendum du 6 septembre 2026, ordre 8. Le mur que le monde entier
// voit, séparé du mur privé : une grille de cartes en pleine largeur,
// les épinglées en tête. Un membre y publie depuis le composeur; sur la
// page publique (`publique`), la vitrine se lit seulement. Les vidéos
// YouTube et Vimeo arrivent en iframe paresseuse, les mp4 dans <video>,
// et la formation s'ouvre par un bouton avec sa durée.

// Signature définitive : { guilde, uid, estChef, publique }.
//   publique = true quand la page est vue sans compte (lecture seule, pas de composeur).
export interface VitrineProps { guilde: Pick<Guilde, 'id' | 'nom' | 'forme' | 'admins' | 'membres'> & Partial<Guilde>; uid: string | null; estChef: boolean; publique?: boolean }

const TYPES: ReadonlyArray<{
  cle: TypeVitrine; FR: string; EN: string; accept: string;
  Icone: React.ComponentType<{ size?: number | string; className?: string }>;
}> = [
  { cle: 'texte',     FR: 'Texte',     EN: 'Text',   accept: '',                        Icone: Type },
  { cle: 'photo',     FR: 'Photo',     EN: 'Photo',  accept: TYPES_ACCEPTES.join(','),  Icone: ImageIcon },
  { cle: 'video',     FR: 'Vidéo',     EN: 'Video',  accept: 'video/mp4',               Icone: Video },
  { cle: 'formation', FR: 'Formation', EN: 'Course', accept: 'application/pdf',         Icone: GraduationCap },
];

const champ = {
  background: 'rgba(0,0,0,0.35)',
  border: '1px solid rgba(var(--sk-glow-rgb),0.22)',
};

const quand = (b: BilletVitrine, fr: boolean): string => {
  const ms = b.creeLe?.toMillis?.();
  if (!ms) return fr ? 'à l’instant' : 'just now';
  return new Date(ms).toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'long', year: 'numeric' });
};

const Medaillon: React.FC<{ nom: string; url?: string }> = ({ nom, url }) => (
  <span
    className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-brass/30 flex items-center justify-center font-display text-[11px] text-ivory/85"
    style={{ background: 'hsl(30 40% 22%)' }}
  >
    {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : (nom || '?').slice(0, 1).toUpperCase()}
  </span>
);

const Vitrine: React.FC<VitrineProps> = ({ guilde, uid, estChef, publique = false }) => {
  const { lang } = useUI();
  const { isAdmin } = useAuth();
  const fr = lang === 'FR';

  const [billets, setBillets] = useState<BilletVitrine[]>([]);
  useEffect(() => suivreVitrine(guilde.id, setBillets), [guilde.id]);

  const estMembre = Boolean(uid && guilde.membres.includes(uid));
  const peutEpingler = !publique && (estChef || isAdmin);
  const peutSupprimer = (b: BilletVitrine) => !publique && !!uid && (b.uid === uid || estChef || isAdmin);

  const retirer = async (b: BilletVitrine) => {
    if (!confirm(fr ? 'Retirer ce billet de la vitrine ?' : 'Remove this post from the showcase?')) return;
    await supprimer(guilde.id, b);
  };

  return (
    <div className="space-y-5">
      {!publique && estMembre && uid && <Composeur guildeId={guilde.id} uid={uid} fr={fr} />}

      {billets.length === 0 ? (
        <p className="font-editorial text-sm text-ivory-soft leading-relaxed">
          {publique
            ? (fr ? 'Cette vitrine est encore vide.' : 'This showcase is still empty.')
            : (fr ? 'Rien dans la vitrine pour le moment. Ce que vous y mettez se voit sans compte.' : 'Nothing in the showcase yet. What you put here is seen without an account.')}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
          {billets.map((b) => (
            <Carte
              key={b.id} billet={b} fr={fr} lang={lang}
              onSupprimer={peutSupprimer(b) ? () => { void retirer(b); } : undefined}
              onEpingler={peutEpingler ? () => { void epingler(guilde.id, b.id, !b.epingle); } : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Une carte ───────────────────────────────────────────────────────
const Carte: React.FC<{
  billet: BilletVitrine; fr: boolean; lang: 'FR' | 'EN';
  onSupprimer?: () => void; onEpingler?: () => void;
}> = ({ billet: b, fr, lang, onSupprimer, onEpingler }) => {
  const [tout, setTout] = useState(false);
  const def = TYPES.find((t) => t.cle === b.type) || TYPES[0];
  const embed = b.type === 'video' && b.videoUrl ? lienEmbed(b.videoUrl) : null;
  const long = b.texte.length > 280;

  return (
    <article
      className="glass-light rounded-lg-card overflow-hidden flex flex-col"
      style={b.epingle ? { boxShadow: 'inset 0 0 0 1px rgba(var(--sk-gilt-rgb),0.45)' } : undefined}
    >
      {b.type === 'photo' && b.mediaUrl && (
        <img src={b.mediaUrl} alt={b.titre || ''} loading="lazy" className="w-full aspect-[4/3] object-cover" />
      )}
      {b.type === 'video' && b.videoUrl && (
        <div className="w-full aspect-video bg-black">
          {embed ? (
            <iframe
              src={embed} title={b.titre || (fr ? 'Vidéo' : 'Video')} loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen referrerPolicy="strict-origin-when-cross-origin"
              className="w-full h-full border-0"
            />
          ) : (
            <video controls preload="metadata" playsInline src={b.videoUrl} className="w-full h-full" />
          )}
        </div>
      )}

      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-center gap-2">
          <span className="witcher-stat-label inline-flex items-center gap-1.5"><def.Icone size={11} />{fr ? def.FR : def.EN}</span>
          {b.epingle && (
            <span className="inline-flex items-center gap-1 font-sans uppercase tracking-[0.18em] text-[9px]" style={{ color: 'var(--sk-gilt)' }}>
              <Pin size={10} /> {fr ? 'Épinglé' : 'Pinned'}
            </span>
          )}
          <span className="ml-auto inline-flex items-center gap-2">
            {onEpingler && (
              <button type="button" onClick={onEpingler} aria-label={b.epingle ? (fr ? 'Désépingler' : 'Unpin') : (fr ? 'Épingler' : 'Pin')}
                      className="text-ivory-soft/50 hover:text-brass transition-colors">
                {b.epingle ? <PinOff size={13} /> : <Pin size={13} />}
              </button>
            )}
            {onSupprimer && (
              <button type="button" onClick={onSupprimer} aria-label={fr ? 'Retirer' : 'Remove'}
                      className="text-ivory-soft/50 hover:text-[#E08A6E] transition-colors">
                <Trash2 size={13} />
              </button>
            )}
          </span>
        </div>

        {b.titre && <h3 className="font-display text-lg text-ivory leading-snug">{b.titre}</h3>}

        {b.texte && (
          <div>
            <p className={`font-editorial text-sm text-ivory-soft leading-relaxed whitespace-pre-line ${long && !tout ? 'line-clamp-6' : ''}`}>
              {b.texte}
            </p>
            {long && (
              <button type="button" onClick={() => setTout((v) => !v)}
                      className="mt-1 font-sans text-[11px] uppercase tracking-wider text-brass hover:text-brass-soft transition-colors">
                {tout ? (fr ? 'Voir moins' : 'Show less') : (fr ? 'Lire la suite' : 'Read more')}
              </button>
            )}
          </div>
        )}

        {b.type === 'formation' && b.fichierUrl && (
          <div className="flex items-center gap-3 flex-wrap">
            <a href={b.fichierUrl} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-2 px-4 py-2 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-[11px] font-semibold hover:bg-brass-soft transition rounded-card">
              {b.chemin ? <FileText size={13} /> : <ExternalLink size={13} />}
              {fr ? 'Ouvrir la formation' : 'Open the course'}
            </a>
            {b.duree && <span className="font-sans text-[11px]" style={{ color: 'rgba(var(--sk-parchment-rgb),0.55)' }}>{b.duree}</span>}
          </div>
        )}

        <Link to={`${addLocale('/profil', lang)}/${b.uid}`} className="mt-auto pt-2 flex items-center gap-2 group">
          <Medaillon nom={b.nom} url={b.avatarUrl} />
          <span className="min-w-0">
            <span className="block font-sans text-[12px] text-ivory truncate group-hover:text-brass transition-colors">{b.nom}</span>
            <span className="block font-sans text-[10px] text-ivory-soft/45">{quand(b, fr)}</span>
          </span>
        </Link>
      </div>
    </article>
  );
};

// ─── Le composeur ────────────────────────────────────────────────────
const Composeur: React.FC<{ guildeId: string; uid: string; fr: boolean }> = ({ guildeId, uid, fr }) => {
  const { user } = useAuth();
  const [type, setType] = useState<TypeVitrine>('texte');
  const [titre, setTitre] = useState('');
  const [texte, setTexte] = useState('');
  const [lien, setLien] = useState('');
  const [duree, setDuree] = useState('');
  const [fichier, setFichier] = useState<File | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [progression, setProgression] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const entree = useRef<HTMLInputElement>(null);
  const def = TYPES.find((t) => t.cle === type) || TYPES[0];

  useEffect(() => {
    if (!fichier || type === 'formation') { setApercu(null); return; }
    const u = URL.createObjectURL(fichier); setApercu(u);
    return () => URL.revokeObjectURL(u);
  }, [fichier, type]);

  const choisirType = (t: TypeVitrine) => { setType(t); setFichier(null); setLien(''); setErreur(null); };

  const choisirFichier = (f: File | null) => {
    if (!f) return;
    if (type === 'video' && f.size >= POIDS_MAX_VIDEO) { setErreur(fr ? 'La vidéo dépasse 80 Mo.' : 'The video is over 80 MB.'); return; }
    if (type === 'formation' && f.size >= POIDS_MAX_PDF) { setErreur(fr ? 'Le PDF dépasse 20 Mo.' : 'The PDF is over 20 MB.'); return; }
    setErreur(null); setFichier(f);
  };

  const pret = type === 'texte' ? texte.trim().length > 0
    : type === 'photo' ? !!fichier
    : !!fichier || lien.trim().length > 0;

  const envoyer = async () => {
    setEnvoi(true); setErreur(null); setProgression(0);
    try {
      const fiche = await lireFiche(uid).catch(() => null);
      await publier(guildeId, {
        uid,
        nom: fiche?.nom || user?.displayName || (fr ? 'Un inconnu' : 'A stranger'),
        avatarUrl: fiche?.avatarUrl || user?.photoURL || undefined,
      }, { type, titre, texte, fichier: fichier || undefined, lien, duree }, setProgression);
      setTitre(''); setTexte(''); setLien(''); setDuree(''); setFichier(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally { setEnvoi(false); setProgression(0); }
  };

  return (
    <section className="glass-light rounded-lg-card p-5 md:p-6">
      <div className="flex flex-wrap gap-1.5 mb-4" role="radiogroup" aria-label={fr ? 'Le genre du billet' : 'The kind of post'}>
        {TYPES.map((t) => {
          const actif = t.cle === type;
          return (
            <button
              key={t.cle} type="button" role="radio" aria-checked={actif} onClick={() => choisirType(t.cle)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-sans uppercase tracking-[0.16em] text-[10px] transition-colors"
              style={{
                border: `1px solid ${actif ? 'var(--sk-gilt)' : 'rgba(var(--sk-parchment-rgb),0.2)'}`,
                background: actif ? 'rgba(var(--sk-gilt-rgb),0.16)' : 'transparent',
                color: actif ? 'var(--sk-parchment)' : 'rgba(var(--sk-parchment-rgb),0.55)',
              }}
            >
              <t.Icone size={12} /> {fr ? t.FR : t.EN}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
        <input
          value={titre} onChange={(e) => setTitre(e.target.value.slice(0, LONGUEUR_MAX_TITRE))}
          placeholder={fr ? 'Un titre (facultatif)' : 'A title (optional)'}
          className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory placeholder:text-ivory-soft/40"
          style={champ}
        />
        {type === 'formation' && (
          <input
            value={duree} onChange={(e) => setDuree(e.target.value.slice(0, 40))}
            placeholder={fr ? 'Durée, par exemple 45 min' : 'Length, for example 45 min'}
            className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory placeholder:text-ivory-soft/40"
            style={champ}
          />
        )}
        {(type === 'video' || type === 'formation') && (
          <input
            value={lien} onChange={(e) => setLien(e.target.value)} inputMode="url"
            placeholder={type === 'video'
              ? (fr ? 'Lien YouTube, Vimeo ou mp4' : 'YouTube, Vimeo or mp4 link')
              : (fr ? 'Lien de la formation, à défaut d’un PDF' : 'Course link, if there is no PDF')}
            className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory placeholder:text-ivory-soft/40 lg:col-span-2"
            style={champ}
          />
        )}
      </div>

      <textarea
        value={texte} onChange={(e) => setTexte(e.target.value.slice(0, LONGUEUR_MAX_TEXTE))}
        rows={type === 'texte' ? 4 : 2}
        placeholder={fr ? 'Ce que le monde peut lire de votre groupe.' : 'What the world may read about your group.'}
        className="w-full mt-3 px-4 py-3 rounded-card font-sans text-sm text-ivory placeholder:text-ivory-soft/40 leading-relaxed"
        style={champ}
      />

      {fichier && (
        <div className="relative mt-3 inline-block max-w-full">
          {apercu && type === 'photo' && <img src={apercu} alt="" className="max-h-56 rounded-card object-cover" />}
          {apercu && type === 'video' && <video src={apercu} className="max-h-56 rounded-card" controls preload="metadata" />}
          {type === 'formation' && (
            <span className="inline-flex items-center gap-2 px-3.5 py-2 pr-10 rounded-card font-sans text-[12px] text-ivory" style={champ}>
              <FileText size={13} /> {fichier.name}
            </span>
          )}
          <button type="button" onClick={() => setFichier(null)} aria-label={fr ? 'Retirer le fichier' : 'Remove file'}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(var(--sk-ink-rgb),0.8)', color: 'var(--sk-parchment)' }}><X size={13} /></button>
        </div>
      )}

      {envoi && progression > 0 && (
        <div className="h-1 rounded-full overflow-hidden mt-3" style={{ background: 'rgba(var(--sk-parchment-rgb),0.12)' }}
             role="progressbar" aria-valuenow={Math.round(progression * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full transition-[width] duration-200" style={{ width: `${Math.round(progression * 100)}%`, background: 'var(--sk-gilt)' }} />
        </div>
      )}

      <div className="mt-3 flex items-center gap-3 flex-wrap">
        {def.accept && (
          <>
            <button type="button" onClick={() => entree.current?.click()}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full font-sans uppercase tracking-[0.18em] text-[10px] text-ivory-soft hover:text-brass transition-colors"
                    style={{ border: '1px solid rgba(var(--sk-parchment-rgb),0.2)' }}>
              <def.Icone size={13} />
              {type === 'photo' ? (fr ? 'Choisir la photo' : 'Pick the photo')
                : type === 'video' ? (fr ? 'Fichier mp4' : 'mp4 file')
                : (fr ? 'Déposer le PDF' : 'Drop the PDF')}
            </button>
            <input ref={entree} type="file" accept={def.accept} className="sr-only"
                   onChange={(e) => { choisirFichier(e.target.files?.[0] || null); e.target.value = ''; }} />
          </>
        )}
        <span className="ml-auto font-sans text-[10px] text-ivory-soft/45">{texte.length}/{LONGUEUR_MAX_TEXTE}</span>
        <button type="button" onClick={envoyer} disabled={envoi || !pret}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50">
          {envoi ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} {fr ? 'Publier' : 'Post'}
        </button>
      </div>
      {erreur && <p role="alert" className="mt-2 font-sans text-xs" style={{ color: '#E08A6E' }}>{erreur}</p>}
    </section>
  );
};

export default Vitrine;
