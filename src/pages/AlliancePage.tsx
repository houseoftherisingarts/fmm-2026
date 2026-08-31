import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import Brume from '../components/Brume';
import PageHeader from '../components/layout/PageHeader';
import { ALLIES, A_VENIR_FR, A_VENIR_EN } from '../content/alliance';

// ─── L'Alliance ─────────────────────────────────────────────────────
// La page des maisons alliées. Elle dort jusqu'à ce qu'Alex l'allume
// depuis l'admin (drapeau `pubAlliance`), et la route la protège.

const AlliancePage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const fr = lang === 'FR';
  const visibles = ALLIES.filter((a) => a.confirme);

  return (
    <>
      <SEO
        title={fr ? 'L’Alliance' : 'The Alliance'}
        description={fr
          ? 'Les maisons avec qui le Festival Médiéval de Montpellier marche : festivals, monnaie locale, lieux d’accueil.'
          : 'The houses the Festival Médiéval de Montpellier walks with: festivals, local currency, places that host us.'}
        noindex
      />
      <PageHeader
        eyebrow={fr ? 'Nos alliés' : 'Our allies'}
        titleA={fr ? 'L’Alliance' : 'The Alliance'}
        titleB=""
        intro={fr
          ? 'Un festival ne tient pas tout seul. Voici les maisons avec qui nous marchons, celles qui nous logent, celles qui font circuler la monnaie, et celles qui allument leurs propres feux ailleurs dans la région.'
          : 'A festival does not stand alone. Here are the houses we walk with: those that lodge us, those that keep the local currency moving, and those lighting their own fires elsewhere in the region.'}
        orbImage="/wix/home/marchand.jpg"
        orbImagePosition="center 30%"
      />

      <section className="relative py-14 md:py-20 overflow-hidden">
        <Brume />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {visibles.map((a) => (
              <article key={a.id} className="rounded-lg-card border border-brass/25 p-7 md:p-8"
                       style={{ background: 'rgba(var(--sk-deep-rgb), 0.45)' }}>
                <h2 className="font-display title-medieval text-2xl text-ivory mb-2">{a.nom}</h2>
                {a.lieu && (
                  <p className="font-sans uppercase tracking-[0.22em] text-[10px] text-ivory-soft/55 mb-4">{a.lieu}</p>
                )}
                <div className="divider-brass w-14 mb-5" />
                <p className="font-editorial text-base text-ivory-soft leading-relaxed mb-3">
                  {fr ? a.quoiFR : a.quoiEN}
                </p>
                <p className="font-editorial text-base text-ivory-soft leading-relaxed">
                  {fr ? a.lienFR : a.lienEN}
                </p>
                {a.site && (
                  <a href={a.site} target="_blank" rel="noopener noreferrer"
                     className="mt-6 inline-flex items-center gap-2 font-sans uppercase tracking-[0.2em] text-[10px] text-brass hover:text-ivory transition-colors">
                    {fr ? 'Leur maison' : 'Their house'} <ArrowUpRight size={13} />
                  </a>
                )}
              </article>
            ))}
          </div>

          <p className="mt-10 font-editorial text-sm text-ivory-soft/70 max-w-2xl">
            {fr ? A_VENIR_FR : A_VENIR_EN}
          </p>
        </div>
      </section>
    </>
  );
};

export default AlliancePage;
