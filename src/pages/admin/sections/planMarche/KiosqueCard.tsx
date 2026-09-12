import React, { useState } from 'react';
import { Zap, ZapOff, Wifi, WifiOff, UtensilsCrossed, GripVertical } from 'lucide-react';
import type { Kiosque } from '../../../../firebase/planMarche';
import type { VendorApp } from '../../../../firebase/applications';
import { prixAffiche, WIFI } from '../../../../lib/planMarche';
import { nomAffiche } from './helpers';

interface Props {
  kiosque: Kiosque;
  vendor: VendorApp | null;
  enMain: boolean;
  /** Un marchand du rail est en main : ce kiosque devient une cible de pose. */
  cibleActive: boolean;
  onOpen: () => void;
  onToggleEnMain: () => void;
  onDropVendor: (vendorUid: string) => void;
  onDropKiosque: (kiosqueId: string) => void;
}

/** Une carte de kiosque, compacte, qui tient l'essentiel visible sans
 *  jamais empiler deux repères l'un sur l'autre : le code, l'occupant,
 *  puis les quatre pastilles (prix, électricité, wifi, repas). */
const KiosqueCard: React.FC<Props> = ({
  kiosque, vendor, enMain, cibleActive, onOpen, onToggleEnMain, onDropVendor, onDropKiosque,
}) => {
  const [survole, setSurvole] = useState(false);
  const wifiLabel = WIFI.find((w) => w.id === kiosque.wifi)?.FR || kiosque.wifi;
  const occupant = vendor ? nomAffiche(vendor) : null;

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={!!vendor}
      onDragStart={(e) => { if (vendor) e.dataTransfer.setData('text/kiosqueId', kiosque.id); }}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      onDragOver={(e) => { e.preventDefault(); setSurvole(true); }}
      onDragLeave={() => setSurvole(false)}
      onDrop={(e) => {
        e.preventDefault();
        setSurvole(false);
        const vendorUid = e.dataTransfer.getData('text/vendorUid');
        const kiosqueId = e.dataTransfer.getData('text/kiosqueId');
        if (vendorUid) onDropVendor(vendorUid);
        else if (kiosqueId && kiosqueId !== kiosque.id) onDropKiosque(kiosqueId);
      }}
      className={`relative w-[152px] shrink-0 rounded-card border px-3 py-2.5 cursor-pointer transition text-left ${
        vendor ? 'bg-brass/[0.07] border-brass/30 hover:bg-brass/[0.11]' : 'bg-midnight-deep/40 border-ivory-soft/15 hover:border-ivory-soft/30'
      } ${survole ? 'ring-2 ring-brass shadow-[0_0_0_2px_rgba(201,160,90,0.35)]' : ''} ${
        enMain ? 'ring-2 ring-brass' : ''
      } ${cibleActive ? 'border-brass/60' : ''}`}
      title={occupant ? `${kiosque.code} · ${occupant}` : `${kiosque.code} · libre`}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="font-display title-medieval text-xs text-brass">{kiosque.code}</span>
        {vendor && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleEnMain(); }}
            title="Prendre en main pour déplacer ou échanger"
            className={`shrink-0 -mt-0.5 -mr-1 p-1 rounded-card transition ${
              enMain ? 'text-brass bg-brass/20' : 'text-ivory-soft/40 hover:text-brass'
            }`}
          >
            <GripVertical size={12} />
          </button>
        )}
      </div>

      <p className={`mt-1 font-sans text-xs leading-snug line-clamp-2 min-h-[2.2em] ${vendor ? 'text-ivory' : 'text-stone italic'}`}>
        {occupant || 'Libre'}
      </p>

      <div className="mt-2 flex items-center gap-2 text-ivory-soft/70">
        {kiosque.electricite
          ? <Zap size={12} className="text-brass" />
          : <ZapOff size={12} className="opacity-40" />}
        {kiosque.wifi === 'aucun'
          ? <WifiOff size={12} className="opacity-40" />
          : <Wifi size={12} className={kiosque.wifi === 'bon' ? 'text-brass' : ''} />}
        {kiosque.nourriture && <UtensilsCrossed size={12} className="text-brass" />}
      </div>
      <p className="mt-1 font-sans text-[10px] uppercase tracking-wider text-ivory-soft/50 truncate" title={wifiLabel}>
        {prixAffiche(kiosque.prixCents)}
      </p>
    </div>
  );
};

export default KiosqueCard;
