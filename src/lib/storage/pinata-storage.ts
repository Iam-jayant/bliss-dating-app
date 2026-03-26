/**
 * Pinata IPFS Storage Service (Free Tier)
 * More accessible than Web3.Storage - no payment required
 * Free tier: 1GB storage, unlimited gateways
 */

import axios from 'axios';
import { getPublicIdentity, signCanonicalPayload } from '@/lib/security/local-identity';
import { hashWalletAddress } from '@/lib/wallet-hash';

export interface ProfileData {
  name: string;
  bio: string;
  bioPromptType: string;
  interests: string[];
  datingIntent: string;
  profileImageCid?: string;
  additionalImageCids?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface StoredProfile {
  dataCid: string; // CID of encrypted profile JSON
  imageCid?: string; // CID of profile image
  encryptedWithWallet: boolean;
}

interface EncryptedData {
  data: string;
  iv: string;
  salt: string;
}

/**
 * Pinata IPFS Storage Service
 * Get free API key at: https://app.pinata.cloud/
 */
export class PinataStorageService {
  private gateway: string = 'gateway.pinata.cloud';

  async initialize() {
    this.gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud';
    // If gateway is just an ID (no dots), append .mypinata.cloud
    if (this.gateway && !this.gateway.includes('.')) {
      this.gateway = `${this.gateway}.mypinata.cloud`;
    }

    return this;
  }

  /**
   * Encrypt profile data using wallet signature
   */
  private async encryptData(data: string, walletSignature: string): Promise<EncryptedData> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // Derive encryption key from wallet signature using PBKDF2
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(walletSignature),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      dataBuffer
    );

    // Convert to base64 for JSON storage
    return {
      data: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
      iv: btoa(String.fromCharCode(...iv)),
      salt: btoa(String.fromCharCode(...salt))
    };
  }

  /**
   * Decrypt profile data using wallet signature
   */
  private async decryptData(encrypted: EncryptedData, walletSignature: string): Promise<string> {
    const encoder = new TextEncoder();
    
    // Convert from base64
    const encryptedBuffer = Uint8Array.from(atob(encrypted.data), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(encrypted.iv), c => c.charCodeAt(0));
    const salt = Uint8Array.from(atob(encrypted.salt), c => c.charCodeAt(0));

    // Derive the same key from wallet signature
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(walletSignature),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encryptedBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }

  /**
   * Store encrypted profile to Pinata IPFS
   */
  async storeProfile(
    profile: ProfileData,
    walletAddress: string,
    walletSignature: string
  ): Promise<string> {
    try {
      // Encrypt profile with wallet signature
      const profileJson = JSON.stringify(profile);
      const encrypted = await this.encryptData(profileJson, walletSignature);

      // Relay through server-side API so Pinata JWT never reaches the browser.
      const walletHash = await hashWalletAddress(walletAddress);
      const nonce = `${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
      const timestamp = Date.now();
      const proofPayload = {
        walletHash,
        nonce,
        timestamp,
        payload: encrypted,
      };
      const signature = await signCanonicalPayload(walletHash, proofPayload);
      const identity = await getPublicIdentity(walletHash);

      const response = await fetch('/api/ipfs/upload-json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payload: encrypted,
          name: `Bliss Profile - ${walletAddress.slice(0, 8)}`,
          keyvalues: {
            app: 'bliss',
            type: 'profile',
            owner: walletAddress,
            encrypted: 'true',
          },
          proof: {
            walletHash,
            nonce,
            timestamp,
            signerPublicKey: identity.signingPublicKey,
            signature,
          },
        }),
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(`Failed to upload profile to IPFS: ${details}`);
      }

      const data = (await response.json()) as { cid: string };
      console.log('✅ Profile uploaded to IPFS:', data.cid);
      return data.cid;
    } catch (error) {
      console.error('❌ Error storing profile to Pinata:', error);
      throw error;
    }
  }

  /**
   * Retrieve and decrypt profile from Pinata IPFS
   */
  async retrieveProfile(
    cid: string,
    walletAddress: string,
    walletSignature: string
  ): Promise<ProfileData> {
    try {
      // Fetch from Pinata dedicated gateway (faster)
      const url = `https://${this.gateway}/ipfs/${cid}`;
      const response = await axios.get(url);

      const encrypted: EncryptedData = response.data;

      // Decrypt with wallet signature
      const decryptedJson = await this.decryptData(encrypted, walletSignature);
      const profile: ProfileData = JSON.parse(decryptedJson);

      console.log('✅ Profile retrieved from IPFS:', cid);
      return profile;
    } catch (error) {
      console.error('❌ Error retrieving profile from Pinata:', error);
      throw error;
    }
  }

  /**
   * Upload profile image to Pinata
   */
  async uploadImage(file: File, walletAddress: string): Promise<string> {
    try {
      const walletHash = await hashWalletAddress(walletAddress);
      const nonce = `${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
      const timestamp = Date.now();
      const identity = await getPublicIdentity(walletHash);
      const metadataForProof = {
        owner: walletAddress,
        type: 'image',
        name: `Bliss Image - ${file.name}`,
      };
      const signature = await signCanonicalPayload(walletHash, {
        walletHash,
        nonce,
        timestamp,
        metadata: metadataForProof,
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('owner', walletAddress);
      formData.append('type', 'image');
      formData.append('name', metadataForProof.name);
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
        throw new Error(`Failed to upload image to IPFS: ${details}`);
      }

      const data = (await response.json()) as { cid: string };
      console.log('✅ Image uploaded to IPFS:', data.cid);
      return data.cid;
    } catch (error) {
      console.error('❌ Error uploading image to Pinata:', error);
      throw error;
    }
  }

  /**
   * Get image URL from CID
   */
  getImageUrl(cid: string): string {
    return `https://${this.gateway}/ipfs/${cid}`;
  }

  /**
   * Delete/unpin file from Pinata (optional cleanup)
   */
  async unpinFile(cid: string, walletAddress: string): Promise<void> {
    try {
      const walletHash = await hashWalletAddress(walletAddress);
      const nonce = `${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
      const timestamp = Date.now();
      const identity = await getPublicIdentity(walletHash);
      const signature = await signCanonicalPayload(walletHash, {
        walletHash,
        nonce,
        timestamp,
        payload: {
          cid,
          owner: walletAddress,
        },
      });

      const response = await fetch('/api/ipfs/unpin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cid,
          owner: walletAddress,
          proof: {
            walletHash,
            nonce,
            timestamp,
            signerPublicKey: identity.signingPublicKey,
            signature,
          },
        }),
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(`Failed to unpin file: ${details}`);
      }

      console.log('✅ File unpinned from IPFS:', cid);
    } catch (error) {
      console.error('❌ Error unpinning file:', error);
      throw error;
    }
  }

  /**
   * Test Pinata connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch('/api/ipfs/test-connection');
      if (!response.ok) return false;
      const data = await response.json();
      console.log('✅ Pinata connection successful:', data);
      return true;
    } catch (error) {
      console.error('❌ Pinata connection failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const pinataStorage = new PinataStorageService();
