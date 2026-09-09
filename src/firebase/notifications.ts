// ─── Les notifications de l'espace membre ────────────────────────────
// Alex, 2026-08-27 : en haut de l'espace, une cloche qui compte ce qui
// attend la personne, et un raccourci vers ses messages. Rien de neuf
// n'est écrit côté serveur : la cloche ÉCOUTE ce qui existe déjà et
// compare avec le moment où la personne a regardé pour la dernière
// fois (`notifsVuesLe` et `pagesVues` sur sa fiche `membres/{uid}`).
//
//   • messages   : fils /dms où unread[uid] > 0 (les avis de l'équipe
//                  arrivent dans le même fil, au nom du festival)
//   • amitiés    : /amities en 'demande' venant de quelqu'un d'autre
//   • badges     : /badges/{uid}.obtenus gagnés après notifsVuesLe
//   • pages      : piliers publiés (siteFlags) que la fiche n'a pas
//                  encore vus passer
//   • guildes    : billets de vitrine, messages de salon et événements
//                  créés dans mes guildes après notifsVuesLe, un lien
//                  par onglet (addendum 2 du 6 septembre 2026, ordre 15c)

import {
  collection, doc, onSnapshot, query, where, orderBy, limit as fbLimit, setDoc, serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { addLocale } from '../lib/locale';
import { listerMesGuildes, type Guilde } from './guildes';
import { PILLARS } from '../content';
import { PILLAR_PUBLISH_FLAGS, subscribeSiteFlags, isPillarPublished } from './siteFlags';
import { badgeParId } from './badges';
import { JEUX_DEFIABLES, jeuDe, type JeuDefi } from './tafl';

export type GenreNotif = 'message' | 'amitie' | 'badge' | 'page' | 'defi' | 'tour' | 'guilde';

export interface Notif {
  id: string;
  genre: GenreNotif;
  /** Le libellé, déjà dans la langue de la page. */
  titre: { FR: string; EN: string };
  /** Où mène le clic (FR / EN). */
  lien: { FR: string; EN: string };
  /** Pour trier, les plus récentes d'abord. */
  quand: number;
}

export interface EtatNotifs {
  notifs: Notif[];
  /** Le nombre de messages non lus, à part, pour le raccourci Messages. */
  messagesNonLus: number;
}

const ms = (t?: Timestamp | null): number => (t && typeof t.toMillis === 'function' ? t.toMillis() : 0);

// ── La cloche du clan ───────────────────────────────────────────────
// Trois sources par guilde, chacune avec l'onglet qu'elle ouvre et le
// champ qui nomme l'auteur (mes propres écrits ne sonnent pas).
interface SourceClan {
  col: 'vitrine' | 'clavardage' | 'evenements';
  onglet: 'vitrine' | 'salon' | 'evenements';
  auteur: 'uid' | 'creePar';
  FR: (n: number, g: string) => string;
  EN: (n: number, g: string) => string;
}

const SOURCES_CLAN: SourceClan[] = [
  { col: 'vitrine', onglet: 'vitrine', auteur: 'uid',
    FR: (n, g) => (n > 1 ? `${n} nouveaux billets dans la vitrine de ${g}` : `Un nouveau billet dans la vitrine de ${g}`),
    EN: (n, g) => (n > 1 ? `${n} new posts in the ${g} showcase` : `A new post in the ${g} showcase`) },
  { col: 'clavardage', onglet: 'salon', auteur: 'uid',
    FR: (n, g) => (n > 1 ? `${n} nouveaux messages au salon de ${g}` : `Un nouveau message au salon de ${g}`),
    EN: (n, g) => (n > 1 ? `${n} new messages in the ${g} chat` : `A new message in the ${g} chat`) },
  { col: 'evenements', onglet: 'evenements', auteur: 'creePar',
    FR: (n, g) => (n > 1 ? `${n} nouveaux événements chez ${g}` : `Un nouvel événement chez ${g}`),
    EN: (n, g) => (n > 1 ? `${n} new events at ${g}` : `A new event at ${g}`) },
];

export function suivreNotifications(uid: string, cb: (etat: EtatNotifs) => void): () => void {
  if (!db) { cb({ notifs: [], messagesNonLus: 0 }); return () => {}; }
  const base = db;

  let vuesLe = 0;
  let pagesVues = new Set<string>();
  let messages: Notif[] = [];
  let nonLus = 0;
  let amities: Notif[] = [];
  let badgesObtenus: Record<string, Timestamp | null> = {};
  let flagsOk: string[] = [];
  let parties: Notif[] = [];
  let partiesDes: Notif[] = [];
  let vivant = true;
  // Par guilde et par source, les horodatages de ce que les autres ont
  // écrit; le compte se refait à chaque publication contre `vuesLe`.
  const clan = new Map<string, { guilde: Guilde; source: SourceClan; quand: number[] }>();
  const notifsClan = (): Notif[] => Array.from(clan.values()).flatMap(({ guilde: g, source: s, quand }) => {
    const neufs = quand.filter((t) => t > vuesLe);
    if (!neufs.length) return [];
    const chemin = g.slug ? `/${g.slug}/${s.onglet}` : `/guildes/${g.id}`;
    return [{
      id: `guilde-${g.id}-${s.col}`, genre: 'guilde' as const, quand: Math.max(...neufs),
      titre: { FR: s.FR(neufs.length, g.nom), EN: s.EN(neufs.length, g.nom) },
      lien: { FR: chemin, EN: addLocale(chemin, 'EN') },
    }];
  });

  const publier = () => {
    const badges: Notif[] = Object.entries(badgesObtenus)
      .filter(([id, t]) => badgeParId(id) && ms(t) > vuesLe)
      .map(([id, t]) => {
        const b = badgeParId(id)!;
        return {
          id: `badge-${id}`, genre: 'badge' as const, quand: ms(t),
          titre: { FR: `Nouveau badge : ${b.nomFR}`, EN: `New badge: ${b.nomEN}` },
          lien: { FR: '/compte?onglet=badges', EN: '/en/account?onglet=badges' },
        };
      });
    const pages: Notif[] = flagsOk
      .filter((key) => !pagesVues.has(key))
      .map((key) => {
        const p = PILLARS.find((x) => x.key === key);
        return {
          id: `page-${key}`, genre: 'page' as const, quand: 0,
          titre: { FR: `Nouvelle page en ligne : ${p?.label.FR ?? key}`, EN: `New page online: ${p?.label.EN ?? key}` },
          lien: { FR: p?.slug.FR ?? '/', EN: p?.slug.EN ?? '/en' },
        };
      });
    const notifs = [...messages, ...amities, ...parties, ...partiesDes, ...badges, ...pages, ...notifsClan()].sort((a, b) => b.quand - a.quand);
    cb({ notifs, messagesNonLus: nonLus });
  };

  const arrets = [
    onSnapshot(doc(base, 'membres', uid), (snap) => {
      const d = snap.data() || {};
      vuesLe = ms(d.notifsVuesLe as Timestamp | undefined);
      pagesVues = new Set((d.pagesVues as string[] | undefined) || []);
      publier();
    }, () => {}),

    onSnapshot(query(collection(base, 'dms'), where('participantUids', 'array-contains', uid)), (snap) => {
      nonLus = 0;
      messages = [];
      snap.docs.forEach((d) => {
        const t = d.data();
        const n = Number((t.unread as Record<string, number> | undefined)?.[uid] || 0);
        if (n <= 0) return;
        nonLus += n;
        const autre = ((t.participantUids as string[]) || []).find((x) => x !== uid) || '';
        const nom = (t.participantNames as Record<string, string> | undefined)?.[autre] || (t.names as Record<string, string> | undefined)?.[autre] || '';
        messages.push({
          id: `dm-${d.id}`, genre: 'message', quand: ms(t.lastMessageAt as Timestamp | undefined),
          titre: {
            FR: nom ? `${n > 1 ? `${n} messages` : 'Un message'} de ${nom}` : `${n > 1 ? `${n} nouveaux messages` : 'Un nouveau message'}`,
            EN: nom ? `${n > 1 ? `${n} messages` : 'A message'} from ${nom}` : `${n > 1 ? `${n} new messages` : 'A new message'}`,
          },
          lien: { FR: `/messages/${autre}`, EN: `/en/messages/${autre}` },
        });
      });
      publier();
    }, () => {}),

    onSnapshot(query(collection(base, 'amities'), where('paire', 'array-contains', uid)), (snap) => {
      amities = snap.docs
        .map((d) => d.data())
        .filter((a) => a.statut === 'demande' && a.de !== uid)
        .map((a) => ({
          id: `amitie-${a.de}`, genre: 'amitie' as const, quand: ms(a.maj as Timestamp | undefined),
          titre: { FR: 'Quelqu’un vous demande en ami', EN: 'Someone sent you a friend request' },
          lien: { FR: `/profil/${a.de}`, EN: `/en/profile/${a.de}` },
        }));
      publier();
    }, () => {}),

    // Les parties : un défi reçu, puis chaque fois que c'est à moi de
    // jouer (Alex, 2026-08-27 : tour par tour, la personne est prévenue).
    onSnapshot(query(collection(base, 'taflParties'), where('joueurs', 'array-contains', uid)), (snap) => {
      parties = [];
      snap.docs.forEach((d) => {
        const p = d.data();
        const autre = ((p.joueurs as string[]) || []).find((x) => x !== uid) || '';
        const nom = (p.noms as Record<string, string> | undefined)?.[autre] || '';
        // La collection porte les trois jeux de plateau : le nom et le
        // lien de la cloche suivent celui de la partie.
        const j = JEUX_DEFIABLES[jeuDe(p as { jeu?: JeuDefi })];
        const lien = { FR: `${j.cheminFR}?partie=${d.id}`, EN: `${j.cheminEN}?partie=${d.id}` };
        const quand = ms(p.updatedAt as Timestamp | undefined);
        if (p.statut === 'defi' && p.lancePar !== uid) {
          parties.push({ id: `defi-${d.id}`, genre: 'defi', quand, lien,
            titre: { FR: `${nom || 'Quelqu’un'} vous défie ${j.auFR}`, EN: `${nom || 'Someone'} challenges you at ${j.nomEN}` } });
        } else if (p.statut === 'encours' && (p.camps as Record<string, string> | undefined)?.[String(p.tour)] === uid) {
          parties.push({ id: `tour-${d.id}`, genre: 'tour', quand, lien,
            titre: { FR: `À vous de jouer contre ${nom || '—'} (${j.nomFR})`, EN: `Your move against ${nom || '—'} (${j.nomEN})` } });
        }
      });
      publier();
    }, () => {}),

    onSnapshot(query(collection(base, 'desParties'), where('joueurs', 'array-contains', uid)), (snap) => {
      partiesDes = [];
      snap.docs.forEach((d) => {
        const p = d.data();
        const autre = ((p.joueurs as string[]) || []).find((x) => x !== uid) || '';
        const nom = (p.noms as Record<string, string> | undefined)?.[autre] || '';
        if (p.statut === 'defi' && p.lancePar !== uid) {
          partiesDes.push({ id: `defi-des-${d.id}`, genre: 'defi', quand: ms(p.updatedAt as Timestamp | undefined),
            lien: { FR: `/jeux/des?partie=${d.id}`, EN: `/en/games/dice?partie=${d.id}` },
            titre: { FR: `${nom || 'Quelqu’un'} vous défie aux dés`, EN: `${nom || 'Someone'} challenges you at dice` } });
        }
      });
      publier();
    }, () => {}),

    onSnapshot(doc(base, 'badges', uid), (snap) => {
      badgesObtenus = (snap.data()?.obtenus as Record<string, Timestamp | null>) || {};
      publier();
    }, () => {}),

    subscribeSiteFlags((flags) => {
      flagsOk = PILLAR_PUBLISH_FLAGS.filter((p) => isPillarPublished(flags, p.key)).map((p) => p.key);
      publier();
    }),
  ];

  // Mes guildes se lisent une fois à l'ouverture de la cloche; une
  // guilde rejointe pendant la visite sonnera à la prochaine.
  // ponytail: lecture unique, passer à un onSnapshot sur `membres`
  // array-contains si le décalage se remarque.
  void listerMesGuildes(uid).then((guildes) => {
    if (!vivant) return;
    for (const g of guildes) {
      for (const s of SOURCES_CLAN) {
        const cle = `${g.id}/${s.col}`;
        clan.set(cle, { guilde: g, source: s, quand: [] });
        arrets.push(onSnapshot(
          query(collection(base, 'guildes', g.id, s.col), orderBy('creeLe', 'desc'), fbLimit(40)),
          (snap) => {
            const entree = clan.get(cle);
            if (!entree) return;
            entree.quand = snap.docs
              .map((d) => d.data())
              .filter((x) => x[s.auteur] !== uid)
              .map((x) => ms(x.creeLe as Timestamp | undefined));
            publier();
          },
          () => {},
        ));
      }
    }
  }).catch(() => { /* hors ligne, ou aucune guilde */ });

  return () => { vivant = false; arrets.forEach((stop) => stop()); };
}

/** La personne a ouvert la cloche : les badges et les pages en cours
 *  s'effacent du compte; les messages et les amitiés restent tant
 *  qu'ils ne sont pas traités. */
export async function marquerNotifsVues(uid: string, pages: string[]): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'membres', uid), { notifsVuesLe: serverTimestamp(), pagesVues: pages }, { merge: true });
}
