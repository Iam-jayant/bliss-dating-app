import { ALEO_CONFIG } from './config';
import { validateContractPrivacy, validateVerificationRecord, sanitizeError, privacyLog } from '../privacy-utils';
import {
  Transaction,
  WalletAdapterNetwork,
  WalletNotConnectedError
} from '@demox-labs/aleo-wallet-adapter-base';
import type {
  VerificationRecord,
  AgeVerificationResult,
  ProofOfPossessionResult,
  AleoTransaction
} from './types';

/**
 * Aleo service for interacting with the age verification contract
 */
export class AleoService {
  private programId: string;
  private apiUrl: string;

  constructor() {
    this.programId = ALEO_CONFIG.PROGRAM_ID;
    this.apiUrl = ALEO_CONFIG.API_URL;
  }

  /**
   * Verify user's age using zero-knowledge proof
   * @param age - User's age (will be kept private)
   * @param walletAdapter - Connected wallet adapter with requestTransaction method
   * @returns Promise<AgeVerificationResult>
   */
  async verifyAge(age: number, walletAdapter: { publicKey?: string; requestTransaction?: any }): Promise<AgeVerificationResult> {
    try {
      if (!walletAdapter?.publicKey) {
        throw new WalletNotConnectedError();
      }

      if (!walletAdapter?.requestTransaction) {
        throw new Error('Wallet requestTransaction method not available');
      }

      if (age < 18) {
        return {
          success: false,
          error: 'Age must be 18 or older'
        };
      }

      privacyLog('Starting age verification process (age not logged for privacy)');

      // Create transaction using Leo docs format
      const inputs = [`${age}u8`];
      const fee = ALEO_CONFIG.FEE_MICROCREDITS;

      const aleoTransaction = Transaction.createTransaction(
        walletAdapter.publicKey,
        WalletAdapterNetwork.TestnetBeta,
        this.programId,
        ALEO_CONFIG.FUNCTIONS.VERIFY_AGE,
        inputs,
        fee
      );

      if (!aleoTransaction) {
        throw new Error('Failed to create transaction');
      }

      // Hack: Convert to plain object to ensure clean serialization for the wallet extension
      // Some versions of the adapter fail if passed a class instance with methods
      const plainTransaction = JSON.parse(JSON.stringify(aleoTransaction));

      console.log('Requesting transaction:', plainTransaction);

      // Request transaction from wallet
      const transactionId = await walletAdapter.requestTransaction(plainTransaction);

      if (!transactionId) {
        throw new Error('Transaction request failed (no ID returned)');
      }

      // For now, simulate a successful verification record
      // In real implementation, you would parse the actual transaction outputs
      const record: VerificationRecord = {
        owner: walletAdapter.publicKey,
        verified: true,
        _nonce: `nonce_${Date.now()}`,
        _version: 1,
      };

      // Validate verification record privacy
      if (!validateVerificationRecord(record)) {
        throw new Error('Verification record contains sensitive information');
      }

      privacyLog('Age verification completed successfully');

      return {
        success: true,
        record,
        transaction: {
          id: transactionId,
          status: 'confirmed',
          fee: fee.toString(),
          timestamp: Date.now(),
        }
      };

    } catch (error) {
      const sanitizedError = sanitizeError(error instanceof Error ? error : new Error('Unknown error'));
      privacyLog('Age verification failed', { error: sanitizedError });
      return {
        success: false,
        error: sanitizedError
      };
    }
  }

