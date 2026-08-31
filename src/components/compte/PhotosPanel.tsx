import React, { useEffect, useState } from 'react';
import { Camera, Upload, Check, AlertCircle, Loader2, Eye, EyeOff, Star } from 'lucide-react';
import {
  televerserPhoto, suivreMesPhotos, changerVisibilite, changerVedette, reordonnerPhotos, TYPES_ACCEPTES, POIDS_MAX_ORIGINAL,
  type PhotoPublique, type StatutPhoto, type VisibilitePhoto,
} from '../../firebase/photosPubliques';
import { useBadges } from '../../contexts/BadgesContext';
import VisionneusePhoto from './VisionneusePhoto';

// ─── Panneau « Vos photos » de l'espace compte ──────────────────────
// Chaque membre peut téléverser ses photos du festival : glisser-déposer
// ou bouton, envoi multiple, redimensionnement côté navigateur avant
// l'envoi (voir photosPubliques.ts). Le consentement à la réutilisation
// est une case explicite, obligatoire avant le premier envoi ; le
// second choix, celui du crédit du nom, reste optionnel et suit chaque
// photo (Alex, 2026-08-23).

const STATUT_COULEUR: Record<StatutPhoto, string> = {
  attente: 'var(--sk-gilt)',
  retenue: '#8FD6B4',
  refusee: '#E08A6E',
};

interface FileEnEnvoi {
  id: string;
  nom: string;
  progres: number;
  statut: 'envoi' | 'erreur';
  erreur?: string;
}

function typeAccepte(file: File): boolean {
  if (TYPES_ACCEPTES.includes(file.type)) return true;
  // Certains appareils Android n'annoncent aucun type MIME pour un HEIC :
  // on retombe sur l'extension plutôt que de refuser à tort.
  if (file.type) return false;
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
}

