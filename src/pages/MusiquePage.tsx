import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { addLocale } from '../lib/locale';
import { useCaravanPage } from '../lib/useCaravanPage';
import { watchGroupes, type GroupeMusical, type GroupeJour } from '../firebase/groupesMusicaux';
import SEO from '../components/SEO';
import BestiaryBoard from '../components/musique/BestiaryBoard';
import PageHeader from '../components/layout/PageHeader';
import { Reveal, Stagger, StaggerItem, ChapterIntro, ScrollProgress, Parallax } from '../components/scroll';
import { Motes } from '../components/marche/effects';
import { SectionFog, DisplayTitle } from '../components/marche/atmospherics';

// ─── Band data ───────────────────────────────────────────────────────
// 2026 lineup (cloned from the Wix /musique page). When the artist has
// a transparent-PNG portrait it goes here too: the component will
// render with the bestiary frame ornaments unobstructed.

interface Band {
  name:        string;
  image?:      string;          // absent tant que le portrait n'est pas fourni → panneau orné en attente
  imageAlt?:   string;
  spotify?:    string;
  website?:    string;
  bioFR:       string;
  bioEN:       string;
  jour?:       'vendredi' | 'samedi' | 'dimanche'; // groupes « à l'affiche » seulement
  annee?:      number;          // groupes « archives » seulement : petite étiquette sur la vignette
}

const JOUR_ORDRE: Record<GroupeJour, number> = { vendredi: 0, samedi: 1, dimanche: 2 };

// 🚨 Ces six groupes sont ceux des ÉDITIONS PASSÉES. La section les
// présentait comme « Groupes 2026 » par erreur : la programmation 2026
// n'était pas encore annoncée. Photos réassignées le 2026-08-03 selon
// les corrections d'Alex (chaque portrait montre le bon groupe).
const BANDS_ARCHIVES: Band[] = [
  {
    name:    'Skarazula',
    image:   '/wix/musique/2c6a22e9.jpg',
    website: 'https://www.skarazula.com',
    bioFR: 'Les musiciens de Skarazula cultivent depuis des années un intérêt pour la musique ancienne et poursuivent leurs recherches dans l’univers foisonnant de la musique médiévale. Plus d’un instrument dans leur sac, beaucoup confectionnés par le groupe lui-même.',
    bioEN: 'Skarazula’s musicians have cultivated for many years an interest in early music and continue their research into the rich, fascinating world of medieval music. More than one instrument in their bag, many handmade by the group itself.',
  },
  {
    name:  'L’Harfang',
    image: '/wix/musique/407628b7.jpg',
    bioFR: 'Jouant pour le festival depuis le tout début, L’Harfang est un duo de musique folklorique, médiévale, baroque et balfolk moderne. Vielle à roue (Alison Gowan) et musette 16 pouces (Éric Pichette).',
    bioEN: 'Playing the festival since the very beginning, L’Harfang is a folk/medieval/baroque/balfolk duo led by hurdy-gurdy (Alison Gowan) and 16-inch musette bagpipe (Éric Pichette).',
  },
  {
    name:    'Mystic Projekt',
    image:   '/wix/musique/2bee56ee.jpg',
    website: 'https://mysticprojekt.bandcamp.com',
    bioFR: 'Chants féminins à travers les époques et le monde. Composé des musiciens-clefs de Saltarello (transe nordique abitibienne), Mystic Projekt explore les répertoires folkloriques celte, scandinave, est-européen, les ballades médiévales et les mélodies orientales.',
    bioEN: 'Feminine voices across eras and continents. Built around the key musicians of Saltarello (Nordic-trance, Abitibi), Mystic Projekt explores Celtic, Scandinavian and Eastern European folk repertoires, medieval ballads and oriental melodies.',
  },
  {
    name:  'Arrünn',
    // Plan du vidéoclip « Sleipnir » : les cavaliers dans les hautes
    // herbes. C'est LA photo du groupe, dixit Alex (2026-08-03).
    image: '/wix/musique/715b30c7.png',
    bioFR: 'Groupe de musique néo-trad’ folk viking du clan Managarm. « Laissez-vous emmener par le talent, la magie et l’ivresse de ce merveilleux groupe. Un travail soigné tant par le son que par l’image. La passion, la culture et les voyages se ressentent par des lyrics portés par des voix envoûtantes. » (Tristan Reille)',
    bioEN: 'Neo-trad Viking folk band from clan Managarm. "Let yourself be carried away by the talent, magic and intoxication of Arrünn. Careful work on stage and behind the camera. Passion, culture and travel come through in lyrics carried by spellbinding voices." (Tristan Reille)',
  },
  {
    name:  'Trifolys',
    image: '/wix/musique/243cbf3c.jpg',
    bioFR: 'Explorateurs des racines profondes de la musique dans un contexte historique différent et connexe.',
    bioEN: 'Explorers of music’s deepest roots in a different yet adjacent historical context.',
  },
  {
    name:  'Canteraine',
    image: '/wix/musique/1c22d439.jpg',
    bioFR: 'Canteraine (de l’occitan : « lieu où chantent les grenouilles »). Trio féminin alliant tradition française, instruments anciens et écriture contemporaine.',
    bioEN: 'Canteraine (from Occitan: "place where the frogs sing"). Female trio bringing together French tradition, early instruments and contemporary writing.',
  },
];

