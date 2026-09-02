import React from 'react';
import { TRANSLATIONS } from '../constants';
import { DocumentState, Language } from '../types';
import { LAITON, FILET_FORT, FILET_DOUX, ENCRE_TITRE, ENCRE_TEXTE, ENCRE_PALE } from './encres';

// Le corps de la feuille quand le document est une facture ou un devis.
// Sorti de PreviewPanel le 2026-09-02, qui dépassait les cinq cents
// lignes du dépôt. Mêmes contraintes qu'ailleurs dans la feuille :
// couleurs en clair pour que html2canvas les emporte à l'export, filets
// de laiton, chiffres tabulaires pour que les colonnes s'alignent.

interface InvoiceSheetProps {
  state: DocumentState;
  lang: Language;
  onPay?: (amount: number) => void;
}

export const InvoiceSheet: React.FC<InvoiceSheetProps> = ({ state, lang, onPay }) => {
  const t = (key: string) => TRANSLATIONS[key][lang];
  const subtotal = state.services.reduce((sum, svc) => sum + ((svc.quantity * svc.rate) - (svc.discount || 0)), 0);
  const tps = subtotal * 0.05;
  const tvq = subtotal * 0.09975;
  const total = subtotal + tps + tvq;

  const hasDiscounts = state.services.some(svc => svc.discount && svc.discount > 0);
  const enTete = 'py-3 px-2 font-semibold uppercase tracking-[0.14em] text-[11px]';

  return (
    <div className="flex-grow flex flex-col font-sans" style={{ color: ENCRE_TEXTE }}>
      <div className="flex justify-between items-start mb-12 gap-8">
        <div>
          <h2
            className="text-3xl uppercase mb-3"
            style={{ fontFamily: 'var(--font-display)', color: ENCRE_TITRE, letterSpacing: '0.07em' }}
          >
            {state.invoiceType === 'quote' ? t('quoteWord') : t('invoiceWord')}
          </h2>
          <p className="text-sm">
            <span className="font-semibold">{state.invoiceType === 'quote' ? t('quoteNumber') : t('invoiceNumber')} : </span>
            {state.invoiceNumber || '—'}
          </p>
          <p className="text-sm">
            <span className="font-semibold">{t('date')} : </span>
            {new Date(state.date).toLocaleDateString(lang === 'en' ? 'en-CA' : 'fr-CA')}
          </p>
        </div>
        <div className="text-right">
          <h3
            className="uppercase tracking-[0.18em] text-[11px] font-semibold mb-2"
            style={{ color: ENCRE_TITRE }}
          >
            {state.invoiceType === 'quote' ? t('preparedFor') : t('billedTo')}
          </h3>
          <p className="text-sm">{state.clientName || '—'}</p>
          <p className="text-sm whitespace-pre-wrap" style={{ color: ENCRE_PALE }}>{state.clientAddress || '—'}</p>
        </div>
      </div>

      <table className="w-full mb-8">
        <thead>
          <tr className="text-left" style={{ borderBottom: `1.5px solid ${LAITON}`, color: ENCRE_TITRE }}>
            <th className={enTete}>{t('description')}</th>
            <th className={`${enTete} text-right`}>{t('quantity')}</th>
            <th className={`${enTete} text-right`}>{t('rate')}</th>
            {hasDiscounts && <th className={`${enTete} text-right`}>{t('discount')}</th>}
            <th className={`${enTete} text-right`}>{t('amount')}</th>
          </tr>
        </thead>
        <tbody>
          {state.services.map((svc) => (
            <tr key={svc.id} style={{ borderBottom: `1px solid ${FILET_DOUX}` }}>
              <td className="py-3 px-2 text-sm">{svc.description || '—'}</td>
              <td className="py-3 px-2 text-sm text-right tabular-nums">{svc.quantity}</td>
              <td className="py-3 px-2 text-sm text-right tabular-nums">{svc.rate.toFixed(2)} $</td>
              {hasDiscounts && (
                <td className="py-3 px-2 text-sm text-right tabular-nums" style={{ color: '#8C3A2E' }}>
                  {svc.discount ? `−${svc.discount.toFixed(2)} $` : '—'}
                </td>
              )}
              <td className="py-3 px-2 text-sm text-right tabular-nums">
                {((svc.quantity * svc.rate) - (svc.discount || 0)).toFixed(2)} $
              </td>
            </tr>
          ))}
          {state.services.length === 0 && (
            <tr>
              <td colSpan={hasDiscounts ? 5 : 4} className="py-10 text-center text-sm" style={{ color: ENCRE_PALE }}>
                {t('noServices')}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="flex justify-end mb-12">
        <div className="w-72 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="font-semibold">{t('subtotal')}</span>
            <span className="tabular-nums">{subtotal.toFixed(2)} $</span>
          </div>
          <div className="flex justify-between" style={{ color: ENCRE_PALE }}>
            <span>TPS ({state.tpsNumber})</span>
            <span className="tabular-nums">{tps.toFixed(2)} $</span>
          </div>
          <div className="flex justify-between" style={{ color: ENCRE_PALE }}>
            <span>TVQ ({state.tvqNumber})</span>
            <span className="tabular-nums">{tvq.toFixed(2)} $</span>
          </div>
          <div
            className="flex justify-between text-lg font-bold pt-2 mt-2"
            style={{ borderTop: `1.5px solid ${LAITON}`, color: ENCRE_TITRE }}
          >
            <span className="uppercase tracking-[0.12em] text-base">{t('total')}</span>
            <span className="tabular-nums">{total.toFixed(2)} $</span>
          </div>
        </div>
      </div>

      {state.content && (
        <div className="mb-8">
          <h4 className="uppercase tracking-[0.18em] text-[11px] font-semibold mb-2" style={{ color: ENCRE_TITRE }}>
            {t('notes')}
          </h4>
          <p
            className="whitespace-pre-wrap"
            style={{ fontFamily: 'var(--font-editorial)', fontSize: 15, lineHeight: 1.6 }}
          >
            {state.content}
          </p>
        </div>
      )}

      {/* Payment Stub */}
      <div className="mt-auto pt-8" style={{ borderTop: `1.5px solid ${FILET_FORT}` }}>
        <h4 className="uppercase tracking-[0.18em] text-[11px] font-semibold mb-4" style={{ color: ENCRE_TITRE }}>
          {t('paymentDetails')}
        </h4>
        <div className="grid grid-cols-2 gap-8 text-sm">
          <div>
            <p className="font-bold mb-1" style={{ color: ENCRE_TITRE }}>Festival Médiéval de Montpellier</p>
            <p>Montpellier, France</p>
            <p className="mt-2">contact@festivalmedievalmontpellier.fr</p>
          </div>
          <div>
            <p><span className="font-semibold">IBAN :</span> FR76 XXXX XXXX XXXX XXXX XXXX XXX</p>
            <p><span className="font-semibold">BIC :</span> XXXXXXX</p>
            <p className="mt-2 font-semibold" style={{ color: ENCRE_TITRE }}>Banque principale</p>
            {onPay && state.invoiceType === 'invoice' && (
              <div className="mt-4" data-html2canvas-ignore="true">
                <button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    const btn = e.currentTarget;
                    const originalText = btn.innerText;
                    btn.innerText = t('redirecting');
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                    btn.style.cursor = 'wait';
                    await onPay(total);
                    // In case it fails, revert it back
                    btn.innerText = originalText;
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                  }}
                  className="inline-block px-6 py-2.5 uppercase tracking-[0.2em] text-[11px] font-semibold rounded"
                  style={{ background: ENCRE_TITRE, color: '#E8DDC1' }}
                >
                  {t('payOnline')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
