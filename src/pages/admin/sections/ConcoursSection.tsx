import React, { useEffect, useMemo, useState } from 'react';
import { Download, Gift } from 'lucide-react';
import { listerConcoursWJW, poserGagnantWJW, PRIX_CONCOURS_WJW, type ParticipationWJW } from '../../../firebase/concoursWJW';
import { Card, Badge, EmptyState, GhostButton } from '../primitives';

// ─── Concours William J. Walter (section admin) ─────────────────────
// La liste remise au commanditaire, telle qu'elle vit dans Firestore :
// une ligne par personne, avec le nombre de chances (1 à l'inscription,
// +1 par 7e jour des récompenses quotidiennes), le consentement au
// partage et la porte d'entrée (formulaire, compte, récompense). Le
// jour du tirage, un clic pose le prix gagné; la fiche de la personne
// l'annonce aussitôt. « Exporter » descend la liste en CSV pour William.

const dateCourte = (t?: { toDate?: () => Date } | null) => {
  const d = t && typeof t.toDate === 'function' ? t.toDate() : null;
  return d ? d.toLocaleDateString('fr-CA') : '';
};

const ConcoursSection: React.FC = () => {
  const [items, setItems] = useState<ParticipationWJW[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recharger = () => {
    setLoading(true);
    listerConcoursWJW().then((rows) => { setItems(rows); setLoading(false); })
      .catch((e) => { setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
  };
  useEffect(recharger, []);

  const totalChances = useMemo(() => items.reduce((n, p) => n + (p.chances || 1), 0), [items]);
  const consentants = useMemo(() => items.filter((p) => p.consentementPartage).length, [items]);

  const poser = async (p: ParticipationWJW, gagnant: number | null) => {
    setBusy(p.courriel); setError(null);
    try {
      await poserGagnantWJW(p.courriel, gagnant);
      setItems((prev) => prev.map((x) => (x.courriel === p.courriel ? { ...x, gagnant } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const exporter = () => {
    const entetes = ['nom', 'courriel', 'telephone', 'chances', 'consentement_partage', 'inscrit_le', 'porte', 'prix_gagne'];
    const lignes = items.map((p) => [
      p.nom, p.courriel, p.telephone || '', String(p.chances || 1), p.consentementPartage ? 'oui' : 'non',
      dateCourte(p.inscritLe), p.viaCompte ? 'compte' : p.viaRecompense ? 'recompense' : 'formulaire',
      typeof p.gagnant === 'number' ? PRIX_CONCOURS_WJW[p.gagnant].titre : '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob(['﻿' + [entetes.join(','), ...lignes].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `concours-wjw-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="admin-title text-2xl">Concours William J. Walter</h1>
          <p className="admin-prose">
            La liste du tirage du 27 septembre : {items.length} personne{items.length > 1 ? 's' : ''}, {totalChances} chance{totalChances > 1 ? 's' : ''} dans le chapeau,
            {' '}{consentants} consentement{consentants > 1 ? 's' : ''} au partage avec William. Une personne inscrite par le formulaire ou par
            « Participer avec mon compte » a consenti; celle entrée par la récompense du 7e jour seulement n'a pas encore coché.
          </p>
        </div>
        <GhostButton type="button" onClick={exporter} disabled={items.length === 0}>
          <Download size={14} className="inline mr-1.5 -mt-0.5" /> Exporter en CSV
        </GhostButton>
      </div>

      {error && <p className="admin-prose" style={{ color: '#FCA5B0' }}>{error}</p>}

      {loading ? (
        <p className="admin-prose">Chargement…</p>
      ) : items.length === 0 ? (
        <EmptyState icon={Gift}>Personne n'est encore inscrit au concours.</EmptyState>
      ) : (
        <Card className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Nom', 'Courriel', 'Téléphone', 'Chances', 'Consentement', 'Inscrit le', 'Porte', 'Prix'].map((h) => (
                  <th key={h} className="px-4 py-3 font-sans uppercase tracking-[0.14em] text-[10px] opacity-70">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((p) => {
                const gagne = typeof p.gagnant === 'number';
                return (
                  <tr key={p.courriel} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td className="px-4 py-3 whitespace-nowrap">{p.nom}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{p.courriel}</td>
                    <td className="px-4 py-3 whitespace-nowrap opacity-80">{p.telephone || '·'}</td>
                    <td className="px-4 py-3">{p.chances || 1}</td>
                    <td className="px-4 py-3">
                      <Badge tone={p.consentementPartage ? 'accepted' : 'pending'}>{p.consentementPartage ? 'Oui' : 'Non'}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap opacity-80">{dateCourte(p.inscritLe)}</td>
                    <td className="px-4 py-3 whitespace-nowrap opacity-80">
                      {p.viaCompte ? 'Compte' : p.viaRecompense ? 'Récompense du 7e jour' : 'Formulaire'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {gagne ? (
                        <span className="inline-flex items-center gap-2">
                          <Badge tone="accepted">Prix {(p.gagnant as number) + 1}</Badge>
                          <button type="button" className="text-[11px] underline opacity-70" disabled={busy === p.courriel} onClick={() => poser(p, null)}>retirer</button>
                        </span>
                      ) : (
                        <span className="inline-flex gap-1">
                          {PRIX_CONCOURS_WJW.map((prix, i) => (
                            <button key={prix.titre} type="button" title={prix.titre} disabled={busy === p.courriel}
                                    onClick={() => poser(p, i)}
                                    className="px-2 py-1 rounded text-[11px] border border-white/15 hover:border-white/50 disabled:opacity-40">
                              {i + 1}
                            </button>
                          ))}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

export default ConcoursSection;
