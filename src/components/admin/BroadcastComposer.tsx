import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone, Pencil, Send, X, Save, Check, AlertCircle,
  Sparkles, MapPin, Tent, Palette, Zap, ShieldCheck, Clock,
} from 'lucide-react';
import {
  type BroadcastTemplate, type BroadcastTemplateId,
  loadBroadcastTemplates, saveBroadcastTemplate,
} from '../../firebase/broadcasts';
import { sendInvitations } from '../../firebase/messages';
import { CURRENT_YEAR, type VendorApp } from '../../firebase/applications';

interface Props {
  /** All vendor applications — we filter to accepted-this-year. */
  vendors: VendorApp[];
  /** Admin doing the sending (Jesse). */
  adminUid: string;
  adminName: string;
}

// Icon map keyed by template ID. Drawn from the form's chapter
// register so the recipient sees the same vocabulary across the flow.
const TPL_ICON: Record<BroadcastTemplateId, React.ComponentType<{ size?: number; className?: string }>> = {
  welcome:     Sparkles,
  arrival:     MapPin,
  camping:     Tent,
  decorum:     Palette,
  electricity: Zap,
  safety:      ShieldCheck,
  schedule:    Clock,
};

// Display order of the buttons in the grid.
const TPL_ORDER: BroadcastTemplateId[] = [
  'welcome', 'arrival', 'camping', 'decorum', 'electricity', 'safety', 'schedule',
];

