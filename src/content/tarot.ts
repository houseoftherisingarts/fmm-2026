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
    texteFR: 'La question du jour, une seule réponse. Le tirage le plus honnête : il ne laisse pas de place aux arrangements.',
    texteEN: 'One question, one answer. The most honest draw: it leaves no room for bargaining.',
    positions: [
      { titreFR: 'La carte du jour', titreEN: 'The card of the day', sensFR: 'Ce qui domine, maintenant.', sensEN: 'What rules, right now.' },
    ],
  },
  {
    id: 'trois',
    nomFR: 'Trois cartes', nomEN: 'Three cards',
    texteFR: 'Le fil du temps : d’où ça vient, où ça en est, où ça va. Le tirage de tous les jours.',
    texteEN: 'The thread of time: where it comes from, where it stands, where it goes. The everyday draw.',
    positions: [
      { titreFR: 'Ce qui précède', titreEN: 'What came before', sensFR: 'La racine de la situation, ce qui l’a mise en route.', sensEN: 'The root of the situation, what set it going.' },
      { titreFR: 'Ce qui est', titreEN: 'What is', sensFR: 'L’état présent, ce avec quoi il faut compter.', sensEN: 'The present state, what must be reckoned with.' },
      { titreFR: 'Ce qui vient', titreEN: 'What comes', sensFR: 'La pente naturelle, si rien ne change.', sensEN: 'The natural slope, if nothing changes.' },
    ],
  },
  {
    id: 'croix',
    nomFR: 'La croix celtique', nomEN: 'The Celtic cross',
    texteFR: 'Dix cartes, le tirage long. On y regarde la situation, ce qui la barre, ce qui la porte, et ce qu’en pensent les autres.',
    texteEN: 'Ten cards, the long draw. It looks at the situation, what blocks it, what carries it, and what others make of it.',
    positions: [
      { titreFR: 'La situation', titreEN: 'The situation', sensFR: 'Le cœur de l’affaire, tel qu’il est.', sensEN: 'The heart of the matter, as it stands.' },
      { titreFR: 'Ce qui barre', titreEN: 'What crosses it', sensFR: 'L’obstacle, ou l’aide qui prend la forme d’un obstacle.', sensEN: 'The obstacle, or the help wearing an obstacle’s face.' },
      { titreFR: 'La racine', titreEN: 'The root', sensFR: 'Ce qui travaille en dessous, souvent sans être dit.', sensEN: 'What works underneath, usually unspoken.' },
      { titreFR: 'Le passé récent', titreEN: 'The recent past', sensFR: 'Ce qui vient de se dénouer et pèse encore.', sensEN: 'What has just untied itself and still weighs.' },
      { titreFR: 'Ce qui couronne', titreEN: 'What crowns it', sensFR: 'Le but visé, ou ce qu’on croit viser.', sensEN: 'The aim, or what you believe you are aiming at.' },
      { titreFR: 'Le proche avenir', titreEN: 'The near future', sensFR: 'Ce qui va se présenter dans les jours qui viennent.', sensEN: 'What will show up in the days ahead.' },
      { titreFR: 'Vous', titreEN: 'You', sensFR: 'Votre position réelle dans l’affaire, pas celle que vous racontez.', sensEN: 'Your real position in the matter, not the one you narrate.' },
      { titreFR: 'L’entourage', titreEN: 'The surroundings', sensFR: 'Ce que les autres apportent, ou font peser.', sensEN: 'What others bring, or make heavier.' },
      { titreFR: 'L’espoir et la crainte', titreEN: 'Hope and fear', sensFR: 'Ce qu’on souhaite et ce qu’on redoute, souvent la même lame.', sensEN: 'What you wish for and what you dread, often the same card.' },
      { titreFR: 'L’issue', titreEN: 'The outcome', sensFR: 'Là où mène le chemin, si le chemin est tenu.', sensEN: 'Where the road leads, if the road is held.' },
    ],
  },
];
