import React, { useMemo, useState } from 'react';
import {
  Calendar, ChevronDown, ChevronRight, Clock, Trash2, X, AlertCircle,
} from 'lucide-react';
import {
  type BenevoleApp, upsertBenevoleApp,
} from '../../firebase/applications';
import { type Team } from '../../firebase/teams';

// ─── Schedule editor ──────────────────────────────────────────────
// Mirrors Maïté's existing 2025 xlsx layout: rows = bénévoles grouped
// by station (team), columns = hourly slots, each cell is on/off for
// that hour. Plus a per-row "task" tag (e.g. "Caisse", "Service") and
// a per-station HA (heure d'arrivée).
//
// Persistence: each bénévole's shifts live on their own BenevoleApp
// record under `assignedShifts` (already in the schema). The editor
// reads from a list of accepted bénévoles + writes back via
// upsertBenevoleApp on every change. This keeps Firestore reads cheap
// and avoids a parallel /shifts collection.
//
// Days: vendredi (17h–22h), samedi (10h–22h), dimanche (10h–17h) —
// matches the 2025 spreadsheet but configurable via DAY_SLOTS below.

interface ShiftBlock {
  day:      'Vendredi' | 'Samedi' | 'Dimanche';
  station:  string;     // team id or free text
  start:    string;     // "10:00"
  end:      string;     // "11:00"
}

const DAY_SLOTS: { day: ShiftBlock['day']; hours: string[] }[] = [
  { day: 'Vendredi', hours: ['17:00','18:00','19:00','20:00','21:00','22:00'] },
  { day: 'Samedi',   hours: ['10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'] },
  { day: 'Dimanche', hours: ['10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'] },
];

interface Props {
  benevoles:  BenevoleApp[];   // accepted bénévoles only — pre-filtered upstream
  teams:      Team[];
  /** When true, mocks the upsert (useful for DEV bypass / showcase). */
  isDemo?: boolean;
  onChanged?: () => void;
}

