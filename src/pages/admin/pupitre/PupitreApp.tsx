// Le Pupitre du Festival Médiéval de Montpellier.
//
// L'outil vient d'une application autonome, reprise ici dans la régie.
// Ce qu'il fait n'a pas bougé : on choisit une lettre ou une facture, on
// écrit, on signe sur la feuille, on exporte en PDF, en PNG ou en HTML.
// Les paiements Square de la version d'origine restent débranchés (aucun
// point d'accès /api/checkout-link de ce côté), et le verrou de signature
// tient toujours : chacun signe son nom, seuls les super-admins peuvent
// signer pour autrui.
//
// Ce qui a changé le 2026-09-02, c'est la peau. Le Pupitre arrivait avec
// sa palette or sur noir, ses coins à trente pixels et son titre en
// dégradé doré, posé au milieu d'une régie qui a son propre canon. Il se
// lit maintenant comme le reste des planches : verre sombre à quinze
// pixels, laiton du rôle connecté, titre gravé, Cinzel Decorative et
// Cormorant. Trois arbitrages ont été tranchés en faveur de la
// lisibilité, parce que le Pupitre sert debout pendant le festival :
// les étiquettes montent à onze pixels, les cibles à quarante-quatre, et
// sur téléphone l'écriture et la feuille passent en deux onglets plutôt
// que de s'empiler sur sept mille pixels de haut.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, ArrowLeft, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { EditorPanel } from './components/EditorPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { DocumentState, Language } from './types';
import { TRANSLATIONS, LOGOS, PRESET_NAMES, PRESET_ROLES } from './constants';
import './pupitre.css';

interface PupitreAppProps {
  /** When false, signer-name dropdown is locked to lockedSignerName. */
  canSignAnyName:   boolean;
  /** The signer name to use when locked. Falls back to PRESET_NAMES[0]. */
  lockedSignerName: string | null;
}

