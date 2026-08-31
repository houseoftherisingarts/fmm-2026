// ─── La Mérelle : la page du jeu ────────────────────────────────────
// Alex, 2026-08-30 : quatrième jeu de la table, pour « L'année du
// Seigneur ». Même cadre que les trois autres (CadreJeu à orbe, la
// table qui prend tout l'écran, les panneaux posés dessus en verre
// sombre), et même écran de préparation à quatre colonnes avec le
// bouton toujours sous les yeux.
//
// La règle vit dans logic.ts, l'adversaire dans cpu.ts, le bois dans
// scene.ts. Cette page ne fait que trois choses : traduire un clic en
// coup, lancer l'animation qui va avec, et dire à qui de jouer.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Cpu, RotateCcw, Scroll, X, Maximize2, Minimize2, Feather,
  Circle, Grid3x3, Hand, Swords,
} from 'lucide-react';

import CadreJeu from '../../components/jeux/CadreJeu';
import BoutonMusique, { type BoutonMusiqueHandle } from '../../components/jeux/BoutonMusique';
import PubDebutPartie from '../../components/jeux/PubDebutPartie';
import SEO from '../../components/SEO';
import { useUI } from '../../contexts/AppContext';
import { useCaravanPage } from '../../lib/useCaravanPage';
import { useBadgeJeu, useGagnerBadge } from '../../contexts/BadgesContext';

import {
  aPoserDe, compte, destinations, etatInitial, jouer, phaseDe,
  retraitsPossibles, type Camp, type Coup, type Etat,
} from './logic';
import { choisirCoup, type Difficulte } from './cpu';
import { monterScene, type SceneMerelle } from './scene';

type Mode = 'deux-joueurs' | 'ordinateur';

interface Reglage {
  mode: Mode;
  /** Le camp de la personne, quand elle joue contre la machine. */
  camp: Camp;
  difficulte: Difficulte;
  /** La variante du vol : à trois pions, on saute où l'on veut. */
  vol: boolean;
}

const REGLAGE_DEFAUT: Reglage = {
  mode: 'ordinateur', camp: 1, difficulte: 'moyen', vol: true,
};

/** Le temps que la machine fait mine de réfléchir. Une réponse
 *  instantanée donne l'impression d'un mur, pas d'un adversaire. */
const DELAI_ORDINATEUR = 560;

// ─── Les mots ────────────────────────────────────────────────────────
interface Textes {
  eyebrow: string;
  titre: string;
  intro: string;
  tablePrete: string;
  preparer: string;
  sousTitre: string;
  colVariante: string;
  colMode: string;
  colDifficulte: string;
  colCamp: string;
  vol: string;
  volSans: string;
  volTexte: string;
  modeDeux: string;
  modeOrdi: string;
  facile: string;
  moyen: string;
  difficile: string;
  campClair: string;
  campSombre: string;
  commencer: string;
  nouvelle: string;
  aVous: string;
  clairJoue: string;
  sombreJoue: string;
  reflechit: string;
  posez: string;
  deplacez: string;
  volez: string;
  retirez: string;
  moulinFerme: string;
  gagne: (camp: string) => string;
  fin: string;
  geste: string;
  enMain: string;
  surLePlateau: string;
  musiqueOn: string;
  musiqueOff: string;
  pleinEcran: string;
  quitterPleinEcran: string;
  afficherRegles: string;
  cacherRegles: string;
  reglesEyebrow: string;
  reglesTitre: string;
  regles: Array<{ titre: string; corps: string }>;
  atelier: string;
}

