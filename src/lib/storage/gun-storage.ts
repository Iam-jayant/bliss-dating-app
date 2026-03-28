/**
 * Gun.js decentralized storage (bliss_v3 schema)
 * - Local cache is the offline source for fast reads
 * - Gun.js syncs signed/encrypted events across peers
 */

import { BLISS_V3_KEYS } from '@/lib/storage/schema';
import type { ProfileData } from '@/lib/storage/types';
import { verifyCanonicalPayload } from '@/lib/security/local-identity';

let gunInstance: any = null;
let gunLoadPromise: Promise<any> | null = null;
let profilesSubscribed = false;
let actionsSubscribed = false;
let matchesSubscribed = false;

export const PROFILES_UPDATED_EVENT = 'bliss:profiles-updated';

const GUN_PEERS = [
  'https://gun-manhattan.herokuapp.com/gun',
  'https://gun-us.herokuapp.com/gun',
];

function loadGunScript(): Promise<any> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if ((window as any).Gun) return Promise.resolve((window as any).Gun);

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/gun/gun.js';
    script.onload = () => resolve((window as any).Gun);
    script.onerror = () => reject(new Error('Failed to load Gun.js from CDN'));
    document.head.appendChild(script);
  });
}

async function getGun(): Promise<any> {
  if (typeof window === 'undefined') return null;
  if (gunInstance) return gunInstance;

  if (!gunLoadPromise) {
    gunLoadPromise = loadGunScript();
  }

  try {
    const Gun = await gunLoadPromise;
    if (!Gun) return null;
    gunInstance = Gun({ peers: GUN_PEERS, localStorage: true });
    return gunInstance;
  } catch (error) {
    console.warn('Gun.js init failed, using local cache only:', error);
    return null;
  }
}

function getLocalData<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function setLocalData(key: string, data: unknown): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

function emitProfilesUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(PROFILES_UPDATED_EVENT));
}

