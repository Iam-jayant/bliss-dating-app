// Aleo-specific types for the age verification system

export interface VerificationRecord {
  owner: string;
  verified: boolean;
  _nonce: string;
  _version: number;
}

export interface AleoTransaction {
  id: string;
  status: 'pending' | 'confirmed' | 'failed';
  fee: string;
  timestamp?: number;
}

export interface WalletState {
  address: string | null;
  connected: boolean;
  connecting: boolean;
  publicKey?: string;
}

export interface AgeVerificationResult {
  success: boolean;
  record?: VerificationRecord;
  transaction?: AleoTransaction;
  error?: string;
}

export interface ProofOfPossessionResult {
  success: boolean;
  verified: boolean;
  transaction?: AleoTransaction;
  error?: string;
}

// Wallet adapter types
export interface AleoWallet {
  name: string;
  icon: string;
  url: string;
  adapter: any; // Will be typed properly when implementing
}

export type TransactionStatus = 'idle' | 'signing' | 'broadcasting' | 'confirming' | 'confirmed' | 'failed';