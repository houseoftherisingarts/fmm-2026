import React, { useEffect, useMemo, useState } from 'react';
import {
  BookUser, Plus, X, Pencil, Check, Search, ChevronLeft, Mail, Phone, Building2,
  ShieldCheck, ShieldQuestion, Swords, Archive, ArchiveRestore, Camera,
} from 'lucide-react';
import { Card, EmptyState, GhostButton, PrimaryButton, fmtDate } from '../primitives';
import {
  listContacts, addContact, updateContact, setContactArchived, uploadContactPhoto,
  ROLE_LABEL, ROLE_ORDER, ALLEGIANCE_LABEL, ALLEGIANCE_ORDER,
  type Contact, type ContactRole, type Allegiance,
} from '../../../firebase/carnetContacts';

// ─── Carnet de contacts ──────────────────────────────────────────────
// Façon fiches de PNJ du Quest Book (Witcher) : liste + fiche détaillée.
// Toutes les personnes qui comptent pour l'organisation du festival —
// organisateurs, élus, partenaires, fournisseurs — avec leur rôle et
// leur allégeance.
//
// ⚠️ L'allégeance et les notes sont des données SENSIBLES sur des
// personnes réelles (ex. « le maire est un adversaire »). Cette section
// est admin only (super/CA/organisateurs, voir adminPermissions.ts) et
// n'a AUCUNE lecture publique côté Firestore/Storage — ne jamais
// ajouter de chemin public à ces données.

const ALLEGIANCE_META: Record<Allegiance, { icon: React.ComponentType<{ size?: number; className?: string }>; color: string }> = {
  allie:      { icon: ShieldCheck,    color: '#5FD3A2' },
  neutre:     { icon: ShieldQuestion, color: '#9A988A' },
  adversaire: { icon: Swords,         color: '#FCA5B0' },
};

const inputCls =
  'w-full px-3 py-2 rounded-card border border-ivory-soft/20 bg-midnight-deep/50 text-ivory placeholder:text-stone focus:border-brass focus:outline-none text-sm font-sans';

const Field: React.FC<{ label: string; children: React.ReactNode; full?: boolean }> = ({ label, children, full }) => (
  <div className={full ? 'sm:col-span-2' : ''}>
    <label className="block font-display title-medieval text-[10px] text-brass uppercase tracking-widest mb-1.5">
      {label}
    </label>
    {children}
  </div>
);

const ErrorBanner: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => (
  <Card className="p-4 border border-blush/40 bg-blush/8">
    <div className="flex items-center justify-between gap-3">
      <p className="font-sans text-sm text-blush">{message}</p>
      <button onClick={onClose} className="text-blush/60 hover:text-blush transition shrink-0"><X size={14} /></button>
    </div>
  </Card>
);

const AllegianceSeal: React.FC<{ allegiance: Allegiance; size?: number }> = ({ allegiance, size = 12 }) => {
  const { icon: Icon, color } = ALLEGIANCE_META[allegiance];
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-card border font-sans uppercase tracking-widest text-[10px]"
      style={{ color, borderColor: `${color}55`, background: `${color}14` }}>
      <Icon size={size} /> {ALLEGIANCE_LABEL[allegiance]}
    </span>
  );
};

const initialsOf = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase() || '?';

