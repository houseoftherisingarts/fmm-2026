import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus, X, Trash2, Pencil, Search, TicketCheck, CheckCircle2, Circle,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  listInvites, createInvite, updateInvite, setArrive, deleteInvite,
  type GuestInvite, type GuestCategorie, type GuestJour,
} from '../../../firebase/invites';
import {
  Card, EmptyState, PrimaryButton, GhostButton, Input, Textarea, Label,
} from '../primitives';

// ─── Invités : liste des entrées gratuites tenue pour la porte ─────
// Artisans, partenaires, familles de bénévoles, médias, VIP. L'équipe
// à l'entrée doit savoir qui est invité, par qui, combien de personnes,
// pour quels jours, et si la personne s'est présentée.

const CATEGORIE_LABEL: Record<GuestCategorie, string> = {
  artisan: 'Artisan', partenaire: 'Partenaire', benevole: 'Bénévole',
  media: 'Média', artiste: 'Artiste', vip: 'VIP', autre: 'Autre',
};

const CATEGORIE_TONE: Record<GuestCategorie, string> = {
  artisan:    'bg-amber-300/15 border-amber-300/40 text-amber-200',
  partenaire: 'bg-sky-400/15 border-sky-400/40 text-sky-300',
  benevole:   'bg-emerald-400/15 border-emerald-400/40 text-emerald-300',
  media:      'bg-violet-400/15 border-violet-400/40 text-violet-300',
  artiste:    'bg-rose-400/15 border-rose-400/40 text-rose-300',
  vip:        'bg-brass/15 border-brass/40 text-brass',
  autre:      'bg-ivory-soft/10 border-ivory-soft/30 text-ivory-soft',
};

const CATEGORIE_ORDER: GuestCategorie[] = ['artisan', 'partenaire', 'benevole', 'media', 'artiste', 'vip', 'autre'];

const JOUR_LABEL: Record<GuestJour, string> = { vendredi: 'Ven', samedi: 'Sam', dimanche: 'Dim' };
const JOUR_ORDER: GuestJour[] = ['vendredi', 'samedi', 'dimanche'];

