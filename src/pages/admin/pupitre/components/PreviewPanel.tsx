import { forwardRef, useEffect, useLayoutEffect, useState, useRef, useMemo } from 'react';
import { LOGOS, TRANSLATIONS } from '../constants';
import { DocumentState, Language } from '../types';
import { SignaturePad } from './SignaturePad';
import { InvoiceSheet } from './InvoiceSheet';
import { LAITON, FILET_FORT, FILET_DOUX, ENCRE_TITRE, ENCRE_TEXTE, ENCRE_PALE } from './encres';

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
const PAGE_PADDING_Y = 168; // 2 × 20 mm de marge, plus 16 px de sûreté
const CONTENT_HEIGHT = PAGE_HEIGHT - PAGE_PADDING_Y;
// Les feuilles qui suivent la première portent une cale de 32 px en
// tête, pour garder la même respiration sous la marge décorative. Elle
// manquait au calcul, et le bas de la dernière page débordait sous le
// bord de la feuille, rogné en silence.
const PAGE_SPACER = 32;
// En-tête mesuré : logo 112, filet 6, marges 20 et 40. Deux cents
// pixels étaient une estimation de l'application d'origine.
const HEADER_HEIGHT = 180;
// Title Height is now dynamic based on font size
// Le bloc de signature mesure 220 px à l'écran, date et fonction
// comprises. L'estimation d'origine en réservait 380 : sur une lettre
// d'une page pleine aux trois quarts, la signature partait seule sur une
// deuxième feuille. Mesuré, puis arrondi vers le haut avec cinquante
// pixels de marge pour une fonction sur deux lignes.
const SIGNATURE_HEIGHT = 270;
// Nombre de signes par ligne dans la colonne de 170 mm. Le corps est
// en Cormorant Garamond, plus étroit que le Georgia de la version
// d'origine : quatre-vingt-cinq signes surestimaient la hauteur d'un
// bon quart et exilaient la signature sur une feuille vide. Mesuré à
// quatre-vingt-quatorze, gardé à quatre-vingt-huit : six pour cent de
// marge, mesurés par le banc d’essai de pagination.
const CHARS_PER_LINE = 88;

// L'écart vertical entre deux feuilles, en pixels. Sert aussi au calcul
// de la hauteur réservée sous la mise à l'échelle.
const ECART_FEUILLES = 32;

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
  // Le titre est composé en interligne 1,2 et suivi d'une marge de
  // 36 px. Un coefficient de 1,5 gonflait la réservation de vingt
  // pixels par titre, assez pour renvoyer la signature à la page
  // suivante sur une lettre courte.
  const titleHeight = state.titleSize * 1.25 + 40;

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
    // L'écart entre deux paragraphes est un `space-y-6`, donc 24 px
    // fixes. Le calculer en proportion de la taille du texte le
    // sous-estimait sous 16 px, et le dernier paragraphe débordait sous
    // le bord de la feuille, invisible à l'écran mais rogné à
    // l'impression.
    const ecart = Math.max(state.textSize * 1.5, 24);

    const getParaHeight = (text: string) => {
      const lines = Math.ceil(text.length / effectiveCharsPerLine);
      return Math.max(lines * lineHeight, lineHeight) + ecart;
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
        // Subsequent pages have full content height, less the spacer
        availableHeight = CONTENT_HEIGHT - PAGE_SPACER;
      } else {
        currentPage.push(para);
        currentHeight += h;
      }
    }

    // Handle Signature placement
    // Chaque paragraphe compte son écart de queue, mais `space-y-6` ne
    // pose un écart qu'ENTRE deux paragraphes : le dernier n'en a pas.
    // Cet écart fantôme suffisait à renvoyer la signature sur une
    // feuille vide alors qu'il restait un tiers de page.
    const hauteurTexte = currentPage.length > 0 ? currentHeight - ecart : currentHeight;

    // Check if there is space left on the last page for the signature
    if (hauteurTexte + SIGNATURE_HEIGHT > availableHeight) {
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

  // ── Garde-fou du débordement ──────────────────────────────────
  // La lettre se pagine toute seule, la facture non : elle tient sur une
  // feuille et rien de plus. Au-delà, `overflow: hidden` rognait le pied
  // de page sans rien dire, et les coordonnées bancaires disparaissaient
  // du PDF envoyé au client. La feuille est donc mesurée après chaque
  // rendu, et l'excédent s'affiche au-dessus du bureau. La bannière vit
  // hors de `.preview-page`, donc elle ne part jamais à l'export.
  const [excedent, setExcedent] = useState(0);
  useLayoutEffect(() => {
    const pile = containerRef.current;
    if (!pile) return;
    let pire = 0;
    pile.querySelectorAll('.preview-page').forEach((feuille) => {
      const boite = Array.from(feuille.children)
        .find((e) => getComputedStyle(e).position !== 'absolute') as HTMLElement | undefined;
      if (!boite) return;
      const echelle = feuille.getBoundingClientRect().height / PAGE_HEIGHT || 1;
      const styles = getComputedStyle(boite);
      const padHaut = parseFloat(styles.paddingTop);
      const padBas  = parseFloat(styles.paddingBottom);
      const haut = boite.getBoundingClientRect().top;
      const flux = Array.from(boite.children).filter((e) => getComputedStyle(e).position !== 'absolute');
      if (flux.length === 0) return;
      const bas = Math.max(...flux.map((e) => (e.getBoundingClientRect().bottom - haut) / echelle));
      pire = Math.max(pire, Math.round(bas - padHaut - (boite.clientHeight - padHaut - padBas)));
    });
    // Huit pixels de seuil : sous cette barre, ce sont les arrondis de
    // la mise à l'échelle de l'aperçu, pas du texte perdu.
    const mesure = pire > 8 ? pire : 0;
    setExcedent((prev) => (prev === mesure ? prev : mesure));
  });

  // La pile est mise à l'échelle par transform, qui ne change pas la
  // place qu'elle occupe dans la page : à 0,45, la moitié de la colonne
  // restait un trou noir de plusieurs milliers de pixels. La hauteur
  // réelle se calcule ici, une feuille faisant exactement 297 mm.
  const hauteurPile = Math.round(
    (pages.length * (PAGE_HEIGHT + 0.5) + (pages.length - 1) * ECART_FEUILLES) * scale,
  );


  return (
    <div className="w-full">
      {excedent > 0 && (
        <div
          className="mx-4 mt-4 rounded-[12px] px-4 py-3 font-sans text-[12px] leading-relaxed"
          style={{
            background: 'rgba(216, 123, 142, 0.10)',
            border: '1px solid rgba(216, 123, 142, 0.40)',
            color: '#FCA5B0',
          }}
          role="status"
        >
          {lang === 'en'
            ? 'The content runs past the bottom of the sheet and the export will cut it there. Shorten the notes.'
            : 'Le contenu dépasse le bas de la feuille et l’export coupera à cet endroit. Raccourcissez les notes.'}
        </div>
      )}
      {/* La feuille garde sa largeur de 210 mm dans la mise en page, même
          réduite : sans ce rognage, sur téléphone la page entière
          s'élargissait à huit cents pixels et la barre d'outils se
          retrouvait à moitié hors de l'écran. */}
      <div className="flex justify-center overflow-hidden px-4 py-8" style={{ height: hauteurPile + 64 }}>
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
                      <InvoiceSheet state={state} lang={lang} onPay={onPay} />
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