const CarnetContactsSection: React.FC = () => {
  const [items, setItems] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<ContactRole | 'all'>('all');
  const [allegianceFilter, setAllegianceFilter] = useState<Allegiance | 'all'>('all');
  const [showArchived, setShowArchived] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);

  const reload = async () => {
    try {
      setItems(await listContacts());
      setError(null);
    } catch (e) {
      console.warn('[CarnetContactsSection] listContacts failed:', e);
      setItems([]);
      setError('Impossible de charger le carnet. Vérifiez la configuration Firebase.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => items.filter((c) => {
    if (!showArchived && c.archived) return false;
    if (roleFilter !== 'all' && c.role !== roleFilter) return false;
    if (allegianceFilter !== 'all' && c.allegiance !== allegianceFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${c.name} ${c.fonction} ${c.organisation}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [items, search, roleFilter, allegianceFilter, showArchived]);

  const selected = selectedId ? items.find((c) => c.id === selectedId) ?? null : null;

  const onSave = async (data: Omit<Contact, 'id'>, id?: string) => {
    try {
      if (id) await updateContact(id, data);
      else await addContact(data);
      setError(null);
    } catch (e) {
      console.warn('[CarnetContactsSection] save contact failed:', e);
      setError('Échec de la sauvegarde.');
    }
    setShowAdd(false); setEditing(null); reload();
  };

  const onToggleArchived = async (c: Contact) => {
    try {
      await setContactArchived(c.id, !c.archived);
      setError(null);
    } catch (e) {
      console.warn('[CarnetContactsSection] archive failed:', e);
      setError('Échec de la mise à jour.');
    }
    reload();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-brass animate-spin" />
    </div>
  );

  // ── Fiche détaillée ────────────────────────────────────────────
  if (selected) {
    const { icon: AllegianceIcon, color: allegianceColor } = ALLEGIANCE_META[selected.allegiance];
    return (
      <div className="space-y-5">
        {error && <ErrorBanner message={error} onClose={() => setError(null)} />}
        <button onClick={() => setSelectedId(null)}
          className="inline-flex items-center gap-1.5 font-sans text-xs uppercase tracking-wider text-ivory-soft hover:text-brass transition">
          <ChevronLeft size={13} /> Tout le carnet
        </button>

        {(showAdd || editing) ? (
          <ContactForm initial={editing} onCancel={() => { setShowAdd(false); setEditing(null); }} onSubmit={onSave} />
        ) : (
          <Card className={`p-6 ${selected.archived ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
              <div className="flex items-center gap-4">
                <Portrait name={selected.name} photoUrl={selected.photoUrl} size={64} />
                <div>
                  <h3 className="font-display title-medieval text-xl text-ivory">{selected.name}</h3>
                  <p className="font-editorial italic text-sm text-ivory-soft/70 mt-0.5">{selected.fonction || ROLE_LABEL[selected.role]}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <GhostButton onClick={() => setEditing(selected)}><Pencil size={12} /> Modifier</GhostButton>
                <GhostButton onClick={() => onToggleArchived(selected)}>
                  {selected.archived ? <><ArchiveRestore size={12} /> Désarchiver</> : <><Archive size={12} /> Archiver</>}
                </GhostButton>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
              <Detail label="Rôle au festival" value={ROLE_LABEL[selected.role]} />
              <Detail label="Allégeance" value={
                <span className="inline-flex items-center gap-1.5" style={{ color: allegianceColor }}>
                  <AllegianceIcon size={13} /> {ALLEGIANCE_LABEL[selected.allegiance]}
                </span>
              } />
              <Detail label="Organisation" value={
                <span className="inline-flex items-center gap-1.5"><Building2 size={12} className="text-brass shrink-0" />{selected.organisation || '—'}</span>
              } />
              <Detail label="Dernier contact" value={selected.lastContactAt ? fmtDate(new Date(`${selected.lastContactAt}T00:00:00`)) : '—'} />
              <Detail label="Courriel" value={
                <span className="inline-flex items-center gap-1.5"><Mail size={12} className="text-brass shrink-0" />{selected.email || '—'}</span>
              } />
              <Detail label="Téléphone" value={
                <span className="inline-flex items-center gap-1.5"><Phone size={12} className="text-brass shrink-0" />{selected.phone || '—'}</span>
              } />
            </div>

            {selected.notes && (
              <div className="mt-5 pt-5 border-t border-ivory-soft/10">
                <p className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest mb-1.5">Notes</p>
                <p className="font-editorial italic text-sm text-ivory-soft whitespace-pre-wrap">{selected.notes}</p>
              </div>
            )}
          </Card>
        )}
      </div>
    );
  }

  // ── Liste ────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {error && <ErrorBanner message={error} onClose={() => setError(null)} />}

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ivory-soft/50" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Recherche…"
              className="pl-7 pr-3 py-1.5 rounded-card border border-ivory-soft/20 bg-midnight-deep/50 text-ivory placeholder:text-stone focus:border-brass focus:outline-none text-xs font-sans" />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as ContactRole | 'all')}
            className="px-3 py-1.5 rounded-card border border-ivory-soft/20 bg-midnight-deep/50 text-ivory focus:border-brass focus:outline-none text-xs font-sans">
            <option value="all">Tous les rôles</option>
            {ROLE_ORDER.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
          <select value={allegianceFilter} onChange={(e) => setAllegianceFilter(e.target.value as Allegiance | 'all')}
            className="px-3 py-1.5 rounded-card border border-ivory-soft/20 bg-midnight-deep/50 text-ivory focus:border-brass focus:outline-none text-xs font-sans">
            <option value="all">Toute allégeance</option>
            {ALLEGIANCE_ORDER.map((a) => <option key={a} value={a}>{ALLEGIANCE_LABEL[a]}</option>)}
          </select>
          <button onClick={() => setShowArchived((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-sans uppercase tracking-wider rounded-card text-xs transition ${
              showArchived ? 'bg-brass text-midnight-deep' : 'border border-ivory-soft/20 text-ivory-soft hover:border-brass hover:text-brass'
            }`}>
            <Archive size={12} /> Archivés
          </button>
        </div>
        <PrimaryButton onClick={() => { setEditing(null); setShowAdd(true); setSelectedId(null); }}>
          <Plus size={12} /> Contact
        </PrimaryButton>
      </div>

      {showAdd && !selectedId && (
        <ContactForm initial={null} onCancel={() => setShowAdd(false)} onSubmit={onSave} />
      )}

      {filtered.length === 0 ? (
        <Card><EmptyState icon={BookUser}>Aucun contact ne correspond.</EmptyState></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c) => (
            <Card key={c.id} className={`p-4 cursor-pointer transition hover:border-brass/40 ${c.archived ? 'opacity-50' : ''}`}>
              <div onClick={() => setSelectedId(c.id)}>
                <div className="flex items-center gap-3">
                  <Portrait name={c.name} photoUrl={c.photoUrl} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="font-display title-medieval text-sm text-ivory truncate">{c.name}</p>
                    <p className="font-editorial italic text-xs text-ivory-soft/70 truncate">{c.fonction || ROLE_LABEL[c.role]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                  <span className="px-2 py-0.5 rounded-card border border-ivory-soft/20 text-ivory-soft font-sans uppercase tracking-widest text-[10px]">
                    {ROLE_LABEL[c.role]}
                  </span>
                  <AllegianceSeal allegiance={c.allegiance} size={10} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const Portrait: React.FC<{ name: string; photoUrl?: string; size: number }> = ({ name, photoUrl, size }) => (
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

const Detail: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <p className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest mb-1">{label}</p>
    <p className="font-sans text-sm text-ivory">{value}</p>
  </div>
);

// ─── Formulaire (création / édition) ─────────────────────────────────

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
      console.warn('[CarnetContactsSection] uploadContactPhoto failed:', e);
      setPhotoError('Échec du téléversement de la photo.');
    }
    setUploadingPhoto(false);
  };

  return (
    <Card className="p-5 md:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="font-display title-medieval text-lg text-ivory">{initial ? 'Édition' : 'Nouveau contact'}</h3>
        <button onClick={onCancel} className="text-ivory-soft/60 hover:text-ivory transition"><X size={16} /></button>
      </div>

      <form onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({
          name: name.trim(), role, allegiance,
          fonction: fonction.trim(), organisation: organisation.trim(),
          email: email.trim(), phone: phone.trim(),
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
          <Field label="Nom" full>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex. : Marie-Ève Tremblay" className={inputCls} />
          </Field>
          <Field label="Rôle au festival">
            <select value={role} onChange={(e) => setRole(e.target.value as ContactRole)} className={inputCls}>
              {ROLE_ORDER.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </Field>
          <Field label="Allégeance">
            <select value={allegiance} onChange={(e) => setAllegiance(e.target.value as Allegiance)} className={inputCls}>
              {ALLEGIANCE_ORDER.map((a) => <option key={a} value={a}>{ALLEGIANCE_LABEL[a]}</option>)}
            </select>
          </Field>
          <Field label="Fonction (vraie vie)">
            <input value={fonction} onChange={(e) => setFonction(e.target.value)} placeholder="Ex. : Maire de Montpellier" className={inputCls} />
          </Field>
          <Field label="Organisation">
            <input value={organisation} onChange={(e) => setOrganisation(e.target.value)} placeholder="Ex. : Ville de Montpellier" className={inputCls} />
          </Field>
          <Field label="Dernier contact">
            <input type="date" value={lastContactAt} onChange={(e) => setLastContactAt(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Courriel">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nom@exemple.ca" className={inputCls} />
          </Field>
          <Field label="Téléphone">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="450 000-0000" className={inputCls} />
          </Field>
          <Field label="Notes" full>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Historique, préférences, contexte de la relation…" className={`${inputCls} resize-y`} />
          </Field>
        </div>

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

export default CarnetContactsSection;
