import React, { useEffect, useState } from 'react';
import { Shield, Users, Pencil, Trash2, Save, X } from 'lucide-react';
import { suivreGuildes, modifierGuilde, supprimerGuilde, LONGUEUR_NOM_MAX, type Guilde } from '../../../firebase/guildes';
import { Card, EmptyState, GhostButton, PrimaryButton, DangerButton, Input, Textarea, Label } from '../primitives';

// ─── Guildes (admin) ────────────────────────────────────────────────
// L'équipe voit toutes les guildes fondées par les membres, en
// renomme ou en retouche la description, et détruit celles qui
// dérapent (Alex, 2026-08-27).
const GuildesSection: React.FC = () => {
  const [guildes, setGuildes] = useState<Guilde[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = suivreGuildes((g) => { setGuildes(g); setLoading(false); });
    return unsub;
  }, []);

  const [edition, setEdition] = useState<string | null>(null);
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const ouvrir = (g: Guilde) => { setEdition(g.id); setNom(g.nom); setDescription(g.description || ''); };
  const enregistrer = async (id: string) => {
    setBusy(true);
    try { await modifierGuilde(id, { nom, description }); setEdition(null); }
    finally { setBusy(false); }
  };
  const detruire = async (g: Guilde) => {
    if (!confirm(`Détruire la guilde « ${g.nom} » ? Ses membres et son mur disparaissent avec elle.`)) return;
    await supprimerGuilde(g.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-brass animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="admin-prose">
        <span className="tabular-nums font-medium" style={{ color: 'var(--admin-brass-hi)' }}>{guildes.length}</span> guilde{guildes.length > 1 ? 's' : ''} fondée{guildes.length > 1 ? 's' : ''} par les membres.
      </p>

      {guildes.length === 0 ? (
        <Card><EmptyState icon={Shield}>Aucune guilde encore.</EmptyState></Card>
      ) : (
        <div className="space-y-3">
          {guildes.map((g) => (
            <Card key={g.id} className="p-5">
              {edition === g.id ? (
                <div className="space-y-3">
                  <div>
                    <Label>Nom</Label>
                    <Input value={nom} onChange={(e) => setNom(e.target.value.slice(0, LONGUEUR_NOM_MAX))} />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <GhostButton type="button" onClick={() => setEdition(null)}><X size={12} /> Annuler</GhostButton>
                    <PrimaryButton type="button" disabled={busy || nom.trim().length < 2} onClick={() => enregistrer(g.id)}>
                      <Save size={12} /> Enregistrer
                    </PrimaryButton>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-display title-medieval text-base" style={{ color: 'var(--admin-text)' }}>{g.nom}</p>
                    {g.description && <p className="admin-prose mt-1">{g.description}</p>}
                    <p className="font-sans text-[11px] mt-2 inline-flex items-center gap-1.5" style={{ color: 'var(--admin-text-mute)' }}>
                      <Users size={11} /> {g.nbMembres} membre{g.nbMembres > 1 ? 's' : ''}
                      {g.demandes.length > 0 && <span> · {g.demandes.length} en attente</span>}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <GhostButton type="button" onClick={() => ouvrir(g)}><Pencil size={12} /> Modifier</GhostButton>
                    <DangerButton type="button" onClick={() => detruire(g)}><Trash2 size={12} /> Détruire</DangerButton>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default GuildesSection;