const MOTS: Record<'FR' | 'EN', Textes> = {
  FR: {
    eyebrow: 'L’année du Seigneur · Jeu de plateau',
    titre: 'La Mérelle',
    intro:
      'Trois carrés emboîtés, vingt-quatre points et neuf pions chacun : la mérelle se jouait dans les cloîtres autant que dans les tavernes, et on en trouve encore le plateau gravé sur les bancs de pierre des cathédrales. Le but n’a pas bougé depuis : aligner trois pions pour fermer un moulin, et retirer un pion adverse chaque fois qu’un moulin se ferme. Celui qui tombe à deux pions, ou qui ne peut plus bouger un seul homme, a perdu.',
    tablePrete: 'La table est prête',
    preparer: 'Dressez le plateau',
    sousTitre: 'Neuf pions chacun',
    colVariante: 'La variante',
    colMode: 'Le mode',
    colDifficulte: 'La difficulté',
    colCamp: 'Votre camp',
    vol: 'Le vol à trois pions',
    volSans: 'Sans le vol',
    volTexte:
      'Réduit à trois pions, un joueur peut poser son homme sur n’importe quel point libre au lieu de suivre les lignes. C’est la règle la plus répandue, et elle laisse une chance au camp qui perd.',
    modeDeux: 'Deux joueurs',
    modeOrdi: 'Contre l’ordinateur',
    facile: 'Facile',
    moyen: 'Intermédiaire',
    difficile: 'Difficile',
    campClair: 'Chêne clair',
    campSombre: 'Bois teint',
    commencer: 'Commencer la partie',
    nouvelle: 'Nouvelle partie',
    aVous: 'À vous de jouer',
    clairJoue: 'Au chêne clair',
    sombreJoue: 'Au bois teint',
    reflechit: 'L’adversaire réfléchit…',
    posez: 'Posez un pion sur un point libre',
    deplacez: 'Glissez un pion vers un point voisin',
    volez: 'Trois pions : posez-vous où vous voulez',
    retirez: 'Moulin fermé : retirez un pion adverse',
    moulinFerme: 'Moulin',
    gagne: (camp) => `${camp} l’emporte`,
    fin: 'La partie se termine',
    geste: 'Cliquez un pion · Cliquez un point allumé · Glissez pour pivoter',
    enMain: 'en main',
    surLePlateau: 'sur le plateau',
    musiqueOn: 'Couper',
    musiqueOff: 'Musique',
    pleinEcran: 'Plein écran',
    quitterPleinEcran: 'Quitter le plein écran',
    afficherRegles: 'Afficher les règles',
    cacherRegles: 'Cacher les règles',
    reglesEyebrow: 'Avant de vous asseoir',
    reglesTitre: 'Quatre choses à savoir',
    regles: [
      {
        titre: 'La pose',
        corps: 'Chacun pose ses neuf pions à tour de rôle, sur les points libres de son choix. Rien ne bouge tant que les dix-huit pions ne sont pas sur le bois.',
      },
      {
        titre: 'Le moulin',
        corps: 'Trois pions alignés sur une ligne gravée forment un moulin. Les diagonales ne comptent pas, et c’est l’erreur que tout le monde fait la première fois.',
      },
      {
        titre: 'La prise',
        corps: 'Fermer un moulin donne le droit de retirer un pion adverse. Un pion qui tient lui-même un moulin est protégé, sauf si tous les autres le sont aussi.',
      },
      {
        titre: 'La fin',
        corps: 'Après la pose, les pions glissent d’un point à un point voisin. Un joueur perd quand il tombe à deux pions ou qu’aucun de ses hommes ne peut plus bouger.',
      },
    ],
    atelier: 'Plateau, pions et code sortis de l’atelier du Salon des Inconnus.',
  },
  EN: {
    eyebrow: 'The Year of the Lord · Board game',
    titre: 'Nine Men’s Morris',
    intro:
      'Three nested squares, twenty-four points and nine men each: morris was played in cloisters as much as in taverns, and the board is still there, scratched into the stone benches of cathedrals. The aim has not changed since: line up three men to close a mill, and take one enemy man every time a mill closes. Whoever drops to two men, or can no longer move a single one, has lost.',
    tablePrete: 'The table is set',
    preparer: 'Set the board',
    sousTitre: 'Nine men each',
    colVariante: 'The variant',
    colMode: 'The mode',
    colDifficulte: 'Difficulty',
    colCamp: 'Your side',
    vol: 'Flying at three men',
    volSans: 'No flying',
    volTexte:
      'Down to three men, a player may set a man on any free point instead of following the lines. It is the most common rule, and it gives the losing side a way back.',
    modeDeux: 'Two players',
    modeOrdi: 'Against the computer',
    facile: 'Easy',
    moyen: 'Intermediate',
    difficile: 'Hard',
    campClair: 'Pale oak',
    campSombre: 'Stained wood',
    commencer: 'Start the game',
    nouvelle: 'New game',
    aVous: 'Your move',
    clairJoue: 'Pale oak to move',
    sombreJoue: 'Stained wood to move',
    reflechit: 'Your opponent is thinking…',
    posez: 'Set a man on a free point',
    deplacez: 'Slide a man to a neighbouring point',
    volez: 'Three men left: land anywhere you like',
    retirez: 'Mill closed: take an enemy man',
    moulinFerme: 'Mill',
    gagne: (camp) => `${camp} wins`,
    fin: 'The game ends',
    geste: 'Click a man · Click a lit point · Drag to turn the table',
    enMain: 'in hand',
    surLePlateau: 'on the board',
    musiqueOn: 'Mute',
    musiqueOff: 'Music',
    pleinEcran: 'Full screen',
    quitterPleinEcran: 'Leave full screen',
    afficherRegles: 'Show the rules',
    cacherRegles: 'Hide the rules',
    reglesEyebrow: 'Before you sit down',
    reglesTitre: 'Four things to know',
    regles: [
      {
        titre: 'Placing',
        corps: 'Each player sets nine men in turn, on any free point. Nothing moves until all eighteen are on the wood.',
      },
      {
        titre: 'The mill',
        corps: 'Three men on one engraved line make a mill. Diagonals do not count, and that is the mistake everyone makes the first time.',
      },
      {
        titre: 'Taking',
        corps: 'Closing a mill lets you remove an enemy man. A man holding a mill is safe, unless every enemy man is holding one too.',
      },
      {
        titre: 'The end',
        corps: 'After placing, men slide from point to neighbouring point. A player loses at two men, or when none of their men can move.',
      },
    ],
    atelier: 'Board, men and code out of the workshop of Le Salon des Inconnus.',
  },
};

