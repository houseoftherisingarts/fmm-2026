import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Download, Music, ExternalLink, Crown } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { Badge, Card, EmptyState, GhostButton, downloadCsv, fmtDate } from '../primitives';
import { CURRENT_YEAR } from '../../../firebase/applications';
import {
  type MusicianApp, type MusicianStatus,
} from '../../../firebase/musicians';

interface Props {
  fetchAll:  () => Promise<MusicianApp[]>;
  updateOne: (uid: string, year: number, status: MusicianStatus, notes?: string) => Promise<void>;
}

const STATUS_LABEL: Record<MusicianStatus, string> = {
  pending:  'En attente',
  accepted: 'Acceptée',
  rejected: 'Refusée',
  waitlist: 'Liste d’attente',
};

const MusiquesSection: React.FC<Props> = ({ fetchAll, updateOne }) => {
  const [items, setItems]     = useState<MusicianApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<MusicianStatus | 'all'>('all');
  const [search, setSearch]   = useState('');
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [notesDraft, setNotesDraft]   = useState<Record<string, string>>({});
  const [error, setError]   = useState<string | null>(null);

  const { user: adminUser } = useAuth();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetchAll()
      .then((rows) => { if (alive) setItems(rows); })
      .catch((e) => {
        console.warn('[musique-admin] fetch failed', e);
        if (alive) {
          setItems([]);
          setError('Impossible de charger les candidatures — vérifiez la connexion Firestore.');
        }
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [fetchAll]);

  // Personalised greeting — Pitch (Éric Pichette) gets a dedicated nod.
  const adminEmail = (adminUser?.email || '').toLowerCase();
  const adminName  = adminUser?.displayName || '';
  const isPitch =
    adminEmail.includes('eric.pichette') ||
    adminEmail.includes('pitch') ||
    /pitch/i.test(adminName) ||
    /pichette/i.test(adminName);

  const filtered = useMemo(() => {
    let list = items;
    if (filter !== 'all') list = list.filter((m) => m.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((m) =>
        m.bandName.toLowerCase().includes(q) ||
        m.contactName.toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [items, filter, search]);

  const exportCsv = () => {
    const rows = filtered.map((m) => ({
      bandName:        m.bandName,
      contactName:     m.contactName,
      email:           m.email,
      phone:           m.phone,
      year:            m.year,
      status:          m.status,
      performerCount:  m.performerCount,
      genres:          (m.genres || []).join('|'),
      preferredStage:  m.preferredStage,
      daysAvailable:   (m.daysAvailable || []).join('|'),
      soundProvided:   m.soundProvided,
      powerNeed:       m.powerNeed,
      travelingFrom:   m.travelingFrom,
      needsLodging:    m.needsLodging ? 'oui' : 'non',
      website:         m.website || '',
      spotify:         m.spotify || '',
      createdAt:       fmtDate(m.createdAt),
    }));
    downloadCsv(`musiciens-${CURRENT_YEAR}.csv`, rows);
  };

  const setStatus = async (m: MusicianApp, status: MusicianStatus) => {
    const notes = notesDraft[m.uid];
    await updateOne(m.uid, m.year, status, notes);
    setItems((cur) => cur.map((x) => (x.uid === m.uid && x.year === m.year ? { ...x, status, adminNotes: notes ?? x.adminNotes } : x)));
  };

  return (
    <div className="space-y-6">
      {error && (
        <Card className="p-4 border border-blush/40 bg-blush/10">
          <p className="font-sans text-sm text-blush">{error}</p>
        </Card>
      )}
      {/* Personalised header for Pitch / generic for everyone else */}
      <Card className="p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-card bg-brass/15 border border-brass/40 text-brass flex items-center justify-center shrink-0">
            {isPitch ? <Crown size={20} /> : <Music size={20} />}
          </div>
          <div className="flex-1">
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px] font-semibold mb-1">
              {isPitch ? 'Console de Pitch' : 'Musique · responsable Éric Pichette (Pitch)'}
            </p>
            <h2 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-1">
              {isPitch ? `Bienvenue, ${adminName || 'Pitch'}` : 'Candidatures musicales'}
            </h2>
            <p className="font-editorial italic text-sm text-ivory-soft">
              {isPitch
                ? 'Toutes les candidatures de groupes pour le FMM atterrissent ici. Filtre, exporte, accepte ou refuse — Pitch a le dernier mot.'
                : 'Cette section regroupe les candidatures des groupes. Le pilotage opérationnel appartient à Éric Pichette (Pitch).'}
            </p>
          </div>
        </div>
      </Card>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1">
          {(['all', 'pending', 'accepted', 'waitlist', 'rejected'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-pill border text-xs font-sans uppercase tracking-widest transition ${
                filter === f
                  ? 'bg-brass/25 border-brass text-brass'
                  : 'bg-midnight-deep/40 border-ivory-soft/25 text-ivory-soft hover:border-ivory-soft/50'
              }`}
            >
              {f === 'all' ? 'Toutes' : STATUS_LABEL[f]}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Rechercher un groupe, un courriel…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[220px] bg-midnight-deep/40 border border-ivory-soft/20 rounded-card px-3 py-1.5 text-sm text-ivory placeholder:text-ivory-soft/50 focus:outline-none focus:border-brass/60"
        />
        <GhostButton onClick={exportCsv}>
          <Download size={14} className="inline mr-1.5 -mt-0.5" />CSV
        </GhostButton>
      </div>

      {/* List */}
      {loading ? (
        <EmptyState>Chargement…</EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState>Aucune candidature.</EmptyState>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => {
            const open = expandedUid === m.uid + '_' + m.year;
            return (
              <Card key={m.uid + '_' + m.year} className="p-0 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedUid(open ? null : m.uid + '_' + m.year)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {open ? <ChevronDown size={16} className="text-ivory-soft shrink-0" />
                          : <ChevronRight size={16} className="text-ivory-soft shrink-0" />}
                    <div className="min-w-0">
                      <p className="font-display title-medieval text-base md:text-lg text-ivory truncate">{m.bandName}</p>
                      <p className="font-editorial italic text-xs text-ivory-soft truncate">
                        {m.contactName} · {m.email} · {m.travelingFrom}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge tone={m.status}>{STATUS_LABEL[m.status]}</Badge>
                    <span className="hidden md:inline font-sans text-xs uppercase tracking-wider text-ivory-soft/60">{m.year}</span>
                  </div>
                </button>

                {open && (
                  <div className="px-5 pb-5 pt-1 space-y-4 border-t border-ivory-soft/15">
                    <Grid2>
                      <Field label="Genres">{(m.genres || []).join(', ') || '—'}</Field>
                      <Field label="Format">{m.performerCount}</Field>
                      <Field label="Jours">{(m.daysAvailable || []).join(', ') || '—'}</Field>
                      <Field label="Scène préférée">{m.preferredStage}</Field>
                      <Field label="Durée / Nb sets">{m.setLength} · {m.numberOfSets}</Field>
                      <Field label="Acoustique">
                        {m.soundProvided}{m.weatherDependent ? ' · ⚠ pluie sensible' : ''}
                      </Field>
                      <Field label="Électricité">{m.powerNeed}{m.powerNotes ? ` · ${m.powerNotes}` : ''}</Field>
                      <Field label="Éclairage">{m.lightingNeed}</Field>
                      <Field label="Hébergement / Repas">
                        {[m.needsLodging ? 'logement' : null, m.needsMeals ? 'repas' : null].filter(Boolean).join(' · ') || '—'}
                      </Field>
                      <Field label="Véhicules">{m.vehicleCount ?? '—'}</Field>
                    </Grid2>

                    {m.shortBio && (
                      <Section title="Bio">
                        <p className="font-editorial italic text-sm text-ivory-soft whitespace-pre-line">{m.shortBio}</p>
                      </Section>
                    )}

                    {(m.inputList || m.backlineNotes) && (
                      <Section title="Technique">
                        {m.inputList     && <p className="text-sm text-ivory mb-1"><span className="text-ivory-soft/70 mr-1">Input list:</span>{m.inputList}</p>}
                        {m.backlineNotes && <p className="text-sm text-ivory"><span className="text-ivory-soft/70 mr-1">Backline:</span>{m.backlineNotes}</p>}
                      </Section>
                    )}

                    {(m.whyFMM || m.specialRequests || m.feeExpectation) && (
                      <Section title="Notes du groupe">
                        {m.whyFMM          && <p className="text-sm text-ivory mb-1"><span className="text-ivory-soft/70 mr-1">Pourquoi FMM:</span>{m.whyFMM}</p>}
                        {m.feeExpectation  && <p className="text-sm text-ivory mb-1"><span className="text-ivory-soft/70 mr-1">Cachet:</span>{m.feeExpectation}</p>}
                        {m.specialRequests && <p className="text-sm text-ivory"><span className="text-ivory-soft/70 mr-1">Autres:</span>{m.specialRequests}</p>}
                      </Section>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                      {m.website && <a href={m.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-brass hover:text-brass-soft">Site <ExternalLink size={12} /></a>}
                      {m.spotify && <a href={m.spotify} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-emerald-400 hover:text-emerald-300">Spotify <ExternalLink size={12} /></a>}
                    </div>

                    <Section title="Notes admin">
                      <textarea
                        rows={2}
                        defaultValue={m.adminNotes || ''}
                        onChange={(e) => setNotesDraft((d) => ({ ...d, [m.uid]: e.target.value }))}
                        className="w-full bg-midnight-deep/60 border border-ivory-soft/20 rounded-card px-3 py-2 text-sm text-ivory placeholder:text-ivory-soft/40 focus:outline-none focus:border-brass/60"
                        placeholder="Pitch — réservé à l’équipe"
                      />
                    </Section>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <StatusBtn on={m.status === 'accepted'} tone="emerald" onClick={() => setStatus(m, 'accepted')}>Accepter</StatusBtn>
                      <StatusBtn on={m.status === 'waitlist'} tone="stone"   onClick={() => setStatus(m, 'waitlist')}>Liste d’attente</StatusBtn>
                      <StatusBtn on={m.status === 'pending'}  tone="amber"   onClick={() => setStatus(m, 'pending')}>En attente</StatusBtn>
                      <StatusBtn on={m.status === 'rejected'} tone="blush"   onClick={() => setStatus(m, 'rejected')}>Refuser</StatusBtn>
                    </div>
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

const Grid2: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">{children}</div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <p className="font-sans text-[10px] uppercase tracking-widest text-ivory-soft/60 mb-0.5">{label}</p>
    <p className="text-sm text-ivory">{children}</p>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <p className="font-sans text-[10px] uppercase tracking-widest text-ivory-soft/60 mb-1.5">{title}</p>
    {children}
  </div>
);

const StatusBtn: React.FC<{ on: boolean; tone: 'emerald' | 'stone' | 'amber' | 'blush'; onClick: () => void; children: React.ReactNode }> = ({ on, tone, onClick, children }) => {
  const tones: Record<string, string> = {
    emerald: on ? 'bg-emerald-400/25 border-emerald-400 text-emerald-300' : 'bg-midnight-deep/40 border-emerald-400/40 text-emerald-300/70 hover:bg-emerald-400/15',
    stone:   on ? 'bg-ivory-soft/20 border-ivory-soft text-ivory'         : 'bg-midnight-deep/40 border-ivory-soft/40 text-ivory-soft hover:bg-ivory-soft/10',
    amber:   on ? 'bg-amber-300/25 border-amber-300 text-amber-300'       : 'bg-midnight-deep/40 border-amber-300/40 text-amber-300/70 hover:bg-amber-300/15',
    blush:   on ? 'bg-blush/25 border-blush text-blush'                   : 'bg-midnight-deep/40 border-blush/40 text-blush/70 hover:bg-blush/15',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-pill border text-xs font-sans uppercase tracking-widest transition ${tones[tone]}`}
    >
      {children}
    </button>
  );
};

export default MusiquesSection;