const HoraireEditor: React.FC<Props> = ({ benevoles, teams, isDemo = false, onChanged }) => {
  const [day, setDay] = useState<ShiftBlock['day']>('Samedi');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [collapsedStations, setCollapsedStations] = useState<Record<string, boolean>>({});

  const dayMeta = DAY_SLOTS.find((d) => d.day === day)!;

  // Group bénévoles by team
  const grouped = useMemo(() => {
    const m: Record<string, BenevoleApp[]> = {};
    for (const b of benevoles) {
      const key = b.teamId || 'team-unassigned';
      if (!m[key]) m[key] = [];
      m[key].push(b);
    }
    return m;
  }, [benevoles]);

  const stationsToShow = useMemo(() => {
    const ordered = teams
      .filter((t) => grouped[t.id]?.length)
      .map((t) => ({ id: t.id, name: t.name, icon: t.icon, color: t.color }));
    if (grouped['team-unassigned']?.length) {
      ordered.push({ id: 'team-unassigned', name: 'Non assigné·es', icon: '⏳', color: '#999' });
    }
    return ordered;
  }, [teams, grouped]);

  const cellOn = (b: BenevoleApp, hour: string): boolean => {
    if (!b.assignedShifts) return false;
    return b.assignedShifts.some((s) =>
      s.day === day && s.start === hour,
    );
  };

  const toggleCell = async (b: BenevoleApp, hour: string, station: string) => {
    setBusy(true); setErr(null);
    try {
      const idx  = (DAY_SLOTS.find((d) => d.day === day)?.hours || []).indexOf(hour);
      const next = (DAY_SLOTS.find((d) => d.day === day)?.hours || [])[idx + 1] || hour;
      const stationName = teams.find((t) => t.id === station)?.name || station;
      const existingShifts = b.assignedShifts || [];
      const isOn = existingShifts.some((s) => s.day === day && s.start === hour);
      const updated = isOn
        ? existingShifts.filter((s) => !(s.day === day && s.start === hour))
        : [...existingShifts, { day, start: hour, end: next, station: stationName }];
      const nextApp: BenevoleApp = { ...b, assignedShifts: updated };
      if (!isDemo) await upsertBenevoleApp(nextApp);
      // Optimistic mutation in the source array (parent passes ref). The
      // parent should re-fetch via onChanged to get authoritative state.
      b.assignedShifts = updated;
      onChanged?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const clearDay = async (b: BenevoleApp) => {
    if (!confirm(`Effacer tous les quarts de ${b.prenom || b.nom} pour ${day} ?`)) return;
    setBusy(true);
    try {
      const filtered = (b.assignedShifts || []).filter((s) => s.day !== day);
      if (!isDemo) await upsertBenevoleApp({ ...b, assignedShifts: filtered });
      b.assignedShifts = filtered;
      onChanged?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      {/* ── Header / day tabs ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-brass" />
          <h3 className="font-display title-medieval text-sm text-ivory">Horaire bénévole · 2026</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {DAY_SLOTS.map((d) => (
            <button key={d.day} onClick={() => setDay(d.day)}
              className={`px-3 py-1.5 rounded-card font-sans uppercase tracking-wider text-[11px] transition ${
                day === d.day ? 'bg-brass text-midnight-deep' : 'border border-ivory-soft/20 text-ivory-soft hover:border-brass hover:text-brass'
              }`}>
              {d.day}
            </button>
          ))}
        </div>
      </div>

      {err && (
        <div className="rounded-card border border-blush/40 bg-blush/10 px-4 py-2.5 flex items-center gap-2">
          <AlertCircle size={13} className="text-blush" />
          <p className="font-editorial italic text-xs text-blush">{err}</p>
          <button onClick={() => setErr(null)} className="ml-auto text-blush hover:opacity-70"><X size={11} /></button>
        </div>
      )}

      {benevoles.length === 0 ? (
        <div className="text-center py-12 text-ivory-soft/60 border border-ivory-soft/15 rounded-card">
          <Calendar size={28} className="mx-auto mb-2 opacity-40" />
          <p className="font-editorial italic text-sm">
            Aucun·e bénévole accepté·e pour l'instant. Acceptez quelqu'un dans l'onglet Bénévoles pour commencer à planifier.
          </p>
        </div>
      ) : (
        <div className="rounded-card border border-ivory-soft/15 bg-midnight overflow-x-auto">
          {stationsToShow.map((s) => {
            const roster = grouped[s.id] || [];
            const collapsed = !!collapsedStations[s.id];
            return (
              <section key={s.id} className="border-b border-ivory-soft/10 last:border-b-0">
                <button onClick={() => setCollapsedStations((p) => ({ ...p, [s.id]: !p[s.id] }))}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-ivory-soft/[0.03] transition"
                  style={{ borderLeft: `3px solid ${s.color || 'transparent'}` }}>
                  {collapsed ? <ChevronRight size={13} className="text-ivory-soft" /> : <ChevronDown size={13} className="text-brass" />}
                  <span className="text-base">{s.icon || '🏛️'}</span>
                  <span className="font-display title-medieval text-sm text-ivory">{s.name}</span>
                  <span className="font-editorial italic text-[11px] text-ivory-soft/60 ml-1">— {roster.length} bénévole{roster.length > 1 ? 's' : ''}</span>
                </button>
                {!collapsed && (
                  <div className="overflow-x-auto">
                    <table className="min-w-max w-full text-xs font-sans">
                      <thead className="bg-midnight-deep/50 border-b border-ivory-soft/10">
                        <tr>
                          <th className="text-left px-3 py-2 sticky left-0 bg-midnight-deep/95 backdrop-blur z-10 min-w-[12rem] font-display title-medieval text-[10px] text-brass uppercase tracking-widest">
                            Bénévole
                          </th>
                          {dayMeta.hours.map((h) => (
                            <th key={h} className="px-1 py-2 text-center font-mono tabular-nums text-ivory-soft/70 min-w-[3rem] border-l border-ivory-soft/10">
                              {h}
                            </th>
                          ))}
                          <th className="px-2 py-2 text-right font-display title-medieval text-[9px] text-ivory-soft/60 uppercase tracking-widest sticky right-0 bg-midnight-deep/95 backdrop-blur z-10">
                            ⌧
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {roster.map((b) => {
                          const fullName = `${b.prenom || ''} ${b.nom || ''}`.trim() || b.displayName;
                          const isLeader = b.teamRole === 'leader';
                          const dayShifts = (b.assignedShifts || []).filter((sh) => sh.day === day);
                          return (
                            <tr key={b.uid} className="border-b border-ivory-soft/[0.06] hover:bg-ivory-soft/[0.02] group">
                              <td className="px-3 py-1.5 sticky left-0 bg-midnight z-10 backdrop-blur min-w-[12rem]">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className={`font-display title-medieval text-sm truncate ${isLeader ? 'text-brass' : 'text-ivory'}`}>{fullName}</span>
                                  {isLeader && <span className="text-brass shrink-0" title="Responsable">★</span>}
                                </div>
                                {dayShifts.length > 0 && (
                                  <p className="font-editorial italic text-[10px] text-ivory-soft/50 truncate">
                                    {dayShifts[0].start}–{dayShifts[dayShifts.length - 1].end}
                                  </p>
                                )}
                              </td>
                              {dayMeta.hours.map((h) => {
                                const on = cellOn(b, h);
                                return (
                                  <td key={h} className="p-0 border-l border-ivory-soft/10 text-center">
                                    <button
                                      onClick={() => toggleCell(b, h, s.id)}
                                      disabled={busy}
                                      className={`w-full h-8 transition ${
                                        on
                                          ? 'bg-brass/40 hover:bg-brass/60 text-midnight-deep font-bold'
                                          : 'hover:bg-ivory-soft/10 text-ivory-soft/30'
                                      }`}
                                      title={`${b.prenom} — ${day} ${h}`}
                                    >
                                      {on ? '●' : ''}
                                    </button>
                                  </td>
                                );
                              })}
                              <td className="px-2 py-1.5 sticky right-0 bg-midnight z-10 backdrop-blur text-right">
                                {dayShifts.length > 0 && (
                                  <button onClick={() => clearDay(b)} disabled={busy}
                                    title={`Effacer tous les quarts de ${day}`}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-card text-ivory-soft hover:text-blush hover:bg-blush/10 transition disabled:opacity-30">
                                    <Trash2 size={11} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <p className="font-editorial italic text-[11px] text-ivory-soft/60">
        Cliquez une cellule pour ajouter / retirer un quart d'une heure. Les changements sont enregistrés immédiatement.
        {busy && <span className="ml-2 text-brass"><Clock size={10} className="inline" /> enregistrement…</span>}
      </p>
    </div>
  );
};

export default HoraireEditor;
