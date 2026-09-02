import React from 'react';
import { LOGOS, PRESET_NAMES, PRESET_ROLES, TRANSLATIONS } from '../constants';
import { DocumentState, Language } from '../types';
import { Button } from './Button';
import { InvoiceFields } from './InvoiceFields';
import { Download, FileCode, Check, Image as ImageIcon, Lock, RotateCcw } from 'lucide-react';

// Le côté gauche du Pupitre : ce qu'on écrit, sur quel papier, et qui
// signe. Les champs sont regroupés en trois blocs annoncés par un
// intertitre et un filet de laiton, comme les sections de la régie.
// Avant, tout se suivait à la file et on cherchait la date au milieu
// des tailles de police.

interface EditorPanelProps {
  lang: Language;
  state: DocumentState;
  onChange: (updates: Partial<DocumentState>) => void;
  onExportPdf: () => void;
  onExportHtml: () => void;
  onExportPng: () => void;
  onToggleLang: () => void;
  isExporting: boolean;
  /** When set, the signer-name dropdown is hidden and only this name
   *  can be used (FMM permission rule: each admin signs their own
   *  name; only super-admins / Tristan / Alex can pick any). */
  lockedSignerName?: string | null;
}

// Un curseur de taille, avec sa valeur lisible au bout. Le chiffre est
// tabulaire pour que le rail ne bouge pas quand on passe de 9 à 10.
const Curseur: React.FC<{
  label: string; min: number; max: number; value: number; onChange: (v: number) => void;
}> = ({ label, min, max, value, onChange }) => (
  <div className="flex items-center gap-3">
    <span className="pu-label !text-[10px] !tracking-[0.18em] w-[86px] shrink-0">{label}</span>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10))}
      aria-label={label}
    />
    <span
      className="font-sans text-[12px] tabular-nums w-7 text-right shrink-0"
      style={{ color: 'var(--admin-brass-hi)' }}
    >
      {value}
    </span>
  </div>
);

const Bloc: React.FC<{ titre: string; children: React.ReactNode }> = ({ titre, children }) => (
  <section className="space-y-4">
    <header className="space-y-2">
      <p className="pu-eyebrow">{titre}</p>
      <hr className="pu-rule" />
    </header>
    {children}
  </section>
);

