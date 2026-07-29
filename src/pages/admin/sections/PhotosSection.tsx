import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Upload, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Card, GhostButton } from '../primitives';
import {
  fetchArchivePhotos, setPhotoActive, savePhotoOrder, uploadArchivePhoto, photoThumb,
  PHOTOGRAPHER_META, PHOTOGRAPHER_ORDER,
  type ArchivePhoto, type PhotographerKey,
} from '../../../firebase/archivesPhotos';

// Section Photos — la galerie « Archives » de la page Histoire, pilotée
// par photographe : activer/désactiver, réordonner (glisser-déposer),
// téléverser. Pensée pour Léna : ce qu'elle voit ici est exactement ce
// que la page publique montre (les photos désactivées restent en
// réserve, rien n'est perdu).

interface Props { devBypass: boolean }

const PhotosSection: React.FC<Props> = ({ devBypass: _devBypass }) => {
  const [photos, setPhotos]   = useState<ArchivePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState<string | null>(null);
  const [tab, setTab]         = useState<PhotographerKey>('lena');
  const [busy, setBusy]       = useState<string | null>(null); // doc id en mutation
  const [uploading, setUploading] = useState(0);               // fichiers restants
  const [dragId, setDragId]   = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchArchivePhotos()
      .then((rows) => { setPhotos(rows); setErr(rows.length ? null : 'Collection vide — lancer le seed.'); })
      .catch((e) => { console.warn('[PhotosSection]', e); setErr('Impossible de charger les photos.'); })
      .finally(() => setLoading(false));
  }, []);

  const group = useMemo(
    () => photos.filter((p) => p.photographer === tab),
    [photos, tab],
  );
  const activeCount = group.filter((p) => p.active).length;

  const toggle = async (p: ArchivePhoto) => {
    setBusy(p.id);
    try {
      await setPhotoActive(p.id, !p.active);
      setPhotos((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: !p.active } : x)));
    } catch (e) {
      console.warn('[PhotosSection] toggle', e);
      setErr('Échec de la sauvegarde (droits admin requis).');
    } finally {
      setBusy(null);
    }
  };

  // Glisser-déposer : déposer sur une vignette insère la photo traînée
  // devant elle, puis l'ordre du groupe est persisté d'un coup.
  const dropOn = async (target: ArchivePhoto) => {
    if (!dragId || dragId === target.id) { setDragId(null); return; }
    const rest = group.filter((p) => p.id !== dragId);
    const dragged = group.find((p) => p.id === dragId);
    if (!dragged) { setDragId(null); return; }
    const at = rest.findIndex((p) => p.id === target.id);
    const next = [...rest.slice(0, at), dragged, ...rest.slice(at)];
    setDragId(null);
    const renumbered = next.map((p, i) => ({ ...p, order: (i + 1) * 10 }));
    setPhotos((prev) => [
      ...prev.filter((p) => p.photographer !== tab),
      ...renumbered,
    ].sort((a, b) => a.order - b.order));
    try {
      await savePhotoOrder(next);
    } catch (e) {
      console.warn('[PhotosSection] order', e);
      setErr('Échec de la sauvegarde de l’ordre.');
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setUploading(list.length);
    let order = group.length ? Math.max(...group.map((p) => p.order)) + 10 : 10;
    for (const f of list) {
      try {
        const created = await uploadArchivePhoto(tab, f, order);
        order += 10;
        setPhotos((prev) => [...prev, created].sort((a, b) => a.order - b.order));
      } catch (e) {
        console.warn('[PhotosSection] upload', e);
        setErr(`Échec du téléversement de ${f.name}.`);
      }
      setUploading((n) => n - 1);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <Camera size={16} className="text-brass" />
          <h2 className="font-display text-lg text-ivory">Archives photos — page Histoire</h2>
          <span className="text-xs text-stone">
            Ce que la page publique affiche, groupe par groupe. Désactiver met en réserve, rien n'est supprimé.
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {PHOTOGRAPHER_ORDER.map((k) => {
            const n = photos.filter((p) => p.photographer === k);
            return (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  tab === k
                    ? 'border-brass bg-brass/15 text-ivory'
                    : 'border-white/15 text-stone hover:border-brass/50'
                }`}
              >
                {PHOTOGRAPHER_META[k].label}
                <span className="ml-2 opacity-70">{n.filter((p) => p.active).length}/{n.length}</span>
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-2">
            <input
              ref={fileInputRef} type="file" accept="image/*" multiple hidden
              onChange={(e) => handleFiles(e.target.files)}
            />
            <GhostButton onClick={() => fileInputRef.current?.click()} disabled={uploading > 0}>
              {uploading > 0
                ? (<><Loader2 size={12} className="animate-spin" /> Téléversement ({uploading})</>)
                : (<><Upload size={12} /> Téléverser</>)}
            </GhostButton>
          </div>
        </div>
        {err && <p className="mt-3 text-xs text-amber-300/90">{err}</p>}
      </Card>

      <Card>
        <p className="mb-3 text-xs text-stone">
          {PHOTOGRAPHER_META[tab].label} · {activeCount} affichée{activeCount > 1 ? 's' : ''} sur {group.length}.
          Glisser une vignette sur une autre pour la placer devant; l'œil active ou met en réserve.
        </p>
        {loading ? (
          <p className="text-sm text-stone"><Loader2 size={14} className="mr-2 inline animate-spin" />Chargement…</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {group.map((p) => (
              <div
                key={p.id}
                draggable
                onDragStart={() => setDragId(p.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dropOn(p)}
                className={`group relative aspect-[4/3] cursor-grab overflow-hidden rounded border transition-opacity ${
                  p.active ? 'border-white/10' : 'border-amber-500/40 opacity-35'
                } ${dragId === p.id ? 'ring-2 ring-brass' : ''}`}
                title={p.file}
              >
                <img
                  src={photoThumb(p)} alt={p.file} loading="lazy" decoding="async"
                  className="h-full w-full object-cover"
                  draggable={false}
                />
                <button
                  onClick={() => toggle(p)}
                  disabled={busy === p.id}
                  className="absolute right-1 top-1 rounded bg-black/60 p-1 text-ivory opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
                  title={p.active ? 'Mettre en réserve' : 'Afficher sur le site'}
                >
                  {busy === p.id
                    ? <Loader2 size={14} className="animate-spin" />
                    : p.active ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default PhotosSection;
