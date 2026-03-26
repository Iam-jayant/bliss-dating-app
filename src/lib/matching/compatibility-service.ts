import type { ProfileData } from '@/lib/storage/types';
import {
  getAllMatchesFromStorage,
  getLikeActions,
  getPassActions,
  getUserMatchesFromStorage,
  saveLikeAction,
  saveMutualMatch,
  type LikeAction,
  type MutualMatch,
} from '@/lib/storage/gun-storage';
import { getPublicIdentity, signCanonicalPayload } from '@/lib/security/local-identity';
import { BLISS_V3_KEYS } from '@/lib/storage/schema';

const INTEREST_MAP: Record<string, number> = {
  Coffee: 0,
  Hiking: 1,
  Photography: 2,
  Cooking: 3,
  Travel: 4,
  Music: 5,
  Yoga: 6,
  Reading: 7,
  Fitness: 8,
  Art: 9,
  Gaming: 10,
  Dancing: 11,
  Movies: 12,
  Surfing: 13,
  Cycling: 14,
  Food: 15,
  Tech: 16,
  Fashion: 17,
  Writing: 18,
  Sports: 19,
  Meditation: 20,
  Nature: 21,
  Concerts: 22,
  Theater: 23,
};

function toIntent(intent: string): 'long_term' | 'short_term' | 'casual' | 'friendship' | 'not_sure' {
  const normalized = intent.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  if (normalized === 'long_term') return 'long_term';
  if (normalized === 'short_term') return 'short_term';
  if (normalized === 'casual') return 'casual';
  if (normalized === 'friends' || normalized === 'friendship') return 'friendship';
  return 'not_sure';
}

export function interestsToBitfield(interests: string[]): number {
  return interests.reduce((bitfield, interest) => {
    const bit = INTEREST_MAP[interest];
    return bit !== undefined ? bitfield | (1 << bit) : bitfield;
  }, 0);
}

export function countSharedInterests(profile1: ProfileData, profile2: ProfileData): number {
  return profile1.interests.filter((interest) => profile2.interests.includes(interest)).length;
}

export function getSharedInterests(profile1: ProfileData, profile2: ProfileData): string[] {
  return profile1.interests.filter((interest) => profile2.interests.includes(interest));
}

export function calculateCompatibilityScore(profile1: ProfileData, profile2: ProfileData): number {
  const sharedCount = countSharedInterests(profile1, profile2);
  if (sharedCount >= 4) return 100;
  if (sharedCount === 3) return 75;
  if (sharedCount === 2) return 50;
  if (sharedCount === 1) return 25;
  return 0;
}

export function areIntentsCompatible(intent1: string, intent2: string): boolean {
  const a = toIntent(intent1);
  const b = toIntent(intent2);
  if (a === 'not_sure' || b === 'not_sure') return true;
  if (a === 'friendship' || b === 'friendship') return true;
  if ((a === 'long_term' && b === 'short_term') || (a === 'short_term' && b === 'long_term')) return true;
  return a === b;
}

export function calculateEnhancedCompatibility(
  currentUser: ProfileData,
  targetProfile: ProfileData,
): {
  score: number;
  sharedInterests: string[];
  sharedCount: number;
  intentCompatible: boolean;
} {
  const sharedInterests = getSharedInterests(currentUser, targetProfile);
  const sharedCount = sharedInterests.length;
  const intentCompatible = areIntentsCompatible(currentUser.dating_intent, targetProfile.dating_intent);
  let score = calculateCompatibilityScore(currentUser, targetProfile);

  if (!intentCompatible) {
    score = Math.floor(score * 0.7);
  } else if (toIntent(currentUser.dating_intent) === toIntent(targetProfile.dating_intent)
    && toIntent(currentUser.dating_intent) !== 'not_sure') {
    score = Math.min(100, score + 10);
  }

  return { score, sharedInterests, sharedCount, intentCompatible };
}

