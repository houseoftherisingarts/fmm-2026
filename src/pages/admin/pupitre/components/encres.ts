// Les encres et les filets de la feuille imprimée.
//
// Écrites en clair, jamais en classes Tailwind à opacité : une classe
// comme `border-gold-600/30` se compile en color-mix(), que html2canvas
// ne sait pas lire, et le filet disparaît du PDF sans rien dire.

export const LAITON      = '#B08D3A';
export const FILET_FORT  = 'rgba(176, 141, 58, 0.48)';
export const FILET_DOUX  = 'rgba(176, 141, 58, 0.20)';
export const ENCRE_TITRE = '#211C14';
export const ENCRE_TEXTE = '#3A3226';
export const ENCRE_PALE  = '#6B6152';
