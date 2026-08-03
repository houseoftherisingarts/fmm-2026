// TEMPORAIRE — aperçu du tableau des avis (2026-08-03). Le fichier
// d'origine est restauré aussitôt la vérification visuelle faite.
import AnnoncesPanel from '../components/compte/AnnoncesPanel';

export default function TitleLab() {
  return (
    <div className="min-h-screen caravan-stage bleed-edges py-12 md:py-16">
      <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
        <AnnoncesPanel lang="FR" />
      </div>
    </div>
  );
}
