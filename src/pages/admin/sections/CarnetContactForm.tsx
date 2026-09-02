import React, { useState } from 'react';
import { X, Check, Camera, Siren } from 'lucide-react';
import { Card } from '../primitives';
import {
  uploadContactPhoto,
  ROLE_LABEL, ROLE_ORDER, ALLEGIANCE_LABEL, ALLEGIANCE_ORDER,
  type Contact, type ContactRole, type Allegiance,
} from '../../../firebase/carnetContacts';

// ─── Le formulaire du carnet et du bottin ────────────────────────────
// Sorti de CarnetContactsSection.tsx le 2026-09-02, quand le bottin des
// ressources a fait passer la section au-dessus des 500 lignes que le
// dépôt s'impose. Ce fichier porte aussi les trois petites pièces que la
// section et le formulaire partagent (le champ étiqueté, le style des
// entrées, le portrait), pour que les imports n'aillent que dans un
// sens : la section importe le formulaire, jamais l'inverse.

export const inputCls =
  'w-full px-3 py-2 rounded-card border border-ivory-soft/20 bg-midnight-deep/50 text-ivory placeholder:text-stone focus:border-brass focus:outline-none text-sm font-sans';

export const Field: React.FC<{ label: string; children: React.ReactNode; full?: boolean }> = ({ label, children, full }) => (
  <div className={full ? 'sm:col-span-2' : ''}>
    <label className="block font-display title-medieval text-[10px] text-brass uppercase tracking-widest mb-1.5">
      {label}
    </label>
    {children}
  </div>
);

const initialsOf = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase() || '?';

export const Portrait: React.FC<{ name: string; photoUrl?: string; size: number }> = ({ name, photoUrl, size }) => (
  <div className="relative shrink-0 rounded-full overflow-hidden flex items-center justify-center"
    style={{
      width: size, height: size,
      border: '1px solid rgba(216, 176, 90, 0.55)',
      background: 'radial-gradient(circle at 35% 28%, rgba(216,176,90,0.18), rgba(26,5,11,0.9))',
    }}>
    {photoUrl ? (
      <img src={photoUrl} alt="" className="absolute inset-0 w-full h-full object-cover" decoding="async" />
    ) : (
      <span className="font-display title-medieval text-brass" style={{ fontSize: size * 0.34 }}>{initialsOf(name)}</span>
    )}
  </div>
);

