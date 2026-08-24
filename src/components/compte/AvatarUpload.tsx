import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, Trash2, Crop, Check, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { storage } from '../../firebase';
import { upsertUserProfile } from '../../firebase/applications';
import { lireFiche, publierFiche, type Membre } from '../../firebase/ordre';

// ─── Photo de profil ────────────────────────────────────────────────
// Cercle bordé de laiton, dans la grammaire du festival. Le fichier va
// sous `users/{uid}/` (règle de stockage déjà en place, lecture publique
// puisqu'un avatar est destiné à être vu des autres bénévoles), et
// l'URL est rangée dans `avatarUrl` du profil Firestore, un champ qui
// existait déjà mais que rien ne remplissait.
//
// L'image est redimensionnée et recadrée en carré DANS LE NAVIGATEUR
// avant l'envoi : une photo de téléphone fait volontiers 5 Mo, on n'a
// besoin que de 512 px. Ça épargne le stockage et le forfait de données
// du visiteur.
//
// Le cadrage fin (la position et le zoom à l'intérieur du médaillon) se
// règle à part, après l'envoi : la personne glisse sa photo et zoome
// dans le cercle. Le réglage se garde dans /membres/{uid}.cadrage, en
// fractions relatives du médaillon, pour tenir à toute taille d'affichage.
// Le composant lit et écrit cette fiche lui-même : la page qui l'appelle
// ne lui passe que l'URL de la photo, jamais le document au complet.

const SIDE = 512;
const ZOOM_MAX = 3;
const PAS_DEPLACEMENT = 0.04;
const PAS_ZOOM = 0.1;

type Cadrage = NonNullable<Membre['cadrage']>;
const CADRAGE_ORIGINE: Cadrage = { x: 0, y: 0, zoom: 1 };

/** Ramène un cadrage dans les bornes qui gardent la photo pleine : au
 *  zoom donné, la marge de déplacement disponible est (zoom - 1) / 2
 *  de chaque côté. Au-delà, un bout du cercle se viderait. */
function borner(zoom: number, x: number, y: number): Cadrage {
  const z = Math.min(ZOOM_MAX, Math.max(1, zoom));
  const marge = (z - 1) / 2;
  return { zoom: z, x: Math.min(marge, Math.max(-marge, x)), y: Math.min(marge, Math.max(-marge, y)) };
}

const transformCadrage = (c: Cadrage) => `translate(${c.x * 100}%, ${c.y * 100}%) scale(${c.zoom})`;

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

async function toSquareWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width  - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = SIDE; canvas.height = SIDE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas indisponible');
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, SIDE, SIDE);
  bitmap.close?.();
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('encodage impossible'))),
      'image/webp',
      0.86,
    );
  });
}

// Le médaillon, à l'identique dans les deux modes : c'est la même photo
// aux mêmes dimensions sur l'espace de la personne et sur sa fiche
// publique (Alex, 2026-08-23).
const MEDAILLON = 'relative block w-60 h-60 md:w-80 md:h-80 rounded-full overflow-hidden';
const MEDAILLON_STYLE: React.CSSProperties = {
  border: '1px solid rgba(216, 176, 90, 0.75)',
  boxShadow: '0 0 32px -6px rgba(216,176,90,0.55), 0 10px 26px -10px rgba(0,0,0,0.85)',
  background: 'radial-gradient(circle at 35% 28%, rgba(216,176,90,0.20), rgba(26,5,11,0.9))',
};

