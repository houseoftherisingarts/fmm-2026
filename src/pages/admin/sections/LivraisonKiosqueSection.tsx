import React, { useEffect, useMemo, useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { Card, Badge, EmptyState, downloadCsv, GhostButton, fmtDate } from '../primitives';
import { watchLivraisons, type FicheLivraison } from '../../../firebase/livraisonKiosque';
import { JOURS, PLACES_PILOTE, argent } from '../../../content/livraisonKiosque';

// ─── Repas livrés au kiosque · le registre du pilote ─────────────────
// Dix places, ouvertes par le lien /kiosque/livraison. Les fiches
// payées arrivent en haut, puis celles dont la caisse est ouverte, puis
// la liste d'attente. À jours égaux, la plus ancienne passe devant, et
// les trois jours passent devant les autres (Alex, 10 septembre 2026).

const LIBELLE_JOUR: Record<string, string> = Object.fromEntries(
  JOURS.map((j) => [j.id, j.labelFR.replace(' septembre', '')]),
);

const TON: Record<FicheLivraison['statut'], 'accepted' | 'pending' | 'waitlist'> = {
  paye: 'accepted',
  'en-attente': 'pending',
  attente: 'waitlist',
};

const MOT: Record<FicheLivraison['statut'], string> = {
  paye: 'Payé',
  'en-attente': 'Caisse ouverte',
  attente: 'Liste d’attente',
};

const LivraisonKiosqueSection: React.FC = () => {
  const [fiches, setFiches] = useState<FicheLivraison[] | null>(null);
  useEffect(() => watchLivraisons(setFiches), []);

  const compte = useMemo(() => {
    const l = fiches || [];
    const payees = l.filter((f) => f.statut === 'paye');
    return {
      payees: payees.length,
      attente: l.filter((f) => f.statut === 'attente').length,
      repas: payees.reduce((n, f) => n + (f.personnes || 0) * (f.jours?.length || 0) * 2, 0),
      encaisse: payees.reduce((n, f) => n + (f.payeCents || f.totalCents || 0), 0),
    };
  }, [fiches]);

  const exporter = () => downloadCsv('repas-livres-kiosques.csv', (fiches || []).map((f) => ({
    kiosque: f.kiosque,
    contact: f.contact,
    courriel: f.courriel,
    telephone: f.telephone,
    personnes: f.personnes,
    jours: (f.jours || []).map((j) => LIBELLE_JOUR[j] || j).join(' · '),
    restrictions: f.restrictions || '',
    statut: MOT[f.statut] || f.statut,
    total: argent(f.payeCents || f.totalCents || 0, 'FR'),
  })));

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-ivory mb-1">Repas livrés au kiosque</h2>
            <p className="font-sans text-sm text-ivory-soft/70 max-w-xl">
              Le pilote ouvre {PLACES_PILOTE} places par le lien <span className="text-brass">/kiosque/livraison</span>, que rien n’annonce ailleurs sur le site. Cinquante dollars avant taxes par personne et par jour, deux repas livrés chaque jour.
            </p>
          </div>
          <GhostButton onClick={exporter} disabled={!fiches?.length}>Exporter en CSV</GhostButton>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <Chiffre valeur={`${compte.payees} / ${PLACES_PILOTE}`} mot="places payées" />
          <Chiffre valeur={String(compte.repas)} mot="repas à préparer" />
          <Chiffre valeur={argent(compte.encaisse, 'FR')} mot="encaissé, taxes comprises" />
          <Chiffre valeur={String(compte.attente)} mot="sur la liste d’attente" />
        </div>
      </Card>

      <Card>
        {fiches === null ? (
          <p className="font-sans text-sm text-ivory-soft/60">Lecture du registre…</p>
        ) : fiches.length === 0 ? (
          <EmptyState icon={UtensilsCrossed}>Aucun kiosque inscrit pour le moment.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="font-sans uppercase tracking-wider text-[10px] text-ivory-soft/50">
                  <th className="py-2 pr-4">Kiosque</th>
                  <th className="py-2 pr-4">Contact</th>
                  <th className="py-2 pr-4">Pers.</th>
                  <th className="py-2 pr-4">Jours</th>
                  <th className="py-2 pr-4">Restrictions</th>
                  <th className="py-2 pr-4">Statut</th>
                  <th className="py-2 pr-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="font-sans text-sm text-ivory">
                {fiches.map((f) => (
                  <tr key={f.id} className="border-t border-ivory-soft/10 align-top">
                    <td className="py-3 pr-4">
                      <span className="block">{f.kiosque}</span>
                      <span className="block text-[11px] text-ivory-soft/50">{fmtDate(f.payeLe || f.creeLe)}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="block">{f.contact}</span>
                      <span className="block text-[11px] text-ivory-soft/50">{f.courriel} · {f.telephone}</span>
                    </td>
                    <td className="py-3 pr-4 tabular-nums">{f.personnes}</td>
                    <td className="py-3 pr-4">
                      {(f.jours || []).map((j) => LIBELLE_JOUR[j] || j).join(' · ')}
                      {f.jours?.length === 3 && <span className="block text-[11px] text-brass">priorité</span>}
                    </td>
                    <td className="py-3 pr-4 max-w-[18rem] text-ivory-soft/80">{f.restrictions || '—'}</td>
                    <td className="py-3 pr-4"><Badge tone={TON[f.statut] || 'neutral'}>{MOT[f.statut] || f.statut}</Badge></td>
                    <td className="py-3 pr-4 text-right tabular-nums">{argent(f.payeCents || f.totalCents || 0, 'FR')}</td>
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

const Chiffre: React.FC<{ valeur: string; mot: string }> = ({ valeur, mot }) => (
  <div className="rounded-card border border-ivory-soft/15 bg-midnight-deep/50 px-4 py-3">
    <span className="block font-display text-2xl text-ivory tabular-nums">{valeur}</span>
    <span className="block font-sans text-[11px] uppercase tracking-wider text-ivory-soft/55 mt-1">{mot}</span>
  </div>
);

export default LivraisonKiosqueSection;
