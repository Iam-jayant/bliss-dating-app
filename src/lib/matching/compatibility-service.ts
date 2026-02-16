/**
 * Real Compatibility Matching Service
 * Calculates compatibility scores based on interests and dating intent
 * NO MOCK/SIMULATION - Uses actual profile data
 */

import type { ProfileData } from '../supabase/types';

// Interest categories mapping (same as in contract)
const INTEREST_MAP: { [key: string]: number } = {
  'Coffee': 0,
  'Hiking': 1,
  'Photography': 2,
  'Cooking': 3,
  'Travel': 4,
  'Music': 5,
  'Yoga': 6,
  'Reading': 7,
  'Fitness': 8,
  'Art': 9,
  'Gaming': 10,
  'Dancing': 11,
  'Movies': 12,
  'Surfing': 13,
  'Cycling': 14,
  'Food': 15,
  'Tech': 16,
  'Fashion': 17,
  'Writing': 18,
  'Sports': 19,
  'Meditation': 20,
  'Nature': 21,
  'Concerts': 22,
  'Theater': 23,
};

/**
 * Convert interests array to bitfield
 */
export function interestsToBitfield(interests: string[]): number {
  return interests.reduce((bitfield, interest) => {
    const bit = INTEREST_MAP[interest];
    return bit !== undefined ? bitfield | (1 << bit) : bitfield;
  }, 0);
}

/**
 * Count shared interests between two profiles
 */
export function countSharedInterests(profile1: ProfileData, profile2: ProfileData): number {
  const shared = profile1.interests.filter(interest => 
    profile2.interests.includes(interest)
  );
  return shared.length;
}

/**
 * Get shared interests list
 */
export function getSharedInterests(profile1: ProfileData, profile2: ProfileData): string[] {
  return profile1.interests.filter(interest => 
    profile2.interests.includes(interest)
  );
}

/**
 * Calculate compatibility score based on shared interests
 * Following the logic from compatibility_matching contract
 * 4+ shared: 100%
 * 3 shared: 75%
 * 2 shared: 50%
 * 1 shared: 25%
 * 0 shared: 0%
 */
export function calculateCompatibilityScore(profile1: ProfileData, profile2: ProfileData): number {
  const sharedCount = countSharedInterests(profile1, profile2);
  
  if (sharedCount >= 4) return 100;
  if (sharedCount === 3) return 75;
  if (sharedCount === 2) return 50;
  if (sharedCount === 1) return 25;
  return 0;
}

/**
 * Check if dating intents are compatible
 */
export function areIntentsCompatible(intent1: string, intent2: string): boolean {
  // "Open to explore" is compatible with everything
  if (intent1 === 'Open to explore' || intent2 === 'Open to explore') {
    return true;
  }
  
  // "Friends" is compatible with everything except "Short-term" only
  if (intent1 === 'Friends' && intent2 === 'Short-term') return true;
  if (intent2 === 'Friends' && intent1 === 'Short-term') return true;
  if (intent1 === 'Friends' || intent2 === 'Friends') return true;
  
  // "Long-term" and "Short-term" are somewhat compatible
  if ((intent1 === 'Long-term' && intent2 === 'Short-term') ||
      (intent1 === 'Short-term' && intent2 === 'Long-term')) {
    return true; // They can still match, but it's noted
  }
  
  // Same intents are always compatible
  return intent1 === intent2;
}

/**
 * Calculate enhanced compatibility with intent weighting
 * Returns score from 0-100
 */
export function calculateEnhancedCompatibility(
  currentUser: ProfileData, 
  targetProfile: ProfileData
): {
  score: number;
  sharedInterests: string[];
  sharedCount: number;
  intentCompatible: boolean;
} {
  const sharedInterests = getSharedInterests(currentUser, targetProfile);
  const sharedCount = sharedInterests.length;
  const intentCompatible = areIntentsCompatible(
    currentUser.dating_intent, 
    targetProfile.dating_intent
  );
  
  // Base score from interests
  let score = calculateCompatibilityScore(currentUser, targetProfile);
  
  // Adjust based on intent compatibility
  if (!intentCompatible) {
    score = Math.floor(score * 0.7); // 30% penalty for incompatible intents
  } else if (currentUser.dating_intent === targetProfile.dating_intent && 
             currentUser.dating_intent !== 'Open to explore') {
    score = Math.min(100, score + 10); // +10 bonus for exact intent match
  }
  
  return {
    score,
    sharedInterests,
    sharedCount,
    intentCompatible,
  };
}

/**
 * Match storage in localStorage (real matching, not simulation)
 */
const MATCHES_KEY = 'bliss_matches_v1';
const LIKES_KEY = 'bliss_likes_v1';

interface MatchAction {
  from: string;
  to: string;
  action: 'like' | 'pass' | 'superlike';
  timestamp: number;
  interests?: string[];
}

