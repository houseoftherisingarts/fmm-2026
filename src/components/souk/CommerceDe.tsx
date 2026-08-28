import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Facebook, Instagram, Mail, Phone, MapPin, Upload, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { addLocale } from '../../lib/locale';
import {
  getCommerce, upsertCommerce, televerserPhotosCommerce, soumettreCommerceCommeKiosque,
  MAX_PHOTOS_COMMERCE, type Commerce,
} from '../../firebase/souk';
import PhotosPicker from './PhotosPicker';

// ─── CommerceDe : la fiche de commerce d'un membre ───────────────────
// Une seule fiche par personne (docId == uid), l'équivalent d'une page
// Facebook non officielle. editable=true (le propriétaire) porte le
// formulaire de création/édition; editable=false affiche la fiche
// publique telle qu'un autre membre la voit.
interface Props {
  uid: string;
  lang: 'FR' | 'EN';
  editable: boolean;
}

const EMPTY: Omit<Commerce, 'uid' | 'photos' | 'chemins' | 'complet'> = {
  nom: '', description: '', categorie: '', site: '', courriel: '', telephone: '', ville: '',
  facebook: '', instagram: '',
  contact: '', hasParticipatedBefore: undefined, teamSize: '', familyVolunteerInterest: false,
  logoUrl: '', mainPhotoUrl: '', regionOfOrigin: '', firstTimeSource: '', otherQuestions: '',
};