const AvatarUpload: React.FC<{
  uid: string;
  email: string;
  displayName: string;
  lang: 'FR' | 'EN';
  avatarUrl?: string;
  onChange: (url: string | undefined) => void;
  /** Sur la fiche de quelqu'un d'autre : la photo se regarde, rien de plus. */
  lecture?: boolean;
}> = ({ uid, email, displayName, lang, avatarUrl, onChange, lecture = false }) => {
  const fr = lang === 'FR';
  const t = fr ? FR : EN;
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Le cadrage sauvegardé. Lu à part du reste de la fiche : le mode
  // privé et le mode public passent tous deux ici sans se soucier du
  // cadrage, le composant va le chercher lui-même dans /membres/{uid}.
  const [cadrage, setCadrage] = useState<Cadrage | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [brouillon, setBrouillon] = useState<Cadrage>(CADRAGE_ORIGINE);

  useEffect(() => {
    let vivant = true;
    lireFiche(uid).then((m) => { if (vivant) setCadrage(m?.cadrage); }).catch(() => {});
    return () => { vivant = false; };
  }, [uid]);

  const cercleRef = useRef<HTMLDivElement | null>(null);
  const pointeurs = useRef<Map<number, { x: number; y: number }>>(new Map());
  const glisse = useRef<{ x0: number; y0: number; bx0: number; by0: number } | null>(null);
  const pince  = useRef<{ d0: number; z0: number } | null>(null);

  // Le clavier fonctionne dès l'ouverture du réglage, sans exiger un
  // Tab de plus.
  useEffect(() => { if (editing) cercleRef.current?.focus(); }, [editing]);

  // La molette doit pouvoir bloquer le défilement de la page pendant
  // qu'elle zoome la photo. React rend son onWheel passif par défaut,
  // donc ce blocage se pose ici, en écouteur natif, plutôt que dans le
  // JSX où preventDefault() serait ignoré.
  useEffect(() => {
    if (!editing) return;
    const el = cercleRef.current;
    if (!el) return;
    const surMolette = (e: WheelEvent) => {
      e.preventDefault();
      const pas = e.deltaY > 0 ? -0.08 : 0.08;
      setBrouillon((b0) => borner(b0.zoom + pas, b0.x, b0.y));
    };
    el.addEventListener('wheel', surMolette, { passive: false });
    return () => el.removeEventListener('wheel', surMolette);
  }, [editing]);

  const initials = (displayName || email || '?')
    .trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase() || '?';

  const accept = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setErr(null);
    if (!file.type.startsWith('image/')) { setErr(t.errType); return; }
    if (!storage) { setErr(t.errBackend); return; }
    setBusy(true);
    try {
      const blob = await toSquareWebp(file);
      const r = ref(storage, `users/${uid}/avatar.webp`);
      await uploadBytes(r, blob, { contentType: 'image/webp' });
      // `?v=` force le navigateur à recharger : le chemin ne change pas
      // d'un envoi à l'autre, donc sans ça l'ancienne photo resterait.
      const url = `${await getDownloadURL(r)}&v=${Date.now()}`;
      await upsertUserProfile({ uid, email, displayName, avatarUrl: url });
      // Une nouvelle photo efface l'ancien cadrage : un zoom pensé pour
      // le portrait précédent n'a aucune raison de tenir sur celui-ci.
      setCadrage(CADRAGE_ORIGINE);
      void publierFiche(uid, { cadrage: CADRAGE_ORIGINE }).catch(() => {});
      onChange(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [uid, email, displayName, onChange, t]);

  const remove = async () => {
    setBusy(true); setErr(null);
    try {
      await upsertUserProfile({ uid, email, displayName, avatarUrl: '' });
      onChange(undefined);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  const ouvrirCadrage = () => { setBrouillon(cadrage ?? CADRAGE_ORIGINE); setEditing(true); };
  const revenirOrigine = () => { setBrouillon(cadrage ?? CADRAGE_ORIGINE); setEditing(false); };

  const enregistrerCadrage = async () => {
    setBusy(true); setErr(null);
    try {
      await publierFiche(uid, { cadrage: brouillon });
      setCadrage(brouillon);
      setEditing(false);
    } catch {
      setErr(t.errCadrage);
    } finally { setBusy(false); }
  };

  // ── Le geste : glisser pour déplacer, pincer à deux doigts pour
  //    zoomer. Un seul jeu d'écouteurs sert la souris et le tactile,
  //    les événements de pointeur unifient les deux (Alex, 2026-08-23).
  const surPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointeurs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointeurs.current.size === 1) {
      glisse.current = { x0: e.clientX, y0: e.clientY, bx0: brouillon.x, by0: brouillon.y };
      pince.current = null;
    } else if (pointeurs.current.size === 2) {
      const [a, b] = [...pointeurs.current.values()];
      pince.current = { d0: distance(a, b) || 1, z0: brouillon.zoom };
      glisse.current = null;
    }
  };

  const surPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointeurs.current.has(e.pointerId)) return;
    pointeurs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const taille = cercleRef.current?.clientWidth || 1;

    if (pointeurs.current.size === 2 && pince.current) {
      const [a, b] = [...pointeurs.current.values()];
      const ratio = distance(a, b) / pince.current.d0;
      const z0 = pince.current.z0;
      setBrouillon((b0) => borner(z0 * ratio, b0.x, b0.y));
      return;
    }
    if (pointeurs.current.size === 1 && glisse.current) {
      const g = glisse.current;
      const dx = (e.clientX - g.x0) / taille;
      const dy = (e.clientY - g.y0) / taille;
      setBrouillon((b0) => borner(b0.zoom, g.bx0 + dx, g.by0 + dy));
    }
  };

  const surPointerFin = (e: React.PointerEvent<HTMLDivElement>) => {
    pointeurs.current.delete(e.pointerId);
    if (pointeurs.current.size === 1) {
      const [restant] = [...pointeurs.current.values()];
      glisse.current = { x0: restant.x, y0: restant.y, bx0: brouillon.x, by0: brouillon.y };
      pince.current = null;
    } else {
      glisse.current = null;
      pince.current = null;
    }
  };

  const surClavier = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { e.preventDefault(); revenirOrigine(); return; }
    const deplacements: Record<string, [number, number]> = {
      ArrowLeft: [-PAS_DEPLACEMENT, 0], ArrowRight: [PAS_DEPLACEMENT, 0],
      ArrowUp: [0, -PAS_DEPLACEMENT], ArrowDown: [0, PAS_DEPLACEMENT],
    };
    const mouvement = deplacements[e.key];
    if (mouvement) {
      e.preventDefault();
      const [dx, dy] = mouvement;
      setBrouillon((b0) => borner(b0.zoom, b0.x + dx, b0.y + dy));
      return;
    }
    if (e.key === '+' || e.key === '=') { e.preventDefault(); setBrouillon((b0) => borner(b0.zoom + PAS_ZOOM, b0.x, b0.y)); return; }
    if (e.key === '-' || e.key === '_') { e.preventDefault(); setBrouillon((b0) => borner(b0.zoom - PAS_ZOOM, b0.x, b0.y)); }
  };

  // Le médaillon est à l'échelle des orbes de section : la photo est le
  // premier objet de l'espace, comme sur n'importe quel réseau social
  // (Alex, 2026-08-23). Les commandes passent en pastille sur le bord,
  // au lieu d'une colonne de texte à côté.
  if (lecture) {
    return (
      <div className="flex flex-col items-center gap-4 shrink-0">
        <div className="relative shrink-0">
          <div className={MEDAILLON} style={MEDAILLON_STYLE}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName}
                   className="absolute inset-0 w-full h-full object-cover"
                   style={{ transform: transformCadrage(cadrage ?? CADRAGE_ORIGINE) }}
                   decoding="async" loading="lazy" />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center font-display text-6xl md:text-7xl"
                    style={{ color: 'rgba(216,176,90,0.9)' }}>
                {initials}
              </span>
            )}
          </div>
          <span aria-hidden className="absolute -inset-2 rounded-full pointer-events-none"
                style={{ border: '1px solid rgba(216, 176, 90, 0.28)' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 shrink-0">
      <div className="relative shrink-0">
        {editing ? (
          <div
            ref={cercleRef}
            role="group"
            aria-label={t.cadrer}
            aria-describedby="cadrage-instructions"
            tabIndex={0}
            className={`${MEDAILLON} cursor-grab active:cursor-grabbing outline-none focus-visible:ring-2 focus-visible:ring-[#D8B05A] focus-visible:ring-offset-2 focus-visible:ring-offset-black`}
            style={{ ...MEDAILLON_STYLE, touchAction: 'none' }}
            onPointerDown={surPointerDown}
            onPointerMove={surPointerMove}
            onPointerUp={surPointerFin}
            onPointerCancel={surPointerFin}
            onKeyDown={surClavier}
          >
            {avatarUrl && (
              <img
                src={avatarUrl}
                alt={displayName || email}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                style={{ transform: transformCadrage(brouillon) }}
                draggable={false}
                decoding="async"
              />
            )}
            {busy && (
              <span className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ background: 'rgba(10,2,7,0.55)' }}>
                <span className="w-8 h-8 rounded-full border-2 border-t-transparent border-amber-300 animate-spin" />
              </span>
            )}
          </div>
        ) : (
          <label
            htmlFor="avatar-input"
            title={avatarUrl ? t.change : t.add}
            className={`${MEDAILLON} cursor-pointer`}
            style={MEDAILLON_STYLE}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName || email}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: transformCadrage(cadrage ?? CADRAGE_ORIGINE) }}
                decoding="async"
              />
            ) : (
              <span
                className="absolute inset-0 flex items-center justify-center font-display text-6xl md:text-7xl"
                style={{ color: 'rgba(216,176,90,0.9)' }}
              >
                {initials}
              </span>
            )}
            {busy && (
              <span className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(10,2,7,0.7)' }}>
                <span className="w-8 h-8 rounded-full border-2 border-t-transparent border-amber-300 animate-spin" />
              </span>
            )}
          </label>
        )}

        {/* Anneau de laiton extérieur, comme les médaillons du site */}
        <span
          aria-hidden
          className="absolute -inset-2 rounded-full pointer-events-none"
          style={{ border: '1px solid rgba(216, 176, 90, 0.28)' }}
        />

        {!editing && (
          <>
            {/* Pastille appareil photo, posée sur la jante du médaillon. */}
            <label
              htmlFor="avatar-input"
              aria-hidden
              className="absolute bottom-[7%] right-[7%] w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition hover:brightness-125"
              style={{
                background: 'rgba(10,2,7,0.85)',
                border: '1px solid rgba(216,176,90,0.7)',
                color: '#D8B05A',
                boxShadow: '0 8px 20px -10px rgba(0,0,0,0.95)',
              }}
            >
              <Camera size={18} />
            </label>

            {/* Pastille de cadrage, en miroir, seulement s'il y a une
                photo à recadrer. */}
            {avatarUrl && (
              <button
                type="button"
                onClick={ouvrirCadrage}
                title={t.cadrer}
                aria-label={t.cadrer}
                className="absolute bottom-[7%] left-[7%] w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition hover:brightness-125"
                style={{
                  background: 'rgba(10,2,7,0.85)',
                  border: '1px solid rgba(216,176,90,0.7)',
                  color: '#D8B05A',
                  boxShadow: '0 8px 20px -10px rgba(0,0,0,0.95)',
                }}
              >
                <Crop size={16} />
              </button>
            )}
          </>
        )}

        <input
          ref={inputRef}
          id="avatar-input"
          type="file"
          accept="image/*"
          aria-label={avatarUrl ? t.change : t.add}
          className="sr-only"
          onChange={(e) => accept(e.target.files?.[0])}
        />
      </div>

      {editing ? (
        <div
          className="w-full max-w-[18rem] flex flex-col items-center gap-3 rounded-[15px] border backdrop-blur-md px-4 py-4"
          style={{ background: 'rgba(10,2,7,0.72)', borderColor: 'rgba(216,176,90,0.35)' }}
        >
          <p
            id="cadrage-instructions"
            className="font-sans text-[11px] text-center leading-relaxed"
            style={{ color: 'rgba(244,239,227,0.6)', fontWeight: 300 }}
          >
            {t.instructions}
          </p>

          <div className="w-full flex items-center gap-2">
            <ZoomOut size={14} aria-hidden style={{ color: 'rgba(216,176,90,0.7)' }} />
            <input
              type="range"
              min={1}
              max={ZOOM_MAX}
              step={0.01}
              value={brouillon.zoom}
              onChange={(e) => setBrouillon((b0) => borner(Number(e.target.value), b0.x, b0.y))}
              aria-label={t.zoomLabel}
              className="flex-1"
              style={{ accentColor: '#D8B05A' }}
            />
            <ZoomIn size={14} aria-hidden style={{ color: 'rgba(216,176,90,0.7)' }} />
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={revenirOrigine}
              title={t.revenirTitle}
              className="inline-flex items-center gap-1.5 font-sans uppercase tracking-[0.2em] text-[10px] opacity-70 hover:opacity-100 transition"
              style={{ color: 'rgba(244,239,227,0.8)' }}
            >
              <RotateCcw size={12} /> {t.revenir}
            </button>
            <button
              type="button"
              onClick={() => void enregistrerCadrage()}
              title={t.enregistrerCadrageTitle}
              disabled={busy}
              className="inline-flex items-center gap-1.5 font-sans uppercase tracking-[0.2em] text-[10px] transition disabled:opacity-40"
              style={{ color: '#D8B05A' }}
            >
              <Check size={12} /> {t.enregistrerCadrage}
            </button>
          </div>
        </div>
      ) : avatarUrl ? (
        <button
          type="button"
          onClick={remove}
          className="inline-flex items-center gap-1.5 font-sans uppercase tracking-[0.2em] text-[10px] opacity-60 hover:opacity-100 transition"
          style={{ color: '#E08A6E' }}
        >
          <Trash2 size={12} /> {t.remove}
        </button>
      ) : (
        <p className="font-sans text-xs text-center max-w-[15rem]" style={{ color: 'rgba(244,239,227,0.42)', fontWeight: 300 }}>
          {t.hint}
        </p>
      )}
      {err && <p className="font-sans text-sm text-center" style={{ color: '#E08A6E' }}>{err}</p>}
    </div>
  );
};

