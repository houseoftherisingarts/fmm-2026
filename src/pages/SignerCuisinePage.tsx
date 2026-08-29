import React, { useEffect, useRef, useState } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import { BookOpen, Check, Eraser, PenLine, Share2 } from 'lucide-react';
import SEO from '../components/SEO';
import { Eyebrow, DisplayTitle, GildedFrame } from '../components/marche/atmospherics';

// ─── Signer l'entente de cuisine, au doigt, sur son téléphone ───────
// Bâti en pleine réunion des cuisiniers (Alex, 29 août) : le lien se
// colle dans la conversation Messenger, chaque cuisinier ouvre la page
// sur son téléphone, lit l'entente, écrit son nom, signe au doigt, et
// la feuille de partage du téléphone renvoie le PDF signé dans la même
// conversation. Tout se passe côté client (pdf-lib) : aucune donnée ne
// transite par un serveur. Page volontairement absente des menus.

const PDF_URL = '/contrats/entente-cuisine-2026.pdf';

const SignerCuisinePage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nom, setNom] = useState('');
  const [aSigne, setASigne] = useState(false);
  const [etat, setEtat] = useState<'repos' | 'travail' | 'pret' | 'erreur'>('repos');
  const [pdfSigne, setPdfSigne] = useState<Blob | null>(null);
  const dessine = useRef(false);

  // Le canvas suit la largeur réelle de sa boîte (téléphones variés).
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const boite = c.parentElement!;
    c.width = boite.clientWidth * 2;   // x2 : trait net sur écran Retina
    c.height = 360;
    c.style.width = '100%';
    c.style.height = '180px';
    const ctx = c.getContext('2d')!;
    ctx.scale(2, 2);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#241505';
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const debut = (e: React.PointerEvent) => {
    e.preventDefault();
    dessine.current = true;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const trace = (e: React.PointerEvent) => {
    if (!dessine.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setASigne(true);
  };
  const fin = () => { dessine.current = false; };

  const effacer = () => {
    const c = canvasRef.current!;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    setASigne(false);
    setPdfSigne(null);
    setEtat('repos');
  };

  // ── Construire le PDF signé : l'entente + une page de signature ──
  const signer = async () => {
    if (!nom.trim() || !aSigne) { setEtat('erreur'); return; }
    setEtat('travail');
    try {
      const source = await fetch(PDF_URL).then((r) => r.arrayBuffer());
      const doc = await PDFDocument.load(source);
      const pngData = canvasRef.current!.toDataURL('image/png');
      const png = await doc.embedPng(pngData);

      const page = doc.addPage([612, 396]);
      const encre = rgb(0.14, 0.08, 0.02);
      page.drawRectangle({ x: 0, y: 0, width: 612, height: 396, color: rgb(0.956, 0.925, 0.847) });
      page.drawText('Signature du cuisinier ou de la cuisinière', { x: 54, y: 330, size: 16, color: encre });
      page.drawText(`Nom : ${nom.trim()}`, { x: 54, y: 296, size: 12, color: encre });
      const quand = new Date().toLocaleString('fr-CA', { dateStyle: 'long', timeStyle: 'short' });
      page.drawText(`Signé le ${quand}`, { x: 54, y: 276, size: 12, color: encre });
      page.drawText(
        'Signature tracée au doigt sur cette entente, avec le consentement de la personne signataire.',
        { x: 54, y: 256, size: 9, color: encre },
      );
      const ratio = Math.min(300 / png.width, 130 / png.height);
      page.drawImage(png, { x: 54, y: 90, width: png.width * ratio, height: png.height * ratio });
      page.drawLine({ start: { x: 54, y: 84 }, end: { x: 380, y: 84 }, thickness: 1, color: encre });

      const octets = await doc.save();
      const copie = new Uint8Array(octets);
      setPdfSigne(new Blob([copie.buffer], { type: 'application/pdf' }));
      setEtat('pret');
    } catch {
      setEtat('erreur');
    }
  };

  const nomFichier = () =>
    `entente-cuisine-${nom.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.pdf`;

  // Feuille de partage du téléphone : la personne choisit Messenger et
  // le PDF signé retombe dans la conversation. Repli : téléchargement.
  const partager = async () => {
    if (!pdfSigne) return;
    const fichier = new File([pdfSigne], nomFichier(), { type: 'application/pdf' });
    if (navigator.canShare?.({ files: [fichier] })) {
      try { await navigator.share({ files: [fichier], title: 'Entente signée' }); return; } catch { /* refus : repli */ }
    }
    const url = URL.createObjectURL(pdfSigne);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomFichier();
    a.click();
    URL.revokeObjectURL(url);
  };

  const CHAMP =
    'w-full min-w-0 bg-[rgba(10,2,7,0.6)] px-4 py-3 text-base font-sans transition-colors focus:outline-none placeholder:text-[rgba(232,221,193,0.45)]';

  return (
    <>
      <SEO title="Signer l'entente de cuisine" description="Signature de l'entente de prestation des cuisiniers du Festival Médiéval de Montpellier." noindex />
      <div className="min-h-screen px-5 pt-24 pb-20 max-w-xl mx-auto">
        <Eyebrow tone="amber" className="mb-4 inline-flex items-center gap-3">
          <span aria-hidden className="h-px w-8" style={{ background: 'var(--color-amber-glow)' }} />
          Village Nourriture · édition 2026
        </Eyebrow>
        <DisplayTitle size="lg" glow className="mb-5">Signer l'entente</DisplayTitle>

        <p className="font-editorial text-base text-ivory-soft leading-relaxed mb-6">
          Trois gestes : lisez l'entente, écrivez votre nom, signez avec votre doigt.
          Le document signé se renvoie ensuite dans la conversation Messenger.
        </p>

        <a
          href={PDF_URL}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 font-sans uppercase tracking-[0.2em] text-[12px] mb-8"
          style={{ color: 'var(--color-amber-glow)' }}
        >
          <BookOpen size={15} />
          Lire l'entente de prestation
        </a>

        <GildedFrame tone="amber" active className="block">
          <div className="caravan-glass p-6 space-y-5">
            <div>
              <label htmlFor="sc-nom" className="font-sans uppercase tracking-[0.2em] text-[11px] text-ivory-soft block mb-2">
                Votre nom complet
              </label>
              <input id="sc-nom" type="text" autoComplete="name" value={nom}
                onChange={(e) => setNom(e.target.value)} placeholder="Prénom et nom"
                className={CHAMP}
                style={{ color: 'var(--color-bone)', border: '1px solid rgba(232, 177, 74, 0.35)' }} />
            </div>

            <div>
              <span className="font-sans uppercase tracking-[0.2em] text-[11px] text-ivory-soft block mb-2">
                Votre signature, au doigt
              </span>
              <div className="rounded-[15px] overflow-hidden" style={{ background: '#F4ECD8', touchAction: 'none' }}>
                <canvas
                  ref={canvasRef}
                  onPointerDown={debut}
                  onPointerMove={trace}
                  onPointerUp={fin}
                  onPointerLeave={fin}
                  style={{ display: 'block', touchAction: 'none' }}
                />
              </div>
              <button type="button" onClick={effacer}
                className="mt-2 inline-flex items-center gap-2 font-sans uppercase tracking-[0.2em] text-[11px] text-ivory-soft/70">
                <Eraser size={13} /> Recommencer
              </button>
            </div>

            {etat === 'erreur' && (
              <p className="font-editorial text-sm" style={{ color: 'rgba(224, 138, 122, 0.9)' }}>
                Le nom et la signature sont nécessaires tous les deux.
              </p>
            )}

            {etat !== 'pret' ? (
              <button type="button" onClick={signer} disabled={etat === 'travail'}
                className="fmm-glass-btn is-primary px-8 py-4"
                style={{ display: 'inline-flex', gap: '.8rem', alignItems: 'center', width: 'auto' }}>
                <PenLine size={16} />
                <span className="fmm-glass-btn-label">{etat === 'travail' ? 'Un instant' : "Signer l'entente"}</span>
              </button>
            ) : (
              <div className="space-y-4">
                <p className="font-editorial text-base text-ivory leading-relaxed inline-flex items-start gap-2">
                  <Check size={18} style={{ color: 'var(--color-amber-glow)' }} className="mt-0.5 shrink-0" />
                  Votre entente signée est prête. Renvoyez-la dans la conversation Messenger.
                </p>
                <button type="button" onClick={partager}
                  className="fmm-glass-btn is-primary px-8 py-4"
                  style={{ display: 'inline-flex', gap: '.8rem', alignItems: 'center', width: 'auto' }}>
                  <Share2 size={16} />
                  <span className="fmm-glass-btn-label">Renvoyer le document signé</span>
                </button>
              </div>
            )}
          </div>
        </GildedFrame>
      </div>
    </>
  );
};

export default SignerCuisinePage;
