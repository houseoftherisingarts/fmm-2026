import React, { useEffect, useState } from 'react';
import { Target, ChevronDown } from 'lucide-react';
import { Card, Badge, EmptyState, fmtDate } from '../primitives';
import { listRapportsPubs, SOURCE_LABEL, type RapportPub, type SourcePub } from '../../../firebase/rapportsPubs';

// Rapports publicitaires (Meta, Google Ads, AdSense, journal) déposés
// par Claude après chaque analyse de campagne. Lecture seule pour
// l'instant : le contenu se verse par scripts/seed-rapports-pubs.mjs.

const SOURCE_TONE: Record<SourcePub, 'info' | 'pending' | 'accepted' | 'neutral'> = {
  meta: 'info',
  google_ads: 'pending',
  adsense: 'accepted',
  journal: 'neutral',
};

const PubliciteSection: React.FC = () => {
  const [rapports, setRapports] = useState<RapportPub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const live = await listRapportsPubs();
        if (!cancelled) setRapports(live);
      } catch (e) {
        console.warn('[publicite] list failed', e);
        if (!cancelled) setError('Impossible de charger les rapports.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-5">
      {error && (
        <Card className="p-4 border border-blush/40 bg-blush/8">
          <p className="font-sans text-sm text-blush">{error}</p>
        </Card>
      )}

      <p className="font-sans text-sm text-ivory-soft">
        Suivi des campagnes publicitaires du festival : Meta, Google Ads, AdSense et achats presse.
      </p>

      {loading ? (
        <Card className="p-8 text-center"><p className="font-sans text-sm text-stone">Chargement…</p></Card>
      ) : rapports.length === 0 ? (
        <EmptyState icon={Target}>
          Aucun rapport pour l'instant. Les analyses de campagne apparaîtront ici au fil des dépôts.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {rapports.map((r) => {
            const isOpen = open === r.id;
            return (
              <Card key={r.id} className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                      <Badge tone={SOURCE_TONE[r.source]}>{SOURCE_LABEL[r.source]}</Badge>
                      <span className="font-sans text-[11px] text-stone">{fmtDate(r.date)}</span>
                    </div>
                    <h3 className="font-display text-lg text-ivory">{r.titre}</h3>
                  </div>
                </div>

                <p className="font-sans text-sm text-ivory-soft leading-relaxed">{r.resume}</p>

                {r.lignes.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                    {r.lignes.map((l, i) => (
                      <div key={i} className="p-3 rounded-card border border-ivory-soft/15 bg-black/20">
                        <p className="font-sans uppercase tracking-wider text-[10px] text-brass mb-1">{l.libelle}</p>
                        <p className="font-sans text-sm text-ivory">{l.valeur}</p>
                      </div>
                    ))}
                  </div>
                )}

                {r.detail && (
                  <div className="mt-4 border-t border-ivory-soft/10 pt-3">
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : r.id)}
                      className="inline-flex items-center gap-1.5 font-sans uppercase tracking-wider text-[11px] text-brass hover:text-ivory transition"
                    >
                      <ChevronDown size={13} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      {isOpen ? 'Masquer le détail' : 'Voir le détail'}
                    </button>
                    {isOpen && (
                      <p className="font-sans text-sm text-ivory-soft leading-relaxed mt-3">{r.detail}</p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PubliciteSection;
