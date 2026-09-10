import React from 'react';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { Reveal, Stagger, StaggerItem, ScrollProgress, Parallax } from '../components/scroll';
import { SectionFog } from '../components/marche/atmospherics';

const JeunessePage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;

  return (
    <>
      {!embedded && <SEO title={t.title} description={t.intro} />}
      {!embedded && <ScrollProgress />}
      {embedded ? (
        /* Le chapitre jeunesse arrivait en petit titre, sans image, après
           deux chapitres illustrés (Alex, 2026-08-22). Il ouvre désormais
           sur une bande photo : les enfants du festival avec leur monitrice,
           photo d'archives du festival (Clair du Lièvre). Corrigée le
           2026-08-24 : l'ancienne photo montrait un homme à la flûte plutôt
           que des enfants. */
        <section className="relative overflow-hidden">
          <div className="relative h-[62vh] min-h-[420px] md:h-[74vh]">
            <Parallax speed={0.16} className="absolute inset-0">
              <img
                src="/histoire/archives/lievre/2022-77c6727f.webp"
                alt={t.heroAlt}
                className="w-full h-[118%] object-cover object-[50%_42%]"
                loading="lazy"
              />
            </Parallax>
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(10,5,7,0.92) 0%, rgba(10,5,7,0.35) 34%, rgba(10,5,7,0.55) 70%, rgba(10,5,7,0.97) 100%)',
              }}
            />
            <SectionFog />
            <div className="absolute inset-x-0 bottom-0 z-10 max-w-screen-xl mx-auto px-4 md:px-8 pb-10 md:pb-16">
              <Reveal from="up">
                <p className="font-editorial uppercase tracking-[0.4em] text-[11px] md:text-xs text-[var(--color-amber-glow)] mb-3">{t.eyebrow}</p>
                <h2 className="font-display title-medieval text-4xl md:text-6xl text-ivory leading-[1.04]">{t.title}</h2>
                <div className="divider-brass w-24 mt-5" />
                <p className="font-editorial text-base md:text-lg text-ivory-soft/85 max-w-2xl mt-5">{t.intro}</p>
              </Reveal>
            </div>
          </div>
        </section>
      ) : (
        <PageHeader
          eyebrow={t.eyebrow}
          titleA={t.title}
          intro={t.intro}
          orbImage="/histoire/archives/lievre/2022-77c6727f.webp"
          orbImagePosition="64% 44%"
        />
      )}

      {/* La section jeunesse est présentée par Les Camps Légendaires
          (demande d'Alex, 2026-08-20) : Clan Renard et Zaryzad retirés. */}
      {/* Camps Légendaires : présentateur de la section jeunesse */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <Stagger className="grid gap-5 md:gap-6" stagger={0.1}>
            <StaggerItem as="article" className="glass-light rounded-lg-card p-7 md:p-9 flex flex-col max-w-3xl mx-auto w-full">
              <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">{t.campsEyebrow}</p>
              <h3 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-3">{t.campsTitle}</h3>
              <div className="divider-brass w-16 mb-4" />
              <p className="font-editorial text-base text-ivory-soft mb-6 flex-1">{t.campsBody}</p>
              {/* Camps Légendaires CTA dropped until a real signup URL exists. */}
            </StaggerItem>
          </Stagger>
          <Reveal className="max-w-2xl mx-auto mt-10 md:mt-12 text-center">
            <p className="font-editorial italic text-stone uppercase tracking-[0.3em] text-xs mb-2">{t.youthYourEyebrow}</p>
            <p className="font-editorial text-base md:text-lg text-ivory-soft">{t.youthYourBody}</p>
          </Reveal>
        </div>
      </section>

    </>
  );
};

const FR = {
  home: 'Accueil',
  eyebrow: 'Présenté par Les Camps Légendaires',
  heroAlt: 'Une file d’enfants du festival, épée d’entraînement en main, attend son tour devant leur monitrice de camp',
  title: 'Village Jeunesse & Jeux',
  intro: 'Le FMM tient à offrir un espace aussi adapté que possible pour les cœurs d’enfants qui sont encore dans des corps d’enfants. Cette année (en plus d’avoir adapté les prix aux familles), nous avons agrandi le site, ajouté du confort, ouvert un parc où les enfants jouent librement et bonifié les ateliers et activités pour les jeunes.',
  campsEyebrow: 'Présentateur officiel de la section jeunesse',
  campsTitle: 'Les Camps Légendaires',
  campsBody: 'Maniement de l’épée, tir à l’arc, grands jeux en équipe, quêtes immersives et plus. Depuis 2005, leur mission éducative est au cœur du camp. Par leurs activités, ils contribuent au développement positif des enfants et des ados.',
  campsCta: 'Voir le camp',
  youthYourEyebrow: 'Partenariats jeunesse',
  youthYourBody: 'Cet espace est réservé à un futur partenaire jeunesse souhaitant contribuer à faire évoluer le projet et animer les cœurs d’enfants.',
};

const EN = {
  home: 'Home',
  eyebrow: 'Presented by Les Camps Légendaires',
  heroAlt: 'A line of festival children, wooden training swords in hand, waiting their turn in front of their camp counselor',
  title: 'Youth & Games Village',
  intro: 'FMM strives to offer the most kid-friendly space possible for the young-hearted still living in young bodies. This year (beyond family-adjusted prices), we expanded the site, added comfort, opened a park where kids play freely, and enriched the workshops and activities for kids.',
  campsEyebrow: 'Official presenter of the youth section',
  campsTitle: 'Les Camps Légendaires',
  campsBody: 'Swordsmanship, archery, large team games, immersive quests and more. Since 2005, their educational mission has been at the camp’s heart. Through their activities they contribute to the positive development of kids and teens.',
  campsCta: 'See the camp',
  youthYourEyebrow: 'Youth partners',
  youthYourBody: 'This space is reserved for a future youth partner wishing to contribute to the project and animate young hearts.',
};

export default JeunessePage;
