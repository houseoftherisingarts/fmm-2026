import React from 'react';
import { Dices, Flag, Hand, Megaphone, Swords } from 'lucide-react';
import { OISEAUX, type Face, type Joueur, type Partie } from './regles';

// ─── Le pupitre du Cul de chouette ──────────────────────────────────
// Les mots de la page et les boutons du bas : lancer, siroter ou
// garder, crier, parier, défier. Les deux cris restent toujours
// offerts pendant la partie : crier à contretemps est une bévue, comme
// à la vraie table.

export function textes(fr: boolean) {
  return fr ? {
    eyebrow: 'L’année de la Peste',
    titre: 'Le Cul de chouette',
    intro: 'Le jeu de dés de Kaamelott, tel qu’il se joue à la table de la taverne. Deux chouettes, un cul, et le premier à trois cent quarante-trois points.',
    pretre: 'La table est prête',
    aVous: 'À vous de lancer',
    joue: 'joue',
    enVol: 'Les dés roulent',
    criez: 'Criez !',
    gagne: 'Vous gagnez la table',
    aGagne: 'gagne la table',
    cible: 'Le premier à',
    scores: 'Les scores',
    grelottineTenue: 'Tient une grelottine',
    vosDes: 'Vos dés',
    chouettesPuisCul: 'Deux chouettes, puis le cul',
    joueurs: 'Convives',
    commencer: 'Dresser la table',
    nouvelle: 'Nouvelle partie',
    paruresDes: 'Les dés',
    paruresTable: 'La table',
    niveau: 'La maison joue en',
    regles: 'Les règles',
    afficherRegles: 'Afficher les règles',
    cacherRegles: 'Cacher les règles',
    lancer: 'Lancer les dés',
    siroter: 'Siroter',
    garder: 'Garder la chouette',
    grelotte: 'Grelotte ça picote !',
    pasMou: 'Pas mou le caillou !',
    jeSirote: 'Je sirote !',
    culReussi: 'Cul de chouette !',
    sirotRate: 'Raté…',
    parier: 'Il sirote. Pariez cinq points sur le dé :',
    sansPari: 'Je ne parie pas',
    soufflette: 'Soufflette !',
    defier: 'Soufflette : qui défiez-vous ?',
    passer: 'Personne',
    grelottine: 'Grelottine !',
    relever: 'Un néant : relevez-le avec votre grelottine ?',
    reussi: 'Réussi !',
    rate: 'Manqué…',
    sirotAide: 'Relancez le cul pour tenter le cul de chouette. Raté, la chouette est perdue.',
    attendez: 'Le convive joue son coup.',
  } : {
    eyebrow: 'The Year of the Plague',
    titre: 'Cul de chouette',
    intro: 'The dice game from Kaamelott, as it is played at the tavern table. Two owls, one bottom, and the first to three hundred and forty-three points.',
    pretre: 'The table is set',
    aVous: 'Your roll',
    joue: 'is rolling',
    enVol: 'The dice are rolling',
    criez: 'Shout!',
    gagne: 'You win the table',
    aGagne: 'wins the table',
    cible: 'First to',
    scores: 'Scores',
    grelottineTenue: 'Holds a grelottine',
    vosDes: 'Your dice',
    chouettesPuisCul: 'Two chouettes, then the cul',
    joueurs: 'Players',
    commencer: 'Set the table',
    nouvelle: 'New game',
    paruresDes: 'The dice',
    paruresTable: 'The table',
    niveau: 'The house plays as',
    regles: 'The rules',
    afficherRegles: 'Show the rules',
    cacherRegles: 'Hide the rules',
    lancer: 'Roll the dice',
    siroter: 'Sip it',
    garder: 'Keep the chouette',
    grelotte: 'Grelotte ça picote !',
    pasMou: 'Pas mou le caillou !',
    jeSirote: 'I sip!',
    culReussi: 'Cul de chouette!',
    sirotRate: 'Missed…',
    parier: 'A sip is on. Bet five points on the die:',
    sansPari: 'No bet',
    soufflette: 'Soufflette!',
    defier: 'Soufflette: whom do you challenge?',
    passer: 'Nobody',
    grelottine: 'Grelottine!',
    relever: 'A blank roll: answer it with your grelottine?',
    reussi: 'Done!',
    rate: 'Missed…',
    sirotAide: 'Re-roll the cul to try for a cul de chouette. Miss, and the chouette is lost.',
    attendez: 'The player is making their move.',
  };
}

