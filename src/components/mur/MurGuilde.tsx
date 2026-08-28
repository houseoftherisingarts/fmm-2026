import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image as ImageIcon, Send, Loader2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { lireFiche } from '../../firebase/ordre';
import { lireGuilde } from '../../firebase/guildes';
import { publierSurLeMur, suivreLeMurDeGuilde, LONGUEUR_MAX_POST, type PostMur } from '../../firebase/mur';
import BilletCarte from './BilletCarte';

// ─── Le mur d'une guilde ───────────────────────────────────────────
// Alex, 2026-08-27 : même grammaire visuelle que MurSocial (le mur
// général), mais scopée à une seule guilde et sans les annonces du
// festival. MurSocial ne prend pas de prop `guildeId`, d'où ce
// composant séparé plutôt qu'une modification du fichier partagé.

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
        <BilletCarte
          key={post.id}
          lang={lang}
          post={post}
          delaiIndex={i}
          fond="rgba(26, 5, 11, 0.45)"
          bord="rgba(232,177,74,0.2)"
          peutEpingler={peutEpingler}
          bandeauEpingle={fr ? 'Épinglé dans la guilde' : 'Pinned in the guild'}
        />
      ))}
    </div>
  );
};

export default MurGuilde;
