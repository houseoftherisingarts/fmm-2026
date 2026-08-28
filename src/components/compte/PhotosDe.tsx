import React, { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { suivrePhotosPubliquesDe, suivrePhotosVedette, type PhotoPublique } from '../../firebase/photosPubliques';
import { useAuth } from '../../contexts/AuthContext';
import VisionneusePhoto, { mapDansCadre } from './VisionneusePhoto';

// ─── La galerie publique d'un membre ────────────────────────────────
// Ce qu'un autre membre voit en ouvrant la fiche : seulement les photos
// que la personne a marquées publiques (Alex, 2026-08-27). La légende
// se lit en survol et sous la photo. Un clic ouvre la visionneuse en
// grand ; les personnes identifiées y paraissent, avec un bouton pour
// se retirer soi-même (Alex, 2026-08-28).

const PhotosDe: React.FC<{
  uid: string; lang: 'FR' | 'EN'; titre: string;
  /** Seulement les photos en vedette (colonne du profil). */
  vedette?: boolean;
  /** Le mot quand il n'y a rien (sur son propre profil, une invitation). */
  vide?: string;
}> = ({ uid, lang, titre, vedette, vide }) => {
  const fr = lang === 'FR';
  const [photos, setPhotos] = useState<PhotoPublique[] | null>(null);
  useEffect(() => (vedette ? suivrePhotosVedette : suivrePhotosPubliquesDe)(uid, setPhotos), [uid, vedette]);
  const { user } = useAuth();
  const moi = user ? { uid: user.uid, nom: user.displayName || '' } : null;
  const [ouvertId, setOuvertId] = useState<string | null>(null);
  const ouverte = photos?.find((p) => p.id === ouvertId) ?? null;
  // Sur la fiche d'un autre, une vitrine vide ne s'affiche pas du tout.
  if (vedette && !vide && photos !== null && photos.length === 0) return null;

  return (
    <section className="glass-light rounded-lg-card p-7 md:p-8">
      <div className="flex items-center justify-between gap-4 mb-6 pb-2"
           style={{ borderBottom: '1px solid rgba(244, 239, 227, 0.10)' }}>
        <span className="witcher-stat-label inline-flex items-center gap-2"><Camera size={13} /> {titre}</span>
        {photos && photos.length > 0 && (
          <span className="font-sans text-sm tracking-[0.2em]" style={{ color: '#D8B05A', fontWeight: 300 }}>
            {photos.length}
          </span>
        )}
      </div>
      {photos === null ? (
        <p className="font-sans text-sm text-ivory-soft/50">{fr ? 'Chargement…' : 'Loading…'}</p>
      ) : photos.length === 0 ? (
        <p className="font-editorial text-sm text-ivory-soft leading-relaxed">
          {vide || (fr ? 'Ce membre n’a pas encore partagé de photo.' : 'This member has not shared a photo yet.')}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-[3px] md:gap-1">
          {photos.map((p) => (
            <figure key={p.id} className="group relative aspect-square overflow-hidden">
              <img src={p.url} alt={p.legende || ''} loading="lazy" decoding="async"
                   className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
              {p.legende && (
                <figcaption className="absolute bottom-0 left-0 right-0 px-3 py-2 font-sans text-[11px] leading-snug"
                            style={{ background: 'linear-gradient(to top, rgba(10,2,7,0.85), transparent)', color: 'rgba(244,239,227,0.85)' }}>
                  {p.legende}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}
    </section>
  );
};

export default PhotosDe;
