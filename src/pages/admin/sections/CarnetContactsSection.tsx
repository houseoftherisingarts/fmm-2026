import React, { useEffect, useMemo, useState } from 'react';
import {
  BookUser, Plus, X, Pencil, Search, ChevronLeft, Mail, Phone, Building2, MapPin,
  ShieldCheck, ShieldQuestion, Swords, Archive, ArchiveRestore, Siren, Trash2, CircleAlert,
} from 'lucide-react';
import { Card, EmptyState, GhostButton, PrimaryButton, fmtDate } from '../primitives';
import ContactForm, { Portrait } from './CarnetContactForm';
import {
  listContacts, addContact, updateContact, setContactArchived, supprimerContact,
  lienTel, lienCourriel,
  ROLE_LABEL, ROLE_ORDER, ALLEGIANCE_LABEL, ALLEGIANCE_ORDER,
  type Contact, type ContactRole, type Allegiance,
} from '../../../firebase/carnetContacts';

// ─── Carnet de contacts et bottin des ressources ─────────────────────
// Deux usages dans une seule page, parce qu'ils portent les mêmes
// champs et qu'un numéro se cherche à un seul endroit.
//
// Le carnet, façon fiches de PNJ du Quest Book : qui compte pour
// l'organisation, avec son rôle et son allégeance.
//
// Le bottin, arrivé le 2026-09-02 à la demande d'Alex : les ressources
// du festival rangées par famille, la municipalité et les services
// publics d'abord, puis l'équipe, les partenaires, les fournisseurs.
// Chaque fiche se compose d'un doigt sur un téléphone et porte la date
// où ses coordonnées ont été vérifiées pour la dernière fois.
//
// Les fiches marquées « urgence » vivent dans le bandeau du haut, avant
// la recherche et sans dépendre d'elle : pendant le festival, quelqu'un
// cherche un numéro en courant et n'a pas le temps de taper. Elles ne
// sont pas répétées dans les familles en dessous, pour que le même
// numéro ne s'affiche jamais deux fois sur le même écran.
//
// ⚠️ L'allégeance et les notes sont des données SENSIBLES sur des
// personnes réelles (ex. « le maire est un adversaire »), et le bottin
// ajoute des coordonnées professionnelles de tiers. Cette section est
// admin only (super/CA/organisateurs, voir adminPermissions.ts) et n'a
// AUCUNE lecture publique côté Firestore/Storage : ne jamais ajouter de
// chemin public à ces données.

const ALLEGIANCE_META: Record<Allegiance, { icon: React.ComponentType<{ size?: number; className?: string }>; color: string }> = {
  allie:      { icon: ShieldCheck,    color: '#5FD3A2' },
  neutre:     { icon: ShieldQuestion, color: '#9A988A' },
  adversaire: { icon: Swords,         color: '#FCA5B0' },
};

const ErrorBanner: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => (
  <Card className="p-4 border border-blush/40 bg-blush/8">
    <div className="flex items-center justify-between gap-3">
      <p className="font-sans text-sm text-blush">{message}</p>
      <button onClick={onClose} aria-label="Fermer l'avertissement" className="text-blush/60 hover:text-blush transition shrink-0"><X size={14} /></button>
    </div>
  </Card>
);

/** Le sceau d'allégeance ne s'affiche que sur une fiche de personne ou
 *  d'organisme avec qui le festival entretient une relation. Dire d'une
 *  ligne d'Hydro-Québec qu'elle est « neutre » n'apprend rien à
 *  personne, et répété sur quinze cartes cela noie ce qui compte. */
const AllegianceSeal: React.FC<{ allegiance: Allegiance; size?: number }> = ({ allegiance, size = 12 }) => {
  const { icon: Icon, color } = ALLEGIANCE_META[allegiance];
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-card border font-sans uppercase tracking-widest text-[10px]"
      style={{ color, borderColor: `${color}55`, background: `${color}14` }}>
      <Icon size={size} /> {ALLEGIANCE_LABEL[allegiance]}
    </span>
  );
};

/** Une fiche sans date de vérification est une fiche dont personne ne
 *  garantit le numéro. Le bottin le dit plutôt que de le taire. */
const AVerifier: React.FC = () => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-card border border-brass/40 bg-brass/10 text-brass font-sans uppercase tracking-widest text-[10px]">
    <CircleAlert size={10} /> À vérifier
  </span>
);

/** Le numéro se compose d'un clic, sur un téléphone comme sur un
 *  ordinateur qui a une application d'appel. Le clic ne doit pas ouvrir
 *  la fiche derrière, d'où l'arrêt de la propagation. */