function fmtDate(ts: PhotoPublique['envoyeeLe'], lang: 'FR' | 'EN'): string {
  if (!ts) return '';
  return ts.toDate().toLocaleDateString(lang === 'FR' ? 'fr-CA' : 'en-CA', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

const Case: React.FC<{ id: string; checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }> = ({
  id, checked, onChange, children,
}) => (
  <label htmlFor={id} className="flex items-start gap-3 cursor-pointer select-none">
    <span className="relative shrink-0 mt-0.5">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden
        className="flex items-center justify-center w-5 h-5 border transition-colors"
        style={{
          borderColor: checked ? 'var(--sk-gilt)' : 'rgba(var(--sk-parchment-rgb),0.35)',
          background: checked ? 'rgba(var(--sk-gilt-rgb),0.18)' : 'transparent',
        }}
      >
        {checked && <Check size={13} style={{ color: 'var(--sk-gilt)' }} />}
      </span>
    </span>
    <span className="font-sans text-sm leading-relaxed" style={{ color: 'rgba(var(--sk-parchment-rgb),0.85)', fontWeight: 300 }}>
      {children}
    </span>
  </label>
);

const PhotosPanel: React.FC<{ uid: string; nomMembre: string; lang: 'FR' | 'EN' }> = ({ uid, nomMembre, lang }) => {
  const fr = lang === 'FR';
  const t = fr ? FR : EN;

  const [photos, setPhotos]         = useState<PhotoPublique[]>([]);
  const [loading, setLoading]       = useState(true);
  const [consentement, setConsentement] = useState(false);
  const [credit, setCredit]         = useState(true);
  const [legende, setLegende]       = useState('');
  // Publique : paraît sur la fiche que les autres membres visitent.
  // Privée : entre la personne et l'équipe seulement (Alex, 2026-08-27).
  const [visibilite, setVisibilite] = useState<VisibilitePhoto>('publique');
  const { gagnerBadge } = useBadges();
  const [survol, setSurvol]         = useState(false);
  const [queue, setQueue]           = useState<FileEnEnvoi[]>([]);
  const [avis, setAvis]             = useState<string | null>(null);
  // La grille se réorganise en glissant une photo sur une autre
  // (Alex, 2026-08-27 : « comme la grille Instagram »). L'ordre local
  // suit la main tout de suite; Firestore reçoit la liste au lâcher.
  const [traine, setTraine] = useState<string | null>(null);
  const [survolId, setSurvolId] = useState<string | null>(null);
  // La visionneuse : ouverte en cliquant une vignette, ferme la
  // grille pour identifier des personnes (Alex, 2026-08-28).
  const [ouvertId, setOuvertId] = useState<string | null>(null);
  const ouverte = photos.find((p) => p.id === ouvertId) ?? null;
  const deposer = (cibleId: string) => {
    if (!traine || traine === cibleId) { setTraine(null); setSurvolId(null); return; }
    const ids = photos.map((p) => p.id);
    const de = ids.indexOf(traine), a = ids.indexOf(cibleId);
    if (de < 0 || a < 0) return;
    ids.splice(a, 0, ids.splice(de, 1)[0]);
    setPhotos((prev) => ids.map((id) => prev.find((p) => p.id === id)!).map((p, i) => ({ ...p, ordre: i })));
    setTraine(null); setSurvolId(null);
    void reordonnerPhotos(ids).catch(() => { /* hors ligne */ });
  };

  useEffect(() => {
    const unsub = suivreMesPhotos(uid, (p) => { setPhotos(p); setLoading(false); });
    return unsub;
  }, [uid]);

  const handleFiles = (list: FileList | null) => {
    const fichiers = Array.from(list ?? []);
    if (!fichiers.length) return;
    if (!consentement) { setAvis(t.errConsent); return; }
    setAvis(null);
    fichiers.forEach((file) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      if (!typeAccepte(file)) {
        setQueue((q) => [...q, { id, nom: file.name, progres: 0, statut: 'erreur', erreur: t.errType }]);
        return;
      }
      if (file.size > POIDS_MAX_ORIGINAL) {
        setQueue((q) => [...q, { id, nom: file.name, progres: 0, statut: 'erreur', erreur: t.errSize }]);
        return;
      }
      setQueue((q) => [...q, { id, nom: file.name, progres: 0, statut: 'envoi' }]);
      const nom = credit ? nomMembre : (fr ? 'Anonyme' : 'Anonymous');
      const { promise } = televerserPhoto(file, uid, nom, legende.trim() || undefined, (fraction) => {
        setQueue((q) => q.map((it) => (it.id === id ? { ...it, progres: fraction } : it)));
      }, visibilite);
      promise
        .then(() => { setQueue((q) => q.filter((it) => it.id !== id)); gagnerBadge('photographe'); })
        .catch((e) => setQueue((q) => q.map((it) => (
          it.id === id ? { ...it, statut: 'erreur', erreur: e instanceof Error ? e.message : String(e) } : it
        ))));
    });
  };

  return (
    <section
      className="relative p-6 md:p-8 overflow-hidden"
      style={{ background: 'rgba(var(--sk-deep-rgb), 0.55)', border: '1px solid rgba(var(--sk-parchment-rgb), 0.10)' }}
    >
      <header className="flex items-start gap-4 mb-5">
        <span className="witcher-tile shrink-0" style={{ width: 46, height: 46 }}>
          <span className="witcher-tile-inner" style={{ color: 'var(--sk-gilt)' }}>
            <Camera size={16} />
          </span>
        </span>
        <div className="min-w-0">
          <p className="witcher-stat-label mb-1.5">{t.eyebrow}</p>
          <h2 className="font-display text-2xl md:text-3xl leading-snug" style={{ color: 'var(--color-bone)', fontWeight: 400 }}>
            {t.title}
          </h2>
        </div>
      </header>

      <p className="font-sans text-sm md:text-[15px] leading-[1.7] mb-6" style={{ color: 'rgba(var(--sk-parchment-rgb), 0.7)', fontWeight: 300 }}>
        {t.lead}
      </p>

      {/* Consentement, explicite, obligatoire avant le premier envoi */}
      <div className="mb-6 p-4 space-y-3" style={{ background: 'rgba(var(--sk-gilt-rgb), 0.06)', border: '1px solid rgba(var(--sk-gilt-rgb), 0.3)' }}>
        <Case id="photos-consentement" checked={consentement} onChange={setConsentement}>
          {t.consentText}
        </Case>
        <Case id="photos-credit" checked={credit} onChange={setCredit}>
          {t.creditText}
        </Case>
      </div>

      <label className="block mb-4">
        <span className="block font-sans uppercase tracking-[0.25em] text-[10px] mb-2" style={{ color: 'var(--sk-gilt)' }}>
          {t.legendeLabel}
        </span>
        <input
          type="text"
          value={legende}
          onChange={(e) => setLegende(e.target.value)}
          placeholder={t.legendePh}
          className="witcher-input font-sans"
        />
      </label>

      {/* Publique ou privée : le choix se fait avant l'envoi, et se
          change après coup sur chaque photo. */}
      <div role="radiogroup" aria-label={t.visibiliteLabel} className="mb-4 flex flex-wrap items-center gap-2">
        <span className="font-sans uppercase tracking-[0.25em] text-[10px] mr-2" style={{ color: 'var(--sk-gilt)' }}>
          {t.visibiliteLabel}
        </span>
        {(['publique', 'privee'] as VisibilitePhoto[]).map((v) => {
          const actif = visibilite === v;
          const Icone = v === 'publique' ? Eye : EyeOff;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={actif}
              onClick={() => setVisibilite(v)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-sans uppercase tracking-[0.18em] text-[10px] transition-colors"
              style={{
                border: `1px solid ${actif ? 'var(--sk-gilt)' : 'rgba(var(--sk-parchment-rgb),0.22)'}`,
                background: actif ? 'rgba(var(--sk-gilt-rgb),0.16)' : 'transparent',
                color: actif ? 'var(--sk-parchment)' : 'rgba(var(--sk-parchment-rgb),0.55)',
              }}
            >
              <Icone size={12} /> {t.visibilite[v]}
            </button>
          );
        })}
        <span className="basis-full font-sans text-xs mt-1" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)', fontWeight: 300 }}>
          {t.visibiliteAide[visibilite]}
        </span>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => { e.preventDefault(); setSurvol(false); handleFiles(e.dataTransfer.files); }}
        className="relative rounded-card border-2 border-dashed transition-colors"
        style={{
          borderColor: survol ? 'var(--sk-gilt)' : 'rgba(var(--sk-parchment-rgb),0.22)',
          background: survol ? 'rgba(var(--sk-gilt-rgb),0.08)' : 'rgba(var(--sk-ink-rgb),0.35)',
        }}
      >
        <label htmlFor="photos-input" className="flex flex-col items-center justify-center gap-3 py-10 px-6 cursor-pointer text-center">
          <span className="witcher-tile" style={{ width: 56, height: 56 }}>
            <span className="witcher-tile-inner" style={{ color: 'var(--sk-gilt)' }}><Upload size={18} /></span>
          </span>
          <span className="font-sans text-sm" style={{ color: 'rgba(var(--sk-parchment-rgb),0.75)' }}>
            {survol ? t.deposezIci : t.glissezOuChoisissez}
          </span>
          <span className="witcher-prompt" data-primary="true">
            <span className="witcher-prompt-glyph"><span>+</span></span>
            {t.choisir}
          </span>
        </label>
        <input
          id="photos-input"
          type="file"
          accept={TYPES_ACCEPTES.join(',')}
          multiple
          className="sr-only"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
        />
      </div>

      {avis && (
        <p className="font-sans text-sm mt-3 flex items-center gap-1.5" style={{ color: '#E08A6E' }}>
          <AlertCircle size={13} /> {avis}
        </p>
      )}

      {queue.length > 0 && (
        <ul className="mt-4 space-y-2">
          {queue.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-3 py-2" style={{ background: 'rgba(var(--sk-deep-rgb),0.5)', border: '1px solid rgba(var(--sk-parchment-rgb),0.12)' }}>
              <span className="font-sans text-xs truncate flex-1" style={{ color: 'rgba(var(--sk-parchment-rgb),0.75)' }}>{f.nom}</span>
              {f.statut === 'envoi' ? (
                <>
                  <span className="w-24 h-1 overflow-hidden shrink-0" style={{ background: 'rgba(var(--sk-parchment-rgb),0.12)' }}>
                    <span className="block h-full transition-all" style={{ width: `${Math.round(f.progres * 100)}%`, background: 'var(--sk-gilt)' }} />
                  </span>
                  <Loader2 size={13} className="animate-spin shrink-0" style={{ color: 'var(--sk-gilt)' }} />
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-sans text-xs shrink-0" style={{ color: '#E08A6E' }}>
                  <AlertCircle size={13} /> {f.erreur}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <p className="witcher-stat-label mb-1">{t.envoyeesTitre}</p>
        {photos.length > 1 && (
          <p className="font-sans text-xs mb-3" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)', fontWeight: 300 }}>{t.reorganiser}</p>
        )}
        {loading ? (
          <p className="font-sans text-sm" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)', fontWeight: 300 }}>{t.chargement}</p>
        ) : photos.length === 0 ? (
          <p className="font-sans text-sm" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)', fontWeight: 300 }}>{t.aucune}</p>
        ) : (
          <div className="grid grid-cols-3 gap-[3px] md:gap-1">
            {photos.map((p) => (
              <div
                key={p.id}
                draggable
                onDragStart={() => setTraine(p.id)}
                onDragOver={(e) => { e.preventDefault(); if (survolId !== p.id) setSurvolId(p.id); }}
                onDragLeave={() => setSurvolId((v) => (v === p.id ? null : v))}
                onDrop={(e) => { e.preventDefault(); deposer(p.id); }}
                onDragEnd={() => { setTraine(null); setSurvolId(null); }}
                onClick={() => setOuvertId(p.id)}
                className="relative aspect-square overflow-hidden cursor-grab active:cursor-grabbing transition-transform"
                style={{
                  outline: survolId === p.id && traine && traine !== p.id ? '2px solid var(--sk-gilt)' : 'none',
                  outlineOffset: -2,
                  opacity: traine === p.id ? 0.45 : 1,
                  transform: survolId === p.id && traine && traine !== p.id ? 'scale(0.96)' : undefined,
                }}
              >
                <img
                  src={p.url}
                  alt={p.legende || ''}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* En vedette : la photo monte sur le profil, colonne de
                    droite, et devient publique du même coup. */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); changerVedette(p.id, !p.vedette); }}
                  aria-pressed={Boolean(p.vedette)}
                  aria-label={p.vedette ? t.retirerVedette : t.mettreVedette}
                  title={p.vedette ? t.retirerVedette : t.mettreVedette}
                  className="absolute top-1.5 left-1.5 flex items-center justify-center w-7 h-7 rounded-full"
                  style={{
                    background: p.vedette ? 'var(--sk-gilt)' : 'rgba(var(--sk-ink-rgb),0.78)',
                    border: `1px solid ${p.vedette ? 'var(--sk-gilt)' : 'rgba(var(--sk-parchment-rgb),0.25)'}`,
                    color: p.vedette ? 'var(--sk-deep)' : 'rgba(var(--sk-parchment-rgb),0.6)',
                  }}
                >
                  <Star size={12} fill={p.vedette ? 'currentColor' : 'none'} />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); if (p.vedette) { setAvis(t.vedetteReste); return; } void changerVisibilite(p.id, p.visibilite === 'publique' ? 'privee' : 'publique').catch(() => {}); }}
                  aria-label={`${t.basculer} · ${t.visibilite[p.visibilite === 'publique' ? 'publique' : 'privee']}`}
                  className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 px-2 py-1 rounded-full font-sans uppercase tracking-[0.15em] text-[9px]"
                  style={{
                    background: 'rgba(var(--sk-ink-rgb),0.78)',
                    border: `1px solid ${p.visibilite === 'publique' ? 'var(--sk-gilt)' : 'rgba(var(--sk-parchment-rgb),0.25)'}`,
                    color: p.visibilite === 'publique' ? 'var(--sk-gilt)' : 'rgba(var(--sk-parchment-rgb),0.6)',
                  }}
                >
                  {p.visibilite === 'publique' ? <Eye size={11} /> : <EyeOff size={11} />}
                  {t.visibilite[p.visibilite === 'publique' ? 'publique' : 'privee']}
                </button>
                <span
                  className="absolute bottom-0 left-0 right-0 px-2 py-1.5 font-sans uppercase tracking-[0.15em] text-[9px] flex items-center justify-between gap-2"
                  style={{ background: 'rgba(var(--sk-ink-rgb),0.78)', color: STATUT_COULEUR[p.statut] }}
                >
                  <span>{t.statut[p.statut]}</span>
                  <span style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)' }}>{fmtDate(p.envoyeeLe, lang)}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {ouverte && (
        <VisionneusePhoto
          photo={ouverte} lang={lang} onClose={() => setOuvertId(null)}
          moi={{ uid, nom: nomMembre }} proprietaire
        />
      )}
    </section>
  );
};

