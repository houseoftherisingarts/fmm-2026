// ─── Le Renard et les Oies : la page du jeu ─────────────────────────
// Alex, 2026-08-30 : même protocole que le hnefatafl et le jeu de dés.
// CadreJeu porte le hero à orbe et l'aire de jeu plein écran, la table
// 3D vit dessous, et tout le reste (règles, réglages, musique, plein
// écran) se pose dessus en verre sombre. Aucune section détachée sous
// le jeu.
//
// La règle et l'histoire ne sont pas inventées : HISTOIRE.md, à côté,
// donne les sources et dit ce qui reste incertain.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpRight, Cpu, Feather, Maximize2, Minimize2, PawPrint, RotateCcw,
  Scroll, Swords, Users, X,
} from 'lucide-react';

import CadreJeu from '../../components/jeux/CadreJeu';
import BoutonMusique, { type BoutonMusiqueHandle } from '../../components/jeux/BoutonMusique';
import PubDebutPartie from '../../components/jeux/PubDebutPartie';
import BoiteAide from '../../components/jeux/BoiteAide';
import Tutoriel, { BoutonTutoriel, useTutoriel } from '../Tutoriel';
import SEO from '../../components/SEO';
import { useUI } from '../../contexts/AppContext';
import { useCaravanPage } from '../../lib/useCaravanPage';
import { useBadgeJeu, useGagnerBadge } from '../../contexts/BadgesContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  suivrePartie, repondreAuDefi, abandonner,
  jouerCoup as pousserLeCoup, type PartieTafl,
} from '../../firebase/tafl';
import RenardPanneaux from '../../components/jeux/RenardPanneaux';
import {
  coupDepuisTexte, coupEnTexte, coupsPossibles, jouer, nbOies, positionRenard,
  REGLEMENTS, reglement, VARIANTE_DEFAUT,
  type Camp, type Coup, type Variante,
} from './logic';
import {
  etatInitial, jouerArbitre, texteEvenement, trainarde,
  type EvenementArbitre, type VerdictArbitre,
} from './arbitre';
import { nomNiveau, type Niveau } from '../moteur/niveaux';
import { nouveauPenseur, type Penseur } from '../moteur/penseur';
import { creerTable, type Table3D } from './scene';

type Mode = 'deux-joueurs' | 'ordinateur';

interface Reglages {
  variante: Variante;
  mode: Mode;
  campHumain: Camp;
  /** La marche de force de la machine, du marmiton au connétable. */
  niveau: Niveau;
}

/** La marche par défaut. Le chevalier est la première qui cherche à
 *  plein régime, sans fenêtre d'à-peu-près : la plainte d'Alex était
 *  qu'on battait la machine du premier coup. */
const NIVEAU_DEFAUT: Niveau = 6;

/** La maison ne s'assoit jamais pour perdre. Quand personne ne se
 *  présente à la table ouverte, c'est le connétable qui prend le siège. */
const NIVEAU_MAISON: Niveau = 10;

const REGLAGES_DEFAUT: Reglages = {
  variante: VARIANTE_DEFAUT,
  mode: 'deux-joueurs',
  campHumain: 'oies',
  niveau: NIVEAU_DEFAUT,
};

// ── Les textes ──────────────────────────────────────────────────────
interface Textes {
  eyebrow: string;
  titre: string;
  intro: string;
  prepTitre: string;
  prepSousTitre: string;
  labelVariante: string;
  labelMode: string;
  labelCamp: string;
  labelNiveau: string;
  modeDeux: string;
  modeOrdi: string;
  campRenard: string;
  campOies: string;
  niveauAide: string;
  niveauMarche: (n: number, nom: string) => string;
  machine: string;
  unInconnu: string;
  commencer: string;
  tablePrete: string;
  tourRenard: string;
  tourOies: string;
  reflechit: (nom: string) => string;
  gagneRenard: string;
  gagneOies: string;
  gagneNulle: string;
  finTitre: string;
  rejouer: string;
  indice: string;
  pointRenard: string;
  pointOies: (n: number) => string;
  musiqueOn: string;
  musiqueOff: string;
  pleinEcran: string;
  quitterPleinEcran: string;
  afficherRegles: string;
  cacherRegles: string;
  reglesEyebrow: string;
  reglesTitre: string;
  regles: Array<{ titre: string; corps: string }>;
  atelierTexte: string;
  // La partie à deux, chacun chez soi.
  contre: string;
  vousTenez: string;
  aVousDeJouer: string;
  enAttente: string;
  partieFinie: string;
  abandonner: string;
  defi: string;
  vousDefie: (nom: string) => string;
  defiEnvoye: (nom: string) => string;
  defiRefuse: string;
  defiAttente: string;
  accepter: string;
  refuser: string;
  retourTable: string;
  chargement: string;
  // La boîte « je ne sais pas quoi faire ».
  aideBut: string;
  aidePreparer: string;
  aideFini: string;
  aideAttente: (nom: string) => string;
  aideOrdinateur: (nom: string) => string;
  aideOies: string;
  aideRenard: string;
  aideAVous: string;
}