const CommerceDe: React.FC<Props> = ({ uid, lang, editable }) => {
  const fr = lang === 'FR';
  const { user } = useAuth();
  const navigate = useNavigate();
  const [commerce, setCommerce] = useState<Commerce | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [photos, setPhotos] = useState<string[]>([]);
  const [nouvelles, setNouvelles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soumis, setSoumis] = useState(false);

  useEffect(() => {
    let live = true;
    getCommerce(uid).then((c) => {
      if (!live) return;
      setCommerce(c);
      if (c) { setForm({ ...EMPTY, ...c }); setPhotos(c.photos || []); }
      setLoaded(true);
    });
    return () => { live = false; };
  }, [uid]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((p) => ({ ...p, [k]: v }));

  const estComplet = (c: Pick<Commerce, 'nom' | 'description' | 'categorie' | 'photos'>) =>
    !!(c.nom.trim() && c.description.trim() && c.categorie.trim() && c.photos.length > 0);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.nom.trim() || !form.description.trim() || !form.categorie.trim()) {
      setError(fr ? 'Le nom, la description et la catégorie sont requis.' : 'Name, description and category are required.');
      return;
    }
    setBusy(true); setError(null);
    try {
      const { urls } = nouvelles.length ? await televerserPhotosCommerce(uid, nouvelles.slice(0, MAX_PHOTOS_COMMERCE - photos.length)) : { urls: [] };
      const toutesPhotos = [...photos, ...urls].slice(0, MAX_PHOTOS_COMMERCE);
      const next: Commerce = {
        ...form,
        uid,
        photos: toutesPhotos,
        chemins: commerce?.chemins || [],
        complet: estComplet({ nom: form.nom, description: form.description, categorie: form.categorie, photos: toutesPhotos, chemins: [] } as Commerce),
        creeLe: commerce?.creeLe,
      };
      await upsertCommerce(next);
      setCommerce(next);
      setPhotos(toutesPhotos);
      setNouvelles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const onSoumettreKiosque = async () => {
    if (!user || !commerce) return;
    setBusy(true); setError(null);
    try {
      const year = await soumettreCommerceCommeKiosque(commerce, user.email || '', user.displayName || form.nom);
      setSoumis(true);
      navigate(addLocale('/marche/inscription', lang) + `?year=${year}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  if (!loaded) return null;

  if (!editable) {
    if (!commerce || !commerce.complet) {
      return (
        <p className="font-editorial italic text-sm text-ivory-soft">
          {fr ? 'Aucun commerce pour le moment.' : 'No shop listed yet.'}
        </p>
      );
    }
    return <FicheLecture c={commerce} fr={fr} />;
  }

  return (
    <div className="space-y-6">
      {commerce?.complet && (
        <button
          type="button"
          onClick={onSoumettreKiosque}
          disabled={busy || soumis}
          className="witcher-prompt disabled:opacity-50" data-primary="true"
        >
          <Sparkles size={14} />
          {soumis ? (fr ? 'Envoyé' : 'Sent') : (fr ? 'Soumettre mon commerce comme kiosque' : 'Submit my shop as a kiosk')}
        </button>
      )}

      <form onSubmit={onSave} className="glass-light rounded-lg-card p-5 md:p-6 space-y-4">
        <p className="witcher-stat-label">{fr ? 'Ma fiche de commerce' : 'My shop listing'}</p>

        <div className="grid sm:grid-cols-2 gap-4">
          <Champ label={fr ? 'Nom du commerce' : 'Shop name'} value={form.nom} onChange={(v) => set('nom', v)} required />
          <Champ label={fr ? 'Catégorie' : 'Category'} value={form.categorie} onChange={(v) => set('categorie', v)} required />
        </div>
        <ChampTextarea label={fr ? 'Description' : 'Description'} value={form.description} onChange={(v) => set('description', v)} required />

        <div className="grid sm:grid-cols-3 gap-4">
          <Champ label={fr ? 'Site web' : 'Website'} value={form.site || ''} onChange={(v) => set('site', v)} placeholder="https://…" />
          <Champ label={fr ? 'Courriel de contact' : 'Contact email'} value={form.courriel || ''} onChange={(v) => set('courriel', v)} />
          <Champ label={fr ? 'Téléphone' : 'Phone'} value={form.telephone || ''} onChange={(v) => set('telephone', v)} />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Champ label={fr ? 'Ville' : 'City'} value={form.ville || ''} onChange={(v) => set('ville', v)} />
          <Champ label="Facebook" value={form.facebook || ''} onChange={(v) => set('facebook', v)} placeholder="facebook.com/…" />
          <Champ label="Instagram" value={form.instagram || ''} onChange={(v) => set('instagram', v)} placeholder="@…" />
        </div>

        <PhotosPicker
          lang={lang} max={MAX_PHOTOS_COMMERCE}
          photosExistantes={photos}
          onRetirerExistante={(url) => setPhotos((p) => p.filter((u) => u !== url))}
          nouvellesPhotos={nouvelles} onChangeNouvelles={setNouvelles}
        />

        {/* ── Champs Jesse (formulaire de kiosque, sauf le kiosque physique) ── */}
        <div className="pt-2 border-t border-ivory-soft/10">
          <p className="witcher-stat-label mb-3">{fr ? 'Pour un futur kiosque' : 'For a future kiosk'}</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Champ label={fr ? 'Personne-contact' : 'Contact person'} value={form.contact || ''} onChange={(v) => set('contact', v)} />
            <Champ label={fr ? 'Combien dans l’équipe' : 'Team size'} value={form.teamSize || ''} onChange={(v) => set('teamSize', v)} />
          </div>
          <label className="flex items-center gap-2 mt-3 font-editorial text-sm text-ivory-soft cursor-pointer">
            <input type="checkbox" checked={!!form.hasParticipatedBefore}
                   onChange={(e) => set('hasParticipatedBefore', e.target.checked)} />
            {fr ? 'Déjà exposant chez nous' : 'Already exhibited with us'}
          </label>
          <label className="flex items-center gap-2 mt-2 font-editorial text-sm text-ivory-soft cursor-pointer">
            <input type="checkbox" checked={!!form.familyVolunteerInterest}
                   onChange={(e) => set('familyVolunteerInterest', e.target.checked)} />
            {fr ? 'Quelqu’un de l’équipe veut être bénévole' : 'Someone on the team wants to volunteer'}
          </label>
          <div className="grid sm:grid-cols-2 gap-4 mt-3">
            <ImageSlot label={fr ? 'Logo' : 'Logo'} value={form.logoUrl} uid={uid}
                       onUploaded={(url) => set('logoUrl', url)} />
            <ImageSlot label={fr ? 'Photo principale' : 'Main photo'} value={form.mainPhotoUrl} uid={uid}
                       onUploaded={(url) => set('mainPhotoUrl', url)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mt-3">
            <Champ label={fr ? 'Région d’origine' : 'Home region'} value={form.regionOfOrigin || ''} onChange={(v) => set('regionOfOrigin', v)} />
            <Champ label={fr ? 'Comment vous nous avez connus' : 'How you found us'} value={form.firstTimeSource || ''} onChange={(v) => set('firstTimeSource', v)} />
          </div>
          <ChampTextarea label={fr ? 'Autres questions' : 'Other questions'} value={form.otherQuestions || ''} onChange={(v) => set('otherQuestions', v)} />
        </div>

        {error && <p className="font-editorial italic text-xs text-blush">{error}</p>}
        <button type="submit" disabled={busy} className="witcher-prompt disabled:opacity-50" data-primary="true">
          {busy ? (fr ? 'Enregistrement…' : 'Saving…') : (fr ? 'Enregistrer' : 'Save')}
        </button>
      </form>
    </div>
  );
};

// ─── Sous-composants ──────────────────────────────────────────────────

const Champ: React.FC<{ label: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string }> = ({
  label, value, onChange, required, placeholder,
}) => (
  <label className="block">
    <span className="block font-display title-medieval text-xs text-brass mb-1.5 tracking-wider">{label}{required && <span className="text-blush ml-0.5">*</span>}</span>
    <input className="witcher-input font-sans" value={value} placeholder={placeholder}
           onChange={(e) => onChange(e.target.value)} required={required} />
  </label>
);

const ChampTextarea: React.FC<{ label: string; value: string; onChange: (v: string) => void; required?: boolean }> = ({
  label, value, onChange, required,
}) => (
  <label className="block">
    <span className="block font-display title-medieval text-xs text-brass mb-1.5 tracking-wider">{label}{required && <span className="text-blush ml-0.5">*</span>}</span>
    <textarea className="witcher-input font-sans resize-y min-h-[80px]" rows={3} value={value}
              onChange={(e) => onChange(e.target.value)} required={required} />
  </label>
);

const ImageSlot: React.FC<{ label: string; value?: string; uid: string; onUploaded: (url: string) => void }> = ({
  label, value, uid, onUploaded,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const { urls } = await televerserPhotosCommerce(uid, [file]);
      if (urls[0]) onUploaded(urls[0]);
    } finally { setBusy(false); }
  };
  return (
    <div>
      <span className="block font-display title-medieval text-xs text-brass mb-1.5 tracking-wider">{label}</span>
      <button type="button" onClick={() => inputRef.current?.click()}
              className="relative w-full aspect-[16/10] rounded-card border-2 border-dashed border-ivory-soft/25 hover:border-brass/60 overflow-hidden flex items-center justify-center">
        {value ? <img src={value} alt={label} className="absolute inset-0 w-full h-full object-contain" /> : (
          <Upload size={18} className="text-ivory-soft" />
        )}
        {busy && <span className="absolute inset-0 bg-midnight-deep/60" />}
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="sr-only"
             onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
  );
};

const FicheLecture: React.FC<{ c: Commerce; fr: boolean }> = ({ c }) => (
  <div className="glass-light rounded-lg-card p-5 md:p-6 space-y-4">
    <p className="font-display title-medieval text-xl text-ivory">{c.nom}</p>
    <p className="font-sans text-xs uppercase tracking-widest text-brass">{c.categorie}</p>
    <p className="font-editorial text-sm text-ivory-soft leading-relaxed">{c.description}</p>
    {c.photos.length > 0 && (
      <div className="flex flex-wrap gap-3">
        {c.photos.map((url) => (
          <img key={url} src={url} alt="" className="w-20 h-20 rounded-card object-cover border border-brass/20" />
        ))}
      </div>
    )}
    <div className="flex flex-wrap gap-4 text-sm text-ivory-soft font-sans">
      {c.ville && <span className="inline-flex items-center gap-1.5"><MapPin size={13} />{c.ville}</span>}
      {c.telephone && <span className="inline-flex items-center gap-1.5"><Phone size={13} />{c.telephone}</span>}
      {c.courriel && <span className="inline-flex items-center gap-1.5"><Mail size={13} />{c.courriel}</span>}
      {c.site && <a href={c.site} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-brass hover:underline"><Globe size={13} />{c.site}</a>}
      {c.facebook && <a href={c.facebook} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-brass hover:underline"><Facebook size={13} />Facebook</a>}
      {c.instagram && <a href={c.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-brass hover:underline"><Instagram size={13} />Instagram</a>}
    </div>
  </div>
);

export default CommerceDe;