const FR = {
  eyebrow: 'Vos photos',
  title:   'Partagez vos photos du festival',
  lead:    'Vous avez de belles photos du festival ? Envoyez-les-nous. Notre équipe les regarde une à une, et celles qu’elle retient rejoignent nos affiches, nos pages et les éditions à venir.',
  consentText: 'En cochant cette case, j’autorise le festival à reprendre mes photos pour ses affiches, ses pages et ses éditions à venir.',
  creditText:  'Associer mon nom à mes photos envoyées.',
  legendeLabel: 'Une légende (facultatif)',
  legendePh:    'Où, quand, ce qui se passait',
  visibiliteLabel: 'Qui la voit',
  visibilite: { publique: 'Publique', privee: 'Privée' } as Record<VisibilitePhoto, string>,
  visibiliteAide: {
    publique: 'Les membres qui ouvrent votre fiche la verront dans votre galerie.',
    privee:   'Elle reste entre vous et l’équipe du festival.',
  } as Record<VisibilitePhoto, string>,
  basculer: 'Changer la visibilité',
  vedetteReste: 'Une photo en vedette reste publique. Retirez-la de la vedette d’abord.',
  mettreVedette: 'Mettre en vedette sur mon profil',
  retirerVedette: 'Retirer de la vedette',
  glissezOuChoisissez: 'Glissez vos photos ici, ou cliquez pour les choisir',
  deposezIci: 'Déposez-les ici',
  choisir:    'Choisir des photos',
  envoyeesTitre: 'Votre grille',
  reorganiser: 'Glissez une photo sur une autre pour réorganiser votre grille.',
  chargement: 'Chargement…',
  aucune:     'Aucune photo envoyée pour le moment.',
  errConsent: 'Cochez d’abord la case ci-dessus : c’est ce qui nous autorise à recevoir vos photos.',
  errType:    'Ce fichier n’est pas une image reconnue (JPEG, PNG, WEBP ou HEIC).',
  errSize:    'Cette photo dépasse 12 Mo. Choisissez-en une plus légère.',
  statut: { attente: 'En attente', retenue: 'Retenue', refusee: 'Non retenue' } as Record<StatutPhoto, string>,
};

