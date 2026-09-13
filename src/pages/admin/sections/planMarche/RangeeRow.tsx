import React, { useState } from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';
import type { Rangee, Kiosque } from '../../../../firebase/planMarche';
import type { VendorApp } from '../../../../firebase/applications';
import type { CibleEnMain } from './helpers';
import KiosqueCard from './KiosqueCard';

interface Props {
  rangee: Rangee;
  kiosques: Kiosque[];
  vendorByUid: Map<string, VendorApp>;
  enMain: CibleEnMain;
  onOpenKiosque: (id: string) => void;
  onToggleEnMainKiosque: (id: string) => void;
  onDropVendorSurKiosque: (kiosqueId: string, vendorUid: string) => void;
  onDropKiosqueSurKiosque: (kiosqueId: string, sourceId: string) => void;
  onRenommer: (nom: string) => void;
  onAjouterKiosque: () => void;
  onRetirerDernierKiosque: () => void;
  onRetirerRangee: () => void;
}

/** Une rangée pleine largeur : son nom éditable en tête, ses kiosques
 *  qui défilent à l'horizontale plutôt que de casser la ligne (utile
 *  autant à 1440px, où huit kiosques tiennent large, qu'à 390px, où
 *  ils glissent sous le doigt). */
const RangeeRow: React.FC<Props> = ({
  rangee, kiosques, vendorByUid, enMain,
  onOpenKiosque, onToggleEnMainKiosque, onDropVendorSurKiosque, onDropKiosqueSurKiosque,
  onRenommer, onAjouterKiosque, onRetirerDernierKiosque, onRetirerRangee,
}) => {
  const [nomBrouillon, setNomBrouillon] = useState(rangee.nom);
  const dernier = kiosques[kiosques.length - 1];
  const dernierOccupe = !!dernier?.vendorUid;
  // Un kiosque sans marchand peut quand même porter une position sur la
  // carte, un prix ou une note : le retirer effacerait ce travail-là sans
  // que le vendorUid en soit le signe.
  const dernierConfigure = !!dernier && !dernierOccupe
    && (dernier.x != null || dernier.y != null || dernier.prixCents != null || !!dernier.note?.trim());
  const rangeeOccupee = kiosques.some((k) => k.vendorUid);

  const commitNom = () => {
    const propre = nomBrouillon.trim();
    if (propre && propre !== rangee.nom) onRenommer(propre);
    else setNomBrouillon(rangee.nom);
  };

  const retirerDernier = () => {
    if (dernierConfigure && !window.confirm(`${dernier.code} a déjà une position, un prix ou une note réglés. Le retirer quand même ?`)) return;
    onRetirerDernierKiosque();
  };

  return (
    <section className="space-y-2">
      <header className="flex items-center gap-2 flex-wrap">
        <input
          value={nomBrouillon}
          onChange={(e) => setNomBrouillon(e.target.value)}
          onBlur={commitNom}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          className="bg-transparent font-display title-medieval text-base text-ivory border-b border-transparent hover:border-ivory-soft/30 focus:border-brass focus:outline-none px-0.5 py-0.5 max-w-[14rem]"
        />
        <span className="font-editorial italic text-xs text-stone">
          · {kiosques.filter((k) => k.vendorUid).length} / {kiosques.length} occupés
        </span>
        <span className="flex-1 h-px bg-gradient-to-r from-ivory-soft/15 to-transparent" />
        <button
          type="button"
          onClick={onAjouterKiosque}
          title="Ajouter un kiosque en bout de rangée"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-card border border-ivory-soft/20 text-ivory-soft hover:border-brass hover:text-brass transition text-[11px] font-sans uppercase tracking-wider"
        >
          <Plus size={11} /> Kiosque
        </button>
        <button
          type="button"
          onClick={onRetirerDernierKiosque}
          disabled={dernierOccupe || kiosques.length === 0}
          title={dernierOccupe ? 'Le dernier kiosque est occupé : libérez-le d’abord' : 'Retirer le dernier kiosque'}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-card border border-ivory-soft/20 text-ivory-soft hover:border-blush hover:text-blush transition text-[11px] font-sans uppercase tracking-wider disabled:opacity-30 disabled:hover:text-ivory-soft disabled:hover:border-ivory-soft/20"
        >
          <Minus size={11} /> Kiosque
        </button>
        <button
          type="button"
          onClick={onRetirerRangee}
          disabled={rangeeOccupee}
          title={rangeeOccupee ? 'Cette rangée a des kiosques occupés' : 'Retirer la rangée'}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-card border border-ivory-soft/20 text-ivory-soft hover:border-blush hover:text-blush transition text-[11px] font-sans uppercase tracking-wider disabled:opacity-30 disabled:hover:text-ivory-soft disabled:hover:border-ivory-soft/20"
        >
          <Trash2 size={11} /> Rangée
        </button>
      </header>

      <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1">
        {kiosques.map((k) => (
          <KiosqueCard
            key={k.id}
            kiosque={k}
            vendor={k.vendorUid ? vendorByUid.get(k.vendorUid) || null : null}
            enMain={enMain?.type === 'kiosque' && enMain.id === k.id}
            cibleActive={enMain?.type === 'vendor'}
            onOpen={() => onOpenKiosque(k.id)}
            onToggleEnMain={() => onToggleEnMainKiosque(k.id)}
            onDropVendor={(uid) => onDropVendorSurKiosque(k.id, uid)}
            onDropKiosque={(sourceId) => onDropKiosqueSurKiosque(k.id, sourceId)}
          />
        ))}
      </div>
    </section>
  );
};

export default RangeeRow;
