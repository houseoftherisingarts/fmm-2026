import React from 'react';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import { useEmeraudePage } from '../lib/useEmeraudePage';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { Reveal, ScrollProgress } from '../components/scroll';
import { Motes } from '../components/marche/effects';
import { SectionFog } from '../components/marche/atmospherics';
import CommanditaireHonneur from '../components/partenaires/CommanditaireHonneur';
import SponsorInquiry from '../components/partenaires/SponsorInquiry';

// ─── Partenaires 2027 ────────────────────────────────────────────────
// Page DISTINCTE de /partenaires (édition courante), sur son propre slug
// `/partenaires-2027`. Décision d'Alex 2026-08-03 : les deux ne se
// mélangent pas. /partenaires reste la page des partenaires de l'édition
// en cours, intacte, dans son registre oxblood. Celle-ci annonce le
// commanditaire d'honneur de l'édition suivante, en émeraude.
//
// 🚨 Elle n'est jamais publique tant que `showCommanditaire` est éteint
// (voir la garde dans App.tsx). En local, VITE_SITE_MODE=live l'ouvre
// pour la construire.
//
// Le vert vient de `useEmeraudePage`, une surcouche par-dessus le thème
// caravane : le shim structurel reste, seules les couleurs basculent.

const Partenaires2027Page: React.FC = () => {
  useCaravanPage();
  useEmeraudePage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;

  return (
    <>
      <SEO title={t.title} description={t.intro} noindex />
      <ScrollProgress />
      <PageHeader
        eyebrow={t.eyebrow}
        titleA={t.title}
        intro={t.intro}
        dateline={t.dateline}
        orbImage="/wix/partenaires/2a2a4608.jpg"
        orbImagePosition="center"
      />

      <CommanditaireHonneur />

      {/* Devenir le commanditaire de l'année suivante. Une seule place,
          donc un formulaire qui va dans la boîte personnelle d'Alex
          plutôt qu'un mailto public. */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <SectionFog edges="top" />
        <Motes className="opacity-50" count={16} />
        <Reveal className="relative z-10 max-w-2xl mx-auto px-4 md:px-8 text-center">
          <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">{t.becomeEyebrow}</p>
          <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory mb-4">{t.becomeTitle}</h2>
          <div className="divider-brass w-16 mx-auto mb-6" />
          <p className="font-editorial text-base md:text-lg text-ivory-soft mb-8 leading-relaxed">{t.becomeBody}</p>
          <SponsorInquiry />
        </Reveal>
      </section>
    </>
  );
};

const FR = {
  eyebrow: 'Édition 2027',
  title:   'Partenaires 2027',
  intro:   'Chaque édition du festival est portée par une figure invitée. Voici celle qui marchera avec nous en 2027, et les rendez-vous où vous nous croiserez ensemble avant le festival.',
  becomeEyebrow: 'La place suivante',
  becomeTitle:   'Commanditaire d’honneur 2028',
  becomeBody:    'Une seule place par édition, réservée à celles et ceux qui veulent porter le festival plus loin. Écrivez-nous, la conversation commence là.',
};

const EN: typeof FR = {
  eyebrow: '2027 edition',
  title:   'Partners 2027',
  intro:   'Every edition of the festival is carried by an invited figure. Here is the one walking with us in 2027, and where you will meet us together before the festival.',
  becomeEyebrow: 'The next seat',
  becomeTitle:   'Sponsor of honour 2028',
  becomeBody:    'One seat per edition, for those who want to carry the festival further. Write to us, that is where the conversation starts.',
};

export default Partenaires2027Page;
