// In-memory mock for the schedule — used in DEV_BYPASS so the admin
// editor and the public page work without a live Firestore.

import type { ScheduleDay, ScheduleDoc } from './schedule';
import { CURRENT_SCHEDULE_YEAR } from './schedule';

// Seed with the same 2026 line-up that's hardcoded on ActivitesPage.
// Edits made through the admin Horaire section persist for the
// lifetime of the dev session.
const SEED: ScheduleDay[] = [
  {
    id: 'vendredi',
    dateFR: 'Vendredi 25 septembre',
    dateEN: 'Friday September 25',
    items: [
      { time: '17h00', label: 'Ouverture des portes',                          where: 'Site' },
      { time: '17h00', label: 'Ouverture de la Boustifaille — Village Bouffe', where: 'Village gustatif' },
      { time: '18h00', label: 'Spectacle d’Arrünn',                             where: 'Scène' },
      { time: '19h00', label: 'Danse des Völvas',                               where: 'Autour du feu' },
      { time: '19h15', label: 'Spectacle de Trifolys',                          where: 'Scène' },
    ],
  },
  {
    id: 'samedi',
    dateFR: 'Samedi 26 septembre',
    dateEN: 'Saturday September 26',
    items: [
      { time: '10h00',       label: 'Ouverture des portes',                       where: 'Site' },
      { time: '11h00–11h30', label: 'Démonstration de tissage',                   where: 'Village paysan' },
      { time: '11h15–12h15', label: 'Clinique équestre',                          where: 'Arène' },
      { time: '11h30–12h00', label: 'Démonstration cotte de mailles',             where: 'Village paysan' },
      { time: '12h00–12h30', label: 'Démonstration d’équarrissage',                where: 'Village paysan' },
      { time: '12h30–13h00', label: 'Démonstration de coulage du bronze',          where: 'Village paysan' },
      { time: '13h00–14h00', label: 'Combat viking',                              where: 'Arène' },
      { time: '14h00–14h30', label: 'Démonstration de forge',                     where: 'Village paysan' },
      { time: '14h45–15h00', label: 'Démonstration de gravure sur os',            where: 'Village paysan' },
      { time: '14h45–15h45', label: 'Joute',                                      where: 'Arène' },
      { time: '15h45–16h15', label: 'Parcours d’herboristerie',                    where: 'Village paysan' },
      { time: '15h45–16h15', label: 'Démonstration de planage de bois ancestral', where: 'Village paysan' },
      { time: '16h00–16h30', label: 'Conférence — Construction du Drakkar',       where: 'Village viking' },
      { time: '16h30–17h00', label: 'Concours culinaire',                         where: 'Campement viking' },
      { time: '18h00–18h30', label: 'Démonstration de fonderie de fer',           where: 'Village paysan' },
      { time: '18h30–19h30', label: 'Spectacle de Harfang',                       where: 'Scène' },
      { time: '19h00–19h30', label: 'Parade',                                     where: 'Village paysan' },
      { time: '19h30–19h45', label: 'Allumage du feu + Danse des Berserkirs',     where: 'Feu' },
      { time: '19h45–20h45', label: 'Spectacle de Mystic Projekt',                where: 'Scène' },
      { time: '20h45–21h00', label: 'Spectacle de feu',                           where: 'Feu' },
      { time: '21h00',       label: 'Spectacle de Skarazula',                     where: 'Scène' },
    ],
  },
  {
    id: 'dimanche',
    dateFR: 'Dimanche 27 septembre',
    dateEN: 'Sunday September 27',
    items: [
      { time: '11h00–12h00', label: 'Jeu équestre',                               where: 'Arène' },
      { time: '11h45–12h15', label: 'Parcours d’herboristerie',                   where: 'Village paysan' },
      { time: '11h45–12h15', label: 'Démonstration de forge',                    where: 'Village paysan' },
      { time: '12h00–13h00', label: 'Cérémonie de Freya — Célébration de l’équinoxe', where: 'Camp viking' },
      { time: '13h00–14h00', label: 'Spectacle de Canteraine',                    where: 'Scène' },
      { time: '13h00–15h00', label: 'Banquet de l’Équinoxe',                       where: 'Scène' },
      { time: '13h30–15h00', label: 'Tournoi de bridge fight',                    where: 'Arène' },
      { time: '14h30–15h00', label: 'Démonstration de fonderie de fer',           where: 'Village paysan' },
    ],
  },
];

let STORE: ScheduleDoc = {
  year: CURRENT_SCHEDULE_YEAR,
  days: SEED,
  updatedAt: new Date().toISOString(),
  updatedBy: 'mock',
  updatedByEmail: 'dev@local',
};

const LISTENERS = new Set<(s: ScheduleDoc) => void>();

export async function mockGetSchedule(): Promise<ScheduleDoc> {
  return STORE;
}

export function mockWatchSchedule(cb: (s: ScheduleDoc) => void): () => void {
  cb(STORE);
  LISTENERS.add(cb);
  return () => { LISTENERS.delete(cb); };
}

export async function mockSetSchedule(
  days: ScheduleDay[],
  meta: { uid: string; email: string },
): Promise<void> {
  STORE = {
    year: CURRENT_SCHEDULE_YEAR,
    days,
    updatedAt: new Date().toISOString(),
    updatedBy: meta.uid,
    updatedByEmail: meta.email,
  };
  for (const fn of LISTENERS) fn(STORE);
}
