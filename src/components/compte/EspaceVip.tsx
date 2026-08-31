import React from 'react';
import { Crown, Check } from 'lucide-react';
import type { PrefsMembre, SkinMembre } from '../../firebase/ordre';
import { IMAGE_SKIN } from '../boutique/BoutiqueMontpellois';
import InterrupteurAnimationsFond from './InterrupteurAnimationsFond';

// ─── L'espace VIP ──────────────────────────────────────────────────
// Alex, 2026-08-28 : réservé aux comptes « sans publicité à vie »
// (users.sansPub). Le choix du skin s'applique tout de suite : le
// même snapshot Firestore que lit usePrefsFond.ts reflète l'écriture
// locale avant même la confirmation du serveur.

// Les trois peaux, chacune avec sa photo (public/skins, Alex, 2026-08-31).
const SKINS: SkinMembre[] = ['rouge', 'bleu', 'dore'];

const EspaceVip: React.FC<{
  vip: boolean;
  prefs?: PrefsMembre;
  onChange: (patch: Partial<PrefsMembre>) => void;
  onDevenirVip: () => void;
  lang: 'FR' | 'EN';
}> = ({ vip, prefs, onChange, onDevenirVip, lang }) => {
  const fr = lang === 'FR';
  const t = fr ? FR : EN;

  if (!vip) {
    return (
      <section className="glass-light rounded-lg-card p-7 md:p-8 text-center">
        <Crown size={22} className="mx-auto mb-3" style={{ color: 'var(--sk-gilt)' }} />
        <h2 className="font-display title-medieval text-xl text-ivory mb-2">{t.devenez}</h2>
        <p className="font-editorial text-sm text-ivory-soft leading-relaxed mb-5">{t.pitch}</p>
        <button type="button" onClick={onDevenirVip}
                className="inline-flex items-center gap-2 px-6 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
          <Crown size={14} /> {t.cta}
        </button>
      </section>
    );
  }

  const skin = prefs?.skin || 'rouge';

  return (
    <section className="glass-light rounded-lg-card p-7 md:p-8">
      <p className="font-editorial text-brass uppercase tracking-[0.3em] text-xs mb-2">
        <Crown size={12} className="inline mr-1.5 -mt-0.5" />{t.eyebrow}
      </p>
      <h2 className="font-display title-medieval text-xl md:text-2xl text-ivory mb-5">{t.titre}</h2>
      <p className="font-editorial text-sm text-ivory-soft leading-relaxed mb-5">{t.intro}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {SKINS.map((id) => {
          const actif = skin === id;
          return (
            <div key={id} className="rounded-card overflow-hidden flex flex-col"
                 style={{ border: `1.5px solid ${actif ? 'var(--sk-gilt)' : 'rgba(var(--sk-parchment-rgb),0.18)'}`, background: 'rgba(var(--sk-ink-rgb),0.5)' }}>
              <button type="button" onClick={() => onChange({ skin: id })} aria-pressed={actif} className="block w-full text-left">
                <img src={IMAGE_SKIN[id]} alt="" aria-hidden loading="lazy"
                     className="block w-full aspect-square object-cover rounded-md transition-opacity"
                     style={{ opacity: actif ? 1 : 0.82 }} />
                <span className="flex items-center justify-center gap-1 px-2 py-2 font-sans uppercase tracking-[0.12em] text-[10px] leading-tight text-center"
                      style={{ color: actif ? 'var(--sk-gilt)' : 'rgba(var(--sk-parchment-rgb),0.7)' }}>
                  {actif && <Check size={11} className="shrink-0" />} {t.skins[id]}
                </span>
              </button>
              <InterrupteurAnimationsFond lang={lang} className="px-2.5 pb-2.5 pt-2" />
            </div>
          );
        })}
      </div>
    </section>
  );
};

const FR = {
  devenez: 'Devenez VIP', pitch: 'Un don unique pour toujours enlever la publicité, et débloquer une bannière animée et le choix du skin du site.',
  cta: 'Retirer les publicités',
  eyebrow: 'Espace VIP', titre: 'Le skin du site',
  intro: 'Choisissez la teinte du festival, rien que pour votre compte. Le changement s’applique tout de suite, sur toutes les pages.',
  skins: { rouge: 'Feu de la caravane', bleu: 'Hiver argenté', dore: 'Bière et cervoise', vert: 'Vert de forêt' } as Record<SkinMembre, string>,
};
const EN: typeof FR = {
  devenez: 'Become VIP', pitch: 'A one-time gift to remove ads forever, and unlock an animated banner plus your own site skin.',
  cta: 'Remove the ads',
  eyebrow: 'VIP space', titre: 'The site skin',
  intro: 'Choose the festival’s hue, just for your account. The change applies right away, on every page.',
  skins: { rouge: 'Caravan fire', bleu: 'Silver winter', dore: 'Beer and ale', vert: 'Forest green' } as Record<SkinMembre, string>,
};

export default EspaceVip;
