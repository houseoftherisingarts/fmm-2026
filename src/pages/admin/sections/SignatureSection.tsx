import React, { useEffect, useRef, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  Upload, Stamp, Lock, Check, ChevronLeft, ChevronRight, Download, PenLine, FileText,
} from 'lucide-react';
import { Card, PrimaryButton, GhostButton, ToggleSwitch, Input, Label, EmptyState } from '../primitives';
import { SignaturePad } from '../pupitre/components/SignaturePad';
import { useAuth } from '../../../contexts/AuthContext';

// ─── Atelier de signature ─────────────────────────────────────────────
// Charge un PDF déjà écrit, y appose une texture de parchemin, le sceau
// de cire du festival et une signature (dessinée à la main ou choisie
// dans les préréglages), puis le retélécharge signé. pdf-lib estampille
// le PDF existant, pdfjs-dist en dessine un aperçu cliquable.

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

// Largeur de rendu de l'aperçu, en pixels. previewScale = cette largeur
// divisée par la largeur de la page en points PDF.
const PREVIEW_WIDTH = 600;

// Mot de passe partagé temporaire, le temps que l'équipe tranche. Il
// déverrouille la signature de tout le monde pour l'instant. La cible
// est l'association par courriel (chacun ouvre la sienne en étant
// connecté) plus un mot de passe personnel par personne. Celui d'Alex
// sera « Peter Jackson 1 ».
const TEMP_PASSWORD = "j'ai besoin d'une bière";

interface Signer {
  slug: string;
  name: string;
  email: string | null;
  superOnly?: boolean;
}

const SIGNERS: Signer[] = [
  { slug: 'alex', name: 'Alex Turcot St-Laurent', email: null, superOnly: true },
  { slug: 'tristan', name: 'Tristan', email: null },
  { slug: 'oceane', name: 'Océane', email: null },
  { slug: 'maite-fournel', name: 'Maïté Fournel', email: 'benevoles.medievalmontpellier@gmail.com' },
  { slug: 'jesse', name: 'Jesse', email: null },
  { slug: 'eric-pichette', name: 'Eric Pichette', email: null },
  { slug: 'lena', name: 'Léna', email: null },
];

const fetchBytes = (url: string) =>
  fetch(url).then((r) => r.arrayBuffer()).then((b) => new Uint8Array(b));

