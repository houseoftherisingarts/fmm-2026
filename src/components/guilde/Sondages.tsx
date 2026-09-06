import React from 'react';
import type { Guilde } from '../../firebase/guildes';

// ─── Sondages (gabarit provisoire, rempli par la deuxième vague) ───
export interface SondagesProps { guilde: Guilde; uid: string | null; estChef: boolean; peutGerer?: boolean }
const Sondages: React.FC<SondagesProps> = () => null;
export default Sondages;
