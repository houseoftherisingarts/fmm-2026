import React, { useState } from 'react';
import { mapDansCadre } from './VisionneusePhoto';
import VisionneusePhoto from './VisionneusePhoto';
import type { PhotoPublique } from '../../firebase/photosPubliques';

// ─── Banc d'essai des repères de photos ─────────────────────────────
// Dev seulement (`?bancPhotos=1`), pour juger à l'écran l'identification
// de personnes sans vraies photos ni écriture Firestore : aucun appel à
// identifierPersonnes/seRetirerDUnePhoto n'aboutit vraiment ici (les
// ids sont inventés), c'est un aperçu visuel (Alex, 2026-08-28). À
// retirer une fois la vérification faite.

const PHOTOS: PhotoPublique[] = [
  {
    id: 'banc-a', uid: 'apercu', nomMembre: 'Dame Aperçu',
    url: '/wix/home/scene-cinematic.jpg', chemin: '', largeur: 1600, hauteur: 1000,
    poids: 0, legende: 'Autour du feu, la veille du tournoi.',
    statut: 'retenue', visibilite: 'publique',
    personnes: [
      { uid: 'a1', nom: 'Dame Aperçu', x: 28, y: 55 },
      { uid: 'a2', nom: 'Sire Exemple', x: 68, y: 40 },
    ],
    personnesUids: ['a1', 'a2'],
    consentement: true, consentementLe: null, envoyeeLe: null,
  },
  {
    id: 'banc-b', uid: 'apercu', nomMembre: 'Dame Aperçu',
    url: '/wix/home/viking-band.jpg', chemin: '', largeur: 1000, hauteur: 1400,
    poids: 0, legende: 'La bande avant le défilé.',
    statut: 'retenue', visibilite: 'publique',
    personnes: [{ uid: 'a3', nom: 'Vaillante Autre', x: 50, y: 22 }],
    personnesUids: ['a3'],
    consentement: true, consentementLe: null, envoyeeLe: null,
  },
];

const BancPhotos: React.FC = () => {
  const [ouvertId, setOuvertId] = useState<string | null>(null);
  const ouverte = PHOTOS.find((p) => p.id === ouvertId) ?? null;

  return (
    <section className="glass-light rounded-lg-card p-7 md:p-8" data-testid="banc-photos">
      <p className="witcher-stat-label mb-4">Banc d'essai · repères de photos</p>
      <div className="grid grid-cols-3 gap-[3px] md:gap-1">
        {PHOTOS.map((p) => (
          <figure
            key={p.id} onClick={() => setOuvertId(p.id)}
            className="group relative aspect-square overflow-hidden cursor-pointer"
          >
            <img src={p.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            {(p.personnes ?? []).length > 0 && (
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {p.personnes!.map((pers) => {
                  const pos = mapDansCadre(pers.x, pers.y, p.largeur, p.hauteur, 1, 1);
                  if (!pos) return null;
                  return (
                    <span key={pers.uid} className="absolute flex flex-col items-center gap-0.5"
                          style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}>
                      <span className="block w-2 h-2 rounded-[2px] border"
                            style={{ borderColor: '#D8B05A', background: 'rgba(216,176,90,0.25)' }} />
                      <span className="px-1 py-0.5 rounded-full font-sans uppercase tracking-[0.1em] text-[8px] whitespace-nowrap"
                            style={{ background: 'rgba(10,2,7,0.85)', color: '#F4EFE3' }}>
                        {pers.nom}
                      </span>
                    </span>
                  );
                })}
              </div>
            )}
          </figure>
        ))}
      </div>
      {ouverte && (
        <VisionneusePhoto
          photo={ouverte} lang="FR" onClose={() => setOuvertId(null)}
          moi={{ uid: 'apercu', nom: 'Dame Aperçu' }} proprietaire
        />
      )}
    </section>
  );
};

export default BancPhotos;
