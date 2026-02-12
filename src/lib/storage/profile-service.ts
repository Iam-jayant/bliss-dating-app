/**
 * Profile Service - Replaces Supabase profile operations
 * Uses on-chain Aleo records + IPFS for decentralized storage
 */

import { pinataStorage, type ProfileData } from './pinata-storage';
import { AleoProfileService, aleoProfileService } from '../aleo/profile-service';

export interface ProfileCreateInput {
  name: string;
  bio: string;
  bioPromptType: string;
  interests: string[];
  datingIntent: string;
  profileImage: File;
}

export interface ProfileRecord {
  walletAddress: string;
  dataCid: string;
  imageCid: string;
  interests: number[]; // Interest indices for on-chain matching
  datingIntent: number; // Intent index
  locationGeohash: number;
  isVerified: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Convert interest strings to bitfield for on-chain storage
 */
const INTEREST_MAP: { [key: string]: number } = {
  Travel: 0,
  Fitness: 1,
  Music: 2,
  Art: 3,
  Food: 4,
  Tech: 5,
  Books: 6,
  Outdoors: 7,
};

const DATING_INTENT_MAP: { [key: string]: number } = {
  'Long-term': 0,
  'Short-term': 1,
  Friends: 2,
  'Open to explore': 3,
};

function interestsToBitfield(interests: string[]): number {
  return interests.reduce((bitfield, interest) => {
    const bit = INTEREST_MAP[interest];
    return bitfield | (1 << bit);
  }, 0);
}

function bitfieldToInterests(bitfield: number): string[] {
  const interests: string[] = [];
  Object.entries(INTEREST_MAP).forEach(([name, bit]) => {
    if (bitfield & (1 << bit)) {
      interests.push(name);
    }
  });
  return interests;
}

export class ProfileService {
  private aleoService: AleoProfileService;

  constructor() {
    this.aleoService = aleoProfileService;
  }

  /**
   * Create profile: Upload to IPFS + Create on-chain record
   */
  async createProfile(
    walletAddress: string,
    walletSignature: string,
    profileData: ProfileCreateInput,
    locationGeohash: number
  ): Promise<ProfileRecord> {
    // 1. Upload profile image to IPFS
    const imageCid = await pinataStorage.uploadImage(profileData.profileImage, walletAddress);

    // 2. Prepare profile data for IPFS
    const ipfsProfileData: ProfileData = {
      name: profileData.name,
      bio: profileData.bio,
      bioPromptType: profileData.bioPromptType,
      interests: profileData.interests,
      datingIntent: profileData.datingIntent,
      profileImageCid: imageCid,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // 3. Encrypt and upload profile data to IPFS
    const dataCid = await pinataStorage.storeProfile(ipfsProfileData, walletAddress, walletSignature);

    // 4. Convert interests to bitfield
    const interestsBitfield = interestsToBitfield(profileData.interests);
    const intentIndex = DATING_INTENT_MAP[profileData.datingIntent] || 0;

    // 5. Create on-chain profile record via Leo contract
    // This calls bliss_profile_verification.aleo::create_profile
    const profileCidField = this.cidToField(dataCid);
    
    await this.aleoService.createProfileOnChain(
      walletAddress,
      interestsBitfield,
      intentIndex,
      locationGeohash,
      profileCidField
    );

    // 6. Return profile record
    return {
      walletAddress,
      dataCid,
      imageCid,
      interests: profileData.interests.map(i => INTEREST_MAP[i]),
      datingIntent: intentIndex,
      locationGeohash,
      isVerified: true,
      createdAt: ipfsProfileData.createdAt,
      updatedAt: ipfsProfileData.updatedAt,
    };
  }

  /**
   * Get profile by wallet address
   */
  async getProfile(
    walletAddress: string,
    walletSignature: string
  ): Promise<ProfileData | null> {
    try {
      // 1. Get profile CID from on-chain record
      const profileCid = await this.aleoService.getProfileCid(walletAddress);
      
      if (!profileCid) return null;

      // 2. Fetch and decrypt from IPFS
      const profile = await pinataStorage.retrieveProfile(profileCid, walletAddress, walletSignature);

      return profile;
    } catch (error) {
      console.error('Failed to get profile:', error);
      return null;
    }
  }

  /**
   * Update profile
   */
  async updateProfile(
    walletAddress: string,
    walletSignature: string,
    updates: Partial<ProfileCreateInput>,
    locationGeohash?: number
  ): Promise<ProfileRecord> {
    // 1. Get existing profile
    const existingProfile = await this.getProfile(walletAddress, walletSignature);
    if (!existingProfile) throw new Error('Profile not found');

    // 2. Merge updates
    const updatedProfileData: ProfileData = {
      ...existingProfile,
      ...updates,
      updatedAt: Date.now(),
    };

    // 3. Upload new image if provided
    if (updates.profileImage) {
      const newImageCid = await pinataStorage.uploadImage(updates.profileImage, walletAddress);
      updatedProfileData.profileImageCid = newImageCid;
    }

    // 4. Encrypt and upload updated data
    const dataCid = await pinataStorage.storeProfile(updatedProfileData, walletAddress, walletSignature);

    // 5. Update on-chain record
    const interestsBitfield = interestsToBitfield(updatedProfileData.interests);
    const intentIndex = DATING_INTENT_MAP[updatedProfileData.datingIntent] || 0;
    const profileCidField = this.cidToField(dataCid);

    await this.aleoService.updateProfileOnChain(
      walletAddress,
      interestsBitfield,
      intentIndex,
      locationGeohash || 0,
      profileCidField
    );

    return {
      walletAddress,
      dataCid: dataCid,
      imageCid: updatedProfileData.profileImageCid || '',
      interests: updatedProfileData.interests.map(i => INTEREST_MAP[i]),
      datingIntent: intentIndex,
      locationGeohash: locationGeohash || 0,
      isVerified: true,
      createdAt: existingProfile.createdAt,
      updatedAt: updatedProfileData.updatedAt,
    };
  }

  /**
   * Check if profile exists for wallet
   */
  async profileExists(walletAddress: string): Promise<boolean> {
    const cid = await this.aleoService.getProfileCid(walletAddress);
    return cid !== null;
  }

  /**
   * Get profile image URL
   */
  getImageUrl(imageCid: string): string {
    return pinataStorage.getImageUrl(imageCid);
  }

  /**
   * Convert IPFS CID to Aleo field element
   * CIDs are base58 encoded, we need to convert to field
   */
  private cidToField(cid: string): bigint {
    // Simplified: Hash the CID to get a field element
    // In production, use proper CID to field conversion
    const encoder = new TextEncoder();
    const data = encoder.encode(cid);
    
    // Create a simple hash (in production, use proper hash function)
    let hash = 0n;
    for (let i = 0; i < Math.min(data.length, 31); i++) {
      hash = (hash << 8n) | BigInt(data[i]);
    }
    
    return hash;
  }

  /**
   * Discover nearby profiles (for matching)
   * Returns wallet addresses of nearby users
   */
  async discoverNearbyProfiles(
    userGeohash: number,
    maxDistance: number = 50000 // ~50km
  ): Promise<string[]> {
    // Query on-chain location_zones mapping
    return await this.aleoService.getNearbyUsers(userGeohash, maxDistance);
  }
}

// Export singleton
export const profileService = new ProfileService();
