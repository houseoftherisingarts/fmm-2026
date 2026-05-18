import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Save, RotateCcw, Eye, MapPin } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getSchedule, setSchedule, parseScheduleBlock, formatScheduleBlock,
  CURRENT_SCHEDULE_YEAR,
  type ScheduleDay, type ScheduleItem,
} from '../../../firebase/schedule';
import {
  mockGetSchedule, mockSetSchedule,
} from '../../../firebase/mockSchedule';
import { Card, Input, Label, PrimaryButton, GhostButton, EmptyState } from '../primitives';

// ─── Horaire admin section ────────────────────────────────────────────
// Three day-tabs. For each day: a header form (FR + EN date strings)
// and one big textarea where Tristan pastes the day's schedule. Lines
// are parsed live as `TIME | LABEL | WHERE` and the right side shows
// the parsed preview. Saving writes the whole schedule doc to
// Firestore (or the mock in DEV_BYPASS).
//
// Bulk-paste workflow: copy the schedule from wherever Tristan keeps
// it, paste into the textarea, save. Single-line workflow: just edit
// any line and hit save. Same control either way.

interface Props {
  devBypass?: boolean;
}

const PASTE_HINT_FR =
  'Format : UNE LIGNE PAR ACTIVITÉ — heure | description | lieu\n' +
  'Séparateurs acceptés : « | », « — », « – », « - » (espace-tiret-espace).\n' +
  'Exemple :\n' +
  '17h00 | Ouverture des portes | Site\n' +
  '17h00 — Ouverture de la Boustifaille — Village gustatif';

