import React from 'react';
import { Link } from 'react-router-dom';
import { Users, ScrollText } from 'lucide-react';

import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import { addLocale } from '../lib/locale';
import SEO from '../components/SEO';
import Brume from '../components/Brume';
import AnnoncesPanel from '../components/compte/AnnoncesPanel';

// ─── Le babillard ───────────────────────────────────────────────────
// Alex, 2026-09-02 : « ensure the billboard has its own /babillard ».
// Le panneau de bois vivait à l'intérieur du Mur, du registre de l'Ordre
// et de la fiche de membre, donc derrière un compte, et un règlement que
// tout le monde doit avoir lu ne peut pas vivre là. Il a maintenant son
// adresse, ouverte à qui arrive sans compte.
//
// Le tableau lui-même reste le composant des avis : un seul panneau
// pour tout le festival, et un avis ajouté dans content/annonces.ts
// paraît du même coup ici, dans le Mur et dans l'espace client.

const BabillardPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const fr = lang === 'FR';
  const t = fr ? FR : EN;

  return (
    <main className="min-h-screen text-ivory">
      <SEO title={t.titre} description={t.intro} />
      {/* Aucun en-tête de page ici, et pas d'orbe (Alex, 2026-09-02 :
          « enlève le grand cercle et le titre, ça ne sert à rien, mets
          directement le babillard »). Le panneau de bois porte déjà son
          nom et se voit de loin, donc un titre par-dessus ne ferait que
          repousser les avis sous la ligne de flottaison. */}
      <section className="relative caravan-stage bleed-edges pt-28 md:pt-32 pb-20 overflow-hidden">
        <Brume />
        <div className="relative z-10 w-full px-4 md:px-8">
          <AnnoncesPanel lang={lang} />

          <div className="flex flex-wrap gap-3">
            <Link
              to={addLocale('/mur', lang)}
              className="inline-flex items-center gap-3 px-8 py-4 font-sans uppercase tracking-[0.2em] text-sm font-semibold transition rounded-card"
              style={{ border: '1px solid rgba(var(--sk-gilt-rgb),0.45)', color: 'var(--sk-gilt)' }}
            >
              <Users size={18} /> {t.versMur}
            </Link>
            <Link
              to={addLocale('/billets', lang)}
              className="inline-flex items-center gap-3 px-8 py-4 bg-brass text-midnight-deep font-sans uppercase tracking-[0.2em] text-sm font-semibold hover:bg-brass-soft transition rounded-card"
            >
              <ScrollText size={18} /> {t.versBillets}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};

const FR = {
  titre: 'Le babillard',
  intro: 'Les avis du festival sont épinglés ici, sur le même panneau de bois que le tableau des marchands. Le règlement des armes y reste affiché en permanence, et les autres avis se décrochent avec un compte du festival.',
  versMur: 'Le mur des membres',
  versBillets: 'Prendre vos billets',
};

const EN = {
  titre: 'The notice board',
  intro: 'The festival notices are pinned here, on the same wooden board as the merchants’ table. The weapons rules stay up for good, and the other notices can be taken down with a festival account.',
  versMur: 'The members’ wall',
  versBillets: 'Get your tickets',
};

export default BabillardPage;