export const REGLES_FR = [
  'À votre tour, vous lancez deux dés, les chouettes, puis le troisième, le cul. L’ordre des faces ne compte pas.',
  'Deux dés pareils font une chouette : le carré de la face. Trois pareils font un cul de chouette : quarante plus dix fois la face.',
  'Quand deux dés additionnés donnent le troisième, c’est une velute : deux fois le carré du grand dé.',
  'Une chouette et une velute ensemble font une chouette-velute. Le premier qui crie « Pas mou le caillou ! » empoche les points.',
  'Trois dés qui se suivent font une suite : tout le monde crie « Grelotte ça picote ! », et le dernier perd dix points. La suite 1-2-3 est aussi une velute de trois.',
  'Sur une chouette, vous pouvez siroter : relancer le cul pour tenter le cul de chouette. Raté, la chouette est perdue. Les autres parient cinq points sur la face, et le bon oiseau en rapporte vingt.',
  'Un 4-2-1 est une soufflette : vous défiez quelqu’un, qui a trois jets pour faire 4-2-1 à son tour. Réussi au premier, au deuxième ou au troisième jet, il vous prend cinquante, quarante ou trente points. Raté, il vous en donne trente.',
  'Rien de tout ça, c’est le néant : vous ramassez une grelottine. Quand un autre fait un néant, votre grelottine sert à le défier : il doit sortir un cul de chouette en un jet, pour seize pour cent du plus petit score des deux.',
  'Crier hors de propos est une bévue à dix points. Le premier à trois cent quarante-trois gagne la table.',
];

export const REGLES_EN = [
  'On your turn, roll two dice, the chouettes, then the third, the cul. The order of the faces does not matter.',
  'Two matching dice make a chouette: the square of the face. Three matching make a cul de chouette: forty plus ten times the face.',
  'When two dice add up to the third, it is a velute: twice the square of the big die.',
  'A chouette and a velute together make a chouette-velute. The first to shout "Pas mou le caillou!" pockets the points.',
  'Three dice in a row make a run: everyone shouts "Grelotte ça picote!" and the last one loses ten points. The 1-2-3 run is also a velute of three.',
  'On a chouette you may sip: re-roll the cul to try for the cul de chouette. Miss, and the chouette is lost. The others bet five points on the face, and the right bird pays twenty.',
  'A 4-2-1 is a soufflette: you challenge someone, who gets three rolls to make 4-2-1 too. Done on the first, second or third roll, they take fifty, forty or thirty points from you. Missed, they give you thirty.',
  'None of that is a blank: you pick up a grelottine. When someone else rolls a blank, your grelottine lets you challenge them: they must roll a cul de chouette in one go, for sixteen percent of the lower score.',
  'Shouting at the wrong time is a blunder worth ten points. The first to three hundred and forty-three wins the table.',
];

export const Parures: React.FC<{
  titre: string;
  choix: Array<{ id: string; nom: string }>;
  actif: string;
  onChoisir: (id: string) => void;
}> = ({ titre, choix, actif, onChoisir }) => (
  <div className="flex flex-wrap items-center justify-center gap-2">
    <span className="witcher-stat-label mr-1">{titre}</span>
    {choix.map((c) => (
      <button key={c.id} type="button" onClick={() => onChoisir(c.id)} aria-pressed={actif === c.id}
              className={`px-3.5 py-2 rounded-[15px] border font-sans text-[10px] uppercase tracking-[0.16em] transition-colors ${
                actif === c.id ? 'border-brass/70 bg-brass/15 text-ivory' : 'border-white/15 bg-black/35 text-ivory-soft hover:text-ivory hover:border-brass/45'}`}>
        {c.nom}
      </button>
    ))}
  </div>
);

const BOUTON = 'fmm-glass-btn is-primary px-5 py-3.5 disabled:opacity-40';
const STYLE: React.CSSProperties = { flexDirection: 'row', gap: '0.5rem' };
const SECOND = 'px-4 py-3 rounded-[15px] border border-white/15 bg-black/45 backdrop-blur-md font-sans uppercase tracking-[0.16em] text-[10px] text-ivory-soft hover:text-ivory hover:border-brass/45 transition-colors disabled:opacity-40 inline-flex items-center gap-2';

