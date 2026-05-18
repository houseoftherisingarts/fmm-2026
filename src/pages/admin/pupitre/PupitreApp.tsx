// FMM adaptation of the standalone "Le Pupitre Médiéval" app.
// Differences from the upstream copy in ~/Downloads/:
//   • Square payments stripped (no /api/checkout-link endpoint here;
//     onPay is simply not passed → the Pay button doesn't render).
//   • Signer-name lock: a `lockedSignerName` prop forces non-super
//     admins to sign their own name only (rule: each person signs
//     their own; Tristan / Alex / super get the free dropdown).
//   • Mounted under `.pupitre-root` so the gold/dark palette + glass
//     classes (defined in ./pupitre.css) only apply here.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
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

const PupitreApp: React.FC<PupitreAppProps> = ({ canSignAnyName, lockedSignerName }) => {
  const [lang, setLang] = useState<Language>('fr');
  const initialSignerName = (canSignAnyName ? PRESET_NAMES[0] : (lockedSignerName || PRESET_NAMES[0]));
  const [docState, setDocState] = useState<DocumentState>({ ...INITIAL_STATE_BASE, signerName: initialSignerName });
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading]     = useState(true);
  const [logoCache, setLogoCache]     = useState<Record<string, string>>({});
  const [hasChosenType, setHasChosenType] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const t = (key: string) => TRANSLATIONS[key][lang];

  // Keep the signer name in sync with the lock — if the user is locked,
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
      // change it (defence-in-depth — the UI hides the dropdown but a
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
      alert('Export failed. Voir la console.');
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
        ctx.fillStyle = '#111';
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
      alert('PNG Export failed.');
    } finally {
      setIsExporting(false);
    }
  }, [docState.title, lang]);

  const handleExportHtml = useCallback(() => {
    if (!previewRef.current) return;
    const content = previewRef.current.innerHTML;
    const fullHtml = `<!DOCTYPE html>
<html>
  <head>
    <title>${docState.title}</title>
    <meta charset="UTF-8">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400&display=swap" rel="stylesheet">
    <style>
      body { background: #111; display: flex; flex-direction: column; align-items: center; padding: 40px; gap: 40px; }
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
      <div className="pupitre-root h-[calc(100vh-200px)] w-full bg-dark-900 flex flex-col items-center justify-center text-gold-500 gap-4">
        <Loader2 className="w-12 h-12 animate-spin" />
        <h2 className="font-display tracking-widest uppercase text-xl animate-pulse">
          Initialisation du Pupitre…
        </h2>
      </div>
    );
  }

  if (!hasChosenType) {
    return (
      <div className="pupitre-root w-full bg-dark-900 text-neutral-200 relative overflow-hidden rounded-card border border-white/5 py-16 md:py-20">
        <div className="absolute inset-0 pointer-events-none">
           <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-gold-600/10 rounded-full blur-[120px]" />
           <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-gold-900/10 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-8 max-w-2xl mx-auto px-6">
          <h1 className="font-display font-bold text-3xl md:text-5xl tracking-widest text-gold-gradient uppercase text-center">
            {t('appTitle')}
          </h1>
          <p className="text-neutral-400 text-center text-lg font-serif italic">
            Que souhaitez-vous créer aujourd’hui&nbsp;?
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-4">
            <button
              type="button"
              onClick={() => { handleStateChange({ type: 'letter' }); setHasChosenType(true); }}
              className="glass-panel p-8 rounded-xl3 flex flex-col items-center gap-4 hover:border-gold-500/50 transition-all group"
            >
              <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center border border-white/10 group-hover:border-gold-500/50 transition-colors">
                <svg className="w-8 h-8 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="font-display text-xl tracking-widest text-gold-100 uppercase">Écrire une Lettre</h2>
              <p className="text-sm text-neutral-400 text-center">Créer un document officiel, une lettre ou un mémo.</p>
            </button>
            <button
              type="button"
              onClick={() => { handleStateChange({ type: 'invoice' }); setHasChosenType(true); }}
              className="glass-panel p-8 rounded-xl3 flex flex-col items-center gap-4 hover:border-gold-500/50 transition-all group"
            >
              <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center border border-white/10 group-hover:border-gold-500/50 transition-colors">
                <svg className="w-8 h-8 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="font-display text-xl tracking-widest text-gold-100 uppercase">Facture ou Devis</h2>
              <p className="text-sm text-neutral-400 text-center">Générer une facture ou un devis avec services et taxes.</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pupitre-root w-full bg-dark-900 text-neutral-200 rounded-card overflow-hidden flex flex-col font-sans relative border border-white/5 selection:bg-gold-500/30 min-h-[calc(100vh-160px)]">
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-gold-600/5 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-gold-900/5 rounded-full blur-[120px]" />
      </div>

      <nav className="h-14 border-b border-white/5 bg-black/40 backdrop-blur-md flex items-center px-4 md:px-8 z-20 sticky top-0 flex-shrink-0">
        <h1 className="font-display font-bold text-sm md:text-base tracking-widest text-gold-gradient uppercase">
          {t('appTitle')}
        </h1>
        <div className="ml-auto flex items-center gap-3">
          {isExporting && (
            <div className="flex items-center gap-2 text-gold-400 animate-pulse">
              <Loader2 className="animate-spin w-4 h-4" />
              <span className="text-[10px] uppercase tracking-widest">{t('processing')}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setHasChosenType(false)}
            className="text-[10px] uppercase tracking-widest text-neutral-400 hover:text-gold-400 transition"
          >
            ← Changer
          </button>
        </div>
      </nav>

      <main className="flex-grow flex flex-col md:flex-row relative z-10 overflow-hidden">
        <section className="w-full md:w-[450px] lg:w-[500px] flex-shrink-0 h-full overflow-y-auto p-0 md:p-6 bg-dark-800/80 backdrop-blur-sm border-r border-white/5 scrollbar-thin">
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
        <section className="flex-grow h-full overflow-hidden bg-[#0c0c0c] relative flex flex-col items-center justify-start">
          <PreviewPanel
            ref={previewRef}
            state={docState}
            lang={lang}
            onSignatureChange={handleSignatureChange}
            /* Note: `onPay` intentionally NOT passed — the Square checkout
               button only renders when onPay is supplied. */
          />
        </section>
      </main>
    </div>
  );
};

export default PupitreApp;
