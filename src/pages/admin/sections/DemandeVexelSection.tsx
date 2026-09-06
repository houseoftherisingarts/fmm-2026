import React from 'react';
import DemandeVexel from '../../../components/admin/DemandeVexel';

interface Props {
  nom?: string;
  courriel?: string;
}

const DemandeVexelSection: React.FC<Props> = ({ nom = '', courriel = '' }) => (
  <div className="space-y-6">
    <div>
      <h1 className="admin-title text-2xl">Demander un changement</h1>
      <p className="admin-prose">
        Ce que vous voulez voir changer sur votre site, écrit ou dicté. La demande arrive au
        studio à l’instant et vous suivez ce que nous en avons compris.
      </p>
    </div>
    <DemandeVexel nom={nom} courriel={courriel} ton="sombre" />
  </div>
);

export default DemandeVexelSection;