const SignatureSection: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();
  const email = user?.email ?? null;

  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState('');
  const [numPages, setNumPages] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [previewScale, setPreviewScale] = useState(1);
  const [canvasPx, setCanvasPx] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  const [parchemin, setParchemin] = useState(true);
  const [sceau, setSceau] = useState(true);

  const [mode, setMode] = useState<'preset' | 'draw'>('preset');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [drawnSig, setDrawnSig] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());

  // Signataire dont le champ de mot de passe est ouvert, plus la saisie.
  const [activePwSlug, setActivePwSlug] = useState<string | null>(null);
  const [pwValue, setPwValue] = useState('');
  const [pwError, setPwError] = useState(false);

  const [placement, setPlacement] = useState<{ x: number; y: number } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Un signataire est déverrouillé d'office s'il s'agit d'Alex et que
  // vous êtes super-admin, ou si le courriel de la fiche correspond au
  // vôtre. Sinon, il faut entrer le mot de passe partagé.
  const isAutoUnlocked = (s: Signer) =>
    (!!s.superOnly && isSuperAdmin) ||
    (!!s.email && !!email && s.email.toLowerCase() === email.toLowerCase());
  const isUnlocked = (s: Signer) => isAutoUnlocked(s) || unlocked.has(s.slug);

  // La signature d'Alex reste réservée au super-admin : elle n'apparaît
  // même pas pour le reste de l'équipe.
  const visibleSigners = SIGNERS.filter((s) => !s.superOnly || isSuperAdmin);

  // ── Aperçu : rend la page choisie sur le canvas via pdfjs ──
  useEffect(() => {
    if (!pdfBytes) return;
    let cancelled = false;
    let renderTask: pdfjsLib.RenderTask | null = null;
    (async () => {
      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice(0) });
      const doc = await loadingTask.promise;
      if (cancelled) { void loadingTask.destroy(); return; }
      setNumPages(doc.numPages);
      const idx = Math.min(pageIndex, doc.numPages - 1);
      const page = await doc.getPage(idx + 1);
      if (cancelled) { void loadingTask.destroy(); return; }
      const base = page.getViewport({ scale: 1 });
      const scale = PREVIEW_WIDTH / base.width;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) { void loadingTask.destroy(); return; }
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      renderTask = page.render({ canvasContext: ctx, canvas, viewport });
      try { await renderTask.promise; } catch { /* rendu annulé */ }
      if (!cancelled) {
        setPreviewScale(scale);
        setCanvasPx({ w: viewport.width, h: viewport.height });
      }
      void loadingTask.destroy();
    })().catch((e) => {
      if (!cancelled) setError("Ce PDF n'a pas pu être ouvert.");
      console.warn('[signature] aperçu:', e);
    });
    return () => { cancelled = true; renderTask?.cancel(); };
  }, [pdfBytes, pageIndex]);

  const openFile = async (file: File) => {
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
      setError('Veuillez déposer un fichier PDF.');
      return;
    }
    setError(null);
    setFileName(file.name);
    setPageIndex(0);
    setPlacement(null);
    setPdfBytes(await file.arrayBuffer());
  };

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    setPlacement({ x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy });
  };

  const trySignerPassword = () => {
    if (!activePwSlug) return;
    if (pwValue.trim() === TEMP_PASSWORD) {
      setUnlocked((prev) => new Set(prev).add(activePwSlug));
      setSelectedSlug(activePwSlug);
      setActivePwSlug(null);
      setPwValue('');
      setPwError(false);
    } else {
      setPwError(true);
    }
  };

  const chosenSigUrl = mode === 'preset'
    ? (selectedSlug ? `/atelier-signature/signatures/${selectedSlug}.png` : null)
    : drawnSig;
  const hasSignature = !!chosenSigUrl;
  const canGenerate = !!pdfBytes && hasSignature && !!placement && !generating;

  const outName = () => {
    const base = fileName.replace(/\.pdf$/i, '');
    return `${base || 'document'}-signe.pdf`;
  };

  const generate = async () => {
    if (!pdfBytes || !placement || !chosenSigUrl) return;
    setGenerating(true);
    setError(null);
    try {
      const sigBytes = await fetchBytes(chosenSigUrl);
      const pdf = await PDFDocument.load(pdfBytes.slice(0));
      const pages = pdf.getPages();

      // Parchemin : teinte vieillie sur TOUTES les pages, sous le texte.
      // 0,30 laisse le texte lisible tout en réchauffant la page.
      if (parchemin) {
        const parch = await pdf.embedPng(await fetchBytes('/atelier-signature/parchemin.png'));
        for (const p of pages) {
          const { width, height } = p.getSize();
          p.drawImage(parch, { x: 0, y: 0, width, height, opacity: 0.30 });
        }
      }

      const page = pages[Math.min(pageIndex, pages.length - 1)];
      const { width: pw, height: ph } = page.getSize();

      // Point cliqué : de pixels de l'aperçu vers points PDF (origine en
      // bas à gauche). La signature est centrée sur ce point.
      // ponytail: suppose une page non pivotée (MediaBox = viewport). Un
      // PDF avec /Rotate décalerait le placement. Rare pour un contrat.
      const sig = await pdf.embedPng(sigBytes);
      const sigW = 150;
      const sigH = sigW * (sig.height / sig.width);
      const cx = placement.x / previewScale;
      const cy = ph - placement.y / previewScale;
      page.drawImage(sig, { x: cx - sigW / 2, y: cy - sigH / 2, width: sigW, height: sigH });

      // Sceau : en bas à droite de la page signée, avec une marge.
      if (sceau) {
        const seal = await pdf.embedPng(await fetchBytes('/atelier-signature/sceau.png'));
        const sealW = 100;
        const sealH = sealW * (seal.height / seal.width);
        const m = 40;
        page.drawImage(seal, { x: pw - sealW - m, y: m, width: sealW, height: sealH });
      }

      const out = await pdf.save();
      const blob = new Blob([out], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outName();
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('[signature] génération:', e);
      setError('La génération a échoué. Vérifiez le PDF et réessayez.');
    } finally {
      setGenerating(false);
    }
  };

  // ── Écran d'accueil : dépôt du PDF ──
  if (!pdfBytes) {
    return (
      <div className="space-y-5">
        <Card>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) void openFile(f);
            }}
            className="cursor-pointer rounded-[15px] border-2 border-dashed transition-colors"
            style={{
              borderColor: 'var(--admin-line)',
              background: 'rgba(196, 214, 230, 0.03)',
            }}
          >
            <EmptyState icon={Upload}>
              Déposez ici le PDF à signer, ou cliquez pour le choisir. Vous y poserez ensuite le parchemin, le sceau et la signature.
            </EmptyState>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void openFile(f); }}
          />
        </Card>
        {error && <p className="text-sm font-sans" style={{ color: '#FCA5B0' }}>{error}</p>}
      </div>
    );
  }

  const ghostWidthPct = canvasPx.w ? (150 * previewScale) / canvasPx.w * 100 : 0;
  const sealWidthPct = canvasPx.w ? (100 * previewScale) / canvasPx.w * 100 : 0;
  const sealMarginXPct = canvasPx.w ? (40 * previewScale) / canvasPx.w * 100 : 0;
  const sealMarginYPct = canvasPx.h ? (40 * previewScale) / canvasPx.h * 100 : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* ── Aperçu et placement ── */}
      <div className="lg:col-span-3 space-y-4">
        <Card>
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <FileText size={15} style={{ color: 'var(--admin-accent)' }} />
              <span className="text-sm font-sans truncate" style={{ color: 'var(--admin-text)' }}>{fileName}</span>
            </div>
            <GhostButton onClick={() => { setPdfBytes(null); setNumPages(0); setPlacement(null); }}>
              Changer de PDF
            </GhostButton>
          </div>

          {/* Plateau : le parchemin sert de fond tactile sous la page. */}
          <div
            className="rounded-[15px] p-4 sm:p-6 flex justify-center overflow-x-auto"
            style={{
              backgroundImage: 'url(/atelier-signature/parchemin.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              boxShadow: 'inset 0 0 60px rgba(0,0,0,0.45), inset 0 1px 0 var(--admin-sheen)',
              border: '1px solid var(--admin-line)',
            }}
          >
            <div className="relative inline-block" style={{ lineHeight: 0 }}>
              <canvas
                ref={canvasRef}
                onClick={onCanvasClick}
                className="block max-w-full h-auto cursor-crosshair"
                style={{ boxShadow: '0 10px 30px -8px rgba(0,0,0,0.6)' }}
              />
              {/* Fantôme de la signature au point cliqué. */}
              {placement && chosenSigUrl && canvasPx.w > 0 && (
                <img
                  src={chosenSigUrl}
                  alt=""
                  aria-hidden
                  className="absolute pointer-events-none"
                  style={{
                    left: `${(placement.x / canvasPx.w) * 100}%`,
                    top: `${(placement.y / canvasPx.h) * 100}%`,
                    width: `${ghostWidthPct}%`,
                    transform: 'translate(-50%, -50%)',
                    opacity: 0.9,
                  }}
                />
              )}
              {/* Fantôme du sceau, en bas à droite, là où il se posera. */}
              {sceau && canvasPx.w > 0 && (
                <img
                  src="/atelier-signature/sceau.png"
                  alt=""
                  aria-hidden
                  className="absolute pointer-events-none"
                  style={{
                    right: `${sealMarginXPct}%`,
                    bottom: `${sealMarginYPct}%`,
                    width: `${sealWidthPct}%`,
                    opacity: 0.92,
                  }}
                />
              )}
            </div>
          </div>

          {/* Navigation entre les pages. */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <GhostButton
              onClick={() => { setPageIndex((i) => Math.max(0, i - 1)); setPlacement(null); }}
              disabled={pageIndex === 0}
              style={{ opacity: pageIndex === 0 ? 0.4 : 1 }}
            >
              <ChevronLeft size={14} /> Précédente
            </GhostButton>
            <span className="text-[11px] uppercase tracking-[0.3em] font-sans" style={{ color: 'var(--admin-text-mute)' }}>
              Page {pageIndex + 1} / {numPages || 1}
            </span>
            <GhostButton
              onClick={() => { setPageIndex((i) => Math.min(numPages - 1, i + 1)); setPlacement(null); }}
              disabled={pageIndex >= numPages - 1}
              style={{ opacity: pageIndex >= numPages - 1 ? 0.4 : 1 }}
            >
              Suivante <ChevronRight size={14} />
            </GhostButton>
          </div>

          <p className="text-center text-[12px] font-sans mt-3" style={{ color: placement ? 'var(--admin-text-mute)' : 'var(--admin-accent)' }}>
            {placement ? 'Cliquez de nouveau pour déplacer la signature.' : 'Cliquez sur la page pour y placer la signature.'}
          </p>
        </Card>
      </div>

      {/* ── Options et signature ── */}
      <div className="lg:col-span-2 space-y-5">
        <Card>
          <Label>Habillage</Label>
          <div className="space-y-3 mt-1">
            <div>
              <ToggleSwitch checked={parchemin} onChange={setParchemin} label="Texture parchemin" />
              <p className="text-[12px] font-sans mt-1" style={{ color: 'var(--admin-text-mute)' }}>
                Vieillit toutes les pages en douceur.
              </p>
            </div>
            <div>
              <ToggleSwitch checked={sceau} onChange={setSceau} label="Apposer le sceau" />
              <p className="text-[12px] font-sans mt-1" style={{ color: 'var(--admin-text-mute)' }}>
                Le sceau de cire se pose en bas à droite.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <Label>Signature</Label>
          {/* Onglets : préréglages ou tracé à la main. */}
          <div className="flex gap-2 mt-1 mb-4">
            {(['preset', 'draw'] as const).map((m) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2 text-[11px] uppercase tracking-[0.2em] font-sans transition-colors"
                  style={{
                    borderRadius: 10,
                    border: active ? '1px solid var(--admin-accent-line)' : '1px solid var(--admin-line)',
                    background: active ? 'color-mix(in oklab, var(--admin-accent), transparent 88%)' : 'transparent',
                    color: active ? 'var(--admin-brass-hi)' : 'var(--admin-text-soft)',
                  }}
                >
                  {m === 'preset' ? <><Stamp size={13} /> Préréglées</> : <><PenLine size={13} /> À la main</>}
                </button>
              );
            })}
          </div>

          {mode === 'preset' ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                {visibleSigners.map((s) => {
                  const unlockedNow = isUnlocked(s);
                  const selected = selectedSlug === s.slug;
                  return (
                    <button
                      key={s.slug}
                      type="button"
                      onClick={() => {
                        if (unlockedNow) { setSelectedSlug(s.slug); }
                        else { setActivePwSlug(s.slug); setPwValue(''); setPwError(false); }
                      }}
                      className="relative text-left p-2 transition-colors"
                      style={{
                        borderRadius: 12,
                        border: selected ? '1px solid var(--admin-accent)' : '1px solid var(--admin-line)',
                        background: selected ? 'color-mix(in oklab, var(--admin-accent), transparent 90%)' : 'rgba(196, 214, 230, 0.03)',
                      }}
                    >
                      {/* Vignette de la signature, sur fond crème pour que
                          l'encre sombre reste visible. */}
                      <div
                        className="w-full h-12 flex items-center justify-center mb-1.5 overflow-hidden"
                        style={{ borderRadius: 8, background: unlockedNow ? '#efe6d0' : 'rgba(4, 8, 12, 0.4)' }}
                      >
                        {unlockedNow ? (
                          <img src={`/atelier-signature/signatures/${s.slug}.png`} alt="" className="max-h-10 max-w-[85%] object-contain" />
                        ) : (
                          <Lock size={16} style={{ color: 'var(--admin-text-mute)' }} />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {selected && <Check size={12} style={{ color: 'var(--admin-accent)' }} />}
                        <span className="text-[12px] font-sans truncate" style={{ color: 'var(--admin-text)' }}>{s.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Panneau de déverrouillage du signataire choisi. */}
              {activePwSlug && (
                <div className="mt-4 p-3" style={{ borderRadius: 12, border: '1px solid var(--admin-accent-line)', background: 'rgba(196, 214, 230, 0.03)' }}>
                  <Label>Déverrouiller {SIGNERS.find((s) => s.slug === activePwSlug)?.name}</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="password"
                      value={pwValue}
                      autoFocus
                      placeholder="Mot de passe partagé"
                      onChange={(e) => { setPwValue(e.target.value); setPwError(false); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') trySignerPassword(); }}
                    />
                    <PrimaryButton onClick={trySignerPassword}>Ouvrir</PrimaryButton>
                  </div>
                  {pwError && (
                    <p className="text-[12px] font-sans mt-2" style={{ color: '#FCA5B0' }}>
                      Le mot de passe ne correspond pas.
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div>
              <div className="h-40 w-full" style={{ borderRadius: 12, background: '#efe6d0', padding: 2 }}>
                <SignaturePad
                  onChange={setDrawnSig}
                  label="Signez ici"
                  clearLabel="Effacer"
                  variant="paper"
                />
              </div>
              <p className="text-[12px] font-sans mt-2" style={{ color: 'var(--admin-text-mute)' }}>
                Tracez votre signature. L'encre sombre s'imprimera telle quelle sur le PDF.
              </p>
            </div>
          )}
        </Card>

        <Card>
          <PrimaryButton onClick={generate} disabled={!canGenerate} className="w-full justify-center" style={{ opacity: canGenerate ? 1 : 0.5 }}>
            {generating ? 'Génération en cours...' : <><Download size={14} /> Générer le PDF signé</>}
          </PrimaryButton>
          {!canGenerate && !generating && (
            <p className="text-[12px] font-sans mt-2 text-center" style={{ color: 'var(--admin-text-mute)' }}>
              {!hasSignature ? 'Choisissez une signature.' : 'Cliquez sur la page pour placer la signature.'}
            </p>
          )}
          {error && (
            <p className="text-[12px] font-sans mt-2 text-center" style={{ color: '#FCA5B0' }}>{error}</p>
          )}
        </Card>

        {/* Note sur le mot de passe partagé temporaire. */}
        <p className="admin-prose text-[13px] leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
          Chaque signature est protégée. La vôtre s'ouvre d'elle-même quand vous êtes connecté avec votre courriel. Pour signer au nom d'une autre personne, entrez le mot de passe que l'équipe partage pour l'instant. Nous donnerons bientôt à chacun son propre mot de passe.
        </p>
      </div>
    </div>
  );
};

export default SignatureSection;
