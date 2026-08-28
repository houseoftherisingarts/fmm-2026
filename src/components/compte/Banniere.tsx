import React, { useRef, useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, Loader2 } from 'lucide-react';
import { storage } from '../../firebase';
import { publierFiche, type RoleMembre } from '../../firebase/ordre';
import { versWebp } from '../../firebase/photosPubliques';

// ─── La bannière du profil ───────────────────────────────────────────
// Alex, 2026-08-27 : une photo de bannière, « plus jolie que sur
// Facebook » : un cadre de métal autour, et le métal dit le rang.
//   bronze : tout le monde en commence là
//   argent : un certain nombre de badges, ou une fonction dans
//            l'organisation (bénévole, sécurité, marchand, musicien…)
//   or     : l'administration seulement (administrateur, trésorier,
//            secrétaire, et l'allowlist admin pour soi-même)
// Le cadre est dessiné en CSS et en SVG : dégradés en couches pour le
// métal brossé, biseau intérieur, quatre coins ouvragés.

export type Metal = 'bronze' | 'argent' | 'or';
export const BADGES_POUR_ARGENT = 8;
const ROLES_ADMIN: RoleMembre[] = ['administrateur', 'tresorier', 'secretaire'];

export function metalDe(opts: { roles?: RoleMembre[]; nbBadges: number; estAdmin?: boolean }): Metal {
  const roles = opts.roles || [];
  if (opts.estAdmin || roles.some((r) => ROLES_ADMIN.includes(r))) return 'or';
  if (roles.length > 0 || opts.nbBadges >= BADGES_POUR_ARGENT) return 'argent';
  return 'bronze';
}

const METAL: Record<Metal, { clair: string; moyen: string; sombre: string; reflet: string; nomFR: string; nomEN: string }> = {
  bronze: { clair: '#d9a066', moyen: '#9c5f2c', sombre: '#4a2a12', reflet: '#f3c99a', nomFR: 'Bronze', nomEN: 'Bronze' },
  argent: { clair: '#eef0f3', moyen: '#a3a9b3', sombre: '#4f555e', reflet: '#ffffff', nomFR: 'Argent', nomEN: 'Silver' },
  or:     { clair: '#f6dc8a', moyen: '#c9962e', sombre: '#6b4a0f', reflet: '#fff4c2', nomFR: 'Or', nomEN: 'Gold' },
};

const Coin: React.FC<{ m: typeof METAL.bronze; className: string }> = ({ m, className }) => (
  <svg viewBox="0 0 64 64" className={`absolute w-10 h-10 md:w-14 md:h-14 ${className}`} aria-hidden>
    <defs>
      <linearGradient id={`g-${m.moyen.slice(1)}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={m.reflet} />
        <stop offset="0.45" stopColor={m.clair} />
        <stop offset="1" stopColor={m.sombre} />
      </linearGradient>
    </defs>
    <path d="M2 62 C2 30 30 2 62 2 L62 12 C36 12 12 36 12 62 Z" fill={`url(#g-${m.moyen.slice(1)})`} stroke={m.sombre} strokeWidth="1" />
    <path d="M10 54 C14 30 30 14 54 10" fill="none" stroke={m.reflet} strokeWidth="1.2" opacity="0.7" />
    <circle cx="18" cy="46" r="4.5" fill={m.clair} stroke={m.sombre} strokeWidth="1" />
    <circle cx="18" cy="46" r="1.6" fill={m.sombre} />
    <path d="M26 26 l6 -6 l6 6 l-6 6 z" fill={m.reflet} stroke={m.sombre} strokeWidth="0.8" />
  </svg>
);

const Banniere: React.FC<{
  uid: string;
  url?: string;
  metal: Metal;
  lang: 'FR' | 'EN';
  /** Le propriétaire peut changer la photo. */
  editable?: boolean;
  onChange?: (url: string) => void;
}> = ({ uid, url, metal, lang, editable, onChange }) => {
  const fr = lang === 'FR';
  const m = METAL[metal];
  const input = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const choisir = async (file: File | undefined) => {
    if (!file || !storage) return;
    setEnvoi(true); setErreur(null);
    try {
      const { blob } = await versWebp(file, 1800, 0.85);
      const r = ref(storage, `users/${uid}/banniere.webp`);
      await uploadBytes(r, blob, { contentType: 'image/webp' });
      const lien = `${await getDownloadURL(r)}&v=${Date.now()}`;
      await publierFiche(uid, { banniereUrl: lien });
      onChange?.(lien);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally { setEnvoi(false); }
  };

  return (
    <div className="relative mb-8 md:mb-10">
      {/* Le cadre : métal brossé en couches, biseau intérieur. */}
      <div
        className="relative rounded-[18px] p-[6px] md:p-[8px]"
        style={{
          background: `linear-gradient(135deg, ${m.reflet} 0%, ${m.clair} 18%, ${m.moyen} 42%, ${m.sombre} 60%, ${m.clair} 82%, ${m.reflet} 100%)`,
          boxShadow: `0 18px 50px rgba(0,0,0,0.55), 0 0 0 1px ${m.sombre}, inset 0 0 0 1px ${m.reflet}55`,
        }}
      >
        <div
          className="relative rounded-[13px] overflow-hidden aspect-[16/5] md:aspect-[16/4]"
          style={{
            boxShadow: `inset 0 0 0 2px ${m.sombre}, inset 0 0 28px rgba(0,0,0,0.6)`,
            background: url ? undefined : `url(/textures/black-linen.png), radial-gradient(120% 90% at 50% 100%, ${m.sombre}66, rgba(10,2,7,0.95))`,
          }}
        >
          {url ? (
            <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <img src="/site/montpellier-armoirie.png" alt="" className="h-[70%] object-contain opacity-30" />
            </div>
          )}
          {/* Un voile en bas pour que le nom respire quand la photo est claire. */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
               style={{ background: 'linear-gradient(to top, rgba(10,2,7,0.55), transparent)' }} />
          {editable && (
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={envoi}
              className="absolute bottom-3 right-3 inline-flex items-center gap-2 px-3.5 py-2 rounded-full font-sans uppercase tracking-[0.18em] text-[10px] transition-colors"
              style={{ background: 'rgba(10,2,7,0.75)', border: '1px solid rgba(244,239,227,0.25)', color: 'rgba(244,239,227,0.9)' }}
            >
              {envoi ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
              {url ? (fr ? 'Changer la bannière' : 'Change banner') : (fr ? 'Ajouter une bannière' : 'Add a banner')}
            </button>
          )}
        </div>
        <Coin m={m} className="left-0 top-0" />
        <Coin m={m} className="right-0 top-0 rotate-90" />
        <Coin m={m} className="right-0 bottom-0 rotate-180" />
        <Coin m={m} className="left-0 bottom-0 -rotate-90" />
      </div>
      {/* Le rang, en petit sous le cadre. */}
      <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full font-sans uppercase tracking-[0.22em] text-[9px]"
            style={{ background: 'rgba(10,2,7,0.9)', border: `1px solid ${m.moyen}`, color: m.clair }}>
        {fr ? `Cadre ${m.nomFR.toLowerCase()}` : `${m.nomEN} frame`}
      </span>
      {editable && (
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only"
               onChange={(e) => { void choisir(e.target.files?.[0]); e.target.value = ''; }} />
      )}
      {erreur && <p className="mt-4 font-sans text-xs" style={{ color: '#E08A6E' }}>{erreur}</p>}
    </div>
  );
};

export default Banniere;
