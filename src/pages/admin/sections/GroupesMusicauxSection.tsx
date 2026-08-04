import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus, X, Trash2, Pencil, ExternalLink, Music2, ChevronUp, ChevronDown, ImagePlus,
} from 'lucide-react';
import {
  watchGroupes, newGroupeId, createGroupe, updateGroupe, deleteGroupe, uploadGroupePhoto,
  type GroupeMusical, type GroupeStatut, type GroupeJour, type GroupeInput,
} from '../../../firebase/groupesMusicaux';
import {
  Card, EmptyState, PrimaryButton, GhostButton, DangerButton, Input, Textarea, Label,
} from '../primitives';

// ─── Groupes musicaux : programmation gérée par Éric Pichette (Pitch) ──
// Distinct des candidatures (formulaire public) : ici Pitch ajoute
// directement un groupe, choisit s'il est à l'affiche de l'année
// courante (avec sa journée) ou aux archives (avec son année), et gère
// sa photo. La page publique Musique lit cette collection en temps réel.

const JOUR_LABEL: Record<GroupeJour, string> = { vendredi: 'Vendredi', samedi: 'Samedi', dimanche: 'Dimanche' };
const JOUR_ORDER: GroupeJour[] = ['vendredi', 'samedi', 'dimanche'];
const ANNEES = [2026, 2025, 2024, 2023, 2022];
const ANNEE_COURANTE = 2026;

