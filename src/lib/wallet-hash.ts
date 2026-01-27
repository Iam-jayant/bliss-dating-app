/**
 * Wallet hashing utility for privacy-preserving identity
 * Converts wallet addresses to SHA256 hashes for use as database keys
 */

/**
 * Hash wallet address for privacy-preserving storage
 * @param walletAddress - Raw Aleo wallet address
 * @returns SHA256 hash as hex string
 * 
 * Properties:
 * - Deterministic: same wallet always produces same hash
 * - One-way: cannot reverse hash to wallet
 * - No salt: required for deterministic behavior
 */
export async function hashWalletAddress(walletAddress: string): Promise<string> {
  // Normalize to lowercase for consistent hashing
  const normalized = walletAddress.toLowerCase();
  
  // Encode string to bytes
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  
  // Compute SHA-256 hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert buffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return hashHex;
}
