import React, { lazy, Suspense } from 'react';
import {Hammer} from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { Stagger, StaggerItem, ChapterIntro, ScrollProgress, Parallax } from '../components/scroll';
import { CinematicReveal, DepthChapter, Codex3D } from '../components/apprendre/apprendreScroll';
import { Motes } from '../components/marche/effects';
import { SectionFog } from '../components/marche/atmospherics';

// The pinned, scroll-scrubbed opening (GSAP + forge-fire video) is the
// heavy piece — code-split so it never weighs on the initial render.
const CinematicOpening = lazy(() => import('../components/apprendre/CinematicOpening'));

// Workshop / formation cards — cloned from Wix /apprendre.
const FORMATIONS = [
  { name: { FR: 'Démonstration de forge',  EN: 'Forge demonstration' } },
  { name: { FR: 'Tissage et filage',        EN: 'Weaving and spinning' } },
  { name: { FR: 'Fabrication de cotte de mailles', EN: 'Chainmail making' } },
  { name: { FR: 'Cuisine historique',       EN: 'Historical cooking' } },
  { name: { FR: 'Charpente traditionnelle', EN: 'Traditional carpentry' } },
  { name: { FR: 'Sculpture',                EN: 'Sculpture' } },
  { name: { FR: 'Joaillerie',               EN: 'Jewellery' } },
  { name: { FR: 'Fonderie',                 EN: 'Foundry' } },
];

// Cultural example bullets — themed groups extracted from the Wix copy.
const EXAMPLES = [
  {
    titleFR: 'Savoirs artisanaux', titleEN: 'Craft knowledge',
    bodyFR: 'Forge, tissage, vannerie, construction en pierre sèche, teintures naturelles — techniques presque oubliées par la société industrielle.',
    bodyEN: 'Forge, weaving, basketry, dry-stone construction, natural dyes — techniques nearly forgotten by industrial society.',
  },
  {
    titleFR: 'Arts et musique', titleEN: 'Arts and music',
    bodyFR: 'Chants de travail écossais (waulking songs), poèmes épiques des griots d’Afrique de l’Ouest, danses sacrées indiennes, chants polyphoniques géorgiens, harpe celtique, ney persan, tambours chamaniques de Sibérie.',
    bodyEN: 'Scottish waulking songs, epic poems of the West African griots, sacred Indian dances, Georgian polyphonic singing, Celtic harp, Persian ney, Siberian shamanic drums.',
  },
  {
    titleFR: 'Célébrations et festivals', titleEN: 'Celebrations and festivals',
    bodyFR: 'Mabon, cérémonies de solstice — moments de rassemblement liés aux cycles de la nature.',
    bodyEN: 'Mabon, solstice ceremonies — gathering moments tied to nature’s cycles.',
  },
  {
    titleFR: 'Innovations agricoles', titleEN: 'Agricultural innovations',
    bodyFR: 'Chinampas aztèques, assolement européen — connaissance intime de la terre.',
    bodyEN: 'Aztec chinampas, European crop rotation — intimate knowledge of the land.',
  },
  {
    titleFR: 'Vie communautaire', titleEN: 'Community life',
    bodyFR: 'Villages, monastères, guildes — entraide et savoir-faire.',
    bodyEN: 'Villages, monasteries, guilds — mutual aid and craft knowledge.',
  },
  {
    titleFR: 'Loisirs et jeux', titleEN: 'Leisure and games',
    bodyFR: 'Contes, danses folkloriques, Tafl nordique, jeux de plateaux égyptiens.',
    bodyEN: 'Storytelling, folk dances, Nordic Tafl, Egyptian board games.',
  },
];

