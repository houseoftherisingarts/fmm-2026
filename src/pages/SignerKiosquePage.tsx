import React from 'react';
import SignerCuisinePage, { type EntenteASigner } from './SignerCuisinePage';
import { CONTRAT_KIOSQUE } from '../firebase/contratsSignes';

// ─── Signer l'entente du kiosque de pizza (Philippe Landry) ─────────
// Même mécanique que /signer-cuisine : le lien se colle dans Messenger,
// l'exploitant lit l'entente, signe au doigt, renvoie le PDF signé, et
// l'équipe en reçoit une copie dans l'admin (Alex, 9 septembre 2026).

const ENTENTE_KIOSQUE: EntenteASigner = {
  pdfUrl: '/contrats/entente-kiosque-pizza-2026.pdf',
  contrat: CONTRAT_KIOSQUE,
  titreSeo: "Signer l'entente du kiosque",
  descriptionSeo: "Signature de l'entente d'exploitation du kiosque de pizza au Festival Médiéval de Montpellier.",
  intro: "Trois gestes : lisez l'entente, écrivez votre nom, signez avec votre doigt. Le document signé se renvoie ensuite dans la conversation Messenger, et une copie se dépose au même moment dans le dossier de l'équipe du festival.",
  titreSignature: "Signature de l'exploitant du kiosque",
  prefixeFichier: 'entente-kiosque-pizza',
};

const SignerKiosquePage: React.FC = () => <SignerCuisinePage entente={ENTENTE_KIOSQUE} />;

export default SignerKiosquePage;
