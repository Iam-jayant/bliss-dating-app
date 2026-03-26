import { hashWalletAddress } from '@/lib/wallet-hash';

const PROFILE_SECRET_PREFIX = 'bliss_v3_profile_secret_';

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary);
}

function generateSecret(): string {
  const random = crypto.getRandomValues(new Uint8Array(32));
  return toBase64(random);
}

export async function getProfileEncryptionSecret(walletAddress: string): Promise<string> {
  if (typeof window === 'undefined') {
    return walletAddress;
  }

  const walletHash = await hashWalletAddress(walletAddress);
  const key = `${PROFILE_SECRET_PREFIX}${walletHash}`;
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const secret = generateSecret();
  localStorage.setItem(key, secret);
  return secret;
}
