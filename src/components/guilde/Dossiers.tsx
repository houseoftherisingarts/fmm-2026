import React from 'react';
import type { Guilde } from '../../firebase/guildes';

// ─── Dossiers (gabarit provisoire, rempli par la deuxième vague) ───
export interface DossiersProps { guilde: Guilde; uid: string | null; estChef: boolean; peutGerer?: boolean }
const Dossiers: React.FC<DossiersProps> = () => null;
export default Dossiers;
