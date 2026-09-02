import { forwardRef, useEffect, useState, useRef, useMemo } from 'react';
import { LOGOS, TRANSLATIONS } from '../constants';
import { DocumentState, Language } from '../types';
import { SignaturePad } from './SignaturePad';

// La feuille, et le bureau sur lequel elle est posée.
//
// Deux règles gouvernent ce fichier. La première : tout ce qui vit dans
// `.preview-page` part dans le PDF, capturé par html2canvas, qui ne sait
// lire ni les variables de thème ni color-mix(). Les couleurs de la
// feuille sont donc écrites en clair, en rgba, jamais en classes
// Tailwind à opacité (`border-gold-600/30` se compile en color-mix et
// se perd à l'export). La seconde : la feuille est un document imprimé,
// pas une carte de site. Aucun verre, aucune ombre portée sur le texte,
// aucun dégradé dans une lettre. Le laiton du festival y sert de filet
// et d'équerre, rien de plus.

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

// L'écart vertical entre deux feuilles, en pixels. Sert aussi au calcul
// de la hauteur réservée sous la mise à l'échelle.
const ECART_FEUILLES = 32;

// Le laiton du festival, en clair pour l'export.
const LAITON       = '#B08D3A';
const FILET_FORT   = 'rgba(176, 141, 58, 0.48)';
const FILET_DOUX   = 'rgba(176, 141, 58, 0.20)';
const ENCRE_TITRE  = '#211C14';
const ENCRE_TEXTE  = '#3A3226';
const ENCRE_PALE   = '#6B6152';

// Les quatre équerres du cadre, reprises des portraits du bestiaire.
const EQUERRES = [
  { top: '7mm', left: '7mm',  borderTop: true,  borderLeft: true  },
  { top: '7mm', right: '7mm', borderTop: true,  borderRight: true },
  { bottom: '7mm', left: '7mm',  borderBottom: true, borderLeft: true  },
  { bottom: '7mm', right: '7mm', borderBottom: true, borderRight: true },
] as const;

const Equerres = () => (
  <>
    {EQUERRES.map((e, i) => (
      <span
        key={i}
        className="absolute pointer-events-none"
        style={{
          top: 'top' in e ? e.top : undefined,
          bottom: 'bottom' in e ? e.bottom : undefined,
          left: 'left' in e ? e.left : undefined,
          right: 'right' in e ? e.right : undefined,
          width: '9mm',
          height: '9mm',
          borderColor: LAITON,
          borderTopWidth: 'borderTop' in e ? 1.5 : 0,
          borderBottomWidth: 'borderBottom' in e ? 1.5 : 0,
          borderLeftWidth: 'borderLeft' in e ? 1.5 : 0,
          borderRightWidth: 'borderRight' in e ? 1.5 : 0,
          borderStyle: 'solid',
        }}
      />
    ))}
  </>
);