const InvitesSection: React.FC = () => {
  const { user } = useAuth();
  const myName = user?.displayName ?? user?.email ?? 'Admin';

  const [invites, setInvites] = useState<GuestInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterCategorie, setFilterCategorie] = useState<GuestCategorie | 'all'>('all');
  const [filterJour, setFilterJour] = useState<GuestJour | 'all'>('all');

  const [editing, setEditing] = useState<GuestInvite | 'new' | null>(null);

  const reload = async () => {
    try {
      setInvites(await listInvites());
      setError(null);
    } catch (e) {
      console.warn('[InvitesSection] listInvites failed:', e);
      setInvites([]);
      setError('Impossible de charger la liste des invités. Vérifiez la configuration Firebase.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, []);

  const stats = useMemo(() => ({
    total: invites.length,
    personnes: invites.reduce((sum, i) => sum + (i.personnes || 0), 0),
    arrives: invites.filter((i) => i.arrive).length,
  }), [invites]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invites.filter((i) => {
      if (filterCategorie !== 'all' && i.categorie !== filterCategorie) return false;
      if (filterJour !== 'all' && !i.jours.includes(filterJour)) return false;
      if (q && !i.nom.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [invites, search, filterCategorie, filterJour]);

  const onSave = async (data: {
    nom: string; courriel?: string; telephone?: string; categorie: GuestCategorie;
    invitePar: string; personnes: number; jours: GuestJour[]; note?: string;
  }) => {
    try {
      if (editing && editing !== 'new') {
        await updateInvite(editing.id, data);
      } else {
        await createInvite(data);
      }
      setError(null);
    } catch (e) {
      console.warn('[InvitesSection] save failed:', e);
      setError('Échec de l’enregistrement.');
    }
    setEditing(null);
    reload();
  };

  const onDelete = async (i: GuestInvite) => {
    if (!confirm(`Supprimer l’invitation de « ${i.nom} » ? Cette action est irréversible.`)) return;
    try {
      await deleteInvite(i.id);
      setError(null);
    } catch (e) {
      console.warn('[InvitesSection] deleteInvite failed:', e);
      setError('Échec de la suppression.');
    }
    reload();
  };

  const onToggleArrive = async (i: GuestInvite) => {
    // Mise à jour optimiste : la porte a besoin d'un clic instantané.
    setInvites((prev) => prev.map((x) => (x.id === i.id ? { ...x, arrive: !x.arrive } : x)));
    try {
      await setArrive(i.id, !i.arrive);
      setError(null);
    } catch (e) {
      console.warn('[InvitesSection] setArrive failed:', e);
      setError('Échec de la mise à jour.');
      reload();
    }
  };

  return (
    <div className="space-y-5">
      {error && <ErrorBanner message={error} onClose={() => setError(null)} />}

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-editorial italic text-sm text-ivory-soft">
            <span className="text-brass tabular-nums font-medium">{stats.total}</span> invitation{stats.total > 1 ? 's' : ''} ·
            <span className="text-ivory-soft/80 tabular-nums font-medium ml-1">{stats.personnes}</span> personne{stats.personnes > 1 ? 's' : ''} ·
            <span className="text-emerald-300 tabular-nums font-medium ml-1">{stats.arrives}</span> arrivé{stats.arrives > 1 ? 's' : ''}
          </p>
          <p className="font-editorial italic text-xs text-ivory-soft/60 mt-0.5">
            Entrées gratuites : artisans, partenaires, familles de bénévoles, médias, VIP.
          </p>
        </div>
        <PrimaryButton onClick={() => setEditing('new')}>
          <Plus size={12} /> Nouvel invité
        </PrimaryButton>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ivory-soft/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un nom…"
            className="pl-8"
          />
        </div>
        <select
          value={filterCategorie}
          onChange={(e) => setFilterCategorie(e.target.value as GuestCategorie | 'all')}
          className="admin-input w-auto"
        >
          <option value="all">Toutes les catégories</option>
          {CATEGORIE_ORDER.map((c) => (
            <option key={c} value={c}>{CATEGORIE_LABEL[c]}</option>
          ))}
        </select>
        <select
          value={filterJour}
          onChange={(e) => setFilterJour(e.target.value as GuestJour | 'all')}
          className="admin-input w-auto"
        >
          <option value="all">Tous les jours</option>
          {JOUR_ORDER.map((j) => (
            <option key={j} value={j}>{j.charAt(0).toUpperCase() + j.slice(1)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-brass animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={TicketCheck}>
          {invites.length === 0 ? 'Aucun invité pour l’instant. Ajoutez le premier.' : 'Aucun invité ne correspond aux filtres.'}
        </EmptyState></Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm font-sans border-collapse">
            <thead>
              <tr className="border-b border-ivory-soft/10">
                <Th>Nom</Th>
                <Th>Catégorie</Th>
                <Th>Invité par</Th>
                <Th className="text-center">Personnes</Th>
                <Th>Jours</Th>
                <Th className="text-center">Arrivé</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id} className="border-b border-ivory-soft/5">
                  <td className="px-4 py-2.5 font-sans text-xs text-ivory whitespace-nowrap">
                    {i.nom}
                    {i.note && (
                      <p className="font-editorial italic text-[11px] text-ivory-soft/50 mt-0.5 max-w-xs truncate">{i.note}</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center font-sans text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-card border ${CATEGORIE_TONE[i.categorie]}`}>
                      {CATEGORIE_LABEL[i.categorie]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-sans text-xs text-ivory-soft/80 whitespace-nowrap">{i.invitePar || '-'}</td>
                  <td className="px-4 py-2.5 text-center font-sans text-xs text-ivory tabular-nums">{i.personnes}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1 flex-wrap">
                      {i.jours.length === 0 ? (
                        <span className="font-sans text-[11px] text-ivory-soft/30">-</span>
                      ) : JOUR_ORDER.filter((j) => i.jours.includes(j)).map((j) => (
                        <span key={j} className="font-sans text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-card border border-ivory-soft/20 text-ivory-soft/70">
                          {JOUR_LABEL[j]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      onClick={() => onToggleArrive(i)}
                      title={i.arrive ? 'Marquer comme non arrivé' : 'Marquer comme arrivé'}
                      className={`inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-wider px-2 py-1 rounded-card border transition ${
                        i.arrive
                          ? 'bg-emerald-400/15 border-emerald-400/40 text-emerald-300'
                          : 'border-dashed border-ivory-soft/20 text-ivory-soft/40 hover:border-brass/40 hover:text-brass'
                      }`}
                    >
                      {i.arrive ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                      {i.arrive ? 'Arrivé' : 'En attente'}
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditing(i)}
                        title="Modifier"
                        className="p-1.5 rounded-card text-ivory-soft hover:text-brass hover:bg-brass/10 transition">
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => onDelete(i)}
                        title="Supprimer"
                        className="p-1.5 rounded-card text-ivory-soft hover:text-blush hover:bg-blush/10 transition">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {editing && (
        <InviteEditor
          invite={editing === 'new' ? null : editing}
          defaultInvitePar={myName}
          onCancel={() => setEditing(null)}
          onSave={onSave}
        />
      )}
    </div>
  );
};

// ─── Error banner ───────────────────────────────────────────────────
const ErrorBanner: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => (
  <Card className="p-4 border border-blush/40 bg-blush/8">
    <div className="flex items-center justify-between gap-3">
      <p className="font-sans text-sm text-blush">{message}</p>
      <button onClick={onClose} className="text-blush/60 hover:text-blush transition shrink-0">
        <X size={14} />
      </button>
    </div>
  </Card>
);

const Th: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <th className={`px-4 py-3 font-display title-medieval text-[10px] uppercase tracking-widest text-brass text-left ${className}`}>
    {children}
  </th>
);

// ─── Invite editor (create + edit modal) ────────────────────────────
const InviteEditor: React.FC<{
  invite: GuestInvite | null;
  defaultInvitePar: string;
  onCancel: () => void;
  onSave: (data: {
    nom: string; courriel?: string; telephone?: string; categorie: GuestCategorie;
    invitePar: string; personnes: number; jours: GuestJour[]; note?: string;
  }) => Promise<void>;
}> = ({ invite, defaultInvitePar, onCancel, onSave }) => {
  const [nom, setNom] = useState(invite?.nom ?? '');
  const [courriel, setCourriel] = useState(invite?.courriel ?? '');
  const [telephone, setTelephone] = useState(invite?.telephone ?? '');
  const [categorie, setCategorie] = useState<GuestCategorie>(invite?.categorie ?? 'artisan');
  const [invitePar, setInvitePar] = useState(invite?.invitePar ?? defaultInvitePar);
  const [personnes, setPersonnes] = useState(invite?.personnes ?? 1);
  const [jours, setJours] = useState<GuestJour[]>(invite?.jours ?? []);
  const [note, setNote] = useState(invite?.note ?? '');
  const [busy, setBusy] = useState(false);

  const toggleJour = (j: GuestJour) =>
    setJours((prev) => (prev.includes(j) ? prev.filter((x) => x !== j) : [...prev, j]));

  const canSave = nom.trim() && invitePar.trim() && personnes >= 1;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setBusy(true);
    try {
      await onSave({
        nom: nom.trim(),
        courriel: courriel.trim() || undefined,
        telephone: telephone.trim() || undefined,
        categorie,
        invitePar: invitePar.trim(),
        personnes,
        jours,
        note: note.trim() || undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-midnight-deep/70 backdrop-blur-sm flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-lg bg-midnight-deep border border-brass/30 rounded-lg-card p-6 md:p-7 space-y-4 max-h-[85vh] overflow-y-auto">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px] mb-1">
              {invite ? 'Modifier l’invitation' : 'Nouvel invité'}
            </p>
            <h3 className="font-display title-medieval text-lg text-ivory">{nom || 'Sans nom'}</h3>
          </div>
          <button type="button" onClick={onCancel} className="text-ivory-soft hover:text-blush transition">
            <X size={16} />
          </button>
        </header>

        <label className="block">
          <Label>Nom</Label>
          <Input value={nom} onChange={(e) => setNom(e.target.value)} required autoFocus placeholder="Ex. : Famille Tremblay" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <Label>Courriel (optionnel)</Label>
            <Input type="email" value={courriel} onChange={(e) => setCourriel(e.target.value)} placeholder="nom@courriel.com" />
          </label>
          <label className="block">
            <Label>Téléphone (optionnel)</Label>
            <Input type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="514 555-0100" />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <Label>Catégorie</Label>
            <select
              value={categorie}
              onChange={(e) => setCategorie(e.target.value as GuestCategorie)}
              className="admin-input w-full"
            >
              {CATEGORIE_ORDER.map((c) => (
                <option key={c} value={c}>{CATEGORIE_LABEL[c]}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <Label>Personnes</Label>
            <Input type="number" min={1} value={personnes}
              onChange={(e) => setPersonnes(Math.max(1, Number(e.target.value) || 1))} />
          </label>
        </div>

        <label className="block">
          <Label>Invité par</Label>
          <Input value={invitePar} onChange={(e) => setInvitePar(e.target.value)} required placeholder="Ex. : Maïté" />
        </label>

        <div>
          <Label>Jours</Label>
          <div className="flex items-center gap-2">
            {JOUR_ORDER.map((j) => {
              const active = jours.includes(j);
              return (
                <button key={j} type="button" onClick={() => toggleJour(j)}
                  className={`font-sans text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-card border transition ${
                    active
                      ? 'bg-brass/15 border-brass/40 text-brass'
                      : 'border-dashed border-ivory-soft/20 text-ivory-soft/50 hover:border-brass/30'
                  }`}>
                  {j.charAt(0).toUpperCase() + j.slice(1)}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block">
          <Label>Note (optionnel)</Label>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Précisions pour l’équipe à la porte" />
        </label>

        <footer className="flex items-center justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onCancel}>Annuler</GhostButton>
          <PrimaryButton type="submit" disabled={!canSave || busy}>
            {busy ? 'Enregistrement…' : invite ? 'Enregistrer' : 'Ajouter l’invité'}
          </PrimaryButton>
        </footer>
      </form>
    </div>
  );
};

export default InvitesSection;
