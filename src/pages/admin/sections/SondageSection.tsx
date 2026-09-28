import React, { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { listerSondages, type ReponseSondage, type ValeurReponse } from '../../../firebase/sondageRetour';
import { QUESTIONS_SONDAGE } from '../../../content/sondageRetour';
import { Card, EmptyState, GhostButton } from '../primitives';

// ─── Sondage de retour 2026 (section admin) ─────────────────────────
// Tableau de bord (Alex, 2026-09-28) : les chiffres de tête pour les
// subventions, puis chaque question en barres, par partie. « Exporter » descend tout en CSV pour les demandes de
// subvention.

const SondageSection: React.FC = () => {
  const [items, setItems] = useState<ReponseSondage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listerSondages().then((r) => { setItems(r); setLoading(false); })
      .catch((e) => { setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
  }, []);

  const bilan = useMemo(() => QUESTIONS_SONDAGE.map((q) => {
    const vals = items.map((i) => i.reponses[q.id]).filter((v) => v !== undefined);
    if (q.type === 'note') {
      const n = vals.filter((v): v is number => typeof v === 'number');
      return { q, n: n.length, moyenne: n.length ? n.reduce((a, b) => a + b, 0) / n.length : 0 };
    }
    if (q.type === 'classement') {
      // Rang moyen de chaque poste : plus il est petit, plus le poste
      // est prioritaire aux yeux des répondants.
      const listes = vals.filter((v): v is string[] => Array.isArray(v));
      const rangs = q.options!.map((o) => {
        const r = listes.map((l) => l.indexOf(o.id)).filter((i) => i >= 0);
        return { o, rang: r.length ? r.reduce((a, b) => a + b, 0) / r.length + 1 : 0 };
      }).sort((a, b) => a.rang - b.rang);
      const autres = items.map((i) => i.reponses[`${q.id}Autre`]).filter((v): v is string => typeof v === 'string' && !!v);
      return { q, n: listes.length, rangs, autres };
    }
    if (q.type === 'choix' || q.type === 'plusieurs') {
      const compte = new Map<string, number>();
      vals.flatMap((v) => (Array.isArray(v) ? v : [String(v)])).forEach((id) => compte.set(id, (compte.get(id) ?? 0) + 1));
      const autres = items.map((i) => i.reponses[`${q.id}Autre`]).filter((v): v is string => typeof v === 'string' && !!v);
      return { q, n: vals.length, compte, autres };
    }
    return { q, n: vals.length, textes: vals.filter((v): v is string => typeof v === 'string') };
  }), [items]);

  const exporter = () => {
    const cles = QUESTIONS_SONDAGE.flatMap((q) => ((q.type === 'classement' || q.options?.some((o) => o.id === 'autre' || o.preciser)) ? [q.id, `${q.id}Autre`] : [q.id]));
    const lignes = items.map((i) => [
      i.envoyeLe?.toDate?.().toISOString() ?? '', i.langue,
      ...cles.map((k) => { const v = i.reponses[k]; return Array.isArray(v) ? v.join(' | ') : v ?? ''; }),
    ].map((v) => {
      // Les réponses libres viennent du public : une cellule qui commence
      // par = + - @ deviendrait une formule dans Excel.
      const texte = String(v);
      const sur = /^[=+\-@\t\r]/.test(texte) ? `'${texte}` : texte;
      return `"${sur.replace(/"/g, '""')}"`;
    }).join(','));
    const blob = new Blob(['﻿' + [['envoye_le', 'langue', ...cles].join(','), ...lignes].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `sondage-retour-2026-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Les chiffres de tête, ceux qui vont dans les demandes de subvention.
  const kpis = useMemo(() => {
    const vals = (id: string) => items.map((i) => i.reponses[id]).filter((v) => v !== undefined && v !== '');
    const part = (id: string, oui: (v: ValeurReponse) => boolean) => {
      const v = vals(id); return v.length ? Math.round((v.filter(oui).length / v.length) * 100) : null;
    };
    const moy = (id: string) => { const v = vals(id).filter((x): x is number => typeof x === 'number'); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
    // Milieux de tranche : une estimation, affichée comme telle.
    const MILIEU: Record<string, number> = { '0': 0, '0-50': 25, '50-100': 75, '50-150': 100, '100-200': 150, '150-300': 225, '200-400': 300, '300+': 400, '400+': 500 };
    const moyTranche = (id: string) => { const v = vals(id).map((x) => MILIEU[String(x)]).filter((x) => x !== undefined); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
    const nuits = vals('nuitees').reduce<number>((a, v) => a + (v === '3+' ? 3 : Number(v) || 0), 0);
    return [
      { label: 'Réponses', valeur: String(items.length) },
      { label: 'Note globale', valeur: moy('noteGlobale') !== null ? `${moy('noteGlobale')!.toFixed(2)} / 5` : '–' },
      { label: 'Première visite', valeur: pct(part('premiereVisite', (v) => v === 'oui')) },
      { label: 'Venus de 40 km et plus', valeur: pct(part('distance', (v) => v !== 'm40')) },
      { label: 'Festival = raison principale', valeur: pct(part('motif', (v) => v === 'principale')) },
      { label: 'Nuitées déclarées (au moins)', valeur: String(nuits) },
      { label: 'Dépense sur le site, par groupe', valeur: moyTranche('depensesSite') !== null ? `≈ ${moyTranche('depensesSite')} $` : '–' },
      { label: 'Dépense dans la région, par groupe', valeur: moyTranche('depensesRegion') !== null ? `≈ ${moyTranche('depensesRegion')} $` : '–' },
      { label: 'Le recommanderaient', valeur: pct(part('recommander', (v) => v === 'certainement' || v === 'probablement')) },
      { label: 'Intérêt pour le bénévolat', valeur: pct(part('benevolat', (v) => v === 'oui' || v === 'peutEtre')) },
    ];
  }, [items]);

  if (loading) return <p className="admin-prose">Chargement…</p>;

  let section = '';
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="admin-title text-2xl">Sondage de retour 2026</h1>
          <p className="admin-prose">{items.length} réponse{items.length > 1 ? 's' : ''} reçue{items.length > 1 ? 's' : ''} par la page /sondage. Les montants en dollars sont estimés au milieu de chaque tranche.</p>
        </div>
        <GhostButton type="button" onClick={exporter} disabled={items.length === 0}>
          <Download size={14} className="inline mr-1.5 -mt-0.5" /> Exporter en CSV
        </GhostButton>
      </div>
      {error && <p className="admin-prose" role="alert">{error}</p>}
      {items.length === 0 ? <EmptyState>Aucune réponse pour l’instant.</EmptyState> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {kpis.map((k) => (
              <Card key={k.label} className="p-4">
                <p className="admin-prose text-xs uppercase tracking-[0.12em]">{k.label}</p>
                <p className="admin-title text-2xl mt-1" style={{ color: OR }}>{k.valeur}</p>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {bilan.map((b) => {
              const titre = b.q.section && b.q.section.FR !== section ? (section = b.q.section.FR) : null;
              const large = b.q.type === 'classement' || (b.q.options?.length ?? 0) > 8 || b.q.type === 'texte';
              return (
                <React.Fragment key={b.q.id}>
                  {titre && <h2 className="xl:col-span-2 admin-title text-lg mt-4" style={{ color: OR }}>{titre}</h2>}
                  <Card className={`p-5 ${large ? 'xl:col-span-2' : ''}`}>
                    <p className="admin-title text-base mb-3">{b.q.FR} <span className="admin-prose text-xs">({b.n})</span></p>
                    {'moyenne' in b && (
                      <div className="flex items-center gap-3">
                        <span className="admin-title text-3xl" style={{ color: OR }}>{(b.moyenne ?? 0).toFixed(2)}</span>
                        <div className="flex-1"><Barre ratio={(b.moyenne ?? 0) / 5} /></div>
                        <span className="admin-prose text-xs">sur 5</span>
                      </div>
                    )}
                    {'compte' in b && b.compte && (() => {
                      const lignes = b.q.options!.map((o) => ({ o, n: b.compte!.get(o.id) ?? 0 })).sort((x, y) => y.n - x.n);
                      return (
                        <ul className="space-y-1.5">
                          {lignes.map(({ o, n }) => (
                            <li key={o.id} className="grid grid-cols-[minmax(0,14rem)_1fr_4.5rem] items-center gap-3 admin-prose text-sm">
                              <span className="truncate" title={o.FR}>{o.FR}</span>
                              <Barre ratio={b.n ? n / b.n : 0} />
                              <span className="text-right"><strong>{n}</strong> · {pct(b.n ? Math.round((n / b.n) * 100) : null)}</span>
                            </li>
                          ))}
                          {b.autres && b.autres.length > 0 && <li className="admin-prose text-sm pt-2">Précisions : {b.autres.join(' · ')}</li>}
                        </ul>
                      );
                    })()}
                    {'rangs' in b && b.rangs && (
                      <ol className="space-y-1.5">
                        {b.rangs.map(({ o, rang }, i) => (
                          <li key={o.id} className="grid grid-cols-[2rem_minmax(0,18rem)_1fr_5rem] items-center gap-3 admin-prose text-sm">
                            <span className="admin-title" style={{ color: OR }}>{i + 1}</span>
                            <span className="truncate" title={o.FR}>{o.FR}</span>
                            <Barre ratio={rang ? 1 - (rang - 1) / b.q.options!.length : 0} />
                            <span className="text-right">rang {rang ? rang.toFixed(1) : '–'}</span>
                          </li>
                        ))}
                        {b.autres && b.autres.length > 0 && <li className="admin-prose text-sm pt-2">Précisions : {b.autres.join(' · ')}</li>}
                      </ol>
                    )}
                    {'textes' in b && b.textes && (
                      b.textes.length ? <ul className="admin-prose text-sm space-y-2 max-h-80 overflow-y-auto pr-2">{b.textes.map((x, i) => <li key={i}>« {x} »</li>)}</ul>
                        : <p className="admin-prose text-sm">Aucune réponse écrite.</p>
                    )}
                  </Card>
                </React.Fragment>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

const OR = '#E3C27A';
const pct = (n: number | null) => (n === null ? '–' : `${n} %`);
const Barre: React.FC<{ ratio: number }> = ({ ratio }) => (
  <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
    <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%`, background: OR }} />
  </div>
);

export default SondageSection;
