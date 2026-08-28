import React, { useRef } from 'react';
import { Upload, X } from 'lucide-react';

// ─── Sélecteur de photos, jusqu'à `max` ──────────────────────────────
// Partagé entre MesObjets (4 photos max) et CommerceDe (6 photos max).
// Ne téléverse rien lui-même : il rend au parent la liste de fichiers
// choisis (nouvelles photos) + les URLs déjà en ligne qu'on garde,
// avec un bouton retirer sur chaque vignette. Le parent envoie le tout
// à l'enregistrement (souk.ts fait le redimensionnement + l'upload).
interface Props {
  lang: 'FR' | 'EN';
  max: number;
  photosExistantes: string[];
  onRetirerExistante: (url: string) => void;
  nouvellesPhotos: File[];
  onChangeNouvelles: (fichiers: File[]) => void;
}

const PhotosPicker: React.FC<Props> = ({
  lang, max, photosExistantes, onRetirerExistante, nouvellesPhotos, onChangeNouvelles,
}) => {
  const fr = lang === 'FR';
  const inputRef = useRef<HTMLInputElement>(null);
  const total = photosExistantes.length + nouvellesPhotos.length;
  const restant = Math.max(0, max - total);

  const ajouter = (fichiers: FileList | null) => {
    if (!fichiers || !restant) return;
    const pris = Array.from(fichiers).filter((f) => f.type.startsWith('image/')).slice(0, restant);
    onChangeNouvelles([...nouvellesPhotos, ...pris]);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {photosExistantes.map((url) => (
          <div key={url} className="relative w-20 h-20 rounded-card overflow-hidden border border-brass/30">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onRetirerExistante(url)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-midnight-deep/80 border border-ivory-soft/30 text-ivory-soft flex items-center justify-center hover:text-blush hover:border-blush/50 transition"
              aria-label={fr ? 'Retirer cette photo' : 'Remove this photo'}
            >
              <X size={11} />
            </button>
          </div>
        ))}
        {nouvellesPhotos.map((f, i) => (
          <div key={`${f.name}-${i}`} className="relative w-20 h-20 rounded-card overflow-hidden border border-brass/30">
            <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChangeNouvelles(nouvellesPhotos.filter((_, j) => j !== i))}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-midnight-deep/80 border border-ivory-soft/30 text-ivory-soft flex items-center justify-center hover:text-blush hover:border-blush/50 transition"
              aria-label={fr ? 'Retirer cette photo' : 'Remove this photo'}
            >
              <X size={11} />
            </button>
          </div>
        ))}
        {restant > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-20 h-20 rounded-card border-2 border-dashed border-ivory-soft/25 hover:border-brass/60 text-ivory-soft hover:text-brass flex flex-col items-center justify-center gap-1 transition"
          >
            <Upload size={16} />
            <span className="font-sans text-[10px] uppercase tracking-wider">{fr ? 'Ajouter' : 'Add'}</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => { ajouter(e.target.files); e.target.value = ''; }}
      />
      <p className="font-editorial italic text-xs text-stone mt-2">
        {fr ? `Jusqu'à ${max} photos.` : `Up to ${max} photos.`}
      </p>
    </div>
  );
};

export default PhotosPicker;
