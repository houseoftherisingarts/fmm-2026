// ─── Le Renard et les Oies : la page du jeu ─────────────────────────
// Alex, 2026-08-30 : même protocole que le hnefatafl et le jeu de dés.
// CadreJeu porte le hero à orbe et l'aire de jeu plein écran, la table
// 3D vit dessous, et tout le reste (règles, réglages, musique, plein
// écran) se pose dessus en verre sombre. Aucune section détachée sous
// le jeu.
//
// La règle et l'histoire ne sont pas inventées : HISTOIRE.md, à côté,
// donne les sources et dit ce qui reste incertain.

import React, {
  forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Cpu, Feather, Maximize2, Minimize2, Music, PawPrint, RotateCcw, Scroll,
  Swords, Users, VolumeX, X,
} from 'lucide-react';

import CadreJeu from '../../components/jeux/CadreJeu';
import PubDebutPartie from '../../components/jeux/PubDebutPartie';
import SEO from '../../components/SEO';
import { useUI } from '../../contexts/AppContext';
import { useCaravanPage } from '../../lib/useCaravanPage';
import { annoncerLecture, ecouterExclusivite } from '../../lib/audioExclusif';
import { useBadgeJeu, useGagnerBadge } from '../../contexts/BadgesContext';
import {
  coupsPossibles, jouer, nbOies, plateauInitial, REGLEMENTS, reglement, verdict,
  VARIANTE_DEFAUT, type Camp, type Coup, type Plateau, type Variante,
} from './logic';
import { choisirCoup, type Difficulte } from './cpu';
import { creerTable, type Table3D } from './scene';

type Mode = 'deux-joueurs' | 'ordinateur';

interface Reglages {
  variante: Variante;
  mode: Mode;
  campHumain: Camp;
  difficulte: Difficulte;
}

const REGLAGES_DEFAUT: Reglages = {
  variante: VARIANTE_DEFAUT,
  mode: 'deux-joueurs',
  campHumain: 'oies',
  difficulte: 'moyen',
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
  labelDifficulte: string;
  modeDeux: string;
  modeOrdi: string;
  campRenard: string;
  campOies: string;
  diffFacile: string;
  diffMoyen: string;
  diffDifficile: string;
  commencer: string;
  tablePrete: string;
  tourRenard: string;
  tourOies: string;
  reflechit: string;
  gagneRenard: string;
  gagneOies: string;
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
    labelDifficulte: 'Difficulté',
    modeDeux: 'Deux joueurs',
    modeOrdi: 'Contre l’ordinateur',
    campRenard: 'Le renard',
    campOies: 'Les oies',
    diffFacile: 'Facile',
    diffMoyen: 'Intermédiaire',
    diffDifficile: 'Difficile',
    commencer: 'Commencer la partie',
    tablePrete: 'La planche est prête',
    tourRenard: 'Au renard de jouer',
    tourOies: 'Aux oies de jouer',
    reflechit: 'L’ordinateur réfléchit…',
    gagneRenard: 'Le troupeau est trop maigre. Le renard l’emporte',
    gagneOies: 'Le renard est cerné. Les oies l’emportent',
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
    labelDifficulte: 'Difficulty',
    modeDeux: 'Two players',
    modeOrdi: 'Against the computer',
    campRenard: 'The fox',
    campOies: 'The geese',
    diffFacile: 'Easy',
    diffMoyen: 'Medium',
    diffDifficile: 'Hard',
    commencer: 'Begin the game',
    tablePrete: 'The plank is ready',
    tourRenard: 'The fox to play',
    tourOies: 'The geese to play',
    reflechit: 'The computer is thinking…',
    gagneRenard: 'The flock is too thin. The fox wins',
    gagneOies: 'The fox is hemmed in. The geese win',
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
}> = ({ depart, t, lang, onCommencer }) => {
  const [variante, setVariante] = useState<Variante>(depart.variante);
  const [mode, setMode] = useState<Mode>(depart.mode);
  const [campHumain, setCampHumain] = useState<Camp>(depart.campHumain);
  const [difficulte, setDifficulte] = useState<Difficulte>(depart.difficulte);
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

          <Colonne num="IV" label={t.labelDifficulte}>
            <Pastille actif={difficulte === 'facile'} onClick={() => setDifficulte('facile')}>{t.diffFacile}</Pastille>
            <Pastille actif={difficulte === 'moyen'} onClick={() => setDifficulte('moyen')}>{t.diffMoyen}</Pastille>
            <Pastille actif={difficulte === 'difficile'} onClick={() => setDifficulte('difficile')}>{t.diffDifficile}</Pastille>
            {mode === 'deux-joueurs' && (
              <p className="font-editorial text-[12px] text-ivory-soft/60 mt-1 leading-snug">
                {lang === 'FR'
                  ? 'Ce réglage attend la partie contre l’ordinateur.'
                  : 'This setting waits for a game against the computer.'}
              </p>
            )}
          </Colonne>
        </div>
      </div>

      {/* Le bouton vit hors du défilement : il reste visible même quand
          les quatre colonnes s'empilent sur téléphone. */}
      <div
        className="shrink-0 flex justify-center px-4 pt-3 pb-3 md:pb-4"
        style={{ background: 'linear-gradient(0deg, rgba(10,4,6,0.96) 62%, rgba(10,4,6,0))' }}
      >
        <button
          type="button"
          onClick={() => onCommencer({ variante, mode, campHumain, difficulte })}
          className="inline-flex items-center gap-2.5 px-8 py-3.5 min-h-[48px] rounded-[15px] bg-brass text-[#1A0A05] border border-brass font-sans text-xs md:text-sm uppercase tracking-[0.22em] hover:bg-brass-soft transition-colors duration-200"
        >
          <Swords size={15} />
          {t.commencer}
        </button>
      </div>
    </div>
  );
};

