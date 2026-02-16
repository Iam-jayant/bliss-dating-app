import type { ProfileUpdate, ProfileData } from '@/lib/storage/types';
import { hashWalletAddress } from '@/lib/wallet-hash';

const STORAGE_PREFIX = 'bliss_profile_';
const PROFILES_INDEX_KEY = 'bliss_profiles_index';

/**
 * Get all profiles from localStorage
 */
export async function getAllProfiles(): Promise<ProfileData[]> {
  const indexJson = localStorage.getItem(PROFILES_INDEX_KEY);
  if (!indexJson) return [];
  
  const index: string[] = JSON.parse(indexJson);
  const profiles: ProfileData[] = [];
  
  for (const walletHash of index) {
    const profile = await getProfileByHash(walletHash);
    if (profile) profiles.push(profile);
  }
  
  return profiles;
}

/**
 * Get profile by wallet address
 */
export async function getProfile(walletAddress: string): Promise<ProfileData | null> {
  const walletHash = await hashWalletAddress(walletAddress);
  return getProfileByHash(walletHash);
}

/**
 * Get profile by wallet hash
 */
export async function getProfileByHash(walletHash: string): Promise<ProfileData | null> {
  const key = `${STORAGE_PREFIX}${walletHash}`;
  const profileJson = localStorage.getItem(key);
  
  if (!profileJson) return null;
  
  try {
    return JSON.parse(profileJson);
  } catch {
    return null;
  }
}

/**
 * Get profile image URL from Pinata IPFS
 */
export function getProfileImageUrl(ipfsHash: string): string {
  if (!ipfsHash) return '/placeholder-avatar.jpg';
  
  // If it's already a full URL, return it
  if (ipfsHash.startsWith('http')) return ipfsHash;
  
  // Otherwise construct Pinata gateway URL
  const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud';
  return `https://${gateway}/ipfs/${ipfsHash}`;
}

/**
 * Create or update profile
 */
export async function createProfile(
  walletAddress: string,
  profileData: Partial<ProfileData>
): Promise<ProfileData> {
  const walletHash = await hashWalletAddress(walletAddress);
  
  const profile: ProfileData = {
    wallet_hash: walletHash,
    wallet_address: walletAddress,
    name: profileData.name || '',
    age: profileData.age || 18,
    bio: profileData.bio || '',
    bio_prompt_type: profileData.bio_prompt_type || 'interests',
    interests: profileData.interests || [],
    dating_intent: profileData.dating_intent || 'not_sure',
    profile_image_path: profileData.profile_image_path || '',
    additional_images: profileData.additional_images || [],
    location_geohash: profileData.location_geohash,
    location_name: profileData.location_name,
    compatibility_score: profileData.compatibility_score,
    created_at: profileData.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  // Save profile
  const key = `${STORAGE_PREFIX}${walletHash}`;
  localStorage.setItem(key, JSON.stringify(profile));
  
  // Update index
  const indexJson = localStorage.getItem(PROFILES_INDEX_KEY);
  const index: string[] = indexJson ? JSON.parse(indexJson) : [];
  if (!index.includes(walletHash)) {
    index.push(walletHash);
    localStorage.setItem(PROFILES_INDEX_KEY, JSON.stringify(index));
  }
  
  return profile;
}

/**
 * Alias for createProfile (Supabase compatibility)
 */
export const createSupabaseProfile = createProfile;

/**
 * Update existing profile
 */
export async function updateProfile(
  walletAddress: string,
  updates: Partial<ProfileData>
): Promise<ProfileData> {
  const existing = await getProfile(walletAddress);
  
  if (!existing) {
    return createProfile(walletAddress, updates);
  }
  
  const updated: ProfileData = {
    ...existing,
    ...updates,
    wallet_hash: existing.wallet_hash,
    wallet_address: existing.wallet_address,
    updated_at: new Date().toISOString(),
  };
  
  const key = `${STORAGE_PREFIX}${existing.wallet_hash}`;
  localStorage.setItem(key, JSON.stringify(updated));
  
  return updated;
}

/**
 * Upload profile image to Pinata IPFS
 */
export async function uploadProfileImage(file: File): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
  const apiSecret = process.env.NEXT_PUBLIC_PINATA_SECRET;
  
  if (!apiKey || !apiSecret) {
    throw new Error('Pinata API credentials not configured');
  }
  
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      'pinata_api_key': apiKey,
      'pinata_secret_api_key': apiSecret,
    },
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error('Failed to upload image to Pinata');
  }
  
  const data = await response.json();
  return data.IpfsHash;
}

/**
 * Export profile data for privacy compliance
 */
export async function exportProfileData(walletAddress: string): Promise<string> {
  const profile = await getProfile(walletAddress);
  
  if (!profile) {
    return JSON.stringify({ error: 'Profile not found' }, null, 2);
  }
  
  return JSON.stringify(profile, null, 2);
}

/**
 * Delete profile (for privacy compliance)
 */
export async function deleteProfile(walletAddress: string): Promise<void> {
  const walletHash = await hashWalletAddress(walletAddress);
  const key = `${STORAGE_PREFIX}${walletHash}`;
  
  // Remove profile data
  localStorage.removeItem(key);
  
  // Update index
  const indexJson = localStorage.getItem(PROFILES_INDEX_KEY);
  if (indexJson) {
    const index: string[] = JSON.parse(indexJson);
    const filtered = index.filter(hash => hash !== walletHash);
    localStorage.setItem(PROFILES_INDEX_KEY, JSON.stringify(filtered));
  }
}
