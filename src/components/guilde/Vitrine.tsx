import React from 'react';
import type { Guilde } from '../../firebase/guildes';

// ─── La vitrine publique (gabarit provisoire, remplie par l'agent de la vitrine) ───
// Signature définitive : { guilde, uid, estChef, publique }.
//   publique = true quand la page est vue sans compte (lecture seule, pas de composeur).
export interface VitrineProps { guilde: Pick<Guilde, 'id' | 'nom' | 'forme' | 'admins' | 'membres'> & Partial<Guilde>; uid: string | null; estChef: boolean; publique?: boolean }

const Vitrine: React.FC<VitrineProps> = () => null;
export default Vitrine;
