// Aperçu de développement de la page du tournoi : `?apercu=1` sur
// /jeux/tournoi, en local seulement (import.meta.env.DEV), rend un
// tournoi en cours sans écrire un seul document. Sert à vérifier le
// rendu à l'écran avant que le vrai tournoi existe.
import { Timestamp } from 'firebase/firestore';
import type { Tournoi, InscriptionTournoi, MatchTournoi } from '../firebase/tournoi';

export const apercuActif = (): boolean =>
  import.meta.env.DEV && new URLSearchParams(window.location.search).get('apercu') === '1';

const noms = ['Ragnar', 'Sigrid', 'Bjorn', 'Astrid', 'Leif', 'Freydis'];
const uids = noms.map((n) => `u-${n.toLowerCase()}`);
const carte = Object.fromEntries(uids.map((u, i) => [u, noms[i]]));

const tournoi: Tournoi = {
  id: 'apercu', nom: 'Tournoi de hnefatafl 2027', jeu: 'hnefatafl', regleId: 'copenhague',
  delaiMs: 24 * 60 * 60 * 1000, dateDebut: Timestamp.fromDate(new Date(2027, 2, 7, 13)),
  statut: 'encours', ronde: 2, nbRondes: 3, nbInscrits: 6, champion: null,
};

const inscrits: InscriptionTournoi[] = uids.map((uid) => ({ uid, nom: carte[uid] }));

const matchs: MatchTournoi[] = [
  { id: 'm1', ronde: 1, ordre: 0, joueurs: [uids[0], null], noms: carte, parties: [], gagnant: uids[0], statut: 'fini', exempt: true },
  { id: 'm2', ronde: 1, ordre: 1, joueurs: [uids[1], null], noms: carte, parties: [], gagnant: uids[1], statut: 'fini', exempt: true },
  { id: 'm3', ronde: 1, ordre: 2, joueurs: [uids[2], uids[3]], noms: carte, parties: ['p3'], gagnant: uids[3], statut: 'fini', exempt: false },
  { id: 'm4', ronde: 1, ordre: 3, joueurs: [uids[4], uids[5]], noms: carte, parties: ['p4', 'p4b'], gagnant: uids[4], statut: 'fini', exempt: false },
  { id: 'm5', ronde: 2, ordre: 0, joueurs: [uids[0], uids[1]], noms: carte, parties: ['p5'], gagnant: null, statut: 'encours', exempt: false },
  { id: 'm6', ronde: 2, ordre: 1, joueurs: [uids[3], uids[4]], noms: carte, parties: ['p6'], gagnant: null, statut: 'encours', exempt: false },
];

export const APERCU = { tournoi, inscrits, matchs };
