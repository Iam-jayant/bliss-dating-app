import type { ProfileData } from '@/lib/storage/types';
import { hashWalletAddress } from '@/lib/wallet-hash';
import { getAllLocalProfiles, getProfileByHash as getProfileByHashFromStore, saveProfile } from '@/lib/storage/gun-storage';
import { BLISS_V3_KEYS } from '@/lib/storage/schema';
import { getPublicIdentity, signCanonicalPayload } from '@/lib/security/local-identity';

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeIntent(value: unknown): ProfileData['dating_intent'] {
  if (typeof value !== 'string') return 'not_sure';
  const cleaned = value.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  if (cleaned === 'long_term') return 'long_term';
  if (cleaned === 'short_term') return 'short_term';
  if (cleaned === 'friendship' || cleaned === 'friends') return 'friendship';
  if (cleaned === 'casual') return 'casual';
  return 'not_sure';
}

function normalizeBioPrompt(value: unknown): ProfileData['bio_prompt_type'] {
  if (typeof value !== 'string') return 'interests';
  const lowered = value.trim().toLowerCase();
  const map: Record<string, ProfileData['bio_prompt_type']> = {
    interests: 'interests',
    passion: 'passion',
    weekend: 'weekend',
    perfect_day: 'perfect_day',
    fun_fact: 'fun_fact',
    looking_for: 'looking_for',
    dealbreaker: 'dealbreaker',
    superpower: 'superpower',
    'two truths and a lie': 'fun_fact',
    'my perfect sunday': 'perfect_day',
    'what makes me unique': 'superpower',
  };
  return map[lowered] || map[lowered.replace(/\s+/g, '_')] || 'interests';
}

function toRecordMap(): Record<string, ProfileData> {
  if (typeof window === 'undefined') return {};
  return parseJson<Record<string, ProfileData>>(localStorage.getItem(BLISS_V3_KEYS.profilesByHash), {});
}

function setRecordMap(data: Record<string, ProfileData>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BLISS_V3_KEYS.profilesByHash, JSON.stringify(data));
}

export async function getAllProfiles(): Promise<ProfileData[]> {
  return getAllLocalProfiles().filter((profile) => profile.profile_visibility !== 'hidden');
}

export async function getProfile(walletAddress: string): Promise<ProfileData | null> {
  const walletHash = await hashWalletAddress(walletAddress);
  return getProfileByHash(walletHash);
}

export async function getProfileByHash(walletHash: string): Promise<ProfileData | null> {
  return getProfileByHashFromStore(walletHash);
}

export function getProfileImageUrl(ipfsHash: string): string {
  if (!ipfsHash) return '/placeholder-avatar.jpg';
  if (ipfsHash.startsWith('http') || ipfsHash.startsWith('data:') || ipfsHash.startsWith('local:')) return ipfsHash;

  let gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud';
  if (!gateway.includes('.')) gateway = `${gateway}.mypinata.cloud`;
  return `https://${gateway}/ipfs/${ipfsHash}`;
}

export async function createProfile(
  walletAddress: string,
  profileData: Partial<ProfileData>,
): Promise<ProfileData> {
  const walletHash = await hashWalletAddress(walletAddress);
  const now = new Date().toISOString();
  const identity = await getPublicIdentity(walletHash);

  const profile: ProfileData = {
    wallet_hash: walletHash,
    wallet_address: walletAddress,
    name: profileData.name || '',
    age: typeof profileData.age === 'number' ? profileData.age : 18,
    bio: profileData.bio || '',
    bio_prompt_type: normalizeBioPrompt(profileData.bio_prompt_type),
    interests: Array.isArray(profileData.interests) ? profileData.interests : [],
    dating_intent: normalizeIntent(profileData.dating_intent),
    profile_image_path: profileData.profile_image_path || '',
    additional_images: Array.isArray(profileData.additional_images) ? profileData.additional_images : [],
    signing_public_key: identity.signingPublicKey,
    messaging_public_key: identity.messagingPublicKey,
    profile_visibility: profileData.profile_visibility === 'hidden' ? 'hidden' : 'discoverable',
    location_geohash: profileData.location_geohash,
    location_name: profileData.location_name,
    compatibility_score: profileData.compatibility_score,
    created_at: profileData.created_at || now,
    updated_at: now,
  };

  const records = toRecordMap();
  records[walletHash] = profile;
  setRecordMap(records);
  await saveProfile(walletHash, profile);

  return profile;
}

export const createSupabaseProfile = createProfile;

export async function updateProfile(
  walletAddress: string,
  updates: Partial<ProfileData>,
): Promise<ProfileData> {
  const existing = await getProfile(walletAddress);
  if (!existing) return createProfile(walletAddress, updates);

  const updated: ProfileData = {
    ...existing,
    ...updates,
    wallet_hash: existing.wallet_hash,
    wallet_address: existing.wallet_address,
    bio_prompt_type: normalizeBioPrompt(updates.bio_prompt_type ?? existing.bio_prompt_type),
    dating_intent: normalizeIntent(updates.dating_intent ?? existing.dating_intent),
    updated_at: new Date().toISOString(),
  };

  const records = toRecordMap();
  records[existing.wallet_hash] = updated;
  setRecordMap(records);
  await saveProfile(existing.wallet_hash, updated);
  return updated;
}

export async function uploadProfileImage(file: File, walletAddress: string): Promise<string> {
  const walletHash = await hashWalletAddress(walletAddress);
  const nonce = `${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  const timestamp = Date.now();
  const identity = await getPublicIdentity(walletHash);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('owner', walletAddress);
  formData.append('type', 'image');
  const name = `Bliss Image - ${file.name}`;
  formData.append('name', name);
  const proofPayload = {
    metadata: {
      owner: walletAddress,
      type: 'image',
      name,
    },
  };
  const signature = await signCanonicalPayload(walletHash, {
    walletHash,
    nonce,
    timestamp,
    payload: proofPayload,
  });
  formData.append('proof', JSON.stringify({
    walletHash,
    nonce,
    timestamp,
    signerPublicKey: identity.signingPublicKey,
    signature,
  }));

  const response = await fetch('/api/ipfs/upload-image', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Failed to upload image to Pinata: ${details}`);
  }
  const data = await response.json();
  return data.cid as string;
}

export async function exportProfileData(walletAddress: string): Promise<string> {
  const profile = await getProfile(walletAddress);
  if (!profile) return JSON.stringify({ error: 'Profile not found' }, null, 2);
  return JSON.stringify(profile, null, 2);
}

export async function deleteProfile(walletAddress: string): Promise<void> {
  const walletHash = await hashWalletAddress(walletAddress);
  const records = toRecordMap();
  delete records[walletHash];
  setRecordMap(records);
}