function upsertById<T extends { id: string }>(items: T[], incoming: T): T[] {
  const idx = items.findIndex((item) => item.id === incoming.id);
  if (idx === -1) return [...items, incoming];
  const next = [...items];
  next[idx] = incoming;
  return next;
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export async function saveProfile(walletHash: string, profile: ProfileData): Promise<void> {
  const profiles = getLocalData<Record<string, ProfileData>>(BLISS_V3_KEYS.profilesByHash, {});
  profiles[walletHash] = profile;
  setLocalData(BLISS_V3_KEYS.profilesByHash, profiles);
  emitProfilesUpdated();

  try {
    const gun = await getGun();
    if (gun) {
      gun.get('bliss_v3').get('profiles').get(walletHash).put(JSON.stringify(profile));
    }
  } catch (error) {
    console.warn('Gun profile sync failed:', error);
  }
}

export function getProfileByHash(walletHash: string): ProfileData | null {
  const profiles = getLocalData<Record<string, ProfileData>>(BLISS_V3_KEYS.profilesByHash, {});
  return profiles[walletHash] || null;
}

export function getAllLocalProfiles(): ProfileData[] {
  const profiles = getLocalData<Record<string, ProfileData>>(BLISS_V3_KEYS.profilesByHash, {});
  return Object.values(profiles);
}

function upsertProfileFromNetwork(raw: string, key: string): void {
  if (!raw || raw === 'null') return;
  try {
    const profile = JSON.parse(raw) as ProfileData;
    const profiles = getLocalData<Record<string, ProfileData>>(BLISS_V3_KEYS.profilesByHash, {});
    const existing = profiles[key];
    const hasNewerTimestamp = Boolean(
      profile.updated_at
      && existing?.updated_at
      && profile.updated_at >= existing.updated_at,
    );
    if (!existing || !existing.updated_at || hasNewerTimestamp) {
      profiles[key] = profile;
      setLocalData(BLISS_V3_KEYS.profilesByHash, profiles);
      emitProfilesUpdated();
    }
  } catch {
    // Ignore malformed network payloads
  }
}

export async function syncProfilesFromNetwork(): Promise<void> {
  try {
    const gun = await getGun();
    if (!gun) return;

    gun.get('bliss_v3').get('profiles').map().once((raw: string, key: string) => {
      upsertProfileFromNetwork(raw, key);
    });
  } catch (error) {
    console.warn('Profile sync failed:', error);
  }
}

async function subscribeProfilesFromNetwork(): Promise<void> {
  if (profilesSubscribed) return;
  const gun = await getGun();
  if (!gun) return;

  profilesSubscribed = true;
  const ref = gun.get('bliss_v3').get('profiles');
  ref.map().on((raw: string, key: string) => {
    upsertProfileFromNetwork(raw, key);
  });
}

// ---------------------------------------------------------------------------
// Matching events
// ---------------------------------------------------------------------------

export interface LikeAction {
  id: string;
  from: string;
  to: string;
  action: 'like' | 'pass' | 'superlike';
  timestamp: number;
  nonce: string;
  signerWalletHash: string;
  onChainReceiptTxId?: string;
  signerPublicKey: string;
  signature: string;
}

export type SignedLikeEvent = LikeAction;

export interface MutualMatch {
  id: string;
  user1: string;
  user2: string;
  timestamp: number;
  nonce: string;
  signerWalletHash: string;
  compatibilityScore: number;
  sharedInterests: string[];
  signerPublicKey: string;
  signature: string;
}

export type SignedMatchEvent = MutualMatch;

async function isValidLikeAction(action: LikeAction): Promise<boolean> {
  if (
    !action?.id
    || !action.from
    || !action.to
    || !action.signerPublicKey
    || !action.signature
    || !action.signerWalletHash
    || !action.nonce
  ) {
    return false;
  }

  if (action.signerWalletHash !== action.from) return false;
  if (!isTimestampAcceptable(action.timestamp)) return false;

  const payload = {
    id: action.id,
    from: action.from,
    to: action.to,
    action: action.action,
    timestamp: action.timestamp,
    nonce: action.nonce,
    signerWalletHash: action.signerWalletHash,
    ...(action.onChainReceiptTxId ? { onChainReceiptTxId: action.onChainReceiptTxId } : {}),
  };

  const isValidSignature = await verifyCanonicalPayload(action.signerPublicKey, payload, action.signature);
  if (!isValidSignature) return false;
  return consumeNonce(action.signerWalletHash, action.nonce);
}

async function isValidMutualMatch(match: MutualMatch): Promise<boolean> {
  if (
    !match?.id
    || !match.user1
    || !match.user2
    || !match.signerPublicKey
    || !match.signature
    || !match.signerWalletHash
    || !match.nonce
  ) {
    return false;
  }

  if (match.signerWalletHash !== match.user1 && match.signerWalletHash !== match.user2) return false;
  if (!isTimestampAcceptable(match.timestamp)) return false;

  const payload = {
    id: match.id,
    user1: match.user1,
    user2: match.user2,
    timestamp: match.timestamp,
    nonce: match.nonce,
    signerWalletHash: match.signerWalletHash,
    compatibilityScore: match.compatibilityScore,
    sharedInterests: match.sharedInterests,
  };

  const isValidSignature = await verifyCanonicalPayload(match.signerPublicKey, payload, match.signature);
  if (!isValidSignature) return false;
  return consumeNonce(match.signerWalletHash, match.nonce);
}

async function syncActionFromNetwork(raw: string): Promise<void> {
  if (!raw || raw === 'null') return;
  try {
    const incoming = JSON.parse(raw) as LikeAction;
    const valid = await isValidLikeAction(incoming);
    if (!valid) return;

    if (incoming.action === 'pass') {
      const passes = getLocalData<LikeAction[]>(BLISS_V3_KEYS.passes, []);
      setLocalData(BLISS_V3_KEYS.passes, upsertById(passes, incoming));
      return;
    }

    const likes = getLocalData<LikeAction[]>(BLISS_V3_KEYS.likes, []);
    setLocalData(BLISS_V3_KEYS.likes, upsertById(likes, incoming));
  } catch {
    // Ignore malformed/untrusted network payloads
  }
}

async function syncMatchFromNetwork(raw: string): Promise<void> {
  if (!raw || raw === 'null') return;
  try {
    const incoming = JSON.parse(raw) as MutualMatch;
    const valid = await isValidMutualMatch(incoming);
    if (!valid) return;

    const matches = getLocalData<MutualMatch[]>(BLISS_V3_KEYS.matches, []);
    const exists = matches.some((match) => (
      (match.user1 === incoming.user1 && match.user2 === incoming.user2)
      || (match.user1 === incoming.user2 && match.user2 === incoming.user1)
    ));
    if (!exists) {
      setLocalData(BLISS_V3_KEYS.matches, [...matches, incoming]);
    }
  } catch {
    // Ignore malformed/untrusted network payloads
  }
}

async function subscribeActionsFromNetwork(): Promise<void> {
  if (actionsSubscribed) return;
  const gun = await getGun();
  if (!gun) return;

  actionsSubscribed = true;
  const ref = gun.get('bliss_v3').get('actions');
  ref.map().on((raw: string) => {
    void syncActionFromNetwork(raw);
  });
}

async function subscribeMatchesFromNetwork(): Promise<void> {
  if (matchesSubscribed) return;
  const gun = await getGun();
  if (!gun) return;

  matchesSubscribed = true;
  const ref = gun.get('bliss_v3').get('matches');
  ref.map().on((raw: string) => {
    void syncMatchFromNetwork(raw);
  });
}

export async function saveLikeAction(action: LikeAction): Promise<void> {
  if (!(await isValidLikeAction(action))) {
    throw new Error('Rejected like/pass action with invalid signature.');
  }

  if (action.action === 'pass') {
    const passes = getLocalData<LikeAction[]>(BLISS_V3_KEYS.passes, []);
    setLocalData(BLISS_V3_KEYS.passes, upsertById(passes, action));
  } else {
    const likes = getLocalData<LikeAction[]>(BLISS_V3_KEYS.likes, []);
    setLocalData(BLISS_V3_KEYS.likes, upsertById(likes, action));
  }

  try {
    const gun = await getGun();
    if (gun) {
      gun.get('bliss_v3').get('actions').get(action.id).put(JSON.stringify(action));
    }
  } catch (error) {
    console.warn('Like/pass sync failed:', error);
  }
}

export function getLikeActions(): LikeAction[] {
  return getLocalData<LikeAction[]>(BLISS_V3_KEYS.likes, []);
}

export function getPassActions(): LikeAction[] {
  return getLocalData<LikeAction[]>(BLISS_V3_KEYS.passes, []);
}

export async function saveMutualMatch(match: MutualMatch): Promise<void> {
  if (!(await isValidMutualMatch(match))) {
    throw new Error('Rejected mutual match with invalid signature.');
  }

  const matches = getLocalData<MutualMatch[]>(BLISS_V3_KEYS.matches, []);
  const exists = matches.some((m) => (m.user1 === match.user1 && m.user2 === match.user2)
    || (m.user1 === match.user2 && m.user2 === match.user1));
  if (!exists) {
    setLocalData(BLISS_V3_KEYS.matches, [...matches, match]);
  }

  try {
    const gun = await getGun();
    if (gun) {
      gun.get('bliss_v3').get('matches').get(match.id).put(JSON.stringify(match));
    }
  } catch (error) {
    console.warn('Match sync failed:', error);
  }
}

export function getUserMatchesFromStorage(walletHash: string): MutualMatch[] {
  const matches = getLocalData<MutualMatch[]>(BLISS_V3_KEYS.matches, []);
  return matches.filter((m) => m.user1 === walletHash || m.user2 === walletHash);
}

export function getAllMatchesFromStorage(): MutualMatch[] {
  return getLocalData<MutualMatch[]>(BLISS_V3_KEYS.matches, []);
}

// ---------------------------------------------------------------------------
// Encrypted chat storage
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  senderId: string;
  recipientId: string;
  content: string; // encrypted payload (base64)
  timestamp: number;
  nonce: string;
  signerWalletHash: string;
  encrypted: true;
  read: boolean;
  iv: string;
  senderEncryptedKey: string;
  recipientEncryptedKey: string;
  signerPublicKey: string;
  signature: string;
}