const INITIAL_STATE_BASE: Omit<DocumentState, 'signerName'> = {
  type: 'letter',
  title: '',
  content: '',
  logoId: 'fmm',
  logoImage: null,
  signerRole: PRESET_ROLES[0],
  customRole: '',
  signatureImage: null,
  date: new Date().toISOString().split('T')[0],
  titleSize: 48,
  textSize: 18,
  invoiceType: 'invoice',
  invoiceNumber: '',
  clientName: '',
  clientAddress: '',
  services: [],
  tpsNumber: '736597287RT0001',
  tvqNumber: '1225724543TQ0001',
  paperStyle: 'white',
};

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Failed to convert blob to base64'));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const fetchImageAsBase64 = async (originalUrl: string): Promise<string> => {
  const cleanUrl = originalUrl.replace(/^https?:\/\//, '');
  const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&output=png`;
  try {
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
    const blob = await res.blob();
    return await blobToBase64(blob);
  } catch (e) {
    console.error('Proxy failed:', e);
    return originalUrl;
  }
};

// La miniature de feuille peinte sur chaque plaque du seuil. Un dessin
// de la chose plutôt qu'un pictogramme de la chose : on voit du premier
// coup d'œil la différence entre une lettre et une facture.
const MiniatureFeuille: React.FC<{ variante: 'letter' | 'invoice' }> = ({ variante }) => (
  <span aria-hidden className="pu-mini">
    <span className="relative z-10 flex flex-col gap-[5px] h-full pt-2">
      <span className="pu-mini-brass w-5 mx-auto" />
      <span className="pu-mini-head mx-auto mt-1" style={{ width: variante === 'letter' ? '68%' : '46%' }} />
      <span className="pu-mini-brass w-8 mx-auto mb-1.5" />
      {variante === 'letter' ? (
        <>
          <span className="pu-mini-row w-full" />
          <span className="pu-mini-row w-full" />
          <span className="pu-mini-row w-[86%]" />
          <span className="pu-mini-row w-full mt-1.5" />
          <span className="pu-mini-row w-full" />
          <span className="pu-mini-row w-[72%]" />
          <span className="pu-mini-row w-[52%] ml-auto mt-auto" />
        </>
      ) : (
        <>
          <span className="flex gap-1"><span className="pu-mini-row flex-1" /><span className="pu-mini-row w-3" /></span>
          <span className="flex gap-1"><span className="pu-mini-row flex-1" /><span className="pu-mini-row w-3" /></span>
          <span className="flex gap-1"><span className="pu-mini-row flex-1" /><span className="pu-mini-row w-3" /></span>
          <span className="flex gap-1"><span className="pu-mini-row flex-1" /><span className="pu-mini-row w-3" /></span>
          <span className="pu-mini-brass w-[44%] ml-auto mt-auto" />
          <span className="pu-mini-head w-[34%] ml-auto" />
        </>
      )}
    </span>
  </span>
);

const PupitreApp: React.FC<PupitreAppProps> = ({ canSignAnyName, lockedSignerName }) => {
  const [lang, setLang] = useState<Language>('fr');
  const initialSignerName = (canSignAnyName ? PRESET_NAMES[0] : (lockedSignerName || PRESET_NAMES[0]));
  const [docState, setDocState] = useState<DocumentState>({ ...INITIAL_STATE_BASE, signerName: initialSignerName });
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading]     = useState(true);
  const [logoCache, setLogoCache]     = useState<Record<string, string>>({});
  const [hasChosenType, setHasChosenType] = useState(false);
  // Sur téléphone, les deux moitiés deviennent deux onglets. Sur grand
  // écran l'onglet ne sert à rien : les deux colonnes tiennent côte à
  // côte et cet état est simplement ignoré.
  const [voletMobile, setVoletMobile] = useState<'editeur' | 'apercu'>('editeur');

  const previewRef = useRef<HTMLDivElement>(null);
  const t = (key: string) => TRANSLATIONS[key][lang];

  // Keep the signer name in sync with the lock: if the user is locked,
  // any external state change can't drift away from their own name.
  useEffect(() => {
    if (!canSignAnyName && lockedSignerName) {
      setDocState((prev) => prev.signerName === lockedSignerName ? prev : { ...prev, signerName: lockedSignerName });
    }
  }, [canSignAnyName, lockedSignerName]);

  // Pre-load the FMM logo via the wsrv.nl proxy (CORS-friendly).
  useEffect(() => {
    const initApp = async () => {
      const cache: Record<string, string> = {};
      try {
        await Promise.all(LOGOS.map(async (logo) => {
          try { cache[logo.id] = await fetchImageAsBase64(logo.url); }
          catch { cache[logo.id] = logo.url; }
        }));
      } catch (e) {
        console.error('[pupitre] init error', e);
      }
      setLogoCache(cache);
      setDocState((prev) => ({ ...prev, logoImage: cache[prev.logoId] || null }));
      setIsLoading(false);
    };
    initApp();
  }, []);

  const handleStateChange = useCallback((updates: Partial<DocumentState>) => {
    setDocState((prev) => {
      // Enforce the signer-name lock even if the EditorPanel tries to
      // change it (defence-in-depth: the UI hides the dropdown but a
      // mutated prop or replayed event shouldn't sneak through).
      const next = { ...prev, ...updates };
      if (!canSignAnyName && lockedSignerName) next.signerName = lockedSignerName;
      if (updates.logoId && logoCache[updates.logoId]) {
        next.logoImage = logoCache[updates.logoId];
      }
      return next;
    });
  }, [logoCache, canSignAnyName, lockedSignerName]);

  const handleSignatureChange = useCallback((dataUrl: string | null) => {
    setDocState((prev) => ({ ...prev, signatureImage: dataUrl }));
  }, []);

  const toggleLanguage = useCallback(() => {
    setLang((prev) => prev === 'en' ? 'fr' : 'en');
  }, []);

  const capturePage = async (element: HTMLElement): Promise<HTMLCanvasElement> => {
    const clone = element.cloneNode(true) as HTMLElement;
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '210mm';
    container.appendChild(clone);
    document.body.appendChild(container);

    try {
      const originalCanvases = element.querySelectorAll('canvas');
      const clonedCanvases   = clone.querySelectorAll('canvas');
      originalCanvases.forEach((orig, i) => {
        const cloned = clonedCanvases[i];
        if (cloned) {
          const img = document.createElement('img');
          img.src = (orig as HTMLCanvasElement).toDataURL();
          img.className = cloned.className;
          img.style.cssText = cloned.style.cssText;
          img.style.width = '100%';
          img.style.height = '100%';
          cloned.parentNode?.replaceChild(img, cloned);
        }
      });

      const images = clone.querySelectorAll('img');
      const imagePromises = Array.from(images).map(async (img) => {
        const src = img.src;
        if (!src || src.startsWith('data:')) return;
        try {
          const base64 = await fetchImageAsBase64(src);
          if (base64.startsWith('data:')) img.src = base64;
        } catch (err) {
          console.error('[pupitre] image swap failed', err);
        }
      });
      await Promise.all(imagePromises);
      await new Promise((r) => setTimeout(r, 200));

      return await html2canvas(clone, {
        scale: 2.5,
        useCORS: false,
        backgroundColor: '#F5F2EA',
        logging: false,
        allowTaint: true,
        imageTimeout: 15000,
      });
    } finally {
      document.body.removeChild(container);
    }
  };

  const handleExportPdf = useCallback(async () => {
    if (!previewRef.current) return;
    setIsExporting(true);
    try {
      const pageElements = previewRef.current.querySelectorAll('.preview-page');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      for (let i = 0; i < pageElements.length; i++) {
        const canvas = await capturePage(pageElements[i] as HTMLElement);
        const imgData = canvas.toDataURL('image/jpeg', 0.90);
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      }
      pdf.save(`${docState.title || 'document'}_${lang}.pdf`);
    } catch (error) {
      console.error('[pupitre] PDF error', error);
      alert(t('exportFailed'));
    } finally {
      setIsExporting(false);
    }
  }, [docState.title, lang]);

  const handleExportPng = useCallback(async () => {
    if (!previewRef.current) return;
    setIsExporting(true);
    try {
      const pageElements = previewRef.current.querySelectorAll('.preview-page');
      const canvases: HTMLCanvasElement[] = [];
      let totalHeight = 0;
      let maxWidth = 0;
      for (let i = 0; i < pageElements.length; i++) {
        const canvas = await capturePage(pageElements[i] as HTMLElement);
        canvases.push(canvas);
        totalHeight += canvas.height;
        maxWidth = Math.max(maxWidth, canvas.width);
      }
      const masterCanvas = document.createElement('canvas');
      masterCanvas.width = maxWidth;
      masterCanvas.height = totalHeight + (canvases.length - 1) * 20;
      const ctx = masterCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#05090C';
        ctx.fillRect(0, 0, masterCanvas.width, masterCanvas.height);
        let y = 0;
        canvases.forEach((c) => { ctx.drawImage(c, 0, y); y += c.height + 20; });
        const link = document.createElement('a');
        link.download = `${docState.title || 'document'}_${lang}.png`;
        link.href = masterCanvas.toDataURL('image/png');
        link.click();
      }
    } catch (error) {
      console.error('[pupitre] PNG error', error);
      alert(t('exportFailed'));
    } finally {
      setIsExporting(false);
    }
  }, [docState.title, lang]);

  const handleExportHtml = useCallback(() => {
    if (!previewRef.current) return;
    const content = previewRef.current.innerHTML;
    // Les fontes appelées ici sont celles du festival, pas celles de
    // l'application d'origine : le HTML exporté doit sortir dans la même
    // voix que le PDF et que le site.
    const fullHtml = `<!DOCTYPE html>
<html lang="${lang}">
  <head>
    <title>${docState.title}</title>
    <meta charset="UTF-8">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cormorant+SC:wght@400;600&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
      body { background: #05090C; display: flex; flex-direction: column; align-items: center; padding: 40px; gap: 40px; }
      .preview-page { margin-bottom: 40px; }
      [data-html2canvas-ignore="true"] { display: none !important; }
    </style>
  </head>
  <body>${content}</body>
</html>`;
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docState.title || 'document'}_${lang}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [docState.title, lang]);

  if (isLoading) {
    return (
      <div className="pupitre-root pu-plate min-h-[340px] flex flex-col items-center justify-center gap-5 px-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--admin-accent)' }} />
        <p className="pu-eyebrow">{t('appSubtitle')}</p>
        <h2 className="pu-title text-xl md:text-2xl">{t('loading')}</h2>
      </div>
    );
  }

  // ── Le seuil : lettre ou facture ──────────────────────────────
  if (!hasChosenType) {
    return (
      <div className="pupitre-root pu-plate-strong px-6 py-12 md:px-14 md:py-16">
        <div className="max-w-4xl mx-auto">
          <p className="pu-eyebrow">{t('appSubtitle')}</p>
          <h1 className="pu-title text-3xl md:text-[2.6rem] mt-3">{t('appTitle')}</h1>
          <hr className="pu-rule mt-4" />
          <p className="pu-prose mt-5 max-w-xl">{t('chooseQuestion')}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-9">
            {(['letter', 'invoice'] as const).map((variante) => (
              <button
                key={variante}
                type="button"
                onClick={() => { handleStateChange({ type: variante }); setHasChosenType(true); }}
                className="pu-plate pu-choice"
              >
                <span className="flex items-start gap-5">
                  <MiniatureFeuille variante={variante} />
                  <span className="flex-1 min-w-0">
                    <span className="pu-title block text-lg md:text-xl">
                      {variante === 'letter' ? t('chooseLetter') : t('chooseInvoice')}
                    </span>
                    <span className="pu-prose block mt-2.5 text-[0.95rem]">
                      {variante === 'letter' ? t('chooseLetterNote') : t('chooseInvoiceNote')}
                    </span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Le pupitre ouvert ─────────────────────────────────────────
  const etiquetteType = docState.type === 'invoice'
    ? (docState.invoiceType === 'quote' ? t('quoteWord') : t('invoiceWord'))
    : t('chooseLetter');

  return (
    <div className="pupitre-root pu-plate-strong selection:bg-[rgba(201,168,90,0.30)]">
      {/* Barre de l'outil. Elle ne colle pas en haut : la colonne de la
          régie a déjà sa propre barre collante et deux bandeaux
          superposés se marchent dessus au défilement. */}
      <header className="pu-bar rounded-t-[15px] px-4 md:px-7 py-3.5 flex items-center gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="pu-eyebrow truncate">{etiquetteType}</p>
          <h2 className="pu-title text-base md:text-lg mt-1 truncate">{t('appTitle')}</h2>
        </div>

        <div className="ml-auto flex items-center gap-3 flex-wrap">
          {isExporting && (
            <span className="inline-flex items-center gap-2" style={{ color: 'var(--admin-brass-hi)' }}>
              <Loader2 className="animate-spin w-4 h-4" />
              <span className="font-sans text-[10px] uppercase tracking-[0.28em]">{t('processing')}</span>
            </span>
          )}

          <div className="pu-seg" role="group" aria-label="Langue · Language">
            {(['fr', 'en'] as const).map((code) => (
              <button
                key={code}
                type="button"
                data-active={lang === code}
                onClick={() => { if (lang !== code) toggleLanguage(); }}
                className="!min-h-[34px] !px-3"
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setHasChosenType(false)}
            className="admin-ghost"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">{t('changeType')}</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExporting}
            className="admin-cta"
          >
            <Download size={14} />
            <span className="hidden md:inline">{t('downloadPdf')}</span>
            <span className="md:hidden">PDF</span>
          </button>
        </div>
      </header>

      <div className="pu-desk-lip" />

      {/* Sur téléphone, deux onglets. La feuille A4 réduite à 0,4 sur un
          écran de 390 pixels ne se lit pas : autant lui donner l'écran
          entier quand on veut la regarder. */}
      <div className="md:hidden px-4 pt-4">
        <div className="pu-seg w-full">
          <button type="button" data-active={voletMobile === 'editeur'} onClick={() => setVoletMobile('editeur')}>
            {t('editor')}
          </button>
          <button type="button" data-active={voletMobile === 'apercu'} onClick={() => setVoletMobile('apercu')}>
            {t('preview')}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-[minmax(0,430px)_minmax(0,1fr)] items-start">
        <section
          className={`${voletMobile === 'editeur' ? 'block' : 'hidden'} md:block ` +
            'md:sticky md:top-4 md:max-h-[calc(100vh-2rem)] md:overflow-y-auto scrollbar-thin ' +
            'p-4 md:p-6 md:border-r md:border-[color:var(--admin-line)]'}
        >
          <EditorPanel
            lang={lang}
            state={docState}
            onChange={handleStateChange}
            onExportPdf={handleExportPdf}
            onExportHtml={handleExportHtml}
            onExportPng={handleExportPng}
            onToggleLang={toggleLanguage}
            isExporting={isExporting}
            lockedSignerName={canSignAnyName ? null : lockedSignerName}
          />
        </section>

        <section
          className={`${voletMobile === 'apercu' ? 'block' : 'hidden'} md:block ` +
            'pu-desk rounded-b-[15px] md:rounded-bl-none min-h-[420px]'}
        >
          <PreviewPanel
            ref={previewRef}
            state={docState}
            lang={lang}
            onSignatureChange={handleSignatureChange}
            /* Note: `onPay` intentionally NOT passed. The Square checkout
               button only renders when onPay is supplied. */
          />
        </section>
      </div>
    </div>
  );
};

export default PupitreApp;