const HoraireSection: React.FC<Props> = ({ devBypass = false }) => {
  const { user } = useAuth();

  const [days, setDays] = useState<ScheduleDay[]>([]);
  const [dayBlocks, setDayBlocks] = useState<string[]>([]);  // textarea contents per day
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  // Initial load — pulls the schedule doc and seeds the per-day
  // textareas with the formatted block view.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const doc = devBypass
          ? await mockGetSchedule()
          : (await getSchedule(CURRENT_SCHEDULE_YEAR));
        if (cancelled) return;
        const d = doc?.days ?? [];
        setDays(d);
        setDayBlocks(d.map((day) => formatScheduleBlock(day.items)));
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [devBypass]);

  // Live preview: parse the current textarea on every keystroke.
  const previewItems = useMemo<ScheduleItem[]>(() => {
    return parseScheduleBlock(dayBlocks[activeIdx] ?? '');
  }, [dayBlocks, activeIdx]);

  const onChangeBlock = (idx: number, value: string) => {
    setDayBlocks((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const onChangeDayMeta = (idx: number, field: 'dateFR' | 'dateEN' | 'id', value: string) => {
    setDays((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const onResetDay = () => {
    setDayBlocks((prev) => {
      const next = [...prev];
      next[activeIdx] = formatScheduleBlock(days[activeIdx]?.items ?? []);
      return next;
    });
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Merge parsed textarea items into the days array.
      const nextDays: ScheduleDay[] = days.map((d, i) => ({
        ...d,
        items: parseScheduleBlock(dayBlocks[i] ?? ''),
      }));
      const meta = {
        uid: user?.uid ?? 'dev',
        email: user?.email ?? 'dev@local',
      };
      if (devBypass) await mockSetSchedule(nextDays, meta);
      else           await setSchedule(nextDays, meta);
      setDays(nextDays);
      setSavedAt(new Date());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="font-editorial italic text-ivory-soft/70 p-6">Chargement de l’horaire…</p>;
  }

  if (days.length === 0) {
    return (
      <EmptyState icon={CalendarClock}>
        Aucun horaire enregistré. Initialisez-le côté Firestore ou via le mode démo.
      </EmptyState>
    );
  }

  const day = days[activeIdx];

  return (
    <div className="space-y-5">
      {/* Day tabs */}
      <Card className="p-0 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-3">
          {days.map((d, idx) => {
            const isActive = idx === activeIdx;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setActiveIdx(idx)}
                className="px-4 py-3 text-left transition-colors"
                style={{
                  background: isActive ? 'rgba(127, 176, 232, 0.10)' : 'transparent',
                  borderBottom: isActive ? '1px solid var(--admin-accent)' : '1px solid transparent',
                  color: isActive ? 'var(--admin-accent)' : 'var(--admin-text-mute)',
                }}
              >
                <span className="block font-sans uppercase tracking-[0.3em] text-[10px] mb-1">
                  Jour {idx + 1}
                </span>
                <span className="block font-display title-medieval text-sm" style={{ color: 'var(--admin-text)' }}>
                  {d.dateFR || d.id}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Day metadata — date labels */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <CalendarClock size={13} className="text-brass" />
          <p className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest">
            Étiquettes — {day.id}
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Date (FR)</Label>
            <Input
              type="text"
              value={day.dateFR}
              onChange={(e) => onChangeDayMeta(activeIdx, 'dateFR', e.target.value)}
              placeholder="Vendredi 25 septembre"
            />
          </div>
          <div>
            <Label>Date (EN)</Label>
            <Input
              type="text"
              value={day.dateEN}
              onChange={(e) => onChangeDayMeta(activeIdx, 'dateEN', e.target.value)}
              placeholder="Friday September 25"
            />
          </div>
        </div>
      </Card>

      {/* Bulk textarea + live preview */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Eye size={13} className="text-brass" />
            <p className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest">
              Horaire du jour
            </p>
          </div>
          <GhostButton type="button" onClick={onResetDay} title="Réinitialiser ce jour">
            <RotateCcw size={11} /> Annuler
          </GhostButton>
        </div>

        <p className="font-editorial italic text-[12px] mb-3 whitespace-pre-line"
           style={{ color: 'var(--admin-text-mute)' }}>
          {PASTE_HINT_FR}
        </p>

        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-4 items-start">
          {/* Editable block */}
          <textarea
            className="admin-input font-mono text-[12px] leading-relaxed min-h-[420px] resize-y"
            value={dayBlocks[activeIdx] ?? ''}
            onChange={(e) => onChangeBlock(activeIdx, e.target.value)}
            spellCheck={false}
            placeholder="17h00 | Ouverture des portes | Site"
          />

          {/* Live preview */}
          <div
            className="rounded-card px-4 py-3"
            style={{
              background: 'rgba(127, 176, 232, 0.04)',
              border: '1px solid var(--admin-line)',
              maxHeight: 520,
              overflowY: 'auto',
            }}
          >
            <p className="font-display title-medieval text-[10px] text-brass uppercase tracking-widest mb-3">
              Aperçu ({previewItems.length})
            </p>
            {previewItems.length === 0 ? (
              <p className="font-editorial italic text-[12px]" style={{ color: 'var(--admin-text-mute)' }}>
                Aucune ligne valide pour l’instant.
              </p>
            ) : (
              <ol className="space-y-2">
                {previewItems.map((it, i) => (
                  <li key={i} className="grid grid-cols-[auto_1fr] gap-3 items-start">
                    <span
                      className="font-display title-medieval text-[11px] tracking-[0.06em] pt-0.5 min-w-[88px]"
                      style={{ color: 'var(--color-amber-glow)' }}
                    >
                      {it.time || '—'}
                    </span>
                    <div>
                      <p className="font-sans text-sm" style={{ color: 'var(--admin-text)' }}>
                        {it.label || <em style={{ color: '#FCA5B0' }}>(libellé manquant)</em>}
                      </p>
                      {it.where && (
                        <p className="inline-flex items-center gap-1 mt-0.5 font-editorial italic text-[11px]"
                           style={{ color: 'var(--admin-text-mute)' }}>
                          <MapPin size={9} /> {it.where}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </Card>

      {/* Save bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-1">
        <div className="font-editorial italic text-[12px]" style={{ color: 'var(--admin-text-mute)' }}>
          {savedAt && <>Dernière sauvegarde : {savedAt.toLocaleTimeString('fr-CA')}</>}
          {error && <span style={{ color: '#FCA5B0' }}>Erreur — {error}</span>}
        </div>
        <PrimaryButton type="button" onClick={onSave} disabled={saving}>
          <Save size={12} /> {saving ? 'Sauvegarde…' : 'Sauvegarder tous les jours'}
        </PrimaryButton>
      </div>
    </div>
  );
};

export default HoraireSection;