const FR = {
  label:  'Photo de profil',
  add:    'Ajouter une photo',
  change: 'Changer la photo',
  remove: 'Retirer',
  hint:   'Ajoutez votre portrait, le cadrage se fait tout seul.',
  cadrer: 'Ajuster le cadrage',
  instructions: 'Faites glisser la photo pour la repositionner et réglez le zoom avec la glissière, la molette ou les flèches du clavier.',
  zoomLabel: 'Zoom sur la photo',
  revenir: 'Cadrage d\'origine',
  revenirTitle: 'Revenir au cadrage d\'origine',
  enregistrerCadrage: 'Enregistrer',
  enregistrerCadrageTitle: 'Enregistrer ce cadrage',
  errType:   'Choisissez une image.',
  errBackend:'Le stockage est indisponible pour le moment.',
  errCadrage:"Le cadrage n'a pas pu être enregistré.",
};

const EN: typeof FR = {
  label:  'Profile photo',
  add:    'Add a photo',
  change: 'Change photo',
  remove: 'Remove',
  hint:   'Add your portrait, the cropping happens on its own.',
  cadrer: 'Adjust the crop',
  instructions: 'Drag the photo to reposition it and set the zoom with the slider, the wheel, or the keyboard arrows.',
  zoomLabel: 'Zoom on the photo',
  revenir: 'Original crop',
  revenirTitle: 'Revert to the original crop',
  enregistrerCadrage: 'Save',
  enregistrerCadrageTitle: 'Save this crop',
  errType:   'Please choose an image.',
  errBackend:'Storage is unavailable right now.',
  errCadrage:'This crop could not be saved.',
};

export default AvatarUpload;
