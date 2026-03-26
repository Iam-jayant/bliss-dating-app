/**
 * Core types for local storage profile management
 */

/**
 * Bio prompt types available in the app
 */
export type BioPromptType =
  | 'interests'
  | 'passion'
  | 'weekend'
  | 'perfect_day'
  | 'fun_fact'
  | 'looking_for'
  | 'dealbreaker'
  | 'superpower';

/**
 * Dating intent options
 */
export type DatingIntent =
  | 'long_term'
  | 'short_term'
  | 'casual'
  | 'friendship'
  | 'not_sure';

/**
 * Base profile data structure
 */
export interface ProfileData {
  wallet_hash: string;
  wallet_address: string;
  name: string;
  age: number;
  bio: string;
  bio_prompt_type: BioPromptType;
  interests: string[];
  dating_intent: DatingIntent;
  profile_image_path: string;
  additional_images: string[];
  signing_public_key?: string;
  messaging_public_key?: string;
  profile_visibility?: 'discoverable' | 'hidden';
  location_geohash?: string;
  location_name?: string;
  compatibility_score?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Publicly discoverable profile card payload.
 * This payload is designed for discovery/matching surfaces.
 */
export interface ProfileCardPublic {
  wallet_hash: string;
  name: string;
  bio: string;
  bio_prompt_type: BioPromptType;
  interests: string[];
  dating_intent: DatingIntent;
  profile_image_path: string;
  additional_images: string[];
  signing_public_key?: string;
  messaging_public_key?: string;
  profile_visibility?: 'discoverable' | 'hidden';
  location_name?: string;
  compatibility_score?: number;
  updated_at?: string;
}

/**
 * Sensitive profile payload intended for encrypted/private storage.
 */
export interface ProfilePrivatePayload {
  wallet_hash: string;
  wallet_address: string;
  age: number;
  location_geohash?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Profile update type (all fields optional except wallet identifiers)
 */
export type ProfileUpdate = Partial<ProfileData> & {
  walletHash?: string;
  walletAddress?: string;
  createdAt?: string;
  updatedAt?: string;
};