// ─── BroadcastComposer ───────────────────────────────────────────────
// Jesse's broadcast panel: a grid of pre-written instruction buttons.
// One click → the template fans out to every accepted vendor this
// year, lands in their client space as a branded invitation message.
// Pencil icon → opens an inline editor; her edits persist in Firestore.
const BroadcastComposer: React.FC<Props> = ({ vendors, adminUid, adminName }) => {
  const [templates, setTemplates] = useState<Record<BroadcastTemplateId, BroadcastTemplate> | null>(null);
  const [editing, setEditing] = useState<BroadcastTemplateId | null>(null);
  const [sending, setSending] = useState<BroadcastTemplateId | null>(null);
  const [lastSent, setLastSent] = useState<{ id: BroadcastTemplateId; count: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<number>(CURRENT_YEAR);

  // Eligible recipients = accepted vendors for the chosen year.
  const recipients = useMemo(
    () => vendors.filter((v) => v.status === 'accepted' && v.year === year),
    [vendors, year],
  );

  useEffect(() => {
    let live = true;
    loadBroadcastTemplates().then((t) => { if (live) setTemplates(t); });
    return () => { live = false; };
  }, []);

  const onSave = async (tpl: BroadcastTemplate) => {
    if (!templates) return;
    setTemplates({ ...templates, [tpl.id]: tpl });
    setEditing(null);
    try {
      await saveBroadcastTemplate(tpl, adminUid);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const onBroadcast = async (id: BroadcastTemplateId) => {
    if (!templates || sending) return;
    const tpl = templates[id];
    if (recipients.length === 0) {
      setError(`Aucun kiosque accepté pour ${year}.`);
      setTimeout(() => setError(null), 2400);
      return;
    }
    const ok = confirm(
      `Envoyer « ${tpl.title} » à ${recipients.length} kiosque${recipients.length === 1 ? '' : 's'} accepté${recipients.length === 1 ? '' : 's'} de ${year} ?`,
    );
    if (!ok) return;

    setSending(id); setError(null);
    try {
      const results = await sendInvitations(
        recipients.map((r) => ({ uid: r.uid })),
        {
          senderUid: adminUid,
          senderRole: 'admin',
          senderName: adminName,
          body: tpl.body,
          meta: {
            year,
            title:    tpl.title,
            eyebrow:  tpl.eyebrow,
            ctaLabel: tpl.ctaLabel,
            ctaHref:  tpl.ctaHref,
            signedBy: adminName,
          },
        },
      );
      const failed = results.filter((r) => !r.ok).length;
      setLastSent({ id, count: results.length - failed, failed });
      setTimeout(() => setLastSent(null), 6000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(null);
    }
  };

  if (!templates) {
    return (
      <div className="rounded-card border border-brass/25 bg-midnight-deep/50 px-5 py-6">
        <p className="font-editorial italic text-ivory-soft">Chargement de la bibliothèque…</p>
      </div>
    );
  }

  return (
    <section className="relative rounded-card border border-brass/30 bg-gradient-to-br from-midnight-deep via-midnight to-midnight-deep px-5 md:px-7 py-5 md:py-6">
      <header className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-brass/15 border border-brass/45 flex items-center justify-center text-brass">
            <Megaphone size={16} />
          </div>
          <div>
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px] mb-1">
              Diffusion · Marchands acceptés
            </p>
            <h3 className="font-display title-medieval text-lg md:text-xl text-ivory leading-tight">
              Consignes & invitations
            </h3>
            <p className="font-editorial text-xs md:text-sm text-ivory-soft mt-1.5 max-w-xl">
              Un clic envoie le message à <span className="text-brass">{recipients.length}</span> kiosque{recipients.length === 1 ? '' : 's'} accepté{recipients.length === 1 ? '' : 's'} pour {year}. Pour éditer un modèle, touche le crayon.
            </p>
          </div>
        </div>
        <YearSelect year={year} setYear={setYear} />
      </header>

      {/* Status banners */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-4 inline-flex items-center gap-2 px-3 py-2 rounded-card border border-blush/40 bg-blush/10 text-blush font-sans uppercase tracking-wider text-[11px]"
          >
            <AlertCircle size={13} /> {error}
          </motion.div>
        )}
        {lastSent && (
          <motion.div
            key={lastSent.id}
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-4 inline-flex items-center gap-2 px-3 py-2 rounded-card border border-emerald-400/40 bg-emerald-400/10 text-emerald-300 font-sans uppercase tracking-wider text-[11px]"
          >
            <Check size={13} />
            « {templates[lastSent.id].title} » envoyé à {lastSent.count} kiosque{lastSent.count === 1 ? '' : 's'}
            {lastSent.failed > 0 && ` · ${lastSent.failed} échec${lastSent.failed === 1 ? '' : 's'}`}
          </motion.div>
        )}
      </AnimatePresence>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TPL_ORDER.map((id) => (
          <li key={id}>
            <BroadcastButton
              tpl={templates[id]}
              icon={TPL_ICON[id]}
              busy={sending === id}
              disabled={recipients.length === 0}
              onBroadcast={() => onBroadcast(id)}
              onEdit={() => setEditing(id)}
            />
          </li>
        ))}
      </ul>

      {/* Inline editor */}
      <AnimatePresence>
        {editing && templates[editing] && (
          <TemplateEditor
            tpl={templates[editing]}
            onClose={() => setEditing(null)}
            onSave={onSave}
          />
        )}
      </AnimatePresence>
    </section>
  );
};

// ─── BroadcastButton ────────────────────────────────────────────────
const BroadcastButton: React.FC<{
  tpl: BroadcastTemplate;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  busy: boolean;
  disabled: boolean;
  onBroadcast: () => void;
  onEdit: () => void;
}> = ({ tpl, icon: Icon, busy, disabled, onBroadcast, onEdit }) => (
  <div
    className={`group relative flex items-stretch rounded-card border transition-all overflow-hidden ${
      disabled
        ? 'border-ivory-soft/15 bg-midnight-deep/40 opacity-60'
        : 'border-brass/35 bg-midnight-deep/60 hover:border-brass hover:bg-midnight-deep/80'
    }`}
  >
    {/* Main broadcast button */}
    <button
      type="button"
      onClick={onBroadcast}
      disabled={disabled || busy}
      className="flex-1 flex items-center gap-3 px-4 py-3.5 text-left disabled:cursor-not-allowed"
    >
      <span className={`w-9 h-9 rounded-card flex items-center justify-center shrink-0 transition ${
        disabled ? 'bg-ivory-soft/8 text-ivory-soft' : 'bg-brass/15 text-brass group-hover:bg-brass group-hover:text-midnight-deep'
      }`}>
        {busy ? (
          <span className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent border-current animate-spin" />
        ) : (
          <Icon size={15} />
        )}
      </span>
      <span className="flex-1 min-w-0">
        <p className="font-editorial italic uppercase tracking-[0.3em] text-[9px] text-brass/85 mb-0.5">
          {tpl.eyebrow}
        </p>
        <p className="font-display title-medieval text-sm text-ivory leading-tight truncate">
          {tpl.title}
        </p>
      </span>
      <Send size={13} className={`shrink-0 transition ${disabled ? 'text-ivory-soft/30' : 'text-brass/60 group-hover:text-brass group-hover:translate-x-0.5'}`} />
    </button>

    {/* Pencil edit affordance */}
    <button
      type="button"
      onClick={onEdit}
      aria-label={`Modifier ${tpl.title}`}
      className="px-3 border-l border-brass/20 text-ivory-soft hover:text-brass hover:bg-brass/10 transition"
    >
      <Pencil size={13} />
    </button>
  </div>
);

// ─── YearSelect ─────────────────────────────────────────────────────
const YearSelect: React.FC<{ year: number; setYear: (y: number) => void }> = ({ year, setYear }) => {
  const years = [CURRENT_YEAR, CURRENT_YEAR + 1];
  return (
    <div className="inline-flex items-center gap-1 p-0.5 rounded-card border border-brass/30 bg-midnight-deep/60">
      {years.map((y) => (
        <button
          key={y}
          type="button"
          onClick={() => setYear(y)}
          className={`px-3 py-1.5 font-sans uppercase tracking-[0.3em] text-[10px] rounded-card transition ${
            y === year
              ? 'bg-brass text-midnight-deep'
              : 'text-ivory-soft hover:text-brass'
          }`}
        >
          {y}
        </button>
      ))}
    </div>
  );
};

// ─── TemplateEditor ─────────────────────────────────────────────────
const TemplateEditor: React.FC<{
  tpl: BroadcastTemplate;
  onClose: () => void;
  onSave: (next: BroadcastTemplate) => void;
}> = ({ tpl, onClose, onSave }) => {
  const [draft, setDraft] = useState<BroadcastTemplate>(tpl);
  const [saving, setSaving] = useState(false);

  const dirty =
    draft.title !== tpl.title ||
    draft.eyebrow !== tpl.eyebrow ||
    draft.body !== tpl.body ||
    (draft.ctaLabel || '') !== (tpl.ctaLabel || '') ||
    (draft.ctaHref || '') !== (tpl.ctaHref || '');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    await onSave(draft);
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center px-4 md:px-8"
      style={{ background: 'rgba(8, 20, 36, 0.78)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <motion.form
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.3 }}
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl rounded-lg-card border border-brass/40 bg-midnight-deep p-6 md:p-8 max-h-[88vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-midnight/80 border border-ivory-soft/20 text-ivory-soft hover:text-brass hover:border-brass transition flex items-center justify-center"
          aria-label="Fermer"
        >
          <X size={14} />
        </button>

        <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px] mb-1">
          Modèle d’instruction
        </p>
        <h3 className="font-display title-medieval text-xl md:text-2xl text-ivory mb-6">
          Modifier « {tpl.title} »
        </h3>

        <div className="space-y-4">
          <Field label="Coiffe (sur-titre)">
            <input
              value={draft.eyebrow}
              onChange={(e) => setDraft({ ...draft, eyebrow: e.target.value })}
              className={INPUT_CLS}
              maxLength={80}
            />
          </Field>
          <Field label="Titre">
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className={INPUT_CLS}
              maxLength={120}
            />
          </Field>
          <Field label="Corps du message">
            <textarea
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              rows={10}
              className={`${INPUT_CLS} font-editorial leading-relaxed`}
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Libellé du bouton (optionnel)">
              <input
                value={draft.ctaLabel || ''}
                onChange={(e) => setDraft({ ...draft, ctaLabel: e.target.value })}
                className={INPUT_CLS}
                placeholder="Ex. : Ouvrir le plan du site"
                maxLength={60}
              />
            </Field>
            <Field label="Lien du bouton (optionnel)">
              <input
                value={draft.ctaHref || ''}
                onChange={(e) => setDraft({ ...draft, ctaHref: e.target.value })}
                className={INPUT_CLS}
                placeholder="/compte ou https://…"
                maxLength={400}
              />
            </Field>
          </div>
        </div>

        <div className="mt-7 pt-5 border-t border-ivory-soft/10 flex flex-wrap items-center justify-between gap-3">
          <p className="font-editorial italic text-xs text-ivory-soft max-w-md">
            Les modifications sont enregistrées au serveur — toute l’équipe verra la version mise à jour.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-sans uppercase tracking-wider text-[11px] text-ivory-soft hover:text-ivory transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!dirty || saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-[11px] font-semibold rounded-card hover:bg-brass-soft transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={13} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </motion.form>
    </motion.div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="block font-display title-medieval text-xs text-brass mb-1.5 uppercase tracking-wider">
      {label}
    </span>
    {children}
  </label>
);

const INPUT_CLS =
  'w-full bg-midnight-deep/70 border border-ivory-soft/20 px-3.5 py-2.5 text-sm font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-card resize-y';

export default BroadcastComposer;
