// Aperçu de développement de la page du tournoi : `?apercu=1` sur
// /jeux/tournoi, en local seulement (import.meta.env.DEV), rend un
// tournoi en cours sans écrire un seul document. Sert à vérifier le
// rendu à l'écran avant que le vrai tournoi existe.
import { Timestamp } from 'firebase/firestore';
import type { Tournoi, InscriptionTournoi, MatchTournoi, RdvMatch } from '../firebase/tournoi';

// `?apercu=1` ou `?apercu=encours` : tirage fait, ronde 2 en cours.
// `?apercu=inscriptions` : inscriptions ouvertes, on peut s'inscrire et se
// retirer (en mémoire seulement). `?apercu=fini` : champion couronné.
export type ModeApercu = 'inscriptions' | 'encours' | 'fini';

export const apercuMode = (): ModeApercu | null => {
  if (!import.meta.env.DEV) return null;
  const v = new URLSearchParams(window.location.search).get('apercu');
  if (v === '1' || v === 'encours') return 'encours';
  if (v === 'inscriptions' || v === 'fini') return v;
  return null;
};
export const apercuActif = (): boolean => apercuMode() !== null;

/** La personne « connectée » de l'aperçu quand personne ne l'est vraiment. */
export const APERCU_MOI = { uid: 'u-moi', displayName: 'Vous' };


const noms = ['Ragnar', 'Sigrid', 'Bjorn', 'Astrid', 'Leif', 'Freydis'];
const uids = noms.map((n) => `u-${n.toLowerCase()}`);
const carte = Object.fromEntries(uids.map((u, i) => [u, noms[i]]));

const debut = new Date(2027, 2, 7, 13);
const jour = 24 * 60 * 60 * 1000;
const ech = (r: number) => Timestamp.fromMillis(debut.getTime() + (r * 7 * jour) / 3);
const tournoi: Tournoi = {
  id: 'apercu', nom: 'Tournoi de hnefatafl 2027', jeu: 'hnefatafl', regleId: 'copenhague',
  delaiMs: jour, dateDebut: Timestamp.fromDate(debut), dateFin: Timestamp.fromMillis(debut.getTime() + 7 * jour),
  echeances: [ech(1), ech(2), ech(3)],
  statut: 'encours', ronde: 2, nbRondes: 3, nbInscrits: 6, champion: null,
};

const inscrits: InscriptionTournoi[] = uids.map((uid) => ({ uid, nom: carte[uid] }));

const matchs: MatchTournoi[] = [
  { id: 'm1', ronde: 1, ordre: 0, joueurs: [uids[0], null], noms: carte, parties: [], gagnant: uids[0], statut: 'fini', exempt: true },
  { id: 'm2', ronde: 1, ordre: 1, joueurs: [uids[1], null], noms: carte, parties: [], gagnant: uids[1], statut: 'fini', exempt: true },
  { id: 'm3', ronde: 1, ordre: 2, joueurs: [uids[2], uids[3]], noms: carte, parties: ['p3'], gagnant: uids[3], statut: 'fini', exempt: false },
  { id: 'm4', ronde: 1, ordre: 3, joueurs: [uids[4], uids[5]], noms: carte, parties: ['p4', 'p4b'], gagnant: uids[4], statut: 'fini', exempt: false },
  { id: 'm5', ronde: 2, ordre: 0, joueurs: [uids[0], uids[1]], noms: carte, parties: ['p5'], gagnant: null, statut: 'encours', exempt: false, echeance: ech(2) },
  { id: 'm6', ronde: 2, ordre: 1, joueurs: [uids[3], uids[4]], noms: carte, parties: ['p6'], gagnant: null, statut: 'encours', exempt: false, echeance: ech(2) },
];

// En aperçu, la personne connectée (« Vous ») remplace Ragnar dans le
// match m5 pour voir la coordination vivre : Sigrid a proposé deux soirs.
const APERCU_MOI_UID = 'u-moi';
const matchsMoi = matchs.map((m) => m.id === 'm5'
  ? { ...m, joueurs: [APERCU_MOI_UID, uids[1]] as [string, string], noms: { ...carte, [APERCU_MOI_UID]: 'Vous' } }
  : m);
export const APERCU_RDV: RdvMatch[] = [
  { uid: uids[1], creneaux: [Timestamp.fromMillis(debut.getTime() + 2 * jour + 6 * 3600e3), Timestamp.fromMillis(debut.getTime() + 3 * jour + 7 * 3600e3)],
    message: 'Je suis libre les soirs après le souper.', choix: null },
];

const parMode: Record<ModeApercu, typeof APERCU_ENCOURS> = {
  encours: { tournoi, inscrits, matchs: matchsMoi },
  inscriptions: {
    tournoi: { ...tournoi, statut: 'inscriptions', ronde: 0, nbRondes: 0, nbInscrits: 4 },
    inscrits: inscrits.slice(0, 4),
    matchs: [],
  },
  fini: {
    tournoi: { ...tournoi, statut: 'fini', ronde: 3, champion: { uid: uids[3], nom: carte[uids[3]] } },
    inscrits,
    matchs: [
      ...matchs.slice(0, 4),
      { ...matchs[4], gagnant: uids[0], statut: 'fini' },
      { ...matchs[5], gagnant: uids[3], statut: 'fini' },
      { id: 'm7', ronde: 3, ordre: 0, joueurs: [uids[0], uids[3]], noms: carte, parties: ['p7'], gagnant: uids[3], statut: 'fini', exempt: false },
    ],
  },
};
const APERCU_ENCOURS = { tournoi, inscrits, matchs };

export const APERCU = parMode[apercuMode() ?? 'encours'];
