/**
 * Profile management - Decentralized replacement for Supabase
 * Uses localStorage for quick access + Pinata IPFS for persistence
 * Maintains same function signatures for backward compatibility
 */

import { hashWalletAddress } from '../wallet-hash';
import { pinataStorage } from '../storage/pinata-storage';
import type { ProfileData, ProfileCreateInput } from './types';

const PROFILES_KEY = 'bliss_profiles_v2';

/** Get all locally cached profiles */
function getLocalProfiles(): Record<string, ProfileData> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}');
  } catch {
    return {};
  }
}

/** Save profiles to local cache */
function setLocalProfiles(profiles: Record<string, ProfileData>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

/**
 * Create a new profile
 * @param walletAddress - Raw wallet address (will be hashed)
 * @param profileData - Profile data to create
 */
export async function createProfile(
  walletAddress: string,
  profileData: ProfileCreateInput
): Promise<void> {
  const walletHash = await hashWalletAddress(walletAddress);

  const fullProfile: ProfileData = {
    wallet_hash: walletHash,
    ...profileData,
    is_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Store locally for fast access
  const profiles = getLocalProfiles();
  if (profiles[walletHash]) {
    throw new Error('Profile already exists');
  }
  profiles[walletHash] = fullProfile;
  setLocalProfiles(profiles);

  // Also store encrypted on IPFS for persistence
  try {
    await pinataStorage.initialize();
    const cid = await pinataStorage.storeProfile(
      {
        name: fullProfile.name,
        bio: fullProfile.bio,
        bioPromptType: fullProfile.bio_prompt_type,
        interests: fullProfile.interests,
        datingIntent: fullProfile.dating_intent,
        profileImageCid: fullProfile.profile_image_path,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      walletAddress,
      walletHash // Use hash as encryption key for simplicity
    );
    // Store CID mapping
    localStorage.setItem(`bliss_cid_${walletHash}`, cid);
  } catch (err) {
    console.warn('IPFS upload failed (profile saved locally):', err);
  }
}

/**
 * Get profile by wallet address
 * @param walletAddress - Raw wallet address (will be hashed)
 * @returns Profile data or null if not found
 */
export async function getProfile(walletAddress: string): Promise<ProfileData | null> {
  const walletHash = await hashWalletAddress(walletAddress);

  // Check local cache first
  const profiles = getLocalProfiles();
  if (profiles[walletHash]) {
    return profiles[walletHash];
  }

  return null;
}

/**
 * Update user profile
 * @param walletAddress - Raw wallet address (will be hashed)
 * @param updates - Profile updates
 */
export async function updateProfile(
  walletAddress: string,
  updates: Partial<ProfileCreateInput>
): Promise<void> {
  const walletHash = await hashWalletAddress(walletAddress);

  const profiles = getLocalProfiles();
  const existing = profiles[walletHash];
  if (!existing) {
    throw new Error('Profile not found');
  }

  profiles[walletHash] = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  };
  setLocalProfiles(profiles);
}

/**
 * Upload profile image to Pinata IPFS
 * @param file - Image file to upload
 * @param walletAddress - Raw wallet address
 * @returns IPFS CID (used as storage path)
 */
export async function uploadProfileImage(
  file: File,
  walletAddress: string
): Promise<string> {
  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image must be under 5MB');
  }

  // Validate file format
  const validFormats = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validFormats.includes(file.type)) {
    throw new Error('Please upload a jpg, png, or webp image');
  }

  try {
    await pinataStorage.initialize();
    const cid = await pinataStorage.uploadImage(file, walletAddress);
    return cid;
  } catch (err) {
    console.error('Image upload error:', err);
    // Fallback: store as data URL locally
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const walletHash = walletAddress.slice(0, 16);
        localStorage.setItem(`bliss_img_${walletHash}`, dataUrl);
        resolve(`local:${walletHash}`);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

/**
 * Get public URL for profile image
 * @param path - IPFS CID or local path
 * @returns URL for the image
 */
export function getProfileImageUrl(path: string): string {
  if (!path) return '';

  // Handle local fallback paths
  if (path.startsWith('local:')) {
    const key = path.replace('local:', '');
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`bliss_img_${key}`) || '';
    }
    return '';
  }

  // Handle data URLs
  if (path.startsWith('data:')) {
    return path;
  }

  // IPFS CID - use Pinata gateway
  const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud';
  return `https://${gateway}/ipfs/${path}`;
}

// Legacy functions for backward compatibility

/**
 * @deprecated Use createProfile instead
 */
export async function createSupabaseProfile(profileData: {
  wallet_address: string;
  created_at: string;
  onboarding_completed: boolean;
  bio?: string;
  interests?: string[];
}): Promise<void> {
  console.log('Legacy createSupabaseProfile called - using local storage:', profileData.wallet_address.slice(0, 12));
  // Store minimal data for onboarding step tracking
  if (typeof window !== 'undefined') {
    localStorage.setItem(`bliss_onboard_${profileData.wallet_address.slice(0, 16)}`, JSON.stringify({
      created_at: profileData.created_at,
      onboarding_completed: profileData.onboarding_completed,
    }));
  }
}

/**
 * @deprecated Use getProfile instead
 */
export async function getProfileByWallet(walletAddress: string): Promise<ProfileData | null> {
  return getProfile(walletAddress);
}
