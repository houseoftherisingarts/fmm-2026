import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices, RotateCcw, ScrollText, Users } from 'lucide-react';
import CadreJeu from '../../components/jeux/CadreJeu';
import BoutonMusique, { type BoutonMusiqueHandle } from '../../components/jeux/BoutonMusique';
import PubDebutPartie from '../../components/jeux/PubDebutPartie';
import Tutoriel, { BoutonTutoriel, useTutoriel } from '../Tutoriel';
import SEO from '../../components/SEO';
import { useUI } from '../../contexts/AppContext';
import { useBadgeJeu, useGagnerBadge } from '../../contexts/BadgesContext';
import { useCaravanPage } from '../../lib/useCaravanPage';
import { creerTable, type TableDes } from '../des/scene';
import { SKINS_DE, SKINS_TABLE, chargerEmbleme, choisirParures, type IdSkinDe, type IdSkinTable } from '../des/skins';
import { marchesDes } from '../des/cpu';
import type { Niveau } from '../moteur/niveaux';
import {
  CIBLE, OISEAUX, clorReflexe, crier, garder, grelottine, lancer, lancerTroisDes, lancerUnDe, nomCombinaison,
  nouvellePartie, passer, siroter, soufflette, tourSuivant, type Face, type Partie,
} from './regles';
import { cibleSoufflette, delaiCri, pariSirop, veutDefierGrelottine, veutSiroter } from './cpu';
import { Pupitre, Parures, REGLES_EN, REGLES_FR, textes } from './Pupitre';

// ─── Le Cul de chouette ─────────────────────────────────────────────
// Le jeu de l'année de la Peste (Alex, 2026-09-12) : le jeu de dés de
// Kaamelott, joué sur la même table de taverne que les dés du menteur.
// Trois dés, deux chouettes puis le cul, et le premier à 343 points.
// La page orchestre le temps (les lancers, les cris, les paris); le
// règlement vit dans regles.ts et la maison dans cpu.ts.

const NOMS_MACHINE = ['Perceval', 'Karadoc', 'Le Bourreau', 'Dame Ysabeau', 'Frère Anselme'];
/** Le temps que la table laisse aux gens pour crier, parier ou relever un défi. */
const FENETRE_MS = 3200;