async function buildSignedAction(
  fromWalletHash: string,
  toWalletHash: string,
  action: LikeAction['action'],
  onChainReceiptTxId?: string,
): Promise<LikeAction> {
  const nonce = `${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  const base: Omit<LikeAction, 'signerPublicKey' | 'signature'> = {
    id: `${fromWalletHash}_${toWalletHash}_${action}_${Date.now()}`,
    from: fromWalletHash,
    to: toWalletHash,
    action,
    timestamp: Date.now(),
    nonce,
    signerWalletHash: fromWalletHash,
    ...(onChainReceiptTxId ? { onChainReceiptTxId } : {}),
  };

  const signature = await signCanonicalPayload(fromWalletHash, base);
  const identity = await getPublicIdentity(fromWalletHash);
  return {
    ...base,
    signerPublicKey: identity.signingPublicKey,
    signature,
  };
}

export async function recordLike(
  fromWalletHash: string,
  toWalletHash: string,
  isSuperLike = false,
  onChainReceiptTxId?: string,
): Promise<void> {
  const action = await buildSignedAction(
    fromWalletHash,
    toWalletHash,
    isSuperLike ? 'superlike' : 'like',
    onChainReceiptTxId,
  );
  await saveLikeAction(action);
}

export async function recordPass(
  fromWalletHash: string,
  toWalletHash: string,
  onChainReceiptTxId?: string,
): Promise<void> {
  const action = await buildSignedAction(fromWalletHash, toWalletHash, 'pass', onChainReceiptTxId);
  await saveLikeAction(action);
}

function findLike(fromWallet: string, toWallet: string): LikeAction | undefined {
  return getLikeActions().find(
    (entry) => entry.from === fromWallet && entry.to === toWallet && (entry.action === 'like' || entry.action === 'superlike'),
  );
}

function hasMutualRecord(userA: string, userB: string): boolean {
  return getAllMatchesFromStorage().some((match) => (
    (match.user1 === userA && match.user2 === userB) || (match.user1 === userB && match.user2 === userA)
  ));
}

export async function checkMutualMatch(
  fromWallet: string,
  toWallet: string,
  fromProfile: ProfileData,
  toProfile: ProfileData,
): Promise<boolean> {
  const myLike = findLike(fromWallet, toWallet);
  const theirLike = findLike(toWallet, fromWallet);
  if (!myLike || !theirLike) return false;
  if (hasMutualRecord(fromWallet, toWallet)) return true;

  const compatibility = calculateEnhancedCompatibility(fromProfile, toProfile);
  const nonce = `${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  const baseMatch = {
    id: [fromWallet, toWallet].sort().join('_'),
    user1: fromWallet,
    user2: toWallet,
    timestamp: Date.now(),
    nonce,
    signerWalletHash: fromWallet,
    compatibilityScore: compatibility.score,
    sharedInterests: compatibility.sharedInterests,
  };
  const signature = await signCanonicalPayload(fromWallet, baseMatch);
  const identity = await getPublicIdentity(fromWallet);
  const signedMatch: MutualMatch = {
    ...baseMatch,
    signerPublicKey: identity.signingPublicKey,
    signature,
  };

  await saveMutualMatch(signedMatch);
  return true;
}

export function getUserMatches(walletHash: string): MutualMatch[] {
  return getUserMatchesFromStorage(walletHash);
}

export function getMutualMatches(walletHash: string): string[] {
  return getUserMatches(walletHash).map((match) => (match.user1 === walletHash ? match.user2 : match.user1));
}

export function getMatchCount(walletHash: string): number {
  return getUserMatches(walletHash).length;
}

export function hasActedOn(fromWalletHash: string, toWalletHash: string): boolean {
  return getLikeActions().some((action) => action.from === fromWalletHash && action.to === toWalletHash)
    || getPassActions().some((action) => action.from === fromWalletHash && action.to === toWalletHash);
}

export function getActionOn(
  fromWalletHash: string,
  toWalletHash: string,
): 'like' | 'pass' | 'superlike' | null {
  const like = getLikeActions().find((action) => action.from === fromWalletHash && action.to === toWalletHash);
  if (like) return like.action;
  const pass = getPassActions().find((action) => action.from === fromWalletHash && action.to === toWalletHash);
  return pass?.action || null;
}

export function getLikesReceived(userWalletHash: string): LikeAction[] {
  return getLikeActions().filter((like) => like.to === userWalletHash);
}

export function clearMatchingData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(BLISS_V3_KEYS.likes);
  localStorage.removeItem(BLISS_V3_KEYS.matches);
  localStorage.removeItem(BLISS_V3_KEYS.passes);
}
