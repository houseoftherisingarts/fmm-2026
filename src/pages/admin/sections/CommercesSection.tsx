import React, { useEffect, useState } from 'react';
import { ExternalLink, Sparkles, Trash2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  listerTousLesCommerces, deleteCommerce, soumettreCommerceCommeKiosque,
  type Commerce,
} from '../../../firebase/souk';
import { Card, Badge, EmptyState } from '../primitives';

// ─── Commerces de la ruelle (section admin) ──────────────────────────
// Les fiches non officielles créées par les membres depuis le Souk.
// « Promouvoir en kiosque » fait exactement ce que le bouton du membre
// fait (soumettreCommerceCommeKiosque), côté équipe. « Retirer » efface
// la fiche et ses photos.
const CommercesSection: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Commerce[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recharger = () => {
    setLoading(true);
    listerTousLesCommerces().then((rows) => { setItems(rows); setLoading(false); });
  };
  useEffect(recharger, []);

  const promouvoir = async (c: Commerce) => {
    setBusy(c.uid); setError(null);
    try {
      await soumettreCommerceCommeKiosque(c, c.courriel || '', c.nom);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const retirer = async (c: Commerce) => {
    if (!window.confirm(`Retirer le commerce « ${c.nom} » ?`)) return;
    setBusy(c.uid); setError(null);
    try {
      await deleteCommerce(c.uid);
      setItems((prev) => prev.filter((x) => x.uid !== c.uid));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-title text-2xl">Commerces de la ruelle</h1>
        <p className="admin-prose">
          Les fiches de commerce non officielles créées par les membres depuis /souk. « Promouvoir en kiosque »
          crée ou met à jour leur candidature marchand (statut en attente), exactement comme leur propre bouton.
        </p>
      </div>

      {error && <p className="admin-prose" style={{ color: '#FCA5B0' }}>{error}</p>}

      {loading ? (
        <p className="admin-prose">Chargement…</p>
      ) : items.length === 0 ? (
        <EmptyState>Aucun commerce créé pour le moment.</EmptyState>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((c) => (
            <Card key={c.uid} className="p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="font-sans font-semibold text-sm truncate" style={{ color: 'var(--admin-text)' }}>{c.nom}</p>
                  <p className="font-sans text-xs" style={{ color: 'var(--admin-text-mute)' }}>{c.categorie}</p>
                </div>
                <Badge tone={c.complet ? 'accepted' : 'pending'}>{c.complet ? 'Complète' : 'Incomplète'}</Badge>
              </div>
              <p className="font-sans text-sm mb-3 line-clamp-3" style={{ color: 'var(--admin-text-soft)' }}>{c.description}</p>
              <div className="flex flex-wrap gap-3 text-xs mb-4" style={{ color: 'var(--admin-text-mute)' }}>
                {c.courriel && <span>{c.courriel}</span>}
                {c.telephone && <span>{c.telephone}</span>}
                {c.ville && <span>{c.ville}</span>}
                {c.site && (
                  <a href={c.site} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1" style={{ color: 'var(--admin-accent)' }}>
                    <ExternalLink size={11} /> Site
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => promouvoir(c)}
                  disabled={busy === c.uid}
                  className="admin-cta inline-flex items-center gap-1.5 text-xs px-3 py-1.5 disabled:opacity-50"
                >
                  <Sparkles size={12} /> Promouvoir en kiosque
                </button>
                <button
                  type="button"
                  onClick={() => retirer(c)}
                  disabled={busy === c.uid}
                  className="admin-danger inline-flex items-center gap-1.5 text-xs px-3 py-1.5 disabled:opacity-50"
                >
                  <Trash2 size={12} /> Retirer
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommercesSection;
