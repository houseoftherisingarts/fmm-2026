// In-memory seed for the community wall + DMs + public profiles when
// running with VITE_ADMIN_DEV_BYPASS or just `vite dev` without a
// configured Firebase project. Kept separate from mockApplications so
// it can be tree-shaken in production builds (only imported by the
// community pages, which themselves are gated on the user being a
// signed-in bénévole).

import type { Post, Comment, ReactionKey } from './community';
import type { DM, DMThread } from './dms';
import { threadId } from './dms';
import type { PublicProfile } from './publicProfile';
import { hueFor, composePublicProfile } from './publicProfile';
import { mockListBenevoles } from './mockApplications';
import type { BenevoleApp } from './applications';

const now = (offsetMin: number) => {
  const d = new Date(Date.now() + offsetMin * 60_000);
  return { toDate: () => d, seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 };
};

let _posts: Post[] = [
  {
    id: 'post-welcome',
    channel: 'open',
    kind: 'announcement',
    authorUid: 'mock-b2', authorName: 'Maïté Lavoie', authorAvatarHue: hueFor('Maïté Lavoie'),
    body: "Bienvenue dans l'espace bénévoles 2026 ! On utilise ce mur comme point de rendez-vous : annonces, covoiturage, photos, questions. Pour les sujets d'équipe, allez dans le canal de votre station (Bar, Accueil, Sécurité, etc). 🍺⚔️🎟️",
    pinned: true,
    reactionCount: 7, commentCount: 2,
    createdAt: now(-60 * 24 * 3) as any,
  },
  {
    id: 'post-rideshare-1',
    channel: 'open',
    kind: 'rideshare-offer',
    authorUid: 'mock-b0', authorName: 'Léa Marchand', authorAvatarHue: hueFor('Léa Marchand'),
    body: 'Je pars de Gatineau jeudi midi. 3 places dispo dans la voiture, je peux ramasser sur le trajet (sortie 138 et alentours).',
    meta: { from: 'Gatineau', to: 'Montpellier (FMM)', when: 'Jeudi 24 sept · 12h00', seats: 3, price: 15, direction: 'aller' },
    rideshareSubscribers: ['mock-b1'],
    reactionCount: 3, commentCount: 1,
    createdAt: now(-60 * 24 * 1) as any,
  },
  {
    id: 'post-rideshare-2',
    channel: 'open',
    kind: 'rideshare-request',
    authorUid: 'mock-b3', authorName: 'Océane Leclair', authorAvatarHue: hueFor('Océane Leclair'),
    body: "Je cherche un covoiturage pour le retour dimanche soir vers Ottawa/Hull. J'apporte des biscuits 🍪",
    meta: { from: 'Montpellier (FMM)', to: 'Ottawa / Hull', when: 'Dimanche 27 sept · ~21h', seats: 1, direction: 'retour' },
    reactionCount: 2, commentCount: 0,
    createdAt: now(-60 * 8) as any,
  },
  {
    id: 'post-bar-team-1',
    channel: 'team-bar',
    kind: 'post',
    authorUid: 'mock-b0', authorName: 'Léa Marchand', authorAvatarHue: hueFor('Léa Marchand'),
    body: "Hello l'équipe Bar ! On se voit jeudi soir 16h pour le montage. Quelqu'un peut apporter la rallonge 25 pieds ?",
    reactionCount: 4, commentCount: 3,
    createdAt: now(-60 * 4) as any,
  },
  {
    id: 'post-accueil-team-1',
    channel: 'team-accueil',
    kind: 'post',
    authorUid: 'mock-b2', authorName: 'Maïté Lavoie', authorAvatarHue: hueFor('Maïté Lavoie'),
    body: 'Petit rappel : on a un briefing accueil samedi 9h30 — apportez votre liste de bracelets/billetterie.',
    reactionCount: 1, commentCount: 0,
    createdAt: now(-60 * 2) as any,
  },
  {
    id: 'post-open-1',
    channel: 'open',
    kind: 'post',
    authorUid: 'mock-bene-vole', authorName: 'Béné Vole', authorAvatarHue: hueFor('Béné Vole'),
    body: "C'est ma première année — j'ai hâte de rencontrer tout le monde. Quelqu'un sait s'il y a un dress code médiéval pour les bénévoles ou on peut juste apporter le t-shirt FMM ?",
    reactionCount: 5, commentCount: 4,
    createdAt: now(-30) as any,
  },
];