// ── L'affiche 2026, par journée ─────────────────────────────────────
// Liste d'Éric Pichette. Orthographes et portraits vérifiés une seconde
// fois le 2026-08-12 à partir des sources officielles de chaque groupe
// (chaîne YouTube @BicOasis, nigoune.com, Bandcamp de Svarica,
// troupecaravane.com) : « Troupe Caravane » porte le spectacle Fuego
// Bohemio, « BicOasis » s'écrit en un mot, « Sainte-Nigoune » au long,
// « Svarica » et non Svarika, « Las Noches Bohemias » au féminin.
// Encore en construction : d'autres noms s'ajouteront.
const AFFICHE_2026_BANDS: Band[] = [
  {
    name:    'Skarazula',
    jour:    'vendredi',
    image:   '/wix/musique/2c6a22e9.jpg',
    website: 'https://www.skarazula.com',
    bioFR: 'Les musiciens de Skarazula cultivent depuis des années un intérêt pour la musique ancienne et poursuivent leurs recherches dans l’univers foisonnant de la musique médiévale. Plus d’un instrument dans leur sac, plusieurs confectionnés par le groupe lui-même.',
    bioEN: 'Skarazula’s musicians have cultivated for many years an interest in early music and continue their research into the rich, fascinating world of medieval music. More than one instrument in their bag, many handmade by the group itself.',
  },
  {
    name:  'L’Harfang',
    jour:  'samedi',
    image: '/wix/musique/407628b7.jpg',
    bioFR: 'Jouant pour le festival depuis le tout début, L’Harfang est un duo de musique folklorique, médiévale, baroque et balfolk moderne. Vielle à roue (Alison Gowan) et musette 16 pouces (Éric Pichette).',
    bioEN: 'Playing the festival since the very beginning, L’Harfang is a folk/medieval/baroque/balfolk duo led by hurdy-gurdy (Alison Gowan) and 16-inch musette bagpipe (Éric Pichette).',
  },
  {
    name:    'Troupe Caravane',
    jour:    'vendredi',
    image:   '/wix/musique/troupe-caravane.webp',
    imageAlt:'Sarah Barbieux et Sylvain Chiasson en spectacle · Fuego Bohemio',
    website: 'http://www.troupecaravane.com',
    bioFR: 'Fondée à Montréal en 1980 par Sarah Barbieux, d’origine rom, la troupe CARAVANE porte le spectacle festif et participatif Fuego Bohemio : rumba flamenca, musique tzigane, chants et danses romanichelles. Sarah Barbieux (voix, danse, tambour) et Sylvain Chiasson (guitare, voix, flûte de pan, percussions).',
    bioEN: 'Founded in Montreal in 1980 by Sarah Barbieux, of Roma descent, the CARAVANE troupe brings its festive, participatory show Fuego Bohemio: rumba flamenca, Romani music, songs and bohemian dance. Sarah Barbieux (voice, dance, drum) and Sylvain Chiasson (guitar, voice, pan flute, percussion).',
  },
  {
    name:    'L’Ensemble Klezmer de Sainte-Nigoune',
    jour:    'vendredi',
    image:   '/wix/musique/sainte-nigoune.webp',
    imageAlt:'L’Ensemble Klezmer de Sainte-Nigoune, illustration de la formation',
    website: 'https://nigoune.com',
    bioFR: 'Depuis 2016, l’Ensemble Klezmer de Sainte-Nigoune fait la navette entre son village et la ville de Québec. Un répertoire fait pour la danse : hora, freylekhs, sher, khosidl, kolomeyka et bulgar, portés par violons, clarinette, accordéon, guitare et tambour.',
    bioEN: 'Since 2016, the Ensemble Klezmer de Sainte-Nigoune has travelled back and forth between its village and Quebec City. A repertoire built for dancing: hora, freylekhs, sher, khosidl, kolomeyka and bulgar, carried by fiddles, clarinet, accordion, guitar and drum.',
  },
  {
    name:    'BicOasis',
    jour:    'samedi',
    image:   '/wix/musique/bicoasis.webp',
    imageAlt:'BicOasis · Mathieu Lavoie au bouzouki et William Provost aux percussions',
    website: 'https://www.youtube.com/@BicOasis',
    bioFR: 'Rencontre de deux multi-instrumentistes : Mathieu Lavoie (bouzouki, morache, saz, vielle à roue) et William Provost (tambours, darbouka, tambour à lamelles, flûte à bourdon, cornemuse). Les traditions du monde entier passent au looper, aux synthés et aux pédales d’effets : une musique hybride, ancienne et moderne à la fois, organique et hypnotique.',
    bioEN: 'Two multi-instrumentalists meeting: Mathieu Lavoie (bouzouki, morache, saz, hurdy-gurdy) and William Provost (drums, darbuka, tongue drum, drone flute, bagpipe). Folk traditions from around the world run through loopers, synths and effect pedals: hybrid music, ancient and modern at once, organic and hypnotic.',
  },
  {
    name:  'Trifolys',
    jour:  'samedi',
    image: '/wix/musique/243cbf3c.jpg',
    bioFR: 'Explorateurs des racines profondes de la musique dans un contexte historique différent et connexe.',
    bioEN: 'Explorers of music’s deepest roots in a different yet adjacent historical context.',
  },
  {
    name:    'Svarica',
    jour:    'samedi',
    image:   '/wix/musique/svarica.webp',
    imageAlt:'Svarica · visuel officiel du groupe',
    website: 'https://svaricacordelian.bandcamp.com',
    bioFR: 'Né autour du feu du campement des Cordelian à Bicolline, Svarica marie rythmes tziganes, klezmer et ska festif : guitares, basse, hautbois, accordéon, trombone, batterie et percussions, avec un seul objectif, faire danser.',
    bioEN: 'Born around the fire of the Cordelian camp at Bicolline, Svarica weds Romani rhythms, klezmer and festive ska: guitars, bass, oboe, accordion, trombone, drums and percussion, with one goal, to make you dance.',
  },
  {
    // Groupe résident des soirées gitanes du Café Gitana, à Montréal.
    // Écusson maison en attendant la photo officielle (à demander à Éric
    // Pichette ou au groupe) : on ne pose jamais la photo d'un autre groupe.
    name:    'Las Noches Bohemias',
    jour:    'dimanche',
    image:   '/wix/musique/las-noches-bohemias.webp',
    imageAlt:'Las Noches Bohemias · écusson du festival en attendant le portrait officiel',
    bioFR: 'Musique gitane et bohème venue de Montréal, où le groupe anime les soirées du Café Gitana. Guitares, voix et rythmes de feu pour le dimanche des caravanes, à l’image du thème de cette édition.',
    bioEN: 'Bohemian music from Montreal, where the band lights up the Café Gitana evenings. Guitars, voices and fiery rhythms for caravan Sunday, true to this edition’s theme.',
  },
  {
    // Plusieurs formations portent ce nom : identité exacte à confirmer
    // avec Éric Pichette. Écusson maison et bio prudente d'ici là.
    name:    'Alhambra',
    jour:    'dimanche',
    image:   '/wix/musique/alhambra.webp',
    imageAlt:'Alhambra · écusson du festival en attendant le portrait officiel',
    bioFR: 'Un nom qui promet l’Andalousie et les routes du Sud. Alhambra clôt le dimanche sous le signe des Caravanes et Saltimbanques. Portrait officiel à venir.',
    bioEN: 'A name that promises Andalusia and the southern roads. Alhambra closes Sunday under the sign of Caravans and Mountebanks. Official portrait to come.',
  },
];

