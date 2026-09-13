import React from 'react';
import type { VendorApp } from '../../firebase/applications';
import MaCarte from '../carte/MaCarte';
import MonKiosque from './MonKiosque';

interface Props {
  uid: string;
  lang: 'FR' | 'EN';
  vApp: VendorApp | null;
  onEcrireMarchand: () => void;
}

// ─── L'onglet Carte de l'espace membre (Alex, 2026-09-12) ──────────────
// Sorti de FicheMembre.tsx, déjà bien au-delà des 500 lignes du dépôt,
// pour que le kiosque d'un marchand et la carte du site restent un
// bloc à part qu'on peut relire sans rouvrir le fichier entier.
const OngletCarte: React.FC<Props> = ({ uid, lang, vApp, onEcrireMarchand }) => (
  <div className="space-y-6 md:space-y-8">
    {vApp && <MonKiosque uid={uid} lang={lang} annee={vApp.year} onEcrire={onEcrireMarchand} />}
    <MaCarte uid={uid} lang={lang} />
  </div>
);

export default OngletCarte;
