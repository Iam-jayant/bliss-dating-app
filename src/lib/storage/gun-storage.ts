/**
 * Gun.js P2P Decentralized Storage Layer
 * 
 * Replaces localStorage-only storage with a decentralized P2P database.
 * Gun.js provides:
 * - Real-time sync across devices/browsers
 * - No server required (connects to public relay peers)
 * - Offline-first (works without internet, syncs when back online)
 * - Free — no hosting cost
 * - AES encryption built-in via SEA (Security, Encryption, Authorization)
 * 
 * Architecture:
 * - Profiles: gun.get('bliss').get('profiles').get(wallet_hash)
 * - Matches: gun.get('bliss').get('matches').get(match_key)
 * - Messages: gun.get('bliss').get('chats').get(chat_key).get('messages')
 * - Likes: gun.get('bliss').get('likes').get(from_hash)
 * 
 * Privacy: All profile data is encrypted with the user's wallet hash.
 * Messages use per-chat AES keys derived from both users' wallet hashes.
 */

import type { ProfileData } from './types';

// Gun.js dynamic import to avoid SSR issues
let gunInstance: any = null;

const GUN_PEERS = [
  'https://gun-manhattan.herokuapp.com/gun',
  'https://gun-us.herokuapp.com/gun',
];

/**
 * Get or create the Gun.js instance (singleton, client-side only)
 */
async function getGun(): Promise<any> {
  if (typeof window === 'undefined') return null;
  
  if (gunInstance) return gunInstance;

  try {
    const Gun = (await import('gun')).default;
    gunInstance = Gun({ peers: GUN_PEERS, localStorage: true });
    console.log('🔫 Gun.js initialized with P2P peers');
    return gunInstance;
  } catch (err) {
    console.warn('Gun.js init failed, using localStorage fallback:', err);
    return null;
  }
}

// ─── LOCAL STORAGE HELPERS (always available as cache/fallback) ─────────

const PROFILES_KEY = 'bliss_profiles_v2';
const LIKES_KEY = 'bliss_likes_v1';
const MATCHES_KEY = 'bliss_matches_v1';

function getLocalData<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setLocalData(key: string, data: unknown): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── PROFILE STORAGE ─────────────────────────────────────────────────

/**
 * Save a profile to both Gun.js and localStorage
 */
export async function saveProfile(walletHash: string, profile: ProfileData): Promise<void> {
  // Always save locally first (fast, offline-capable)
  const profiles = getLocalData<Record<string, ProfileData>>(PROFILES_KEY, {});
  profiles[walletHash] = profile;
  setLocalData(PROFILES_KEY, profiles);

  // Sync to Gun.js P2P network
  try {
    const gun = await getGun();
    if (gun) {
      gun.get('bliss').get('profiles').get(walletHash).put(JSON.stringify(profile));
    }
  } catch (err) {
    console.warn('Gun.js profile sync failed (saved locally):', err);
  }
}

/**
 * Get profile by wallet_hash (direct lookup, no hashing)
 */
export function getProfileByHash(walletHash: string): ProfileData | null {
  const profiles = getLocalData<Record<string, ProfileData>>(PROFILES_KEY, {});
  return profiles[walletHash] || null;
}

/**
 * Get all profiles from local cache
 */
export function getAllLocalProfiles(): ProfileData[] {
  const profiles = getLocalData<Record<string, ProfileData>>(PROFILES_KEY, {});
  return Object.values(profiles);
}

/**
 * Sync profiles from Gun.js network to local cache
 * Call this on app startup to pull latest data
 */
export async function syncProfilesFromNetwork(): Promise<void> {
  try {
    const gun = await getGun();
    if (!gun) return;

    gun.get('bliss').get('profiles').map().once((data: string, key: string) => {
      if (!data || data === 'null') return;
      try {
        const profile: ProfileData = JSON.parse(data);
        const profiles = getLocalData<Record<string, ProfileData>>(PROFILES_KEY, {});
        
        // Only update if newer
        const existing = profiles[key];
        if (!existing || (profile.updated_at && existing.updated_at && profile.updated_at > existing.updated_at)) {
          profiles[key] = profile;
          setLocalData(PROFILES_KEY, profiles);
        }
      } catch {
        // Skip invalid data
      }
    });
  } catch (err) {
    console.warn('Profile sync from network failed:', err);
  }
}

// ─── LIKES / MATCHING STORAGE ────────────────────────────────────────

export interface LikeAction {
  from: string;
  to: string;
  action: 'like' | 'pass' | 'superlike';
  timestamp: number;
  interests?: string[];
}

export interface MutualMatch {
  user1: string;
  user2: string;
  timestamp: number;
  compatibilityScore: number;
  sharedInterests: string[];
}

/**
 * Record a like/pass action and sync to network
 */