interface MutualMatch {
  user1: string;
  user2: string;
  timestamp: number;
  compatibilityScore: number;
  sharedInterests: string[];
}

/**
 * Get all likes/passes from storage
 */
function getLikes(): MatchAction[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LIKES_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Save likes/passes
 */
function saveLikes(likes: MatchAction[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LIKES_KEY, JSON.stringify(likes));
}

/**
 * Get all mutual matches
 */
function getMatches(): MutualMatch[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(MATCHES_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Save mutual matches
 */
function saveMatches(matches: MutualMatch[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
}

/**
 * Record a like action (real, stored locally)
 */
export function recordLike(
  fromWallet: string, 
  toWallet: string, 
  interests: string[]
): void {
  const likes = getLikes();
  
  // Remove any existing action from this user to target
  const filtered = likes.filter(like => 
    !(like.from === fromWallet && like.to === toWallet)
  );
  
  filtered.push({
    from: fromWallet,
    to: toWallet,
    action: 'like',
    timestamp: Date.now(),
    interests,
  });
  
  saveLikes(filtered);
  console.log(`💗 Like recorded: ${fromWallet.slice(0, 8)} → ${toWallet.slice(0, 8)}`);
}

/**
 * Record a pass action (real, stored locally)
 */
export function recordPass(
  fromWallet: string, 
  toWallet: string
): void {
  const likes = getLikes();
  
  // Remove any existing action from this user to target
  const filtered = likes.filter(like => 
    !(like.from === fromWallet && like.to === toWallet)
  );
  
  filtered.push({
    from: fromWallet,
    to: toWallet,
    action: 'pass',
    timestamp: Date.now(),
  });
  
  saveLikes(filtered);
  console.log(`👎 Pass recorded: ${fromWallet.slice(0, 8)} → ${toWallet.slice(0, 8)}`);
}

/**
 * Check if there's a mutual match (REAL CHECK, NOT RANDOM)
 */
export function checkMutualMatch(
  fromWallet: string,
  toWallet: string,
  fromProfile: ProfileData,
  toProfile: ProfileData
): boolean {
  const likes = getLikes();
  
  // Check if I liked them
  const myLike = likes.find(like => 
    like.from === fromWallet && 
    like.to === toWallet && 
    like.action === 'like'
  );
  
  // Check if they liked me
  const theirLike = likes.find(like => 
    like.from === toWallet && 
    like.to === fromWallet && 
    like.action === 'like'
  );
  
  if (myLike && theirLike) {
    // It's a mutual match! Create match record
    const compatibility = calculateEnhancedCompatibility(fromProfile, toProfile);
    
    const matches = getMatches();
    
    // Check if match already exists
    const existingMatch = matches.find(m => 
      (m.user1 === fromWallet && m.user2 === toWallet) ||
      (m.user1 === toWallet && m.user2 === fromWallet)
    );
    
    if (!existingMatch) {
      matches.push({
        user1: fromWallet,
        user2: toWallet,
        timestamp: Date.now(),
        compatibilityScore: compatibility.score,
        sharedInterests: compatibility.sharedInterests,
      });
      saveMatches(matches);
      console.log(`🎉 MUTUAL MATCH: ${fromWallet.slice(0, 8)} ↔ ${toWallet.slice(0, 8)} (${compatibility.score}% compatible)`);
    }
    
    return true;
  }
  
  return false;
}

/**
 * Get all matches for a user
 */
export function getUserMatches(walletAddress: string): MutualMatch[] {
  const matches = getMatches();
  return matches.filter(m => 
    m.user1 === walletAddress || m.user2 === walletAddress
  );
}

/**
 * Get mutual match wallet addresses for a user
 */
export function getMutualMatches(walletAddress: string): string[] {
  const matches = getUserMatches(walletAddress);
  return matches.map(m => 
    m.user1 === walletAddress ? m.user2 : m.user1
  );
}

/**
 * Get match count for stats
 */
export function getMatchCount(walletAddress: string): number {
  return getUserMatches(walletAddress).length;
}

/**
 * Check if user has already acted on a profile
 */
export function hasActedOn(fromWallet: string, toWallet: string): boolean {
  const likes = getLikes();
  return likes.some(like => 
    like.from === fromWallet && like.to === toWallet
  );
}

/**
 * Get user's action on a specific profile
 */
export function getActionOn(fromWallet: string, toWallet: string): 'like' | 'pass' | 'superlike' | null {
  const likes = getLikes();
  const action = likes.find(like => 
    like.from === fromWallet && like.to === toWallet
  );
  return action?.action || null;
}

/**
 * Clear all matching data (for testing/reset)
 */
export function clearMatchingData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(MATCHES_KEY);
  localStorage.removeItem(LIKES_KEY);
  console.log('🗑️ All matching data cleared');
}