const TEXTES: Record<'FR' | 'EN', Textes> = {
  FR: {
    eyebrow: 'L’année de la Révolte · Jeu de plateau',
    titre: 'Le Renard et les Oies',
    intro:
      'Une basse-cour n’a que le nombre pour se défendre. Les oies montent en bloc vers la tanière et cherchent à y coincer le renard, qui n’a besoin que d’un saut par-dessus l’une d’elles pour éclaircir le troupeau. Les paysans du nord de l’Europe y jouaient déjà au XIVe siècle, sur une croix de trente-trois trous creusés dans une planche.',
    prepTitre: 'Dressez la planche',
    prepSousTitre: 'Choisissez votre camp',
    labelVariante: 'La forme du jeu',
    labelMode: 'Mode',
    labelCamp: 'Votre camp',
    labelNiveau: 'La force de la machine',
    modeDeux: 'Deux joueurs',
    modeOrdi: 'Contre l’ordinateur',
    campRenard: 'Le renard',
    campOies: 'Les oies',
    niveauAide: 'Dix marches, du marmiton au connétable. Le connétable ne se laisse pas battre.',
    niveauMarche: (n, nom) => `${n} · ${nom}`,
    machine: 'L’ordinateur',
    unInconnu: 'Un inconnu',
    commencer: 'Commencer la partie',
    tablePrete: 'La planche est prête',
    tourRenard: 'Au renard de jouer',
    tourOies: 'Aux oies de jouer',
    reflechit: (nom) => `${nom} réfléchit…`,
    gagneRenard: 'Le troupeau est trop maigre. Le renard l’emporte',
    gagneOies: 'Le renard est cerné. Les oies l’emportent',
    gagneNulle: 'Ni le renard ni les oies. La partie est nulle',
    finTitre: 'La chasse se termine',
    rejouer: 'Nouvelle partie',
    indice: 'Cliquez une pièce · Cliquez un point vert · Glissez pour pivoter',
    pointRenard: '● Renard',
    pointOies: (n) => `● Oies restantes : ${n}`,
    musiqueOn: 'Couper la musique',
    musiqueOff: 'Musique',
    pleinEcran: 'Plein écran',
    quitterPleinEcran: 'Quitter le plein écran',
    afficherRegles: 'Afficher les règles',
    cacherRegles: 'Cacher les règles',
    reglesEyebrow: 'Avant de vous asseoir',
    reglesTitre: 'Trois choses à savoir',
    regles: [
      {
        titre: 'Le but',
        corps: 'Les oies gagnent quand le renard ne peut plus bouger d’un seul point. Le renard gagne quand il ne reste plus que cinq oies : elles ne sont alors plus assez nombreuses pour refermer l’étau.',
      },
      {
        titre: 'Les déplacements',
        corps: 'Chaque camp avance d’un point à la fois, le long des lignes brûlées au fer. Dans la forme ancienne, les oies vont dans les quatre directions. Dans la forme tardive, elles avancent ou se déplacent de côté, jamais en arrière.',
      },
      {
        titre: 'Les prises',
        corps: 'Le renard saute par-dessus une oie voisine et se pose sur le point libre derrière elle. S’il peut sauter encore, il enchaîne dans le même tour : cliquez le point vert le plus lointain pour emporter toute la ligne. Les oies, elles, ne prennent jamais rien.',
      },
    ],
    atelierTexte: 'La planche, les pièces et le code viennent de l’atelier du Salon des Inconnus. La règle retenue est celle que H. J. R. Murray tient pour la plus ancienne, et les sources sont consignées à côté du jeu.',
    contre: 'Contre',
    vousTenez: 'Vous tenez',
    aVousDeJouer: 'À vous de jouer',
    enAttente: 'En attente de l’autre',
    partieFinie: 'Partie terminée',
    abandonner: 'Abandonner',
    defi: 'Défi',
    vousDefie: (nom) => `${nom} vous défie au renard et les oies`,
    defiEnvoye: (nom) => `Défi envoyé à ${nom}`,
    defiRefuse: 'Ce défi a été refusé.',
    defiAttente: 'La planche se dresse dès que la personne accepte. Vous pouvez revenir plus tard : la partie vous attendra dans vos notifications.',
    accepter: 'Accepter',
    refuser: 'Refuser',
    retourTable: 'La table de jeux',
    chargement: 'La partie s’ouvre…',
    aideBut: 'Le but : les oies coincent le renard, le renard éclaircit le troupeau.',
    aidePreparer: 'Choisissez la forme du jeu et votre camp, puis dressez la planche.',
    aideFini: 'La chasse est terminée.',
    aideAttente: (nom) => `À ${nom} de jouer.`,
    aideOrdinateur: (nom) => `À ${nom} de jouer.`,
    aideOies: 'Les oies avancent d’un point; encerclez le renard.',
    aideRenard: 'Le renard peut sauter par-dessus une oie voisine : gare aux prises.',
    aideAVous: 'À vous.',
  },
  EN: {
    eyebrow: 'The Year of the Revolt · Board game',
    titre: 'Fox and Geese',
    intro:
      'A farmyard has nothing but numbers to defend itself. The geese climb together toward the den and try to pin the fox there, while the fox needs a single leap over one of them to thin the flock. Peasants in northern Europe were already playing it in the fourteenth century, on a cross of thirty-three holes bored into a plank.',
    prepTitre: 'Set the plank',
    prepSousTitre: 'Choose your side',
    labelVariante: 'Form of the game',
    labelMode: 'Mode',
    labelCamp: 'Your side',
    labelNiveau: 'How hard the machine plays',
    modeDeux: 'Two players',
    modeOrdi: 'Against the computer',
    campRenard: 'The fox',
    campOies: 'The geese',
    niveauAide: 'Ten steps, from scullion to constable. The constable does not let anyone beat him.',
    niveauMarche: (n, nom) => `${n} · ${nom}`,
    machine: 'The computer',
    unInconnu: 'A stranger',
    commencer: 'Begin the game',
    tablePrete: 'The plank is ready',
    tourRenard: 'The fox to play',
    tourOies: 'The geese to play',
    reflechit: (nom) => `${nom} is thinking…`,
    gagneRenard: 'The flock is too thin. The fox wins',
    gagneOies: 'The fox is hemmed in. The geese win',
    gagneNulle: 'Neither the fox nor the geese. The game is a draw',
    finTitre: 'The hunt is over',
    rejouer: 'New game',
    indice: 'Click a piece · Click a green point · Drag to orbit',
    pointRenard: '● Fox',
    pointOies: (n) => `● Geese left: ${n}`,
    musiqueOn: 'Mute the music',
    musiqueOff: 'Music',
    pleinEcran: 'Fullscreen',
    quitterPleinEcran: 'Exit fullscreen',
    afficherRegles: 'Show the rules',
    cacherRegles: 'Hide the rules',
    reglesEyebrow: 'Before you sit down',
    reglesTitre: 'Three things to know',
    regles: [
      {
        titre: 'The goal',
        corps: 'The geese win when the fox can no longer move a single point. The fox wins once only five geese remain, too few to close the ring.',
      },
      {
        titre: 'Moving',
        corps: 'Each side moves one point at a time along the burnt lines. In the old form the geese move in all four directions. In the later form they move forward or sideways, never backward.',
      },
      {
        titre: 'Captures',
        corps: 'The fox leaps over a neighbouring goose and lands on the free point behind it. If another leap is there, it carries on in the same turn: click the farthest green point to take the whole line. The geese never capture anything.',
      },
    ],
    atelierTexte: 'The plank, the pieces and the code come from the Salon des Inconnus workshop. The rule set is the one H. J. R. Murray holds to be the oldest, and the sources are filed next to the game.',
    contre: 'Against',
    vousTenez: 'You hold',
    aVousDeJouer: 'Your move',
    enAttente: 'Waiting for them',
    partieFinie: 'Game over',
    abandonner: 'Resign',
    defi: 'Challenge',
    vousDefie: (nom) => `${nom} challenges you at fox and geese`,
    defiEnvoye: (nom) => `Challenge sent to ${nom}`,
    defiRefuse: 'This challenge was declined.',
    defiAttente: 'The board is set as soon as they accept. You can come back later: the game will wait in your notifications.',
    accepter: 'Accept',
    refuser: 'Decline',
    retourTable: 'The games table',
    chargement: 'The game is opening…',
    aideBut: 'The goal: the geese pin the fox, the fox thins the flock.',
    aidePreparer: 'Pick the form of the game and your side, then set the plank.',
    aideFini: 'The hunt is over.',
    aideAttente: (nom) => `${nom} to play.`,
    aideOrdinateur: (nom) => `${nom} is playing.`,
    aideOies: 'The geese move one point at a time; ring the fox in.',
    aideRenard: 'The fox may leap over a neighbouring goose: watch the captures.',
    aideAVous: 'Your move.',
  },
};

