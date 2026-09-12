import React, { useMemo, useState } from 'react';
import { Search, Zap, UtensilsCrossed, GripVertical } from 'lucide-react';
import type { VendorApp } from '../../../../firebase/applications';
import type { FicheLivraison } from '../../../../firebase/livraisonKiosque';
import { besoinElectriciteLabel, ficheDeVendor, nomAffiche, optionNourriturePrise } from './helpers';

interface Props {
  vendors: VendorApp[];
  livraisons: FicheLivraison[];
  enMainUid: string | null;
  onToggleEnMain: (uid: string) => void;
  onLibererIci: (kiosqueId: string) => void;
}

/** Le rail des marchands acceptés qui n'ont pas encore de kiosque : à
 *  droite sur grand écran, sous les rangées sur mobile. On y prend un
 *  marchand pour le glisser (ou, au toucher, le prendre en main) sur
 *  un kiosque libre ou occupé. */
const RailMarchands: React.FC<Props> = ({ vendors, livraisons, enMainUid, onToggleEnMain, onLibererIci }) => {
  const [recherche, setRecherche] = useState('');
  const [survole, setSurvole] = useState(false);

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter((v) =>
      `${nomAffiche(v)} ${v.category || ''} ${v.contact || ''}`.toLowerCase().includes(q));
  }, [vendors, recherche]);

  return (
    <aside
      onDragOver={(e) => { e.preventDefault(); setSurvole(true); }}
      onDragLeave={() => setSurvole(false)}
      onDrop={(e) => {
        e.preventDefault();
        setSurvole(false);
        const kiosqueId = e.dataTransfer.getData('text/kiosqueId');
        if (kiosqueId) onLibererIci(kiosqueId);
      }}
      className={`w-full md:w-72 shrink-0 rounded-card border p-3 space-y-3 transition ${
        survole ? 'border-brass bg-brass/[0.06]' : 'border-ivory-soft/15 bg-midnight-deep/40'
      }`}
    >
      <div>
        <p className="font-display title-medieval text-sm text-ivory">Marchands sans kiosque</p>
        <p className="font-editorial italic text-xs text-stone mt-0.5">
          {vendors.length} accepté{vendors.length > 1 ? 's' : ''} à placer · glisser un kiosque ici le libère
        </p>
      </div>

      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ivory-soft/40" />
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Nom, catégorie, contact…"
          className="w-full bg-midnight-deep/60 border border-ivory-soft/20 rounded-card pl-8 pr-3 py-1.5 text-xs font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none"
        />
      </div>

      <div className="space-y-1.5 max-h-[60vh] md:max-h-[65vh] overflow-y-auto pr-0.5">
        {filtres.length === 0 ? (
          <p className="font-editorial italic text-xs text-ivory-soft/40 text-center py-6">
            {vendors.length === 0 ? 'Tous les marchands acceptés ont un kiosque.' : 'Aucun résultat.'}
          </p>
        ) : filtres.map((v) => {
          const fiche = ficheDeVendor(v, livraisons);
          const enMain = enMainUid === v.uid;
          return (
            <div
              key={v.uid}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/vendorUid', v.uid)}
              onClick={() => onToggleEnMain(v.uid)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleEnMain(v.uid); } }}
              title={`${nomAffiche(v)} : glisser sur un kiosque, ou toucher puis toucher un kiosque`}
              className={`group flex items-start gap-2 rounded-card border px-2.5 py-2 cursor-grab active:cursor-grabbing transition ${
                enMain ? 'border-brass bg-brass/10 ring-2 ring-brass' : 'border-ivory-soft/15 bg-ivory-soft/[0.04] hover:bg-ivory-soft/[0.08]'
              }`}
            >
              <GripVertical size={12} className="mt-0.5 text-ivory-soft/30 shrink-0 group-hover:text-ivory-soft/60 transition" />
              <div className="min-w-0 flex-1">
                <p className="font-sans text-xs text-ivory truncate">{nomAffiche(v)}</p>
                <p className="font-editorial italic text-[10px] text-stone truncate">
                  {v.category || 'Catégorie non précisée'}{v.spaceSize || v.kioskDimensions ? ` · ${v.kioskDimensions || v.spaceSize}` : ''}
                </p>
                <div className="mt-1 flex items-center gap-2 text-ivory-soft/60">
                  {(v.electricityNeed === 'oui' || v.needsElectricity) && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] uppercase tracking-wider">
                      <Zap size={10} className="text-brass" /> {besoinElectriciteLabel(v)}
                    </span>
                  )}
                  {optionNourriturePrise(fiche) && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] uppercase tracking-wider text-brass">
                      <UtensilsCrossed size={10} /> Repas
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default RailMarchands;
