import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CadreJeu from '../../components/jeux/CadreJeu';
import BoutonMusique, { type BoutonMusiqueHandle } from '../../components/jeux/BoutonMusique';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dices, Minus, Plus, Skull, RotateCcw, Users, Target, ScrollText,
  X, Hourglass, Flag, Check, LogIn,
} from 'lucide-react';
import { useBadgeJeu, useGagnerBadge } from '../../contexts/BadgesContext';
import { useUI } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCaravanPage } from '../../lib/useCaravanPage';
import { addLocale } from '../../lib/locale';
import SEO from '../../components/SEO';
import PanneauAmis from '../../components/jeux/PanneauAmis';
import { jeuDes } from './jeuDefiable';
import { creerTable, type TableDes } from './scene';
import {
  SKINS_DE, SKINS_TABLE, chargerEmbleme, choisirParures,
  type IdSkinDe, type IdSkinTable,
} from './skins';
import {
  nouvellePartie, annoncer, douter, exact as appelExact, mancheSuivante, desEnJeu,
  miseValide, coupDeLaMachine, type Partie, type Face, type Joueur,
} from './regles';
import { sieges as siegesDe, toutLeMondeAScelle, vivants } from './enLigne';
import {
  suivrePartieDes, scellerSaMain, lireMaMain, lireLesMains,
  annoncerEnLigne, leverLesGobelets, compterLesDes, mancheSuivanteEnLigne,
  passerLeTourAbsent, abandonnerDes, repondreAuDefiDes, type PartieDes,
  demarrerPartieDes, JOUEURS_MAX,
} from '../../firebase/desParties';

// ─── Les dés du menteur ─────────────────────────────────────────────
// Troisième jeu du festival, celui de l'année de la Poudre (Alex,
// 2026-08-23). Table de taverne en 3D, gobelets de cuir, dés d'os, et
// le règlement de Perudo : l'as est joker, on monte ou on doute.
//
// Le clin d'œil demandé : l'Église interdisait ces jeux, la page le
// rappelle avec le sourire.

// Le règlement, tel qu'il se joue à la table du festival.
const REGLES_FR = [
  'Chacun secoue ses cinq dés sous son gobelet et regarde sa main sans la montrer.',
  'À tour de rôle, on annonce combien de dés d’une même face il y a sur TOUTE la table, la sienne comprise.',
  'Chaque annonce doit monter : plus de dés, ou la même quantité d’une face plus haute.',
  'L’as compte pour toutes les faces. Sauf quand l’annonce porte sur les as : là, il ne vaut que lui-même.',
  'Au lieu de monter, on peut crier « menteur ! ». On lève alors tous les gobelets et on compte.',
  'Si l’annonce tenait, le douteur perd un dé. Si elle était trop haute, c’est celui qui l’a faite qui en perd un.',
  'On peut aussi annoncer « c’est exactement ça ». Si le compte tombe pile, on récupère un dé perdu; sinon on en perd un.',
  'Le gobelet vidé de son dernier dé quitte la table. Le dernier joueur debout ramasse la mise.',
];
const REGLES_EN = [
  'Everyone shakes five dice under their cup and looks at their hand without showing it.',
  'In turn, you bid how many dice of one face are on the WHOLE table, your own included.',
  'Every bid must climb: more dice, or the same count of a higher face.',
  'The ace is wild. Except when the bid is on aces: then it only counts as itself.',
  'Instead of raising, you may call “liar!”. Every cup goes up and the dice are counted.',
  'If the bid held, the doubter loses a die. If it was too high, the bidder loses one.',
  'You may also call it exact. If the count lands on the nose, you win back a lost die; otherwise you lose one.',
  'A cup emptied of its last die leaves the table. The last player standing takes the pot.',
];

const NOMS_MACHINE = [
  'Le Bourreau', 'Dame Ysabeau', 'Le Meunier', 'Frère Anselme', 'La Rouquine',
  'Le Colporteur', 'Guillaume le Borgne',
];

const DesPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const fr = lang === 'FR';

  const { user, openSignIn } = useAuth();

  // ── La partie en ligne ──────────────────────────────────────────
  // /jeux/des?partie=<id> ouvre la partie lancée depuis le panneau des
  // amis. La page suit le document, scelle sa main chez elle et pousse
  // ses annonces (Alex, 2026-08-23).
  const partieId = useMemo(
    () => new URLSearchParams(window.location.search).get('partie'),
    [],
  );
  const [enLigne, setEnLigne] = useState<PartieDes | null>(null);
  const [maMain, setMaMain] = useState<Face[]>([]);
  const [mainsLevees, setMainsLevees] = useState<Record<string, Face[]>>({});
  const [resteMs, setResteMs] = useState(0);
  const [amisOuverts, setAmisOuverts] = useState(false);
  const jeuDefi = useMemo(() => jeuDes(lang), [lang]);

  const [nbJoueurs, setNbJoueurs] = useState(3);
  const [solo, setSolo] = useState<Partie | null>(null);
  const [quantite, setQuantite] = useState(2);
  const [face, setFace] = useState<Face>(3);

  // Les places autour de la table, la mienne en premier : la table 3D
  // et les bulles raisonnent par siège, le document par uid.
  const ordre = useMemo(
    () => (enLigne && user ? siegesDe(enLigne, user.uid) : []),
    [enLigne, user],
  );

  /**
   * La partie telle que la page l'affiche.
   *
   * Le rendu, les bulles et la table 3D ne connaissent qu'une seule
   * forme, celle du moteur local. La partie en ligne se traduit donc
   * dedans, et tout le reste du fichier continue de fonctionner sans
   * savoir contre qui il joue. Les dés des autres restent des dés
   * anonymes tant que les gobelets ne sont pas levés : seule leur
   * QUANTITÉ est connue, et les faces bouchées ici ne sont jamais lues.
   */
  const partie: Partie | null = useMemo(() => {
    if (!enLigne || !user) return solo;
    const joueurs: Joueur[] = ordre.map((uid) => ({
      id: uid,
      nom: enLigne.noms[uid] || (fr ? 'Un inconnu' : 'A stranger'),
      // Les gobelets levés montrent les vraies faces. Le reste du
      // temps, ma main est la mienne et celle des autres n'est qu'un
      // compte : la main scellée d'une manche passée se rogne au
      // compte officiel pour que le total reste juste.
      des: enLigne.phase === 'devoilement' && mainsLevees[uid]
        ? mainsLevees[uid]
        : uid === user.uid
          ? maMain.slice(0, enLigne.des[uid] ?? 0)
          : Array.from({ length: enLigne.des[uid] ?? 0 }, () => 6 as Face),
      machine: false,
      elimine: enLigne.elimines.includes(uid),
    }));
    const d = enLigne.devoilement;
    return {
      joueurs,
      tour: Math.max(0, ordre.indexOf(enLigne.tour)),
      mise: enLigne.mise
        ? { quantite: enLigne.mise.quantite, face: enLigne.mise.face, parId: enLigne.mise.parUid }
        : null,
      phase: enLigne.phase,
      manche: enLigne.manche,
      journal: enLigne.journal,
      // Un compte négatif veut dire que les gobelets sont levés mais
      // que personne n'a fini de compter : le verdict n'existe pas
      // encore, et rien ne doit s'afficher.
      devoilement: d && d.compte >= 0
        ? {
          doutePar: d.doutePar,
          contre: d.contre,
          mise: { quantite: d.mise.quantite, face: d.mise.face, parId: d.mise.parUid },
          compte: d.compte,
          perdantId: d.perdantUid,
          gagnantDeId: d.gagnantDeUid ?? undefined,
          exact: d.exact,
        }
        : undefined,
      gagnantId: enLigne.gagnant ?? undefined,
    };
  }, [enLigne, user, ordre, maMain, mainsLevees, solo, fr]);

  useBadgeJeu('des');
  useGagnerBadge('des', !!partie && partie.gagnantId === partie.joueurs[0]?.id);

  const sceneRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<TableDes | null>(null);
  // La manche déjà scellée, et celle déjà dévoilée : les deux gestes
  // ne doivent partir qu'une seule fois par manche.
  const scelle = useRef(0);
  const revele = useRef(0);
  const placesPosees = useRef(0);

  // ── Les bulles de dialogue ──────────────────────────────────────
  // Ce qu'un joueur annonce s'écrit au-dessus de sa place, comme dans
  // une bande dessinée (Alex, 2026-08-23).
  const [ancres, setAncres] = useState<Array<{ x: number; y: number }>>([]);
  const [bulles, setBulles] = useState<Record<number, string>>({});
  const [reglesOuvertes, setReglesOuvertes] = useState(false);
  // La taverne chante dès que la table est dressée.
  const musiqueRef = useRef<BoutonMusiqueHandle>(null);

  // La pub AdSense se pose devant le geste qui démarre une partie (en
  // solo comme en ligne) : le geste réel attend dans `pubEnAttente` et
  // ne s'exécute qu'au « Continuer » de l'interstitiel.
  const [pubEnAttente, setPubEnAttente] = useState<(() => void) | null>(null);

  // ── Les parures : dés d'os, du festival ou des Inconnus, et la même
  //    famille de choix pour le plateau (Alex, 2026-08-23). Le choix
  //    reste d'une visite à l'autre.
  const [skinDe, setSkinDe] = useState<IdSkinDe>(() =>
    (localStorage.getItem('fmm.des.skinDe') as IdSkinDe) || 'os');
  const [skinTable, setSkinTable] = useState<IdSkinTable>(() =>
    (localStorage.getItem('fmm.des.skinTable') as IdSkinTable) || 'chene');
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

  // ── La table 3D vit tant que la page vit ────────────────────────
  // Elle se rebâtit quand la parure change : les gravures sont peintes
  // dans les textures au moment du montage.
  useEffect(() => {
    if (!sceneRef.current) return;
    const t = creerTable();
    t.monter(sceneRef.current);
    tableRef.current = t;
    return () => { t.demonter(); tableRef.current = null; };
  }, [pretParures]);

  const moi = partie?.joueurs[0];
  // En ligne, la parole attend que tous les gobelets soient scellés :
  // sans cette barrière, un retardataire écouterait les annonces avant
  // de choisir sa main.
  const monTour = !!partie
    && partie.phase === 'annonces'
    && partie.tour === 0
    && !partie.joueurs[0].elimine
    && (!enLigne || (enLigne.statut === 'encours' && toutLeMondeAScelle(enLigne)));
  const total = partie ? desEnJeu(partie) : 0;
  const sablier = `${Math.floor(resteMs / 60000)}:${String(Math.floor((resteMs % 60000) / 1000)).padStart(2, '0')}`;

  const commencer = useCallback(() => {
    const noms = [
      { nom: fr ? 'Vous' : 'You', machine: false },
      ...NOMS_MACHINE.slice(0, nbJoueurs - 1).map((n) => ({ nom: n, machine: true })),
    ];
    const p = nouvellePartie(noms);
    setSolo(p);
    setQuantite(Math.max(1, Math.round(desEnJeu(p) / 3)));
    setFace(3);
    tableRef.current?.disposer(nbJoueurs);
    tableRef.current?.devoiler([], false);
    tableRef.current?.mains(p.joueurs.map((j) => j.des.length));
    tableRef.current?.lancer(p.joueurs[0].des);
    tableRef.current?.remuer(p.joueurs.map((_, i) => i).filter((i) => i > 0));
    musiqueRef.current?.demarrer();
  }, [nbJoueurs, fr]);

  // Aperçu de développement seulement : `?apercu=1&auto=1` dresse la
  // table sans clic, pour vérifier le rendu des dés à l'écran.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const q = new URLSearchParams(window.location.search);
    if (q.get('apercu') === '1' && q.get('auto') === '1' && !partie) {
      const t = window.setTimeout(() => commencer(), 400);
      return () => window.clearTimeout(t);
    }
  }, [commencer, partie]);

  // Les places se reprojettent tant que la table vit : la fenêtre
  // change, les bulles suivent.
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

  // La dernière annonce de chacun devient sa bulle.
  useEffect(() => {
    if (!partie) { setBulles({}); return; }
    if (!partie.mise) { setBulles({}); return; }
    const i = partie.joueurs.findIndex((j) => j.id === partie.mise!.parId);
    if (i < 0) return;
    const texte = `${partie.mise.quantite} × ${partie.mise.face}`;
    setBulles({ [i]: texte });
  }, [partie?.mise?.parId, partie?.mise?.quantite, partie?.mise?.face, partie?.manche]);

  // Au dévoilement, celui qui a parlé le dernier crie.
  useEffect(() => {
    if (!partie || partie.phase !== 'devoilement' || !partie.devoilement) return;
    const d = partie.devoilement;
    const i = partie.joueurs.findIndex((j) => j.id === d.doutePar);
    if (i < 0) return;
    setBulles({ [i]: d.exact ? (fr ? 'Exactement ça !' : 'Spot on!') : (fr ? 'Menteur !' : 'Liar!') });
  }, [partie?.phase, partie?.devoilement?.doutePar, fr]);

  // La douche de lumière suit celui qui parle, moi compris.
  useEffect(() => {
    if (!partie || partie.phase !== 'annonces') return;
    tableRef.current?.designer(partie.tour);
  }, [partie?.tour, partie?.phase]);

  // ── La partie en ligne, de bout en bout ─────────────────────────

  // Le fil du jeu : le document, en direct.
  useEffect(() => {
    if (!partieId) return;
    return suivrePartieDes(partieId, setEnLigne);
  }, [partieId]);

  // Les places se dressent dès que les deux joueurs sont assis.
  useEffect(() => {
    if (!enLigne || !user || ordre.length === 0) return;
    if (enLigne.statut !== 'encours' && enLigne.statut !== 'fini') return;
    if (placesPosees.current === ordre.length) return;
    placesPosees.current = ordre.length;
    tableRef.current?.disposer(ordre.length);
    tableRef.current?.mains(ordre.map((u) => enLigne.des[u] ?? 0));
    musiqueRef.current?.demarrer();
  }, [enLigne, ordre, user]);

  // Chaque manche, je tire ma main chez moi et je la scelle. Les dés
  // ne quittent jamais le sous-document que les règles me réservent.
  useEffect(() => {
    if (!enLigne || !user || !partieId) return;
    if (enLigne.statut !== 'encours' || enLigne.phase !== 'annonces') return;
    if (enLigne.elimines.includes(user.uid)) return;
    if (scelle.current === enLigne.manche) return;
    scelle.current = enLigne.manche;
    const combien = enLigne.des[user.uid] ?? 0;
    void (async () => {
      // Une main déjà scellée se relit plutôt que de se relancer : un
      // rechargement de page ne doit pas rendre de nouveaux dés.
      const deja = await lireMaMain(partieId, user.uid, enLigne.manche);
      const des = deja ?? await scellerSaMain(partieId, user.uid, enLigne.manche, combien);
      setMaMain(des);
      setMainsLevees({});
      setQuantite(Math.max(1, Math.round(Object.values(enLigne.des).reduce((n, v) => n + v, 0) / 3)));
      setFace(3);
      tableRef.current?.devoiler([], false);
      tableRef.current?.lancer(des);
      tableRef.current?.remuer(
        ordre.map((_, i) => i).filter((i) => i > 0 && !enLigne.elimines.includes(ordre[i])),
      );
    })();
  }, [enLigne, user, partieId, ordre]);

  // Les gobelets se lèvent : les mains apparaissent sur la table, le
  // dé perdu part en fumée, le dé repris retombe.
  useEffect(() => {
    if (!enLigne || !partieId || enLigne.phase !== 'devoilement') return;
    const d = enLigne.devoilement;
    if (!d || d.compte < 0) return;
    if (revele.current === enLigne.manche) return;
    revele.current = enLigne.manche;
    void (async () => {
      // Les mains recopiées dans le document servent l'affichage; la
      // sous-collection reste la source, et chacun peut la relire.
      const mains = Object.keys(d.mainsLevees ?? {}).length
        ? d.mainsLevees!
        : await lireLesMains(partieId, enLigne.manche);
      setMainsLevees(mains);
      const t3 = tableRef.current;
      if (!t3) return;
      t3.devoiler(ordre.slice(1).map((u) => mains[u] ?? []), true);
      // Trois secondes de répit : la table se regarde, le verdict se
      // lit, et seulement ensuite le dé s'en va.
      if (d.perdantUid) {
        const i = ordre.indexOf(d.perdantUid);
        if (i >= 0) window.setTimeout(() => t3.perdreUnDe(i), 3000);
      }
      if (d.gagnantDeUid) {
        const i = ordre.indexOf(d.gagnantDeUid);
        if (i >= 0) window.setTimeout(() => t3.reprendreUnDe(i), 3000);
      }
      window.setTimeout(() => t3.mains(ordre.map((u) => enLigne.des[u] ?? 0)), 4200);
    })();
  }, [enLigne, partieId, ordre]);

  // Le sablier du tour, égrené à l'écran.
  useEffect(() => {
    const fin = enLigne?.statut === 'encours' && enLigne.phase !== 'fini'
      ? (enLigne.echeance?.toMillis() ?? 0)
      : 0;
    if (!fin) { setResteMs(0); return; }
    const battre = () => setResteMs(Math.max(0, fin - Date.now()));
    battre();
    const h = window.setInterval(battre, 500);
    return () => window.clearInterval(h);
  }, [enLigne]);

  // Le sable a fini de couler. Un seul joueur écrit la suite, pour ne
  // pas empiler deux passages, et la transaction ferme le reste.
  useEffect(() => {
    if (!enLigne || !user || !partieId || enLigne.statut !== 'encours') return;
    const fin = enLigne.echeance?.toMillis() ?? 0;
    if (!fin || fin > Date.now()) return;
    // Le compte du dévoilement est resté en suspens : n'importe quel
    // joueur peut le finir à la place de celui qui a fermé son onglet.
    if (enLigne.phase === 'devoilement') {
      if (enLigne.devoilement && enLigne.devoilement.compte < 0) void compterLesDes(partieId, enLigne);
      return;
    }
    if (enLigne.phase !== 'annonces') return;
    const muets = vivants(enLigne).filter((u) => !enLigne.mainsPretes.includes(u));
    const silencieux = muets.length > 0 ? muets : [enLigne.tour];
    const greffier = enLigne.joueurs.find(
      (u) => !enLigne.elimines.includes(u) && !silencieux.includes(u),
    );
    if (greffier === user.uid) void passerLeTourAbsent(partieId, enLigne);
  }, [enLigne, user, partieId, resteMs]);

  // ── Les adversaires jouent tout seuls ───────────────────────────
  useEffect(() => {
    if (enLigne || !partie || partie.phase !== 'annonces') return;
    const j = partie.joueurs[partie.tour];
    if (!j || !j.machine || j.elimine) return;
    tableRef.current?.designer(partie.tour);
    const minuteur = window.setTimeout(() => {
      setSolo((p) => {
        if (!p || p.phase !== 'annonces') return p;
        const coup = coupDeLaMachine(p);
        if (coup.action === 'doute') {
          const apres = douter(p);
          montrerLeDevoilement(apres);
          return apres;
        }
        return annoncer(p, coup.quantite!, coup.face!);
      });
    }, 1100 + Math.random() * 900);
    return () => window.clearTimeout(minuteur);
  }, [partie, enLigne]);

  // Quand c'est à moi, la mise proposée doit rester légale.
  useEffect(() => {
    if (!partie || !monTour) return;
    if (!miseValide(partie.mise, quantite, face, total)) {
      const q = partie.mise ? partie.mise.quantite : Math.max(1, Math.round(total / 3));
      const f = partie.mise ? (partie.mise.face < 6 ? ((partie.mise.face + 1) as Face) : 6) : 3;
      if (miseValide(partie.mise, q, f, total)) { setQuantite(q); setFace(f); }
      else { setQuantite(Math.min(total, (partie.mise?.quantite ?? 0) + 1)); setFace(2); }
    }
  }, [partie, monTour, quantite, face, total]);

  const jouerAnnonce = () => {
    if (!partie || !monTour) return;
    if (enLigne && partieId) { void annoncerEnLigne(partieId, enLigne, quantite, face); return; }
    setSolo(annoncer(partie, quantite, face));
  };

  /** Le dévoilement se voit sur la table : gobelets levés, dé qui part
   *  en fumée, dé qui retombe pour un exact réussi. */
  const montrerLeDevoilement = (apres: Partie) => {
    const t3 = tableRef.current;
    if (!t3) return;
    t3.devoiler(apres.joueurs.slice(1).map((x) => x.des), true);
    const d = apres.devoilement;
    if (!d) return;
    if (d.perdantId) {
      const i = apres.joueurs.findIndex((j) => j.id === d.perdantId);
      // Trois secondes de répit : la table se regarde, le verdict se
      // lit, et seulement ensuite le dé s'en va.
      if (i >= 0) window.setTimeout(() => t3.perdreUnDe(i), 3000);
    }
    if (d.gagnantDeId) {
      const i = apres.joueurs.findIndex((j) => j.id === d.gagnantDeId);
      if (i >= 0) window.setTimeout(() => t3.reprendreUnDe(i), 3000);
    }
    window.setTimeout(() => t3.mains(apres.joueurs.map((j) => j.des.length)), 4200);
  };

  const jouerDoute = () => {
    if (!partie || !monTour || !partie.mise) return;
    // En ligne, le dévoilement se joue en deux temps : lever les
    // gobelets ouvre la lecture des mains, compter vient ensuite.
    if (enLigne && partieId && user) { void leverLesGobelets(partieId, enLigne, user.uid, false); return; }
    const apres = douter(partie);
    montrerLeDevoilement(apres);
    setSolo(apres);
  };

  const jouerExact = () => {
    if (!partie || !monTour || !partie.mise) return;
    if (enLigne && partieId && user) { void leverLesGobelets(partieId, enLigne, user.uid, true); return; }
    const apres = appelExact(partie);
    montrerLeDevoilement(apres);
    setSolo(apres);
  };

  const relancer = () => {
    if (!partie) return;
    if (enLigne && partieId) { void mancheSuivanteEnLigne(partieId, enLigne); return; }
    const apres = mancheSuivante(partie);
    tableRef.current?.devoiler([], false);
    tableRef.current?.mains(apres.joueurs.map((j) => j.des.length));
    tableRef.current?.lancer(apres.joueurs[0].des);
    tableRef.current?.remuer(apres.joueurs.map((_, i) => i).filter((i) => i > 0 && !apres.joueurs[i].elimine));
    setSolo(apres);
    setQuantite(Math.max(1, Math.round(desEnJeu(apres) / 3)));
    setFace(3);
  };

  const t = useMemo(() => ({
    eyebrow: fr ? 'L’année de la Poudre' : 'The Year of the Powder',
    titre: fr ? 'Les dés du menteur' : 'Liar’s Dice',
    intro: fr
      ? 'Cinq dés sous un gobelet de cuir, une annonce qui monte, et le premier qui doute retourne les gobelets. L’as compte pour toutes les faces, sauf quand on annonce des as.'
      : 'Five dice under a leather cup, a bid that climbs, and the first to doubt turns the cups over. The ace counts as every face, except when aces are called.',
    pretre: fr
      ? 'Le curé rappelle que les jeux de hasard sont défendus. Jouez discrètement, et ne dites pas qui vous a appris.'
      : 'The priest reminds you that games of chance are forbidden. Play quietly, and do not say who taught you.',
    joueurs: fr ? 'Autour de la table' : 'Around the table',
    paruresDes: fr ? 'Les dés' : 'The dice',
    paruresTable: fr ? 'La table' : 'The table',
    commencer: fr ? 'Dresser la table' : 'Set the table',
    annoncer: fr ? 'Annoncer' : 'Bid',
    menteur: fr ? 'Menteur !' : 'Liar!',
    manche: fr ? 'Manche suivante' : 'Next round',
    nouvelle: fr ? 'Nouvelle partie' : 'New game',
    votreMain: fr ? 'Votre main' : 'Your hand',
    enJeu: fr ? 'dés en jeu' : 'dice in play',
    aVous: fr ? 'À vous de parler' : 'Your call',
    attend: fr ? 'La table réfléchit…' : 'The table is thinking…',
    exact: fr ? 'Exactement ça' : 'Spot on',
    exactAide: fr
      ? 'Annoncer que la mise tombe pile : si vous avez raison, vous reprenez un dé perdu. Sinon vous en perdez un.'
      : 'Call the bid exact: if you are right, you win back a lost die. If not, you lose one.',
    gagne: fr ? 'Vous ramassez la mise.' : 'You take the pot.',
    perdu: fr ? 'La table vous a eu.' : 'The table got you.',
    defier: fr ? 'Défier un ami' : 'Challenge a friend',
    fermer: fr ? 'Fermer' : 'Close',
    quitter: fr ? 'Quitter la table' : 'Leave the table',
    sablierAide: fr
      ? 'Une minute par tour. Passé ce délai, le joueur silencieux laisse passer son tour.'
      : 'One minute per turn. After that, a silent player lets their turn go by.',
    gobelets: fr ? 'Les gobelets se referment.' : 'The cups are closing.',
    compte: fr ? 'Les dés se comptent.' : 'The dice are being counted.',
    attendSiege: fr
      ? 'Votre adversaire n’a pas encore pris son siège. Envoyez-lui le lien, et la partie s’ouvrira dès qu’il sera assis.'
      : 'Your opponent has not taken their seat yet. Send them the link, and the game will open the moment they sit down.',
    attendReponse: fr
      ? 'Votre défi est parti. La table se dressera dès que la réponse arrivera.'
      : 'Your challenge is on its way. The table will be set as soon as the answer arrives.',
    vousDefie: fr ? 'vous défie aux dés' : 'challenges you at dice',
    prendrePlace: fr ? 'Prendre ma place' : 'Take my seat',
    assis: fr ? 'Autour de la table' : 'Seated at the table',
    donnerLeDepart: fr ? 'Donner le départ' : 'Start the game',
    defiRefuse: fr ? 'Ce défi a été refusé.' : 'This challenge was declined.',
    connectez: fr
      ? 'Connectez-vous pour prendre votre place à cette table.'
      : 'Sign in to take your seat at this table.',
    seConnecter: fr ? 'Se connecter' : 'Sign in',
  }), [fr]);

  const faces: Face[] = [1, 2, 3, 4, 5, 6];

  return (
    <>
      <SEO title={`${t.titre} | FMM 2026`} description={t.intro} />

      {/* Une seule fenêtre : le hero, puis la table qui occupe l'écran
          et tout le reste posé dessus (Alex, 2026-08-23 : « le jeu doit
          être self-contained dans une seule page, une seule fenêtre »). */}
      <CadreJeu
        eyebrow={t.eyebrow}
        titre={t.titre}
        intro={t.intro}
        orbImage="/jeux/tuile-des.webp"
        lang={lang}
      >
          <div ref={sceneRef} className="absolute inset-0" />

          {/* Le verdict : au centre de la table, en grand, le temps que
              tout le monde regarde les dés avant qu'un dé s'en aille
              (Alex, 2026-08-23). */}
          <AnimatePresence>
            {partie?.phase === 'devoilement' && partie.devoilement && (
              <motion.div
                initial={{ opacity: 0, scale: 0.86 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 190, damping: 22 }}
                className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-20 flex justify-center px-6 pointer-events-none"
              >
                <div className="max-w-2xl rounded-lg-card border border-brass/45 px-8 py-6 text-center"
                     style={{ background: 'rgba(8,3,5,0.86)', backdropFilter: 'blur(10px)',
                              boxShadow: '0 26px 70px rgba(0,0,0,0.6)' }}>
                  <p className="font-sans uppercase tracking-[0.3em] text-[10px] text-ivory-soft/60 mb-3">
                    {partie.devoilement.exact
                      ? (fr ? 'Exactement ça' : 'Spot on')
                      : (fr ? 'Menteur' : 'Liar')}
                  </p>
                  <p className="font-display title-medieval text-2xl md:text-3xl text-ivory leading-snug">
                    {partie.journal[partie.journal.length - 1]}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Les bulles : ce que chacun annonce, au-dessus de sa place */}
          <AnimatePresence>
            {partie && Object.entries(bulles).map(([idx, texte]) => {
              const i = Number(idx);
              const a = ancres[i];
              if (!a) return null;
              const j = partie.joueurs[i];
              return (
                <motion.div
                  key={`${i}-${texte}`}
                  initial={{ opacity: 0, scale: 0.7, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, y: -6 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  className="absolute z-20 pointer-events-none"
                  style={{ left: `${a.x}%`, top: `${a.y}%`, transform: 'translate(-50%, -100%)' }}
                >
                  <div className="relative px-4 py-2.5 rounded-[14px] border text-center"
                       style={{
                         background: 'rgba(244,239,227,0.94)',
                         borderColor: 'rgba(120,70,30,0.55)',
                         boxShadow: '0 10px 26px rgba(0,0,0,0.5)',
                         minWidth: '5.5rem',
                       }}>
                    <span className="block font-sans uppercase tracking-[0.16em] text-[9px]"
                          style={{ color: 'rgba(80,45,15,0.7)' }}>
                      {j?.nom}
                    </span>
                    <span className="block font-display title-medieval text-lg leading-tight"
                          style={{ color: '#2a1505' }}>
                      {texte}
                    </span>
                    {/* La pointe de la bulle, vers le joueur */}
                    <span aria-hidden className="absolute left-1/2 -bottom-[9px] -translate-x-1/2"
                          style={{
                            width: 0, height: 0,
                            borderLeft: '9px solid transparent',
                            borderRight: '9px solid transparent',
                            borderTop: '10px solid rgba(244,239,227,0.94)',
                          }} />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Bandeau du haut : le titre, ce qui se dit, les dés en jeu */}
          {/* Le côté droit garde sa place libre pour le X de fermeture. */}
          <div className="absolute top-0 inset-x-0 z-10 flex flex-wrap items-center justify-between gap-3 pl-4 md:pl-7 pr-16 md:pr-20 py-3"
               style={{ background: 'linear-gradient(180deg, rgba(8,3,5,0.92), rgba(8,3,5,0))' }}>
            <span className="font-display title-medieval text-lg md:text-xl text-ivory">
              {t.titre}
            </span>
            <span className="font-sans text-[11px] md:text-xs uppercase tracking-[0.18em] text-ivory-soft/85 order-3 md:order-2 w-full md:w-auto text-center">
              {!partie
                ? t.pretre
                : partie.phase === 'fini'
                  ? (partie.gagnantId === partie.joueurs[0]?.id ? t.gagne : t.perdu)
                  : partie.phase === 'devoilement'
                    ? partie.journal[partie.journal.length - 1]
                    : monTour ? t.aVous : t.attend}
            </span>
            <span className="font-sans text-[10px] uppercase tracking-[0.22em] order-2 md:order-3 inline-flex items-center gap-2.5"
                  style={{ color: 'var(--color-amber-glow)' }}>
              <BoutonMusique
                ref={musiqueRef}
                cle="des"
                url="/audio/master-of-the-feast.mp3"
                titre="Master of the Feast · Kevin MacLeod"
                onLabel={fr ? 'Couper' : 'Mute'}
                offLabel={fr ? 'Musique' : 'Music'}
              />
              {/* Le sablier du tour : une minute, visible de tous. */}
              {enLigne && enLigne.statut === 'encours' && resteMs > 0 && (
                <span
                  title={t.sablierAide}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[15px] border backdrop-blur-md tabular-nums ${
                    resteMs < 15000 ? 'border-brass/70 text-brass' : 'border-white/15 text-ivory-soft'
                  }`}
                  style={{ background: 'rgba(0,0,0,0.4)' }}
                >
                  <Hourglass size={11} /> {sablier}
                </span>
              )}
              {partie ? `${total} ${t.enJeu}` : ''}
            </span>
          </div>

          {/* Les plaques : le nom de chaque convive, au-dessus de sa place */}
          {enLigne && partie && ancres.map((a, i) => {
            const j = partie.joueurs[i];
            if (!j || i === 0) return null;
            const parle = partie.tour === i && partie.phase === 'annonces';
            return (
              <div
                key={`plaque-${j.id}`}
                className="absolute z-10 pointer-events-none"
                style={{ left: `${a.x}%`, top: `${a.y}%`, transform: 'translate(-50%, 0.7rem)' }}
              >
                <div
                  className={`px-2.5 py-1 rounded-[15px] border backdrop-blur-md text-center ${j.elimine ? 'opacity-40' : ''}`}
                  style={{
                    background: 'rgba(0,0,0,0.45)',
                    borderColor: parle ? 'rgba(198,150,74,0.7)' : 'rgba(255,255,255,0.15)',
                  }}
                >
                  <span className="block font-display text-[13px] leading-tight text-ivory whitespace-nowrap">
                    {j.nom}
                  </span>
                  <span className="block font-sans text-[9px] tracking-[0.16em] text-ivory-soft/60 tabular-nums">
                    {'◆'.repeat(j.des.length) || '—'}
                  </span>
                </div>
              </div>
            );
          })}

          {/* ── Les amis, en overlay sur la table ──────────────────── */}
          {user && (
            <>
              <div className="absolute top-16 right-3 md:right-6 z-20 flex flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={() => setAmisOuverts((v) => !v)}
                  aria-expanded={amisOuverts}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[15px] border border-white/15 bg-black/45 backdrop-blur-md text-ivory-soft hover:text-ivory hover:border-brass/50 transition-colors font-sans text-[10px] uppercase tracking-[0.2em]"
                >
                  <Users size={13} className="text-brass" />
                  {t.defier}
                </button>
                {enLigne && enLigne.statut === 'encours' && partieId && (
                  <button
                    type="button"
                    onClick={() => { void abandonnerDes(partieId, enLigne, user.uid); }}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[15px] border border-white/15 bg-black/45 backdrop-blur-md text-ivory-soft/80 hover:text-ivory hover:border-brass/50 transition-colors font-sans text-[10px] uppercase tracking-[0.2em]"
                  >
                    <Flag size={12} className="text-brass" />
                    {t.quitter}
                  </button>
                )}
              </div>
              <AnimatePresence>
                {amisOuverts && (
                  <motion.div
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 24 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute top-16 right-3 md:right-6 z-30 w-[min(20rem,calc(100%-1.5rem))] max-h-[calc(100%-5.5rem)] overflow-y-auto rounded-[15px] border border-white/15 bg-black/55 backdrop-blur-xl p-3"
                  >
                    <button
                      type="button"
                      onClick={() => setAmisOuverts(false)}
                      aria-label={t.fermer}
                      className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full text-ivory-soft/70 hover:text-ivory hover:bg-white/10 transition-colors"
                    >
                      <X size={15} />
                    </button>
                    <PanneauAmis lang={lang} jeu={jeuDefi} />
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* À gauche : qui est encore là, et avec combien de dés */}
          {partie && (
            <div className="absolute left-3 md:left-6 top-[8.5rem] md:top-[7.25rem] z-10 w-40 md:w-52 rounded-lg-card border border-brass/25 px-3.5 py-3"
                 style={{ background: 'rgba(8,3,5,0.62)', backdropFilter: 'blur(6px)' }}>
              <p className="witcher-stat-label mb-2">{t.joueurs}</p>
              <ul className="space-y-1.5">
                {partie.joueurs.map((j, i) => (
                  <li key={j.id} className={`flex items-center justify-between gap-2 font-editorial text-[13px] ${j.elimine ? 'opacity-35 line-through' : ''}`}>
                    <span className={partie.tour === i && partie.phase === 'annonces' ? 'text-brass' : 'text-ivory-soft'}>
                      {j.nom}
                    </span>
                    <span className="font-sans text-[10px] tracking-[0.14em] text-ivory-soft/55 tabular-nums">
                      {'◆'.repeat(j.des.length) || '—'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* À droite : les trois dernières paroles */}
          {partie && partie.journal.length > 0 && (
            <div className={`absolute right-3 md:right-6 z-10 w-44 md:w-64 text-right ${
              user ? (enLigne ? 'top-[9.5rem] md:top-[10rem]' : 'top-[6.75rem] md:top-[7.25rem]') : 'top-16 md:top-20'
            }`}>
              <AnimatePresence initial={false}>
                {[...partie.journal].reverse().slice(0, 3).map((l, i) => (
                  <motion.p
                    key={`${l}-${i}`}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1 - i * 0.3, x: 0 }}
                    className="font-editorial text-[13px] text-ivory-soft leading-snug mb-1.5"
                  >
                    {l}
                  </motion.p>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* En bas à gauche : ma main */}
          {partie && (
            <div className="absolute left-3 md:left-6 bottom-28 md:bottom-32 z-10">
              <p className="witcher-stat-label mb-2">{t.votreMain}</p>
              <div className="flex flex-wrap gap-1.5 max-w-[11rem]">
                <AnimatePresence>
                  {moi?.des.map((d, i) => (
                    <motion.span
                      key={`${i}-${d}`}
                      initial={{ opacity: 0, scale: 0.6, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.4, y: -14 }}
                      transition={{ duration: 0.35 }}
                      className="w-10 h-10 rounded-[10px] border border-brass/40 flex items-center justify-center font-display title-medieval text-lg text-ivory"
                      style={{ background: 'rgba(8,3,5,0.7)' }}
                    >
                      {d}
                    </motion.span>
                  ))}
                </AnimatePresence>
                {moi && moi.des.length === 0 && (
                  <span className="font-editorial italic text-[13px] text-ivory-soft/60 max-w-[11rem] block">
                    {fr ? 'Plus un seul dé. La table vous regarde.' : 'Not one die left. The table watches you.'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Les règles, à gauche de la table */}
          <button
            type="button"
            onClick={() => setReglesOuvertes((v) => !v)}
            className="absolute left-3 md:left-6 bottom-6 z-20 px-4 py-2.5 rounded-full border border-brass/45 font-sans uppercase tracking-[0.18em] text-[10px] text-ivory hover:bg-brass/15 transition-colors inline-flex items-center gap-2"
            style={{ background: 'rgba(8,3,5,0.72)', backdropFilter: 'blur(6px)' }}
          >
            <ScrollText size={13} className="text-brass" />
            {reglesOuvertes ? (fr ? 'Cacher les règles' : 'Hide the rules') : (fr ? 'Afficher les règles' : 'Show the rules')}
          </button>

          <AnimatePresence>
            {reglesOuvertes && (
              <motion.aside
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="absolute left-3 md:left-6 bottom-20 z-20 w-[19rem] max-w-[85vw] rounded-lg-card border border-brass/30 p-5 max-h-[62vh] overflow-y-auto"
                style={{ background: 'rgba(8,3,5,0.9)', backdropFilter: 'blur(10px)' }}
              >
                <h2 className="font-display title-medieval text-lg text-ivory mb-3">
                  {fr ? 'Les règles' : 'The rules'}
                </h2>
                <div className="divider-brass w-12 mb-4" />
                <ol className="space-y-3 font-editorial text-[13px] text-ivory-soft leading-relaxed list-none">
                  {(fr ? REGLES_FR : REGLES_EN).map((r, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="font-display title-medieval text-brass/70 shrink-0">
                        {String(i + 1).padStart(2, '0')}
                      </span>
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
            {partieId && !user ? (
              <div className="mx-auto w-full max-w-2xl rounded-lg-card border border-brass/30 px-5 py-5 text-center"
                   style={{ background: 'rgba(8,3,5,0.72)', backdropFilter: 'blur(8px)' }}>
                <p className="font-editorial text-[15px] text-ivory-soft leading-relaxed mb-4">
                  {t.connectez}
                </p>
                <button type="button" onClick={openSignIn} className="fmm-glass-btn is-primary px-6 py-3.5" style={{ flexDirection: 'row', gap: '0.5rem' }}>
                  <LogIn size={15} className="text-brass" />
                  <span className="fmm-glass-btn-label">{t.seConnecter}</span>
                </button>
              </div>
            ) : enLigne && enLigne.statut !== 'encours' && enLigne.statut !== 'fini' ? (
              /* Le défi est parti, la table attend encore quelqu'un. */
              <div className="mx-auto w-full max-w-2xl rounded-lg-card border border-brass/30 px-5 py-5 text-center"
                   style={{ background: 'rgba(8,3,5,0.72)', backdropFilter: 'blur(8px)' }}>
                {enLigne.statut === 'refuse' ? (
                  <p className="font-editorial text-[15px] text-ivory-soft">{t.defiRefuse}</p>
                ) : enLigne.statut === 'defi' && user && enLigne.lancePar !== user.uid ? (
                  <>
                    <p className="font-display title-medieval text-xl text-ivory mb-4">
                      {(enLigne.noms[enLigne.lancePar] || '—')} {t.vousDefie}
                    </p>
                    <button
                      type="button"
                      onClick={() => { void repondreAuDefiDes(partieId!, true); }}
                      className="fmm-glass-btn is-primary px-6 py-3.5"
                      style={{ flexDirection: 'row', gap: '0.5rem' }}
                    >
                      <Check size={15} className="text-brass" />
                      <span className="fmm-glass-btn-label">{t.prendrePlace}</span>
                    </button>
                  </>
                ) : enLigne.statut === 'lobby' ? (
                  <>
                    {/* La table ouverte : qui est assis, et le départ que
                        donne celui qui a lancé le défi (Alex, 2026-08-24). */}
                    <p className="witcher-stat-label mb-3">
                      {t.assis} {enLigne.joueurs.length} / {JOUEURS_MAX}
                    </p>
                    <ul className="flex flex-wrap items-center justify-center gap-2 mb-4">
                      {enLigne.joueurs.map((u) => (
                        <li key={u}
                            className="px-3.5 py-2 rounded-[15px] border border-white/15 bg-black/35 font-editorial text-[13px] text-ivory">
                          {enLigne.noms[u] || '—'}
                        </li>
                      ))}
                    </ul>
                    <p className="font-editorial text-[15px] text-ivory-soft leading-relaxed mb-4">
                      {t.attendSiege}
                    </p>
                    {user && enLigne.lancePar === user.uid && (
                      <button
                        type="button"
                        disabled={enLigne.joueurs.length < 2}
                        onClick={() => { void demarrerPartieDes(partieId!); }}
                        className="fmm-glass-btn is-primary px-6 py-3.5 disabled:opacity-40"
                        style={{ flexDirection: 'row', gap: '0.5rem' }}
                      >
                        <Dices size={15} className="text-brass" />
                        <span className="fmm-glass-btn-label">{t.donnerLeDepart}</span>
                      </button>
                    )}
                  </>
                ) : (
                  <p className="font-editorial text-[15px] text-ivory-soft leading-relaxed">
                    {t.attendReponse}
                  </p>
                )}
              </div>
            ) : !partie ? (
              <div className="mx-auto w-full max-w-2xl rounded-lg-card border border-brass/30 px-5 py-5 flex flex-wrap items-center justify-center gap-4"
                   style={{ background: 'rgba(8,3,5,0.72)', backdropFilter: 'blur(8px)' }}>
                <span className="witcher-stat-label inline-flex items-center gap-2">
                  <Users size={12} /> {t.joueurs}
                </span>
                <div className="inline-flex items-center gap-1 rounded-card border border-brass/35 bg-black/40 p-1">
                  {[2, 3, 4, 5].map((n) => (
                    <button
                      key={n} type="button" onClick={() => setNbJoueurs(n)}
                      aria-pressed={nbJoueurs === n}
                      className={`w-11 h-10 rounded-card font-display text-lg transition ${
                        nbJoueurs === n ? 'bg-brass text-midnight-deep' : 'text-ivory-soft hover:bg-brass/15'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={commencer} className="fmm-glass-btn is-primary px-6 py-4" style={{ flexDirection: 'row', gap: '0.6rem' }}>
                  <Dices size={16} className="text-brass" />
                  <span className="fmm-glass-btn-label">{t.commencer}</span>
                </button>

                {/* Les parures : les dés et le plateau se choisissent avant
                    de dresser la table (Alex, 2026-08-23). */}
                <div className="w-full flex flex-col gap-3 pt-1">
                  <Parures
                    titre={t.paruresDes}
                    choix={SKINS_DE.map((k) => ({ id: k.id, nom: fr ? k.nomFR : k.nomEN }))}
                    actif={skinDe}
                    onChoisir={(id) => setSkinDe(id as IdSkinDe)}
                  />
                  <Parures
                    titre={t.paruresTable}
                    choix={SKINS_TABLE.map((k) => ({ id: k.id, nom: fr ? k.nomFR : k.nomEN }))}
                    actif={skinTable}
                    onChoisir={(id) => setSkinTable(id as IdSkinTable)}
                  />
                </div>
              </div>
            ) : partie.phase === 'devoilement' ? (
              <div className="flex justify-center">
                {partie.devoilement ? (
                  <button type="button" onClick={relancer} className="fmm-glass-btn is-primary px-6 py-4" style={{ flexDirection: 'row', gap: '0.6rem' }}>
                    <RotateCcw size={15} className="text-brass" />
                    <span className="fmm-glass-btn-label">{t.manche}</span>
                  </button>
                ) : (
                  <p className="font-editorial text-[15px] text-ivory-soft">{t.compte}</p>
                )}
              </div>
            ) : partie.phase === 'fini' ? (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    if (enLigne) { window.location.assign(addLocale('/jeux/des', lang)); return; }
                    setSolo(null);
                  }}
                  className="fmm-glass-btn is-primary px-6 py-4"
                  style={{ flexDirection: 'row', gap: '0.6rem' }}
                >
                  <RotateCcw size={15} className="text-brass" />
                  <span className="fmm-glass-btn-label">{t.nouvelle}</span>
                </button>
              </div>
            ) : enLigne && !toutLeMondeAScelle(enLigne) ? (
              /* Tant qu'un gobelet n'est pas scellé, personne ne parle. */
              <div className="flex justify-center">
                <p className="font-editorial text-[15px] text-ivory-soft">{t.gobelets}</p>
              </div>
            ) : (
              <div className="mx-auto w-full max-w-4xl rounded-lg-card border border-brass/25 px-4 md:px-5 py-4 flex flex-wrap items-end justify-center gap-3 md:gap-4"
                   style={{ background: 'rgba(8,3,5,0.66)', backdropFilter: 'blur(8px)' }}>
                <div>
                  <span className="witcher-stat-label block mb-1.5">{fr ? 'Combien' : 'How many'}</span>
                  <div className="inline-flex items-center gap-1 rounded-card border border-brass/35 bg-black/40 p-1">
                    <button type="button" disabled={!monTour} onClick={() => setQuantite((q) => Math.max(1, q - 1))}
                      className="w-9 h-9 rounded-card text-brass hover:bg-brass/15 disabled:opacity-40">
                      <Minus size={15} className="mx-auto" />
                    </button>
                    <span className="min-w-[2.6rem] text-center font-display title-medieval text-xl text-ivory">{quantite}</span>
                    <button type="button" disabled={!monTour} onClick={() => setQuantite((q) => Math.min(total, q + 1))}
                      className="w-9 h-9 rounded-card text-brass hover:bg-brass/15 disabled:opacity-40">
                      <Plus size={15} className="mx-auto" />
                    </button>
                  </div>
                </div>

                <div>
                  <span className="witcher-stat-label block mb-1.5">{fr ? 'De quelle face' : 'Of which face'}</span>
                  <div className="inline-flex items-center gap-1.5">
                    {faces.map((f) => (
                      <button
                        key={f} type="button" disabled={!monTour} onClick={() => setFace(f)}
                        aria-pressed={face === f}
                        className={`w-9 h-9 rounded-card border font-display text-lg transition disabled:opacity-40 ${
                          face === f ? 'bg-brass text-midnight-deep border-brass' : 'bg-black/40 text-ivory-soft border-brass/30 hover:border-brass/70'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!monTour || !miseValide(partie.mise, quantite, face, total)}
                  onClick={jouerAnnonce}
                  className="fmm-glass-btn is-primary px-5 py-3.5 disabled:opacity-40"
                  style={{ flexDirection: 'row', gap: '0.5rem' }}
                >
                  <span className="fmm-glass-btn-label">{t.annoncer}</span>
                </button>
                <button
                  type="button"
                  disabled={!monTour || !partie.mise}
                  onClick={jouerDoute}
                  className="fmm-glass-btn px-5 py-3.5 disabled:opacity-40"
                  style={{ flexDirection: 'row', gap: '0.5rem' }}
                >
                  <Skull size={15} className="text-brass" />
                  <span className="fmm-glass-btn-label">{t.menteur}</span>
                </button>
                {/* Le pari du calzar : viser juste rend un dé perdu. */}
                <button
                  type="button"
                  disabled={!monTour || !partie.mise}
                  onClick={jouerExact}
                  title={t.exactAide}
                  className="fmm-glass-btn px-5 py-3.5 disabled:opacity-40"
                  style={{ flexDirection: 'row', gap: '0.5rem' }}
                >
                  <Target size={15} className="text-brass" />
                  <span className="fmm-glass-btn-label">{t.exact}</span>
                </button>
              </div>
            )}
          </div>
      </CadreJeu>
    </>
  );
};

// ─── Un rang de parures ─────────────────────────────────────────────
const Parures: React.FC<{
  titre: string;
  choix: Array<{ id: string; nom: string }>;
  actif: string;
  onChoisir: (id: string) => void;
}> = ({ titre, choix, actif, onChoisir }) => (
  <div className="flex flex-wrap items-center justify-center gap-2">
    <span className="witcher-stat-label mr-1">{titre}</span>
    {choix.map((c) => (
      <button
        key={c.id}
        type="button"
        onClick={() => onChoisir(c.id)}
        aria-pressed={actif === c.id}
        className={`px-3.5 py-2 rounded-[15px] border font-sans text-[10px] uppercase tracking-[0.16em] transition-colors ${
          actif === c.id
            ? 'border-brass/70 bg-brass/15 text-ivory'
            : 'border-white/15 bg-black/35 text-ivory-soft hover:text-ivory hover:border-brass/45'
        }`}
      >
        {c.nom}
      </button>
    ))}
  </div>
);

export default DesPage;