const LienTelephone: React.FC<{ numero: string; className?: string }> = ({ numero, className = '' }) => {
  if (!numero) return <span className="text-ivory-soft/40">—</span>;
  return (
    <a href={lienTel(numero)} onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1.5 text-ivory hover:text-brass transition ${className}`}>
      <Phone size={12} className="text-brass shrink-0" /> {numero}
    </a>
  );
};

const LienCourriel: React.FC<{ adresseCourriel: string }> = ({ adresseCourriel }) => {
  if (!adresseCourriel) return <span className="text-ivory-soft/40">—</span>;
  return (
    <a href={lienCourriel(adresseCourriel)} onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1.5 text-ivory hover:text-brass transition break-all">
      <Mail size={12} className="text-brass shrink-0" /> {adresseCourriel}
    </a>
  );
};

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

  // Le bandeau d'urgence ignore la recherche et les filtres : il montre
  // toujours les mêmes numéros, au même endroit, dans le même ordre.
  const urgences = useMemo(
    () => items.filter((c) => c.urgence && !c.archived).sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    [items],
  );

  const filtered = useMemo(() => items.filter((c) => {
    if (c.urgence && !c.archived) return false;
    if (!showArchived && c.archived) return false;
    if (roleFilter !== 'all' && c.role !== roleFilter) return false;
    if (allegianceFilter !== 'all' && c.allegiance !== allegianceFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${c.name} ${c.fonction} ${c.organisation} ${c.phone} ${c.email} ${c.adresse} ${c.notes}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [items, search, roleFilter, allegianceFilter, showArchived]);

  // Le rangement par famille, dans l'ordre du bottin. Une famille vide
  // ne s'affiche pas.
  const familles = useMemo(
    () => ROLE_ORDER
      .map((role) => ({ role, fiches: filtered.filter((c) => c.role === role) }))
      .filter((f) => f.fiches.length > 0),
    [filtered],
  );

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

  const onDelete = async (c: Contact) => {
    if (!window.confirm(`Supprimer définitivement la fiche « ${c.name} » ? Cette action ne se défait pas. Pour garder la trace d'un contact devenu inactif, préférez l'archivage.`)) return;
    try {
      await supprimerContact(c.id);
      setError(null);
      setSelectedId(null);
    } catch (e) {
      console.warn('[CarnetContactsSection] supprimerContact failed:', e);
      setError('Échec de la suppression.');
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
          <ChevronLeft size={13} /> Tout le bottin
        </button>

        {editing ? (
          <ContactForm initial={editing} onCancel={() => setEditing(null)} onSubmit={onSave} />
        ) : (
          <Card className={`p-6 ${selected.archived ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
              <div className="flex items-center gap-4">
                <Portrait name={selected.name} photoUrl={selected.photoUrl} size={64} />
                <div>
                  <h3 className="font-display title-medieval text-xl text-ivory">{selected.name}</h3>
                  <p className="font-editorial italic text-sm text-ivory-soft/70 mt-0.5">{selected.fonction || ROLE_LABEL[selected.role]}</p>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {selected.urgence && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-card border border-blush/45 bg-blush/10 text-blush font-sans uppercase tracking-widest text-[10px]">
                        <Siren size={10} /> Urgence
                      </span>
                    )}
                    {!selected.verifieLe && <AVerifier />}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <GhostButton onClick={() => setEditing(selected)}><Pencil size={12} /> Modifier</GhostButton>
                <GhostButton onClick={() => onToggleArchived(selected)}>
                  {selected.archived ? <><ArchiveRestore size={12} /> Désarchiver</> : <><Archive size={12} /> Archiver</>}
                </GhostButton>
                <GhostButton onClick={() => onDelete(selected)}><Trash2 size={12} /> Supprimer</GhostButton>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
              <Detail label="Famille" value={ROLE_LABEL[selected.role]} />
              {selected.role !== 'service-public' && (
                <Detail label="Allégeance" value={
                  <span className="inline-flex items-center gap-1.5" style={{ color: allegianceColor }}>
                    <AllegianceIcon size={13} /> {ALLEGIANCE_LABEL[selected.allegiance]}
                  </span>
                } />
              )}
              <Detail label="Organisation" value={
                <span className="inline-flex items-center gap-1.5"><Building2 size={12} className="text-brass shrink-0" />{selected.organisation || '—'}</span>
              } />
              <Detail label="Adresse" value={
                selected.adresse
                  ? <span className="inline-flex items-start gap-1.5"><MapPin size={12} className="text-brass shrink-0 mt-0.5" />{selected.adresse}</span>
                  : '—'
              } />
              <Detail label="Téléphone" value={<LienTelephone numero={selected.phone} />} />
              <Detail label="Courriel" value={<LienCourriel adresseCourriel={selected.email} />} />
              <Detail label="Vérifié le" value={selected.verifieLe ? fmtDate(new Date(`${selected.verifieLe}T00:00:00`)) : 'Jamais vérifié'} />
              <Detail label="Dernier contact" value={selected.lastContactAt ? fmtDate(new Date(`${selected.lastContactAt}T00:00:00`)) : '—'} />
              <Detail label="Source des coordonnées" value={<span className="break-all">{selected.source || '—'}</span>} />
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

      {urgences.length > 0 && (
        <Card className="p-4 border border-blush/35 bg-blush/[0.06]">
          <div className="flex items-center gap-2 mb-3">
            <Siren size={14} className="text-blush" />
            <h3 className="font-display title-medieval text-sm text-blush uppercase tracking-widest">Urgences</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-2.5">
            {urgences.map((c) => (
              // `min-w-0` sur la case de la grille et sur le bouton : sans
              // lui, un nom long refuse de rétrécir et pousse la rangée
              // hors de l'écran du téléphone, où ce bandeau sert le plus.
              <div key={c.id} className="min-w-0 flex items-baseline justify-between gap-3 border-b border-blush/15 pb-2">
                <button onClick={() => setSelectedId(c.id)}
                  className="min-w-0 font-sans text-sm text-ivory hover:text-brass transition text-left truncate">
                  {c.name}
                </button>
                <LienTelephone numero={c.phone} className="font-sans text-sm shrink-0" />
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ivory-soft/50" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Recherche…" aria-label="Rechercher dans le bottin"
              className="pl-7 pr-3 py-1.5 rounded-card border border-ivory-soft/20 bg-midnight-deep/50 text-ivory placeholder:text-stone focus:border-brass focus:outline-none text-xs font-sans" />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as ContactRole | 'all')} aria-label="Filtrer par famille"
            className="px-3 py-1.5 rounded-card border border-ivory-soft/20 bg-midnight-deep/50 text-ivory focus:border-brass focus:outline-none text-xs font-sans">
            <option value="all">Toutes les familles</option>
            {ROLE_ORDER.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
          <select value={allegianceFilter} onChange={(e) => setAllegianceFilter(e.target.value as Allegiance | 'all')} aria-label="Filtrer par allégeance"
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
          <Plus size={12} /> Fiche
        </PrimaryButton>
      </div>

      {showAdd && (
        <ContactForm initial={null} onCancel={() => setShowAdd(false)} onSubmit={onSave} />
      )}

      {familles.length === 0 ? (
        <Card><EmptyState icon={BookUser}>Aucune fiche ne correspond.</EmptyState></Card>
      ) : (
        familles.map(({ role, fiches }) => (
          <div key={role} className="space-y-3">
            <div className="flex items-baseline gap-3">
              <h3 className="font-display title-medieval text-sm text-brass uppercase tracking-widest">{ROLE_LABEL[role]}</h3>
              <span className="font-sans text-[11px] text-ivory-soft/50">{fiches.length}</span>
              <div className="flex-1 h-px bg-ivory-soft/10" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {fiches.map((c) => (
                <Card key={c.id} className={`p-4 transition hover:border-brass/40 ${c.archived ? 'opacity-50' : ''}`}>
                  <div onClick={() => setSelectedId(c.id)} className="cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Portrait name={c.name} photoUrl={c.photoUrl} size={44} />
                      <div className="min-w-0 flex-1">
                        <p className="font-display title-medieval text-sm text-ivory truncate">{c.name}</p>
                        <p className="font-editorial italic text-xs text-ivory-soft/70 truncate">{c.fonction || ROLE_LABEL[c.role]}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5 font-sans text-xs">
                    {c.phone && <LienTelephone numero={c.phone} />}
                    {c.email && <div className="truncate"><LienCourriel adresseCourriel={c.email} /></div>}
                    {!c.phone && !c.email && (
                      <p className="font-editorial italic text-ivory-soft/50">Coordonnées à compléter, voir la fiche.</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                    {c.role !== 'service-public' && <AllegianceSeal allegiance={c.allegiance} size={10} />}
                    {!c.verifieLe && <AVerifier />}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const Detail: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <p className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest mb-1">{label}</p>
    <p className="font-sans text-sm text-ivory">{value}</p>
  </div>
);

export default CarnetContactsSection;
