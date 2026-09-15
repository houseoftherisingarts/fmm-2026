import React, { useMemo, useRef, useState } from 'react';
import { MapPin, Upload, X, Crown } from 'lucide-react';
import type { PlanMarche } from '../../../../firebase/planMarche';
import type { VendorApp } from '../../../../firebase/applications';
import { kiosquesSansPosition } from '../../../../lib/planMarche';
import { GhostButton, DangerButton } from '../../primitives';
import { nomAffiche } from './helpers';

interface Props {
  plan: PlanMarche;
  vendorByUid: Map<string, VendorApp>;
  onOpenKiosque: (id: string) => void;
  onDropVendorSurKiosque: (kiosqueId: string, vendorUid: string) => void;
  onPlacer: (kiosqueId: string, x: number, y: number) => void;
  onTeleverser: (file: File, onProgress: (pct: number) => void) => Promise<void>;
  onRetirerCarte: () => void;
}

/** La photo du marché, avec un repère par kiosque posé. Le mode
 *  placement (choisir un kiosque sans position, puis toucher la photo)
 *  remplace le glisser sur la carte, plus fiable au doigt qu'à la
 *  souris quand l'image occupe tout l'écran. */
const VueCarte: React.FC<Props> = ({
  plan, vendorByUid, onOpenKiosque, onDropVendorSurKiosque, onPlacer, onTeleverser, onRetirerCarte,
}) => {
  const carte = plan.carte;
  const imgRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const [placementId, setPlacementId] = useState<string | null>(null);
  const [glisseId, setGlisseId] = useState<string | null>(null);

  const sansPosition = useMemo(() => kiosquesSansPosition(plan), [plan]);

  const coordsDepuisEvenement = (clientX: number, clientY: number) => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  };

  const onFichier = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true); setErreur(null); setPct(0);
    try {
      await onTeleverser(f, setPct);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (!carte) {
    return (
      <div className="rounded-card border border-dashed border-ivory-soft/20 bg-midnight-deep/30 py-14 flex flex-col items-center gap-3 text-center px-4">
        <MapPin size={22} className="text-ivory-soft/30" />
        <p className="font-editorial italic text-sm text-stone max-w-sm">
          Aucune carte déposée : les kiosques se lisent en rangées. Une photo du marché permet de les poser à leur vraie place.
        </p>
        <GhostButton onClick={() => fileRef.current?.click()} disabled={busy}>
          <Upload size={12} /> {busy ? `Envoi… ${pct}%` : 'Déposer la carte'}
        </GhostButton>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFichier} />
        {erreur && <p className="text-xs text-blush">{erreur}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="font-editorial italic text-xs text-stone">
          {placementId
            ? 'Touchez la photo à l’endroit du kiosque sélectionné.'
            : sansPosition.length > 0
              ? `${sansPosition.length} kiosque${sansPosition.length > 1 ? 's' : ''} sans position, en bas de la carte.`
              : 'Tous les kiosques sont posés.'}
        </p>
        <div className="flex items-center gap-2">
          <GhostButton onClick={() => fileRef.current?.click()} disabled={busy}>
            <Upload size={12} /> {busy ? `Envoi… ${pct}%` : 'Remplacer la carte'}
          </GhostButton>
          <DangerButton onClick={onRetirerCarte} disabled={busy}>
            <X size={12} /> Retirer la carte
          </DangerButton>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFichier} />
        </div>
      </div>
      {erreur && <p className="text-xs text-blush">{erreur}</p>}

      <div
        ref={imgRef}
        onClick={(e) => {
          if (!placementId) return;
          const pos = coordsDepuisEvenement(e.clientX, e.clientY);
          if (pos) { onPlacer(placementId, pos.x, pos.y); setPlacementId(null); }
        }}
        onPointerMove={(e) => {
          if (!glisseId) return;
          const pos = coordsDepuisEvenement(e.clientX, e.clientY);
          if (pos) onPlacer(glisseId, pos.x, pos.y);
        }}
        onPointerUp={() => setGlisseId(null)}
        onPointerLeave={() => setGlisseId(null)}
        style={{ aspectRatio: `${carte.largeur} / ${carte.hauteur}`, backgroundImage: `url(${carte.url})` }}
        className={`relative w-full max-w-full bg-cover bg-center rounded-card border overflow-hidden ${
          placementId ? 'border-brass ring-2 ring-brass cursor-crosshair' : 'border-ivory-soft/15'
        }`}
      >
        {plan.kiosques.filter((k) => k.x != null && k.y != null).map((k) => {
          const vendor = k.vendorUid ? vendorByUid.get(k.vendorUid) : undefined;
          return (
            <button
              key={k.id}
              type="button"
              onPointerDown={(e) => { e.stopPropagation(); setGlisseId(k.id); }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const vendorUid = e.dataTransfer.getData('text/vendorUid');
                if (vendorUid) onDropVendorSurKiosque(k.id, vendorUid);
              }}
              onClick={(e) => { e.stopPropagation(); if (!glisseId) onOpenKiosque(k.id); }}
              title={`${k.code}${k.premium ? ' · premium' : ''} · ${vendor ? nomAffiche(vendor) : 'libre'}`}
              style={{ left: `${k.x}%`, top: `${k.y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded-full border font-sans text-[10px] font-semibold shadow-lg transition ${
                vendor
                  ? 'bg-brass text-midnight-deep border-brass'
                  : 'bg-midnight-deep/85 text-ivory-soft border-ivory-soft/40'
              } ${glisseId === k.id ? 'ring-2 ring-white z-10' : ''} ${
                k.premium ? 'ring-2 ring-[var(--color-amber-glow)]' : ''
              }`}
            >
              {k.premium ? <Crown size={10} /> : <MapPin size={10} />} {k.code}
            </button>
          );
        })}
      </div>

      {sansPosition.length > 0 && (
        <div>
          <p className="font-display title-medieval text-xs text-brass mb-1.5">Sans position</p>
          <div className="flex flex-wrap gap-1.5">
            {sansPosition.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setPlacementId((p) => (p === k.id ? null : k.id))}
                className={`px-2.5 py-1 rounded-card border text-[11px] font-sans transition ${
                  placementId === k.id
                    ? 'bg-brass text-midnight-deep border-brass'
                    : 'border-ivory-soft/20 text-ivory-soft hover:border-brass hover:text-brass'
                }`}
              >
                {k.code}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VueCarte;
