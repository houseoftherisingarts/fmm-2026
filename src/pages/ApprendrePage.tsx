import React, { lazy, Suspense } from 'react';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { Reveal, Stagger, StaggerItem, ScrollProgress, Parallax } from '../components/scroll';
import { CinematicReveal, DepthChapter } from '../components/apprendre/apprendreScroll';
import { Motes } from '../components/marche/effects';
import { SectionFog } from '../components/marche/atmospherics';
import { SectionBand } from './HistoirePage';
import {
  IconForge, IconTissage, IconFonderie, IconOpenBook, IconWagon,
  IconJester, IconWorld, type GameIconProps,
} from '../components/icons/GameIcons';

// The pinned, scroll-scrubbed opening (GSAP + forge-fire video) is the
// heavy piece, code-split so it never weighs on the initial render.
const CinematicOpening = lazy(() => import('../components/apprendre/CinematicOpening'));

// Workshop / formation cards, cloned from Wix /apprendre. Each craft gets
// its own engraved icon (game-icons.net) instead of a generic hammer.
// Contenu aligné sur l'horaire principal 2026 (demande d'Alex,
// 2026-08-20) : seules les démonstrations réellement programmées sont
// listées, rien n'est promis qui ne soit pas à l'horaire.
const FORMATIONS: { name: { FR: string; EN: string }; Icon: React.FC<GameIconProps> }[] = [
  { name: { FR: 'Démonstration de forge',      EN: 'Forge demonstration' },     Icon: IconForge },
  { name: { FR: 'Parcours d’herboristerie',    EN: 'Herbalism trail' },         Icon: IconTissage },
  { name: { FR: 'Conférence bohème',           EN: 'Bohemian talk' },           Icon: IconOpenBook },
  { name: { FR: 'Vente aux enchères · Forge',  EN: 'Auction · Forge' },         Icon: IconFonderie },
];

// Cultural example bullets, themed groups extracted from the Wix copy.
const EXAMPLES = [
  {
    titleFR: 'Savoirs artisanaux', titleEN: 'Craft knowledge',
    bodyFR: 'Forge, tissage, vannerie, construction en pierre sèche, teintures naturelles, techniques presque oubliées par la société industrielle.',
    bodyEN: 'Forge, weaving, basketry, dry-stone construction, natural dyes, techniques nearly forgotten by industrial society.',
  },
  {
    titleFR: 'Arts et musique', titleEN: 'Arts and music',
    bodyFR: 'Chants de travail écossais (waulking songs), poèmes épiques des griots d’Afrique de l’Ouest, danses sacrées indiennes, chants polyphoniques géorgiens, harpe celtique, ney persan, tambours chamaniques de Sibérie.',
    bodyEN: 'Scottish waulking songs, epic poems of the West African griots, sacred Indian dances, Georgian polyphonic singing, Celtic harp, Persian ney, Siberian shamanic drums.',
  },
  {
    titleFR: 'Célébrations et festivals', titleEN: 'Celebrations and festivals',
    bodyFR: 'Mabon, cérémonies de solstice, moments de rassemblement liés aux cycles de la nature.',
    bodyEN: 'Mabon, solstice ceremonies, gathering moments tied to nature’s cycles.',
  },
  {
    titleFR: 'Innovations agricoles', titleEN: 'Agricultural innovations',
    bodyFR: 'Chinampas aztèques, assolement européen, connaissance intime de la terre.',
    bodyEN: 'Aztec chinampas, European crop rotation, intimate knowledge of the land.',
  },
  {
    titleFR: 'Vie communautaire', titleEN: 'Community life',
    bodyFR: 'Villages, monastères, guildes, entraide et savoir-faire.',
    bodyEN: 'Villages, monasteries, guilds, mutual aid and craft knowledge.',
  },
  {
    titleFR: 'Loisirs et jeux', titleEN: 'Leisure and games',
    bodyFR: 'Contes, danses folkloriques, Tafl nordique, jeux de plateaux égyptiens.',
    bodyEN: 'Storytelling, folk dances, Nordic Tafl, Egyptian board games.',
  },
];

