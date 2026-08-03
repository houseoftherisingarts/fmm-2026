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

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0">
        <div
          className="relative w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden"
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
              className="absolute inset-0 flex items-center justify-center font-display text-3xl"
              style={{ color: 'rgba(216,176,90,0.9)' }}
            >
              {initials}
            </span>
          )}
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(10,2,7,0.7)' }}>
              <span className="w-6 h-6 rounded-full border-2 border-t-transparent border-amber-300 animate-spin" />
            </span>
          )}
        </div>

        {/* Anneau de laiton extérieur, comme les médaillons du site */}
        <span
          aria-hidden
          className="absolute -inset-1.5 rounded-full pointer-events-none"
          style={{ border: '1px solid rgba(216, 176, 90, 0.28)' }}
        />
      </div>

      <div className="min-w-0">
        <p className="witcher-stat-label mb-2">{t.label}</p>
        <input
          ref={inputRef}
          id="avatar-input"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => accept(e.target.files?.[0])}
        />
        <div className="flex items-center gap-3 flex-wrap">
          <label htmlFor="avatar-input" className="witcher-prompt cursor-pointer inline-flex">
            <span className="witcher-prompt-glyph"><span>A</span></span>
            {avatarUrl ? t.change : t.add}
            <Camera size={13} />
          </label>
          {avatarUrl && (
            <button
              type="button"
              onClick={remove}
              className="inline-flex items-center gap-1.5 font-sans uppercase tracking-[0.2em] text-[10px] opacity-60 hover:opacity-100 transition"
              style={{ color: '#E08A6E' }}
            >
              <Trash2 size={12} /> {t.remove}
            </button>
          )}
        </div>
        <p className="font-sans text-xs mt-3" style={{ color: 'rgba(244,239,227,0.4)', fontWeight: 300 }}>
          {t.hint}
        </p>
        {err && <p className="font-sans text-sm mt-2" style={{ color: '#E08A6E' }}>{err}</p>}
      </div>
    </div>
  );
};

const FR = {
  label:  'Photo de profil',
  add:    'Ajouter une photo',
  change: 'Changer la photo',
  remove: 'Retirer',
  hint:   'Recadrée en cercle automatiquement. Prenez n’importe quelle photo, nous nous occupons du reste.',
  errType:   'Choisissez une image.',
  errBackend:'Le stockage est indisponible pour le moment.',
};

const EN: typeof FR = {
  label:  'Profile photo',
  add:    'Add a photo',
  change: 'Change photo',
  remove: 'Remove',
  hint:   'Cropped to a circle automatically. Pick any photo, we handle the rest.',
  errType:   'Please choose an image.',
  errBackend:'Storage is unavailable right now.',
};

export default AvatarUpload;