// ─── Le jeton de choix, grammaire des autres jeux ───────────────────
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
    className={`inline-flex items-center gap-2 px-3 py-2 md:px-5 md:py-2.5 rounded-card border font-sans text-[10px] md:text-xs uppercase tracking-[0.12em] md:tracking-[0.18em] transition-colors duration-200 min-h-[44px] ${
      actif
        ? 'bg-brass text-[#1A0A05] border-brass'
        : 'bg-black/30 text-ivory-soft border-brass/35 hover:border-brass hover:text-ivory'
    }`}
  >
    {icone}
    {children}
  </button>
);

const Colonne: React.FC<{ num: string; label: string; children: React.ReactNode }> = ({ num, label, children }) => (
  <section className="rounded-card border border-brass/20 bg-black/30 p-3.5 md:p-4 min-w-0">
    <p className="flex items-baseline gap-2.5 mb-3 md:mb-4">
      <span className="font-display title-medieval text-lg md:text-xl" style={{ color: 'rgba(232,177,74,0.6)' }}>{num}</span>
      <span className="font-sans text-[10px] md:text-[11px] uppercase tracking-[0.35em] text-brass/70">{label}</span>
    </p>
    <div className="flex flex-col items-stretch gap-2">{children}</div>
  </section>
);

// ─── L'écran de préparation ─────────────────────────────────────────
const EcranDepart: React.FC<{
  initial: Reglage;
  t: Textes;
  onCommencer: (r: Reglage) => void;
}> = ({ initial, t, onCommencer }) => {
  const [mode, setMode] = useState<Mode>(initial.mode);
  const [camp, setCamp] = useState<Camp>(initial.camp);
  const [difficulte, setDifficulte] = useState<Difficulte>(initial.difficulte);
  const [vol, setVol] = useState<boolean>(initial.vol);

  return (
    <div className="absolute inset-0 z-[5] flex flex-col bg-[rgba(10,4,6,0.82)] backdrop-blur-md">
      <div className="shrink-0 text-center px-4 pt-4 md:pt-6">
        <p className="font-editorial uppercase tracking-[0.4em] text-[10px] md:text-xs text-[var(--color-amber-glow)] mb-1.5 md:mb-2">
          {t.sousTitre}
        </p>
        <h2 className="font-display title-medieval text-2xl md:text-4xl text-ivory leading-[1.06]">
          {t.preparer}
        </h2>
        <div className="divider-brass w-24 mx-auto mt-3 mb-3 md:mt-4 md:mb-5" />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 pb-2">
        <div className="grid gap-3 md:gap-4 lg:grid-cols-4 max-w-6xl mx-auto items-start">
          <Colonne num="I" label={t.colVariante}>
            <Pastille actif={vol} onClick={() => setVol(true)} icone={<Feather size={13} />}>
              {t.vol}
            </Pastille>
            <Pastille actif={!vol} onClick={() => setVol(false)} icone={<Grid3x3 size={13} />}>
              {t.volSans}
            </Pastille>
            <p className="font-editorial text-[12px] md:text-[13px] text-ivory-soft/75 mt-2 leading-snug">
              {t.volTexte}
            </p>
          </Colonne>

          <Colonne num="II" label={t.colMode}>
            <Pastille actif={mode === 'deux-joueurs'} onClick={() => setMode('deux-joueurs')} icone={<Users size={13} />}>
              {t.modeDeux}
            </Pastille>
            <Pastille actif={mode === 'ordinateur'} onClick={() => setMode('ordinateur')} icone={<Cpu size={13} />}>
              {t.modeOrdi}
            </Pastille>
          </Colonne>

          <Colonne num="III" label={t.colDifficulte}>
            <div className={mode === 'ordinateur' ? 'flex flex-col gap-2' : 'flex flex-col gap-2 opacity-40 pointer-events-none'}>
              <Pastille actif={difficulte === 'facile'} onClick={() => setDifficulte('facile')}>{t.facile}</Pastille>
              <Pastille actif={difficulte === 'moyen'} onClick={() => setDifficulte('moyen')}>{t.moyen}</Pastille>
              <Pastille actif={difficulte === 'difficile'} onClick={() => setDifficulte('difficile')}>{t.difficile}</Pastille>
            </div>
          </Colonne>

          <Colonne num="IV" label={t.colCamp}>
            <div className={mode === 'ordinateur' ? 'flex flex-col gap-2' : 'flex flex-col gap-2 opacity-40 pointer-events-none'}>
              <Pastille actif={camp === 1} onClick={() => setCamp(1)} icone={<Circle size={13} />}>
                {t.campClair}
              </Pastille>
              <Pastille actif={camp === 2} onClick={() => setCamp(2)} icone={<Circle size={13} fill="currentColor" />}>
                {t.campSombre}
              </Pastille>
            </div>
          </Colonne>
        </div>
      </div>

      {/* Le bouton vit au bas de la fenêtre, hors du défilement : il ne
          peut jamais passer sous le pli, même quand les colonnes
          s'empilent sur téléphone. */}
      <div
        className="shrink-0 flex justify-center px-4 pt-3 pb-3 md:pb-4"
        style={{ background: 'linear-gradient(0deg, rgba(10,4,6,0.96) 62%, rgba(10,4,6,0))' }}
      >
        <button
          type="button"
          onClick={() => onCommencer({ mode, camp, difficulte, vol })}
          className="inline-flex items-center gap-2.5 px-8 py-3.5 min-h-[48px] rounded-card bg-brass text-[#1A0A05] border border-brass font-sans text-xs md:text-sm uppercase tracking-[0.22em] hover:bg-brass-soft transition-colors duration-200"
        >
          <Swords size={15} />
          {t.commencer}
        </button>
      </div>
    </div>
  );
};