const _comments: Record<string, Comment[]> = {
  'post-welcome': [
    { id: 'c1', authorUid: 'mock-b0', authorName: 'Léa Marchand', authorAvatarHue: hueFor('Léa Marchand'), body: 'Yesss j\'ai hâte 🍻', createdAt: now(-60 * 24 * 3 + 60) as any },
    { id: 'c2', authorUid: 'mock-bene-vole', authorName: 'Béné Vole', authorAvatarHue: hueFor('Béné Vole'), body: 'Parfait, merci pour l\'accueil ✨', createdAt: now(-60 * 24 * 3 + 90) as any },
  ],
  'post-rideshare-1': [
    { id: 'c1', authorUid: 'mock-b1', authorName: 'Tristan Dubois', authorAvatarHue: hueFor('Tristan Dubois'), body: 'Je m\'inscris ! Je suis à 5 min de la sortie 138.', createdAt: now(-60 * 23) as any },
  ],
  'post-bar-team-1': [
    { id: 'c1', authorUid: 'mock-b1', authorName: 'Tristan Dubois', authorAvatarHue: hueFor('Tristan Dubois'), body: 'J\'en ai une orange dans mon char, je l\'apporte 👍', createdAt: now(-60 * 3) as any },
    { id: 'c2', authorUid: 'mock-b0', authorName: 'Léa Marchand', authorAvatarHue: hueFor('Léa Marchand'), body: 'Top merci 🙌', createdAt: now(-60 * 2) as any },
    { id: 'c3', authorUid: 'mock-bene-vole', authorName: 'Béné Vole', authorAvatarHue: hueFor('Béné Vole'), body: 'Hâte ! Je n\'ai jamais fait de bar, à quoi je m\'attends ?', createdAt: now(-60) as any },
  ],
};

const _reactions: Record<string, Record<string, ReactionKey>> = {
  // postId → uid → reactionKey
  'post-welcome':       { 'mock-b0': 'heart', 'mock-bene-vole': 'star' },
  'post-rideshare-1':   { 'mock-b1': 'heart' },
  'post-bar-team-1':    { 'mock-b1': 'like', 'mock-bene-vole': 'heart' },
};

// ─── DMs ───────────────────────────────────────────────────────────
const _threads: Record<string, DMThread> = {};
const _dms: Record<string, DM[]> = {};

function seedThread(a: { uid: string; name: string }, b: { uid: string; name: string }, msgs: { from: string; body: string; ago: number }[]) {
  const id = threadId(a.uid, b.uid);
  _threads[id] = {
    id,
    participantUids:  [a.uid, b.uid].sort() as [string, string],
    participantNames: { [a.uid]: a.name, [b.uid]: b.name },
    participantHues:  { [a.uid]: hueFor(a.name), [b.uid]: hueFor(b.name) },
    lastMessage:    msgs[msgs.length - 1]?.body.slice(0, 140),
    lastMessageAt:  now(-msgs[msgs.length - 1]?.ago) as any,
    lastSenderUid:  msgs[msgs.length - 1]?.from,
    unread:         { [a.uid]: 0, [b.uid]: 0 },
  };
  _dms[id] = msgs.map((m, i) => ({
    id: `m-${i}`,
    senderUid:  m.from,
    senderName: m.from === a.uid ? a.name : b.name,
    body: m.body,
    createdAt: now(-m.ago) as any,
  }));
}

seedThread(
  { uid: 'mock-bene-vole', name: 'Béné Vole' },
  { uid: 'mock-b0',        name: 'Léa Marchand' },
  [
    { from: 'mock-bene-vole', ago: 60 * 24, body: "Hey ! J'ai vu que tu fais le bar — j'aimerais t'aider, t'as un conseil pour quelqu'un qui n'a jamais fait de service ?" },
    { from: 'mock-b0',        ago: 60 * 23, body: 'Salut ! Aucun stress, je te montrerai. Le plus important c\'est de garder le sourire pis suivre la cadence 😄' },
    { from: 'mock-bene-vole', ago: 60 * 22, body: 'Trop cool, merci 🙏' },
  ],
);
seedThread(
  { uid: 'mock-b2', name: 'Maïté Lavoie' },
  { uid: 'mock-b1', name: 'Tristan Dubois' },
  [
    { from: 'mock-b2', ago: 60 * 5, body: 'Tristan, tu es libre samedi 14h pour un quart additionnel sécurité ?' },
    { from: 'mock-b1', ago: 60 * 4, body: 'Oui pas de souci, je note.' },
  ],
);