// ── Petits éléments de l'écran de préparation ───────────────────────
const Pastille: React.FC<{
  actif: boolean;
  onClick: () => void;
  icone?: React.ReactNode;
  children: React.ReactNode;
}> = ({ actif, onClick, icone, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={actif}
    className={`inline-flex items-center gap-2 px-3.5 py-2.5 min-h-[42px] rounded-[15px] border font-sans text-[11px] md:text-xs uppercase tracking-[0.16em] transition-colors duration-200 ${
      actif
        ? 'border-brass bg-brass/20 text-ivory'
        : 'border-white/15 bg-black/30 text-ivory-soft hover:text-ivory hover:border-brass/60'
    }`}
  >
    {icone}
    <span className="truncate">{children}</span>
  </button>
);

const Colonne: React.FC<{ num: string; label: string; children: React.ReactNode }> = ({ num, label, children }) => (
  <section className="rounded-[15px] border border-brass/20 bg-black/30 p-3.5 md:p-4 min-w-0">
    <p className="flex items-baseline gap-2.5 mb-3 md:mb-4">
      <span className="font-display title-medieval text-lg md:text-xl" style={{ color: 'rgba(232,177,74,0.6)' }}>{num}</span>
      <span className="font-sans text-[10px] md:text-[11px] uppercase tracking-[0.35em] text-brass/70">{label}</span>
    </p>
    <div className="flex flex-col items-stretch gap-2">{children}</div>
  </section>
);

const EcranPreparation: React.FC<{
  depart: Reglages;
  t: Textes;
  lang: 'FR' | 'EN';
  onCommencer: (r: Reglages) => void;
  onTutoriel: () => void;
}> = ({ depart, t, lang, onCommencer, onTutoriel }) => {
  const [variante, setVariante] = useState<Variante>(depart.variante);
  const [mode, setMode] = useState<Mode>(depart.mode);
  const [campHumain, setCampHumain] = useState<Camp>(depart.campHumain);
  const [niveau, setNiveau] = useState<Niveau>(depart.niveau);
  const choisie = reglement(variante);

  return (
    <div className="absolute inset-0 z-[5] flex flex-col bg-[rgba(10,4,6,0.82)] backdrop-blur-md">
      <div className="shrink-0 text-center px-4 pt-4 md:pt-6">
        <p className="font-editorial uppercase tracking-[0.4em] text-[10px] md:text-xs text-[var(--color-amber-glow)] mb-1.5 md:mb-2">
          {t.prepSousTitre}
        </p>
        <h2 className="font-display title-medieval text-2xl md:text-4xl text-ivory leading-[1.06]">
          {t.prepTitre}
        </h2>
        <div className="divider-brass w-24 mx-auto mt-3 mb-3 md:mt-4 md:mb-5" />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 pb-2">
        <div className="grid gap-3 md:gap-4 lg:grid-cols-4 max-w-6xl mx-auto items-start">
          <Colonne num="I" label={t.labelVariante}>
            {REGLEMENTS.map((r) => (
              <Pastille
                key={r.id}
                actif={variante === r.id}
                onClick={() => setVariante(r.id)}
                icone={<Scroll size={13} />}
              >
                {lang === 'FR' ? r.nomFR : r.nomEN}
              </Pastille>
            ))}
            <p className="font-editorial text-[12px] md:text-[13px] text-ivory-soft/75 mt-2 leading-snug">
              {lang === 'FR' ? choisie.texteFR : choisie.texteEN}
            </p>
          </Colonne>

          <Colonne num="II" label={t.labelMode}>
            <Pastille actif={mode === 'deux-joueurs'} onClick={() => setMode('deux-joueurs')} icone={<Users size={13} />}>
              {t.modeDeux}
            </Pastille>
            <Pastille actif={mode === 'ordinateur'} onClick={() => setMode('ordinateur')} icone={<Cpu size={13} />}>
              {t.modeOrdi}
            </Pastille>
          </Colonne>

          <Colonne num="III" label={t.labelCamp}>
            <Pastille actif={campHumain === 'oies'} onClick={() => setCampHumain('oies')} icone={<Feather size={13} />}>
              {t.campOies}
            </Pastille>
            <Pastille actif={campHumain === 'renard'} onClick={() => setCampHumain('renard')} icone={<PawPrint size={13} />}>
              {t.campRenard}
            </Pastille>
            {mode === 'deux-joueurs' && (
              <p className="font-editorial text-[12px] text-ivory-soft/60 mt-1 leading-snug">
                {lang === 'FR'
                  ? 'À deux sur le même écran, les deux camps se jouent tour à tour sur cette planche.'
                  : 'With two players on one screen, both sides take their turns on this plank.'}
              </p>
            )}
          </Colonne>

          {/* Les dix marches tiennent sur un seul réglage. Dix pastilles
              auraient débordé de la colonne sur un téléphone : le curseur
              se prend au pouce, et le chiffre porte le nom de la marche. */}
          <Colonne num="IV" label={t.labelNiveau}>
            <p className="font-display title-medieval text-lg text-ivory leading-none">
              {t.niveauMarche(niveau, nomNiveau(niveau, lang === 'FR'))}
            </p>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={niveau}
              onChange={(e) => setNiveau(Number(e.target.value) as Niveau)}
              aria-label={t.labelNiveau}
              className="w-full h-8 bg-transparent cursor-pointer"
              style={{ accentColor: '#E8B14A' }}
            />
            <p className="flex justify-between gap-2 font-sans text-[9px] uppercase tracking-[0.16em] text-ivory-soft/50">
              <span>{nomNiveau(1, lang === 'FR')}</span>
              <span>{nomNiveau(10, lang === 'FR')}</span>
            </p>
            <p className="font-editorial text-[12px] text-ivory-soft/60 mt-1 leading-snug">
              {mode === 'deux-joueurs'
                ? (lang === 'FR'
                  ? 'Ce réglage attend la partie contre l’ordinateur.'
                  : 'This setting waits for a game against the computer.')
                : t.niveauAide}
            </p>
          </Colonne>
        </div>
      </div>

      {/* Le bouton vit hors du défilement : il reste visible même quand
          les quatre colonnes s'empilent sur téléphone. */}
      <div
        className="shrink-0 flex flex-wrap items-center justify-center gap-2.5 px-4 pt-3 pb-3 md:pb-4"
        style={{ background: 'linear-gradient(0deg, rgba(10,4,6,0.96) 62%, rgba(10,4,6,0))' }}
      >
        <BoutonTutoriel onClick={onTutoriel} lang={lang} className="min-h-[48px]" />
        <button
          type="button"
          onClick={() => onCommencer({ variante, mode, campHumain, niveau })}
          className="inline-flex items-center gap-2.5 px-8 py-3.5 min-h-[48px] rounded-[15px] bg-brass text-[#1A0A05] border border-brass font-sans text-xs md:text-sm uppercase tracking-[0.22em] hover:bg-brass-soft transition-colors duration-200"
        >
          <Swords size={15} />
          {t.commencer}
        </button>
      </div>
    </div>
  );
};


// ── La planche jouable ──────────────────────────────────────────────
interface EtatPartie {
  tour: Camp;
  oies: number;
  /** Le verdict de l'arbitre : un camp, la nulle, ou rien tant que ça dure. */
  gagnant: VerdictArbitre | null;
  attente: boolean;
  /** Ce que l'arbitre vient de faire, quand il a eu à faire quelque chose. */
  evenement: EvenementArbitre | null;
  /** Les demi-coups joués, pour distinguer deux avis identiques de suite. */
  demiCoups: number;
}

/** Une planche qu'on vient de dresser, avant le premier coup. */
const etatNeuf = (oies: number): EtatPartie => ({
  tour: 'oies', oies, gagnant: null, attente: false, evenement: null, demiCoups: 0,
});

/** Ce qu'une partie à deux ajoute à la planche : mon camp, la liste des
 *  coups déjà écrits dans le document, et où envoyer les miens. */
interface FilEnLigne {
  monCamp: Camp;
  /** Partie finie ou abandonnée : plus personne ne bouge rien. */
  fige: boolean;
  /** Tous les coups du document, dans l'ordre. */
  coups: string[];
  surMonCoup: (texte: string, tourSuivant: Camp, gagnant: VerdictArbitre | null) => void;
}

const Planche: React.FC<{
  reglages: Reglages;
  onEtat: (e: EtatPartie) => void;
  enLigne?: FilEnLigne | null;
}> = ({ reglages, onEtat, enLigne }) => {
  const boite = useRef<HTMLDivElement>(null);
  const table = useRef<Table3D | null>(null);
  const penseur = useRef<Penseur | null>(null);

  // L'ÉTAT DE L'ARBITRE, tenu vivant d'un coup à l'autre, humain comme
  // machine. La page reconstruisait autrefois une position neuve à
  // chaque coup : la machine était alors aveugle au registre des
  // positions et au compteur de la basse-cour, et six parties sur six
  // tapaient le plafond des quatre cents demi-coups sans qu'une seule
  // oie soit croquée. Les oies ouvrent, le renard réagit.
  const partie = useRef({
    etat: etatInitial(reglages.variante),
    choisi: null as number | null,
    occupe: false,
    fini: false,
  });

  const annoncer = useCallback((evenement: EvenementArbitre | null = null) => {
    const p = partie.current;
    onEtat({
      tour: p.etat.tour,
      oies: nbOies(p.etat.plateau),
      // Le verdict attend la fin de l'animation : autrement l'écran de
      // fin tomberait sur une pièce encore en vol.
      gagnant: p.fini ? p.etat.verdict : null,
      attente: p.occupe,
      evenement,
      demiCoups: p.etat.demiCoups,
    });
  }, [onEtat]);

  // ── La partie à deux ─────────────────────────────────────────────
  // Le fil est lu par référence : la planche se monte une seule fois et
  // ne doit pas se reconstruire à chaque coup reçu.
  const filRef = useRef<FilEnLigne | null>(enLigne ?? null);
  filRef.current = enLigne ?? null;
  /** Les coups reçus attendent leur tour : l'animation du précédent doit
   *  finir avant que le suivant ne parte. */
  const file = useRef<string[]>([]);
  /** Combien de coups du document sont déjà passés sur la planche. */
  const appliques = useRef(0);
  const pomperRef = useRef<() => void>(() => {});

  /**
   * Le tour de la machine, confié au penseur.
   *
   * Rien n'est plus calculé sur le fil de la page : au dixième niveau la
   * recherche dure deux secondes et demie, et un appel direct figerait
   * la planche tout ce temps. Quand la main passe au joueur, la machine
   * ne dort pas non plus : elle étudie les positions qu'il va lui donner.
   */
  const jouerRef = useRef<(c: Coup, distant?: boolean) => void>(() => {});
  /** Le temps mort qui précède la demande. Il est tenu ici pour qu'une
   *  page qu'on quitte n'aille pas réveiller un penseur déjà enterré. */
  const reveil = useRef(0);
  const reveillerLaMachine = useCallback(() => {
    if (filRef.current || reglages.mode !== 'ordinateur') return;
    const etat = partie.current.etat;
    if (etat.verdict) return;
    if (etat.tour === reglages.campHumain) {
      penseur.current?.anticiper('renard', etat.variante, etat, reglages.niveau);
      return;
    }
    // Un temps mort avant la demande, pour que l'animation précédente
    // respire. La position est relue au réveil : elle a pu changer.
    window.clearTimeout(reveil.current);
    reveil.current = window.setTimeout(() => {
      if (partie.current.etat !== etat) return;
      void penseur.current?.demanderCoup<Coup>('renard', etat.variante, etat, reglages.niveau)
        .then((coup) => { if (coup && partie.current.etat === etat) jouerRef.current(coup); });
    }, 420);
  }, [reglages.campHumain, reglages.mode, reglages.niveau]);

  const jouerLeCoup = useCallback((coup: Coup, distant = false) => {
    const p = partie.current;
    if (p.occupe || p.fini) return;
    p.occupe = true;
    p.choisi = null;
    table.current?.surbrillance(null, []);
    const avant = p.etat;
    // TOUT passe par l'arbitre : le coup de l'humain comme celui de la
    // machine, et les coups reçus de l'autre bout. C'est lui qui tient
    // le compteur de la basse-cour, le registre des positions et le
    // verdict, la nulle comprise.
    const { etat, evenement } = jouerArbitre(avant, coup);
    p.etat = etat;
    annoncer();

    // Mon coup part vers l'autre bout, avec le verdict s'il y en a un.
    // Un coup REÇU ne repart jamais : il ferait l'aller-retour sans fin.
    // L'autre bout rejoue la liste à travers le même arbitre, donc les
    // deux planches punissent la même oie au même coup.
    const fil = filRef.current;
    if (!distant && fil) {
      appliques.current += 1;
      fil.surMonCoup(coupEnTexte(coup), etat.tour, etat.verdict);
    }

    table.current?.animer(coup, () => {
      const suite = () => {
        p.occupe = false;
        if (etat.verdict) p.fini = true;
        annoncer(evenement);
        if (p.fini) return;
        pomperRef.current();
        reveillerLaMachine();
      };
      // La traînarde s'en va comme une oie croquée : le renard happe sur
      // place, elle s'envole et disparaît. C'est l'animation de prise
      // ordinaire, à qui on donne un saut de longueur nulle.
      const perdue = evenement === 'oie-punie' ? trainarde(jouer(avant.plateau, coup)) : -1;
      const ou = positionRenard(etat.plateau);
      if (perdue >= 0 && ou >= 0 && table.current) {
        table.current.animer({ de: ou, vers: ou, prises: [perdue], etapes: [ou] }, suite);
      } else suite();
    });
  }, [annoncer, reveillerLaMachine]);
  jouerRef.current = jouerLeCoup;

  /** Sort le prochain coup reçu et le relit sur la planche telle qu'elle
   *  est maintenant : c'est la position courante qui lui rend ses
   *  étapes, et un coup qui n'est pas légal ne passe pas. */
  const pomper = useCallback(() => {
    const p = partie.current;
    if (p.occupe || p.fini) return;
    const texte = file.current.shift();
    if (!texte) return;
    const coup = coupDepuisTexte(texte, p.etat.plateau, p.etat.tour, reglages.variante);
    if (coup) jouerLeCoup(coup, true);
  }, [jouerLeCoup, reglages.variante]);
  pomperRef.current = pomper;

  useEffect(() => {
    const coups = enLigne?.coups;
    if (!coups) return;
    const restants = coups.slice(appliques.current);
    if (restants.length === 0) return;
    appliques.current = coups.length;
    file.current.push(...restants);
    pomper();
  }, [enLigne?.coups, pomper]);

  const surClic = useCallback((point: number) => {
    const p = partie.current;
    if (p.occupe || p.fini) return;
    const fil = filRef.current;
    if (fil) {
      if (fil.fige || p.etat.tour !== fil.monCamp) return;
    } else if (reglages.mode === 'ordinateur' && p.etat.tour !== reglages.campHumain) return;

    const coups = coupsPossibles(p.etat.plateau, p.etat.tour, reglages.variante);

    if (p.choisi !== null) {
      // Plusieurs enchaînements peuvent finir sur le même point : on
      // retient celui qui emporte le plus d'oies. Les arrêts en cours
      // de route restent joignables, ils ont leur propre point vert.
      const candidats = coups.filter((c) => c.de === p.choisi && c.vers === point);
      if (candidats.length > 0) {
        const meilleur = candidats.reduce((a, b) => (b.prises.length > a.prises.length ? b : a));
        jouerLeCoup(meilleur);
        return;
      }
    }

    const sien = p.etat.plateau[point];
    const aMoi = p.etat.tour === 'renard' ? sien === 'renard' : sien === 'oie';
    if (aMoi && coups.some((c) => c.de === point)) {
      p.choisi = point;
      table.current?.surbrillance(point, coups.filter((c) => c.de === point).map((c) => c.vers));
      return;
    }
    p.choisi = null;
    table.current?.surbrillance(null, []);
  }, [jouerLeCoup, reglages.campHumain, reglages.mode, reglages.variante]);

  // La scène se monte une fois par partie. `surClic` est relu par une
  // référence : la table n'est jamais reconstruite au milieu du jeu.
  const clicRef = useRef(surClic);
  clicRef.current = surClic;

  useEffect(() => {
    if (!boite.current) return;
    penseur.current = nouveauPenseur();
    const t = creerTable(boite.current, (pt) => clicRef.current(pt));
    table.current = t;
    t.poser(partie.current.etat.plateau);
    annoncer();

    // Si l'ordinateur tient les oies, c'est lui qui ouvre. Sinon il
    // prend de l'avance pendant que le joueur cherche son premier coup.
    reveillerLaMachine();

    return () => {
      window.clearTimeout(reveil.current);
      penseur.current?.fermer();
      penseur.current = null;
      table.current = null;
      t.dispose();
    };
    // Monté une seule fois : la partie entière vit dans ces réglages,
    // et la page remonte le composant avec une nouvelle clé pour
    // rejouer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={boite} className="absolute inset-0" />;
};

// ── La page ─────────────────────────────────────────────────────────
const RenardPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const t = useMemo(() => TEXTES[lang], [lang]);

  // 🚨 Les identifiants « renard » ne sont pas encore dans les unions de
  // BadgesContext et de PubDebutPartie. Le transtypage saute le jour où
  // le chef les ajoute (voir INTEGRATION.md); la valeur passée à
  // l'exécution est bien « renard ».
  useBadgeJeu('renard');

  const [reglages, setReglages] = useState<Reglages>(REGLAGES_DEFAUT);
  /** La recherche d'adversaire retient sa fonction de rappel au moment
   *  du clic et la garde une minute entière. Les réglages se relisent
   *  donc par référence : ceux du clic peuvent être périmés quand la
   *  maison finit par s'asseoir. */
  const reglagesRef = useRef(reglages);
  reglagesRef.current = reglages;
  const [enPartie, setEnPartie] = useState(false);
  const [cle, setCle] = useState(0);
  const [pubEnAttente, setPubEnAttente] = useState<(() => void) | null>(null);
  const [reglesOuvertes, setReglesOuvertes] = useState(false);
  const [pleinEcran, setPleinEcran] = useState(false);
  /** Le nom tiré au sort quand la maison prend le siège à la table ouverte. */
  const [nomMaison, setNomMaison] = useState<string | null>(null);
  const [etat, setEtat] = useState<EtatPartie>(etatNeuf(13));

  const musiqueRef = useRef<BoutonMusiqueHandle>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  // ── La partie à deux, chacun chez soi ────────────────────────────
  // /jeux/renard?partie=<id> ouvre le défi accepté depuis la fiche de
  // l'autre personne. Le document ne porte que la liste des coups : les
  // deux moteurs la rejouent, exactement comme au tafl.
  const [params, setParams] = useSearchParams();
  const partieId = params.get('partie');
  // La visite guidée s'offre d'elle-même à la première venue, jamais
  // quand un défi attend à l'autre bout du fil.
  const tuto = useTutoriel('renard', !partieId);
  const { user } = useAuth();
  const [partie, setPartie] = useState<PartieTafl | null>(null);
  const enLigne = !!partieId;

  useEffect(() => {
    if (!partieId) { setPartie(null); return; }
    return suivrePartie(partieId, setPartie);
  }, [partieId]);

  const monCamp = useMemo<Camp | null>(() => {
    if (!partie || !user) return null;
    if (partie.camps.renard === user.uid) return 'renard';
    if (partie.camps.oies === user.uid) return 'oies';
    return null;
  }, [partie, user]);

  const nomAdverse = partie && user
    ? (partie.noms[partie.joueurs.find((u) => u !== user.uid) ?? ''] ?? '—')
    : '—';

  const victoireContreOrdinateur =
    enPartie && reglages.mode === 'ordinateur' && etat.gagnant === reglages.campHumain;
  useGagnerBadge('renard-victoire', victoireContreOrdinateur);

  /** Le nom lisible d'un règlement, pour les lignes de la table ouverte. */
  const nomRegle = useCallback((id: string) => {
    const r = REGLEMENTS.find((x) => x.id === id);
    return r ? (lang === 'FR' ? r.nomFR : r.nomEN) : id;
  }, [lang]);

  const commencer = (r: Reglages, nom: string | null = null) => {
    setReglages(r);
    setNomMaison(nom);
    setEtat(etatNeuf(reglement(r.variante).oies));
    setCle((k) => k + 1);
    setEnPartie(true);
    // Le clic sur « Commencer la partie » est le geste utilisateur qui
    // autorise le son : la musique part ici, pas au second clic.
    musiqueRef.current?.demarrer();
  };

  const retourAuMenu = () => {
    setEnPartie(false);
    setNomMaison(null);
    setEtat(etatNeuf(reglement(reglages.variante).oies));
  };

  // Les réglages ont été choisis au moment du défi : l'écran de
  // préparation n'a plus rien à demander, il saute.
  useEffect(() => {
    if (!partie || partie.statut !== 'encours' || enPartie) return;
    const variante: Variante = partie.regleId === 'oies17' ? 'oies17' : 'oies13';
    commencer({
      variante,
      mode: 'deux-joueurs',
      campHumain: monCamp ?? 'oies',
      niveau: NIVEAU_DEFAUT,
    });
    // `commencer` remonte la planche et ne dépend que de ce qu'on lui passe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partie, enPartie, monCamp]);

  const fil = partieId && monCamp && partie ? {
    monCamp,
    fige: partie.statut !== 'encours',
    coups: partie.coups,
    // Le verdict poussé au document est celui de l'arbitre, la nulle
    // comprise : une partie peut désormais se terminer sans vainqueur.
    surMonCoup: (texte: string, tourSuivant: Camp, gagnant: VerdictArbitre | null) => {
      // Le délai de la partie voyage avec le coup : sans lui, `jouerCoup`
      // efface l'échéance et le minuteur par coup ne repart jamais.
      void pousserLeCoup(partie.id, partie.coups ?? [], texte, tourSuivant, gagnant, partie.delaiMs);
    },
  } : null;

  useEffect(() => {
    const surChangement = () => setPleinEcran(document.fullscreenElement === sceneRef.current);
    document.addEventListener('fullscreenchange', surChangement);
    return () => document.removeEventListener('fullscreenchange', surChangement);
  }, []);

  const basculerPleinEcran = () => {
    if (!sceneRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else sceneRef.current.requestFullscreen().catch(() => {});
  };

  /** Le nom de celui d'en face quand c'est la machine. La maison joue
   *  sous un nom tiré au sort, et ce nom s'affiche partout où
   *  l'adversaire est nommé. */
  const nomMachine = nomMaison ?? t.machine;
  const texteFin = etat.gagnant === 'nulle'
    ? t.gagneNulle
    : etat.gagnant === 'renard' ? t.gagneRenard : t.gagneOies;

  const messageTour = (() => {
    if (!enPartie) return t.tablePrete;
    if (etat.gagnant) return texteFin;
    if (enLigne) return monCamp && etat.tour === monCamp ? t.aVousDeJouer : t.enAttente;
    if (reglages.mode === 'ordinateur' && etat.tour !== reglages.campHumain) return t.reflechit(nomMachine);
    return etat.tour === 'renard' ? t.tourRenard : t.tourOies;
  })();
  /** Ce que la boîte d'aide affiche : le geste attendu MAINTENANT, lu
   *  sur l'état réel de la planche. */
  const aideAction = (() => {
    if (!enPartie) return t.aidePreparer;
    if (etat.gagnant) return t.aideFini;
    if (enLigne && monCamp && etat.tour !== monCamp) return t.aideAttente(nomAdverse);
    if (!enLigne && reglages.mode === 'ordinateur' && etat.tour !== reglages.campHumain) return t.aideOrdinateur(nomMachine);
    const prefixe = enLigne ? `${t.aideAVous} ` : '';
    return prefixe + (etat.tour === 'oies' ? t.aideOies : t.aideRenard);
  })();

  const couleurTour = etat.tour === 'renard' ? '#B5551D' : '#E8DDC1';

  return (
    <>
      <SEO title={`${t.titre} | FMM 2026`} description={t.intro} />

      <CadreJeu
        eyebrow={t.eyebrow}
        titre={t.titre}
        intro={t.intro}
        orbImage="/jeux/tuile-renard.webp"
        lang={lang}
      >
        <div ref={sceneRef} data-tuto="plateau" className="absolute inset-0 bg-[#0a0406]">
          {pleinEcran && (
            <button
              type="button"
              onClick={basculerPleinEcran}
              className="absolute top-4 right-4 md:top-6 md:right-6 z-[7] inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-[15px] border border-brass/55 bg-black/70 backdrop-blur-md text-ivory hover:bg-brass hover:text-[#1A0A05] hover:border-brass transition-colors duration-200 font-sans text-[10px] md:text-[11px] uppercase tracking-[0.18em]"
              style={{ boxShadow: '0 10px 34px rgba(0,0,0,0.6)' }}
            >
              <Minimize2 size={13} />
              {t.quitterPleinEcran}
            </button>
          )}

          {enPartie && <Planche key={cle} reglages={reglages} onEtat={setEtat} enLigne={fil} />}

          {!enPartie && !enLigne && (
            <EcranPreparation
              depart={reglages}
              t={t}
              lang={lang}
              onCommencer={(r) => setPubEnAttente(() => () => commencer(r))}
              onTutoriel={tuto.ouvrir}
            />
          )}

          {/* ── Le défi reçu ou envoyé, avant que la planche ne se dresse ── */}
          {enLigne && !enPartie && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[6] w-[min(24rem,calc(100%-2rem))] rounded-[15px] border border-brass/40 bg-black/75 backdrop-blur-md px-6 py-6 text-center">
              <p className="font-sans uppercase tracking-[0.25em] text-[10px] text-brass mb-2">{t.defi}</p>
              {!partie || !user ? (
                <p className="font-display text-lg text-ivory">{t.chargement}</p>
              ) : partie.statut === 'refuse' ? (
                <p className="font-display text-lg text-ivory">{t.defiRefuse}</p>
              ) : partie.lancePar === user.uid ? (
                <>
                  <p className="font-display text-lg text-ivory mb-2">{t.defiEnvoye(nomAdverse)}</p>
                  <p className="font-sans text-xs text-ivory-soft/70">{t.defiAttente}</p>
                </>
              ) : (
                <>
                  <p className="font-display text-lg text-ivory mb-2">
                    {t.vousDefie(partie.noms[partie.lancePar] ?? '—')}
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => { void repondreAuDefi(partie.id, true); }}
                      className="px-5 py-2.5 rounded-full bg-brass text-[#1A0A05] font-sans uppercase tracking-[0.18em] text-[10px] font-semibold hover:bg-brass-soft transition-colors"
                    >
                      {t.accepter}
                    </button>
                    <button
                      type="button"
                      onClick={() => { void repondreAuDefi(partie.id, false); }}
                      className="px-5 py-2.5 rounded-full border border-white/20 text-ivory-soft hover:text-ivory font-sans uppercase tracking-[0.18em] text-[10px] transition-colors"
                    >
                      {t.refuser}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── La partie à deux : contre qui, quel camp, à qui de jouer ── */}
          {partie && monCamp && user && (
            <div className="absolute left-3 md:left-6 top-16 z-20 w-[min(22rem,calc(100%-1.5rem))] rounded-[15px] border border-white/15 bg-black/45 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block font-display text-[13px] text-ivory truncate">
                  {t.contre} {nomAdverse}
                </span>
                <span className="block font-sans text-[9px] uppercase tracking-[0.16em] text-ivory-soft/60 mt-1">
                  {t.vousTenez} {monCamp === 'renard' ? t.campRenard : t.campOies}
                  {' · '}
                  {partie.statut === 'fini'
                    ? t.partieFinie
                    : etat.tour === monCamp ? t.aVousDeJouer : t.enAttente}
                </span>
              </span>
              {partie.statut === 'encours' && (
                <button
                  type="button"
                  onClick={() => { void abandonner(partie.id, user.uid, monCamp === 'renard' ? 'oies' : 'renard'); }}
                  className="shrink-0 px-3 py-2 rounded-[15px] border border-white/15 text-ivory-soft hover:text-ivory hover:border-brass/60 transition-colors font-sans text-[9px] uppercase tracking-[0.18em]"
                >
                  {t.abandonner}
                </button>
              )}
            </div>
          )}

          {pubEnAttente && (
            <PubDebutPartie
              lang={lang}
              jeu="renard"
              onContinuer={() => { const action = pubEnAttente; setPubEnAttente(null); action(); }}
            />
          )}

          {etat.gagnant && enPartie && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.9, ease: 'easeOut' }}
              className="absolute inset-0 z-[5] flex flex-col items-center justify-center px-6 text-center bg-[rgba(10,4,6,0.85)] backdrop-blur-md"
            >
              <p className="font-editorial uppercase tracking-[0.4em] text-[11px] md:text-xs text-[var(--color-amber-glow)] mb-3">
                {t.finTitre}
              </p>
              <h2 className="font-display title-medieval text-2xl md:text-4xl text-ivory leading-[1.15] max-w-xl">
                {texteFin}
              </h2>
              {etat.evenement && (
                <p className="font-editorial text-[13px] md:text-sm text-ivory-soft/80 mt-3 max-w-md leading-relaxed">
                  {texteEvenement(etat.evenement, lang === 'FR')}
                </p>
              )}
              <div className="divider-brass w-24 mx-auto my-7" />
              {enLigne ? (
                <Link
                  to={lang === 'FR' ? '/jeux-en-ligne' : '/en/online-games'}
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 min-h-[48px] rounded-[15px] bg-brass text-[#1A0A05] border border-brass font-sans text-xs md:text-sm uppercase tracking-[0.22em] hover:bg-brass-soft transition-colors duration-200"
                >
                  {t.retourTable} <ArrowUpRight size={15} />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={retourAuMenu}
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 min-h-[48px] rounded-[15px] bg-brass text-[#1A0A05] border border-brass font-sans text-xs md:text-sm uppercase tracking-[0.22em] hover:bg-brass-soft transition-colors duration-200"
                >
                  <RotateCcw size={15} />
                  {t.rejouer}
                </button>
              )}
            </motion.div>
          )}
        </div>

        {/* ── Bandeau du haut : à qui de jouer, et les commandes ──── */}
        <div
          className="absolute top-0 inset-x-0 z-30 flex flex-wrap items-center justify-between gap-3 pl-4 md:pl-7 pr-16 md:pr-20 py-3"
          style={{ background: 'linear-gradient(180deg, rgba(8,3,5,0.92), rgba(8,3,5,0))' }}
        >
          <span className="inline-flex items-center gap-2.5 min-w-0">
            <span
              aria-hidden
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: couleurTour, boxShadow: `0 0 10px ${couleurTour}` }}
            />
            <span className="font-sans text-[11px] md:text-xs uppercase tracking-[0.18em] text-ivory-soft truncate">
              {messageTour}
            </span>
          </span>
          <span className="shrink-0 inline-flex items-center gap-2" data-tuto="musique">
            <BoutonMusique ref={musiqueRef} cle="renard" defaut="menestrel" lang={lang} onLabel={t.musiqueOn} offLabel={t.musiqueOff} />
            <button
              type="button"
              onClick={basculerPleinEcran}
              title={pleinEcran ? t.quitterPleinEcran : t.pleinEcran}
              aria-pressed={pleinEcran}
              className="shrink-0 inline-flex items-center gap-2 px-3 py-2 min-h-[40px] rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md text-ivory-soft hover:text-ivory hover:border-brass/60 transition-colors duration-200 font-sans text-[10px] md:text-[11px] uppercase tracking-[0.18em]"
            >
              {pleinEcran ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              <span className="hidden sm:inline">{pleinEcran ? t.quitterPleinEcran : t.pleinEcran}</span>
            </button>
            {enPartie && !enLigne && (
              <button
                type="button"
                onClick={retourAuMenu}
                className="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md text-ivory-soft hover:text-ivory hover:border-brass/60 transition-colors duration-200 font-sans text-[10px] md:text-[11px] uppercase tracking-[0.18em]"
              >
                <RotateCcw size={12} />
                <span className="hidden sm:inline">{t.rejouer}</span>
              </button>
            )}
          </span>
        </div>

        {/* ── L'arbitre parle : la traînarde, la répétition, le plafond ── */}
        <AnimatePresence>
          {etat.evenement && !etat.gagnant && (
            <motion.p
              key={`${etat.evenement}-${etat.demiCoups}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className={`absolute ${enLigne ? 'top-32' : 'top-16'} left-1/2 -translate-x-1/2 z-30 w-[min(24rem,calc(100%-2rem))] text-center px-4 py-2.5 rounded-[15px] border border-brass/40 bg-black/70 backdrop-blur-md font-editorial text-[13px] text-ivory`}
            >
              {texteEvenement(etat.evenement, lang === 'FR')}
            </motion.p>
          )}
        </AnimatePresence>

        {/* ── La table ouverte et la parole, posées sur la planche ─── */}
        {user && (
          <RenardPanneaux
            lang={lang}
            regleId={reglages.variante}
            monCamp={reglages.campHumain}
            nomRegle={nomRegle}
            table={!enLigne}
            parole={enPartie}
            decale={enLigne}
            salle={partieId ? { collection: 'taflParties', partieId } : null}
            moi={{ uid: user.uid, nom: user.displayName?.trim() || t.unInconnu }}
            adversaire={nomMaison ?? (enLigne ? nomAdverse : undefined)}
            // La planche qui tourne redescend au menu AVANT que le lien
            // de la partie ne se pose. Sans ce retour, une partie contre
            // la machine restait montée pendant que les coups de l'autre
            // bout se déversaient dessus : l'effet du défi accepté ne
            // dresse la planche en ligne que si aucune partie ne tourne.
            surPartie={(id) => { retourAuMenu(); setParams({ partie: id }); }}
            // Personne en une minute : la partie part sur-le-champ, au
            // connétable, sans écran de réglages et sans rien demander.
            surOrdinateur={(nom) => commencer(
              { ...reglagesRef.current, mode: 'ordinateur', niveau: NIVEAU_MAISON }, nom,
            )}
          />
        )}

        {/* ── Les règles, dans un panneau posé sur la planche ──────── */}
        <AnimatePresence>
          {reglesOuvertes && (
            <motion.aside
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-3 md:left-6 bottom-20 z-30 w-[22rem] max-w-[calc(100%-1.5rem)] max-h-[72%] overflow-y-auto rounded-[15px] border border-white/15 bg-black/60 backdrop-blur-xl p-5"
            >
              <button
                type="button"
                onClick={() => setReglesOuvertes(false)}
                aria-label={lang === 'FR' ? 'Fermer' : 'Close'}
                className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full text-ivory-soft/70 hover:text-ivory hover:bg-white/10 transition-colors"
              >
                <X size={15} />
              </button>
              <p className="font-sans uppercase tracking-[0.28em] text-[10px] text-[var(--color-amber-glow)] mb-1.5">
                {t.reglesEyebrow}
              </p>
              <h2 className="font-display title-medieval text-xl text-ivory">{t.reglesTitre}</h2>
              <div className="divider-brass w-12 my-4" />
              <ol className="space-y-4 list-none">
                {t.regles.map((r, i) => {
                  const Icone = [Swords, Feather, PawPrint][i] ?? Swords;
                  return (
                    <li key={r.titre} className="flex gap-3">
                      <span
                        aria-hidden
                        className="w-9 h-9 shrink-0 rounded-full bg-brass/15 border border-brass/40 grid place-items-center"
                      >
                        <Icone size={16} className="text-brass" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-display title-medieval text-base text-ivory mb-1">{r.titre}</span>
                        <span className="block font-editorial text-[13px] text-ivory-soft leading-relaxed">{r.corps}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-5 pt-4 border-t border-white/10">
                <p className="font-editorial text-[13px] text-ivory-soft/85 leading-relaxed">{t.atelierTexte}</p>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ── Bandeau du bas : les règles, le geste, les camps ─────── */}
        <div
          className="absolute inset-x-0 bottom-0 z-[3] flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-3 md:px-6 pt-10 pb-3"
          style={{ background: 'linear-gradient(0deg, rgba(8,3,5,0.94), rgba(8,3,5,0))' }}
        >
          <button
            type="button"
            onClick={() => setReglesOuvertes((v) => !v)}
            aria-expanded={reglesOuvertes}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brass/45 bg-black/50 backdrop-blur-md font-sans uppercase tracking-[0.18em] text-[10px] text-ivory hover:bg-brass/15 transition-colors duration-200"
          >
            <Scroll size={13} className="text-brass" />
            {reglesOuvertes ? t.cacherRegles : t.afficherRegles}
          </button>
          <span className="font-sans text-[10px] md:text-[11px] text-ivory-soft/65 text-center">{t.indice}</span>
          <BoutonTutoriel onClick={tuto.ouvrir} lang={lang} className="!min-h-0 py-2" />
          <span data-tuto="compteur" className="flex flex-wrap justify-center gap-x-4 gap-y-1 font-sans text-[10px] md:text-[11px]">
            <span style={{ color: '#C0763E' }}>{t.pointRenard}</span>
            <span className="text-ivory-soft">{t.pointOies(etat.oies)}</span>
          </span>
        </div>
        {/* ── « Je ne sais pas quoi faire » ───────────────────────── */}
        {!etat.gagnant && (
          <BoiteAide
            but={t.aideBut}
            action={aideAction}
            lang={lang}
            className="right-3 md:right-6 bottom-24"
          />
        )}
      </CadreJeu>

      <Tutoriel jeu="renard" lang={lang} ouvert={tuto.ouvert} onFermer={tuto.fermer} />
    </>
  );
};

export default RenardPage;
