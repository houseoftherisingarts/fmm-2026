// Discord account linking — Firestore layer.
// Extends the `users/{uid}` document with Discord identity fields.
// OAuth flow lives in DiscordConnect.tsx — this file is pure data.
//
// Firestore shape (merged into the user doc):
//   discordId:       string          — Discord snowflake ID
//   discordUsername: string          — e.g. "floki_fmm" (modern format)
//   discordAvatar:   string | null   — CDN hash; null = default avatar
//   discordLinkedAt: Timestamp

import {
  doc, updateDoc, getDoc, getDocs, collection,
  serverTimestamp, deleteField, query, where,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

// ─── Types ──────────────────────────────────────────────────────────

export interface DiscordProfile {
  discordId:       string;
  discordUsername: string;
  discordAvatar:   string | null;
  discordLinkedAt?: Timestamp;
}

// Full Discord API user object returned by /users/@me
export interface DiscordAPIUser {
  id:            string;
  username:      string;
  discriminator: string;
  avatar:        string | null;
  global_name?:  string | null;
}

// ─── CDN helpers ────────────────────────────────────────────────────

/** Build the CDN URL for a Discord avatar hash. Falls back to the
 *  default avatar URL (based on discriminator mod 5) if hash is null. */
export function discordAvatarUrl(discordId: string, hash: string | null, size = 128): string {
  if (hash) {
    const ext = hash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${discordId}/${hash}.${ext}?size=${size}`;
  }
  // Default avatar — cycles through 5 colours based on user ID.
  const index = (Number(BigInt(discordId) >> 22n)) % 6;
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

/** Display name — prefers global_name, falls back to username. */
export function discordDisplayName(user: DiscordAPIUser): string {
  return user.global_name ?? user.username;
}

// ─── OAuth helpers ──────────────────────────────────────────────────

const DISCORD_SCOPES = 'identify';

/** Build the Discord OAuth2 authorization URL.
 *  Uses the implicit grant so no backend is needed for the token exchange.
 *  The access token comes back in the URL fragment (#access_token=…). */
export function buildDiscordOAuthUrl(clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'token',
    scope:         DISCORD_SCOPES,
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

/** Parse the OAuth callback fragment — returns the access token or null. */
export function parseOAuthFragment(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return params.get('access_token') ?? null;
}

/** Fetch the authenticated Discord user from the API.
 *  Must be called with a valid Bearer token from the OAuth flow. */
export async function fetchDiscordUser(accessToken: string): Promise<DiscordAPIUser> {
  const res = await fetch('https://discord.com/api/v10/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Discord API error: ${res.status}`);
  return res.json() as Promise<DiscordAPIUser>;
}

// ─── Firestore operations ───────────────────────────────────────────

/** Save a Discord profile linked to a Firebase user. */
export async function saveDiscordLink(uid: string, profile: Omit<DiscordProfile, 'discordLinkedAt'>): Promise<void> {
  if (!db) throw new Error('Firestore not initialised');
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, {
    discordId:       profile.discordId,
    discordUsername: profile.discordUsername,
    discordAvatar:   profile.discordAvatar ?? null,
    discordLinkedAt: serverTimestamp(),
  });
}

/** Remove the Discord link from a user's Firestore document. */
export async function removeDiscordLink(uid: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialised');
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, {
    discordId:       deleteField(),
    discordUsername: deleteField(),
    discordAvatar:   deleteField(),
    discordLinkedAt: deleteField(),
  });
}

/** Fetch the Discord profile for a single user. Returns null if not linked. */
export async function getDiscordLink(uid: string): Promise<DiscordProfile | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (!data.discordId) return null;
  return {
    discordId:       String(data.discordId),
    discordUsername: String(data.discordUsername ?? ''),
    discordAvatar:   data.discordAvatar ? String(data.discordAvatar) : null,
    discordLinkedAt: data.discordLinkedAt,
  };
}

/** List all users who have linked a Discord account (for the admin panel). */
export interface LinkedMember {
  uid:             string;
  displayName:     string;
  email:           string;
  discordId:       string;
  discordUsername: string;
  discordAvatar:   string | null;
  discordLinkedAt?: Timestamp;
}

export async function listLinkedMembers(): Promise<LinkedMember[]> {
  if (!db) return [];
  const q = query(collection(db, 'users'), where('discordId', '!=', null));
  const snap = await getDocs(q);
  const results: LinkedMember[] = [];
  for (const d of snap.docs) {
    const data = d.data();
    if (!data.discordId) continue;
    results.push({
      uid:             d.id,
      displayName:     String(data.displayName ?? data.email ?? ''),
      email:           String(data.email ?? ''),
      discordId:       String(data.discordId),
      discordUsername: String(data.discordUsername ?? ''),
      discordAvatar:   data.discordAvatar ? String(data.discordAvatar) : null,
      discordLinkedAt: data.discordLinkedAt,
    });
  }
  return results;
}