const ChouettePage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const fr = lang === 'FR';
  const t = useMemo(() => textes(fr), [fr]);
  const tuto = useTutoriel('chouette', true);

  const [niveau, setNiveau] = useState<Niveau>(() => {
    const n = Number(localStorage.getItem('fmm.chouette.niveau'));
    return (n >= 1 && n <= 10 ? n : 5) as Niveau;
  });
  const marches = useMemo(() => marchesDes(fr), [fr]);
  const [nbJoueurs, setNbJoueurs] = useState(3);
  const [partie, setPartieEtat] = useState<Partie | null>(null);
  const partieRef = useRef<Partie | null>(null);
  const setPartie = useCallback((p: Partie | null) => { partieRef.current = p; setPartieEtat(p); }, []);
  /** Les dés sont en l'air : rien ne se crie, rien ne se clique. */
  const [enVol, setEnVol] = useState(false);
  /** Un pari est ouvert sur le sirotage d'un autre. */
  const [pariOuvert, setPariOuvert] = useState<Face | null>(null);
  const monPari = useRef<Face | null>(null);
  const [grelotOuvert, setGrelotOuvert] = useState(false);
  const [bulles, setBulles] = useState<Record<number, string>>({});
  const [ancres, setAncres] = useState<Array<{ x: number; y: number }>>([]);
  const [reglesOuvertes, setReglesOuvertes] = useState(false);
  const [pubEnAttente, setPubEnAttente] = useState<(() => void) | null>(null);
  const musiqueRef = useRef<BoutonMusiqueHandle>(null);
  const minuteries = useRef<number[]>([]);
  const niveauJoue = useRef<Niveau>(niveau);

  useBadgeJeu('chouette');
  useGagnerBadge('chouette', !!partie && partie.phase === 'fini' && partie.gagnantId === 'j0');

  // ── Les parures, comme aux dés du menteur ───────────────────────
  const [skinDe, setSkinDe] = useState<IdSkinDe>(() => (localStorage.getItem('fmm.des.skinDe') as IdSkinDe) || 'os');
  const [skinTable, setSkinTable] = useState<IdSkinTable>(() => (localStorage.getItem('fmm.des.skinTable') as IdSkinTable) || 'chene');
  const [pretParures, setPretParures] = useState(0);
  useEffect(() => {
    const de = SKINS_DE.find((k) => k.id === skinDe);
    const tb = SKINS_TABLE.find((k) => k.id === skinTable);
    choisirParures(de?.embleme, tb?.embleme);
    localStorage.setItem('fmm.des.skinDe', skinDe);
    localStorage.setItem('fmm.des.skinTable', skinTable);
    let restant = 2;
    const fini = () => { restant -= 1; if (restant <= 0) setPretParures((n) => n + 1); };
    chargerEmbleme(de?.embleme, fini);
    chargerEmbleme(tb?.embleme, fini);
  }, [skinDe, skinTable]);

  const sceneRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<TableDes | null>(null);
  useEffect(() => {
    if (!sceneRef.current) return;
    const tb = creerTable();
    tb.monter(sceneRef.current);
    tableRef.current = tb;
    const p = partieRef.current;
    if (p) {
      tb.disposer(p.joueurs.length);
      tb.mains(p.joueurs.map(() => 3));
      tb.designer(p.tour);
    }
    return () => { tb.demonter(); tableRef.current = null; };
  }, [pretParures]);

  useEffect(() => {
    let vivant = true;
    const suivre = () => {
      if (!vivant) return;
      const a = tableRef.current?.ancres();
      if (a && a.length) setAncres(a);
      window.setTimeout(suivre, 400);
    };
    suivre();
    return () => { vivant = false; };
  }, []);

  const plusTard = useCallback((ms: number, f: () => void) => {
    const id = window.setTimeout(f, ms);
    minuteries.current.push(id);
    return id;
  }, []);
  const toutArreter = useCallback(() => {
    minuteries.current.forEach((id) => window.clearTimeout(id));
    minuteries.current = [];
  }, []);
  useEffect(() => toutArreter, [toutArreter]);

  const bulle = useCallback((i: number, texte: string) => {
    setBulles((b) => ({ ...b, [i]: texte }));
    plusTard(1900, () => setBulles((b) => { const c = { ...b }; delete c[i]; return c; }));
  }, [plusTard]);

  /** Les dés des convives : ceux du joueur `i` sont posés devant lui, les autres restent cachés. */
  const montrerDes = useCallback((i: number, des: Face[]) => {
    const p = partieRef.current;
    if (!p || i === 0) return;
    tableRef.current?.devoiler(p.joueurs.slice(1).map((_, k) => (k === i - 1 ? des : [])), true);
  }, []);

  // ── Le tour, phase après phase ──────────────────────────────────
  const finirTour = useCallback(() => {
    const p = partieRef.current;
    if (!p) return;
    const q = tourSuivant(p);
    setPartie(q);
    setPariOuvert(null);
    setGrelotOuvert(false);
    if (q.phase === 'fini') return;
    tableRef.current?.designer(q.tour);
    if (q.joueurs[q.tour].machine) plusTard(900, () => jouerMachine());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPartie, plusTard]);

  const apresLancer = useCallback((q: Partie) => {
    setPartie(q);
    const moi = q.joueurs[q.tour];
    const nom = q.combinaison ? nomCombinaison(q.combinaison, fr) : '';
    if (q.combinaison && q.combinaison.points) bulle(q.tour, `${nom} : ${q.combinaison.points}`);
    else if (q.combinaison) bulle(q.tour, nom);
    switch (q.phase) {
      case 'attente':
        plusTard(1500, finirTour);
        break;
      case 'sirop': {
        if (!moi.machine) return; // les boutons Siroter et Garder attendent
        plusTard(1100, () => {
          const p = partieRef.current;
          if (!p || p.phase !== 'sirop') return;
          if (!veutSiroter(p, niveauJoue.current)) { setPartie(garder(p)); plusTard(900, finirTour); return; }
          bulle(p.tour, t.jeSirote);
          setPariOuvert(p.combinaison!.valeur);
          monPari.current = null;
          plusTard(FENETRE_MS, () => {
            const p2 = partieRef.current;
            if (!p2) return;
            const paris: Record<string, Face> = {};
            p2.joueurs.forEach((j, k) => {
              if (k === p2.tour) return;
              const f = j.machine ? pariSirop(j, p2.combinaison!.valeur, niveauJoue.current) : monPari.current;
              if (f) { paris[j.id] = f; bulle(k, OISEAUX[f]); }
            });
            setPariOuvert(null);
            const de = lancerUnDe();
            plusTard(700, () => {
              const p3 = partieRef.current;
              if (!p3) return;
              const r = siroter(p3, paris, de, fr);
              montrerDes(p3.tour, r.partie.des);
              setPartie(r.partie);
              bulle(p3.tour, r.reussi ? t.culReussi : t.sirotRate);
              plusTard(1800, finirTour);
            });
          });
        });
        break;
      }
      case 'reflexe': {
        // Chaque convive crie au bout de son temps; la fenêtre se ferme
        // ensuite sur ceux qui se sont tus.
        q.joueurs.forEach((j, k) => {
          if (!j.machine) return;
          plusTard(delaiCri(niveauJoue.current), () => {
            const p = partieRef.current;
            if (!p || p.phase !== 'reflexe') return;
            const type = p.reflexe!.type;
            const r = crier(p, j.id, type, fr);
            setPartie(r);
            bulle(k, type === 'suite' ? t.grelotte : t.pasMou);
            if (r.phase === 'attente') plusTard(1500, finirTour);
          });
        });
        plusTard(FENETRE_MS, () => {
          const p = partieRef.current;
          if (!p || p.phase !== 'reflexe') return;
          setPartie(clorReflexe(p, fr));
          plusTard(1300, finirTour);
        });
        break;
      }
      case 'soufflette': {
        if (!moi.machine) return; // le lanceur humain choisit sa cible
        plusTard(1100, () => {
          const p = partieRef.current;
          if (!p || p.phase !== 'soufflette') return;
          const cible = cibleSoufflette(p, niveauJoue.current);
          if (!cible) { setPartie(passer(p)); plusTard(700, finirTour); return; }
          jouerSoufflette(cible);
        });
        break;
      }
      case 'grelottine': {
        // Quelqu'un tient une grelottine : la maison se décide vite, le
        // joueur a la fenêtre pour crier « Grelottine ! ».
        const porteurs = q.joueurs.filter((j, k) => k !== q.tour && j.grelottine && j.score > 0);
        if (porteurs.some((j) => !j.machine)) setGrelotOuvert(true);
        porteurs.filter((j) => j.machine).forEach((j) => {
          plusTard(700 + Math.random() * 900, () => {
            const p = partieRef.current;
            if (!p || p.phase !== 'grelottine') return;
            if (veutDefierGrelottine(j, niveauJoue.current)) jouerGrelottine(j.id);
          });
        });
        plusTard(FENETRE_MS, () => {
          const p = partieRef.current;
          if (!p || p.phase !== 'grelottine') return;
          setGrelotOuvert(false);
          setPartie(passer(p));
          plusTard(600, finirTour);
        });
        break;
      }
      default:
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fr, t, bulle, plusTard, finirTour, montrerDes, setPartie]);

  /** Le défié jette jusqu'à trois fois pour faire 4-2-1. */
  const jouerSoufflette = useCallback((cibleId: string) => {
    const p = partieRef.current;
    if (!p || p.phase !== 'soufflette') return;
    const k = p.joueurs.findIndex((j) => j.id === cibleId);
    bulle(p.tour, t.soufflette);
    const r = soufflette(p, cibleId, undefined, fr);
    const montrer = (n: number) => {
      const jet = r.jets[n];
      if (!jet) { setPartie(r.partie); bulle(k, r.reussiAu !== null ? t.reussi : t.rate); plusTard(1600, finirTour); return; }
      if (k === 0) { setEnVol(true); tableRef.current?.lancer(jet, () => { setEnVol(false); plusTard(500, () => montrer(n + 1)); }); }
      else { montrerDes(k, jet); plusTard(1400, () => montrer(n + 1)); }
    };
    montrer(0);
  }, [bulle, t, fr, setPartie, plusTard, finirTour, montrerDes]);

  /** Le défié doit sortir un cul de chouette en un jet. */
  const jouerGrelottine = useCallback((defiantId: string) => {
    const p = partieRef.current;
    if (!p || p.phase !== 'grelottine') return;
    setGrelotOuvert(false);
    const kDefiant = p.joueurs.findIndex((j) => j.id === defiantId);
    bulle(kDefiant, t.grelottine);
    const des = lancerTroisDes();
    const fin = () => {
      const p2 = partieRef.current;
      if (!p2) return;
      const r = grelottine(p2, defiantId, des, fr);
      setPartie(r.partie);
      bulle(p2.tour, r.reussi ? t.reussi : t.rate);
      plusTard(1700, finirTour);
    };
    plusTard(900, () => {
      if (p.tour === 0) { setEnVol(true); tableRef.current?.lancer(des, () => { setEnVol(false); fin(); }); }
      else { montrerDes(p.tour, des); plusTard(1300, fin); }
    });
  }, [bulle, t, fr, setPartie, plusTard, finirTour, montrerDes]);

  const jouerMachine = useCallback(() => {
    const p = partieRef.current;
    if (!p || p.phase !== 'attente' || !p.joueurs[p.tour].machine) return;
    tableRef.current?.remuer([p.tour]);
    const des = lancerTroisDes();
    plusTard(1500, () => {
      const p2 = partieRef.current;
      if (!p2) return;
      montrerDes(p2.tour, des);
      apresLancer(lancer(p2, des, fr));
    });
  }, [plusTard, montrerDes, apresLancer, fr]);

  // ── Les gestes du joueur ────────────────────────────────────────
  const lancerMoi = useCallback(() => {
    const p = partieRef.current;
    if (!p || p.phase !== 'attente' || p.tour !== 0 || enVol || p.des.length > 0) return;
    const des = lancerTroisDes();
    setEnVol(true);
    tableRef.current?.devoiler([], false);
    tableRef.current?.lancer(des, () => {
      setEnVol(false);
      const p2 = partieRef.current;
      if (p2) apresLancer(lancer(p2, des, fr));
    });
  }, [enVol, apresLancer, fr]);

  const siroterMoi = useCallback(() => {
    const p = partieRef.current;
    if (!p || p.phase !== 'sirop' || p.tour !== 0) return;
    bulle(0, t.jeSirote);
    const paris: Record<string, Face> = {};
    p.joueurs.forEach((j, k) => {
      if (k === 0) return;
      const f = pariSirop(j, p.combinaison!.valeur, niveauJoue.current);
      if (f) { paris[j.id] = f; bulle(k, OISEAUX[f]); }
    });
    const de = lancerUnDe();
    const chouette = p.combinaison!.valeur;
    setEnVol(true);
    // La table relance les trois dés : les deux chouettes retombent sur
    // leur face, seul le cul change vraiment.
    tableRef.current?.lancer([chouette, chouette, de], () => {
      setEnVol(false);
      const p2 = partieRef.current;
      if (!p2) return;
      const r = siroter(p2, paris, de, fr);
      setPartie(r.partie);
      bulle(0, r.reussi ? t.culReussi : t.sirotRate);
      plusTard(1800, finirTour);
    });
  }, [bulle, t, fr, setPartie, plusTard, finirTour]);

  const garderMoi = useCallback(() => {
    const p = partieRef.current;
    if (!p || p.phase !== 'sirop' || p.tour !== 0) return;
    setPartie(garder(p));
    plusTard(700, finirTour);
  }, [setPartie, plusTard, finirTour]);

  const crierMoi = useCallback((quoi: 'suite' | 'pasmou') => {
    const p = partieRef.current;
    if (!p || enVol || p.phase === 'fini') return;
    const r = crier(p, 'j0', quoi, fr);
    setPartie(r);
    bulle(0, quoi === 'suite' ? t.grelotte : t.pasMou);
    if (p.phase === 'reflexe' && r.phase === 'attente') plusTard(1500, finirTour);
  }, [enVol, fr, setPartie, bulle, t, plusTard, finirTour]);

  const passerMoi = useCallback(() => {
    const p = partieRef.current;
    if (!p || (p.phase !== 'soufflette' && p.phase !== 'grelottine')) return;
    setGrelotOuvert(false);
    setPartie(passer(p));
    plusTard(600, finirTour);
  }, [setPartie, plusTard, finirTour]);

  const commencer = useCallback(() => {
    toutArreter();
    const noms = [{ nom: fr ? 'Vous' : 'You', machine: false }, ...NOMS_MACHINE.slice(0, nbJoueurs - 1).map((n) => ({ nom: n, machine: true }))];
    const p = nouvellePartie(noms);
    niveauJoue.current = niveau;
    setPartie(p);
    setBulles({});
    tableRef.current?.disposer(nbJoueurs);
    tableRef.current?.devoiler([], false);
    tableRef.current?.mains(p.joueurs.map(() => 3));
    tableRef.current?.designer(0);
    musiqueRef.current?.demarrer();
  }, [toutArreter, fr, nbJoueurs, niveau, setPartie]);

  const moi = partie?.joueurs[0];
  const monTour = !!partie && partie.tour === 0;

  return (
    <>
      <SEO title={`${t.titre} | FMM 2026`} description={t.intro} />
      <CadreJeu eyebrow={t.eyebrow} titre={t.titre} intro={t.intro} orbImage="/jeux/tuile-chouette.webp" lang={lang}>
        <div ref={sceneRef} className="absolute inset-0" />

        {pubEnAttente && (
          <PubDebutPartie lang={lang} jeu="chouette" onContinuer={() => { const a = pubEnAttente; setPubEnAttente(null); a(); }} />
        )}

        {/* Les bulles : ce que chacun crie, au-dessus de sa place */}
        <AnimatePresence>
          {partie && Object.entries(bulles).map(([idx, texte]) => {
            const i = Number(idx);
            const a = ancres[i];
            if (!a) return null;
            return (
              <motion.div
                key={`bulle-${i}-${texte}`}
                initial={{ opacity: 0, y: 8, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute z-20 pointer-events-none"
                style={{ left: `${a.x}%`, top: `${a.y}%`, transform: 'translate(-50%, -100%)' }}
              >
                <div className="relative px-3.5 py-2 rounded-[15px] border border-brass/45 font-display title-medieval text-[13px] md:text-sm text-ivory whitespace-nowrap"
                     style={{ background: 'rgba(8,3,5,0.86)', backdropFilter: 'blur(8px)' }}>
                  {texte}
                  <span aria-hidden className="absolute left-1/2 -bottom-[9px] -translate-x-1/2 w-0 h-0"
                        style={{ borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '9px solid rgba(198,150,74,0.45)' }} />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* La barre du haut : le titre, où en est la table, la musique */}
        <div className="absolute top-0 inset-x-0 z-10 flex flex-wrap items-center justify-between gap-3 pl-4 md:pl-7 pr-16 md:pr-20 py-3"
             style={{ background: 'linear-gradient(180deg, rgba(8,3,5,0.92), rgba(8,3,5,0))' }}>
          <span className="font-display title-medieval text-lg md:text-xl text-ivory">{t.titre}</span>
          <span className="font-sans text-[11px] md:text-xs uppercase tracking-[0.18em] text-ivory-soft/85 order-3 md:order-2 w-full md:w-auto">
            {!partie ? t.pretre
              : partie.phase === 'fini' ? (partie.gagnantId === 'j0' ? t.gagne : `${partie.joueurs.find((j) => j.id === partie.gagnantId)?.nom} ${t.aGagne}`)
                : enVol ? t.enVol
                  : partie.phase === 'reflexe' ? t.criez
                    : monTour ? t.aVous : `${partie.joueurs[partie.tour].nom} ${t.joue}`}
          </span>
          <span className="font-sans text-[10px] uppercase tracking-[0.22em] order-2 md:order-3 inline-flex items-center gap-2.5" style={{ color: 'var(--color-amber-glow)' }}>
            <BoutonMusique ref={musiqueRef} cle="des" defaut="festin" lang={lang} onLabel={fr ? 'Couper' : 'Mute'} offLabel={fr ? 'Musique' : 'Music'} />
            {partie ? `${t.cible} ${CIBLE}` : ''}
          </span>
        </div>

        {/* À gauche : les scores */}
        {partie && (
          <div data-tuto="scores" className="absolute left-1/2 -translate-x-1/2 md:left-6 md:translate-x-0 top-[8.5rem] md:top-[7.25rem] z-10 w-44 md:w-56 rounded-lg-card border border-brass/25 px-3.5 py-3"
               style={{ background: 'rgba(8,3,5,0.62)', backdropFilter: 'blur(6px)' }}>
            <p className="witcher-stat-label mb-2">{t.scores}</p>
            <ul className="space-y-1.5">
              {partie.joueurs.map((j, i) => (
                <li key={j.id} className="flex items-center justify-between gap-2 font-editorial text-[13px]">
                  <span className={partie.tour === i && partie.phase !== 'fini' ? 'text-brass' : 'text-ivory-soft'}>
                    {j.nom}{j.grelottine ? <span title={t.grelottineTenue} className="ml-1.5 text-brass/80">●</span> : null}
                  </span>
                  <span className="font-sans text-[11px] tracking-[0.08em] text-ivory tabular-nums">{j.score}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* À droite : ce qui vient de se dire */}
        {partie && partie.journal.length > 0 && (
          <div className="absolute right-3 md:right-6 top-16 md:top-20 z-10 w-44 md:w-72 text-right">
            <AnimatePresence initial={false}>
              {[...partie.journal].reverse().slice(0, 3).map((l, i) => (
                <motion.p key={`${l}-${i}`} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1 - i * 0.3, x: 0 }}
                          className="font-editorial text-[13px] text-ivory-soft leading-snug mb-1.5">
                  {l}
                </motion.p>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* En bas à gauche : mes trois dés */}
        {partie && partie.des.length > 0 && (
          <div data-tuto="des" className="absolute left-3 md:left-6 bottom-32 md:bottom-36 z-10 hidden md:block">
            <p className="witcher-stat-label mb-2">{partie.tour === 0 ? t.vosDes : `${partie.joueurs[partie.tour].nom}`}</p>
            <div className="flex gap-1.5">
              {partie.des.map((d, i) => (
                <motion.span key={`${partie.manche}-${i}-${d}`} initial={{ opacity: 0, scale: 0.6, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                             className={`w-10 h-10 rounded-[10px] border flex items-center justify-center font-display title-medieval text-lg text-ivory ${i === 2 ? 'border-brass/70' : 'border-brass/40'}`}
                             style={{ background: 'rgba(8,3,5,0.7)' }}>
                  {d}
                </motion.span>
              ))}
            </div>
            <p className="mt-1 font-sans text-[9px] uppercase tracking-[0.18em] text-ivory-soft/55">{t.chouettesPuisCul}</p>
          </div>
        )}

        <button type="button" onClick={() => setReglesOuvertes((v) => !v)}
                className="absolute left-3 md:left-6 bottom-6 z-20 px-4 py-2.5 rounded-full border border-brass/45 font-sans uppercase tracking-[0.18em] text-[10px] text-ivory hover:bg-brass/15 transition-colors inline-flex items-center gap-2"
                style={{ background: 'rgba(8,3,5,0.72)', backdropFilter: 'blur(6px)' }}>
          <ScrollText size={13} className="text-brass" />
          {reglesOuvertes ? t.cacherRegles : t.afficherRegles}
        </button>
        <AnimatePresence>
          {reglesOuvertes && (
            <motion.aside initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute left-3 md:left-6 bottom-20 z-20 w-[20rem] max-w-[85vw] rounded-lg-card border border-brass/30 p-5 max-h-[62vh] overflow-y-auto"
                          style={{ background: 'rgba(8,3,5,0.9)', backdropFilter: 'blur(10px)' }}>
              <h2 className="font-display title-medieval text-lg text-ivory mb-3">{t.regles}</h2>
              <div className="divider-brass w-12 mb-4" />
              <ol className="space-y-3 font-editorial text-[13px] text-ivory-soft leading-relaxed list-none">
                {(fr ? REGLES_FR : REGLES_EN).map((r, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="font-display title-medieval text-brass/70 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ol>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Le pupitre : tout se joue ici */}
        <div className="absolute inset-x-0 bottom-0 z-10 px-3 md:px-6 pb-4 pt-8"
             style={{ background: 'linear-gradient(0deg, rgba(8,3,5,0.94), rgba(8,3,5,0))' }}>
          {!partie ? (
            <div className="mx-auto w-full max-w-2xl max-h-[66vh] overflow-y-auto rounded-lg-card border border-brass/30 px-5 py-5 flex flex-wrap items-center justify-center gap-4"
                 style={{ background: 'rgba(8,3,5,0.72)', backdropFilter: 'blur(8px)' }}>
              <span className="witcher-stat-label inline-flex items-center gap-2"><Users size={12} /> {t.joueurs}</span>
              <div className="inline-flex items-center gap-1 rounded-card border border-brass/35 bg-black/40 p-1">
                {[2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setNbJoueurs(n)} aria-pressed={nbJoueurs === n}
                          className={`w-11 h-10 rounded-card font-display text-lg transition ${nbJoueurs === n ? 'bg-brass text-midnight-deep' : 'text-ivory-soft hover:bg-brass/15'}`}>
                    {n}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setPubEnAttente(() => commencer)} className="fmm-glass-btn is-primary px-6 py-4" style={{ flexDirection: 'row', gap: '0.6rem' }}>
                <Dices size={16} className="text-brass" />
                <span className="fmm-glass-btn-label">{t.commencer}</span>
              </button>
              <BoutonTutoriel onClick={tuto.ouvrir} lang={lang} />
              <div className="w-full flex flex-col gap-3 pt-1">
                <Parures titre={t.paruresDes} choix={SKINS_DE.map((k) => ({ id: k.id, nom: fr ? k.nomFR : k.nomEN }))} actif={skinDe} onChoisir={(id) => setSkinDe(id as IdSkinDe)} />
                <Parures titre={t.paruresTable} choix={SKINS_TABLE.map((k) => ({ id: k.id, nom: fr ? k.nomFR : k.nomEN }))} actif={skinTable} onChoisir={(id) => setSkinTable(id as IdSkinTable)} />
                <Parures titre={t.niveau} choix={marches.map((m) => ({ id: String(m.niveau), nom: m.nom }))} actif={String(niveau)}
                         onChoisir={(id) => { const n = Number(id) as Niveau; setNiveau(n); localStorage.setItem('fmm.chouette.niveau', String(n)); }} />
                <p className="w-full text-center font-editorial text-[13px] text-ivory-soft/70 leading-relaxed">{marches.find((m) => m.niveau === niveau)?.humeur}</p>
              </div>
            </div>
          ) : partie.phase === 'fini' ? (
            <div className="flex justify-center">
              <button type="button" onClick={() => { toutArreter(); setPartie(null); }} className="fmm-glass-btn is-primary px-6 py-4" style={{ flexDirection: 'row', gap: '0.6rem' }}>
                <RotateCcw size={15} className="text-brass" />
                <span className="fmm-glass-btn-label">{t.nouvelle}</span>
              </button>
            </div>
          ) : (
            <Pupitre
              t={t}
              partie={partie}
              enVol={enVol}
              monTour={monTour}
              pariOuvert={pariOuvert}
              grelotOuvert={grelotOuvert}
              moi={moi!}
              onLancer={lancerMoi}
              onSiroter={siroterMoi}
              onGarder={garderMoi}
              onCrier={crierMoi}
              onParier={(f) => { monPari.current = f; bulle(0, OISEAUX[f]); setPariOuvert(null); }}
              onSoufflette={jouerSoufflette}
              onGrelottine={() => jouerGrelottine('j0')}
              onPasser={passerMoi}
            />
          )}
        </div>
      </CadreJeu>

      <Tutoriel jeu="chouette" lang={lang} ouvert={tuto.ouvert} onFermer={tuto.fermer} />
    </>
  );
};

export default ChouettePage;