// ─── La page ─────────────────────────────────────────────────────────
const MerellePage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const t = useMemo(() => MOTS[lang], [lang]);

  // Le badge de présence. `useBadgeJeu` ne connaît encore que les trois
  // premiers jeux : le transtypage garde l'appel prévu et la mérelle
  // s'inscrit quand même dans la liste des jeux essayés. INTEGRATION.md
  // demande d'élargir l'union à 'merelle' dans BadgesContext.
  useBadgeJeu('merelle');

  const [reglage, setReglage] = useState<Reglage>(REGLAGE_DEFAUT);
  const reglageRef = useRef(reglage);
  reglageRef.current = reglage;

  const [commencee, setCommencee] = useState(false);
  const [cle, setCle] = useState(0);
  const [pubEnAttente, setPubEnAttente] = useState<(() => void) | null>(null);
  const [reglesOuvertes, setReglesOuvertes] = useState(false);
  const [pleinEcran, setPleinEcran] = useState(false);

  const etatRef = useRef<Etat>(etatInitial(REGLAGE_DEFAUT.vol));
  const [etat, setEtat] = useState<Etat>(etatRef.current);
  const [selection, setSelection] = useState<number | null>(null);
  const selectionRef = useRef<number | null>(null);
  selectionRef.current = selection;
  const animeRef = useRef(false);

  const sceneRef = useRef<SceneMerelle | null>(null);
  const montageRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const musiqueRef = useRef<BoutonMusiqueHandle>(null);

  const majEtat = useCallback((e: Etat) => { etatRef.current = e; setEtat(e); }, []);

  /** Joue un coup : la scène anime, l'état ne bascule qu'une fois le
   *  pion posé. Le verrou d'animation ferme la table entre les deux. */
  const jouerCoup = useCallback((coup: Coup) => {
    const avant = etatRef.current;
    const apres = jouer(avant, coup);
    if (apres === avant) return;
    animeRef.current = true;
    setSelection(null);
    sceneRef.current?.allumer({});
    const fini = () => { animeRef.current = false; majEtat(apres); };
    const sc = sceneRef.current;
    if (!sc) { fini(); return; }
    if (coup.type === 'pose') sc.poser(coup.vers, avant.tour, fini);
    else if (coup.type === 'deplacement') sc.deplacer(coup.de, coup.vers, fini);
    else sc.retirer(coup.p, fini);
  }, [majEtat]);

  /** Est-ce à un humain de jouer ? En deux joueurs, toujours. Contre la
   *  machine, seulement quand c'est le tour de son camp. */
  const humainJoue = useCallback((e: Etat, r: Reglage) => (
    r.mode === 'deux-joueurs' || e.tour === r.camp
  ), []);

  // ── Le clic sur un point ─────────────────────────────────────────
  const surPoint = useCallback((p: number) => {
    if (animeRef.current) return;
    const e = etatRef.current;
    const r = reglageRef.current;
    if (e.gagnant || !humainJoue(e, r)) return;

    if (e.doitRetirer) {
      if (retraitsPossibles(e).includes(p)) jouerCoup({ type: 'retrait', p });
      return;
    }
    if (aPoserDe(e, e.tour) > 0) {
      if (e.points[p] === 0) jouerCoup({ type: 'pose', vers: p });
      return;
    }
    const tenu = selectionRef.current;
    if (tenu !== null && destinations(e, tenu).includes(p)) {
      jouerCoup({ type: 'deplacement', de: tenu, vers: p });
      return;
    }
    // Un pion à soi se prend en main; le même pion recliqué se repose.
    if (e.points[p] === e.tour) setSelection(tenu === p ? null : p);
    else setSelection(null);
  }, [humainJoue, jouerCoup]);

  // ── La scène ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!commencee) return;
    const el = montageRef.current;
    if (!el) return;
    const sc = monterScene(el);
    sceneRef.current = sc;
    sc.reinitialiser(etatRef.current.points);
    const detacherEntrees = sc.attacherEntrees(surPoint);
    const detacherResize = sc.attacherResize();
    return () => {
      detacherEntrees();
      detacherResize();
      sc.dispose();
      sceneRef.current = null;
    };
  }, [commencee, cle, surPoint]);

  // ── La surbrillance suit l'état et la main ───────────────────────
  useEffect(() => {
    const sc = sceneRef.current;
    if (!sc) return;
    if (etat.gagnant || !humainJoue(etat, reglage)) { sc.allumer({}); return; }
    if (etat.doitRetirer) { sc.allumer({ retraits: retraitsPossibles(etat) }); return; }
    if (selection !== null) {
      sc.allumer({ selection, destinations: destinations(etat, selection) });
      return;
    }
    sc.allumer({});
  }, [etat, selection, reglage, humainJoue]);

  // ── Le tour de la machine ────────────────────────────────────────
  useEffect(() => {
    if (!commencee || reglage.mode !== 'ordinateur') return;
    if (etat.gagnant || etat.tour === reglage.camp) return;
    const minuteur = window.setTimeout(() => {
      const coup = choisirCoup(etatRef.current, reglageRef.current.difficulte);
      if (coup) jouerCoup(coup);
    }, DELAI_ORDINATEUR);
    return () => window.clearTimeout(minuteur);
  }, [etat, commencee, reglage.mode, reglage.camp, jouerCoup]);

  // ── Le badge de victoire ─────────────────────────────────────────
  const victoireContreOrdinateur = commencee
    && reglage.mode === 'ordinateur'
    && etat.gagnant === reglage.camp;
  useGagnerBadge('merelle-victoire', victoireContreOrdinateur);

  // ── Le plein écran ───────────────────────────────────────────────
  // On écoute l'événement natif : le navigateur peut aussi en sortir par
  // Échap ou par son propre bouton, et la page doit se remettre en ordre
  // dans les trois cas.
  useEffect(() => {
    const surChangement = () => setPleinEcran(document.fullscreenElement === tableRef.current);
    document.addEventListener('fullscreenchange', surChangement);
    return () => document.removeEventListener('fullscreenchange', surChangement);
  }, []);

  const basculerPleinEcran = () => {
    if (!tableRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else tableRef.current.requestFullscreen().catch(() => {});
  };

  // ── Départ et retour au menu ─────────────────────────────────────
  const demarrer = (r: Reglage) => {
    setReglage(r);
    reglageRef.current = r;
    const neuf = etatInitial(r.vol);
    etatRef.current = neuf;
    setEtat(neuf);
    setSelection(null);
    animeRef.current = false;
    setCle((k) => k + 1);
    setCommencee(true);
    // Le clic sur « Commencer la partie » est le vrai geste qui autorise
    // le son : la musique part ici, pas au second clic.
    musiqueRef.current?.demarrer();
  };

  const retourAuMenu = () => {
    setCommencee(false);
    const neuf = etatInitial(reglageRef.current.vol);
    etatRef.current = neuf;
    setEtat(neuf);
    setSelection(null);
    animeRef.current = false;
  };

  // ── Ce qui s'écrit dans le bandeau ───────────────────────────────
  const nomCamp = (c: Camp) => (c === 1 ? t.campClair : t.campSombre);
  const messageTour = (): string => {
    if (!commencee) return t.tablePrete;
    if (etat.gagnant) return t.gagne(nomCamp(etat.gagnant));
    const aMoi = humainJoue(etat, reglage);
    if (!aMoi) return t.reflechit;
    if (etat.doitRetirer) return t.retirez;
    if (reglage.mode === 'deux-joueurs') {
      const qui = etat.tour === 1 ? t.clairJoue : t.sombreJoue;
      if (aPoserDe(etat, etat.tour) > 0) return `${qui} · ${t.posez}`;
      return `${qui} · ${phaseDe(etat, etat.tour) === 'vol' ? t.volez : t.deplacez}`;
    }
    if (aPoserDe(etat, etat.tour) > 0) return `${t.aVous} · ${t.posez}`;
    return `${t.aVous} · ${phaseDe(etat, etat.tour) === 'vol' ? t.volez : t.deplacez}`;
  };

  const teinteTour = etat.tour === 1 ? '#D9B681' : '#A6392B';

  return (
    <>
      <SEO title={`${t.titre} | FMM 2026`} description={t.intro} />

      <CadreJeu
        eyebrow={t.eyebrow}
        titre={t.titre}
        intro={t.intro}
        orbImage="/jeux/tuile-merelle.webp"
        lang={lang}
      >
        {/* ── La table ────────────────────────────────────────────── */}
        <div ref={tableRef} className="absolute inset-0 bg-[#0a0604]">
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

          {commencee && <div ref={montageRef} style={{ width: '100%', height: '100%' }} />}

          {!commencee && (
            <>
              <div
                aria-hidden
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundColor: '#1a1008',
                  backgroundImage: 'url(/jeux/tuile-merelle.webp)',
                }}
              />
              <EcranDepart
                initial={reglage}
                t={t}
                onCommencer={(r) => setPubEnAttente(() => () => demarrer(r))}
              />
            </>
          )}

          {/* La pub AdSense, entre le clic et le vrai départ. */}
          {pubEnAttente && (
            <PubDebutPartie
              lang={lang}
              jeu="merelle"
              onContinuer={() => { const action = pubEnAttente; setPubEnAttente(null); action(); }}
            />
          )}

          {etat.gagnant && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7, ease: 'easeOut' }}
              className="absolute inset-0 z-[5] flex flex-col items-center justify-center px-6 text-center bg-[rgba(10,4,6,0.85)] backdrop-blur-md"
            >
              <p className="font-editorial uppercase tracking-[0.4em] text-[11px] md:text-xs text-[var(--color-amber-glow)] mb-3">
                {t.fin}
              </p>
              <h2 className="font-display title-medieval text-2xl md:text-4xl text-ivory leading-[1.15] max-w-xl">
                {t.gagne(nomCamp(etat.gagnant))}
              </h2>
              <div className="divider-brass w-24 mx-auto my-7" />
              <button
                type="button"
                onClick={retourAuMenu}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 min-h-[48px] rounded-[15px] bg-brass text-[#1A0A05] border border-brass font-sans text-xs md:text-sm uppercase tracking-[0.22em] hover:bg-brass-soft transition-colors duration-200"
              >
                <RotateCcw size={15} />
                {t.nouvelle}
              </button>
            </motion.div>
          )}
        </div>

        {/* ── Bandeau du haut ─────────────────────────────────────── */}
        <div
          className="absolute top-0 inset-x-0 z-20 flex flex-wrap items-center justify-between gap-3 pl-4 md:pl-7 pr-16 md:pr-20 py-3"
          style={{ background: 'linear-gradient(180deg, rgba(8,3,5,0.92), rgba(8,3,5,0))' }}
        >
          <span className="inline-flex items-center gap-2.5 min-w-0">
            <span
              aria-hidden
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: teinteTour, boxShadow: `0 0 10px ${teinteTour}` }}
            />
            <span className="font-sans text-[11px] md:text-xs uppercase tracking-[0.18em] text-ivory-soft truncate">
              {messageTour()}
            </span>
          </span>
          <span className="shrink-0 inline-flex items-center gap-2">
            <BoutonMusique
              ref={musiqueRef}
              cle="merelle"
              url="/audio/master-of-the-feast.mp3"
              titre="Master of the Feast · Kevin MacLeod"
              onLabel={t.musiqueOn}
              offLabel={t.musiqueOff}
            />
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
            {commencee && (
              <button
                type="button"
                onClick={retourAuMenu}
                className="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md text-ivory-soft hover:text-ivory hover:border-brass/60 transition-colors duration-200 font-sans text-[10px] md:text-[11px] uppercase tracking-[0.18em]"
              >
                <RotateCcw size={12} />
                <span className="hidden sm:inline">{t.nouvelle}</span>
              </button>
            )}
          </span>
        </div>

        {/* ── Le décompte des pions ───────────────────────────────── */}
        {commencee && !etat.gagnant && (
          <div className="absolute left-3 md:left-6 top-16 z-20 rounded-[15px] border border-white/15 bg-black/45 backdrop-blur-md px-4 py-3 font-sans text-[10px] uppercase tracking-[0.16em]">
            {([1, 2] as Camp[]).map((c) => (
              <span key={c} className="flex items-center gap-2.5 py-0.5">
                <span
                  aria-hidden
                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/40"
                  style={{ background: c === 1 ? '#D9B681' : '#452A18' }}
                />
                <span className="text-ivory-soft">{nomCamp(c)}</span>
                <span className="text-brass tabular-nums">
                  {compte(etat.points, c)} {t.surLePlateau}
                </span>
                {aPoserDe(etat, c) > 0 && (
                  <span className="text-ivory-soft/60 tabular-nums">
                    · {aPoserDe(etat, c)} {t.enMain}
                  </span>
                )}
              </span>
            ))}
          </div>
        )}

        {/* ── Les règles, posées sur la table ─────────────────────── */}
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
                  const Icone = [Hand, Grid3x3, Swords, Feather][i] ?? Hand;
                  return (
                    <li key={r.titre} className="flex gap-3">
                      <span
                        aria-hidden
                        className="w-9 h-9 shrink-0 rounded-full bg-brass/15 border border-brass/40 grid place-items-center"
                      >
                        <Icone size={16} className="text-brass" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-display title-medieval text-base text-ivory mb-1">
                          {r.titre}
                        </span>
                        <span className="block font-editorial text-[13px] text-ivory-soft leading-relaxed">
                          {r.corps}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
              <p className="mt-5 pt-4 border-t border-white/10 font-editorial text-[13px] text-ivory-soft/85 leading-relaxed">
                {t.atelier}
              </p>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ── Bandeau du bas ──────────────────────────────────────── */}
        <div
          className="absolute inset-x-0 bottom-0 z-20 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-3 md:px-6 pt-10 pb-3"
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
          <span className="font-sans text-[10px] md:text-[11px] text-ivory-soft/65 text-center">
            {t.geste}
          </span>
        </div>
      </CadreJeu>
    </>
  );
};

export default MerellePage;