// Le filet à losange qui sépare l'en-tête du corps. Même geste que la
// marque de chapitre du site : deux traits qui s'éteignent aux bouts,
// un losange plein au milieu.
const FiletLosange = ({ largeur = 132 }: { largeur?: number }) => (
  <span className="flex items-center justify-center gap-2" style={{ width: largeur }}>
    <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, rgba(176,141,58,0), ${LAITON})` }} />
    <span style={{ width: 6, height: 6, background: LAITON, transform: 'rotate(45deg)' }} />
    <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${LAITON}, rgba(176,141,58,0))` }} />
  </span>
);

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

  // La pile est mise à l'échelle par transform, qui ne change pas la
  // place qu'elle occupe dans la page : à 0,45, la moitié de la colonne
  // restait un trou noir de plusieurs milliers de pixels. La hauteur
  // réelle se calcule ici, une feuille faisant exactement 297 mm.
  const hauteurPile = Math.round(
    (pages.length * (PAGE_HEIGHT + 0.5) + (pages.length - 1) * ECART_FEUILLES) * scale,
  );

  const renderInvoiceContent = () => {
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

  return (
    <div className="w-full">
      <div className="flex justify-center px-4 py-8" style={{ height: hauteurPile + 64 }}>
        <div
          ref={containerRef}
          style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
          className="transition-transform duration-300"
        >
          {/* This ref is used by html2canvas to capture ALL pages */}
          <div ref={ref} className="flex flex-col items-center" style={{ gap: ECART_FEUILLES }}>
            {pages.map((pageContent, pageIndex) => {
              const isFirstPage = pageIndex === 0;
              const isLastPage = pageIndex === pages.length - 1;

              const isParchment = state.paperStyle === 'parchment';
              const bgStyle = isParchment
                ? {
                    // Local texture: the old CDN parchment.png 404'd, so this is
                    // transparenttextures' natural-paper served from /public.
                    backgroundImage: 'url("/textures/parchment.png"), linear-gradient(to bottom right, #f7ecd7, #dfcdab)',
                    boxShadow: '0 30px 70px -24px rgba(0,0,0,0.85), 0 0 0 1px rgba(0,0,0,0.35)',
                  }
                : {
                    backgroundColor: '#ffffff',
                    backgroundImage: 'none',
                    boxShadow: '0 30px 70px -24px rgba(0,0,0,0.85), 0 0 0 1px rgba(0,0,0,0.35)',
                  };

              return (
                <div
                  key={pageIndex}
                  className="preview-page w-[210mm] h-[297mm] relative overflow-hidden flex flex-col"
                  style={{ ...bgStyle, color: ENCRE_TEXTE }}
                >
                  {/* Cadre : deux filets et quatre équerres de laiton. */}
                  <div
                    className="absolute pointer-events-none"
                    style={{ top: '10mm', left: '10mm', right: '10mm', bottom: '10mm', border: `1px solid ${FILET_FORT}` }}
                  />
                  <div
                    className="absolute pointer-events-none"
                    style={{ top: '12mm', left: '12mm', right: '12mm', bottom: '12mm', border: `1px solid ${FILET_DOUX}` }}
                  />
                  <Equerres />

                  {/* Content Container with Padding */}
                  <div className="p-[20mm] h-full flex flex-col relative z-10">

                    {/* Header (First Page Only) */}
                    {isFirstPage ? (
                      <header className="flex flex-col items-center justify-center mb-10 flex-shrink-0">
                        <div className="h-28 w-auto mb-5">
                          <img
                            src={state.logoImage || logo.url}
                            alt={logo.name}
                            className="h-full w-auto object-contain"
                          />
                        </div>
                        <FiletLosange />
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
                            className="text-center uppercase mb-9 flex-shrink-0"
                            style={{
                              fontFamily: 'var(--font-display)',
                              fontSize: `${state.titleSize}px`,
                              lineHeight: 1.2,
                              letterSpacing: '0.045em',
                              color: ENCRE_TITRE,
                            }}
                          >
                            {state.title}
                          </h1>
                        )}

                        {/* Paragraphs */}
                        <div
                          className="flex-grow text-justify space-y-6"
                          style={{
                            fontFamily: 'var(--font-editorial)',
                            fontSize: `${state.textSize}px`,
                            lineHeight: 1.6,
                            color: ENCRE_TEXTE,
                          }}
                        >
                          {pageContent.length > 0 ? (
                            pageContent.map((para, i) => (
                              <p key={i}>{para}</p>
                            ))
                          ) : (
                            isFirstPage && (
                              <p className="text-center pt-10" style={{ color: ENCRE_PALE, opacity: 0.55 }}>
                                {t('documentBodyPlaceholder')}
                              </p>
                            )
                          )}
                        </div>
                      </>
                    )}

                    {/* Footer / Signature (Last Page Only) */}
                    {isLastPage && state.type !== 'invoice' && (
                      <footer className="mt-auto pt-8 flex flex-col items-end flex-shrink-0">
                        <div className="w-80 flex flex-col items-center">

                          {/* Date line (only for letters, invoice has date at top) */}
                          {state.type === 'letter' && state.date && (
                            <div
                              className="w-full text-right mb-3 text-[17px]"
                              style={{ fontFamily: 'var(--font-editorial)', color: ENCRE_PALE }}
                            >
                              {new Date(state.date).toLocaleDateString(lang === 'en' ? 'en-CA' : 'fr-CA', {
                                year: 'numeric', month: 'long', day: 'numeric',
                              })}
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
                            <div className="h-px w-full mb-2.5" style={{ background: LAITON }} />
                            <div
                              className="uppercase tracking-[0.06em] text-[15px]"
                              style={{ fontFamily: 'var(--font-display-alt)', color: ENCRE_TITRE, fontWeight: 600 }}
                            >
                              {state.signerName}
                            </div>
                            {/* Handles newline in role */}
                            {roleLabel.split('\n').map((line, idx) => (
                              <div
                                key={idx}
                                className="font-sans uppercase"
                                style={{
                                  color: ENCRE_PALE,
                                  letterSpacing: '0.22em',
                                  fontSize: idx === 0 ? 10 : 9,
                                  fontWeight: idx === 0 ? 600 : 400,
                                }}
                              >
                                {line}
                              </div>
                            ))}
                          </div>
                        </div>
                      </footer>
                    )}

                    {/* Page Numbering - Moved to the very bottom margin, below the decorative border */}
                    <div className="absolute bottom-[3mm] left-0 right-0 h-[6mm] flex items-center justify-center pointer-events-none">
                      <span
                        className="font-sans uppercase"
                        style={{ fontSize: 9, letterSpacing: '0.28em', color: 'rgba(140, 106, 31, 0.75)' }}
                      >
                        {t('page')} {pageIndex + 1} {t('of')} {pages.length} &nbsp;·&nbsp; {t('officialDocument')}
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
