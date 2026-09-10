import React, { useEffect, useState } from 'react';
import { MapPin, Check, Printer } from 'lucide-react';
import { suivreMesAvis } from '../../firebase/avis';
import { CARTE, CARTE_AVIS_ID } from '../../content/carte';
import CarteDuSite from './CarteDuSite';

// ─── Ma carte ────────────────────────────────────────────────────────
// Alex, 2026-09-10 : « la carte se retrouve aussi dans un espace qui
// s'appelle ma carte sur l'espace client ».
//
// La carte y est toujours là, décrochée ou non : c'est la page vers
// laquelle on revient la veille du festival. Le bandeau du haut dit
// seulement si l'avis est déjà dans la collection.

const MaCarte: React.FC<{ uid: string; lang: 'FR' | 'EN' }> = ({ uid, lang }) => {
  const fr = lang === 'FR';
  const [prise, setPrise] = useState(false);

  useEffect(() => {
    if (!uid) return;
    return suivreMesAvis(uid, (ids) => setPrise(ids.includes(CARTE_AVIS_ID)));
  }, [uid]);

  return (
    <section className="glass-light rounded-lg-card p-6 md:p-8">
      <div
        className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-2"
        style={{ borderBottom: '1px solid rgba(var(--sk-parchment-rgb), 0.10)' }}
      >
        <span className="witcher-stat-label inline-flex items-center gap-2">
          <MapPin size={14} style={{ color: 'var(--sk-gilt)' }} />
          {fr ? 'La carte du site 2026' : 'The 2026 site map'}
        </span>
        {prise && (
          <span className="inline-flex items-center gap-2 font-sans text-[11px] uppercase tracking-[0.2em] text-brass">
            <Check size={13} /> {fr ? 'Dans votre collection' : 'In your collection'}
          </span>
        )}
      </div>

      <p className="font-editorial text-sm md:text-base text-ivory-soft leading-relaxed mb-6 max-w-3xl">
        {fr
          ? 'Voici le terrain tel qu’il sera en septembre. Cliquez dessus pour l’ouvrir en grand, ou emportez le fichier : le réseau cellulaire est faible sur le site, et une carte déjà enregistrée sur votre appareil vaut mieux qu’une page qui refuse de charger devant la porte.'
          : 'Here are the grounds as they will be in September. Click to open it large, or take the file with you: cell coverage is weak on site, and a map already saved on your device beats a page that refuses to load at the gate.'}
      </p>

      <div
        className="overflow-hidden"
        style={{
          borderRadius: 'var(--radius-card)',
          border: '1px solid rgba(var(--sk-gilt-rgb), 0.28)',
          boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
        }}
      >
        <CarteDuSite lang={lang} sizes="(max-width: 1024px) 100vw, 1200px" />
      </div>

      <div className="flex flex-wrap gap-3 mt-6">
        <a
          href={CARTE.jpg}
          download={CARTE.nomFichier}
          className="inline-flex items-center gap-2.5 px-6 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-[0.2em] text-[11px] font-semibold hover:bg-brass-soft transition rounded-card"
        >
          <Printer size={14} />
          {fr ? 'La carte à imprimer' : 'The map to print'}
        </a>
      </div>
    </section>
  );
};

export default MaCarte;
