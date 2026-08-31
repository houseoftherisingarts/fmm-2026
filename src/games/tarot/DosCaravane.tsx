import React from 'react';
import { imageDos } from './dos';

// ─── Un dos de carte du tarot, par identifiant ───────────────────────
// Des photographies de studio mises aux proportions des lames
// (813 × 1536), jamais des dessins : le tarot de la caravane (saphir et
// argent), le dos William (bronze sur velours bordeaux), le dos du Salon
// des Inconnus (logo gravé dans l'or). Alex, 2026-08-30.

const DosCarte: React.FC<{ id?: string; className?: string; style?: React.CSSProperties }> = ({ id = 'caravane', className = '', style }) => (
  <img src={imageDos(id)} alt="" aria-hidden loading="lazy" decoding="async" className={`object-cover ${className}`} style={style} />
);

export default DosCarte;