// ── La musique du plateau ───────────────────────────────────────────
// Facultative, jamais automatique, et exclusive du lecteur de l'en-tête.
const MUSIQUE_URL = '/audio/nordic-wist.mp3';
const MUSIQUE_TITRE = 'Nordic Wist · Kevin MacLeod, CC BY 4.0';

interface BoutonMusiqueHandle { demarrer(): void; }

const BoutonMusique = forwardRef<BoutonMusiqueHandle, { onLabel: string; offLabel: string }>(
  ({ onLabel, offLabel }, ref) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [joue, setJoue] = useState(false);

    useEffect(() => ecouterExclusivite('renard', () => {
      audioRef.current?.pause();
      setJoue(false);
    }), []);

    const jouerPiste = () => {
      const a = audioRef.current;
      if (!a || joue) return;
      annoncerLecture('renard');
      a.volume = 0.3;
      a.play().then(() => setJoue(true)).catch(() => setJoue(false));
    };

    useImperativeHandle(ref, () => ({ demarrer: jouerPiste }), [joue]);

    return (
      <>
        <audio ref={audioRef} src={MUSIQUE_URL} loop preload="none" />
        <button
          type="button"
          onClick={() => {
            const a = audioRef.current;
            if (!a) return;
            if (joue) { a.pause(); setJoue(false); return; }
            jouerPiste();
          }}
          title={MUSIQUE_TITRE}
          aria-pressed={joue}
          className={`shrink-0 inline-flex items-center gap-2 px-3 py-2 min-h-[40px] rounded-[15px] border transition-colors duration-200 font-sans text-[10px] md:text-[11px] uppercase tracking-[0.18em] ${
            joue ? 'border-brass/60 text-ivory' : 'border-brass/30 text-ivory-soft hover:text-ivory hover:border-brass/60'
          }`}
        >
          {joue ? <VolumeX size={12} /> : <Music size={12} />}
          <span className="hidden sm:inline">{joue ? onLabel : offLabel}</span>
        </button>
      </>
    );
  },
);
BoutonMusique.displayName = 'BoutonMusique';

// ── La planche jouable ──────────────────────────────────────────────
interface EtatPartie {
  tour: Camp;
  oies: number;
  gagnant: Camp | null;
  attente: boolean;
}

