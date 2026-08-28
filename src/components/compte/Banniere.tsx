import React, { useRef, useState } from 'react';
import { useBadges } from '../../contexts/BadgesContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { Camera, Loader2, Move, Crop, Check, X } from 'lucide-react';
import { storage } from '../../firebase';
import { publierFiche, type RoleMembre, type PrefsMembre } from '../../firebase/ordre';
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
//
// Alex, 2026-08-28 : trois ajouts. Le cadrage (glisser la photo dans
// le cadre, en pourcentage), la parallaxe douce au défilement, et pour
// les VIP (don sans-publicité) une bannière en GIF ou en vidéo courte.

export type Metal = 'bronze' | 'argent' | 'or';
export const BADGES_POUR_ARGENT = 8;
const ROLES_ADMIN: RoleMembre[] = ['administrateur', 'tresorier', 'secretaire'];
const GIF_MAX   = 8 * 1024 * 1024;
const VIDEO_MAX = 15 * 1024 * 1024;

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

const cadrageOrigine = (): { x: number; y: number } => ({ x: 50, y: 50 });
const estVideoUrl = (url?: string) => {
  if (!url) return false;
  const chemin = url.split('?')[0];
  return chemin.endsWith('.mp4') || chemin.endsWith('.webm');
};

const Banniere: React.FC<{
  uid: string;
  url?: string;
  metal: Metal;
  lang: 'FR' | 'EN';
  /** Le propriétaire peut changer la photo. */
  editable?: boolean;
  onChange?: (url: string) => void;
  /** Un don sans-publicité débloque le GIF et la vidéo. */
  vip?: boolean;
  /** 'horizontale' (par défaut) ou 'verticale' (position « droite »). */
  variante?: 'horizontale' | 'verticale';
  prefs?: PrefsMembre;
  onPrefsChange?: (patch: Partial<PrefsMembre>) => void;
  /** Saisie de la poignée « Déplacer » : le parent gère les zones de
   *  dépôt, qui débordent du cadre de la bannière. */
  onCommencerDeplacement?: () => void;
}> = ({ uid, url, metal, lang, editable, onChange, vip, variante = 'horizontale', prefs, onPrefsChange, onCommencerDeplacement }) => {
  const fr = lang === 'FR';
  const m = METAL[metal];
  const { gagnerBadge } = useBadges();
  const input = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const verticale = variante === 'verticale';

  // ── L'ajustement du cadrage : on glisse la photo dans le cadre ──
  const [ajustage, setAjustage] = useState(false);
  const [brouillon, setBrouillon] = useState(prefs?.cadrage ?? cadrageOrigine());
  const cadreRef = useRef<HTMLDivElement>(null);
  const glisse = useRef<{ x0: number; y0: number; bx0: number; by0: number } | null>(null);

  const ouvrirAjustage = () => { setBrouillon(prefs?.cadrage ?? cadrageOrigine()); setAjustage(true); };
  const annulerAjustage = () => setAjustage(false);
  const enregistrerAjustage = () => { onPrefsChange?.({ cadrage: brouillon }); setAjustage(false); };

  const surPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    glisse.current = { x0: e.clientX, y0: e.clientY, bx0: brouillon.x, by0: brouillon.y };
  };
  const surPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!glisse.current) return;
    const rect = cadreRef.current?.getBoundingClientRect();
    if (!rect) return;
    const g = glisse.current;
    const dx = ((e.clientX - g.x0) / rect.width) * 100;
    const dy = ((e.clientY - g.y0) / rect.height) * 100;
    setBrouillon({
      x: Math.min(100, Math.max(0, g.bx0 - dx)),
      y: Math.min(100, Math.max(0, g.by0 - dy)),
    });
  };
  const surPointerFin = () => { glisse.current = null; };

  // ── La parallaxe : la bannière glisse doucement au défilement ──
  const reduitMotion = useReducedMotion();
  const parallaxeActive = prefs?.parallaxe !== false && !reduitMotion;
  const { scrollYProgress } = useScroll({ target: cadreRef, offset: ['start end', 'end start'] });
  const decalage = useTransform(scrollYProgress, [0, 1], verticale ? [-26, 26] : [-14, 14]);

  const choisir = async (file: File | undefined) => {
    if (!file || !storage) return;
    setEnvoi(true); setErreur(null);
    try {
      const estGif = file.type === 'image/gif';
      const estVideo = file.type === 'video/mp4' || file.type === 'video/webm';
      if ((estGif || estVideo) && !vip) {
        setErreur(fr ? 'Réservé aux membres VIP.' : 'VIP members only.');
        return;
      }
      let blob: Blob = file; let contentType = file.type; let chemin: string;
      if (estGif) {
        if (file.size > GIF_MAX) { setErreur(fr ? 'Le GIF dépasse 8 Mo.' : 'The GIF is over 8 MB.'); return; }
        chemin = `users/${uid}/banniere.gif`;
      } else if (estVideo) {
        if (file.size > VIDEO_MAX) { setErreur(fr ? 'La vidéo dépasse 15 Mo.' : 'The video is over 15 MB.'); return; }
        chemin = `users/${uid}/banniere.${file.type === 'video/webm' ? 'webm' : 'mp4'}`;
      } else {
        const converti = await versWebp(file, 1800, 0.85);
        blob = converti.blob; contentType = 'image/webp';
        chemin = `users/${uid}/banniere.webp`;
      }
      const r = ref(storage, chemin);
      await uploadBytes(r, blob, { contentType });
      const lien = `${await getDownloadURL(r)}&v=${Date.now()}`;
      await publierFiche(uid, { banniereUrl: lien });
      gagnerBadge('banniere');
      onChange?.(lien);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally { setEnvoi(false); }
  };

  const cadrage = prefs?.cadrage ?? cadrageOrigine();
  const posCss = `${(ajustage ? brouillon : cadrage).x}% ${(ajustage ? brouillon : cadrage).y}%`;
  const video = estVideoUrl(url);

  return (
    <div className={verticale ? 'relative shrink-0 w-full md:w-[220px] h-64 md:h-full' : 'relative w-full my-8 md:my-10 mx-auto max-w-4xl'}>
      {/* Un cadre mince, comme l'anneau du médaillon, dans le métal du rang
          (Alex, 2026-08-28 : « beaucoup plus subtil et mince »). */}
      <div
        className={`relative rounded-[16px] p-[3px] ${verticale ? 'h-full' : ''}`}
        style={{
          background: `linear-gradient(135deg, ${m.bandeClair} 0%, ${m.bande} 40%, ${m.bandeSombre} 70%, ${m.bandeClair} 100%)`,
          boxShadow: `0 0 0 1px ${m.bois}, 0 0 28px -6px ${m.bande}80, 0 20px 50px -30px rgba(0,0,0,0.9)`,
        }}
      >
        <div
          ref={cadreRef}
          className={`relative overflow-hidden rounded-[13px] ${verticale ? 'h-full aspect-[3/5]' : 'aspect-[16/5] md:aspect-[16/4]'}`}
          style={{ background: url ? undefined : `url(/textures/black-linen.png), radial-gradient(120% 90% at 50% 100%, ${m.bandeSombre}55, rgba(10,2,7,0.95))` }}
          onPointerDown={ajustage ? surPointerDown : undefined}
          onPointerMove={ajustage ? surPointerMove : undefined}
          onPointerUp={ajustage ? surPointerFin : undefined}
          onPointerCancel={ajustage ? surPointerFin : undefined}
        >
          {url ? (
            <motion.div className="absolute inset-0" style={{ y: parallaxeActive && !ajustage ? decalage : 0 }}>
              {video ? (
                <video src={url} autoPlay muted loop playsInline
                       className={`absolute inset-0 w-full h-full object-cover select-none ${parallaxeActive ? 'scale-110' : ''}`}
                       style={{ objectPosition: posCss }} />
              ) : (
                <img src={url} alt="" draggable={false}
                     className={`absolute inset-0 w-full h-full object-cover select-none ${parallaxeActive ? 'scale-110' : ''} ${ajustage ? 'cursor-grab active:cursor-grabbing' : ''}`}
                     style={{ objectPosition: posCss }} />
              )}
            </motion.div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <img src="/site/montpellier-armoirie.png" alt="" className="h-[70%] object-contain opacity-30" />
            </div>
          )}
          {/* L'écho fin à l'intérieur, comme sur la charte. */}
          {!verticale && (
            <div className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
                 style={{ background: 'linear-gradient(to top, rgba(10,2,7,0.55), transparent)' }} />
          )}

          {editable && !ajustage && (
            <div className="absolute bottom-3 right-3 flex flex-wrap items-center justify-end gap-2 max-w-[calc(100%-1.5rem)]">
              {onCommencerDeplacement && (
                <button
                  type="button"
                  onPointerDown={(e) => { e.preventDefault(); onCommencerDeplacement(); }}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full font-sans uppercase tracking-[0.18em] text-[10px] transition-colors"
                  style={{ background: 'rgba(10,2,7,0.75)', border: '1px solid rgba(244,239,227,0.25)', color: 'rgba(244,239,227,0.9)' }}
                >
                  <Move size={12} /> {fr ? 'Déplacer' : 'Move'}
                </button>
              )}
              {url && (
                <button
                  type="button"
                  onClick={ouvrirAjustage}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full font-sans uppercase tracking-[0.18em] text-[10px] transition-colors"
                  style={{ background: 'rgba(10,2,7,0.75)', border: '1px solid rgba(244,239,227,0.25)', color: 'rgba(244,239,227,0.9)' }}
                >
                  <Crop size={12} /> {fr ? 'Ajuster' : 'Adjust'}
                </button>
              )}
              <button
                type="button"
                onClick={() => input.current?.click()}
                disabled={envoi}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full font-sans uppercase tracking-[0.18em] text-[10px] transition-colors"
                style={{ background: 'rgba(10,2,7,0.75)', border: '1px solid rgba(244,239,227,0.25)', color: 'rgba(244,239,227,0.9)' }}
              >
                {envoi ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                {url ? (fr ? 'Changer la bannière' : 'Change banner') : (fr ? 'Ajouter une bannière' : 'Add a banner')}
              </button>
            </div>
          )}

          {ajustage && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-full"
                 style={{ background: 'rgba(10,2,7,0.85)', border: '1px solid rgba(216,176,90,0.4)' }}>
              <span className="font-sans text-[10px] uppercase tracking-[0.16em] mr-1 hidden sm:inline" style={{ color: 'rgba(244,239,227,0.6)' }}>
                {fr ? 'Glissez la photo' : 'Drag the photo'}
              </span>
              <button type="button" onClick={annulerAjustage}
                      className="w-8 h-8 rounded-full flex items-center justify-center" style={{ color: 'rgba(244,239,227,0.75)' }}>
                <X size={14} />
              </button>
              <button type="button" onClick={enregistrerAjustage}
                      className="w-8 h-8 rounded-full flex items-center justify-center" style={{ color: '#D8B05A' }}>
                <Check size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
      {editable && (
        <input ref={input} type="file"
               accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif,video/mp4,video/webm"
               className="sr-only"
               onChange={(e) => { void choisir(e.target.files?.[0]); e.target.value = ''; }} />
      )}
      {erreur && <p className="mt-4 font-sans text-xs" style={{ color: '#E08A6E' }}>{erreur}</p>}
    </div>
  );
};

export default Banniere;