// ─── API ───────────────────────────────────────────────────────────
export function mockListChannelPosts(channel: string): Promise<Post[]> {
  return Promise.resolve(
    _posts.filter((p) => p.channel === channel)
          .sort((a, b) => (b.createdAt as any).seconds - (a.createdAt as any).seconds),
  );
}
export function mockCreatePost(p: Omit<Post, 'id' | 'createdAt' | 'updatedAt' | 'reactionCount' | 'commentCount'>): Promise<string> {
  const id = `post-${Math.random().toString(36).slice(2, 8)}`;
  _posts.push({ ...p, id, reactionCount: 0, commentCount: 0, createdAt: now(0) as any, updatedAt: now(0) as any });
  return Promise.resolve(id);
}
export function mockDeletePost(postId: string): Promise<void> {
  _posts = _posts.filter((p) => p.id !== postId);
  delete _comments[postId];
  delete _reactions[postId];
  return Promise.resolve();
}
export function mockListComments(postId: string): Promise<Comment[]> {
  return Promise.resolve([...(_comments[postId] || [])]);
}
export function mockAddComment(postId: string, c: Omit<Comment, 'id' | 'createdAt'>): Promise<void> {
  if (!_comments[postId]) _comments[postId] = [];
  _comments[postId].push({ ...c, id: `c-${Date.now()}`, createdAt: now(0) as any });
  _posts = _posts.map((p) => p.id === postId ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p);
  return Promise.resolve();
}
export function mockSetReaction(postId: string, uid: string, type: ReactionKey | null): Promise<void> {
  if (!_reactions[postId]) _reactions[postId] = {};
  const had = !!_reactions[postId][uid];
  if (type === null) {
    delete _reactions[postId][uid];
    if (had) _posts = _posts.map((p) => p.id === postId ? { ...p, reactionCount: Math.max(0, (p.reactionCount || 0) - 1) } : p);
  } else {
    _reactions[postId][uid] = type;
    if (!had) _posts = _posts.map((p) => p.id === postId ? { ...p, reactionCount: (p.reactionCount || 0) + 1 } : p);
  }
  return Promise.resolve();
}
export function mockGetReaction(postId: string, uid: string): Promise<ReactionKey | null> {
  return Promise.resolve(_reactions[postId]?.[uid] || null);
}
export function mockToggleRideshareSub(postId: string, uid: string, _name: string): Promise<void> {
  _posts = _posts.map((p) => {
    if (p.id !== postId) return p;
    const subs = p.rideshareSubscribers || [];
    return {
      ...p,
      rideshareSubscribers: subs.includes(uid) ? subs.filter((s) => s !== uid) : [...subs, uid],
    };
  });
  return Promise.resolve();
}

// DMs
export function mockListThreads(uid: string): Promise<DMThread[]> {
  return Promise.resolve(
    Object.values(_threads)
      .filter((t) => t.participantUids.includes(uid))
      .sort((a, b) => ((b.lastMessageAt as any)?.seconds || 0) - ((a.lastMessageAt as any)?.seconds || 0)),
  );
}
export function mockListDMs(threadId: string): Promise<DM[]> {
  return Promise.resolve([...(_dms[threadId] || [])]);
}
export function mockSendDM(id: string, msg: Omit<DM, 'id' | 'createdAt'>, otherUid: string, otherName: string, otherHue: number): Promise<void> {
  if (!_dms[id]) {
    // ensure thread
    const meUid = msg.senderUid;
    const sorted = [meUid, otherUid].sort() as [string, string];
    _threads[id] = {
      id,
      participantUids: sorted,
      participantNames: { [meUid]: msg.senderName, [otherUid]: otherName },
      participantHues:  { [meUid]: hueFor(msg.senderName), [otherUid]: otherHue },
      unread: { [meUid]: 0, [otherUid]: 0 },
    };
    _dms[id] = [];
  }
  _dms[id].push({ ...msg, id: `m-${Date.now()}`, createdAt: now(0) as any });
  if (_threads[id]) {
    _threads[id].lastMessage   = msg.body.slice(0, 140);
    _threads[id].lastMessageAt = now(0) as any;
    _threads[id].lastSenderUid = msg.senderUid;
  }
  return Promise.resolve();
}

// Public profiles
export async function mockGetPublicProfile(uid: string): Promise<PublicProfile | null> {
  const list: BenevoleApp[] = await mockListBenevoles();
  const ben = list.find((b) => b.uid === uid);
  if (!ben) return null;
  return composePublicProfile(uid, null, ben);
}
export async function mockListAllProfiles(): Promise<PublicProfile[]> {
  const list = await mockListBenevoles();
  return list.map((b) => composePublicProfile(b.uid, null, b));
}
