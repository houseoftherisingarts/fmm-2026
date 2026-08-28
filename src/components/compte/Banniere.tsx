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

// Les couleurs suivent le cadre de la charte (`.charter-frame` et
// `.charter-rivet` dans index.css) : bande de métal épaisse entre deux
// traits de bois sombre, écho fin à l'intérieur, rivets bombés aux coins.
const METAL: Record<Metal, { bande: string; bandeClair: string; bandeSombre: string; echo: string; bois: string; rivet: string; nomFR: string; nomEN: string }> = {
  bronze: { bande: '#9C6A32', bandeClair: '#D9A066', bandeSombre: '#5A3714', echo: 'rgba(160,110,50,0.55)', bois: 'rgba(40,20,6,0.9)',
            rivet: 'radial-gradient(circle at 30% 30%, #F1C99A 0%, #B7783C 35%, #6B4218 75%, #33200A 100%)', nomFR: 'Bronze', nomEN: 'Bronze' },
  argent: { bande: '#B9BFC8', bandeClair: '#EEF1F5', bandeSombre: '#6E757F', echo: 'rgba(200,205,215,0.55)', bois: 'rgba(30,30,36,0.9)',
            rivet: 'radial-gradient(circle at 30% 30%, #FFFFFF 0%, #C9CFD8 35%, #7A828C 75%, #3C4149 100%)', nomFR: 'Argent', nomEN: 'Silver' },
  or:     { bande: 'var(--color-brass)', bandeClair: '#F4E5B6', bandeSombre: '#8C6A1F', echo: 'rgba(140,106,31,0.55)', bois: 'rgba(60,30,8,0.85)',
            rivet: 'radial-gradient(circle at 30% 30%, #F4E5B6 0%, #C9A85A 35%, #8C6A1F 75%, #4A3812 100%)', nomFR: 'Or', nomEN: 'Gold' },
};

const Rivet: React.FC<{ m: typeof METAL.or; className: string }> = ({ m, className }) => (
  <span aria-hidden className={`absolute w-4 h-4 rounded-full ${className}`}
        style={{ background: m.rivet, boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,240,200,0.7), 0 1px 3px rgba(0,0,0,0.6)' }} />
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
    <div className="relative my-8 md:my-10">
      {/* Le cadre de la charte, dans le métal du rang. */}
      <div
        className="relative rounded-[6px] mx-[8px] my-[8px]"
        style={{
          boxShadow: `0 0 0 1px ${m.bois}, 0 0 0 6px ${m.bande}, 0 0 0 7px ${m.bois}, 0 30px 90px -28px rgba(0,0,0,0.95)`,
          backgroundImage: `linear-gradient(180deg, ${m.bandeClair}22, transparent 30%, transparent 70%, ${m.bandeSombre}33)`,
        }}
      >
        <div className="relative overflow-hidden rounded-[4px] aspect-[16/5] md:aspect-[16/4]"
             style={{ background: url ? undefined : `url(/textures/black-linen.png), radial-gradient(120% 90% at 50% 100%, ${m.bandeSombre}55, rgba(10,2,7,0.95))` }}>
          {url ? (
            <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <img src="/site/montpellier-armoirie.png" alt="" className="h-[70%] object-contain opacity-30" />
            </div>
          )}
          {/* L'écho fin à l'intérieur, comme sur la charte. */}
          <div aria-hidden className="absolute inset-[10px] pointer-events-none rounded-[2px]" style={{ border: `1px solid ${m.echo}` }} />
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
        <Rivet m={m} className="-left-[11px] -top-[11px]" />
        <Rivet m={m} className="-right-[11px] -top-[11px]" />
        <Rivet m={m} className="-left-[11px] -bottom-[11px]" />
        <Rivet m={m} className="-right-[11px] -bottom-[11px]" />
      </div>
      {editable && (
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only"
               onChange={(e) => { void choisir(e.target.files?.[0]); e.target.value = ''; }} />
      )}
      {erreur && <p className="mt-4 font-sans text-xs" style={{ color: '#E08A6E' }}>{erreur}</p>}
    </div>
  );
};

export default Banniere;
