// ─── Les chambres ouvertes et la recherche d'adversaire ─────────────
// Alex, 2026-09-01 : « Au lieu d'être seulement capable de défier un
// ami, partir une chambre avec une partie que les joueurs peuvent
// joindre, et un système de matchmaking. Si aucun adversaire n'est
// trouvé en une minute, partir une partie contre l'ordinateur. »
//
// Rien de neuf côté base de données : une chambre EST une partie au
// statut `lobby` avec le drapeau `public`. Le lobby, la prise de siège
// et les règles de sécurité existent depuis le mois d'août, ils
// servent tels quels. Une collection de plus aurait demandé ses
// propres règles, ses propres index et sa propre page de lobby, pour
// exactement le même document.
//
// L'appariement se fait entre deux navigateurs, sans serveur, et le
// piège est connu : deux personnes qui cherchent en même temps ouvrent
// chacune leur chambre et s'attendent l'une l'autre pour toujours. La
// parade tient en une ligne, plus bas : celui dont l'identifiant de
// chambre est le plus grand va s'asseoir chez l'autre. L'ordre est
// total et identique des deux côtés, donc un seul des deux bouge.

import {
  collection, doc, deleteDoc, updateDoc, getDocs, query, where, orderBy,
  limit, onSnapshot, serverTimestamp, type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  ouvrirSalonJeu, rejoindreDefiParLien, CAMPS_DU_JEU, JEUX_DEFIABLES,
  type JeuDefi, type PartieTafl,
} from './tafl';
import {
  ouvrirDefiDesParLien, rejoindreDefiDesParLien, JOUEURS_MAX,
  type PartieDes,
} from './desParties';

export type JeuSalon = JeuDefi | 'des';

/** Le nom et l'adresse de chaque jeu, les dés compris. */
export const SALON_JEUX: Record<JeuSalon, {
  nomFR: string; nomEN: string; auFR: string; cheminFR: string; cheminEN: string;
}> = {
  ...JEUX_DEFIABLES,
  des: {
    nomFR: 'Les dés du menteur', nomEN: 'Liar’s Dice', auFR: 'aux dés',
    cheminFR: '/jeux/des', cheminEN: '/en/games/dice',
  },
};

export interface SalonOuvert {
  id: string;
  jeu: JeuSalon;
  hoteUid: string;
  hoteNom: string;
  regleId: string;
  /** Nombre de personnes déjà assises (les dés en portent jusqu'à cinq). */
  assis: number;
  places: number;
  /** L'heure d'ouverture, en millisecondes. Zéro quand le serveur n'a
   *  pas encore horodaté le document. */
  ouvertA: number;
}

/** Une chambre plus vieille que ça n'attend plus personne : celui qui
 *  l'a ouverte a fermé son onglet. Elle disparaît de la liste. */
const PEREMPTION_MS = 3 * 60 * 1000;

/** Le temps qu'on laisse à une vraie personne de se présenter. */
export const ATTENTE_MS = 60_000;

const enMillis = (t?: Timestamp | null): number => {
  try { return t ? t.toMillis() : 0; } catch { return 0; }
};

const fraiche = (ouvertA: number): boolean =>
  ouvertA === 0 || Date.now() - ouvertA < PEREMPTION_MS;

const versSalonTafl = (p: PartieTafl): SalonOuvert => ({
  id: p.id,
  jeu: (p.jeu ?? 'hnefatafl') as JeuSalon,
  hoteUid: p.lancePar,
  hoteNom: p.noms?.[p.lancePar] ?? '',
  regleId: p.regleId,
  assis: p.joueurs?.length ?? 1,
  places: 2,
  ouvertA: enMillis(p.createdAt),
});

const versSalonDes = (p: PartieDes): SalonOuvert => ({
  id: p.id,
  jeu: 'des',
  hoteUid: p.lancePar,
  hoteNom: p.noms?.[p.lancePar] ?? '',
  regleId: 'des',
  assis: p.joueurs?.length ?? 1,
  places: JOUEURS_MAX,
  ouvertA: enMillis(p.createdAt),
});

// ─── Ouvrir, fermer, rejoindre ──────────────────────────────────────

export async function ouvrirSalon(opts: {
  jeu: JeuSalon;
  moi: { uid: string; nom: string };
  regleId: string;
  /** Le camp que je prends. Sans précision, je prends le second, et
   *  celui qui s'assoit ouvre la partie. */
  monCamp?: string;
}): Promise<string> {
  if (opts.jeu === 'des') {
    const id = await ouvrirDefiDesParLien({ moiUid: opts.moi.uid, moiNom: opts.moi.nom });
    if (db) await updateDoc(doc(db, 'desParties', id), { public: true, updatedAt: serverTimestamp() });
    return id;
  }
  return ouvrirSalonJeu({
    jeu: opts.jeu,
    moiUid: opts.moi.uid, moiNom: opts.moi.nom,
    regleId: opts.regleId,
    monCamp: opts.monCamp ?? CAMPS_DU_JEU[opts.jeu][1],
  });
}

