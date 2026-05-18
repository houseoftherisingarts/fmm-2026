import React from 'react';
import { motion } from 'framer-motion';
import {Hammer} from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';

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
  return (
    <>
      <SEO title={t.title} description={t.intro1} />
      <PageHeader
        eyebrow={t.eyebrow}
        titleA={t.title}
        intro={t.intro1}
        orbImage="/wix/apprendre/88ea932f.jpg"
        orbImagePosition="center"
      />

      {/* Light editorial body — Au-delà des Clichés */}
      <section className="relative py-20 md:py-28 overflow-hidden" style={{ backgroundColor: 'var(--color-mist)' }}>
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <p className="font-editorial italic uppercase tracking-[0.3em] text-xs mb-3" style={{ color: 'var(--color-mist-deep)' }}>{t.appelEyebrow}</p>
            <h2 className="font-display title-medieval text-3xl md:text-5xl mb-3" style={{ color: 'var(--color-midnight-deep)' }}>{t.appelTitle}</h2>
          </div>
          <p className="font-editorial text-base md:text-xl leading-relaxed max-w-3xl mx-auto mb-12 text-center" style={{ color: 'var(--color-midnight-deep)' }}>
            {t.appelBody}
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {EXAMPLES.map((ex, i) => (
              <motion.article
                key={ex.titleFR}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5, delay: (i % 3) * 0.06 }}
                className="/8 border border-midnight-deep/15 rounded-card p-6"
              >
                <h3 className="font-display title-medieval text-base md:text-lg mb-2" style={{ color: 'var(--color-midnight-deep)' }}>{lang === 'FR' ? ex.titleFR : ex.titleEN}</h3>
                <p className="font-editorial text-sm leading-relaxed" style={{ color: 'var(--color-midnight-deep)' }}>{lang === 'FR' ? ex.bodyFR : ex.bodyEN}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Une époque aux réalités variées */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-8">
          <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-3 text-center">{t.epoqueEyebrow}</p>
          <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory text-center mb-6">{t.epoqueTitle}</h2>
          <div className="divider-brass w-20 mx-auto mb-8" />
          <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed mb-5">{t.epoque1}</p>
          <ul className="space-y-3 font-editorial text-base text-ivory-soft mb-5">
            <li className="flex gap-3"><span className="text-brass mt-1">·</span>{t.epoqueEurope}</li>
            <li className="flex gap-3"><span className="text-brass mt-1">·</span>{t.epoqueVikings}</li>
            <li className="flex gap-3"><span className="text-brass mt-1">·</span>{t.epoqueAndes}</li>
          </ul>
          <p className="font-editorial italic text-base text-ivory-soft leading-relaxed">{t.epoqueClose}</p>
        </div>
      </section>

      {/* Formations et démonstrations grid */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10 md:mb-14">
            <p className="font-editorial italic text-stone uppercase tracking-[0.3em] text-xs mb-3">{t.formationsEyebrow}</p>
            <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory mb-3">{t.formationsTitle}</h2>
            <div className="divider-brass w-20 mx-auto" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {FORMATIONS.map((f, i) => (
              <motion.article
                key={f.name.FR}
                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.4, delay: (i % 4) * 0.05 }}
                className="glass-light rounded-card p-5 md:p-6 hover:bg-brass/10 transition group"
              >
                <Hammer size={20} className="text-brass mb-3" />
                <h3 className="font-display title-medieval text-base md:text-lg text-ivory mb-1.5 group-hover:text-brass transition">
                  {f.name[lang]}
                </h3>
                <p className="font-editorial italic text-xs text-ivory-soft">{t.detailsTBD}</p>
              </motion.article>
            ))}
          </div>
        </div>
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
