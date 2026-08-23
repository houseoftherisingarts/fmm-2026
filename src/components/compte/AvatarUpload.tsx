import React, { useCallback, useRef, useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, Trash2 } from 'lucide-react';
import { storage } from '../../firebase';
import { upsertUserProfile } from '../../firebase/applications';

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

const SIDE = 512;

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

const AvatarUpload: React.FC<{
  uid: string;
  email: string;
  displayName: string;
  lang: 'FR' | 'EN';
  avatarUrl?: string;
  onChange: (url: string | undefined) => void;
}> = ({ uid, email, displayName, lang, avatarUrl, onChange }) => {
  const fr = lang === 'FR';
  const t = fr ? FR : EN;
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  // Le médaillon est à l'échelle des orbes de section : la photo est le
  // premier objet de l'espace, comme sur n'importe quel réseau social
  // (Alex, 2026-08-23). Les commandes passent en pastille sur le bord,
  // au lieu d'une colonne de texte à côté.
  return (
    <div className="flex flex-col items-center gap-4 shrink-0">
      <div className="relative shrink-0">
        <label
          htmlFor="avatar-input"
          title={avatarUrl ? t.change : t.add}
          className="relative block w-60 h-60 md:w-80 md:h-80 rounded-full overflow-hidden cursor-pointer"
          style={{
            border: '1px solid rgba(216, 176, 90, 0.75)',
            boxShadow: '0 0 32px -6px rgba(216,176,90,0.55), 0 10px 26px -10px rgba(0,0,0,0.85)',
            background: 'radial-gradient(circle at 35% 28%, rgba(216,176,90,0.20), rgba(26,5,11,0.9))',
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName || email}
              className="absolute inset-0 w-full h-full object-cover"
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

        {/* Anneau de laiton extérieur, comme les médaillons du site */}
        <span
          aria-hidden
          className="absolute -inset-2 rounded-full pointer-events-none"
          style={{ border: '1px solid rgba(216, 176, 90, 0.28)' }}
        />

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

      {avatarUrl ? (
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
  errType:   'Choisissez une image.',
  errBackend:'Le stockage est indisponible pour le moment.',
};

const EN: typeof FR = {
  label:  'Profile photo',
  add:    'Add a photo',
  change: 'Change photo',
  remove: 'Remove',
  hint:   'Add your portrait, the cropping happens on its own.',
  errType:   'Please choose an image.',
  errBackend:'Storage is unavailable right now.',
};

export default AvatarUpload;