  /**
   * Prove possession of a valid verification record
   * @param record - VerificationRecord to prove possession of
   * @param walletAdapter - Connected wallet adapter
   * @returns Promise<ProofOfPossessionResult>
   */
  async proveVerificationRecord(
    record: VerificationRecord,
    walletAdapter: { publicKey?: string; requestTransaction?: any }
  ): Promise<ProofOfPossessionResult> {
    try {
      if (!walletAdapter?.publicKey) {
        throw new WalletNotConnectedError();
      }

      if (!walletAdapter?.requestTransaction) {
        throw new Error('Wallet requestTransaction method not available');
      }

      // Format record for transaction input
      const recordInput = this.formatRecordInput(record);

      // Create transaction using Leo docs format
      const inputs = [recordInput];
      const fee = ALEO_CONFIG.FEE_MICROCREDITS;

      const aleoTransaction = Transaction.createTransaction(
        walletAdapter.publicKey,
        WalletAdapterNetwork.TestnetBeta,
        this.programId,
        ALEO_CONFIG.FUNCTIONS.PROVE_POSSESSION,
        inputs,
        fee
      );

      if (!aleoTransaction) {
        throw new Error('Failed to create transaction');
      }

      // Hack: Convert to plain object to ensure clean serialization for the wallet extension
      const plainTransaction = JSON.parse(JSON.stringify(aleoTransaction));

      // Request transaction from wallet
      const transactionId = await walletAdapter.requestTransaction(plainTransaction);

      if (!transactionId) {
        throw new Error('Transaction request failed (no ID returned)');
      }

      // For now, simulate successful verification
      // In real implementation, you would parse the actual transaction outputs
      const verified = true;

      return {
        success: true,
        verified,
        transaction: {
          id: transactionId,
          status: 'confirmed',
          fee: fee.toString(),
          timestamp: Date.now(),
        }
      };

    } catch (error) {
      console.error('Proof of possession failed:', error);
      return {
        success: false,
        verified: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Check if a program exists on the network
   * @returns Promise<boolean>
   */
  async isProgramDeployed(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/program/${this.programId}`);
      return response.ok;
    } catch (error) {
      console.error('Failed to check program deployment:', error);
      return false;
    }
  }

  /**
   * Get transaction status
   * @param transactionId - Transaction ID to check
   * @returns Promise<AleoTransaction | null>
   */
  async getTransactionStatus(transactionId: string): Promise<AleoTransaction | null> {
    try {
      const response = await fetch(`${this.apiUrl}/transaction/${transactionId}`);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      return {
        id: transactionId,
        status: data.status === 'accepted' ? 'confirmed' : 'pending',
        fee: data.fee?.toString() || '0',
        timestamp: data.timestamp,
      };

    } catch (error) {
      console.error('Failed to get transaction status:', error);
      return null;
    }
  }

  /**
   * Parse VerificationRecord from transaction outputs
   * @private
   */
  private parseVerificationRecord(outputs: any[]): VerificationRecord | undefined {
    try {
      // Look for record output in transaction
      const recordOutput = outputs.find(output =>
        output.type === 'record' && output.value
      );

      if (!recordOutput) {
        return undefined;
      }

      const record = recordOutput.value;

      return {
        owner: record.owner,
        verified: record.verified === 'true' || record.verified === true,
        _nonce: record.nonce, // Contract uses 'nonce', but our interface uses '_nonce'
        _version: 1, // Default version since contract doesn't have version field
      };

    } catch (error) {
      console.error('Failed to parse verification record:', error);
      return undefined;
    }
  }

  /**
   * Parse boolean output from transaction
   * @private
   */
  private parseBooleanOutput(outputs: any[]): boolean {
    try {
      const boolOutput = outputs.find(output =>
        output.type === 'private' || output.type === 'public'
      );

      return boolOutput?.value === 'true' || boolOutput?.value === true;

    } catch (error) {
      console.error('Failed to parse boolean output:', error);
      return false;
    }
  }

  /**
   * Format VerificationRecord for transaction input
   * @private
   */
  private formatRecordInput(record: VerificationRecord): string {
    return `{
      owner: ${record.owner},
      verified: ${record.verified},
      nonce: ${record._nonce}
    }`;
  }
  /**
   * Test a standard transaction (transfer_public) to verify wallet plumbing
   */
  async testStandardTransaction(walletAdapter: { publicKey?: string; requestTransaction?: any }): Promise<any> {
    try {
      if (!walletAdapter?.publicKey) throw new WalletNotConnectedError();

      console.log('Testing standard transaction (transfer_public)...');

      const inputs = [walletAdapter.publicKey, "100000u64"]; // Transfer 0.1 credit to self
      const fee = 100000; // 0.1 credit fee

      const aleoTransaction = Transaction.createTransaction(
        walletAdapter.publicKey,
        WalletAdapterNetwork.TestnetBeta,
        'credits.aleo',
        'transfer_public',
        inputs,
        fee
      );

      // Hack: Convert to plain object to ensure clean serialization for the wallet extension
      const plainTransaction = JSON.parse(JSON.stringify(aleoTransaction));
      console.log('Requesting test transaction:', plainTransaction);

      const transactionId = await walletAdapter.requestTransaction(plainTransaction);
      return { success: true, transactionId };
    } catch (error) {
      console.error('Test transaction failed:', error);
      return { success: false, error: String(error) };
    }
  }
}

// Export singleton instance
export const aleoService = new AleoService();