/** Referme ma chambre. Elle disparaît : une table vide dans la liste
 *  vaut moins que rien, elle fait cliquer pour rien. */
export async function fermerSalon(jeu: JeuSalon, id: string): Promise<void> {
  if (!db) return;
  const col = jeu === 'des' ? 'desParties' : 'taflParties';
  try {
    await deleteDoc(doc(db, col, id));
  } catch {
    // La règle refuse la suppression une fois quelqu'un assis : la
    // partie est alors bel et bien commencée, il n'y a rien à fermer.
  }
}

export type Accueil = 'ok' | 'plein' | 'introuvable' | 'moi';

export async function rejoindreSalon(
  s: Pick<SalonOuvert, 'id' | 'jeu'>, uid: string, nom: string,
): Promise<Accueil> {
  return s.jeu === 'des'
    ? rejoindreDefiDesParLien(s.id, uid, nom)
    : rejoindreDefiParLien(s.id, uid, nom);
}

// ─── La liste des chambres ──────────────────────────────────────────

const requetePubliques = (col: 'taflParties' | 'desParties') => query(
  collection(db!, col),
  where('statut', '==', 'lobby'),
  where('public', '==', true),
  orderBy('createdAt', 'desc'),
  limit(30),
);

/** Les chambres ouvertes, en direct. `jeu` à null les montre toutes. */
export function suivreSalonsOuverts(
  jeu: JeuSalon | null,
  cb: (salons: SalonOuvert[]) => void,
): () => void {
  if (!db) { cb([]); return () => {}; }
  let taflSalons: SalonOuvert[] = [];
  let desSalons: SalonOuvert[] = [];
  const rendre = () => {
    const tout = [...taflSalons, ...desSalons]
      .filter((s) => fraiche(s.ouvertA))
      .filter((s) => (jeu ? s.jeu === jeu : true))
      .sort((a, b) => b.ouvertA - a.ouvertA);
    cb(tout);
  };

  const arrets: Array<() => void> = [];
  if (jeu !== 'des') {
    arrets.push(onSnapshot(
      requetePubliques('taflParties'),
      (snap) => {
        taflSalons = snap.docs.map((d) => versSalonTafl({ id: d.id, ...(d.data() as object) } as PartieTafl));
        rendre();
      },
      () => { taflSalons = []; rendre(); },
    ));
  }
  if (jeu === null || jeu === 'des') {
    arrets.push(onSnapshot(
      requetePubliques('desParties'),
      (snap) => {
        desSalons = snap.docs.map((d) => versSalonDes({ id: d.id, ...(d.data() as object) } as PartieDes));
        rendre();
      },
      () => { desSalons = []; rendre(); },
    ));
  }
  return () => arrets.forEach((a) => a());
}

/** Une lecture unique, pour la recherche d'adversaire. */
async function lireSalons(jeu: JeuSalon): Promise<SalonOuvert[]> {
  if (!db) return [];
  const col = jeu === 'des' ? 'desParties' : 'taflParties';
  try {
    const snap = await getDocs(requetePubliques(col));
    const tous = snap.docs.map((d) => (col === 'desParties'
      ? versSalonDes({ id: d.id, ...(d.data() as object) } as PartieDes)
      : versSalonTafl({ id: d.id, ...(d.data() as object) } as PartieTafl)));
    return tous.filter((s) => s.jeu === jeu && fraiche(s.ouvertA));
  } catch {
    return [];
  }
}

// ─── La recherche d'adversaire ──────────────────────────────────────

export type EtatRecherche =
  | 'sonde'        // je regarde s'il y a une chambre ouverte
  | 'attente'      // ma chambre est ouverte, j'attends quelqu'un
  | 'trouve'       // quelqu'un est là, la partie s'ouvre
  | 'ordinateur';  // personne en une minute, la maison prend le siège

export interface Recherche {
  /** Arrête tout et referme ma chambre. */
  annuler: () => Promise<void>;
}

export interface OptionsRecherche {
  jeu: JeuSalon;
  moi: { uid: string; nom: string };
  regleId: string;
  monCamp?: string;
  /** Le temps laissé à une vraie personne. Une minute par défaut. */
  attenteMs?: number;
  surEtat?: (e: EtatRecherche) => void;
  /** Une partie s'ouvre : voici son identifiant. */
  surPartie: (id: string, jeu: JeuSalon) => void;
  /** Personne n'est venu : la maison prend le siège. */
  surOrdinateur: () => void;
}

