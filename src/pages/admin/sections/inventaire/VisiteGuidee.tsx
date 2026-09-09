import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';

// ─── La visite guidée ────────────────────────────────────────────────
// Portée du Coffre des Inconnus (index.html, « visite guidée ») : un
// trou de lumière fixe dont l'ombre couvre tout le reste, et une bulle
// qui explique ce qui est dans le trou. La cible se mesure jusqu'à ce
// que son rectangle ne bouge plus (jamais requestAnimationFrame : il
// meurt sous le harnais headless), puis tout se repositionne au scroll.
// Les cibles portent un attribut data-visite="…" dans la section.

export interface Etape { cible: string; titre: string; texte: string }

interface Props { etapes: Etape[]; onFin: () => void }

const PAD = 8;

function mesurer(el: Element, cb: (r: DOMRect) => void) {
  let last: DOMRect | null = null, still = 0, tries = 0;
  const tick = () => {
    const r = el.getBoundingClientRect();
    if (last && Math.abs(r.top - last.top) < 1 && Math.abs(r.height - last.height) < 1) still += 1; else still = 0;
    last = r; tries += 1;
    if (still >= 3 || tries > 40) { cb(r); return; }
    window.setTimeout(tick, 60);
  };
  tick();
}

const VisiteGuidee: React.FC<Props> = ({ etapes, onFin }) => {
  const visibles = etapes.filter((e) => {
    const el = document.querySelector<HTMLElement>(`[data-visite="${e.cible}"]`);
    return el && el.offsetParent !== null;
  });
  const [ix, setIx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const cible = useRef<Element | null>(null);

  useEffect(() => {
    const etape = visibles[ix];
    if (!etape) { onFin(); return; }
    const el = document.querySelector(`[data-visite="${etape.cible}"]`);
    if (!el) { onFin(); return; }
    cible.current = el;
    setRect(null);
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    mesurer(el, setRect);
    const suivre = () => { if (cible.current) setRect(cible.current.getBoundingClientRect()); };
    window.addEventListener('scroll', suivre, { passive: true });
    window.addEventListener('resize', suivre);
    const clavier = (e: KeyboardEvent) => { if (e.key === 'Escape') onFin(); };
    window.addEventListener('keydown', clavier);
    return () => { window.removeEventListener('scroll', suivre); window.removeEventListener('resize', suivre); window.removeEventListener('keydown', clavier); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ix]);

  const etape = visibles[ix];
  if (!etape) return null;
  const derniere = ix + 1 >= visibles.length;
  const tipH = 210;
  const largeur = Math.min(360, window.innerWidth - 28);
  const top = rect ? (rect.bottom + 20 + tipH < window.innerHeight ? rect.bottom + 20 : Math.max(12, rect.top - tipH - 16)) : -9999;
  const left = rect ? Math.max(14, Math.min(window.innerWidth - largeur - 14, rect.left)) : -9999;

  return createPortal(
    <>
      <div
        aria-hidden
        style={{
          position: 'fixed', zIndex: 90, pointerEvents: 'none', borderRadius: 14,
          border: '2px solid var(--admin-accent, #B08D3A)',
          boxShadow: '0 0 0 200vmax rgba(3, 6, 10, 0.82), 0 0 30px rgba(176, 141, 58, 0.35)',
          top: rect ? rect.top - PAD : -9999, left: rect ? rect.left - PAD : -9999,
          width: rect ? rect.width + PAD * 2 : 0, height: rect ? rect.height + PAD * 2 : 0,
          transition: 'top .45s cubic-bezier(.22,.61,.36,1), left .45s cubic-bezier(.22,.61,.36,1), width .45s cubic-bezier(.22,.61,.36,1), height .45s cubic-bezier(.22,.61,.36,1)',
        }}
      />
      <div
        role="dialog"
        aria-label={etape.titre}
        className="admin-card-strong"
        style={{ position: 'fixed', zIndex: 95, width: largeur, top, left, padding: '18px 20px', transition: 'top .3s ease, left .3s ease' }}
      >
        <p className="font-sans uppercase tracking-[0.3em] text-[10px] font-semibold mb-1" style={{ color: 'var(--admin-accent)' }}>
          Visite guidée · {ix + 1} / {visibles.length}
        </p>
        <h4 className="font-display text-xl mb-1.5" style={{ color: 'var(--admin-text)' }}>{etape.titre}</h4>
        <p className="font-sans text-sm leading-relaxed" style={{ color: 'var(--admin-text-soft)' }}>{etape.texte}</p>
        <div className="mt-4 flex items-center gap-2">
          <button type="button" onClick={onFin} className="admin-ghost mr-auto" aria-label="Fermer la visite"><X size={13} /> Passer</button>
          {ix > 0 && <button type="button" onClick={() => setIx(ix - 1)} className="admin-ghost" aria-label="Étape précédente"><ArrowLeft size={13} /></button>}
          <button type="button" onClick={() => (derniere ? onFin() : setIx(ix + 1))} className="admin-cta">
            {derniere ? 'Terminer' : 'Suivant'} {!derniere && <ArrowRight size={13} />}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
};

export default VisiteGuidee;
