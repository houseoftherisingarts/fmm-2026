import React, { useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';

// ─── Une liste à classer en glissant ─────────────────────────────────
// Alex, 2026-09-28 : le vote sur le budget se fait en glissant les
// postes, le plus important en haut. La poignée sert à glisser (le reste
// de la carte laisse défiler la page au doigt), et les deux flèches font
// le même travail au clavier ou pour qui préfère toucher.

type Option = { id: string; libelle: string };
type Libelles = { monter: string; descendre: string; glisser: string };

const OR = '#E3C27A';

const Ligne: React.FC<{
  o: Option; rang: number; total: number; actif: boolean;
  bouger: (de: number, vers: number) => void; finir: () => void; libelles: Libelles;
}> = ({ o, rang, total, actif, bouger, finir, libelles }) => {
  const controles = useDragControls();
  return (
    <Reorder.Item value={o.id} dragListener={false} dragControls={controles} onDragEnd={finir}
      className="relative flex items-center gap-3 min-h-[52px] rounded-[12px] border px-3 py-2 font-sans text-sm select-none"
      style={{ borderColor: actif ? 'rgba(227,194,122,0.45)' : 'rgba(255,255,255,0.18)', background: 'rgba(12,8,6,0.92)', color: 'var(--color-bone)' }}
      whileDrag={{ scale: 1.02, boxShadow: '0 12px 30px rgba(0,0,0,0.5)', zIndex: 5 }}>
      <button type="button" aria-label={`${libelles.glisser} : ${o.libelle}`}
        onPointerDown={(e) => { e.preventDefault(); controles.start(e); }}
        className="shrink-0 p-2 -m-1 cursor-grab active:cursor-grabbing text-ivory-soft/70" style={{ touchAction: 'none' }}>
        <GripVertical size={18} />
      </button>
      <span className="shrink-0 w-7 text-center font-display text-base" style={{ color: OR }}>{rang + 1}</span>
      <span className="flex-1">{o.libelle}</span>
      <span className="flex shrink-0 gap-1">
        <button type="button" disabled={rang === 0} onClick={() => bouger(rang, rang - 1)} aria-label={`${libelles.monter} : ${o.libelle}`}
          className="p-1.5 rounded-md border border-white/15 disabled:opacity-25"><ChevronUp size={15} /></button>
        <button type="button" disabled={rang === total - 1} onClick={() => bouger(rang, rang + 1)} aria-label={`${libelles.descendre} : ${o.libelle}`}
          className="p-1.5 rounded-md border border-white/15 disabled:opacity-25"><ChevronDown size={15} /></button>
      </span>
    </Reorder.Item>
  );
};

const ClassementGlisser: React.FC<{
  options: Option[]; valeur?: string[]; onChange: (ordre: string[]) => void; libelles: Libelles;
}> = ({ options, valeur, onChange, libelles }) => {
  // L'ordre de départ ne compte pas comme une réponse : la valeur ne
  // s'enregistre qu'au premier geste.
  const [ordre, setOrdre] = useState<string[]>(() => valeur ?? options.map((o) => o.id));
  const parId = new Map(options.map((o) => [o.id, o]));
  const bouger = (de: number, vers: number) => {
    const n = [...ordre]; const [x] = n.splice(de, 1); n.splice(vers, 0, x);
    setOrdre(n); onChange(n);
  };
  return (
    <Reorder.Group axis="y" values={ordre} onReorder={setOrdre} className="grid gap-2">
      {ordre.map((id, i) => (
        <Ligne key={id} o={parId.get(id)!} rang={i} total={ordre.length} actif={!!valeur}
          bouger={bouger} finir={() => onChange(ordre)} libelles={libelles} />
      ))}
    </Reorder.Group>
  );
};

export default ClassementGlisser;