/**
 * Cherche un adversaire, puis bascule sur la maison.
 *
 * Le déroulé, dans l'ordre : je regarde les chambres ouvertes et je
 * m'assois dans la première qui veut de moi. S'il n'y en a aucune,
 * j'ouvre la mienne et j'attends, en regardant toutes les cinq
 * secondes si quelqu'un a ouvert une chambre plus ancienne que la
 * mienne, auquel cas j'y vais et je referme la mienne. Au bout d'une
 * minute, je ferme et la partie commence contre l'ordinateur.
 */
export function chercherAdversaire(o: OptionsRecherche): Recherche {
  const attente = o.attenteMs ?? ATTENTE_MS;
  let vivant = true;
  let monSalon: string | null = null;
  let arretEcoute: (() => void) | null = null;
  let sablier: ReturnType<typeof setTimeout> | null = null;
  let ronde: ReturnType<typeof setInterval> | null = null;

  const ranger = () => {
    if (arretEcoute) { arretEcoute(); arretEcoute = null; }
    if (sablier) { clearTimeout(sablier); sablier = null; }
    if (ronde) { clearInterval(ronde); ronde = null; }
  };

  const partir = (id: string) => {
    if (!vivant) return;
    vivant = false;
    ranger();
    o.surEtat?.('trouve');
    o.surPartie(id, o.jeu);
  };

  /** Tente de s'asseoir dans une chambre. Rend vrai si c'est fait. */
  const essayer = async (candidats: SalonOuvert[]): Promise<boolean> => {
    for (const s of candidats) {
      if (!vivant) return false;
      const r = await rejoindreSalon(s, o.moi.uid, o.moi.nom);
      if (r === 'ok' || r === 'moi') {
        if (monSalon) { const mien = monSalon; monSalon = null; void fermerSalon(o.jeu, mien); }
        partir(s.id);
        return true;
      }
    }
    return false;
  };

  void (async () => {
    o.surEtat?.('sonde');
    const dabord = (await lireSalons(o.jeu)).filter((s) => s.hoteUid !== o.moi.uid);
    if (await essayer(dabord)) return;
    if (!vivant) return;

    // Personne n'attend : j'ouvre ma table.
    try {
      monSalon = await ouvrirSalon({ jeu: o.jeu, moi: o.moi, regleId: o.regleId, monCamp: o.monCamp });
    } catch {
      // Sans base de données, la maison prend le siège tout de suite.
      if (!vivant) return;
      vivant = false;
      o.surEtat?.('ordinateur');
      o.surOrdinateur();
      return;
    }
    if (!vivant || !monSalon) { if (monSalon) void fermerSalon(o.jeu, monSalon); return; }
    o.surEtat?.('attente');

    const col = o.jeu === 'des' ? 'desParties' : 'taflParties';
    arretEcoute = onSnapshot(doc(db!, col, monSalon), (snap) => {
      const d = snap.data() as { statut?: string; joueurs?: string[] } | undefined;
      if (!d) return;
      // Quelqu'un s'est assis. Aux dés, la table attend le départ que
      // donne l'hôte; sur un plateau, la partie commence toute seule.
      const assis = (d.joueurs?.length ?? 1) >= 2;
      if (d.statut === 'encours' || (o.jeu === 'des' && assis)) {
        const id = monSalon!;
        monSalon = null;
        partir(id);
      }
    }, () => {});

    ronde = setInterval(() => {
      void (async () => {
        if (!vivant || !monSalon) return;
        const autres = (await lireSalons(o.jeu))
          .filter((s) => s.hoteUid !== o.moi.uid)
          // Le départage : je ne vais m'asseoir que chez une chambre
          // dont l'identifiant passe avant le mien. Des deux qui
          // cherchent, un seul bouge, et jamais les deux en même temps.
          .filter((s) => monSalon !== null && s.id < monSalon);
        if (autres.length > 0) await essayer(autres);
      })();
    }, 5000);

    sablier = setTimeout(() => {
      if (!vivant) return;
      vivant = false;
      ranger();
      const mien = monSalon;
      monSalon = null;
      if (mien) void fermerSalon(o.jeu, mien);
      o.surEtat?.('ordinateur');
      o.surOrdinateur();
    }, attente);
  })();

  return {
    annuler: async () => {
      if (!vivant && !monSalon) return;
      vivant = false;
      ranger();
      const mien = monSalon;
      monSalon = null;
      if (mien) await fermerSalon(o.jeu, mien);
    },
  };
}
