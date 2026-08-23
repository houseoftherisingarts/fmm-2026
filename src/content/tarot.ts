// ─── Le Tarot de Marseille ──────────────────────────────────────────
// Le jeu complet : 22 majeures (tarot-majeures.ts), 56 mineures
// (tarot-mineures.ts), et les trois tirages ci-dessous. Les images
// sont celles du jeu de Lequart (Paris), domaine public, versées sur
// Wikimedia Commons : aucune image sous droits ne circule ici.

import { MAJEURES } from './tarot-majeures';
import { MINEURES } from './tarot-mineures';
export type { Lame, Couleur } from './tarotTypes';
export { MAJEURES } from './tarot-majeures';
export { MINEURES } from './tarot-mineures';

export const JEU = [...MAJEURES, ...MINEURES];

// ── Les tirages ─────────────────────────────────────────────────────
export interface Position { titreFR: string; titreEN: string; sensFR: string; sensEN: string }

export interface Tirage {
  id: 'une' | 'trois' | 'croix';
  nomFR: string; nomEN: string;
  texteFR: string; texteEN: string;
  positions: Position[];
}

export const TIRAGES: Tirage[] = [
  {
    id: 'une',
    nomFR: 'Une carte', nomEN: 'One card',
    texteFR: 'Vous posez une question et une seule carte y répond. C’est le tirage du matin, celui qui donne le ton d’une journée.',
    texteEN: 'You ask one question and a single card answers it. This is the morning draw, the one that sets the tone of a day.',
    positions: [
      { titreFR: 'La carte du jour', titreEN: 'The card of the day', sensFR: 'Elle dit ce qui domine votre journée en ce moment.', sensEN: 'It tells what rules your day right now.' },
    ],
  },
  {
    id: 'trois',
    nomFR: 'Trois cartes', nomEN: 'Three cards',
    texteFR: 'Les trois cartes se lisent de gauche à droite, dans l’ordre du temps. Elles racontent d’où vient la situation, où elle en est et vers quoi elle penche.',
    texteEN: 'The three cards are read from left to right, in the order of time. They tell where the situation comes from, where it stands and which way it leans.',
    positions: [
      { titreFR: 'Le passé', titreEN: 'The past', sensFR: 'Elle montre la racine de la situation et ce qui l’a mise en route.', sensEN: 'It shows the root of the situation and what set it going.' },
      { titreFR: 'Le présent', titreEN: 'The present', sensFR: 'Voici l’état des choses aujourd’hui, celui avec lequel il vous faut compter.', sensEN: 'Here is how things stand today, and this is what you have to reckon with.' },
      { titreFR: 'L’avenir', titreEN: 'The future', sensFR: 'Cette carte donne la pente que suivront les choses si rien ne change.', sensEN: 'This card gives the way things will lean if nothing changes.' },
    ],
  },
  {
    id: 'croix',
    nomFR: 'La croix celtique', nomEN: 'The Celtic cross',
    texteFR: 'La croix celtique demande dix cartes. Les six premières se posent en croix et montrent la situation avec ce qui la traverse. Les quatre dernières disent comment tout cela peut finir.',
    texteEN: 'The Celtic cross calls for ten cards. The first six are laid in a cross and show the situation together with what crosses it. The last four tell how it can all end.',
    positions: [
      { titreFR: 'La situation', titreEN: 'The situation', sensFR: 'Cette première carte nomme le cœur de l’affaire, tel qu’il se présente vraiment.', sensEN: 'This first card names the heart of the matter as it truly stands.' },
      { titreFR: 'L’obstacle', titreEN: 'What crosses it', sensFR: 'Posée en travers de la première, elle montre ce qui contrarie la situation. Il arrive qu’une aide y prenne les traits d’un obstacle.', sensEN: 'Laid across the first, it shows what works against the situation. Sometimes a help arrives wearing the face of an obstacle.' },
      { titreFR: 'La racine', titreEN: 'The root', sensFR: 'La racine descend dans ce qui travaille en dessous depuis longtemps, souvent sans jamais être dit.', sensEN: 'The root reaches down to what has been working underneath for a long time, usually unspoken.' },
      { titreFR: 'Le passé récent', titreEN: 'The recent past', sensFR: 'Voici ce qui vient de se dénouer et qui pèse encore sur la suite.', sensEN: 'Here is what has just come undone and still weighs on the rest.' },
      { titreFR: 'Ce qui couronne', titreEN: 'What crowns it', sensFR: 'Elle montre le but visé, ou du moins celui que vous croyez viser.', sensEN: 'It shows the aim, or at least the aim you believe you are holding.' },
      { titreFR: 'Le proche avenir', titreEN: 'The near future', sensFR: 'Cette carte annonce ce qui se présentera dans les jours qui viennent.', sensEN: 'This card announces what will turn up in the days ahead.' },
      { titreFR: 'Vous', titreEN: 'You', sensFR: 'Vous tenez ici votre position réelle dans l’affaire, celle que vous ne racontez pas toujours.', sensEN: 'Here you hold your real position in the matter, the one you do not always tell.' },
      { titreFR: 'L’entourage', titreEN: 'The surroundings', sensFR: 'Les autres apportent quelque chose à cette histoire, et cette carte nomme ce que c’est.', sensEN: 'Other people bring something to this story, and this card names what it is.' },
      { titreFR: 'L’espoir et la crainte', titreEN: 'Hope and fear', sensFR: 'Votre souhait et votre crainte se cachent souvent dans la même lame, et c’est celle-ci.', sensEN: 'Your wish and your fear often hide in the same card, and this is that card.' },
      { titreFR: 'L’issue', titreEN: 'The outcome', sensFR: 'L’issue indique où mène le chemin, pour peu que vous le teniez jusqu’au bout.', sensEN: 'The outcome shows where the road leads, provided you hold to it.' },
    ],
  },
];