const Planche: React.FC<{
  reglages: Reglages;
  onEtat: (e: EtatPartie) => void;
}> = ({ reglages, onEtat }) => {
  const boite = useRef<HTMLDivElement>(null);
  const table = useRef<Table3D | null>(null);
  const partie = useRef({
    plateau: plateauInitial(reglages.variante) as Plateau,
    tour: 'oies' as Camp,
    choisi: null as number | null,
    occupe: false,
    fini: false,
  });

  // Les oies ouvrent : c'est le troupeau qui se met en marche, le
  // renard réagit. Réglé une fois, jamais changé en cours de partie.
  const annoncer = useCallback(() => {
    const p = partie.current;
    onEtat({
      tour: p.tour,
      oies: nbOies(p.plateau),
      gagnant: p.fini ? (verdict(p.plateau, p.tour, reglages.variante) ?? null) : null,
      attente: p.occupe,
    });
  }, [onEtat, reglages.variante]);

  const jouerLeCoup = useCallback((coup: Coup) => {
    const p = partie.current;
    if (p.occupe || p.fini) return;
    p.occupe = true;
    p.choisi = null;
    table.current?.surbrillance(null, []);
    p.plateau = jouer(p.plateau, coup);
    annoncer();

    table.current?.animer(coup, () => {
      const suivant: Camp = p.tour === 'renard' ? 'oies' : 'renard';
      p.tour = suivant;
      p.occupe = false;
      const fin = verdict(p.plateau, suivant, reglages.variante);
      if (fin) { p.fini = true; annoncer(); return; }
      annoncer();

      // Au tour de l'ordinateur : il réfléchit dans un temps mort pour
      // que l'animation précédente respire avant la suivante.
      if (reglages.mode === 'ordinateur' && suivant !== reglages.campHumain) {
        window.setTimeout(() => {
          const choix = choisirCoup(p.plateau, suivant, reglages.variante, reglages.difficulte);
          if (choix) jouerLeCoup(choix);
        }, 480);
      }
    });
  }, [annoncer, reglages.campHumain, reglages.difficulte, reglages.mode, reglages.variante]);

  const surClic = useCallback((point: number) => {
    const p = partie.current;
    if (p.occupe || p.fini) return;
    if (reglages.mode === 'ordinateur' && p.tour !== reglages.campHumain) return;

    const coups = coupsPossibles(p.plateau, p.tour, reglages.variante);

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

    const sien = p.plateau[point];
    const aMoi = p.tour === 'renard' ? sien === 'renard' : sien === 'oie';
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
    const t = creerTable(boite.current, (pt) => clicRef.current(pt));
    table.current = t;
    t.poser(partie.current.plateau);
    annoncer();

    // Si l'ordinateur tient les oies, c'est lui qui ouvre.
    let depart = 0;
    if (reglages.mode === 'ordinateur' && reglages.campHumain === 'renard') {
      depart = window.setTimeout(() => {
        const choix = choisirCoup(partie.current.plateau, 'oies', reglages.variante, reglages.difficulte);
        if (choix) jouerLeCoup(choix);
      }, 700);
    }

    return () => {
      window.clearTimeout(depart);
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
  useBadgeJeu('renard' as unknown as 'tafl');

  const [reglages, setReglages] = useState<Reglages>(REGLAGES_DEFAUT);
  const [enPartie, setEnPartie] = useState(false);
  const [cle, setCle] = useState(0);
  const [pubEnAttente, setPubEnAttente] = useState<(() => void) | null>(null);
  const [reglesOuvertes, setReglesOuvertes] = useState(false);
  const [pleinEcran, setPleinEcran] = useState(false);
  const [etat, setEtat] = useState<EtatPartie>({ tour: 'oies', oies: 13, gagnant: null, attente: false });

  const musiqueRef = useRef<BoutonMusiqueHandle>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  const victoireContreOrdinateur =
    enPartie && reglages.mode === 'ordinateur' && etat.gagnant === reglages.campHumain;
  useGagnerBadge('renard-victoire', victoireContreOrdinateur);

  const commencer = (r: Reglages) => {
    setReglages(r);
    setEtat({ tour: 'oies', oies: reglement(r.variante).oies, gagnant: null, attente: false });
    setCle((k) => k + 1);
    setEnPartie(true);
    // Le clic sur « Commencer la partie » est le geste utilisateur qui
    // autorise le son : la musique part ici, pas au second clic.
    musiqueRef.current?.demarrer();
  };

  const retourAuMenu = () => {
    setEnPartie(false);
    setEtat({ tour: 'oies', oies: reglement(reglages.variante).oies, gagnant: null, attente: false });
  };

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

  const messageTour = (() => {
    if (!enPartie) return t.tablePrete;
    if (etat.gagnant) return etat.gagnant === 'renard' ? t.gagneRenard : t.gagneOies;
    if (reglages.mode === 'ordinateur' && etat.tour !== reglages.campHumain) return t.reflechit;
    return etat.tour === 'renard' ? t.tourRenard : t.tourOies;
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
        <div ref={sceneRef} className="absolute inset-0 bg-[#0a0406]">
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

          {enPartie && <Planche key={cle} reglages={reglages} onEtat={setEtat} />}

          {!enPartie && (
            <EcranPreparation
              depart={reglages}
              t={t}
              lang={lang}
              onCommencer={(r) => setPubEnAttente(() => () => commencer(r))}
            />
          )}

          {pubEnAttente && (
            <PubDebutPartie
              lang={lang}
              jeu={'renard' as 'des'}
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
                {etat.gagnant === 'renard' ? t.gagneRenard : t.gagneOies}
              </h2>
              <div className="divider-brass w-24 mx-auto my-7" />
              <button
                type="button"
                onClick={retourAuMenu}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 min-h-[48px] rounded-[15px] bg-brass text-[#1A0A05] border border-brass font-sans text-xs md:text-sm uppercase tracking-[0.22em] hover:bg-brass-soft transition-colors duration-200"
              >
                <RotateCcw size={15} />
                {t.rejouer}
              </button>
            </motion.div>
          )}
        </div>

        {/* ── Bandeau du haut : à qui de jouer, et les commandes ──── */}
        <div
          className="absolute top-0 inset-x-0 z-20 flex flex-wrap items-center justify-between gap-3 pl-4 md:pl-7 pr-16 md:pr-20 py-3"
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
          <span className="shrink-0 inline-flex items-center gap-2">
            <BoutonMusique ref={musiqueRef} onLabel={t.musiqueOn} offLabel={t.musiqueOff} />
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
            {enPartie && (
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
          <span className="font-sans text-[10px] md:text-[11px] text-ivory-soft/65 text-center">{t.indice}</span>
          <span className="flex flex-wrap justify-center gap-x-4 gap-y-1 font-sans text-[10px] md:text-[11px]">
            <span style={{ color: '#C0763E' }}>{t.pointRenard}</span>
            <span className="text-ivory-soft">{t.pointOies(etat.oies)}</span>
          </span>
        </div>
      </CadreJeu>
    </>
  );
};

export default RenardPage;