export type EncryptedMessageEnvelope = ChatMessage;

const NONCE_CACHE_PREFIX = 'bliss_v3_seen_nonces_';
const MAX_NONCES_PER_SIGNER = 1000;
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;

function nonceCacheKey(signerWalletHash: string): string {
  return `${NONCE_CACHE_PREFIX}${signerWalletHash}`;
}

function consumeNonce(signerWalletHash: string, nonce: string): boolean {
  if (typeof window === 'undefined') return true;
  const key = nonceCacheKey(signerWalletHash);
  const seen = getLocalData<string[]>(key, []);
  if (seen.includes(nonce)) return false;
  const next = [...seen, nonce].slice(-MAX_NONCES_PER_SIGNER);
  setLocalData(key, next);
  return true;
}

function isTimestampAcceptable(timestamp: number): boolean {
  const now = Date.now();
  return timestamp <= now + MAX_FUTURE_CLOCK_SKEW_MS;
}

async function isValidChatMessage(message: ChatMessage): Promise<boolean> {
  if (
    !message?.id
    || !message.signerPublicKey
    || !message.signature
    || !message.signerWalletHash
    || !message.nonce
  ) return false;

  if (message.signerWalletHash !== message.senderId) return false;
  if (!isTimestampAcceptable(message.timestamp)) return false;

  const payload = {
    id: message.id,
    senderId: message.senderId,
    recipientId: message.recipientId,
    content: message.content,
    timestamp: message.timestamp,
    nonce: message.nonce,
    signerWalletHash: message.signerWalletHash,
    encrypted: message.encrypted,
    read: message.read,
    iv: message.iv,
    senderEncryptedKey: message.senderEncryptedKey,
    recipientEncryptedKey: message.recipientEncryptedKey,
  };

  const isValidSignature = await verifyCanonicalPayload(message.signerPublicKey, payload, message.signature);
  if (!isValidSignature) return false;
  return consumeNonce(message.signerWalletHash, message.nonce);
}

