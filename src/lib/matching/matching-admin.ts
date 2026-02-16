/**
 * Matching Admin Utilities
 * View and manage matching data in development
 */

import { 
  getUserMatches, 
  getMatchCount,
  clearMatchingData 
} from './compatibility-service';

const MATCHES_KEY = 'bliss_matches_v1';
const LIKES_KEY = 'bliss_likes_v1';

/**
 * Get all likes/passes from storage
 */
function getAllLikes() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LIKES_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Get all mutual matches
 */
function getAllMatches() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(MATCHES_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Show matching statistics
 */
export function showMatchingStats() {
  const likes: any[] = getAllLikes();
  const matches: any[] = getAllMatches();
  
  const likeActions = likes.filter((l: any) => l.action === 'like').length;
  const passActions = likes.filter((l: any) => l.action === 'pass').length;
  
  console.log('\n💕 Matching Statistics:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Total Likes: ${likeActions}`);
  console.log(`  Total Passes: ${passActions}`);
  console.log(`  Mutual Matches: ${matches.length}`);
  console.log(`  Match Rate: ${likeActions > 0 ? ((matches.length / likeActions) * 100).toFixed(1) : 0}%`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  return {
    likes: likeActions,
    passes: passActions,
    matches: matches.length,
    matchRate: likeActions > 0 ? (matches.length / likeActions) * 100 : 0,
  };
}

/**
 * List all mutual matches with details
 */
export function listAllMatches() {
  const matches: any[] = getAllMatches();
  
  console.log(`\n🎉 All Mutual Matches (${matches.length}):`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  matches.forEach((match: any, index: number) => {
    const date = new Date(match.timestamp).toLocaleString();
    console.log(`\n  Match ${index + 1}:`);
    console.log(`    User 1: ${match.user1.substring(0, 16)}...`);
    console.log(`    User 2: ${match.user2.substring(0, 16)}...`);
    console.log(`    Compatibility: ${match.compatibilityScore}%`);
    console.log(`    Shared Interests: ${match.sharedInterests.join(', ')}`);
    console.log(`    Matched: ${date}`);
  });
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  return matches;
}

/**
 * List all likes for a specific user
 */
export function listUserLikes(walletHash: string) {
  const likes: any[] = getAllLikes();
  const userLikes = likes.filter((l: any) => l.from === walletHash);
  const receivedLikes = likes.filter((l: any) => l.to === walletHash && l.action === 'like');
  
  console.log(`\n💗 Likes for ${walletHash.substring(0, 16)}...`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Sent Likes: ${userLikes.filter((l: any) => l.action === 'like').length}`);
  console.log(`  Sent Passes: ${userLikes.filter((l: any) => l.action === 'pass').length}`);
  console.log(`  Received Likes: ${receivedLikes.length}`);
  console.log(`  Mutual Matches: ${getUserMatches(walletHash).length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  return {
    sent: userLikes,
    received: receivedLikes,
    matches: getUserMatches(walletHash),
  };
}

/**
 * Show help for matching commands
 */
export function matchingHelp() {
  console.log(`
💕 Bliss Matching Commands:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  blissMatching.showMatchingStats()  - Show overall stats
  blissMatching.listAllMatches()     - List all mutual matches
  blissMatching.listUserLikes(hash)  - Show likes for specific user
  blissMatching.clearMatchingData()  - Clear all matching data
  blissMatching.matchingHelp()       - Show this help
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}

// Make functions available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).blissMatching = {
    showMatchingStats,
    listAllMatches,
    listUserLikes,
    clearMatchingData,
    matchingHelp,
  };
  console.log('💕 Bliss Matching loaded. Type "blissMatching.matchingHelp()" for commands');
}

export { clearMatchingData };
