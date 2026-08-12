import React, { useEffect, useMemo, useState } from 'react';
import { Crown, Trash2, Mail, Phone, Download } from 'lucide-react';
import { Card, EmptyState, GhostButton, downloadCsv } from '../primitives';
import {
  listSponsorRequests, updateSponsorRequest, deleteSponsorRequest,
  PLAN_LABEL, STATUS_LABEL,
  type SponsorRequest, type SponsorRequestStatus, type SponsorPlan,
} from '../../../firebase/commanditaires';

// Les demandes soumises par le formulaire public /commanditaires
// (plans Baron / Comte / Duc du Festival) atterrissent ici.

interface Props { devBypass: boolean }

const PLAN_TONE: Record<SponsorPlan, string> = {
  baron: 'text-ivory-soft border-white/20',
  comte: 'text-brass border-brass/40',
  duc:   'text-midnight-deep bg-brass border-brass font-semibold',
};

const STATUS_TONE: Record<SponsorRequestStatus, string> = {
  new:       'text-brass',
  contacted: 'text-ivory-soft',
  signed:    'text-emerald-300',
  declined:  'text-stone',
};

const fmtDate = (r: SponsorRequest) => {
  const d = r.createdAt?.toDate?.();
  return d ? d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
};

const CommanditairesSection: React.FC<Props> = ({ devBypass }) => {
  const [items, setItems] = useState<SponsorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | SponsorRequestStatus>('all');

  const reload = async () => {
    setError(null);
    try {
      setItems(await listSponsorRequests());
    } catch (err) {
      console.warn('[CommanditairesSection] list failed:', err);
      if (!devBypass) setError('Impossible de charger les demandes. Réessayez.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, []);

  const visible = useMemo(
    () => items.filter((r) => filter === 'all' || r.status === filter),
    [items, filter],
  );

  const onSetStatus = async (r: SponsorRequest, status: SponsorRequestStatus) => {
    try { await updateSponsorRequest(r.id, { status }); reload(); }
    catch { setError('Erreur lors de la mise à jour du statut.'); }
  };
  const onDelete = async (r: SponsorRequest) => {
    if (!confirm(`Supprimer la demande de ${r.company} ?`)) return;
    try { await deleteSponsorRequest(r.id); reload(); }
    catch { setError('Erreur lors de la suppression.'); }
  };

  const exportCsv = () => downloadCsv('fmm-commanditaires.csv', items.map((r) => ({
    plan: PLAN_LABEL[r.plan], entreprise: r.company, contact: r.contactName,
    courriel: r.email, telephone: r.phone, message: r.message,
    langue: r.lang, statut: STATUS_LABEL[r.status], recue: fmtDate(r),
  })));

  return (
    <div className="space-y-5">
      {error && (
        <Card className="p-4 border border-blush/40 bg-blush/8">
          <p className="font-sans text-sm text-blush">{error}</p>
        </Card>
      )}

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <p className="font-editorial italic text-sm text-ivory-soft">
          Demandes du formulaire public <span className="text-brass">/commanditaires</span> · plans Baron, Comte, Duc du Festival
        </p>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="bg-black/30 border border-white/15 rounded-card px-3 py-1.5 font-sans text-xs text-ivory"
          >
            <option value="all">Toutes</option>
            {(Object.keys(STATUS_LABEL) as SponsorRequestStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
          <GhostButton onClick={exportCsv}><Download size={14} /> CSV</GhostButton>
        </div>
      </div>

      {loading ? (
        <Card className="p-8 text-center"><p className="font-sans text-sm text-stone">Chargement…</p></Card>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Crown}
          title="Aucune demande"
          body="Les demandes soumises depuis la page publique des commanditaires apparaîtront ici."
        />
      ) : (
        <div className="space-y-3">
          {visible.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap mb-1">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 border rounded-card font-sans uppercase tracking-wider text-[10px] ${PLAN_TONE[r.plan]}`}>
                      <Crown size={11} /> {PLAN_LABEL[r.plan]}
                    </span>
                    <span className={`font-sans uppercase tracking-wider text-[10px] ${STATUS_TONE[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                    <span className="font-sans text-[10px] text-stone">{fmtDate(r)} · {r.lang}</span>
                  </div>
                  <h3 className="font-display text-lg text-ivory">{r.company}</h3>
                  <p className="font-sans text-sm text-ivory-soft">{r.contactName}</p>
                  <div className="flex items-center gap-4 flex-wrap mt-1.5">
                    <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1.5 font-sans text-xs text-brass hover:underline">
                      <Mail size={12} /> {r.email}
                    </a>
                    {r.phone && (
                      <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1.5 font-sans text-xs text-brass hover:underline">
                        <Phone size={12} /> {r.phone}
                      </a>
                    )}
                  </div>
                  {r.message && (
                    <p className="font-editorial text-sm text-ivory-soft leading-relaxed mt-3 border-l-2 border-brass/40 pl-3">
                      {r.message}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={r.status}
                    onChange={(e) => onSetStatus(r, e.target.value as SponsorRequestStatus)}
                    className="bg-black/30 border border-white/15 rounded-card px-3 py-1.5 font-sans text-xs text-ivory"
                  >
                    {(Object.keys(STATUS_LABEL) as SponsorRequestStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                  <GhostButton onClick={() => onDelete(r)} title="Supprimer">
                    <Trash2 size={14} />
                  </GhostButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommanditairesSection;
