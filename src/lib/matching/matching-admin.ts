/**
 * Matching Admin Utilities
 * Debug helper for local development.
 */

import {
  clearMatchingData,
  getMatchCount,
  getUserMatches,
} from './compatibility-service';
import { getAllMatchesFromStorage, getLikeActions, getPassActions } from '@/lib/storage/gun-storage';

function summarizeActions() {
  const likes = getLikeActions();
  const passes = getPassActions();
  return {
    likes,
    passes,
    likeCount: likes.length,
    passCount: passes.length,
  };
}

export function showMatchingStats() {
  const { likeCount, passCount } = summarizeActions();
  const matches = getAllMatchesFromStorage();
  const totalActions = likeCount + passCount;
  const matchRate = totalActions > 0 ? (matches.length / totalActions) * 100 : 0;

  console.log('\nBliss Matching Statistics');
  console.log('-------------------------');
  console.log(`Total likes: ${likeCount}`);
  console.log(`Total passes: ${passCount}`);
  console.log(`Mutual matches: ${matches.length}`);
  console.log(`Match rate: ${matchRate.toFixed(1)}%`);
  console.log('-------------------------\n');

  return {
    likes: likeCount,
    passes: passCount,
    matches: matches.length,
    matchRate,
  };
}

export function listAllMatches() {
  const matches = getAllMatchesFromStorage();

  console.log(`\nMutual Matches (${matches.length})`);
  console.log('-------------------------');
  matches.forEach((match, index) => {
    const date = new Date(match.timestamp).toLocaleString();
    console.log(`Match ${index + 1}`);
    console.log(`  user1: ${match.user1}`);
    console.log(`  user2: ${match.user2}`);
    console.log(`  compatibility: ${match.compatibilityScore}%`);
    console.log(`  shared interests: ${match.sharedInterests.join(', ') || 'none'}`);
    console.log(`  matched at: ${date}`);
  });
  console.log('-------------------------\n');

  return matches;
}

export function listUserLikes(walletHash: string) {
  const likes = getLikeActions();
  const passes = getPassActions();

  const sentLikes = likes.filter((entry) => entry.from === walletHash);
  const sentPasses = passes.filter((entry) => entry.from === walletHash);
  const receivedLikes = likes.filter((entry) => entry.to === walletHash);

  console.log(`\nLikes for ${walletHash}`);
  console.log('-------------------------');
  console.log(`Sent likes: ${sentLikes.length}`);
  console.log(`Sent passes: ${sentPasses.length}`);
  console.log(`Received likes: ${receivedLikes.length}`);
  console.log(`Mutual matches: ${getMatchCount(walletHash)}`);
  console.log('-------------------------\n');

  return {
    sentLikes,
    sentPasses,
    receivedLikes,
    matches: getUserMatches(walletHash),
  };
}

export function matchingHelp() {
  console.log(`
Bliss Matching Commands:
-------------------------
blissMatching.showMatchingStats()  - Show overall stats
blissMatching.listAllMatches()     - List all mutual matches
blissMatching.listUserLikes(hash)  - Show likes for a specific user
blissMatching.clearMatchingData()  - Clear all matching data
blissMatching.matchingHelp()       - Show this help
-------------------------
`);
}

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).blissMatching = {
    showMatchingStats,
    listAllMatches,
    listUserLikes,
    clearMatchingData,
    matchingHelp,
  };

  console.log('Bliss matching helpers loaded. Run blissMatching.matchingHelp() for commands.');
}

export { clearMatchingData };
