import { forwardRef, useEffect, useState, useRef, useMemo } from 'react';
import { LOGOS, TRANSLATIONS } from '../constants';
import { DocumentState, Language } from '../types';
import { SignaturePad } from './SignaturePad';

interface PreviewPanelProps {
  state: DocumentState;
  lang: Language;
  onSignatureChange: (dataUrl: string | null) => void;
  onPay?: (amount: number) => void;
}

// Estimates for pagination calculations (in pixels)
const PAGE_HEIGHT = 1123; // A4 height at ~96dpi
const PAGE_PADDING_Y = 150; // Total vertical padding (top + bottom)
const CONTENT_HEIGHT = PAGE_HEIGHT - PAGE_PADDING_Y; 
const HEADER_HEIGHT = 200; // Logo + Divider + Margin
// Title Height is now dynamic based on font size
const SIGNATURE_HEIGHT = 380; // Expanded to fit 2 lines of role
const CHARS_PER_LINE = 85; 

export const PreviewPanel = forwardRef<HTMLDivElement, PreviewPanelProps>(({ state, lang, onSignatureChange, onPay }, ref) => {
  const logo = LOGOS.find(l => l.id === state.logoId) || LOGOS[0];
  const roleLabel = state.signerRole === 'Autre' ? state.customRole : state.signerRole;
  const t = (key: string) => TRANSLATIONS[key][lang];

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Dynamic Line Height estimation based on text size
  const lineHeight = state.textSize * 1.6; 
  // Dynamic Title Height
  const titleHeight = state.titleSize * 1.5 + 40; // line height + margins

  // --- Pagination Logic ---
  const pages = useMemo(() => {
    if (state.type === 'invoice') {
      // For invoices, we currently render everything on a single page for simplicity
      return [['invoice']];
    }

    const rawParagraphs = state.content.split('\n').filter(p => p.trim() !== '');
    if (rawParagraphs.length === 0) return [[]];

    const _pages: string[][] = [];
    let currentPage: string[] = [];
    let currentHeight = 0;

    // First page has header and potentially title
    let availableHeight = CONTENT_HEIGHT - HEADER_HEIGHT;
    if (state.title) availableHeight -= titleHeight;

    // Helper to estimate paragraph height
    const effectiveCharsPerLine = Math.floor(CHARS_PER_LINE * (18 / state.textSize));
    
    const getParaHeight = (text: string) => {
      const lines = Math.ceil(text.length / effectiveCharsPerLine);
      return Math.max(lines * lineHeight, lineHeight) + (state.textSize * 1.5); // margin bottom
    };

    for (let i = 0; i < rawParagraphs.length; i++) {
      const para = rawParagraphs[i];
      const h = getParaHeight(para);

      // Check if it fits
      if (currentHeight + h > availableHeight) {
        // Push current page
        _pages.push(currentPage);
        // Start new page
        currentPage = [para];
        currentHeight = h;
        // Subsequent pages have full content height
        availableHeight = CONTENT_HEIGHT;
      } else {
        currentPage.push(para);
        currentHeight += h;
      }
    }

    // Handle Signature placement
    // Check if there is space left on the last page for the signature
    if (currentHeight + SIGNATURE_HEIGHT > availableHeight) {
      // If not, push the current content and start a new empty page for signature
      _pages.push(currentPage);
      _pages.push([]); // Empty page just for signature
    } else {
      _pages.push(currentPage);
    }

    return _pages;
  }, [state.content, state.title, state.textSize, state.titleSize, lineHeight, titleHeight, state.type]);

  // --- Scaling Logic ---
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const parent = containerRef.current.parentElement;
      if (!parent) return;

      const parentWidth = parent.clientWidth;
      
      const docWidth = 794 + 80; // A4 width + margins

      // Calculate scale to fit width comfortably
      const scaleW = (parentWidth - 40) / docWidth; 
      
      const newScale = Math.min(Math.max(scaleW, 0.4), 1.2);
      
      setScale(newScale);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    setTimeout(handleResize, 100);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const renderInvoiceContent = () => {
    const subtotal = state.services.reduce((sum, svc) => sum + ((svc.quantity * svc.rate) - (svc.discount || 0)), 0);
    const tps = subtotal * 0.05;
    const tvq = subtotal * 0.09975;
    const total = subtotal + tps + tvq;

    const hasDiscounts = state.services.some(svc => svc.discount && svc.discount > 0);

    return (
      <div className="flex-grow flex flex-col font-sans text-dark-800">
        <div className="flex justify-between items-start mb-12">
          <div>
            <h2 className="text-4xl font-display font-bold text-dark-900 uppercase tracking-widest mb-2">
              {state.invoiceType === 'quote' 
                ? (lang === 'en' ? 'Quote' : 'Devis') 
                : (lang === 'en' ? 'Invoice' : 'Facture')}
            </h2>
            <p className="text-sm text-dark-600">
              <span className="font-semibold">
                {state.invoiceType === 'quote'
                  ? (lang === 'en' ? 'Quote #:' : 'Devis #:')
                  : (lang === 'en' ? 'Invoice #:' : 'Facture #:')}
              </span> {state.invoiceNumber || '---'}
            </p>
            <p className="text-sm text-dark-600">
              <span className="font-semibold">{lang === 'en' ? 'Date:' : 'Date:'}</span> {new Date(state.date).toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR')}
            </p>
          </div>
          <div className="text-right">
            <h3 className="font-semibold text-dark-900 uppercase tracking-wider mb-1">
              {state.invoiceType === 'quote'
                ? (lang === 'en' ? 'Prepared For:' : 'Préparé pour:')
                : (lang === 'en' ? 'Billed To:' : 'Facturé à:')}
            </h3>
            <p className="text-dark-700">{state.clientName || '---'}</p>
            <p className="text-dark-600 whitespace-pre-wrap">{state.clientAddress || '---'}</p>
          </div>
        </div>

        <table className="w-full mb-8">
          <thead>
            <tr className="border-b-2 border-gold-600/30 text-left">
              <th className="py-3 px-2 font-semibold uppercase tracking-wider text-sm">{lang === 'en' ? 'Description' : 'Description'}</th>
              <th className="py-3 px-2 font-semibold uppercase tracking-wider text-sm text-right">{lang === 'en' ? 'Qty' : 'Qté'}</th>
              <th className="py-3 px-2 font-semibold uppercase tracking-wider text-sm text-right">{lang === 'en' ? 'Rate' : 'Taux'}</th>
              {hasDiscounts && (
                <th className="py-3 px-2 font-semibold uppercase tracking-wider text-sm text-right">{lang === 'en' ? 'Discount' : 'Rabais'}</th>
              )}
              <th className="py-3 px-2 font-semibold uppercase tracking-wider text-sm text-right">{lang === 'en' ? 'Amount' : 'Montant'}</th>
            </tr>
          </thead>
          <tbody>
            {state.services.map((svc) => (
              <tr key={svc.id} className="border-b border-gold-600/10">
                <td className="py-3 px-2">{svc.description || '---'}</td>
                <td className="py-3 px-2 text-right">{svc.quantity}</td>
                <td className="py-3 px-2 text-right">${svc.rate.toFixed(2)}</td>
                {hasDiscounts && (
                  <td className="py-3 px-2 text-right text-red-600/80">
                    {svc.discount ? `-$${svc.discount.toFixed(2)}` : '---'}
                  </td>
                )}
                <td className="py-3 px-2 text-right">${((svc.quantity * svc.rate) - (svc.discount || 0)).toFixed(2)}</td>
              </tr>
            ))}
            {state.services.length === 0 && (
              <tr>
                <td colSpan={hasDiscounts ? 5 : 4} className="py-8 text-center text-dark-400 italic">
                  {lang === 'en' ? 'No services added.' : 'Aucun service ajouté.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex justify-end mb-12">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-semibold">Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-dark-600">
              <span>TPS ({state.tpsNumber}):</span>
              <span>${tps.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-dark-600">
              <span>TVQ ({state.tvqNumber}):</span>
              <span>${tvq.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t-2 border-gold-600/30 pt-2 mt-2">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {state.content && (
          <div className="mb-8">
            <h4 className="font-semibold text-dark-900 uppercase tracking-wider mb-2 text-sm">{lang === 'en' ? 'Notes:' : 'Notes:'}</h4>
            <p className="text-dark-700 whitespace-pre-wrap text-sm">{state.content}</p>
          </div>
        )}

        {/* Payment Stub */}
        <div className="mt-auto pt-8 border-t-2 border-gold-600/30">
          <h4 className="font-semibold text-dark-900 uppercase tracking-wider mb-4 text-sm">
            {lang === 'en' ? 'Détails de paiement:' : 'Détails de paiement:'}
          </h4>
          <div className="grid grid-cols-2 gap-8 text-sm text-dark-700">
            <div>
              <p className="font-bold text-dark-900 mb-1">Festival Médiéval de Montpellier</p>
              <p>Montpellier, France</p>
              <p className="mt-2">contact@festivalmedievalmontpellier.fr</p>
            </div>
            <div>
              <p><span className="font-semibold">IBAN:</span> FR76 XXXX XXXX XXXX XXXX XXXX XXX</p>
              <p><span className="font-semibold">BIC:</span> XXXXXXX</p>
              <p className="mt-2 font-semibold text-dark-900">Banque Principale</p>
              {onPay && state.invoiceType === 'invoice' && (
                <div className="mt-4" data-html2canvas-ignore="true">
                  <button 
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      const btn = e.currentTarget;
                      const originalText = btn.innerText;
                      btn.innerText = lang === 'en' ? 'Redirecting...' : 'Redirection...';
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
                    className="inline-block px-6 py-2 bg-dark-900 text-gold-500 font-display font-bold tracking-widest uppercase text-xs rounded transition-colors hover:bg-gold-600 hover:text-dark-900 shadow-md"
                  >
                    {lang === 'en' ? 'Pay Online' : 'Payer en ligne'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden bg-black/40 scrollbar-thin">
      <div className="flex flex-col items-center py-8 min-h-full">
        <div 
          ref={containerRef}
          style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
          className="transition-transform duration-300"
        >
          {/* This ref is used by html2canvas to capture ALL pages */}
          <div ref={ref} className="flex flex-col gap-8 items-center">
            {pages.map((pageContent, pageIndex) => {
              const isFirstPage = pageIndex === 0;
              const isLastPage = pageIndex === pages.length - 1;

              const isParchment = state.paperStyle === 'parchment';
              const bgStyle = isParchment 
                ? {
                    backgroundImage: 'url("https://www.transparenttextures.com/patterns/parchment.png"), linear-gradient(to bottom right, #f7ecd7, #dfcdab)',
                    boxShadow: '0 0 50px rgba(0,0,0,0.5)'
                  }
                : {
                    backgroundColor: '#ffffff',
                    backgroundImage: 'none',
                    boxShadow: '0 0 50px rgba(0,0,0,0.5)'
                  };

              return (
                <div 
                  key={pageIndex}
                  className={`preview-page text-dark-900 w-[210mm] h-[297mm] relative shadow-2xl overflow-hidden flex flex-col ${!isParchment ? 'bg-white' : ''}`}
                  style={bgStyle}
                >
                  {/* Decorative Borders - Absolute positioning */}
                  <div className="absolute top-[10mm] left-[10mm] right-[10mm] bottom-[10mm] border border-gold-600/30 pointer-events-none" />
                  <div className="absolute top-[12mm] left-[12mm] right-[12mm] bottom-[12mm] border border-gold-600/10 pointer-events-none" />

                  {/* Content Container with Padding */}
                  <div className="p-[20mm] h-full flex flex-col relative z-10">
                    
                    {/* Header (First Page Only) */}
                    {isFirstPage ? (
                      <header className="flex flex-col items-center justify-center mb-10 flex-shrink-0">
                        <div className="h-28 w-auto mb-6">
                          <img 
                            src={state.logoImage || logo.url} 
                            alt={logo.name} 
                            className="h-full w-auto object-contain filter drop-shadow-sm"
                          />
                        </div>
                        <div className="w-16 h-[2px] bg-gradient-to-r from-transparent via-gold-500 to-transparent"></div>
                      </header>
                    ) : (
                      // Spacer for subsequent pages to keep top margin clean
                      <div className="h-8"></div>
                    )}

                    {state.type === 'invoice' ? (
                      renderInvoiceContent()
                    ) : (
                      <>
                        {/* Title (First Page Only) */}
                        {isFirstPage && state.title && (
                          <h1 
                            className="font-display text-center text-dark-800 mb-8 tracking-wide uppercase drop-shadow-sm flex-shrink-0"
                            style={{ fontSize: `${state.titleSize}px`, lineHeight: 1.2 }}
                          >
                            {state.title}
                          </h1>
                        )}

                        {/* Paragraphs */}
                        <div 
                           className="flex-grow font-serif text-justify text-dark-700 space-y-6"
                           style={{ fontSize: `${state.textSize}px`, lineHeight: 1.6 }}
                        >
                          {pageContent.length > 0 ? (
                            pageContent.map((para, i) => (
                              <p key={i}>{para}</p>
                            ))
                          ) : (
                            isFirstPage && <p className="opacity-30 italic text-center pt-10">{t('documentBodyPlaceholder')}</p>
                          )}
                        </div>
                      </>
                    )}

                    {/* Footer / Signature (Last Page Only) */}
                    {isLastPage && state.type !== 'invoice' && (
                      <footer className="mt-auto pt-8 flex flex-col items-end flex-shrink-0">
                        <div className="w-80 flex flex-col items-center">
                          
                          {/* Date line (only for letters, invoice has date at top) */}
                          {state.type === 'letter' && (
                            <div className="w-full text-right mb-2 font-serif italic text-dark-600 text-lg">
                               {state.date && (
                                 <span>{new Date(state.date).toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                 })}</span>
                               )}
                            </div>
                          )}

                          {/* Signature Area */}
                          <div className="h-32 w-full mb-2 relative">
                             <SignaturePad 
                               label={t('signHere')}
                               clearLabel={t('clearSignature')}
                               onChange={onSignatureChange}
                               variant="paper"
                               initialImage={state.signatureImage}
                             />
                          </div>

                          {/* Name and Role */}
                          <div className="w-full text-center space-y-1">
                            <div className="h-px w-full bg-gold-600/50 mb-2"></div>
                            <div className="font-display font-semibold text-sm tracking-wide text-dark-900 uppercase">
                              {state.signerName}
                            </div>
                            {/* Handles newline in role */}
                            {roleLabel.split('\n').map((line, idx) => (
                               <div key={idx} className={`font-sans tracking-[0.2em] text-dark-600 uppercase ${idx === 0 ? 'text-[10px] font-semibold' : 'text-[9px] opacity-80'}`}>
                                 {line}
                                </div>
                            ))}
                          </div>
                        </div>
                      </footer>
                    )}
                  
                    {/* Page Numbering - Moved to the very bottom margin, below the decorative border */}
                    <div className="absolute bottom-[3mm] left-0 right-0 h-[6mm] flex items-center justify-center pointer-events-none">
                       <span className="text-[10px] text-gold-700/60 font-sans tracking-widest uppercase">
                         {t('page')} {pageIndex + 1} {t('of')} {pages.length} &bull; {t('officialDocument')}
                       </span>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

PreviewPanel.displayName = 'PreviewPanel';