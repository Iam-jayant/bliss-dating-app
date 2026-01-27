/**
 * Supabase profile management
 * Handles profile CRUD operations with wallet-based identity
 */

import { supabase } from './client';
import { hashWalletAddress } from '../wallet-hash';
import type { ProfileData, ProfileCreateInput } from './types';

/**
 * Create a new profile
 * @param walletAddress - Raw wallet address (will be hashed)
 * @param profileData - Profile data to create
 * @throws Error if profile already exists or creation fails
 */
export async function createProfile(
  walletAddress: string,
  profileData: ProfileCreateInput
): Promise<void> {
  const walletHash = await hashWalletAddress(walletAddress);
  
  const { error } = await supabase
    .from('profiles')
    .insert({
      wallet_hash: walletHash,
      ...profileData,
      is_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  
  if (error) {
    // Handle duplicate profile (unique constraint violation)
    if (error.code === '23505') {
      throw new Error('Profile already exists');
    }
    console.error('Profile creation error:', error);
    throw new Error('Failed to create profile');
  }
}

/**
 * Get profile by wallet address
 * @param walletAddress - Raw wallet address (will be hashed)
 * @returns Profile data or null if not found
 */
export async function getProfile(walletAddress: string): Promise<ProfileData | null> {
  const walletHash = await hashWalletAddress(walletAddress);
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('wallet_hash', walletHash)
    .single();
  
  // PGRST116 = no rows returned (not an error, just no profile)
  if (error && error.code !== 'PGRST116') {
    console.error('Profile fetch error:', error);
    throw new Error('Failed to fetch profile');
  }
  
  return data;
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
  
  const { error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('wallet_hash', walletHash);
  
  if (error) {
    console.error('Profile update error:', error);
    throw new Error('Failed to update profile');
  }
}

/**
 * Upload profile image to Supabase Storage
 * @param file - Image file to upload
 * @param walletAddress - Raw wallet address (will be hashed)
 * @returns Storage path
 * @throws Error if upload fails
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
  
  const walletHash = await hashWalletAddress(walletAddress);
  const path = `${walletHash}/profile.jpg`;
  
  const { error } = await supabase.storage
    .from('profile-images')
    .upload(path, file, {
      upsert: true, // Overwrite existing image
      contentType: file.type,
    });
  
  if (error) {
    console.error('Image upload error:', error);
    throw new Error('Upload failed. Please try again.');
  }
  
  return path;
}

/**
 * Get public URL for profile image
 * @param path - Storage path from profile_image_path field
 * @returns Public URL for the image
 */
export function getProfileImageUrl(path: string): string {
  const { data } = supabase.storage
    .from('profile-images')
    .getPublicUrl(path);
  
  return data.publicUrl;
}

// Legacy functions for backward compatibility
// These maintain the old interface while using the new implementation

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
  // For backward compatibility, just log - actual profile creation happens in Step 3
  console.log('Legacy createSupabaseProfile called:', profileData);
}

/**
 * @deprecated Use getProfile instead
 */
export async function getProfileByWallet(walletAddress: string): Promise<any> {
  return getProfile(walletAddress);
}
