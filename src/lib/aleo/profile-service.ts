/**
 * Aleo Service Extensions for Profile, Matching, and Subscriptions
 * Extends the base AleoService with Wave 2 contract interactions
 */

import {
  Transaction,
  WalletAdapterNetwork,
} from '@demox-labs/aleo-wallet-adapter-base';
import { ALEO_CONFIG } from './config';

const PROFILE_PROGRAM = process.env.NEXT_PUBLIC_PROFILE_VERIFICATION_PROGRAM || 'bliss_profile_verification.aleo';
const MATCHING_PROGRAM = process.env.NEXT_PUBLIC_COMPATIBILITY_MATCHING_PROGRAM || 'bliss_compatibility_matching.aleo';
const SUBSCRIPTION_PROGRAM = process.env.NEXT_PUBLIC_SUBSCRIPTION_ACCESS_PROGRAM || 'bliss_subscription_access.aleo';

/**
 * Extended Aleo service for Wave 2 contracts
 * Handles profile verification, matching, and subscriptions
 */
export class AleoProfileService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = ALEO_CONFIG.API_URL;
  }

  /**
   * Create profile on-chain via bliss_profile_verification.aleo::create_profile
   */
  async createProfileOnChain(
    walletAddress: string,
    interestsBitfield: number,
    datingIntent: number,
    locationGeohash: number,
    profileDataCid: bigint
  ): Promise<void> {
    // In production, this would submit an on-chain transaction
    // For MVP/demo, we store the mapping locally and simulate the on-chain record
    console.log('📝 Creating on-chain profile record:', {
      owner: walletAddress.slice(0, 12) + '...',
      interestsBitfield,
      datingIntent,
      locationGeohash,
      profileDataCid: profileDataCid.toString().slice(0, 20) + '...',
    });

    // Store in local cache for demo purposes
    const profiles = this.getLocalProfiles();
    profiles[walletAddress] = {
      interestsBitfield,
      datingIntent,
      locationGeohash,
      profileDataCid: profileDataCid.toString(),
      createdAt: Date.now(),
    };
    this.setLocalProfiles(profiles);
  }

  /**
   * Update profile on-chain
   */
  async updateProfileOnChain(
    walletAddress: string,
    interestsBitfield: number,
    datingIntent: number,
    locationGeohash: number,
    profileDataCid: bigint
  ): Promise<void> {
    console.log('📝 Updating on-chain profile record for:', walletAddress.slice(0, 12) + '...');

    const profiles = this.getLocalProfiles();
    profiles[walletAddress] = {
      ...profiles[walletAddress],
      interestsBitfield,
      datingIntent,
      locationGeohash,
      profileDataCid: profileDataCid.toString(),
      updatedAt: Date.now(),
    };
    this.setLocalProfiles(profiles);
  }

  /**
   * Get profile CID from on-chain record
   */
  async getProfileCid(walletAddress: string): Promise<string | null> {
    // In production, query the Aleo blockchain for the profile record
    // For MVP, check local cache
    const profiles = this.getLocalProfiles();
    const profile = profiles[walletAddress];
    
    if (!profile?.profileDataCid) return null;
    
    // In production, the CID would be stored on-chain and retrieved via API
    // For now, we return the locally cached CID mapping
    return this.getCidFromField(profile.profileDataCid);
  }

  /**
   * Get nearby users based on geohash proximity
   */
  async getNearbyUsers(userGeohash: number, maxDistance: number): Promise<string[]> {
    // In production, query on-chain location_zones mapping
    // For MVP, return users from local cache within geohash range
    const profiles = this.getLocalProfiles();
    const nearbyWallets: string[] = [];

    for (const [wallet, profile] of Object.entries(profiles)) {
      if (profile.locationGeohash) {
        // Simple proximity check based on geohash prefix matching
        const distance = Math.abs(profile.locationGeohash - userGeohash);
        if (distance <= maxDistance) {
          nearbyWallets.push(wallet);
        }
      }
    }

    return nearbyWallets;
  }

  /**
   * Record a like/pass action on-chain
   */
  async recordAction(
    walletAdapter: { publicKey?: string; requestTransaction?: (tx: any) => Promise<string> },
    targetWallet: string,
    isLike: boolean,
    interestsBitfield: number
  ): Promise<string> {
    if (!walletAdapter.publicKey || !walletAdapter.requestTransaction) {
      throw new Error('Wallet not connected');
    }

    const actionValue = isLike ? '1u8' : '0u8';
    const inputs = [
      targetWallet,
      actionValue,
      `${interestsBitfield}u8`,
    ];

    const aleoTransaction = Transaction.createTransaction(
      walletAdapter.publicKey,
      WalletAdapterNetwork.TestnetBeta,
      MATCHING_PROGRAM,
      'record_action',
      inputs,
      ALEO_CONFIG.FEE_MICROCREDITS,
      false
    );

    const plainTransaction = JSON.parse(JSON.stringify(aleoTransaction));
    return await walletAdapter.requestTransaction(plainTransaction);
  }

  /**
   * Check for mutual match on-chain
   */
  async checkMutualMatch(
    walletAdapter: { publicKey?: string; requestTransaction?: (tx: any) => Promise<string> },
    targetWallet: string
  ): Promise<boolean> {
    // In production, query on-chain mutual_matches mapping
    // For MVP, simulate with local state
    const matches = this.getLocalMatches();
    const key1 = `${walletAdapter.publicKey}_${targetWallet}`;
    const key2 = `${targetWallet}_${walletAdapter.publicKey}`;
    return matches[key1] === true || matches[key2] === true;
  }

  /**
   * Create a subscription transaction
   */
  createSubscriptionTransaction(
    walletPublicKey: string,
    tier: 'premium' | 'plus',
    durationMonths: number
  ): any {
    const currentTime = Math.floor(Date.now() / 1000);
    const functionName = tier === 'premium' ? 'upgrade_to_premium' : 'upgrade_to_plus';

    const inputs = [
      `${durationMonths}u32`,
      `${currentTime}u32`,
    ];

    const aleoTransaction = Transaction.createTransaction(
      walletPublicKey,
      WalletAdapterNetwork.TestnetBeta,
      SUBSCRIPTION_PROGRAM,
      functionName,
      inputs,
      ALEO_CONFIG.FEE_MICROCREDITS,
      false
    );

    return JSON.parse(JSON.stringify(aleoTransaction));
  }

  // --- Local storage helpers for MVP demo ---

  private getLocalProfiles(): Record<string, any> {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem('bliss_profiles') || '{}');
    } catch {
      return {};
    }
  }

  private setLocalProfiles(profiles: Record<string, any>): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('bliss_profiles', JSON.stringify(profiles));
  }

  private getLocalMatches(): Record<string, boolean> {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem('bliss_matches') || '{}');
    } catch {
      return {};
    }
  }

  /**
   * Store CID → field mapping locally (for MVP)
   * In production, this is stored on-chain
   */
  storeCidMapping(cid: string, field: string): void {
    if (typeof window === 'undefined') return;
    const mappings = JSON.parse(localStorage.getItem('bliss_cid_map') || '{}');
    mappings[field] = cid;
    localStorage.setItem('bliss_cid_map', JSON.stringify(mappings));
  }

  private getCidFromField(field: string): string | null {
    if (typeof window === 'undefined') return null;
    const mappings = JSON.parse(localStorage.getItem('bliss_cid_map') || '{}');
    return mappings[field] || null;
  }
}

// Export singleton
export const aleoProfileService = new AleoProfileService();
