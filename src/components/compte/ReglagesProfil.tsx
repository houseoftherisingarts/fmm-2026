import React from 'react';
import { SlidersHorizontal, MoveVertical, MoveHorizontal, Flame } from 'lucide-react';
import type { PositionBanniere, PrefsMembre } from '../../firebase/ordre';

// ─── Réglages de mon profil ───────────────────────────────────────────
// Alex, 2026-08-28 : trois réglages personnels, écrits dans
// membres/{uid}.prefs. Le parent (FicheMembre) porte l'état et
// l'écriture Firestore : ce panneau ne fait qu'appeler `onChange`.

const POSITIONS: { id: PositionBanniere; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'haut', icon: MoveVertical },
  { id: 'bas', icon: MoveVertical },
  { id: 'droite', icon: MoveHorizontal },
];

const Interrupteur: React.FC<{ actif: boolean; onClick: () => void; label: string }> = ({ actif, onClick, label }) => (
  <button
    type="button" role="switch" aria-checked={actif} onClick={onClick}
    className="relative w-10 h-[22px] rounded-full transition-colors shrink-0"
    style={{ background: actif ? '#D8B05A' : 'rgba(244,239,227,0.18)' }}
    aria-label={label}
  >
    <span className="absolute top-0.5 w-[18px] h-[18px] rounded-full transition-transform"
          style={{ background: '#F4EFE3', transform: actif ? 'translateX(19px)' : 'translateX(2px)' }} />
  </button>
);

const ReglagesProfil: React.FC<{
  prefs?: PrefsMembre;
  onChange: (patch: Partial<PrefsMembre>) => void;
  lang: 'FR' | 'EN';
}> = ({ prefs, onChange, lang }) => {
  const fr = lang === 'FR';
  const t = fr ? FR : EN;
  const parallaxe = prefs?.parallaxe !== false;
  const animationsFond = prefs?.animationsFond !== false;
  const position = prefs?.positionBanniere || 'bas';

  return (
    <section className="glass-light rounded-lg-card p-7 md:p-8">
      <p className="font-editorial text-brass uppercase tracking-[0.3em] text-xs mb-2">
        <SlidersHorizontal size={12} className="inline mr-1.5 -mt-0.5" />{t.eyebrow}
      </p>
      <h2 className="font-display title-medieval text-xl md:text-2xl text-ivory mb-5">{t.titre}</h2>

      <div className="space-y-5">
        <div>
          <span className="witcher-stat-label mb-2 block">{t.position}</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t.position}>
            {POSITIONS.map(({ id }) => (
              <button
                key={id} type="button" role="radio" aria-checked={position === id}
                onClick={() => onChange({ positionBanniere: id })}
                className="px-3.5 py-2 rounded-card font-sans uppercase tracking-[0.16em] text-[10px] transition-colors"
                style={{
                  color: position === id ? '#D8B05A' : 'rgba(244,239,227,0.6)',
                  background: position === id ? 'rgba(216,176,90,0.14)' : 'transparent',
                  border: `1px solid ${position === id ? 'rgba(216,176,90,0.5)' : 'rgba(244,239,227,0.18)'}`,
                }}
              >
                {t.positions[id]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 pt-1">
          <span className="font-sans text-sm text-ivory-soft">{t.parallaxe}</span>
          <Interrupteur actif={parallaxe} onClick={() => onChange({ parallaxe: !parallaxe })} label={t.parallaxe} />
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="font-sans text-sm text-ivory-soft inline-flex items-center gap-1.5">
            <Flame size={13} className="text-brass" /> {t.animationsFond}
          </span>
          <Interrupteur actif={animationsFond} onClick={() => onChange({ animationsFond: !animationsFond })} label={t.animationsFond} />
        </div>
      </div>
    </section>
  );
};

const FR = {
  eyebrow: 'Réglages', titre: 'Réglages de mon profil',
  position: 'Position de la bannière',
  positions: { haut: 'Au-dessus', bas: 'Sous le nom', droite: 'À droite' } as Record<PositionBanniere, string>,
  parallaxe: 'La bannière glisse au défilement',
  animationsFond: 'Braises et flammes du site',
};
const EN: typeof FR = {
  eyebrow: 'Settings', titre: 'My profile settings',
  position: 'Banner position',
  positions: { haut: 'Above', bas: 'Below the name', droite: 'On the right' } as Record<PositionBanniere, string>,
  parallaxe: 'The banner drifts while scrolling',
  animationsFond: 'Embers and flames on the site',
};

export default ReglagesProfil;