export const EditorPanel: React.FC<EditorPanelProps> = ({
  lang,
  state,
  onChange,
  onExportPdf,
  onExportHtml,
  onExportPng,
  isExporting,
  lockedSignerName,
}) => {
  const t = (key: string) => TRANSLATIONS[key][lang];

  return (
    <div className="flex flex-col gap-8">
      {/* ── Le texte ─────────────────────────────────────────── */}
      <Bloc titre={t('sectionText')}>
        {state.type !== 'invoice' && (
          <div className="space-y-2.5">
            <label className="pu-label" htmlFor="pu-titre">{t('titleLabel')}</label>
            <input
              id="pu-titre"
              type="text"
              value={state.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder={t('documentTitlePlaceholder')}
              className="pu-field !text-lg"
              style={{ fontFamily: 'var(--font-display-alt)', letterSpacing: '0.04em' }}
            />
            <Curseur
              label={t('titleSize')}
              min={24} max={72}
              value={state.titleSize}
              onChange={(v) => onChange({ titleSize: v })}
            />
          </div>
        )}

        <div className="space-y-2.5">
          <label className="pu-label" htmlFor="pu-contenu">{t('contentLabel')}</label>
          <textarea
            id="pu-contenu"
            value={state.content}
            onChange={(e) => onChange({ content: e.target.value })}
            placeholder={state.type === 'invoice' ? t('invoiceNotesPlaceholder') : t('documentBodyPlaceholder')}
            className="pu-field resize-y min-h-[230px] scrollbar-thin"
            style={{ fontFamily: 'var(--font-editorial)', fontSize: '1.0625rem', lineHeight: 1.6 }}
          />
          <Curseur
            label={t('textSize')}
            min={12} max={24}
            value={state.textSize}
            onChange={(v) => onChange({ textSize: v })}
          />
        </div>
      </Bloc>

      {state.type === 'invoice' && (
        <InvoiceFields lang={lang} state={state} onChange={onChange} />
      )}

      {/* ── Le papier ────────────────────────────────────────── */}
      <Bloc titre={t('sectionPaper')}>
        <div className="space-y-2.5">
          <span className="pu-label">{t('paperStyle')}</span>
          <div className="pu-seg w-full">
            <button type="button" data-active={state.paperStyle === 'white'} onClick={() => onChange({ paperStyle: 'white' })}>
              {t('paperWhite')}
            </button>
            <button type="button" data-active={state.paperStyle === 'parchment'} onClick={() => onChange({ paperStyle: 'parchment' })}>
              {t('paperParchment')}
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          <span className="pu-label">{t('selectLogo')}</span>
          <div className="grid grid-cols-3 gap-2.5">
            {LOGOS.map((logo) => {
              const actif = state.logoId === logo.id;
              return (
                <button
                  key={logo.id}
                  type="button"
                  onClick={() => onChange({ logoId: logo.id })}
                  className="relative h-[72px] rounded-[12px] overflow-hidden transition-colors duration-200"
                  style={{
                    background: 'rgba(4, 8, 12, 0.55)',
                    border: actif
                      ? '1px solid color-mix(in oklab, var(--admin-accent), transparent 35%)'
                      : '1px solid var(--admin-line-soft)',
                    boxShadow: actif
                      ? 'inset 0 1px 0 var(--admin-sheen), 0 0 22px -10px color-mix(in oklab, var(--admin-accent), transparent 40%)'
                      : 'inset 0 1px 0 var(--admin-sheen)',
                  }}
                  title={logo.name}
                  aria-pressed={actif}
                >
                  <img src={logo.url} alt={logo.name} className="w-full h-full object-contain p-2.5" />
                  {actif && (
                    <span
                      className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full grid place-items-center"
                      style={{ background: 'var(--admin-accent)', color: '#080D11' }}
                    >
                      <Check className="w-2.5 h-2.5" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </Bloc>

      {/* ── La signature ─────────────────────────────────────── */}
      <Bloc titre={t('sectionSeal')}>
        <div className="space-y-2.5">
          {/* Non-super admins see a locked read-only field; super-admins
              (Tristan, Alex, others) get the full dropdown. */}
          {lockedSignerName ? (
            <>
              <span className="pu-label">{t('signerNameLabel')}</span>
              <div className="pu-field pu-locked flex items-center justify-between gap-3">
                <span className="truncate">{state.signerName}</span>
                <span
                  className="inline-flex items-center gap-1.5 shrink-0 font-sans text-[10px] uppercase tracking-[0.22em]"
                  style={{ color: 'var(--admin-text-mute)' }}
                >
                  <Lock size={11} />
                  {t('signerLocked')}
                </span>
              </div>
            </>
          ) : (
            <>
              <label className="pu-label" htmlFor="pu-signataire">{t('signerNameLabel')}</label>
              <select
                id="pu-signataire"
                value={state.signerName}
                onChange={(e) => onChange({ signerName: e.target.value })}
                className="pu-field"
              >
                {PRESET_NAMES.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </>
          )}
        </div>

        <div className="space-y-2.5">
          <label className="pu-label" htmlFor="pu-fonction">{t('signerRoleLabel')}</label>
          <select
            id="pu-fonction"
            value={state.signerRole}
            onChange={(e) => {
              const newRole = e.target.value;
              onChange(newRole === 'Autre' ? { signerRole: newRole } : { signerRole: newRole, customRole: '' });
            }}
            className="pu-field"
          >
            {PRESET_ROLES.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>

        {state.signerRole === 'Autre' && (
          <input
            type="text"
            value={state.customRole}
            onChange={(e) => onChange({ customRole: e.target.value })}
            placeholder={t('customRolePlaceholder')}
            className="pu-field"
            aria-label={t('customRolePlaceholder')}
          />
        )}

        <div className="space-y-2.5">
          <label className="pu-label" htmlFor="pu-date">{t('date')}</label>
          <input
            id="pu-date"
            type="date"
            value={state.date}
            onChange={(e) => onChange({ date: e.target.value })}
            className="pu-field"
          />
        </div>

        <p
          className="pu-prose !text-[0.95rem] rounded-[12px] px-4 py-3"
          style={{
            background: 'color-mix(in oklab, var(--admin-accent), transparent 92%)',
            border: '1px solid color-mix(in oklab, var(--admin-accent), transparent 74%)',
          }}
        >
          {t('signNote')}
        </p>
      </Bloc>

      {/* ── Sortie ───────────────────────────────────────────── */}
      <div className="pu-seam pt-5 flex flex-col gap-3">
        <Button variant="primary" onClick={onExportPdf} disabled={isExporting} className="w-full" icon={<Download size={15} />}>
          {isExporting ? t('processing') : t('downloadPdf')}
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={onExportPng} disabled={isExporting} icon={<ImageIcon size={15} />}>
            PNG
          </Button>
          <Button variant="secondary" onClick={onExportHtml} disabled={isExporting} icon={<FileCode size={15} />}>
            HTML
          </Button>
        </div>
        <Button
          variant="ghost"
          onClick={() => window.location.reload()}
          className="w-full"
          icon={<RotateCcw size={14} />}
        >
          {t('newDocument')}
        </Button>
      </div>
    </div>
  );
};