export function getChatStorageKey(user1: string, user2: string): string {
  return `${BLISS_V3_KEYS.messagesPrefix}${[user1, user2].sort().join('_')}`;
}

export async function saveMessage(message: ChatMessage): Promise<void> {
  if (!(await isValidChatMessage(message))) {
    throw new Error('Rejected chat message with invalid signature.');
  }

  const chatKey = getChatStorageKey(message.senderId, message.recipientId);
  const existing = getLocalData<ChatMessage[]>(chatKey, []);
  const updated = upsertById(existing, message).sort((a, b) => a.timestamp - b.timestamp);
  setLocalData(chatKey, updated);

  try {
    const gun = await getGun();
    if (gun) {
      gun.get('bliss_v3').get('chats').get(chatKey).get(message.id).put(JSON.stringify(message));
    }
  } catch (error) {
    console.warn('Message sync failed:', error);
  }
}

export function getChatMessages(user1: string, user2: string): ChatMessage[] {
  const chatKey = getChatStorageKey(user1, user2);
  return getLocalData<ChatMessage[]>(chatKey, []).sort((a, b) => a.timestamp - b.timestamp);
}

export function markMessagesRead(user1: string, user2: string, readerHash: string): void {
  const chatKey = getChatStorageKey(user1, user2);
  const messages = getLocalData<ChatMessage[]>(chatKey, []);
  const updated = messages.map((message) => (
    message.recipientId === readerHash ? { ...message, read: true } : message
  ));
  setLocalData(chatKey, updated);
}

export async function subscribeToChat(
  user1: string,
  user2: string,
  onMessage: (message: ChatMessage) => void,
): Promise<() => void> {
  try {
    const gun = await getGun();
    if (!gun) return () => {};

    const chatKey = getChatStorageKey(user1, user2);
    const ref = gun.get('bliss_v3').get('chats').get(chatKey);

    ref.map().on((raw: string) => {
      if (!raw || raw === 'null') return;
      void (async () => {
        try {
          const incoming = JSON.parse(raw) as ChatMessage;
          const valid = await isValidChatMessage(incoming);
          if (!valid) return;

          const messages = getLocalData<ChatMessage[]>(chatKey, []);
          const updated = upsertById(messages, incoming).sort((a, b) => a.timestamp - b.timestamp);
          setLocalData(chatKey, updated);
          onMessage(incoming);
        } catch {
          // Ignore malformed/untrusted network payloads
        }
      })();
    });

    return () => {
      ref.off();
    };
  } catch {
    return () => {};
  }
}

export async function initializeStorage(): Promise<void> {
  await getGun();
  await syncProfilesFromNetwork();
  await subscribeProfilesFromNetwork();
  await subscribeActionsFromNetwork();
  await subscribeMatchesFromNetwork();
}
