import React from 'react';
import { Plus, X } from 'lucide-react';
import { TRANSLATIONS } from '../constants';
import { DocumentState, InvoiceService, Language } from '../types';

// Les champs propres à la facture et au devis. Sortis d'EditorPanel le
// 2026-09-02 : le panneau frôlait les cinq cents lignes et la moitié
// n'apparaît que pour un document sur deux.
//
// Les services se réécrivent maintenant sans toucher aux objets déjà
// dans l'état. L'ancienne version copiait le tableau puis modifiait la
// ligne en place, donc la valeur d'avant et la valeur d'après
// pointaient sur le même objet.

interface InvoiceFieldsProps {
  lang: Language;
  state: DocumentState;
  onChange: (updates: Partial<DocumentState>) => void;
}

export const InvoiceFields: React.FC<InvoiceFieldsProps> = ({ lang, state, onChange }) => {
  const t = (key: string) => TRANSLATIONS[key][lang];
  const estDevis = state.invoiceType === 'quote';

  const majService = (index: number, champ: Partial<InvoiceService>) => {
    onChange({
      services: state.services.map((svc, i) => (i === index ? { ...svc, ...champ } : svc)),
    });
  };

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <p className="pu-eyebrow">{t('sectionInvoice')}</p>
        <hr className="pu-rule" />
      </header>

      <div className="space-y-2">
        <span className="pu-label">{t('docTypeLabel')}</span>
        <div className="pu-seg w-full">
          <button type="button" data-active={!estDevis} onClick={() => onChange({ invoiceType: 'invoice' })}>
            {t('invoiceWord')}
          </button>
          <button type="button" data-active={estDevis} onClick={() => onChange({ invoiceType: 'quote' })}>
            {t('quoteWord')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-2">
          <span className="pu-label">{estDevis ? t('quoteNumber') : t('invoiceNumber')}</span>
          <input
            type="text"
            value={state.invoiceNumber}
            onChange={(e) => onChange({ invoiceNumber: e.target.value })}
            className="pu-field"
          />
        </label>
        <label className="space-y-2">
          <span className="pu-label">{t('clientName')}</span>
          <input
            type="text"
            value={state.clientName}
            onChange={(e) => onChange({ clientName: e.target.value })}
            className="pu-field"
          />
        </label>
      </div>

      <label className="space-y-2 block">
        <span className="pu-label">{t('clientAddress')}</span>
        <input
          type="text"
          value={state.clientAddress}
          onChange={(e) => onChange({ clientAddress: e.target.value })}
          className="pu-field"
        />
      </label>

      <div className="space-y-2">
        <span className="pu-label">{t('services')}</span>

        <div className="space-y-2.5">
          {state.services.map((svc, index) => (
            <div
              key={svc.id}
              className="rounded-[12px] p-3 space-y-2.5"
              style={{
                background: 'rgba(4, 8, 12, 0.42)',
                border: '1px solid var(--admin-line-soft)',
                boxShadow: 'inset 0 1px 0 var(--admin-sheen)',
              }}
            >
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder={t('description')}
                  value={svc.description}
                  onChange={(e) => majService(index, { description: e.target.value })}
                  className="pu-field !text-sm"
                />
                <button
                  type="button"
                  onClick={() => onChange({ services: state.services.filter((_, i) => i !== index) })}
                  className="admin-danger shrink-0 !px-3"
                  aria-label={t('removeService')}
                  title={t('removeService')}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <label className="space-y-1.5">
                  <span className="pu-label !text-[10px] !tracking-[0.18em]">{t('quantity')}</span>
                  <input
                    type="number"
                    value={svc.quantity}
                    onChange={(e) => majService(index, { quantity: parseFloat(e.target.value) || 0 })}
                    className="pu-field !text-sm"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="pu-label !text-[10px] !tracking-[0.18em]">{t('rate')}</span>
                  <input
                    type="number"
                    value={svc.rate}
                    onChange={(e) => majService(index, { rate: parseFloat(e.target.value) || 0 })}
                    className="pu-field !text-sm"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="pu-label !text-[10px] !tracking-[0.18em]">{t('discount')}</span>
                  <input
                    type="number"
                    value={svc.discount || ''}
                    onChange={(e) => majService(index, { discount: parseFloat(e.target.value) || 0 })}
                    className="pu-field !text-sm"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onChange({
            services: [...state.services, { id: Date.now().toString(), description: '', quantity: 1, rate: 0, discount: 0 }],
          })}
          className="admin-ghost w-full justify-center"
        >
          <Plus size={14} />
          {t('addService')}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-2">
          <span className="pu-label">TPS</span>
          <input
            type="text"
            value={state.tpsNumber}
            onChange={(e) => onChange({ tpsNumber: e.target.value })}
            className="pu-field !text-sm"
          />
        </label>
        <label className="space-y-2">
          <span className="pu-label">TVQ</span>
          <input
            type="text"
            value={state.tvqNumber}
            onChange={(e) => onChange({ tvqNumber: e.target.value })}
            className="pu-field !text-sm"
          />
        </label>
      </div>
    </section>
  );
};
