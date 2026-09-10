import React, { useEffect, useState } from 'react';
import { GROUPES } from '../../content/placeClan';
import { lirePlaceDe, type ResultatClan } from '../../firebase/placeClan';
import { ICONES } from './EquipeClan';

// ─── Le verdict, épinglé sur la fiche ───────────────────────────────
// Celui qui a fait le jeu de l'année de la Peste porte sa place à côté
// de son nom, comme un badge (Alex, 2026-09-10). Il se retire depuis le
// bloc « Ma place dans le clan », plus bas sur la même fiche.

const BadgePlace: React.FC<{ uid: string; lang: 'FR' | 'EN' }> = ({ uid, lang }) => {
  const [r, setR] = useState<ResultatClan | null>(null);

  useEffect(() => {
    let vivant = true;
    lirePlaceDe({ uid })
      .then((rep) => { if (vivant) setR(rep.resultat); })
      .catch(() => { /* hors ligne : la fiche vit sans le badge */ });
    return () => { vivant = false; };
  }, [uid]);

  if (!r || r.badge === false) return null;
  const g = GROUPES[r.groupe];

  return (
    <li
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-card font-sans uppercase tracking-[0.18em] text-[10px]"
      title={lang === 'FR' ? `${g.nom} · année de la Peste` : `${g.nom} · Plague year`}
      style={{
        color: 'var(--color-amber-glow)',
        background: 'rgba(var(--sk-glow-rgb), 0.12)',
        border: '1px solid rgba(var(--sk-glow-rgb), 0.45)',
      }}
    >
      {ICONES[r.fonction]} {g.titres[r.fonction]}
    </li>
  );
};

export default BadgePlace;
