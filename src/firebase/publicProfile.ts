// Public-facing profile shape. Built by joining a user's /users/{uid}
// doc with their /benevoles/{uid} doc, then dropping anything the
// person hasn't opted to share publicly. Email, phone, address,
// emergency contact, dietary notes, allergies — all stay private.
//
// Used by the community wall (clickable name → public profile page)
// and by the DM "who am I writing to" header.

import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { type UserProfile, type BenevoleApp, type UserFlag, type BenevoleTeamRole } from './applications';

export interface PublicProfile {
  uid:         string;
  displayName: string;
  pronouns?:   string;
  bio?:        string;
  avatarHue:   number;        // always populated
  avatarUrl?:  string;
  city?:       string;
  flags?:      UserFlag[];    // role tags
  teamId?:     string;
  teamRole?:   BenevoleTeamRole;
  badges?:     string[];
  joinedYear?: number;
  pastYears?:  number[];
  hoursLogged?: number;
  // social links the user agreed to surface (only Instagram + website
  // are public-by-default; phone numbers stay private even if entered).
  socials?:    { instagram?: string; website?: string };
}

export function hueFor(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 360;
}

export async function getPublicProfile(uid: string): Promise<PublicProfile | null> {
  if (!db) return null;
  const [u, b] = await Promise.all([
    getDoc(doc(db, 'users', uid)),
    getDoc(doc(db, 'benevoles', uid)),
  ]);
  if (!u.exists() && !b.exists()) return null;
  const user = (u.exists() ? u.data() as UserProfile : null);
  const ben  = (b.exists() ? b.data() as BenevoleApp : null);
  return composePublicProfile(uid, user, ben);
}

export function composePublicProfile(
  uid: string,
  user: UserProfile | null,
  ben:  BenevoleApp  | null,
): PublicProfile {
  const fullName = ((ben?.prenom || '') + ' ' + (ben?.nom || '')).trim()
                || user?.displayName
                || ben?.displayName
                || 'Anonyme';
  return {
    uid,
    displayName: fullName,
    pronouns:    user?.pronouns,
    bio:         user?.bio,
    avatarHue:   user?.avatarHue ?? hueFor(fullName),
    avatarUrl:   user?.avatarUrl,
    city:        ben?.city,
    flags:       user?.flags,
    teamId:      ben?.teamId,
    teamRole:    ben?.teamRole,
    badges:      ben?.badges,
    joinedYear:  ben?.year,
    pastYears:   ben?.pastYears,
    hoursLogged: ben?.hoursLogged,
    socials:     ben?.socials ? {
      instagram: ben.socials.instagram,
      website:   ben.socials.website,
    } : undefined,
  };
}