// ─── Apprendre (chapter opener + Au-delà des clichés) ────────────────
export const ApprendreChapterSection: React.FC = () => {
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  return (
    <section className="relative pt-20 md:pt-28 pb-16 md:pb-24 overflow-hidden">
      <SectionFog edges="top" />
      <Motes className="opacity-50" count={16} />
      <DepthChapter tone="ember">
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-14 mb-14 md:mb-20">
            <Reveal as="div" className="lg:col-span-5">
              <p className="font-editorial uppercase tracking-[0.4em] text-[11px] md:text-xs text-[var(--color-amber-glow)] mb-3 flex items-center gap-2.5">
                <IconOpenBook size={15} className="text-brass" />{t.eyebrow}
              </p>
              <h2 className="font-display title-medieval text-4xl md:text-6xl text-ivory leading-[1.04]">{t.title}</h2>
              <div className="divider-brass w-24 mt-5" />
            </Reveal>
            <Reveal as="div" className="lg:col-span-7 lg:pt-3 space-y-5">
              <p className="font-editorial text-lg md:text-xl text-ivory-soft leading-relaxed">{t.intro1}</p>
              <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed">{t.intro2}</p>
            </Reveal>
          </div>

          {/* Au-delà des clichés: the chapter's manifesto + examples */}
          <div className="grid lg:grid-cols-12 gap-6 lg:gap-12 items-end mb-10 md:mb-14">
            <CinematicReveal className="lg:col-span-6">
              <p className="font-editorial uppercase tracking-[0.3em] text-xs mb-3 text-brass">{t.appelEyebrow}</p>
              <h3 className="font-display title-medieval text-3xl md:text-5xl text-ivory leading-[1.05]">{t.appelTitle}</h3>
              <div className="divider-brass w-20 mt-5" />
            </CinematicReveal>
            <CinematicReveal className="lg:col-span-6">
              <p className="font-editorial text-base md:text-lg leading-relaxed text-ivory-soft lg:pb-1">{t.appelBody}</p>
            </CinematicReveal>
          </div>
          <Stagger className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6" stagger={0.07}>
            {EXAMPLES.map((ex) => (
              <StaggerItem
                key={ex.titleFR}
                as="article"
                distance={64}
                className="glass-light rounded-card p-6 transition duration-300 hover:-translate-y-1 hover:bg-brass/10"
              >
                <h4 className="font-display title-medieval text-base md:text-lg mb-2 text-ivory">{lang === 'FR' ? ex.titleFR : ex.titleEN}</h4>
                <p className="font-editorial text-sm leading-relaxed text-ivory-soft">{lang === 'FR' ? ex.bodyFR : ex.bodyEN}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </DepthChapter>
    </section>
  );
};

// ─── Caravanes & Saltimbanques (thème 2026) ──────────────────────────
export const ThemeCaravanesSection: React.FC = () => {
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      <SectionFog edges="top" />
      <Motes className="opacity-50" count={16} />
      <DepthChapter tone="ember">
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-14 mb-12 md:mb-16">
            <CinematicReveal className="lg:col-span-5">
              <p className="font-editorial uppercase tracking-[0.35em] text-[11px] md:text-xs text-brass mb-3 flex items-center gap-2.5">
                <IconWagon size={15} />{t.themeEyebrow}
              </p>
              <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory leading-[1.05] mb-5">{t.themeTitle}</h2>
              <div className="divider-brass w-20 mb-6" />
              <p className="font-editorial text-lg md:text-2xl text-ivory leading-relaxed">{t.themeLead}</p>
            </CinematicReveal>
            <CinematicReveal className="lg:col-span-7 lg:pt-3 space-y-6">
              <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed">{t.themeBody1}</p>
              <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed">{t.themeBody2}</p>
            </CinematicReveal>
          </div>

          {/* Culture invitée + continuité des thèmes */}
          <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
            <CinematicReveal as="article" className="glass-light rounded-card p-6 md:p-8">
              <p className="font-editorial uppercase tracking-[0.3em] text-xs text-brass mb-3">{t.partnerEyebrow}</p>
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
  );
};

// ─── Aux origines du cirque (timeline) ───────────────────────────────
export const OriginesCirqueSection: React.FC = () => {
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      <SectionFog edges="top" />
      <DepthChapter tone="ember">
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <SectionBand
            icon={<IconJester size={15} />}
            eyebrow={t.hookEyebrow}
            title={t.hookTitle}
            lead={t.hookLead}
          />
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
        </div>
      </DepthChapter>
    </section>
  );
};

// ─── Une époque aux réalités variées ─────────────────────────────────
export const EpoqueSection: React.FC = () => {
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      <SectionFog edges="top" />
      <Motes className="opacity-50" count={16} />
      <DepthChapter tone="ember">
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-14">
            <div className="lg:col-span-4">
              <CinematicReveal className="lg:sticky lg:top-28">
                <p className="font-editorial uppercase tracking-[0.35em] text-[11px] md:text-xs text-brass mb-3 flex items-center gap-2.5">
                  <IconWorld size={15} />{t.epoqueEyebrow}
                </p>
                <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory leading-[1.05]">{t.epoqueTitle}</h2>
                <div className="divider-brass w-20 mt-5" />
              </CinematicReveal>
            </div>
            <CinematicReveal as="div" className="lg:col-span-8">
              <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed mb-5">{t.epoque1}</p>
              <ul className="space-y-3 font-editorial text-base text-ivory-soft mb-5">
                {[t.epoqueEurope, t.epoqueVikings, t.epoqueAndes].map((li) => (
                  <li key={li.slice(0, 24)} className="flex gap-3">
                    <span aria-hidden className="text-brass text-[9px] leading-none mt-[0.55em]">◆</span>
                    <span>{li}</span>
                  </li>
                ))}
              </ul>
              <p className="font-editorial text-base text-brass leading-relaxed">{t.epoqueClose}</p>
            </CinematicReveal>
          </div>
        </div>
      </DepthChapter>
    </section>
  );
};

