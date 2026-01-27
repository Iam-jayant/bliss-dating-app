/**
 * TypeScript types for Supabase profile data
 */

/**
 * Bio prompt types for structured bio responses
 */
export type BioPromptType = 
  | "Two truths and a lie"
  | "The one thing people get wrong about me"
  | "My perfect Sunday"
  | "What makes me unique";

/**
 * Dating intent options
 */
export type DatingIntent = 
  | "Long-term"
  | "Short-term"
  | "Friends"
  | "Open to explore";

/**
 * Complete profile data structure
 * Stored in Supabase profiles table
 */
export interface ProfileData {
  wallet_hash: string;          // SHA256(lowercase(wallet_address)) - Primary key
  name: string;                 // Max 50 chars
  profile_image_path?: string;  // Storage path: {wallet_hash}/profile.jpg
  bio: string;                  // Max 200 chars
  bio_prompt_type: BioPromptType;
  interests: string[];          // Min 1, Max 4
  dating_intent: DatingIntent;
  is_verified: boolean;         // Default true
  created_at?: string;          // ISO timestamp
  updated_at?: string;          // ISO timestamp
}

/**
 * Profile creation input (excludes auto-generated fields)
 */
export type ProfileCreateInput = Omit<ProfileData, 'wallet_hash' | 'created_at' | 'updated_at' | 'is_verified'>;

/**
 * Profile update input (all fields optional except wallet_hash)
 */
export type ProfileUpdateInput = Partial<Omit<ProfileData, 'wallet_hash' | 'created_at'>>;
