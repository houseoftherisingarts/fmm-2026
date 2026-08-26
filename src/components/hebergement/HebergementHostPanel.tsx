import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Upload, X, Check, Loader2, ImagePlus, AlertCircle } from 'lucide-react';
import {
  soumettreHebergement, MAX_BYTES, MAX_PHOTOS, type HebergementSaisie,
} from '../../firebase/hebergementPartenaires';

// ─── Panneau « Affichez votre hébergement » (page Hébergement) ─────────
// Flux à deux temps demandé par Alex : le bouton ouvre d'abord un
// formulaire (nom, courriel, téléphone, lien, photos), et le lien de
// paiement Zeffy n'apparaît qu'une fois la fiche envoyée. Style repris
// de la page (velvet-card, brass, witcher-input) pour que le panneau ait
// l'air d'appartenir à la section, pas d'un formulaire greffé.

export interface HostStrings {
  hostCta:                 string;
  hostFormIntro:           string;
  hostFieldNom:            string;
  hostFieldNomPlaceholder: string;
  hostFieldCourriel:       string;
  hostFieldTelephone:      string;
  hostFieldLien:           string;
  hostFieldLienPlaceholder:string;
  hostFieldPhotos:         string;
  hostPhotosHint:          string;
  hostPhotosAdd:           string;
  hostSubmit:              string;
  hostSubmitting:          string;
  hostBack:                string;
  hostSuccessTitle:        string;
  hostSuccessBody:         string;
  hostPayCta:              string;
  errNom:                  string;
  errCourriel:             string;
  errTelephone:            string;
  errLien:                 string;
  errPhotos:               string;
  errReseau:               string;
  errPhotoPoids:           string;
  errTropDePhotos:         string;
}

const ZEFFY_URL = 'https://www.zeffy.com/fr-CA/ticketing/partenaires-hebergement';
const EMAIL_RE  = /^[^@\s]+@[^@\s]+\.[a-zA-Z]+$/;

type Etat = 'idle' | 'form' | 'submitting' | 'success';

interface PhotoLocale { file: File; url: string; }

interface FieldErrors {
  nom?:       string;
  courriel?:  string;
  telephone?: string;
  lien?:      string;
  photos?:    string;
}

