import React from 'react';
import { motion } from 'framer-motion';
import {Camera, Users} from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { Reveal, Stagger, StaggerItem, ChapterIntro, ScrollProgress, Parallax } from '../components/scroll';
import { Motes } from '../components/marche/effects';
import { SectionFog } from '../components/marche/atmospherics';

// Team — cloned from Wix /histoire "L'organisation".
const TEAM = [
  { name: 'Tristan Côté-Hotte',  role: { FR: 'Direction générale · Fondateur',                                  EN: 'General direction · Founder' },                          bioFR: '+10 à l’épée, +10 à cheval, +10 en hydromel.',                                                                bioEN: '+10 to sword, +10 to horse, +10 to mead.' },
  { name: 'Jesse Dippy',         role: { FR: 'Kiosques et marchands',                                            EN: 'Kiosks and vendors' },                                   bioFR: 'Pirate dans l’âme, travailleuse et tanneuse de cuir. Artiste traditionnelle, spécialiste en costumes médiévaux historiques et fantaisie.', bioEN: 'Pirate at heart, leather worker and tanner. Traditional artist, specialist in historical and fantasy medieval costumes.' },
  { name: 'Maïté Fournel',       role: { FR: 'Secrétariat · Bar · Structure',                                    EN: 'Secretary · Bar · Structure' },                          bioFR: 'D’une bonté sans précédent — Maïté s’occupe que tout roule comme sur des charrettes.',                       bioEN: 'Unprecedented kindness — Maïté keeps everything running smoothly.' },
  { name: 'Alex T. St-Laurent',  role: { FR: 'Porte-parole · Site web · Vidéo · Marketing',                      EN: 'Spokesperson · Web · Video · Marketing' },               bioFR: 'Magicien des électroniques. Aubergiste, porte-parole du festival : site web, vidéos, graphisme, recherche, développement, marketing.', bioEN: 'Wizard of electronics. Innkeeper, festival spokesperson: web, video, graphics, R&D, marketing.' },
  { name: 'Océane Leclair',      role: { FR: 'Artisans',                                                          EN: 'Artisans' },                                              bioFR: 'Personne attentionnée et bienveillante qui s’assure que tous soient bien et confortables.',                  bioEN: 'A caring, attentive person who ensures everyone is comfortable and well.' },
  { name: 'Léna Lebozec',        role: { FR: 'Photographie · Réseaux sociaux · Graphisme',                       EN: 'Photography · Socials · Graphics' },                     bioFR: 'Photographe joviale aux multiples talents.',                                                                  bioEN: 'A jovial photographer of many talents.' },
  { name: 'Éric "Pitch" Pichette',role: { FR: 'Musique · Son · Spectacles · Programmation',                       EN: 'Music · Sound · Shows · Programming' },                  bioFR: 'Anime le festival depuis le tout début. Personne au feu roulant et au fun inépuisable.',                     bioEN: 'Has animated the festival since the very start. Endless energy, endless fun.' },
  { name: 'Mikaël Lamarche',     role: { FR: 'Bâtisseur — palissades, scène, structures bois',                   EN: 'Builder — palisades, stage, wood structures' },          bioFR: 'Si Maïté apporte la structure figurative, son compagnon apporte la structure physique. Le festival tient littéralement debout grâce à lui.', bioEN: 'If Maïté brings the figurative structure, her partner brings the physical one. The festival literally stands thanks to him.' },
  { name: 'Carilynn',            role: { FR: 'Palefrenière · Clinique équestre · Accueil',                       EN: 'Stablemaster · Equestrian clinic · Welcome' },           bioFR: 'Dire que notre palefrenière aime les animaux est un euphémisme. Chiens, chats, chevaux — il n’y a rien à son épreuve.', bioEN: 'Saying our stablemaster loves animals is an understatement. Dogs, cats, horses — nothing fazes her.' },
  { name: 'Sammy',               role: { FR: 'Membre de l’équipe',                                                EN: 'Team member' },                                          bioFR: 'Sammy est vraiment cool.',                                                                                    bioEN: 'Sammy is really cool.' },
];

// Photo credits — names listed on the Wix page.
const CREDITS = [
  'Lena Photos & Aventures',
  'Alex T. St-Laurent',
  'Le Salon des Inconnus',
  'Lievre Photo',
  'Clair du Lièvre',
  'Océane Leclair',
];

const YEARS = [2021, 2022, 2023, 2024, 2025];

// Curated subset of the 95 archive photos pulled from the live Wix
// CDN into /public/wix/histoire/. Mix of portrait + landscape JPGs in
// the 300–450KB range. Used in the masonry gallery below.
const GALLERY = [
  '722a8ce4.jpg','89562353.jpg','41b394c7.jpg','75354f34.jpg',
  '3708cb28.jpg','0ca093b1.jpg','c90e5727.jpg','61a24378.jpg',
  'f688cefd.jpg','7daad709.jpg','472c1e7c.jpg','1d46ae55.jpg',
  'b61a5675.jpg','77c6727f.jpg','e9ed2ea5.jpg','6b19a593.jpg',
  '1e52cafb.jpg','79cc4362.jpg','8f8a1178.jpg','03b1fe30.jpg',
];

