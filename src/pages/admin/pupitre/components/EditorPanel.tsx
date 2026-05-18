import React from 'react';
import { LOGOS, PRESET_NAMES, PRESET_ROLES, TRANSLATIONS } from '../constants';
import { DocumentState, Language } from '../types';
import { Button } from './Button';
import { Download, FileCode, Check, Image as ImageIcon } from 'lucide-react';

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
    <div className="flex flex-col h-max gap-6 p-6 glass-panel rounded-xl3 border-r border-white/5">
      {/* Header & Language Switch */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="text-gold-500 hover:text-gold-400 p-1"
            title={lang === 'en' ? 'Nouveau document' : 'Nouveau document'}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h2 className="text-xl md:text-2xl font-display text-gold-gradient font-bold tracking-widest uppercase">
            {t('editor')}
          </h2>
        </div>
      </div>

      {/* Title Input */}
      {state.type !== 'invoice' && (
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-neutral-500 font-semibold pl-2">
            {t('titleLabel')}
          </label>
          <input
            type="text"
            value={state.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder={t('documentTitlePlaceholder')}
            className="w-full p-4 rounded-2xl glass-input text-lg font-display placeholder-neutral-600 transition-all duration-300"
          />
          {/* Title Size Slider */}
           <div className="flex items-center gap-3 px-2">
              <span className="text-[10px] uppercase text-neutral-500 w-16">{t('titleSize')}</span>
              <input 
                type="range" 
                min="24" 
                max="72" 
                value={state.titleSize} 
                onChange={(e) => onChange({ titleSize: parseInt(e.target.value) })}
                className="flex-grow h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-gold-500"
              />
              <span className="text-[10px] text-gold-500 w-6 text-right">{state.titleSize}</span>
           </div>
        </div>
      )}

      {/* Main Content Input */}
      <div className="space-y-2 flex-grow flex flex-col">
        <label className="text-xs uppercase tracking-widest text-neutral-500 font-semibold pl-2">
          {t('contentLabel')}
        </label>
        <textarea
          value={state.content}
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder={state.type === 'invoice' 
            ? (state.invoiceType === 'quote' 
                ? (lang === 'en' ? 'Quote notes...' : 'Notes de devis...') 
                : (lang === 'en' ? 'Invoice notes...' : 'Notes de facture...'))
            : t('documentBodyPlaceholder')}
          className="w-full flex-grow p-4 rounded-2xl glass-input resize-none font-serif text-lg leading-relaxed placeholder-neutral-600 transition-all duration-300 min-h-[100px]"
        />
         {/* Text Size Slider */}
         <div className="flex items-center gap-3 px-2">
            <span className="text-[10px] uppercase text-neutral-500 w-16">{t('textSize')}</span>
            <input 
              type="range" 
              min="12" 
              max="24" 
              value={state.textSize} 
              onChange={(e) => onChange({ textSize: parseInt(e.target.value) })}
              className="flex-grow h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-gold-500"
            />
            <span className="text-[10px] text-gold-500 w-6 text-right">{state.textSize}</span>
         </div>
      </div>

      {/* Invoice Specific Fields */}
      {state.type === 'invoice' && (
        <div className="space-y-4 border-t border-white/5 pt-4">
          <h3 className="text-sm font-display text-gold-gradient font-bold tracking-widest uppercase">
            {lang === 'en' ? 'Invoice / Quote Details' : 'Détails de la facture ou devis'}
          </h3>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-neutral-500 pl-2">
              {lang === 'en' ? 'Document Type' : 'Type de document'}
            </label>
            <select
              value={state.invoiceType}
              onChange={(e) => onChange({ invoiceType: e.target.value as 'quote' | 'invoice' })}
              className="w-full p-2 rounded-xl glass-input appearance-none text-sm"
            >
              <option value="invoice" className="bg-dark-800 text-neutral-200">
                {lang === 'en' ? 'Invoice' : 'Facture'}
              </option>
              <option value="quote" className="bg-dark-800 text-neutral-200">
                {lang === 'en' ? 'Quote' : 'Devis'}
              </option>
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-neutral-500 pl-2">
                {state.invoiceType === 'quote' 
                  ? (lang === 'en' ? 'Quote #' : 'Devis #')
                  : (lang === 'en' ? 'Invoice #' : 'Facture #')}
              </label>
              <input
                type="text"
                value={state.invoiceNumber}
                onChange={(e) => onChange({ invoiceNumber: e.target.value })}
                className="w-full p-2 rounded-xl glass-input text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-neutral-500 pl-2">
                {lang === 'en' ? 'Client Name' : 'Nom du client'}
              </label>
              <input
                type="text"
                value={state.clientName}
                onChange={(e) => onChange({ clientName: e.target.value })}
                className="w-full p-2 rounded-xl glass-input text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-neutral-500 pl-2">
              {lang === 'en' ? 'Client Address' : 'Adresse du client'}
            </label>
            <input
              type="text"
              value={state.clientAddress}
              onChange={(e) => onChange({ clientAddress: e.target.value })}
              className="w-full p-2 rounded-xl glass-input text-sm"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] uppercase tracking-widest text-neutral-500 pl-2">
                {lang === 'en' ? 'Services' : 'Services'}
              </label>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin pr-1">
              {state.services.map((svc, index) => (
                <div key={svc.id} className="flex gap-2 items-start bg-white/5 p-2 rounded-xl">
                  <div className="flex-grow space-y-2">
                    <input
                      type="text"
                      placeholder={lang === 'en' ? 'Description' : 'Description'}
                      value={svc.description}
                      onChange={(e) => {
                        const newServices = [...state.services];
                        newServices[index].description = e.target.value;
                        onChange({ services: newServices });
                      }}
                      className="w-full p-1.5 rounded-lg glass-input text-xs"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Qty"
                        value={svc.quantity}
                        onChange={(e) => {
                          const newServices = [...state.services];
                          newServices[index].quantity = parseFloat(e.target.value) || 0;
                          onChange({ services: newServices });
                        }}
                        className="w-16 p-1.5 rounded-lg glass-input text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Rate"
                        value={svc.rate}
                        onChange={(e) => {
                          const newServices = [...state.services];
                          newServices[index].rate = parseFloat(e.target.value) || 0;
                          onChange({ services: newServices });
                        }}
                        className="w-20 p-1.5 rounded-lg glass-input text-xs"
                      />
                      <input
                        type="number"
                        placeholder={lang === 'en' ? 'Discount' : 'Rabais'}
                        value={svc.discount || ''}
                        onChange={(e) => {
                          const newServices = [...state.services];
                          newServices[index].discount = parseFloat(e.target.value) || 0;
                          onChange({ services: newServices });
                        }}
                        className="w-20 p-1.5 rounded-lg glass-input text-xs"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const newServices = state.services.filter((_, i) => i !== index);
                      onChange({ services: newServices });
                    }}
                    className="text-red-400 hover:text-red-300 p-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                const newService = { id: Date.now().toString(), description: '', quantity: 1, rate: 0, discount: 0 };
                onChange({ services: [...state.services, newService] });
              }}
              className="w-full mt-2 py-2 border-2 border-dashed border-gold-500/30 text-gold-400 rounded-xl hover:bg-gold-500/10 hover:border-gold-500/60 transition-all text-xs uppercase tracking-widest"
            >
              + {lang === 'en' ? 'Add a service' : 'Ajouter un service'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-neutral-500 pl-2">
                TPS
              </label>
              <input
                type="text"
                value={state.tpsNumber}
                onChange={(e) => onChange({ tpsNumber: e.target.value })}
                className="w-full p-2 rounded-xl glass-input text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-neutral-500 pl-2">
                TVQ
              </label>
              <input
                type="text"
                value={state.tvqNumber}
                onChange={(e) => onChange({ tvqNumber: e.target.value })}
                className="w-full p-2 rounded-xl glass-input text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Branding Selectors */}
      <div className="space-y-6">
        
        {/* Paper Style Selector */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-neutral-500 font-semibold pl-2">
            {t('paperStyle')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onChange({ paperStyle: 'white' })}
              className={`p-2 rounded-xl border text-xs uppercase tracking-widest transition-all ${
                state.paperStyle === 'white' 
                  ? 'bg-gold-500/20 border-gold-500 text-gold-400' 
                  : 'bg-white/5 border-white/10 text-neutral-400 hover:border-gold-500/50'
              }`}
            >
              {t('paperWhite')}
            </button>
            <button
              onClick={() => onChange({ paperStyle: 'parchment' })}
              className={`p-2 rounded-xl border text-xs uppercase tracking-widest transition-all ${
                state.paperStyle === 'parchment' 
                  ? 'bg-gold-500/20 border-gold-500 text-gold-400' 
                  : 'bg-white/5 border-white/10 text-neutral-400 hover:border-gold-500/50'
              }`}
            >
              {t('paperParchment')}
            </button>
          </div>
        </div>

        {/* Logo Selector */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-neutral-500 font-semibold pl-2">
            {t('selectLogo')}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {LOGOS.map((logo) => (
              <button
                key={logo.id}
                onClick={() => onChange({ logoId: logo.id })}
                className={`
                  relative h-16 rounded-xl border transition-all duration-300 overflow-hidden group
                  ${state.logoId === logo.id 
                    ? 'border-gold-500 bg-gold-500/10 shadow-[0_0_10px_rgba(191,149,63,0.2)]' 
                    : 'border-white/10 bg-white/5 hover:border-gold-500/50'}
                `}
                title={logo.name}
              >
                <img src={logo.url} alt={logo.name} className="w-full h-full object-contain p-2 opacity-80 group-hover:opacity-100 transition-opacity" />
                {state.logoId === logo.id && (
                  <div className="absolute top-1 right-1 bg-gold-500 rounded-full p-0.5">
                    <Check className="w-2 h-2 text-black" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Signature & Date Controls */}
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-neutral-500 font-semibold pl-2">
              {t('signerNameLabel')}
            </label>
            {/* Non-super admins see a locked read-only field; super-admins
                (Tristan, Alex, others) get the full dropdown. */}
            {lockedSignerName ? (
              <div className="w-full p-3 rounded-xl glass-input text-sm font-sans flex items-center justify-between">
                <span>{state.signerName}</span>
                <span className="text-[10px] uppercase tracking-widest text-neutral-500">verrouillé</span>
              </div>
            ) : (
              <select
                value={state.signerName}
                onChange={(e) => onChange({ signerName: e.target.value })}
                className="w-full p-3 rounded-xl glass-input appearance-none cursor-pointer text-sm font-sans"
              >
                {PRESET_NAMES.map(name => (
                  <option key={name} value={name} className="bg-dark-800 text-neutral-200">
                    {name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-neutral-500 font-semibold pl-2">
              {t('signerRoleLabel')}
            </label>
            <select 
              value={state.signerRole}
              onChange={(e) => {
                const newRole = e.target.value;
                onChange({ signerRole: newRole });
                if (newRole !== 'Autre') {
                  onChange({ customRole: '' });
                }
              }}
              className="w-full p-3 rounded-xl glass-input appearance-none cursor-pointer text-sm font-sans"
            >
              {PRESET_ROLES.map(role => (
                <option key={role} value={role} className="bg-dark-800 text-neutral-200">
                  {role}
                </option>
              ))}
            </select>
          </div>

          {state.signerRole === 'Autre' && (
            <div className="space-y-2">
              <input
                type="text"
                value={state.customRole}
                onChange={(e) => onChange({ customRole: e.target.value })}
                placeholder={t('customRolePlaceholder')}
                className="w-full p-3 rounded-xl glass-input text-sm font-sans placeholder-neutral-600 transition-all duration-300"
              />
            </div>
          )}

          <div className="space-y-2">
             <label className="text-xs uppercase tracking-widest text-neutral-500 font-semibold pl-2">
              {t('date')}
            </label>
            <input 
              type="date"
              value={state.date}
              onChange={(e) => onChange({ date: e.target.value })}
              className="w-full p-3 rounded-xl glass-input appearance-none text-sm font-sans"
            />
          </div>
          
          {/* Note regarding signature */}
          <div className="p-3 rounded-xl bg-gold-900/20 border border-gold-500/20 text-xs text-gold-300/80 italic text-center">
            {lang === 'en' ? 'Please sign directly on the document preview.' : 'Veuillez signer directement sur l\'aperçu du document.'}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
        <Button 
          variant="primary" 
          onClick={onExportPdf} 
          disabled={isExporting}
          className="w-full"
          icon={<Download size={18} />}
        >
          {isExporting ? t('processing') : t('downloadPdf')}
        </Button>
        <div className="flex gap-3">
          <Button 
            variant="secondary" 
            onClick={onExportPng} 
            className="flex-1"
            icon={<ImageIcon size={18} />}
            disabled={isExporting}
          >
            {t('downloadPng')}
          </Button>
          <Button 
            variant="secondary" 
            onClick={onExportHtml} 
            className="flex-1"
            icon={<FileCode size={18} />}
          >
            {t('downloadHtml')}
          </Button>
        </div>
      </div>
    </div>
  );
};