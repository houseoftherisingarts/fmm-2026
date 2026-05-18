// In-memory mock store for musician applications — used when DEV_BYPASS
// is on or when Firestore is unavailable, so the admin Musique tab and
// the form work end-to-end offline.

import type { MusicianApp, MusicianStatus } from './musicians';
import { CURRENT_YEAR } from './applications';

const ts = (offsetDays = 0) => {
  const d = new Date(Date.now() - offsetDays * 86400_000);
  return { seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0, toMillis: () => d.getTime() } as unknown as MusicianApp['createdAt'];
};

const seed: MusicianApp[] = [
  {
    uid:           'mock-musician-harfang',
    email:         'eric.pichette@example.com',
    year:          CURRENT_YEAR,
    status:        'accepted',
    bandName:      'L’Harfang',
    contactName:   'Éric Pichette',
    contactRole:   'leader',
    phone:         '+1 514 555 0102',
    website:       'https://example.com/harfang',
    shortBio:      'Duo médiéval/balfolk — vielle à roue et musette 16 pouces.',
    genres:        ['folk', 'medieval', 'balfolk'],
    performerCount:'duo',
    daysAvailable: ['vendredi', 'samedi', 'dimanche'],
    preferredStage:'fire-circle',
    setLength:     '45-60',
    numberOfSets:  2,
    willingToRove: true,
    fireSafeRepertoire: true,
    soundProvided: 'we-bring-pa',
    monitorsNeeded:2,
    ownsBackline:  true,
    powerNeed:     'one-circuit',
    lightingNeed:  'basic-stage-light',
    travelingFrom: 'Montréal, QC',
    needsLodging:  false,
    needsMeals:    true,
    createdAt:     ts(20),
    updatedAt:     ts(20),
  },
  {
    uid:           'mock-musician-arrunn',
    email:         'arrunn@example.com',
    year:          CURRENT_YEAR,
    status:        'pending',
    bandName:      'Arrünn',
    contactName:   'Tristan Reille',
    contactRole:   'manager',
    phone:         '+33 6 12 34 56 78',
    spotify:       'https://open.spotify.com/artist/0xExample',
    shortBio:      'Groupe de musique néo-trad’ folk viking du clan Managarm.',
    genres:        ['nordic-viking', 'folk', 'pagan-trance'],
    performerCount:'4-5',
    daysAvailable: ['samedi', 'dimanche'],
    preferredStage:'main',
    setLength:     '60-90',
    numberOfSets:  1,
    soundProvided: 'need-fmm-pa',
    inputList:     '6 voix, 1 vielle DI, 1 cornemuse mic, 2 percu OH, 1 bouzouki DI',
    monitorsNeeded:5,
    powerNeed:     'multiple-circuits',
    lightingNeed:  'theatrical',
    travelingFrom: 'Bretagne, France',
    needsLodging:  true,
    needsMeals:    true,
    vehicleCount:  2,
    feeExpectation:'À discuter — couvre frais + cachet symbolique',
    whyFMM:        'On a entendu parler du festival par Skarazula, on veut découvrir le public québécois.',
    createdAt:     ts(7),
    updatedAt:     ts(7),
  },
];

const store = new Map<string, MusicianApp>(seed.map((m) => [`${m.uid}_${m.year}`, m]));

export async function mockListMusicians(): Promise<MusicianApp[]> {
  return Array.from(store.values()).sort((a, b) => {
    const ta = (a.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
    const tb = (b.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
    return tb - ta;
  });
}

export async function mockUpsertMusicianApp(app: MusicianApp): Promise<void> {
  const key = `${app.uid}_${app.year}`;
  const existing = store.get(key);
  store.set(key, {
    ...existing,
    ...app,
    updatedAt: ts(0),
    createdAt: existing?.createdAt || ts(0),
  });
}

export async function mockSetMusicianStatus(uid: string, year: number, status: MusicianStatus, adminNotes?: string): Promise<void> {
  const key = `${uid}_${year}`;
  const existing = store.get(key);
  if (!existing) return;
  store.set(key, {
    ...existing,
    status,
    ...(adminNotes !== undefined ? { adminNotes } : {}),
    updatedAt: ts(0),
  });
}