const EN: typeof FR = {
  eyebrow: 'Your photos',
  title:   'Share your festival photos',
  lead:    'Got great photos from the festival? Send them our way. Our team looks at each one, and the photos we keep go on our posters, our pages, and future editions.',
  consentText: 'By checking this box, I authorize the festival to reuse my photos for its posters, its pages, and its future editions.',
  creditText:  'Credit my name on the photos I send.',
  legendeLabel: 'A caption (optional)',
  legendePh:    'Where, when, what was happening',
  visibiliteLabel: 'Who sees it',
  visibilite: { publique: 'Public', privee: 'Private' } as Record<VisibilitePhoto, string>,
  visibiliteAide: {
    publique: 'Members who open your card will see it in your gallery.',
    privee:   'It stays between you and the festival team.',
  } as Record<VisibilitePhoto, string>,
  basculer: 'Change visibility',
  vedetteReste: 'A featured photo stays public. Remove it from featured first.',
  mettreVedette: 'Feature on my profile',
  retirerVedette: 'Remove from featured',
  glissezOuChoisissez: 'Drag your photos here, or click to choose them',
  deposezIci: 'Drop them here',
  choisir:    'Choose photos',
  envoyeesTitre: 'Your grid',
  reorganiser: 'Drag a photo onto another to rearrange your grid.',
  chargement: 'Loading…',
  aucune:     'No photos sent yet.',
  errConsent: 'Check the box above first: that is what lets us receive your photos.',
  errType:    'This file is not a recognized image (JPEG, PNG, WEBP, or HEIC).',
  errSize:    'This photo is over 12 MB. Please choose a lighter one.',
  statut: { attente: 'Pending', retenue: 'Kept', refusee: 'Not kept' } as Record<StatutPhoto, string>,
};

export default PhotosPanel;
