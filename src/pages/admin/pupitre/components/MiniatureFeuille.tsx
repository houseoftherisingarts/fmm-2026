import React from 'react';

// La miniature de feuille peinte sur chaque plaque du seuil. Un dessin
// de la chose plutôt qu'un pictogramme de la chose : on voit du premier
// coup d'œil la différence entre une lettre et une facture.
export const MiniatureFeuille: React.FC<{ variante: 'letter' | 'invoice' }> = ({ variante }) => (
  <span aria-hidden className="pu-mini">
    <span className="relative z-10 flex flex-col gap-[5px] h-full pt-2">
      <span className="pu-mini-brass w-5 mx-auto" />
      <span className="pu-mini-head mx-auto mt-1" style={{ width: variante === 'letter' ? '68%' : '46%' }} />
      <span className="pu-mini-brass w-8 mx-auto mb-1.5" />
      {variante === 'letter' ? (
        <>
          <span className="pu-mini-row w-full" />
          <span className="pu-mini-row w-full" />
          <span className="pu-mini-row w-[86%]" />
          <span className="pu-mini-row w-full mt-1.5" />
          <span className="pu-mini-row w-full" />
          <span className="pu-mini-row w-[72%]" />
          <span className="pu-mini-row w-[52%] ml-auto mt-auto" />
        </>
      ) : (
        <>
          <span className="flex gap-1"><span className="pu-mini-row flex-1" /><span className="pu-mini-row w-3" /></span>
          <span className="flex gap-1"><span className="pu-mini-row flex-1" /><span className="pu-mini-row w-3" /></span>
          <span className="flex gap-1"><span className="pu-mini-row flex-1" /><span className="pu-mini-row w-3" /></span>
          <span className="flex gap-1"><span className="pu-mini-row flex-1" /><span className="pu-mini-row w-3" /></span>
          <span className="pu-mini-brass w-[44%] ml-auto mt-auto" />
          <span className="pu-mini-head w-[34%] ml-auto" />
        </>
      )}
    </span>
  </span>
);