// ─── Formations et démonstrations ────────────────────────────────────
// The CSS-3D codex is gone (design call, 2026-07-28): the craft cards
// carry the section now, each with its own engraved-metal medallion.
export const FormationsSection: React.FC = () => {
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      <Parallax speed={0.12} className="absolute inset-0 -z-10">
        <div
          className="absolute inset-x-0 top-1/4 h-1/2"
          style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(184,106,42,0.10), transparent 70%)' }}
        />
      </Parallax>
      <DepthChapter tone="ember">
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <SectionBand
            icon={<IconForge size={15} />}
            eyebrow={t.formationsEyebrow}
            title={t.formationsTitle}
            lead={t.formationsLead}
          />
          <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4" stagger={0.05}>
            {FORMATIONS.map(({ name, Icon }) => (
              <StaggerItem
                key={name.FR}
                as="article"
                distance={56}
                className="glass-light rounded-card p-5 md:p-7 hover:bg-brass/10 transition group hover:-translate-y-1 duration-300"
              >
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border border-brass/40 bg-gradient-to-b from-brass/15 to-transparent flex items-center justify-center mb-4 group-hover:border-brass/70 group-hover:shadow-[0_0_24px_rgba(184,106,42,0.25)] transition duration-300">
                  <Icon size={30} className="text-brass group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h3 className="font-display title-medieval text-base md:text-lg text-ivory mb-1.5 group-hover:text-brass transition">
                  {name[lang]}
                </h3>
                <p className="font-editorial text-xs text-ivory-soft">{t.detailsTBD}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </DepthChapter>
    </section>
  );
};

const ApprendrePage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  const hint = lang === 'FR' ? 'Descendez' : 'Scroll';
  return (
    <>
      {!embedded && <SEO title={t.title} description={t.intro1} />}
      {!embedded && <ScrollProgress />}

      {/* ── Pinned cinematic opening, forge fire scrubbed by scroll.
            Skipped when embedded as a chapter inside Histoire & Apprendre. ── */}
      {!embedded && (
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
      )}

      {!embedded && (
        <PageHeader
          eyebrow={t.eyebrow}
          titleA={t.title}
          intro={t.intro1}
          orbImage="/wix/apprendre/88ea932f.jpg"
          orbImagePosition="center"
        />
      )}

      <ApprendreChapterSection />
      <ThemeCaravanesSection />
      <OriginesCirqueSection />
      <EpoqueSection />
      <FormationsSection />
    </>
  );
};

