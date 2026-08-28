import React from 'react';
import { Crown, Check } from 'lucide-react';
import type { PrefsMembre, SkinMembre } from '../../firebase/ordre';

// ─── L'espace VIP ──────────────────────────────────────────────────
// Alex, 2026-08-28 : réservé aux comptes « sans publicité à vie »
// (users.sansPub). Le choix du skin s'applique tout de suite : le
// même snapshot Firestore que lit usePrefsFond.ts reflète l'écriture
// locale avant même la confirmation du serveur.

const SKINS: { id: SkinMembre; swatch: string }[] = [
  { id: 'rouge', swatch: 'linear-gradient(135deg, #2B0A12, #E8B14A)' },
  { id: 'bleu',  swatch: 'linear-gradient(135deg, #0B1A2E, #9FC4E8)' },
  { id: 'dore',  swatch: 'linear-gradient(135deg, #3A2412, #F2D08A)' },
];

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
        <Crown size={22} className="mx-auto mb-3" style={{ color: '#D8B05A' }} />
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
      <div className="flex flex-wrap gap-3">
        {SKINS.map((s) => {
          const actif = skin === s.id;
          return (
            <button key={s.id} type="button" onClick={() => onChange({ skin: s.id })}
                    aria-pressed={actif}
                    className="w-24 rounded-card overflow-hidden transition"
                    style={{ border: `2px solid ${actif ? '#D8B05A' : 'rgba(244,239,227,0.18)'}` }}>
              <span className="block h-14 w-full" style={{ background: s.swatch }} />
              <span className="flex items-center justify-center gap-1 py-2 font-sans uppercase tracking-[0.16em] text-[10px]"
                    style={{ color: actif ? '#D8B05A' : 'rgba(244,239,227,0.7)', background: 'rgba(10,2,7,0.5)' }}>
                {actif && <Check size={11} />} {t.skins[s.id]}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

const FR = {
  devenez: 'Devenez VIP', pitch: 'Un don unique pour toujours enlever la publicité, et débloquer une bannière animée et le choix du skin du site.',
  cta: 'Voir le don sans publicité',
  eyebrow: 'Espace VIP', titre: 'Le skin du site',
  intro: 'Choisissez la teinte du festival, rien que pour votre compte. Le changement s’applique tout de suite, sur toutes les pages.',
  skins: { rouge: 'Rouge', bleu: 'Bleu', dore: 'Doré' } as Record<SkinMembre, string>,
};
const EN: typeof FR = {
  devenez: 'Become VIP', pitch: 'A one-time gift to remove ads forever, and unlock an animated banner plus your own site skin.',
  cta: 'See the ad-free gift',
  eyebrow: 'VIP space', titre: 'The site skin',
  intro: 'Choose the festival’s hue, just for your account. The change applies right away, on every page.',
  skins: { rouge: 'Red', bleu: 'Blue', dore: 'Gold' } as Record<SkinMembre, string>,
};

export default EspaceVip;
