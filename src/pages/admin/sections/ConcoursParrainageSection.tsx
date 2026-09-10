import React, { useEffect, useMemo, useState } from 'react';
import { Download, Users, Dices, RefreshCw } from 'lucide-react';
import {
  listerCandidatsParrainage, tirerAuSort, type CandidatParrainage,
} from '../../../firebase/concoursParrainage';
import { Card, Badge, EmptyState, GhostButton, downloadCsv } from '../primitives';

// ─── Concours de parrainage (section admin) ─────────────────────────
// Personne ne s'inscrit ici : la liste se déduit des parrainages déjà
// déclarés, donc quiconque a amené une personne au festival y figure,
// avec une chance par filleul. Le bouton du tirage pioche devant tout
// le monde, pondéré par ces chances, sans rien écrire dans Firestore :
// le gagnant se note à la main une fois le prix remis.

const ConcoursParrainageSection: React.FC = () => {
  const [items, setItems] = useState<CandidatParrainage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gagnant, setGagnant] = useState<CandidatParrainage | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);

  const recharger = () => {
    setLoading(true);
    listerCandidatsParrainage()
      .then((rows) => { setItems(rows); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(recharger, []);

  const totalChances = useMemo(
    () => items.reduce((somme, c) => somme + c.chances, 0),
    [items],
  );

  const exporter = () => {
    downloadCsv('concours-parrainage.csv', items.map((c) => ({
      Nom: c.nom,
      Courriel: c.courriel,
      Code: c.code,
      Chances: c.chances,
      Filleuls: c.filleuls.join(' · '),
    })));
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl text-ivory">Concours de parrainage</h2>
            <p className="mt-1 text-sm text-ivory-soft/80">
              Ceux qui ont amené quelqu'un au festival, avec une chance par filleul.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <GhostButton onClick={recharger} disabled={loading}>
              <RefreshCw size={14} className="mr-2 inline" /> Rafraîchir
            </GhostButton>
            <GhostButton onClick={exporter} disabled={items.length === 0}>
              <Download size={14} className="mr-2 inline" /> Exporter
            </GhostButton>
            <GhostButton onClick={() => setGagnant(tirerAuSort(items))} disabled={items.length === 0}>
              <Dices size={14} className="mr-2 inline" /> Tirer au sort
            </GhostButton>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-6 text-sm text-ivory-soft/80">
          <span><strong className="text-ivory">{items.length}</strong> candidats</span>
          <span><strong className="text-ivory">{totalChances}</strong> chances dans le chapeau</span>
        </div>

        {gagnant && (
          <div className="mt-4 rounded-xl border border-[rgba(216,155,58,0.4)] bg-black/40 px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[rgba(216,155,58,0.85)]">
              Tiré au sort
            </div>
            <div className="mt-1 font-display text-lg text-ivory">{gagnant.nom}</div>
            <div className="text-sm text-ivory-soft/80">
              {gagnant.courriel || 'Sans courriel au dossier'} · {gagnant.chances} chance{gagnant.chances > 1 ? 's' : ''}
            </div>
            <button type="button" className="mt-2 text-[11px] underline opacity-70"
                    onClick={() => setGagnant(null)}>
              effacer
            </button>
          </div>
        )}
      </Card>

      {error && (
        <Card><p className="text-sm text-red-300">La liste ne s'est pas chargée : {error}</p></Card>
      )}

      <Card>
        {loading ? (
          <p className="py-6 text-center text-sm text-ivory-soft/70">Lecture des parrainages…</p>
        ) : items.length === 0 ? (
          <EmptyState icon={Users}>
            Personne n'a encore amené quelqu'un avec son code.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.14em] text-ivory-soft/60">
                  <th className="px-4 py-3">Parrain</th>
                  <th className="px-4 py-3">Courriel</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Chances</th>
                  <th className="px-4 py-3">Filleuls</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.uid} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td className="px-4 py-3 whitespace-nowrap">{c.nom}</td>
                    <td className="px-4 py-3 whitespace-nowrap opacity-80">{c.courriel || '·'}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs opacity-80">{c.code || '·'}</td>
                    <td className="px-4 py-3">
                      <Badge tone={c.chances >= 5 ? 'accepted' : 'neutral'}>{c.chances}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button type="button"
                              className="text-left underline decoration-dotted underline-offset-4 opacity-80 hover:opacity-100"
                              onClick={() => setOuvert(ouvert === c.uid ? null : c.uid)}>
                        {ouvert === c.uid ? c.filleuls.join(', ') : `${c.filleuls.length} personne${c.filleuls.length > 1 ? 's' : ''}`}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ConcoursParrainageSection;
