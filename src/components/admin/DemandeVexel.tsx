import React, { useEffect, useState } from 'react';

// ─── Demande de changement · Vexel Webstudio ────────────────────────
// Encadre le formulaire de demande de Vexel Webstudio dans une iframe.
// La hauteur part à 620px puis suit ce que la page dans le cadre
// annonce par postMessage (elle grandit avec le fil de messages).

interface Props {
  nom?: string;
  courriel?: string;
  ton?: 'clair' | 'sombre';
}

const DemandeVexel: React.FC<Props> = ({ nom = '', courriel = '', ton = 'sombre' }) => {
  const [hauteur, setHauteur] = useState(620);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://vexelwebstudio.com') return;
      if (event.data?.vexelDemande === 'hauteur') {
        setHauteur(Math.max(520, event.data.valeur + 24));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <iframe
      src={`https://vexelwebstudio.com/demande/?client=fmm&cle=SVCf6bxaH3dsY5KNVMs-uKpq&ton=${ton}&nom=${encodeURIComponent(nom)}&courriel=${encodeURIComponent(courriel)}`}
      title="Demande de changement · Vexel Webstudio"
      allow="microphone"
      style={{ width: '100%', minHeight: hauteur, border: 0, borderRadius: 15, background: 'transparent' }}
    />
  );
};

export default DemandeVexel;