const HebergementHostPanel: React.FC<{ t: HostStrings }> = ({ t }) => {
  const [etat, setEtat]       = useState<Etat>('idle');
  const [nom, setNom]         = useState('');
  const [courriel, setCourriel] = useState('');
  const [telephone, setTelephone] = useState('');
  const [lien, setLien]       = useState('');
  const [photos, setPhotos]   = useState<PhotoLocale[]>([]);
  const [errors, setErrors]   = useState<FieldErrors>({});
  const [reseauErr, setReseauErr] = useState<string | null>(null);
  const [progress, setProgress]   = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Libère les aperçus (object URLs) au démontage.
  useEffect(() => () => { photos.forEach((p) => URL.revokeObjectURL(p.url)); }, [photos]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setReseauErr(null);
    const incoming = Array.from(list).filter((f) => f.type.startsWith('image/'));
    setPhotos((prev) => {
      const room = MAX_PHOTOS - prev.length;
      if (room <= 0) { setErrors((e) => ({ ...e, photos: t.errTropDePhotos })); return prev; }
      const tooBig = incoming.find((f) => f.size > MAX_BYTES);
      if (tooBig) setErrors((e) => ({ ...e, photos: t.errPhotoPoids }));
      const kept = incoming.filter((f) => f.size <= MAX_BYTES).slice(0, room);
      if (kept.length) setErrors((e) => ({ ...e, photos: undefined }));
      return [...prev, ...kept.map((f) => ({ file: f, url: URL.createObjectURL(f) }))];
    });
    if (inputRef.current) inputRef.current.value = '';
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      URL.revokeObjectURL(prev[idx].url);
      return next;
    });
  };

  const normaliseLien = (raw: string): string => {
    const v = raw.trim();
    if (!v) return '';
    return /^https?:\/\//i.test(v) ? v : `https://${v}`;
  };

  const validate = (): { ok: boolean; lienFinal: string } => {
    const next: FieldErrors = {};
    if (nom.trim().length < 2)          next.nom = t.errNom;
    if (!EMAIL_RE.test(courriel.trim())) next.courriel = t.errCourriel;
    if (telephone.trim().replace(/\D/g, '').length < 7) next.telephone = t.errTelephone;
    const lienFinal = normaliseLien(lien);
    if (!/^https?:\/\/.+\..+/i.test(lienFinal)) next.lien = t.errLien;
    if (photos.length === 0)            next.photos = t.errPhotos;
    setErrors(next);
    return { ok: Object.keys(next).length === 0, lienFinal };
  };

  const submit = async () => {
    setReseauErr(null);
    const { ok, lienFinal } = validate();
    if (!ok) return;
    setEtat('submitting');
    setProgress(0);
    const saisie: HebergementSaisie = {
      nom: nom.trim(), courriel: courriel.trim(), telephone: telephone.trim(), lien: lienFinal,
    };
    try {
      await soumettreHebergement(saisie, photos.map((p) => p.file), setProgress);
      setEtat('success');
    } catch (err) {
      setReseauErr(err instanceof Error && /Mo|image|photo/i.test(err.message) ? err.message : t.errReseau);
      setEtat('form');
    }
  };

  // ── Idle : le bouton d'ouverture ─────────────────────────────────
  if (etat === 'idle') {
    return (
      <button
        type="button"
        onClick={() => setEtat('form')}
        className="inline-flex items-center gap-2 px-6 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition-colors rounded-pill"
      >
        {t.hostCta} <ArrowUpRight size={14} />
      </button>
    );
  }

  // ── Succès : remerciement + Confirmer et payer ───────────────────
  if (etat === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="velvet-card rounded-card border border-brass/40 bg-midnight-deep/60 p-7 md:p-10 text-center"
      >
        <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-emerald-500/15 border border-emerald-400/50 flex items-center justify-center">
          <Check size={26} className="text-emerald-300" />
        </div>
        <h3 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-3">{t.hostSuccessTitle}</h3>
        <div className="divider-brass w-14 mx-auto mb-4" />
        <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed mb-7 max-w-xl mx-auto">
          {t.hostSuccessBody}
        </p>
        <a
          href={ZEFFY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-7 py-3.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition-colors rounded-pill shadow-[0_0_30px_rgba(196,164,90,0.22)]"
        >
          {t.hostPayCta} <ArrowUpRight size={15} />
        </a>
      </motion.div>
    );
  }

  // ── Formulaire (form + submitting) ───────────────────────────────
  const busy = etat === 'submitting';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
      className="velvet-card rounded-card border border-brass/30 bg-midnight-deep/55 p-6 md:p-8 text-left"
    >
      <p className="font-editorial text-sm md:text-base text-ivory-soft leading-relaxed mb-6 text-center">
        {t.hostFormIntro}
      </p>

      <div className="grid sm:grid-cols-2 gap-x-5 gap-y-4">
        <HostField label={t.hostFieldNom} error={errors.nom}>
          <input
            type="text" value={nom} onChange={(e) => setNom(e.target.value)}
            placeholder={t.hostFieldNomPlaceholder} disabled={busy}
            autoComplete="name" className="witcher-input font-sans"
          />
        </HostField>
        <HostField label={t.hostFieldCourriel} error={errors.courriel}>
          <input
            type="email" value={courriel} onChange={(e) => setCourriel(e.target.value)}
            placeholder="nom@exemple.com" disabled={busy}
            autoComplete="email" className="witcher-input font-sans"
          />
        </HostField>
        <HostField label={t.hostFieldTelephone} error={errors.telephone}>
          <input
            type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)}
            placeholder="819 555 0123" disabled={busy}
            autoComplete="tel" className="witcher-input font-sans"
          />
        </HostField>
        <HostField label={t.hostFieldLien} error={errors.lien}>
          <input
            type="url" value={lien} onChange={(e) => setLien(e.target.value)}
            placeholder={t.hostFieldLienPlaceholder} disabled={busy}
            inputMode="url" className="witcher-input font-sans"
          />
        </HostField>
      </div>

      {/* Photos */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between mb-1.5">
          <p className="font-display title-medieval text-xs text-brass tracking-wider">
            {t.hostFieldPhotos}<span className="text-blush ml-0.5">*</span>
          </p>
          <span className="font-sans text-[10px] uppercase tracking-widest text-stone tabular-nums">
            {photos.length} / {MAX_PHOTOS}
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {photos.map((p, i) => (
            <div key={p.url} className="relative aspect-square rounded-card overflow-hidden border border-brass/40 bg-midnight-deep/50">
              <img src={p.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              {!busy && (
                <button
                  type="button" onClick={() => removePhoto(i)} aria-label="Retirer la photo"
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-midnight-deep/85 border border-blush/50 text-blush flex items-center justify-center hover:bg-blush hover:text-midnight-deep transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}

          {photos.length < MAX_PHOTOS && !busy && (
            <button
              type="button" onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-card border-2 border-dashed border-ivory-soft/25 bg-midnight-deep/40 hover:border-brass/60 hover:bg-midnight-deep/60 transition-colors flex flex-col items-center justify-center gap-2 text-ivory-soft"
            >
              <span className="w-9 h-9 rounded-full bg-brass/15 border border-brass/40 flex items-center justify-center">
                <ImagePlus size={17} className="text-brass" />
              </span>
              <span className="font-sans text-[10px] uppercase tracking-widest">{t.hostPhotosAdd}</span>
            </button>
          )}
        </div>

        <input
          ref={inputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />

        {errors.photos
          ? <p data-field-error="true" className="font-editorial italic text-xs text-blush mt-2 flex items-center gap-1.5"><AlertCircle size={12} /> {errors.photos}</p>
          : <p className="font-editorial italic text-xs text-stone mt-2">{t.hostPhotosHint}</p>}
      </div>

      {/* Progress pendant l'envoi */}
      <AnimatePresence>
        {busy && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mt-6 overflow-hidden"
          >
            <div className="h-1.5 rounded-full bg-ivory-soft/15 overflow-hidden">
              <motion.div
                className="h-full bg-brass"
                animate={{ width: `${Math.round(progress * 100)}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {reseauErr && (
        <p data-field-error="true" className="font-editorial italic text-sm text-blush mt-4 flex items-center gap-2">
          <AlertCircle size={14} /> {reseauErr}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-7">
        <button
          type="button" onClick={submit} disabled={busy}
          className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition-colors rounded-pill disabled:opacity-70 disabled:cursor-wait min-w-[200px]"
        >
          {busy
            ? <><Loader2 size={15} className="animate-spin" /> {t.hostSubmitting}</>
            : <><Upload size={15} /> {t.hostSubmit}</>}
        </button>
        {!busy && (
          <button
            type="button" onClick={() => setEtat('idle')}
            className="font-sans text-xs uppercase tracking-widest text-ivory-soft/70 hover:text-brass transition-colors"
          >
            {t.hostBack}
          </button>
        )}
      </div>
    </motion.div>
  );
};

const HostField: React.FC<{ label: string; error?: string; children: React.ReactNode }> = ({ label, error, children }) => (
  <label className="block">
    <span className="block font-display title-medieval text-xs text-brass mb-1.5 tracking-wider">
      {label}<span className="text-blush ml-0.5">*</span>
    </span>
    {children}
    {error && (
      <p data-field-error="true" className="font-editorial italic text-xs text-blush mt-1.5 flex items-center gap-1.5">
        <AlertCircle size={11} /> {error}
      </p>
    )}
  </label>
);

export default HebergementHostPanel;
