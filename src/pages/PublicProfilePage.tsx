import React from 'react';
import { useParams } from 'react-router-dom';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import FicheMembre from '../components/compte/FicheMembre';

// ─── La fiche publique d'un membre ───────────────────────────────────
// Exactement la même page que l'espace de la personne, en lecture seule
// (Alex, 2026-08-23). Tout le rendu vit dans FicheMembre : la photo, le
// nom, les fonctions, la description, les badges, les amis, les parties
// et les avis décrochés. Ce qui ne regarde que la personne, à commencer
// par le dé de la vie et ses candidatures, ne passe pas la porte.
//
// Le nom vient toujours de la vraie fiche de l'Ordre (/membres/{uid}),
// jamais d'un jeu de démonstration ni d'un identifiant.

const PublicProfilePage: React.FC = () => {
  useCaravanPage();
  const { uid = '' } = useParams<{ uid: string }>();
  const { lang } = useUI();

  return <FicheMembre mode="public" uid={uid} lang={lang} />;
};

export default PublicProfilePage;
