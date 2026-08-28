import React from 'react';
import { useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { CarteObjet } from '../pages/SoukPage';
import type { ObjetSouk } from '../firebase/souk';

// ─── Banc d'essai : la carte du Souk ──────────────────────────────────
// Alex, 2026-08-28 : vérification visuelle de CarteObjet sans compte ni
// Firestore — objet payant, service, objet gratuit. `?apercu=1` (dev
// seulement), même patron que VotesBancEssai.tsx.

const OBJET: ObjetSouk = {
  id: 'demo-objet', uid: 'demo-uid-1', nom: 'Gwendal le Brave',
  titre: 'Cotte de mailles, taille M', description: 'Portée deux festivals, quelques mailles à resserrer.',
  prix: 85, prixMontpellois: 40, genre: 'objet', categorie: 'costume',
  photos: [], chemins: [], statut: 'disponible', creeLe: null, maj: null,
};

const SERVICE: ObjetSouk = {
  id: 'demo-service', uid: 'demo-uid-2', nom: 'Iseult',
  titre: 'Retouches de costume sur place', description: 'Ourlets, laçages, boutonnières, pendant tout le week-end.',
  prix: 15, genre: 'service', categorie: 'couture',
  photos: [], chemins: [], statut: 'disponible', creeLe: null, maj: null,
};

const GRATUIT: ObjetSouk = {
  id: 'demo-gratuit', uid: 'demo-uid-3', nom: 'Corentin des Bois',
  titre: 'Bottes de cuir, pointure 42', description: 'Trop grandes pour moi, encore de la vie dedans.',
  genre: 'objet', categorie: 'costume',
  photos: [], chemins: [], statut: 'disponible', creeLe: null, maj: null,
};

const SoukBancEssai: React.FC = () => {
  const location = useLocation();
  const apercu = import.meta.env.DEV && new URLSearchParams(location.search).get('apercu') === '1';

  if (!apercu) {
    return (
      <main className="min-h-screen text-ivory flex items-center justify-center">
        <div className="glass-light rounded-lg-card p-10 text-center max-w-md">
          <Lock size={22} className="mx-auto mb-4 text-brass" />
          <p className="font-display text-xl">Chantier fermé</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-ivory bg-midnight-deep py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="font-display title-medieval text-2xl text-ivory">Banc d’essai — la carte du Souk</h1>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <CarteObjet o={OBJET} lang="FR" />
          <CarteObjet o={SERVICE} lang="FR" />
          <CarteObjet o={GRATUIT} lang="FR" />
        </div>
      </div>
    </main>
  );
};

export default SoukBancEssai;
