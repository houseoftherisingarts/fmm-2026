// Point d'entrée JETABLE, pour la capture d'écran du Pupitre seul.
// Monte PupitreApp dans la coquille de la régie sans passer par
// l'authentification Firebase. À supprimer après les captures.
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../../index.css';
import PupitreApp from './PupitreApp';

const hote = document.createElement('div');
hote.className = 'admin-skin-root admin-stage min-h-screen';
document.body.appendChild(hote);

createRoot(hote).render(
  <div className="p-4 md:p-8 max-w-7xl mx-auto">
    <PupitreApp canSignAnyName lockedSignerName={null} />
  </div>,
);