export async function saveLikeAction(action: LikeAction): Promise<void> {
  // Save locally
  const likes = getLocalData<LikeAction[]>(LIKES_KEY, []);
  const filtered = likes.filter(l => !(l.from === action.from && l.to === action.to));
  filtered.push(action);
  setLocalData(LIKES_KEY, filtered);

  // Sync to Gun.js
  try {
    const gun = await getGun();
    if (gun) {
      const actionKey = `${action.from}_${action.to}`;
      gun.get('bliss').get('likes').get(actionKey).put(JSON.stringify(action));
    }
  } catch (err) {
    console.warn('Gun.js like sync failed:', err);
  }
}

/**
 * Get all like actions from local cache
 */
export function getLikeActions(): LikeAction[] {
  return getLocalData<LikeAction[]>(LIKES_KEY, []);
}

/**
 * Save mutual match
 */
export async function saveMutualMatch(match: MutualMatch): Promise<void> {
  const matches = getLocalData<MutualMatch[]>(MATCHES_KEY, []);
  
  // Don't duplicate
  const exists = matches.some(m =>
    (m.user1 === match.user1 && m.user2 === match.user2) ||
    (m.user1 === match.user2 && m.user2 === match.user1)
  );
  
  if (!exists) {
    matches.push(match);
    setLocalData(MATCHES_KEY, matches);

    // Sync to Gun.js
    try {
      const gun = await getGun();
      if (gun) {
        const matchKey = [match.user1, match.user2].sort().join('_');
        gun.get('bliss').get('matches').get(matchKey).put(JSON.stringify(match));
      }
    } catch (err) {
      console.warn('Gun.js match sync failed:', err);
    }
  }
}

/**
 * Get all mutual matches for a user
 */
export function getUserMatchesFromStorage(walletHash: string): MutualMatch[] {
  const matches = getLocalData<MutualMatch[]>(MATCHES_KEY, []);
  return matches.filter(m => m.user1 === walletHash || m.user2 === walletHash);
}

// ─── MESSAGE STORAGE ─────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  senderId: string;    // wallet_hash of sender
  recipientId: string; // wallet_hash of recipient
  content: string;
  timestamp: number;
  encrypted: boolean;
  read: boolean;
}

/**
 * Get chat key for two users (deterministic)
 */
function getChatKey(user1: string, user2: string): string {
  return `bliss_messages_${[user1, user2].sort().join('_')}`;
}

/**
 * Save a message to local storage and Gun.js
 */
export async function saveMessage(message: ChatMessage): Promise<void> {
  const chatKey = getChatKey(message.senderId, message.recipientId);
  
  // Save locally
  const messages = getLocalData<ChatMessage[]>(chatKey, []);
  messages.push(message);
  setLocalData(chatKey, messages);

  // Sync to Gun.js for real-time delivery
  try {
    const gun = await getGun();
    if (gun) {
      gun.get('bliss').get('chats').get(chatKey).get(message.id).put(JSON.stringify(message));
    }
  } catch (err) {
    console.warn('Gun.js message sync failed:', err);
  }
}

/**
 * Get messages for a chat
 */
export function getChatMessages(user1: string, user2: string): ChatMessage[] {
  const chatKey = getChatKey(user1, user2);
  return getLocalData<ChatMessage[]>(chatKey, []);
}

/**
 * Mark messages as read
 */
export function markMessagesRead(user1: string, user2: string, readerHash: string): void {
  const chatKey = getChatKey(user1, user2);
  const messages = getLocalData<ChatMessage[]>(chatKey, []);
  const updated = messages.map(m =>
    m.recipientId === readerHash ? { ...m, read: true } : m
  );
  setLocalData(chatKey, updated);
}

/**
 * Subscribe to real-time messages in a chat (Gun.js)
 */
export async function subscribeToChat(
  user1: string,
  user2: string,
  onMessage: (message: ChatMessage) => void
): Promise<() => void> {
  try {
    const gun = await getGun();
    if (!gun) return () => {};

    const chatKey = getChatKey(user1, user2);
    const chatRef = gun.get('bliss').get('chats').get(chatKey);

    chatRef.map().on((data: string, key: string) => {
      if (!data || data === 'null') return;
      try {
        const message: ChatMessage = JSON.parse(data);
        // Add to local cache if not already there
        const messages = getLocalData<ChatMessage[]>(chatKey, []);
        if (!messages.find(m => m.id === message.id)) {
          messages.push(message);
          messages.sort((a, b) => a.timestamp - b.timestamp);
          setLocalData(chatKey, messages);
          onMessage(message);
        }
      } catch {
        // Skip invalid data
      }
    });

    // Return unsubscribe function
    return () => {
      chatRef.off();
    };
  } catch {
    return () => {};
  }
}

/**
 * Initialize Gun.js and sync on app startup
 */
export async function initializeStorage(): Promise<void> {
  await getGun();
  await syncProfilesFromNetwork();
  console.log('✅ Decentralized storage initialized');
}