const FR = {
  home: 'Accueil', eyebrow: 'Apprendre, c’est traverser les siècles', title: 'Apprendre',
  intro1: 'L’éducation fait partie des missions du FMM, car elle est la base de la promotion de la résilience. Nous cherchons à instruire via les perspectives historiques et à enrichir la culture générale.',
  intro2: 'Au-delà du savoir trivial, nous amenons les gens à parler au présent en se posant la question : « Lesquels de ces savoirs ancestraux sont-ils encore pertinents aujourd’hui, et pourront l’être encore, pour nous aider à traverser les grands changements à venir ? »',
  appelEyebrow: 'Appel à un voyage', appelTitle: 'Au-delà des clichés, redécouvrir le médiéval',
  appelBody: 'Dans les récits populaires, l’époque médiévale est souvent associée aux guerres, à la violence et aux luttes de pouvoir. Bien que ces aspects aient existé, ils ne définissent pas à eux seuls cette période. Le FMM propose d’élargir le regard et de mettre en avant les trésors moins connus du quotidien médiéval, dont certains sont encore pratiqués aujourd’hui hors de la culture commerciale.',
  themeEyebrow: 'Le thème de l’année · 2026', themeTitle: 'Caravanes & Saltimbanques',
  themeLead: 'Après les Vikings, la route continue. Cette année, le FMM rend hommage aux peuples nomades, aux grandes salles de banquet et aux artistes itinérants qui ont donné naissance au cirque.',
  themeBody1: 'Imaginez les caravanes qui s’arrêtent à la tombée du jour, les feux qui s’allument, les tables qui se dressent. Tout autour, les acrobates s’élancent, les jongleurs lancent leurs torches, les conteurs prennent la parole et les musiciens font tourner la ronde. C’est cet esprit que nous célébrons : celui des saltimbanques qui portaient la fête de village en village.',
  themeBody2: 'Le banquet devient le cœur battant du festival. Comme dans les grandes salles d’autrefois, vous mangez, vous buvez, vous écoutez les bardes, et le spectacle se déroule entre les services. Une expérience à vivre en tablée, au rythme des tambours et des éclats de rire.',
  hookEyebrow: 'Petit détour historique', hookTitle: 'Aux origines du cirque',
  hookLead: 'Le mot « saltimbanque » est plus jeune que le Moyen Âge, mais l’art, lui, est très ancien. Voici quelques repères pour situer d’où vient la fête.',
  timeline: [
    { era: 'Antiquité', title: 'Le cirque romain', body: 'À Rome, le Circus Maximus accueille des courses de chars devant des dizaines de milliers de spectateurs. Mimes et histrions amusent déjà la foule.' },
    { era: 'XIIᵉ siècle', title: 'Jongleurs et ménestrels', body: 'Sur les grandes foires, comme celles de Champagne, jongleurs, bateleurs et ménestrels enchaînent acrobaties, musique et tours d’adresse, de ville en ville.' },
    { era: '1316', title: 'Le fou à la cour', body: 'Les registres royaux français mentionnent pour la première fois un fou de cour. Bouffons et conteurs animent les salles de banquet des seigneurs.' },
    { era: '1768', title: 'Le cirque moderne', body: 'À Londres, Philip Astley réunit cavaliers, acrobates, funambules et clowns sur une piste ronde. Le cirque tel que nous le connaissons est né.' },
  ],
  partnerEyebrow: 'Une culture invitée', partnerTitle: 'L’association Rome de Montréal',
  partnerBody: 'Cette année, nous accueillons l’association Rome de Montréal, qui vient partager et représenter la culture rom (romani) au festival. Une présence vivante, portée par celles et ceux qui la font vibrer aujourd’hui.',
  continuityTitle: 'Les Vikings ne sont pas partis. Les chevaliers non plus.',
  continuityBody: 'Chaque année, nous bonifions le festival : un nouveau thème s’ajoute, mais les anciens restent. Rien ne disparaît, tout s’additionne.',
  continuityHullsborg: 'Si vous avez aimé l’expérience viking l’an dernier, vous serez encore servis. La troupe Hullsborg vous attend, tambours et esprit du Nord compris.',
  epoqueEyebrow: 'Multiples mondes', epoqueTitle: 'Une époque aux réalités variées',
  epoque1: 'L’histoire médiévale ne peut être résumée en un seul récit : les réalités différaient d’une région à l’autre et d’une période à l’autre. Dans certaines sociétés, les journées de travail étaient rudes et axées sur les besoins fondamentaux, 10 à 12 heures par jour. Mais ailleurs, le rythme de vie pouvait être moins intense qu’aujourd’hui.',
  epoqueEurope: 'En Europe, les fêtes religieuses rythmaient l’année en offrant de nombreux jours de repos, jusqu’à 80-100 jours chômés par an dans certaines régions, contre une trentaine pour les travailleurs modernes (estimation : Gregory Clark, A Farewell to Alms).',
  epoqueVikings: 'Chez les Vikings, les longs hivers étaient dédiés aux contes, aux festivités et aux préparations pour l’été.',
  epoqueAndes: 'Dans les Andes, les systèmes agricoles en terrasses (Mita) répondaient aux besoins de la communauté avec une organisation méthodique.',
  epoqueClose: 'Ces nuances montrent à quel point cette époque était riche et complexe, loin des généralités souvent évoquées.',
  formationsEyebrow: 'Au programme', formationsTitle: 'Formations et démonstrations',
  formationsLead: 'Huit métiers vivants, démontrés sous vos yeux par des artisans qui les pratiquent encore. Le détail de chaque atelier arrive avec la programmation.',
  detailsTBD: 'Détails à venir',
};
const EN = {
  home: 'Home', eyebrow: 'Learning across centuries', title: 'Learn',
  intro1: 'Education is part of FMM’s mission, it is the foundation of resilience. We seek to instruct through historical perspectives and to enrich general culture.',
  intro2: 'Beyond trivia, we bring people back to the present by asking: "Which of these ancestral knowings are still relevant today, and will continue to be, to help us navigate the great changes to come?"',
  appelEyebrow: 'A journey through cultures', appelTitle: 'Beyond the clichés, rediscovering the medieval',
  appelBody: 'In popular tellings, the medieval era is often tied to wars, violence and power struggles. While those aspects existed, they do not define the period alone. FMM proposes to broaden the view and highlight the lesser-known treasures of medieval daily life, some of which are still practiced today outside of commercial culture.',
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
  epoqueEurope: 'In Europe, religious feasts paced the year with many rest days, up to 80–100 days off annually in some regions, vs roughly 30 days for modern workers (estimate: Gregory Clark, A Farewell to Alms).',
  epoqueVikings: 'Among the Vikings, long winters were devoted to storytelling, festivities and summer preparations.',
  epoqueAndes: 'In the Andes, terraced agricultural systems (Mita) met community needs through methodical organisation.',
  epoqueClose: 'These nuances show how rich and complex this era was, far from the generalities often invoked.',
  formationsEyebrow: 'On the program', formationsTitle: 'Workshops and demonstrations',
  formationsLead: 'Eight living crafts, demonstrated before your eyes by artisans who still practice them. Details for each workshop arrive with the program.',
  detailsTBD: 'Details to come',
};

export default ApprendrePage;