export const Pupitre: React.FC<{
  t: ReturnType<typeof textes>;
  partie: Partie;
  enVol: boolean;
  monTour: boolean;
  pariOuvert: Face | null;
  grelotOuvert: boolean;
  moi: Joueur;
  onLancer: () => void;
  onSiroter: () => void;
  onGarder: () => void;
  onCrier: (quoi: 'suite' | 'pasmou') => void;
  onParier: (f: Face) => void;
  onSoufflette: (id: string) => void;
  onGrelottine: () => void;
  onPasser: () => void;
}> = ({ t, partie, enVol, monTour, pariOuvert, grelotOuvert, moi, onLancer, onSiroter, onGarder, onCrier, onParier, onSoufflette, onGrelottine, onPasser }) => {
  const phase = partie.phase;
  // Un seul lancer par tour : une fois les dés posés, la main passe d'elle-même.
  const aMoiDeLancer = monTour && phase === 'attente' && !enVol && partie.des.length === 0;
  const aMoiDeSiroter = monTour && phase === 'sirop' && !enVol;
  const aMoiDeDefier = monTour && phase === 'soufflette';
  const autres = partie.joueurs.filter((j) => j.id !== moi.id);
  return (
    <div data-tuto="pupitre" className="mx-auto w-full max-w-4xl mb-12 md:mb-0 rounded-lg-card border border-brass/25 px-4 md:px-5 py-4 flex flex-wrap items-center justify-center gap-3"
         style={{ background: 'rgba(8,3,5,0.66)', backdropFilter: 'blur(8px)' }}>
      {pariOuvert !== null ? (
        <>
          <span className="w-full text-center font-editorial text-[14px] text-ivory-soft">{t.parier}</span>
          {([1, 2, 3, 4, 5, 6] as Face[]).map((f) => (
            <button key={f} type="button" onClick={() => onParier(f)} className={SECOND}>
              <span className="font-display title-medieval text-base text-ivory">{f}</span> {OISEAUX[f]}
            </button>
          ))}
        </>
      ) : grelotOuvert ? (
        <>
          <span className="w-full text-center font-editorial text-[14px] text-ivory-soft">{t.relever}</span>
          <button type="button" onClick={onGrelottine} className={BOUTON} style={STYLE}>
            <Megaphone size={15} className="text-brass" /><span className="fmm-glass-btn-label">{t.grelottine}</span>
          </button>
          <button type="button" onClick={onPasser} className={SECOND}>{t.passer}</button>
        </>
      ) : aMoiDeDefier ? (
        <>
          <span className="w-full text-center font-editorial text-[14px] text-ivory-soft">{t.defier}</span>
          {autres.map((j) => (
            <button key={j.id} type="button" onClick={() => onSoufflette(j.id)} className={BOUTON} style={STYLE}>
              <Swords size={14} className="text-brass" /><span className="fmm-glass-btn-label">{j.nom}</span>
            </button>
          ))}
          <button type="button" onClick={onPasser} className={SECOND}>{t.passer}</button>
        </>
      ) : aMoiDeSiroter ? (
        <>
          <span className="w-full text-center font-editorial text-[14px] text-ivory-soft">{t.sirotAide}</span>
          <button type="button" onClick={onSiroter} className={BOUTON} style={STYLE}>
            <Dices size={15} className="text-brass" /><span className="fmm-glass-btn-label">{t.siroter}</span>
          </button>
          <button type="button" onClick={onGarder} className={SECOND}><Hand size={13} /> {t.garder}</button>
        </>
      ) : (
        <button type="button" onClick={onLancer} disabled={!aMoiDeLancer} className={BOUTON} style={STYLE}>
          <Dices size={15} className="text-brass" />
          <span className="fmm-glass-btn-label">{aMoiDeLancer ? t.lancer : t.attendez}</span>
        </button>
      )}

      {/* Les deux cris, toujours à portée : la table ne prévient pas. */}
      <div data-tuto="cris" className="flex flex-wrap items-center justify-center gap-2 w-full md:w-auto md:ml-3 md:pl-3 md:border-l md:border-white/10">
        <button type="button" disabled={enVol} onClick={() => onCrier('suite')}
                className={`${SECOND} ${phase === 'reflexe' && partie.reflexe?.type === 'suite' ? 'border-brass/80 text-ivory animate-pulse' : ''}`}>
          <Flag size={12} className="text-brass" /> {t.grelotte}
        </button>
        <button type="button" disabled={enVol} onClick={() => onCrier('pasmou')}
                className={`${SECOND} ${phase === 'reflexe' && partie.reflexe?.type === 'pasmou' ? 'border-brass/80 text-ivory animate-pulse' : ''}`}>
          <Megaphone size={12} className="text-brass" /> {t.pasMou}
        </button>
      </div>
    </div>
  );
};
