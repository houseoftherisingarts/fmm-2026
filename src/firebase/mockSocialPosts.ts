// In-memory mock for dev bypass.
import type { SocialPost } from './socialPosts';

const ts = (offsetDays = 0) => {
  const d = new Date(Date.now() - offsetDays * 86400_000);
  return { seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0, toMillis: () => d.getTime() } as unknown as SocialPost['createdAt'];
};

const today = (offsetDays = 0) => new Date(Date.now() + offsetDays * 86400_000).toISOString().slice(0, 10);

const store = new Map<string, SocialPost>();
const seed: SocialPost[] = [
  {
    id: 'mock-social-1',
    title: 'Annonce — Programmation musicale',
    message: 'On dévoile demain les six groupes qui animeront le FMM 2026 !\nL’Harfang, Skarazula, Mystic Projekt, Arrünn, Trifolys et Canteraine.',
    platforms: ['facebook', 'instagram'],
    hashtags: '#FMM2026 #medieval #musique #folk',
    requestedBy: 'Tristan Coté Hotte',
    requestedByEmail: 'tristan@example.com',
    suggestedDate: today(7),
    status: 'scheduled',
    scheduledDate: today(5),
    createdAt: ts(2),
    updatedAt: ts(2),
  },
  {
    id: 'mock-social-2',
    title: 'Demande — Article bénévoles',
    message: 'Léna, peux-tu publier un appel à bénévoles avec la photo de groupe de l’an dernier ? Lien vers /benevole.',
    platforms: ['instagram', 'facebook'],
    link: 'https://festivalmedievaldemontpellier.org/benevole',
    requestedBy: 'Maïté Fournel',
    suggestedDate: today(3),
    status: 'requested',
    createdAt: ts(0),
    updatedAt: ts(0),
  },
  {
    id: 'mock-social-3',
    title: 'Publié — Teaser orb',
    message: 'Une nouvelle ère commence pour le FMM 🛡️',
    platforms: ['instagram'],
    imageUrl: '/hero/viking-cinematic.webp',
    requestedBy: 'Alex T. St-Laurent',
    status: 'posted',
    postedDate: today(-10),
    postedUrls: [{ platform: 'instagram', url: 'https://instagram.com/p/example' }],
    createdAt: ts(15),
    updatedAt: ts(10),
  },
];
seed.forEach((p) => store.set(p.id!, p));

let nextId = 100;

export async function mockCreateSocialPost(p: SocialPost): Promise<string> {
  const id = `mock-social-${++nextId}`;
  store.set(id, { ...p, id, createdAt: ts(0), updatedAt: ts(0) });
  return id;
}
export async function mockUpdateSocialPost(id: string, patch: Partial<SocialPost>): Promise<void> {
  const cur = store.get(id);
  if (!cur) return;
  store.set(id, { ...cur, ...patch, updatedAt: ts(0) });
}
export async function mockDeleteSocialPost(id: string): Promise<void> {
  store.delete(id);
}
export async function mockListSocialPosts(): Promise<SocialPost[]> {
  return Array.from(store.values()).sort((a, b) => {
    const ta = (a.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
    const tb = (b.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
    return tb - ta;
  });
}