const ApprendrePage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  const hint = lang === 'FR' ? 'Descendez' : 'Scroll';
  return (
    <>
      <SEO title={t.title} description={t.intro1} />
      <ScrollProgress />

      {/* ── Pinned cinematic opening — forge fire scrubbed by scroll ── */}
      <Suspense
        fallback={
          <div
            style={{
              height: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--color-velvet-deep)',
            }}
          >
            <h1
              className="font-display uppercase"
              style={{
                fontSize: 'clamp(3rem, 11vw, 8.5rem)',
                background: 'linear-gradient(180deg, #F4EFE3 0%, #E8B14A 70%, #B86A2A 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              {t.title}
            </h1>
          </div>
        }
      >
        <CinematicOpening eyebrow={t.eyebrow} title={t.title} lead={t.intro2} hint={hint} />
      </Suspense>

      <PageHeader
        eyebrow={t.eyebrow}
        titleA={t.title}
        intro={t.intro1}
        orbImage="/wix/apprendre/88ea932f.jpg"
        orbImagePosition="center"
      />

      {/* Light editorial body — Au-delà des Clichés */}
      <section className="relative py-20 md:py-28 overflow-hidden" style={{ backgroundColor: 'var(--color-mist)' }}>
        <DepthChapter tone="parchment">
          <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
            <CinematicReveal className="text-center mb-12 max-w-3xl mx-auto">
              <p className="font-editorial italic uppercase tracking-[0.3em] text-xs mb-3" style={{ color: 'var(--color-mist-deep)' }}>{t.appelEyebrow}</p>
              <h2 className="font-display title-medieval text-3xl md:text-5xl mb-6" style={{ color: 'var(--color-midnight-deep)' }}>{t.appelTitle}</h2>
              <p className="font-editorial text-base md:text-xl leading-relaxed" style={{ color: 'var(--color-midnight-deep)' }}>
                {t.appelBody}
              </p>
            </CinematicReveal>
            <Stagger className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6" stagger={0.07}>
              {EXAMPLES.map((ex) => (
                <StaggerItem
                  key={ex.titleFR}
                  as="article"
                  distance={64}
                  className="bg-white/35 border border-midnight-deep/15 rounded-card p-6 transition-transform duration-300 hover:-translate-y-1"
                >
                  <h3 className="font-display title-medieval text-base md:text-lg mb-2" style={{ color: 'var(--color-midnight-deep)' }}>{lang === 'FR' ? ex.titleFR : ex.titleEN}</h3>
                  <p className="font-editorial text-sm leading-relaxed" style={{ color: 'var(--color-midnight-deep)' }}>{lang === 'FR' ? ex.bodyFR : ex.bodyEN}</p>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </DepthChapter>
      </section>

      {/* Thème 2026 — Caravanes & Saltimbanques + aux origines du cirque */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <SectionFog edges="top" />
        <Motes className="opacity-50" count={16} />
        <DepthChapter tone="ember">
          <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
            <ChapterIntro eyebrow={t.themeEyebrow} title={t.themeTitle} className="mb-8" />

            <CinematicReveal as="div" className="max-w-3xl mb-12 md:mb-16">
              <p className="font-editorial text-lg md:text-2xl text-ivory leading-relaxed mb-7">{t.themeLead}</p>
              <div className="grid md:grid-cols-2 gap-6 md:gap-10">
                <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed">{t.themeBody1}</p>
                <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed">{t.themeBody2}</p>
              </div>
            </CinematicReveal>

            {/* Aux origines du cirque — repères datés */}
            <CinematicReveal as="div" className="max-w-2xl mb-8 md:mb-10">
              <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-2">{t.hookEyebrow}</p>
              <h3 className="font-display title-medieval text-2xl md:text-4xl text-ivory mb-4">{t.hookTitle}</h3>
              <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed">{t.hookLead}</p>
            </CinematicReveal>

            <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4" stagger={0.06}>
              {t.timeline.map((item) => (
                <StaggerItem
                  key={item.era}
                  as="article"
                  distance={56}
                  className="glass-light rounded-card p-5 md:p-6 hover:bg-brass/10 transition group hover:-translate-y-1 duration-300"
                >
                  <p className="font-display title-medieval text-brass text-sm md:text-base tracking-widest mb-2">{item.era}</p>
                  <h4 className="font-display title-medieval text-base md:text-lg text-ivory mb-2 group-hover:text-brass transition">{item.title}</h4>
                  <p className="font-editorial text-sm text-ivory-soft leading-relaxed">{item.body}</p>
                </StaggerItem>
              ))}
            </Stagger>

            {/* Culture invitée + continuité des thèmes */}
            <div className="grid lg:grid-cols-2 gap-6 md:gap-8 mt-12 md:mt-16">
              <CinematicReveal as="article" className="glass-light rounded-card p-6 md:p-8">
                <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3">{t.partnerEyebrow}</p>
                <h3 className="font-display title-medieval text-xl md:text-2xl text-ivory mb-3">{t.partnerTitle}</h3>
                <p className="font-editorial text-base text-ivory-soft leading-relaxed">{t.partnerBody}</p>
              </CinematicReveal>
              <CinematicReveal as="article" className="border-l-2 border-brass/60 pl-6 md:pl-8 py-2 self-center">
                <p className="font-display title-medieval text-xl md:text-3xl text-ivory mb-4 leading-tight">{t.continuityTitle}</p>
                <p className="font-editorial text-base text-ivory-soft leading-relaxed mb-3">{t.continuityBody}</p>
                <p className="font-editorial text-base text-brass leading-relaxed">{t.continuityHullsborg}</p>
              </CinematicReveal>
            </div>
          </div>
        </DepthChapter>
      </section>

      {/* Une époque aux réalités variées */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <SectionFog edges="top" />
        <Motes className="opacity-50" count={16} />
        <DepthChapter tone="ember">
          <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-8">
            <ChapterIntro eyebrow={t.epoqueEyebrow} title={t.epoqueTitle} className="mb-8" />
            <CinematicReveal as="div">
              <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed mb-5">{t.epoque1}</p>
              <ul className="space-y-3 font-editorial text-base text-ivory-soft mb-5">
                <li className="flex gap-3"><span className="text-brass mt-1">·</span>{t.epoqueEurope}</li>
                <li className="flex gap-3"><span className="text-brass mt-1">·</span>{t.epoqueVikings}</li>
                <li className="flex gap-3"><span className="text-brass mt-1">·</span>{t.epoqueAndes}</li>
              </ul>
              <p className="font-editorial italic text-base text-ivory-soft leading-relaxed">{t.epoqueClose}</p>
            </CinematicReveal>
          </div>
        </DepthChapter>
      </section>

      {/* Formations et démonstrations grid */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <Parallax speed={0.12} className="absolute inset-0 -z-10">
          <div
            className="absolute inset-x-0 top-1/4 h-1/2"
            style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(184,106,42,0.10), transparent 70%)' }}
          />
        </Parallax>
        <DepthChapter tone="ember">
          <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
            <ChapterIntro eyebrow={t.formationsEyebrow} title={t.formationsTitle} className="mb-10 md:mb-14" />
            {/* 3D moment — the codex of crafts opens as you scroll */}
            <Codex3D label={t.formationsTitle} />
            <Stagger className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4" stagger={0.05}>
              {FORMATIONS.map((f) => (
                <StaggerItem
                  key={f.name.FR}
                  as="article"
                  distance={56}
                  className="glass-light rounded-card p-5 md:p-6 hover:bg-brass/10 transition group hover:-translate-y-1 duration-300"
                >
                  <Hammer size={20} className="text-brass mb-3" />
                  <h3 className="font-display title-medieval text-base md:text-lg text-ivory mb-1.5 group-hover:text-brass transition">
                    {f.name[lang]}
                  </h3>
                  <p className="font-editorial italic text-xs text-ivory-soft">{t.detailsTBD}</p>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </DepthChapter>
      </section>
    </>
  );
};

const FR = {
  home: 'Accueil', eyebrow: 'Apprendre, c’est traverser les siècles', title: 'Apprendre',
  intro1: 'L’éducation fait partie des missions du FMM, car elle est la base de la promotion de la résilience. Nous cherchons à instruire via les perspectives historiques et à enrichir la culture générale.',
  intro2: 'Au-delà du savoir trivial, nous amenons les gens à parler au présent en se posant la question : « Lesquels de ces savoirs ancestraux sont-ils encore pertinents aujourd’hui — et pourront l’être encore — pour nous aider à traverser les grands changements à venir ? »',
  appelEyebrow: 'Appel à un voyage', appelTitle: 'Au-delà des clichés — redécouvrir le médiéval',
  appelBody: 'Dans les récits populaires, l’époque médiévale est souvent associée aux guerres, à la violence et aux luttes de pouvoir. Bien que ces aspects aient existé, ils ne définissent pas à eux seuls cette période. Le FMM propose d’élargir le regard et de mettre en avant les trésors moins connus du quotidien médiéval — dont certains sont encore pratiqués aujourd’hui hors de la culture commerciale.',
  themeEyebrow: 'Le thème de l’année · 2026', themeTitle: 'Caravanes & Saltimbanques',
  themeLead: 'Après les Vikings, la route continue. Cette année, le FMM rend hommage aux peuples nomades, aux grandes salles de banquet et aux artistes itinérants qui ont donné naissance au cirque.',
  themeBody1: 'Imaginez les caravanes qui s’arrêtent à la tombée du jour, les feux qu’on allume, les tables qu’on dresse. Tout autour, les acrobates s’élancent, les jongleurs lancent leurs torches, les conteurs prennent la parole et les musiciens font tourner la ronde. C’est cet esprit que nous célébrons : celui des saltimbanques qui portaient la fête de village en village.',
  themeBody2: 'Le banquet devient le cœur battant du festival. Comme dans les grandes salles d’autrefois, on mange, on boit, on écoute les bardes, et le spectacle se déroule entre les services. Une expérience à vivre en tablée, au rythme des tambours et des éclats de rire.',
  hookEyebrow: 'Petit détour historique', hookTitle: 'Aux origines du cirque',
  hookLead: 'Le mot « saltimbanque » est plus jeune que le Moyen Âge, mais l’art, lui, est très ancien. Voici quelques repères pour situer d’où vient la fête.',
  timeline: [
    { era: 'Antiquité', title: 'Le cirque romain', body: 'À Rome, le Circus Maximus accueille des courses de chars devant des dizaines de milliers de spectateurs. Mimes et histrions amusent déjà la foule.' },
    { era: 'XIIᵉ siècle', title: 'Jongleurs et ménestrels', body: 'Sur les grandes foires, comme celles de Champagne, jongleurs, bateleurs et ménestrels enchaînent acrobaties, musique et tours d’adresse, de ville en ville.' },
    { era: '1316', title: 'Le fou à la cour', body: 'Les registres royaux français mentionnent pour la première fois un fou de cour. Bouffons et conteurs animent les salles de banquet des seigneurs.' },
    { era: '1768', title: 'Le cirque moderne', body: 'À Londres, Philip Astley réunit cavaliers, acrobates, funambules et clowns sur une piste ronde. Le cirque tel qu’on le connaît est né.' },
  ],
  partnerEyebrow: 'Une culture invitée', partnerTitle: 'L’association Rome de Montréal',
  partnerBody: 'Cette année, nous accueillons l’association Rome de Montréal, qui vient partager et représenter la culture rom (romani) au festival. Une présence vivante, portée par celles et ceux qui la font vibrer aujourd’hui.',
  continuityTitle: 'Les Vikings ne sont pas partis. Les chevaliers non plus.',
  continuityBody: 'Chaque année, nous bonifions le festival : un nouveau thème s’ajoute, mais les anciens restent. Rien ne disparaît, tout s’additionne.',
  continuityHullsborg: 'Si vous avez aimé l’expérience viking l’an dernier, vous serez encore servis. La troupe Hullsborg vous attend, tambours et esprit du Nord compris.',
  epoqueEyebrow: 'Multiples mondes', epoqueTitle: 'Une époque aux réalités variées',
  epoque1: 'L’histoire médiévale ne peut être résumée en un seul récit : les réalités différaient d’une région à l’autre et d’une période à l’autre. Dans certaines sociétés, les journées de travail étaient rudes et axées sur les besoins fondamentaux, 10 à 12 heures par jour. Mais ailleurs, le rythme de vie pouvait être moins intense qu’aujourd’hui.',
  epoqueEurope: 'En Europe, les fêtes religieuses rythmaient l’année en offrant de nombreux jours de repos — jusqu’à 80-100 jours chômés par an dans certaines régions, contre une trentaine pour les travailleurs modernes (estimation : Gregory Clark, A Farewell to Alms).',
  epoqueVikings: 'Chez les Vikings, les longs hivers étaient dédiés aux contes, aux festivités et aux préparations pour l’été.',
  epoqueAndes: 'Dans les Andes, les systèmes agricoles en terrasses (Mita) répondaient aux besoins de la communauté avec une organisation méthodique.',
  epoqueClose: 'Ces nuances montrent à quel point cette époque était riche et complexe — loin des généralités souvent évoquées.',
  formationsEyebrow: 'Au programme', formationsTitle: 'Formations et démonstrations',
  detailsTBD: 'Détails à venir',
};
const EN = {
  home: 'Home', eyebrow: 'Learning across centuries', title: 'Learn',
  intro1: 'Education is part of FMM’s mission — it is the foundation of resilience. We seek to instruct through historical perspectives and to enrich general culture.',
  intro2: 'Beyond trivia, we bring people back to the present by asking: "Which of these ancestral knowings are still relevant today — and will continue to be — to help us navigate the great changes to come?"',
  appelEyebrow: 'A journey through cultures', appelTitle: 'Beyond the clichés — rediscovering the medieval',
  appelBody: 'In popular tellings, the medieval era is often tied to wars, violence and power struggles. While those aspects existed, they do not define the period alone. FMM proposes to broaden the view and highlight the lesser-known treasures of medieval daily life — some of which are still practiced today outside of commercial culture.',
  themeEyebrow: 'This year’s theme · 2026', themeTitle: 'Caravans & Players',
  themeLead: 'After the Vikings, the road goes on. This year FMM pays homage to nomadic peoples, great banquet halls, and the wandering performers who gave birth to the circus.',
  themeBody1: 'Picture the caravans pulling in at dusk, the fires lit, the tables set. All around, acrobats leap, jugglers toss their torches, storytellers take the floor and musicians spin the dance. That is the spirit we celebrate : the players who carried the festival from village to village.',
  themeBody2: 'The banquet becomes the beating heart of the festival. As in the great halls of old, you eat, you drink, you listen to the bards, and the show unfolds between courses. An experience to share at the table, to the rhythm of drums and bursts of laughter.',
  hookEyebrow: 'A short history', hookTitle: 'The origins of the circus',
  hookLead: 'The word « saltimbanque » is younger than the Middle Ages, but the art itself is ancient. A few landmarks to place where the festivity comes from.',
  timeline: [
    { era: 'Antiquity', title: 'The Roman circus', body: 'In Rome, the Circus Maximus hosts chariot races before tens of thousands. Mimes and histrions already entertain the crowd.' },
    { era: '12th century', title: 'Jugglers and minstrels', body: 'At the great fairs, such as those of Champagne, jugglers, tumblers and minstrels string together acrobatics, music and feats of skill, from town to town.' },
    { era: '1316', title: 'The fool at court', body: 'French royal records mention a court fool for the first time. Jesters and storytellers liven up the lords’ banquet halls.' },
    { era: '1768', title: 'The modern circus', body: 'In London, Philip Astley brings riders, acrobats, tightrope-walkers and clowns together on a round ring. The circus as we know it is born.' },
  ],
  partnerEyebrow: 'A guest culture', partnerTitle: 'The Rome de Montréal association',
  partnerBody: 'This year we welcome the Rome de Montréal association, here to share and represent Romani culture at the festival. A living presence, carried by the people who keep it alive today.',
  continuityTitle: 'The Vikings haven’t left. Neither have the knights.',
  continuityBody: 'Every year we enrich the festival : a new theme joins in, but the old ones stay. Nothing disappears, everything adds up.',
  continuityHullsborg: 'If you loved the Viking experience last year, you will be served again. The Hullsborg troupe awaits, drums and northern spirit included.',
  epoqueEyebrow: 'Multiple worlds', epoqueTitle: 'An era of varied realities',
  epoque1: 'Medieval history cannot be summed up in a single narrative: realities differed from one region to another, from one period to another. In some societies, workdays were harsh and focused on basic needs, 10–12 hours a day. But elsewhere, the rhythm of life could be less intense than today.',
  epoqueEurope: 'In Europe, religious feasts paced the year with many rest days — up to 80–100 days off annually in some regions, vs roughly 30 days for modern workers (estimate: Gregory Clark, A Farewell to Alms).',
  epoqueVikings: 'Among the Vikings, long winters were devoted to storytelling, festivities and summer preparations.',
  epoqueAndes: 'In the Andes, terraced agricultural systems (Mita) met community needs through methodical organisation.',
  epoqueClose: 'These nuances show how rich and complex this era was — far from the generalities often invoked.',
  formationsEyebrow: 'On the program', formationsTitle: 'Workshops and demonstrations',
  detailsTBD: 'Details to come',
};

export default ApprendrePage;
