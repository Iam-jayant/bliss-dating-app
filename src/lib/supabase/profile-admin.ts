/**
 * Admin utilities for profile management
 * Use these functions in browser console to inspect/manage profiles
 */

import { getAllProfiles, getUserCount, getProfileStats, exportProfileData } from './profile';
import { seedMockProfiles, clearMockProfiles, getMockProfiles } from './mock-profiles';
import '../matching/matching-admin'; // Auto-load matching commands

/**
 * Print all profiles to console
 */
export function listAllProfiles() {
  const profiles = getAllProfiles();
  console.log(`📊 Total Profiles: ${profiles.length}\n`);
  
  profiles.forEach((profile, index) => {
    console.log(`\n👤 Profile ${index + 1}:`);
    console.log(`  Name: ${profile.name}`);
    console.log(`  Bio: ${profile.bio?.substring(0, 50)}${profile.bio && profile.bio.length > 50 ? '...' : ''}`);
    console.log(`  Interests: ${profile.interests?.join(', ')}`);
    console.log(`  Dating Intent: ${profile.dating_intent}`);
    console.log(`  Verified: ${profile.is_verified ? '✅' : '❌'}`);
    console.log(`  Has Image: ${profile.profile_image_path ? '✅' : '❌'}`);
    console.log(`  Created: ${profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}`);
    console.log(`  Wallet Hash: ${profile.wallet_hash.substring(0, 16)}...`);
  });
  
  return profiles;
}

/**
 * Show profile statistics
 */
export function showProfileStats() {
  const stats = getProfileStats();
  console.log('📊 Profile Statistics:\n');
  console.log(`  Total Users: ${stats.totalUsers}`);
  console.log(`  Verified Users: ${stats.verifiedUsers}`);
  console.log(`  Users with Images: ${stats.usersWithImages}`);
  console.log(`  Recent Users (7 days): ${stats.recentUsers}`);
  console.log(`  Storage: ${stats.storageLocation}`);
  console.log(`  Storage Key: ${stats.storageKey}`);
  return stats;
}

/**
 * Export profiles as JSON (copy to clipboard if available)
 */
export async function exportProfiles() {
  const data = exportProfileData();
  
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(data);
      console.log('✅ Profile data copied to clipboard!');
    } else {
      console.log('📋 Profile data (copy manually):\n', data);
    }
  } catch (err) {
    console.log('📋 Profile data (copy manually):\n', data);
  }
  
  return data;
}

/**
 * Get localStorage storage info
 */
export function getStorageInfo() {
  if (typeof window === 'undefined') {
    return 'Not in browser environment';
  }
  
  const profilesData = localStorage.getItem('bliss_profiles_v2');
  const profilesSize = profilesData ? new Blob([profilesData]).size : 0;
  
  // Get all bliss-related keys
  const allKeys = Object.keys(localStorage).filter(key => key.startsWith('bliss'));
  
  let totalSize = 0;
  const keyInfo: Record<string, number> = {};
  
  allKeys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      const size = new Blob([value]).size;
      keyInfo[key] = size;
      totalSize += size;
    }
  });
  
  console.log('💾 LocalStorage Info:\n');
  console.log(`  Total Bliss Keys: ${allKeys.length}`);
  console.log(`  Total Size: ${(totalSize / 1024).toFixed(2)} KB`);
  console.log(`  Profiles Size: ${(profilesSize / 1024).toFixed(2)} KB`);
  console.log('\n📝 Breakdown:');
  
  Object.entries(keyInfo)
    .sort((a, b) => b[1] - a[1])
    .forEach(([key, size]) => {
      console.log(`  ${key}: ${(size / 1024).toFixed(2)} KB`);
    });
  
  return {
    totalKeys: allKeys.length,
    totalSizeKB: (totalSize / 1024).toFixed(2),
    profilesSizeKB: (profilesSize / 1024).toFixed(2),
    keys: keyInfo,
  };
}

/**
 * Quick command reference
 */
export function help() {
  console.log(`
🔧 Bliss Profile Admin Commands:
─────────────────────────────────────────────
Import commands first:
  import * as admin from '@/lib/supabase/profile-admin';

Available commands:
  admin.listAllProfiles()    - List all user profiles
  admin.showProfileStats()   - Show profile statistics  
  admin.exportProfiles()     - Export all profiles as JSON
  admin.getStorageInfo()     - Show localStorage usage
  admin.seedMockProfiles(10) - Add 10 mock profiles
  admin.clearMockProfiles()  - Remove all mock profiles
  admin.help()               - Show this help message

Matching commands (blissMatching):
  blissMatching.showMatchingStats()  - Show matching statistics
  blissMatching.listAllMatches()     - List all mutual matches
  blissMatching.matchingHelp()       - Show matching help

Direct access in console:
  localStorage.getItem('bliss_profiles_v2')
  ─────────────────────────────────────────────
  `);
}

// Make functions available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).blissAdmin = {
    listAllProfiles,
    showProfileStats,
    seedMockProfiles,
    clearMockProfiles,
    getMockProfiles,
    help,
  };
  console.log('🔧 Bliss Admin loaded. Type "blissAdmin.help()" for commands');
}

// Export mock profile functions
export { seedMockProfiles, clearMockProfiles, getMockProfiles };
