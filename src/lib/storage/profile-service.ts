/**
 * Profile Service
 * - Stores encrypted private payloads on Pinata
 * - Publishes discoverable profile cards in bliss_v3 storage
 * - Optionally writes profile attestations on-chain when wallet execution adapters are provided
 */

import { pinataStorage, type ProfileData as PinataProfileData } from '@/lib/storage/pinata-storage';
import { aleoProfileService, type WalletExecutionAdapter } from '@/lib/aleo/profile-service';
import { createProfile, updateProfile } from '@/lib/storage/profile';
import type { ProfileData } from '@/lib/storage/types';

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
  interestsBitfield: number;
  datingIntentIndex: number;
  locationGeohash: number;
  onChainTxId?: string;
  createdAt: number;
  updatedAt: number;
}

const INTEREST_MAP: Record<string, number> = {
  Travel: 0,
  Fitness: 1,
  Music: 2,
  Art: 3,
  Food: 4,
  Tech: 5,
  Books: 6,
  Outdoors: 7,
};

const DATING_INTENT_MAP: Record<string, number> = {
  long_term: 0,
  short_term: 1,
  friendship: 2,
  not_sure: 3,
  casual: 1,
  'Long-term': 0,
  'Short-term': 1,
  Friends: 2,
  'Open to explore': 3,
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error || 'Unknown wallet error');
}

function interestsToBitfield(interests: string[]): number {
  return interests.reduce((acc, interest) => {
    const bit = INTEREST_MAP[interest];
    return bit !== undefined ? acc | (1 << bit) : acc;
  }, 0);
}

function cidToField(cid: string): bigint {
  const bytes = new TextEncoder().encode(cid);
  let hash = 0n;
  for (let i = 0; i < Math.min(bytes.length, 31); i += 1) {
    hash = (hash << 8n) | BigInt(bytes[i]);
  }
  return hash;
}

export class ProfileService {
  async createProfile(
    walletAddress: string,
    encryptionSecret: string,
    profileData: ProfileCreateInput,
    locationGeohash: number,
    walletAdapter?: WalletExecutionAdapter,
  ): Promise<ProfileRecord> {
    await pinataStorage.initialize();

    const imageCid = await pinataStorage.uploadImage(profileData.profileImage, walletAddress);
    const privatePayload: PinataProfileData = {
      name: profileData.name,
      bio: profileData.bio,
      bioPromptType: profileData.bioPromptType,
      interests: profileData.interests,
      datingIntent: profileData.datingIntent,
      profileImageCid: imageCid,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const dataCid = await pinataStorage.storeProfile(privatePayload, walletAddress, encryptionSecret);

    const intentIndex = DATING_INTENT_MAP[profileData.datingIntent] ?? 3;
    const interestsBitfield = interestsToBitfield(profileData.interests);

    let onChainTxId: string | undefined;
    if (walletAdapter?.requestTransaction && walletAdapter.publicKey) {
      onChainTxId = await aleoProfileService.createProfileOnChain(
        walletAdapter,
        interestsBitfield,
        intentIndex,
        locationGeohash,
        cidToField(dataCid),
      );
    } else {
      throw new Error('Wallet adapter with transaction support is required for profile creation.');
    }

    const publicProfile: Partial<ProfileData> = {
      name: profileData.name,
      bio: profileData.bio,
      bio_prompt_type: profileData.bioPromptType as ProfileData['bio_prompt_type'],
      interests: profileData.interests,
      dating_intent: (profileData.datingIntent as ProfileData['dating_intent']) || 'not_sure',
      profile_image_path: imageCid,
      location_geohash: String(locationGeohash),
    };
    await createProfile(walletAddress, publicProfile);

    return {
      walletAddress,
      dataCid,
      imageCid,
      interestsBitfield,
      datingIntentIndex: intentIndex,
      locationGeohash,
      onChainTxId,
      createdAt: privatePayload.createdAt,
      updatedAt: privatePayload.updatedAt,
    };
  }

  async getProfile(
    walletAddress: string,
    encryptionSecret: string,
    dataCid: string,
  ): Promise<PinataProfileData | null> {
    try {
      await pinataStorage.initialize();
      return await pinataStorage.retrieveProfile(dataCid, walletAddress, encryptionSecret);
    } catch {
      return null;
    }
  }

  async updateProfile(
    walletAddress: string,
    encryptionSecret: string,
    updates: Partial<ProfileCreateInput>,
    locationGeohash: number,
    walletAdapter?: WalletExecutionAdapter,
  ): Promise<ProfileRecord> {
    await pinataStorage.initialize();
    const existingPublic = await (await import('@/lib/storage/profile')).getProfile(walletAddress);
    if (!existingPublic) throw new Error('Profile not found');

    const merged: Partial<ProfileData> = {
      ...existingPublic,
      ...(updates.name ? { name: updates.name } : {}),
      ...(updates.bio ? { bio: updates.bio } : {}),
      ...(updates.bioPromptType ? { bio_prompt_type: updates.bioPromptType as ProfileData['bio_prompt_type'] } : {}),
      ...(updates.interests ? { interests: updates.interests } : {}),
      ...(updates.datingIntent ? { dating_intent: updates.datingIntent as ProfileData['dating_intent'] } : {}),
      location_geohash: String(locationGeohash),
    };

    let imageCid = existingPublic.profile_image_path;
    if (updates.profileImage) {
      imageCid = await pinataStorage.uploadImage(updates.profileImage, walletAddress);
      merged.profile_image_path = imageCid;
    }

    const privatePayload: PinataProfileData = {
      name: merged.name || '',
      bio: merged.bio || '',
      bioPromptType: (merged.bio_prompt_type as string) || 'interests',
      interests: merged.interests || [],
      datingIntent: (merged.dating_intent as string) || 'not_sure',
      profileImageCid: imageCid,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const dataCid = await pinataStorage.storeProfile(privatePayload, walletAddress, encryptionSecret);

    const intentIndex = DATING_INTENT_MAP[privatePayload.datingIntent] ?? 3;
    const interestsBitfield = interestsToBitfield(privatePayload.interests);

    let onChainTxId: string | undefined;
    if (walletAdapter?.requestTransaction && walletAdapter.requestRecords && walletAdapter.publicKey) {
      onChainTxId = await aleoProfileService.updateProfileOnChain(
        walletAdapter,
        interestsBitfield,
        intentIndex,
        locationGeohash,
        cidToField(dataCid),
      );
    } else {
      throw new Error('Wallet adapter with transaction and record access is required for profile updates.');
    }

    await updateProfile(walletAddress, merged);

    return {
      walletAddress,
      dataCid,
      imageCid,
      interestsBitfield,
      datingIntentIndex: intentIndex,
      locationGeohash,
      onChainTxId,
      createdAt: privatePayload.createdAt,
      updatedAt: privatePayload.updatedAt,
    };
  }
}

export const profileService = new ProfileService();