const GroupesMusicauxSection: React.FC = () => {
  const [groupes, setGroupes] = useState<GroupeMusical[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<GroupeMusical | 'new' | null>(null);

  useEffect(() => {
    const unsub = watchGroupes((rows) => {
      setGroupes(rows);
      setLoading(false);
    });
    return unsub;
  }, []);

  const affiche = useMemo(() => groupes.filter((g) => g.statut === 'affiche'), [groupes]);
  const archives = useMemo(() => {
    const byYear = new Map<number, GroupeMusical[]>();
    for (const g of groupes) {
      if (g.statut !== 'archive') continue;
      const y = g.annee ?? 0;
      if (!byYear.has(y)) byYear.set(y, []);
      byYear.get(y)!.push(g);
    }
    return Array.from(byYear.entries()).sort((a, b) => b[0] - a[0]);
  }, [groupes]);

  const onSave = async (id: string, isNew: boolean, data: GroupeInput, photoFile: File | null) => {
    try {
      let photoUrl = data.photoUrl;
      if (photoFile) photoUrl = await uploadGroupePhoto(id, photoFile);
      const payload = { ...data, photoUrl };
      if (isNew) await createGroupe(id, payload);
      else await updateGroupe(id, payload);
      setError(null);
    } catch (e) {
      console.warn('[GroupesMusicauxSection] save failed:', e);
      setError('Échec de l’enregistrement du groupe.');
    }
    setEditing(null);
  };

  const onDelete = async (g: GroupeMusical) => {
    if (!confirm(`Retirer « ${g.nom} » ? Cette action est irréversible.`)) return;
    try {
      await deleteGroupe(g.id);
      setError(null);
    } catch (e) {
      console.warn('[GroupesMusicauxSection] deleteGroupe failed:', e);
      setError('Échec de la suppression.');
    }
  };

  // Échange l'ordre du groupe avec son voisin dans le même bloc (même
  // journée si à l'affiche, même année si aux archives).
  const move = async (bucket: GroupeMusical[], index: number, dir: -1 | 1) => {
    const other = bucket[index + dir];
    const cur = bucket[index];
    if (!other) return;
    try {
      await Promise.all([
        updateGroupe(cur.id, { ordre: other.ordre }),
        updateGroupe(other.id, { ordre: cur.ordre }),
      ]);
    } catch (e) {
      console.warn('[GroupesMusicauxSection] move failed:', e);
      setError('Échec du réordonnancement.');
    }
  };

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} onClose={() => setError(null)} />}

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-editorial italic text-sm text-ivory-soft">
            <span className="text-brass tabular-nums font-medium">{affiche.length}</span> à l’affiche {ANNEE_COURANTE} ·
            <span className="text-ivory-soft/60 tabular-nums font-medium ml-1">{groupes.length - affiche.length}</span> aux archives
          </p>
          <p className="font-editorial italic text-xs text-ivory-soft/60 mt-0.5">
            La programmation musicale : nom, description, photo, journée ou année d’archive.
          </p>
        </div>
        <PrimaryButton onClick={() => setEditing('new')}>
          <Plus size={12} /> Nouveau groupe
        </PrimaryButton>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-brass animate-spin" />
        </div>
      ) : groupes.length === 0 ? (
        <Card><EmptyState icon={Music2}>Aucun groupe pour l’instant. Ajoutez le premier.</EmptyState></Card>
      ) : (
        <div className="space-y-6">
          {JOUR_ORDER.map((jour) => {
            const bucket = affiche.filter((g) => g.jour === jour);
            if (bucket.length === 0) return null;
            return (
              <div key={jour}>
                <p className="font-display title-medieval text-xs uppercase tracking-widest text-brass mb-2">
                  À l’affiche · {JOUR_LABEL[jour]}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bucket.map((g, i) => (
                    <GroupeCard key={g.id} groupe={g}
                      onEdit={() => setEditing(g)}
                      onDelete={() => onDelete(g)}
                      onMoveUp={i > 0 ? () => move(bucket, i, -1) : undefined}
                      onMoveDown={i < bucket.length - 1 ? () => move(bucket, i, 1) : undefined}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {archives.map(([annee, bucket]) => (
            <div key={annee}>
              <p className="font-display title-medieval text-xs uppercase tracking-widest text-ivory-soft/60 mb-2">
                Archives · {annee}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bucket.map((g, i) => (
                  <GroupeCard key={g.id} groupe={g}
                    onEdit={() => setEditing(g)}
                    onDelete={() => onDelete(g)}
                    onMoveUp={i > 0 ? () => move(bucket, i, -1) : undefined}
                    onMoveDown={i < bucket.length - 1 ? () => move(bucket, i, 1) : undefined}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <GroupeEditor
          groupe={editing === 'new' ? null : editing}
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

// ─── Groupe card ────────────────────────────────────────────────────
const GroupeCard: React.FC<{
  groupe: GroupeMusical;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}> = ({ groupe, onEdit, onDelete, onMoveUp, onMoveDown }) => (
  <Card className="p-0 overflow-hidden">
    <div className="relative aspect-[16/10] bg-midnight-deep/60">
      {groupe.photoUrl ? (
        <img src={groupe.photoUrl} alt={groupe.nom} decoding="async"
          className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-ivory-soft/20">
          <Music2 size={28} />
        </div>
      )}
    </div>
    <div className="p-4">
      <p className="font-display title-medieval text-sm text-ivory truncate">{groupe.nom}</p>
      <p className="font-editorial italic text-xs text-ivory-soft/70 mt-1.5 line-clamp-2">{groupe.bioFR}</p>
      {groupe.site && (
        <a href={groupe.site} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-widest text-brass hover:text-brass-soft mt-2">
          Site <ExternalLink size={11} />
        </a>
      )}
      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-ivory-soft/10">
        <button onClick={onEdit} title="Modifier"
          className="p-1.5 rounded-card text-ivory-soft hover:text-brass hover:bg-brass/10 transition">
          <Pencil size={12} />
        </button>
        <button onClick={onDelete} title="Retirer"
          className="p-1.5 rounded-card text-ivory-soft hover:text-blush hover:bg-blush/10 transition">
          <Trash2 size={12} />
        </button>
        <div className="flex-1" />
        <button onClick={onMoveUp} disabled={!onMoveUp} title="Monter"
          className="p-1.5 rounded-card text-ivory-soft hover:text-brass hover:bg-brass/10 transition disabled:opacity-20 disabled:cursor-not-allowed">
          <ChevronUp size={12} />
        </button>
        <button onClick={onMoveDown} disabled={!onMoveDown} title="Descendre"
          className="p-1.5 rounded-card text-ivory-soft hover:text-brass hover:bg-brass/10 transition disabled:opacity-20 disabled:cursor-not-allowed">
          <ChevronDown size={12} />
        </button>
      </div>
    </div>
  </Card>
);

// ─── Groupe editor (create + edit modal) ────────────────────────────
const GroupeEditor: React.FC<{
  groupe: GroupeMusical | null;
  onCancel: () => void;
  onSave: (id: string, isNew: boolean, data: GroupeInput, photoFile: File | null) => Promise<void>;
}> = ({ groupe, onCancel, onSave }) => {
  const [nom, setNom] = useState(groupe?.nom ?? '');
  const [bioFR, setBioFR] = useState(groupe?.bioFR ?? '');
  const [bioEN, setBioEN] = useState(groupe?.bioEN ?? '');
  const [site, setSite] = useState(groupe?.site ?? '');
  const [statut, setStatut] = useState<GroupeStatut>(groupe?.statut ?? 'affiche');
  const [jour, setJour] = useState<GroupeJour>(groupe?.jour ?? 'vendredi');
  const [annee, setAnnee] = useState<number>(groupe?.annee ?? 2025);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | undefined>(groupe?.photoUrl);
  const [busy, setBusy] = useState(false);

  const onPickPhoto = (file: File | undefined) => {
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const canSave = nom.trim() && bioFR.trim() && bioEN.trim();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setBusy(true);
    try {
      const id = groupe?.id ?? newGroupeId();
      await onSave(id, !groupe, {
        nom: nom.trim(),
        bioFR: bioFR.trim(),
        bioEN: bioEN.trim(),
        site: site.trim() || undefined,
        photoUrl: groupe?.photoUrl,
        statut,
        jour: statut === 'affiche' ? jour : undefined,
        annee: statut === 'archive' ? annee : undefined,
        ordre: groupe?.ordre ?? Date.now(),
      }, photoFile);
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
              {groupe ? 'Modifier le groupe' : 'Nouveau groupe'}
            </p>
            <h3 className="font-display title-medieval text-lg text-ivory">{nom || 'Sans nom'}</h3>
          </div>
          <button type="button" onClick={onCancel} className="text-ivory-soft hover:text-blush transition">
            <X size={16} />
          </button>
        </header>

        <div>
          <Label>Photo (optionnel)</Label>
          <label className="relative block w-full aspect-[16/9] rounded-card border-2 border-dashed border-ivory-soft/20 bg-midnight-deep/40 cursor-pointer overflow-hidden hover:border-brass transition">
            {photoPreview ? (
              <img src={photoPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-ivory-soft/50">
                <ImagePlus size={22} />
                <span className="text-[11px] uppercase tracking-widest">Cliquer pour téléverser</span>
              </div>
            )}
            <input type="file" accept="image/*" className="sr-only"
              onChange={(e) => onPickPhoto(e.target.files?.[0])} />
          </label>
        </div>

        <label className="block">
          <Label>Nom du groupe</Label>
          <Input value={nom} onChange={(e) => setNom(e.target.value)} required autoFocus placeholder="Ex. : Skarazula" />
        </label>

        <label className="block">
          <Label>Description (français)</Label>
          <Textarea rows={3} value={bioFR} onChange={(e) => setBioFR(e.target.value)} required placeholder="Présentation du groupe" />
        </label>

        <label className="block">
          <Label>Description (anglais)</Label>
          <Textarea rows={3} value={bioEN} onChange={(e) => setBioEN(e.target.value)} required placeholder="Band presentation" />
        </label>

        <label className="block">
          <Label>Site web (optionnel)</Label>
          <Input type="url" value={site} onChange={(e) => setSite(e.target.value)} placeholder="https://…" />
        </label>

        <div>
          <Label>Statut</Label>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setStatut('affiche')}
              className={`font-sans text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-card border transition ${
                statut === 'affiche'
                  ? 'bg-brass/15 border-brass/40 text-brass'
                  : 'border-dashed border-ivory-soft/20 text-ivory-soft/50 hover:border-brass/30'
              }`}>
              À l’affiche {ANNEE_COURANTE}
            </button>
            <button type="button" onClick={() => setStatut('archive')}
              className={`font-sans text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-card border transition ${
                statut === 'archive'
                  ? 'bg-brass/15 border-brass/40 text-brass'
                  : 'border-dashed border-ivory-soft/20 text-ivory-soft/50 hover:border-brass/30'
              }`}>
              Archives
            </button>
          </div>
        </div>

        {statut === 'affiche' ? (
          <div>
            <Label>Journée</Label>
            <div className="flex items-center gap-2">
              {JOUR_ORDER.map((j) => (
                <button key={j} type="button" onClick={() => setJour(j)}
                  className={`font-sans text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-card border transition ${
                    jour === j
                      ? 'bg-brass/15 border-brass/40 text-brass'
                      : 'border-dashed border-ivory-soft/20 text-ivory-soft/50 hover:border-brass/30'
                  }`}>
                  {JOUR_LABEL[j]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <label className="block">
            <Label>Année</Label>
            <select value={annee} onChange={(e) => setAnnee(Number(e.target.value))} className="admin-input w-full">
              {ANNEES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
        )}

        <footer className="flex items-center justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onCancel}>Annuler</GhostButton>
          <PrimaryButton type="submit" disabled={!canSave || busy}>
            {busy ? 'Enregistrement…' : groupe ? 'Enregistrer' : 'Ajouter le groupe'}
          </PrimaryButton>
        </footer>
      </form>
    </div>
  );
};

// DangerButton importé mais non utilisé directement dans ce fichier (la
// suppression passe par un bouton icône dans GroupeCard) : conservé pour
// cohérence si un futur bouton de confirmation en ligne en a besoin.
void DangerButton;

export default GroupesMusicauxSection;