const ContactForm: React.FC<{
  initial: Contact | null;
  onCancel: () => void;
  onSubmit: (data: Omit<Contact, 'id'>, id?: string) => void;
}> = ({ initial, onCancel, onSubmit }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [role, setRole] = useState<ContactRole>(initial?.role ?? 'organisateur');
  const [allegiance, setAllegiance] = useState<Allegiance>(initial?.allegiance ?? 'neutre');
  const [fonction, setFonction] = useState(initial?.fonction ?? '');
  const [organisation, setOrganisation] = useState(initial?.organisation ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [adresse, setAdresse] = useState(initial?.adresse ?? '');
  const [urgence, setUrgence] = useState(initial?.urgence ?? false);
  const [verifieLe, setVerifieLe] = useState(initial?.verifieLe ?? '');
  const [source, setSource] = useState(initial?.source ?? '');
  const [lastContactAt, setLastContactAt] = useState(initial?.lastContactAt ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [photoUrl, setPhotoUrl] = useState(initial?.photoUrl ?? '');
  const [photoPath, setPhotoPath] = useState(initial?.photoPath ?? '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const onPickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setUploadingPhoto(true); setPhotoError(null);
    try {
      const { url, path } = await uploadContactPhoto(file);
      setPhotoUrl(url); setPhotoPath(path);
    } catch (e) {
      console.warn('[CarnetContactForm] uploadContactPhoto failed:', e);
      setPhotoError('Échec du téléversement de la photo.');
    }
    setUploadingPhoto(false);
  };

  return (
    <Card className="p-5 md:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="font-display title-medieval text-lg text-ivory">{initial ? 'Édition' : 'Nouvelle fiche'}</h3>
        <button onClick={onCancel} aria-label="Fermer le formulaire" className="text-ivory-soft/60 hover:text-ivory transition"><X size={16} /></button>
      </div>

      <form onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({
          name: name.trim(), role, allegiance,
          fonction: fonction.trim(), organisation: organisation.trim(),
          email: email.trim(), phone: phone.trim(),
          adresse: adresse.trim(), urgence, verifieLe, source: source.trim(),
          lastContactAt, notes: notes.trim(),
          photoUrl, photoPath,
          archived: initial?.archived ?? false,
          order: initial?.order ?? Date.now(),
        }, initial?.id);
      }} className="space-y-4">
        <div className="flex items-center gap-4">
          <Portrait name={name || '?'} photoUrl={photoUrl} size={56} />
          <div>
            <label className="witcher-prompt cursor-pointer inline-flex items-center gap-1.5 font-sans uppercase tracking-[0.2em] text-[10px] text-ivory-soft hover:text-brass transition">
              <Camera size={12} /> {photoUrl ? 'Changer la photo' : 'Ajouter une photo'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onPickPhoto(e.target.files?.[0])} />
            </label>
            {uploadingPhoto && <p className="font-sans text-[11px] text-ivory-soft/60 mt-1">Envoi…</p>}
            {photoError && <p className="font-sans text-[11px] text-blush mt-1">{photoError}</p>}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="Nom ou organisme" full>
            <input value={name} onChange={(e) => setName(e.target.value)} required
              placeholder="Ex. : Municipalité de Montpellier" className={inputCls} />
          </Field>
          <Field label="Famille">
            <select value={role} onChange={(e) => setRole(e.target.value as ContactRole)} className={inputCls}>
              {ROLE_ORDER.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </Field>
          <Field label="Allégeance">
            <select value={allegiance} onChange={(e) => setAllegiance(e.target.value as Allegiance)} className={inputCls}>
              {ALLEGIANCE_ORDER.map((a) => <option key={a} value={a}>{ALLEGIANCE_LABEL[a]}</option>)}
            </select>
          </Field>
          <Field label="Personne et rôle">
            <input value={fonction} onChange={(e) => setFonction(e.target.value)}
              placeholder="Ex. : Marie Tremblay, directrice générale" className={inputCls} />
          </Field>
          <Field label="Organisation">
            <input value={organisation} onChange={(e) => setOrganisation(e.target.value)}
              placeholder="Ex. : MRC de Papineau" className={inputCls} />
          </Field>
          <Field label="Téléphone">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="819 000-0000 poste 000" className={inputCls} />
          </Field>
          <Field label="Courriel">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nom@exemple.ca" className={inputCls} />
          </Field>
          <Field label="Adresse" full>
            <input value={adresse} onChange={(e) => setAdresse(e.target.value)}
              placeholder="Ex. : 6 rue de l'Église, Montpellier (Québec)" className={inputCls} />
          </Field>
          <Field label="Vérifié le">
            <input type="date" value={verifieLe} onChange={(e) => setVerifieLe(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Dernier contact">
            <input type="date" value={lastContactAt} onChange={(e) => setLastContactAt(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Source des coordonnées" full>
            <input value={source} onChange={(e) => setSource(e.target.value)}
              placeholder="Ex. : municipalitedemontpellier.ca, page Nous joindre" className={inputCls} />
          </Field>
          <Field label="Notes" full>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Heures d'ouverture, quoi appeler pour quoi, contexte de la relation…" className={`${inputCls} resize-y`} />
          </Field>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer w-fit">
          <input type="checkbox" checked={urgence} onChange={(e) => setUrgence(e.target.checked)}
            className="w-4 h-4 accent-blush" />
          <span className="inline-flex items-center gap-1.5 font-sans text-xs text-ivory-soft">
            <Siren size={13} className="text-blush" />
            Épingler au bandeau d'urgence, en tête du bottin
          </span>
        </label>

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-ivory-soft hover:text-ivory text-xs font-sans uppercase tracking-wider">Annuler</button>
          <button type="submit"
            className="px-4 py-2 bg-brass text-midnight-deep font-sans text-xs uppercase tracking-wider font-semibold rounded-card hover:bg-brass-soft transition inline-flex items-center gap-1.5">
            <Check size={12} /> {initial ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </form>
    </Card>
  );
};

export default ContactForm;
