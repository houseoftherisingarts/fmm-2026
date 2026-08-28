import React, { useEffect, useState } from 'react';
import { Tag } from 'lucide-react';
import { suivrePhotosOuJeSuis, type PhotoPublique } from '../../firebase/photosPubliques';
import VisionneusePhoto from './VisionneusePhoto';

// ─── Photos où je suis identifié ─────────────────────────────────────
// Bande sous la grille de l'onglet Photos : les photos publiques,
// envoyées par d'autres membres, où quelqu'un a posé un repère sur
// cette personne (Alex, 2026-08-28). Alex la branche lui-même dans
// FicheMembre.tsx, sous PhotosPanel.
//
// Props : uid (la personne connectée), nom (son nom, pour le marqueur
// « Moi » si elle rouvre une de ses propres photos depuis ici), lang.

interface Props { uid: string; nom: string; lang: 'FR' | 'EN' }

const PhotosAvecMoi: React.FC<Props> = ({ uid, nom, lang }) => {
  const fr = lang === 'FR';
  const [photos, setPhotos] = useState<PhotoPublique[] | null>(null);
  useEffect(() => suivrePhotosOuJeSuis(uid, setPhotos), [uid]);
  const [ouvertId, setOuvertId] = useState<string | null>(null);
  const ouverte = photos?.find((p) => p.id === ouvertId) ?? null;

  if (photos !== null && photos.length === 0) return null;

  return (
    <section className="glass-light rounded-lg-card p-7 md:p-8">
      <div className="flex items-center justify-between gap-4 mb-6 pb-2"
           style={{ borderBottom: '1px solid rgba(244, 239, 227, 0.10)' }}>
        <span className="witcher-stat-label inline-flex items-center gap-2">
          <Tag size={13} /> {fr ? 'Photos où je suis identifié' : 'Photos I’m tagged in'}
        </span>
        {photos && photos.length > 0 && (
          <span className="font-sans text-sm tracking-[0.2em]" style={{ color: '#D8B05A', fontWeight: 300 }}>
            {photos.length}
          </span>
        )}
      </div>
      {photos === null ? (
        <p className="font-sans text-sm text-ivory-soft/50">{fr ? 'Chargement…' : 'Loading…'}</p>
      ) : (
        <div className="grid grid-cols-3 gap-[3px] md:gap-1">
          {photos.map((p) => (
            <button
              key={p.id} type="button" onClick={() => setOuvertId(p.id)}
              className="group relative aspect-square overflow-hidden"
            >
              <img
                src={p.url} alt={p.legende || ''} loading="lazy" decoding="async"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
            </button>
          ))}
        </div>
      )}
      {ouverte && (
        <VisionneusePhoto
          photo={ouverte} lang={lang} onClose={() => setOuvertId(null)}
          moi={{ uid, nom }} proprietaire={ouverte.uid === uid}
        />
      )}
    </section>
  );
};

export default PhotosAvecMoi;