const HistoirePage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  return (
    <>
      {!embedded && <SEO title={t.title} description={t.intro1} />}
      {!embedded && <ScrollProgress />}
      {embedded ? (
        <section className="relative pt-20 md:pt-28 pb-2">
          <div className="max-w-screen-xl mx-auto px-4 md:px-8">
            <p className="font-editorial italic uppercase tracking-[0.4em] text-[11px] md:text-xs text-[var(--color-amber-glow)] mb-3">{t.eyebrow}</p>
            <h2 className="font-display title-medieval text-4xl md:text-6xl text-ivory leading-[1.04]">{t.title}</h2>
            <div className="divider-brass w-24 mt-5" />
          </div>
        </section>
      ) : (
        <PageHeader
          eyebrow={t.eyebrow}
          titleA={t.title}
          intro={t.intro1}
          orbImage="/wix/histoire/03b1fe30.jpg"
          orbImagePosition="center"
        />
      )}

      {/* Ni GN ni reconstitution — what the FMM IS */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <Motes className="opacity-60" count={20} />
        <SectionFog edges="top" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-8">
          <ChapterIntro eyebrow={t.niEyebrow} title={t.niTitle} className="mb-8" />
          <Reveal as="div" className="space-y-5">
            <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed">{t.ni1}</p>
            <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed">{t.ni2}</p>
            <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed">{t.ni3}</p>
          </Reveal>
        </div>
      </section>

      {/* Year navigation — placeholder gallery (real photos in /Downloads/FMM 20XX dirs) */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <Reveal className="text-center mb-10 md:mb-14 max-w-2xl mx-auto">
            <p className="font-editorial italic text-stone uppercase tracking-[0.3em] text-xs mb-3">
              <Camera size={12} className="inline mr-1.5 -mt-0.5" />{t.galleryEyebrow}
            </p>
            <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory mb-3">{t.galleryTitle}</h2>
            <div className="divider-brass w-20 mx-auto mb-4" />
            <p className="font-editorial text-base md:text-lg text-ivory-soft">{t.galleryLead}</p>
          </Reveal>
          <Stagger className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-10" stagger={0.07}>
            {YEARS.map((y) => (
              <StaggerItem
                key={y}
                as="div"
                className="glass-light rounded-card p-6 md:p-8 text-center transition group hover:bg-brass/10 hover:-translate-y-1 duration-300"
              >
                <a href={`#year-${y}`} className="block">
                  <p className="font-display title-medieval text-3xl md:text-4xl text-brass group-hover:text-brass-soft transition">{y}</p>
                  <p className="font-editorial italic text-xs text-ivory-soft mt-1">{t.edition}</p>
                </a>
              </StaggerItem>
            ))}
          </Stagger>
          {/* Masonry gallery — cinematic clip-path reveals */}
          <div className="columns-2 md:columns-3 lg:columns-4 gap-3 md:gap-4 [&>*]:mb-3 md:[&>*]:mb-4 mb-12">
            {GALLERY.map((file, i) => (
              <motion.figure
                key={file}
                initial={{ opacity: 0, y: 22, clipPath: 'inset(8% 0 0 0)' }}
                whileInView={{ opacity: 1, y: 0, clipPath: 'inset(0% 0 0 0)' }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.7, delay: (i % 4) * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="break-inside-avoid overflow-hidden rounded-card border group"
              >
                <img decoding="async" src={`/wix/histoire/${file}`} alt="" loading="lazy"
                  className="w-full h-auto block group-hover:scale-105 transition-transform duration-700" />
              </motion.figure>
            ))}
          </div>

          <Reveal className="text-center">
            <p className="font-editorial italic text-stone uppercase tracking-[0.3em] text-xs mb-3">{t.creditsEyebrow}</p>
            <p className="font-editorial text-base text-ivory-soft">{CREDITS.join(' · ')}</p>
          </Reveal>
        </div>
      </section>

      {/* L'équipe */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <Motes className="opacity-50" count={18} />
        <Parallax speed={0.12} className="absolute inset-0 -z-10">
          <div
            className="absolute inset-x-0 top-1/4 h-1/2"
            style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(184,106,42,0.10), transparent 70%)' }}
          />
        </Parallax>
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <Reveal className="text-center mb-10 md:mb-14 max-w-2xl mx-auto">
            <p className="font-editorial italic text-stone uppercase tracking-[0.3em] text-xs mb-3">
              <Users size={12} className="inline mr-1.5 -mt-0.5" />{t.teamEyebrow}
            </p>
            <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory mb-3">{t.teamTitle}</h2>
            <div className="divider-brass w-20 mx-auto mb-4" />
            <p className="font-editorial italic text-base md:text-lg text-ivory-soft">{t.teamLead}</p>
          </Reveal>
          <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5" stagger={0.05} amount={0.1}>
            {TEAM.map((m) => (
              <StaggerItem
                key={m.name}
                as="article"
                className="glass-light rounded-card p-6 md:p-7 flex flex-col transition-transform duration-300 hover:-translate-y-1"
              >
                <h3 className="font-display title-medieval text-lg md:text-xl text-ivory mb-1">{m.name}</h3>
                <p className="font-editorial italic text-sm text-brass mb-3">{m.role[lang]}</p>
                <div className="divider-brass w-12 mb-3 opacity-60" />
                <p className="font-editorial text-sm text-ivory-soft leading-relaxed">{lang === 'FR' ? m.bioFR : m.bioEN}</p>
              </StaggerItem>
            ))}
          </Stagger>
          <Reveal>
            <p className="font-editorial italic text-base md:text-lg text-ivory-soft text-center max-w-2xl mx-auto mt-12">
              {t.teamClose}
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
};

const FR = {
  home: 'Accueil', eyebrow: 'Notre histoire', title: '4 ans d’histoire',
  intro1: 'Fondé en 2021, le FMM a surmonté l’épreuve de naître pendant la pandémie pour, contre toute attente, devenir l’un des plus grands festivals médiévaux du Québec. Une programmation unique et variée, une formule jusqu’ici inexplorée parmi les festivals d’ici.',
  niEyebrow: 'Une formule unique',
  niTitle: 'Ni G-N, ni reconstitution',
  ni1: 'Le Festival Médiéval de Montpellier est une expérience festive en nature — une activité fort différente d’un GN (jeu de rôle grandeur nature), d’un salon de commerce dans un centre de congrès, ou même d’un événement de reconstitution historique strict.',
  ni2: 'Toutes ces activités offrent une immersion dans le monde médiéval, mais avec des perspectives distinctes. Le GN regroupe des passionnés dans un scénario précis avec des éléments fantastiques. La reconstitution historique se base sur les écrits et vestiges historiques avec un respect extrême de la précision. Le salon de commerce, lui, est souvent en ville pour que les passionnés découvrent et achètent les produits d’artisans.',
  ni3: 'Le FMM tient à se démarquer des autres événements eurocentristes en invitant ses participants à apporter leur héritage. Bien que l’Europe soit sur-représentée dans l’axiome « médiéval », l’époque dite médiévale s’est déroulée partout dans le monde — tous sont bienvenus à exhiber leur culture, qu’ils viennent d’Orient, d’Afrique, d’Amérique ou de toute région dont l’époque médiévale est peu connue du grand public.',
  galleryEyebrow: 'Archives photos', galleryTitle: 'Plongez dans nos archives',
  galleryLead: 'Cinq éditions, des milliers de visiteurs, des centaines de photos. Galeries en cours de mise en ligne pour 2026.',
  edition: 'Édition',
  creditsEyebrow: 'Crédits photo',
  teamEyebrow: 'L’organisation', teamTitle: 'L’équipe',
  teamLead: 'Faites défiler pour nous connaître. Le FMM est organisé par des bénévoles qui donnent énormément de leur temps pour créer un festival riche, ludique, inclusif, varié et puissant.',
  teamClose: 'Sans cette équipe — et tous les bénévoles qui s’y joignent les jours du festival — rien de tout cela n’existerait.',
};
const EN = {
  home: 'Home', eyebrow: 'Our story', title: '4 years of history',
  intro1: 'Founded in 2021, FMM survived being born during the pandemic to become — against all odds — one of Quebec’s largest medieval festivals. A unique, varied program; a formula previously unexplored among local festivals.',
  niEyebrow: 'A unique formula',
  niTitle: 'Neither LARP nor re-enactment',
  ni1: 'Festival Médiéval de Montpellier is a festive experience in nature — a very different activity from a LARP (live-action role-play), a trade show in a convention centre, or even a strict historical re-enactment event.',
  ni2: 'All these offer immersion into the medieval world, but with distinct perspectives. LARP gathers enthusiasts in a specific scenario with fantasy elements. Historical re-enactment is based on writings and historical remains with extreme precision. The trade show, in turn, is usually in the city so enthusiasts can discover and buy artisans’ products.',
  ni3: 'FMM stands apart from other Eurocentric events by inviting participants to bring their own heritage. Though Europe is over-represented in the "medieval" axiom, the medieval era unfolded all across the world — all are welcome to showcase their culture, whether they come from the East, Africa, the Americas, or any region whose medieval era is little known to the general public.',
  galleryEyebrow: 'Photo archives', galleryTitle: 'Step into the archives',
  galleryLead: 'Five editions, thousands of visitors, hundreds of photos. Galleries being uploaded for 2026.',
  edition: 'Edition',
  creditsEyebrow: 'Photo credits',
  teamEyebrow: 'The organisation', teamTitle: 'The team',
  teamLead: 'Scroll to get to know us. FMM is organised by volunteers who give enormously of their time to create a rich, playful, inclusive, varied and powerful festival.',
  teamClose: 'Without this team — and all the volunteers who join during festival days — none of this would exist.',
};

export default HistoirePage;