// ─── Page ────────────────────────────────────────────────────────────
const MusiquePage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;

  // ── Les groupes vivent dans Firestore (gérés par Éric Pichette dans
  //    l'admin, temps réel). Tant que la collection est vide, les
  //    listes statiques ci-dessus font foi : le jour où Éric ajoute son
  //    premier groupe, sa liste prend le dessus sans redéploiement.
  const [groupes, setGroupes] = useState<GroupeMusical[]>([]);
  useEffect(() => watchGroupes(setGroupes), []);

  const afficheLive = useMemo(() => {
    const surAffiche = groupes.filter((g) => g.statut === 'affiche');
    if (surAffiche.length === 0) return null;
    return surAffiche
      .sort((a, b) => {
        const ai = a.jour ? JOUR_ORDRE[a.jour] : 99;
        const bi = b.jour ? JOUR_ORDRE[b.jour] : 99;
        return ai !== bi ? ai - bi : a.ordre - b.ordre;
      })
      .map((g): Band => ({
        name:  g.nom,
        image: g.photoUrl,
        website: g.site,
        bioFR: g.bioFR,
        bioEN: g.bioEN,
        jour:  g.jour,
      }));
  }, [groupes]);

  const archivesLive = useMemo(() => {
    const arch = groupes.filter((g) => g.statut === 'archive');
    if (arch.length === 0) return null;
    return arch
      .sort((a, b) => (b.annee ?? 0) - (a.annee ?? 0) || a.ordre - b.ordre)
      .map((g): Band => ({
        name:  g.nom,
        image: g.photoUrl,
        website: g.site,
        bioFR: g.bioFR,
        bioEN: g.bioEN,
        annee: g.annee,
      }));
  }, [groupes]);

  const affiche = afficheLive ?? AFFICHE_2026_BANDS;
  const archives = archivesLive ?? BANDS_ARCHIVES;

  return (
    <>
      {!embedded && <SEO title={t.title} description={t.intro1} />}
      {!embedded && <ScrollProgress />}
      {/* En mode embarqué, Musique arrivait en petit, aligné à gauche :
          ça se lisait comme une note de bas de page après le grand
          « Nos activités » centré (Alex, 2026-08-22). Même stature,
          même axe, même ornement. */}
      {embedded ? (
        <section id="musique" className="relative pt-24 md:pt-32 pb-2">
          <div className="max-w-screen-xl mx-auto px-4 md:px-8 text-center">
            <p className="font-editorial italic uppercase tracking-[0.4em] text-[11px] md:text-xs text-[var(--color-amber-glow)] mb-4">{t.eyebrow}</p>
            <DisplayTitle size="xl" glow>{t.title}</DisplayTitle>
            <p className="font-editorial text-base md:text-lg max-w-2xl mx-auto mt-5"
               style={{ color: 'rgba(244, 239, 227, 0.78)' }}>
              {t.intro1}
            </p>
          </div>
        </section>
      ) : (
        <PageHeader
          eyebrow={t.eyebrow}
          titleA={t.title}
          intro={t.intro1}
          orbImage="/wix/musique/skarazula.webp"
          orbImagePosition="left center"
        />
      )}

      {/* ── Bands 2026 ── */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <Motes className="opacity-50" count={16} />
        <SectionFog edges="top" />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <ChapterIntro
            eyebrow={t.section2026Eyebrow}
            title={t.section2026Title}
            lead={t.section2026Lead}
            className="mb-10 md:mb-14"
          />
          <Reveal from="up" delay={0.1}>
            <BestiaryBoard bands={affiche} lang={lang} registre={t.registre} />
          </Reveal>
          <p className="mt-6 text-center font-editorial italic text-sm md:text-base text-ivory-soft/70">
            {t.section2026Note}
          </p>
        </div>
      </section>

      {/* ── Bands des Ans Passés: archive compacte, pas de carrousel ── */}
      <section className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-b from-transparent via-black/20 to-transparent">
        <SectionFog />
        <Motes className="opacity-30" count={10} />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <Reveal className="text-center mb-10 md:mb-14 max-w-2xl mx-auto">
            <p className="font-editorial italic text-stone uppercase tracking-[0.3em] text-xs mb-3">{t.sectionPastEyebrow}</p>
            <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory-soft mb-2">{t.sectionPastTitle}</h2>
            <div className="divider-brass w-20 mx-auto mb-4 opacity-50" />
            <p className="font-editorial italic text-base md:text-lg text-ivory-soft/80 max-w-2xl mx-auto">
              {t.sectionPastLead}
            </p>
          </Reveal>
          {/* Même bestiaire que l'affiche de cette année, en miroir :
              le registre passe à droite et la notice à gauche (Alex,
              2026-08-22). Aucun filtre sur les photos. */}
          <Reveal from="up" delay={0.1}>
            <BestiaryBoard
              bands={archives}
              lang={lang}
              mirror
              departNom="Arrünn"
              registre={t.registre}
              sansJourTitre={t.sectionPastEyebrow}
            />
          </Reveal>
        </div>
      </section>

      {/* ── Your troupe here CTA ── */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <SectionFog edges="top" />
        <Parallax speed={0.12} className="absolute inset-0 -z-10">
          <div
            className="absolute inset-x-0 top-1/4 h-1/2"
            style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(184,141,74,0.10), transparent 70%)' }}
          />
        </Parallax>
        <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-8 text-center">
          <ChapterIntro
            eyebrow={t.callEyebrow}
            title={t.callTitle}
            className="mb-6"
          />
          <Stagger stagger={0.1} delayChildren={0.1} className="flex flex-col items-center gap-6">
            <StaggerItem>
              <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed">
                {t.callBody}
              </p>
            </StaggerItem>
            <StaggerItem>
              <Link
                to={addLocale('/musique/inscription', lang)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
                {t.callCta}
                <ArrowUpRight size={14} />
              </Link>
            </StaggerItem>
          </Stagger>
        </div>
      </section>
    </>
  );
};

// ─── i18n ────────────────────────────────────────────────────────────
const FR = {
  home: 'Accueil',
  eyebrow: 'Programmation musicale 2026',
  title: 'Musique',
  intro1: 'Derrière le théâtre, le cinéma, derrière les histoires, autour des ronds de feu, derrière les révolutions ou simplement pour mettre de l’ambiance dans ton salon : la musique est là, pour te tenir compagnie. Ici, nous rendons hommage aux bardes qui animeront ce weekend grandiose.',
  section2026Eyebrow: 'Programmation 2026',
  section2026Title:   'À l’affiche cette année',
  section2026Lead:    'Les premiers noms de l’édition 2026, journée par journée. La programmation se complète encore : d’autres bardes s’ajouteront.',
  section2026Note:    'Programmation en cours. Les horaires de passage seront annoncés sous peu.',
  sectionPastEyebrow: 'Archives',
  sectionPastTitle:   'Groupes des ans passés',
  sectionPastLead:    'Les bardes qui ont animé les éditions précédentes du festival. Choisissez un nom dans le registre pour lire sa notice.',
  registre: 'Le registre des troupes',
  artist:  'Artiste',
  spotify: 'Écouter sur Spotify',
  website: 'Site web',
  prev:    'Groupe précédent',
  next:    'Groupe suivant',
  callEyebrow: 'Appel aux bardes',
  callTitle:   'Votre troupe ici',
  callBody:    'Le FMM est toujours à la recherche de nouveaux talents anciens. Si vous pensez que votre formation peut apporter une nouvelle corde à notre vielle, contactez-nous.',
  callCta:     'Soumettre ma candidature',
};

const EN = {
  home: 'Home',
  eyebrow: '2026 music programming',
  title: 'Music',
  intro1: 'Behind theater, cinema, behind stories, around fire circles, behind revolutions or just to set the mood in your living room: music is there to keep you company. Here we honour the bards who will animate this grand weekend.',
  section2026Eyebrow: '2026 programming',
  section2026Title:   'On this year’s bill',
  section2026Lead:    'The first names of the 2026 edition, day by day. The lineup is still growing: more bards will join.',
  section2026Note:    'Lineup in progress. Set times will be announced shortly.',
  sectionPastEyebrow: 'Archives',
  sectionPastTitle:   'Bands from past years',
  sectionPastLead:    'The bards who animated previous editions of the festival. Pick a name in the register to read its notice.',
  registre: 'The register of troupes',
  artist:  'Artist',
  spotify: 'Listen on Spotify',
  website: 'Website',
  prev:    'Previous band',
  next:    'Next band',
  callEyebrow: 'Call for bards',
  callTitle:   'Your troupe here',
  callBody:    'FMM is always seeking new ancient talent. If you think your formation can add a new string to our hurdy-gurdy, please reach out.',
  callCta:     'Submit my application',
};

export default MusiquePage;
