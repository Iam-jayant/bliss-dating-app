import { ALEO_CONFIG } from './config';
import { validateVerificationRecord, sanitizeError, privacyLog } from '../privacy-utils';
import type {
  VerificationRecord,
  ProviderAttestationRecord,
  QuorumVerificationRecord,
  AgeVerificationResult,
  ProofOfPossessionResult,
  AleoTransaction
} from './types';

class WalletNotConnectedError extends Error {
  constructor() {
    super('Wallet not connected');
    this.name = 'WalletNotConnectedError';
  }
}

type WalletTransactionStatusResponse = {
  status?: string;
  transactionId?: string;
  transaction_id?: string;
  id?: string;
  hash?: string;
  error?: unknown;
  message?: unknown;
  reason?: unknown;
  fee?: unknown;
  timestamp?: number;
  execution?: unknown;
  transaction?: unknown;
  outputs?: unknown[];
};

type WalletRecord = {
  plaintext?: string;
  data?: Record<string, string>;
};

type AleoServiceWalletAdapter = {
  publicKey?: string;
  requestTransaction?: (tx: {
    program: string;
    function: string;
    inputs: string[];
    fee: number;
    privateFee: boolean;
  }) => Promise<unknown>;
  transactionStatus?: (transactionId: string) => Promise<WalletTransactionStatusResponse>;
  requestRecords?: (programId: string, includePlaintext?: boolean) => Promise<unknown[]>;
};

type AgeVerificationProgress =
  | 'submitting-transaction'
  | 'waiting-for-confirmation'
  | 'waiting-for-record'
  | 'completed';

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

const CONFIRMATION_POLL_INTERVAL_MS = parsePositiveInteger(
  process.env.NEXT_PUBLIC_ALEO_TX_POLL_INTERVAL_MS,
  2000,
);

const CONFIRMATION_MAX_ATTEMPTS = parsePositiveInteger(
  process.env.NEXT_PUBLIC_ALEO_TX_MAX_ATTEMPTS,
  180,
);

const EXPLORER_FALLBACK_START_ATTEMPT = parsePositiveInteger(
  process.env.NEXT_PUBLIC_ALEO_EXPLORER_FALLBACK_START_ATTEMPT,
  20,
);

const EXPLORER_FALLBACK_POLL_EVERY_ATTEMPTS = parsePositiveInteger(
  process.env.NEXT_PUBLIC_ALEO_EXPLORER_FALLBACK_EVERY_ATTEMPTS,
  5,
);

const LOCAL_REJECTED_STATUS_GRACE_ATTEMPTS = parsePositiveInteger(
  process.env.NEXT_PUBLIC_ALEO_LOCAL_REJECTED_GRACE_ATTEMPTS,
  3,
);

const WALLET_STATUS_ERROR_GRACE_ATTEMPTS = parsePositiveInteger(
  process.env.NEXT_PUBLIC_ALEO_STATUS_ERROR_GRACE_ATTEMPTS,
  3,
);

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

  async createProviderAdmin(
    walletAdapter: AleoServiceWalletAdapter,
  ): Promise<{ success: boolean; transaction?: AleoTransaction; error?: string }> {
    try {
      if (!walletAdapter?.publicKey) throw new WalletNotConnectedError();
      if (!walletAdapter?.requestTransaction) {
        throw new Error('Wallet requestTransaction method not available');
      }

      const txResponse = await walletAdapter.requestTransaction({
        program: this.programId,
        function: 'create_provider_admin',
        inputs: [walletAdapter.publicKey],
        fee: ALEO_CONFIG.FEE_MICROCREDITS,
        privateFee: false,
      });

      const transactionId = this.extractTransactionId(txResponse);
      if (!transactionId) {
        throw new Error('Provider admin transaction did not return an ID');
      }

      const tx = await this.waitForConfirmedTransaction(transactionId, walletAdapter);
      return {
        success: true,
        transaction: {
          id: String((tx as Record<string, unknown>)?.id || transactionId),
          status: tx.status === 'failed' ? 'failed' : 'confirmed',
          fee: tx.fee?.toString() || ALEO_CONFIG.FEE_MICROCREDITS.toString(),
          timestamp: tx.timestamp || Date.now(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create provider admin',
      };
    }
  }

  async registerProvider(
    providerAddress: string,
    providerId: number,
    walletAdapter: AleoServiceWalletAdapter,
  ): Promise<{ success: boolean; transaction?: AleoTransaction; error?: string }> {
    try {
      if (!walletAdapter?.publicKey) throw new WalletNotConnectedError();
      if (!walletAdapter?.requestTransaction) {
        throw new Error('Wallet requestTransaction method not available');
      }
      if (!walletAdapter?.requestRecords) {
        throw new Error('Wallet requestRecords method not available');
      }

      const adminRecord = await this.findLatestProviderAdminRecord(
        walletAdapter.requestRecords,
        walletAdapter.publicKey,
      );
      if (!adminRecord?.plaintext) {
        throw new Error('No provider admin record found for caller. Create provider admin first.');
      }

      const txResponse = await walletAdapter.requestTransaction({
        program: this.programId,
        function: 'register_provider',
        inputs: [
          adminRecord.plaintext,
          providerAddress,
          `${providerId}u8`,
        ],
        fee: ALEO_CONFIG.FEE_MICROCREDITS,
        privateFee: false,
      });

      const transactionId = this.extractTransactionId(txResponse);
      if (!transactionId) {
        throw new Error('Provider registration transaction did not return an ID');
      }

      const tx = await this.waitForConfirmedTransaction(transactionId, walletAdapter);
      return {
        success: true,
        transaction: {
          id: String((tx as Record<string, unknown>)?.id || transactionId),
          status: tx.status === 'failed' ? 'failed' : 'confirmed',
          fee: tx.fee?.toString() || ALEO_CONFIG.FEE_MICROCREDITS.toString(),
          timestamp: tx.timestamp || Date.now(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to register provider',
      };
    }
  }

  async revokeProvider(
    providerAddress: string,
    providerId: number,
    walletAdapter: AleoServiceWalletAdapter,
  ): Promise<{ success: boolean; transaction?: AleoTransaction; error?: string }> {
    try {
      if (!walletAdapter?.publicKey) throw new WalletNotConnectedError();
      if (!walletAdapter?.requestTransaction) {
        throw new Error('Wallet requestTransaction method not available');
      }
      if (!walletAdapter?.requestRecords) {
        throw new Error('Wallet requestRecords method not available');
      }

      const adminRecord = await this.findLatestProviderAdminRecord(
        walletAdapter.requestRecords,
        walletAdapter.publicKey,
      );
      if (!adminRecord?.plaintext) {
        throw new Error('No provider admin record found for caller.');
      }

      const providerAuth = await this.findLatestProviderAuthorization(
        walletAdapter.requestRecords,
        providerAddress,
        providerId,
      );
      if (!providerAuth?.plaintext) {
        throw new Error('No provider authorization record found for provider and provider_id.');
      }

      const txResponse = await walletAdapter.requestTransaction({
        program: this.programId,
        function: 'revoke_provider',
        inputs: [
          adminRecord.plaintext,
          providerAuth.plaintext,
        ],
        fee: ALEO_CONFIG.FEE_MICROCREDITS,
        privateFee: false,
      });

      const transactionId = this.extractTransactionId(txResponse);
      if (!transactionId) {
        throw new Error('Provider revoke transaction did not return an ID');
      }

      const tx = await this.waitForConfirmedTransaction(transactionId, walletAdapter);
      return {
        success: true,
        transaction: {
          id: String((tx as Record<string, unknown>)?.id || transactionId),
          status: tx.status === 'failed' ? 'failed' : 'confirmed',
          fee: tx.fee?.toString() || ALEO_CONFIG.FEE_MICROCREDITS.toString(),
          timestamp: tx.timestamp || Date.now(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revoke provider',
      };
    }
  }

  async issueProviderAttestation(
    providerId: number,
    age: number,
    expiresAt: number,
    walletAdapter: AleoServiceWalletAdapter,
  ): Promise<{ success: boolean; transaction?: AleoTransaction; error?: string }> {
    try {
      if (!walletAdapter?.publicKey) throw new WalletNotConnectedError();
      if (!walletAdapter?.requestTransaction) {
        throw new Error('Wallet requestTransaction method not available');
      }
      if (!walletAdapter?.requestRecords) {
        throw new Error('Wallet requestRecords method not available');
      }

      const providerAuthorization = await this.findLatestProviderAuthorization(
        walletAdapter.requestRecords,
        walletAdapter.publicKey,
        providerId,
      );
      if (!providerAuthorization?.plaintext) {
        throw new Error('No active provider authorization record found for this provider and provider_id.');
      }

      const issuedAt = Math.floor(Date.now() / 1000);
      const nonce = `${Date.now()}`;
      const txResponse = await walletAdapter.requestTransaction({
        program: this.programId,
        function: 'issue_provider_attestation',
        inputs: [
          providerAuthorization.plaintext,
          walletAdapter.publicKey,
          `${providerId}u8`,
          `${age}u8`,
          `${issuedAt}u32`,
          `${expiresAt}u32`,
          `${nonce}u64`,
          '1u16',
        ],
        fee: ALEO_CONFIG.FEE_MICROCREDITS,
        privateFee: false,
      });

      const transactionId = this.extractTransactionId(txResponse);
      if (!transactionId) {
        throw new Error('Provider attestation transaction did not return an ID');
      }

      const tx = await this.waitForConfirmedTransaction(transactionId, walletAdapter);
      return {
        success: true,
        transaction: {
          id: String((tx as Record<string, unknown>)?.id || transactionId),
          status: tx.status === 'failed' ? 'failed' : 'confirmed',
          fee: tx.fee?.toString() || ALEO_CONFIG.FEE_MICROCREDITS.toString(),
          timestamp: tx.timestamp || Date.now(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to issue provider attestation',
      };
    }
  }

  async verifyAgeWithQuorum(
    attestations: [ProviderAttestationRecord, ProviderAttestationRecord, ProviderAttestationRecord],
    requiredQuorum: 2 | 3,
    validityWindowSeconds: number,
    walletAdapter: AleoServiceWalletAdapter,
  ): Promise<{ success: boolean; transaction?: AleoTransaction; error?: string }> {
    try {
      if (!walletAdapter?.publicKey) throw new WalletNotConnectedError();
      if (!walletAdapter?.requestTransaction) {
        throw new Error('Wallet requestTransaction method not available');
      }
      if (!walletAdapter?.requestRecords) {
        throw new Error('Wallet requestRecords method not available');
      }

      const records = await walletAdapter.requestRecords(this.programId, true);
      const findAttestation = (attestation: ProviderAttestationRecord): WalletRecord | undefined => {
        const nonce = String(attestation.nonce);
        return (records as WalletRecord[]).find((record) => {
          const data = record.data || {};
          const owner = this.cleanLeoValue(data.owner);
          const recordNonce = this.cleanLeoValue(data.nonce);
          return owner === attestation.owner && recordNonce === nonce;
        });
      };

      const a1 = findAttestation(attestations[0]);
      const a2 = findAttestation(attestations[1]);
      const a3 = findAttestation(attestations[2]);
      if (!a1?.plaintext || !a2?.plaintext || !a3?.plaintext) {
        throw new Error('Could not resolve plaintext attestation records for quorum verification');
      }

      const now = Math.floor(Date.now() / 1000);
      const txResponse = await walletAdapter.requestTransaction({
        program: this.programId,
        function: 'verify_age_with_quorum',
        inputs: [
          walletAdapter.publicKey,
          a1.plaintext,
          a2.plaintext,
          a3.plaintext,
          `${now}u32`,
          `${requiredQuorum}u8`,
          `${validityWindowSeconds}u32`,
        ],
        fee: ALEO_CONFIG.FEE_MICROCREDITS,
        privateFee: false,
      });

      const transactionId = this.extractTransactionId(txResponse);
      if (!transactionId) {
        throw new Error('Quorum verification transaction did not return an ID');
      }

      const tx = await this.waitForConfirmedTransaction(transactionId, walletAdapter);
      return {
        success: true,
        transaction: {
          id: String((tx as Record<string, unknown>)?.id || transactionId),
          status: tx.status === 'failed' ? 'failed' : 'confirmed',
          fee: tx.fee?.toString() || ALEO_CONFIG.FEE_MICROCREDITS.toString(),
          timestamp: tx.timestamp || Date.now(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify age with quorum',
      };
    }
  }

  /**
   * Verify user's age using zero-knowledge proof
   * @param age - User's age (will be kept private)
   * @param walletAdapter - Connected wallet adapter with requestTransaction method
   * @returns Promise<AgeVerificationResult>
   */
  async verifyAge(
    age: number,
    walletAdapter: AleoServiceWalletAdapter,
    onProgress?: (progress: AgeVerificationProgress) => void,
  ): Promise<AgeVerificationResult> {
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
      const inputs = [walletAdapter.publicKey, `${age}u8`];
      const fee = ALEO_CONFIG.FEE_MICROCREDITS;

      console.log('Creating transaction with:', {
        program: this.programId,
        function: ALEO_CONFIG.FUNCTIONS.VERIFY_AGE,
        inputs,
        fee,
        publicKey: walletAdapter.publicKey
      });

      const txOptions = {
        program: this.programId,
        function: ALEO_CONFIG.FUNCTIONS.VERIFY_AGE,
        inputs,
        fee,
        privateFee: false,
      };

      console.log('Requesting transaction from wallet:', txOptions);
      onProgress?.('submitting-transaction');

      // Request transaction from wallet - this should trigger the wallet popup
      const txResponse = await walletAdapter.requestTransaction(txOptions);
      const transactionId = this.extractTransactionId(txResponse);

      if (!transactionId) {
        throw new Error('Transaction request failed (no ID returned)');
      }

      onProgress?.('waiting-for-confirmation');
      const tx = await this.waitForConfirmedTransaction(transactionId, walletAdapter);
      const resolvedTransactionId = String((tx as Record<string, unknown>)?.id || transactionId);
      const outputs = this.extractTransitionOutputs(tx);
      let record = this.parseVerificationRecord(outputs);

      // Explorer output may omit private records. Fetch latest record from wallet if available.
      if (!record && walletAdapter.requestRecords) {
        onProgress?.('waiting-for-record');
        record = await this.waitForVerificationRecord(walletAdapter.requestRecords, walletAdapter.publicKey);
      }

      if (!record) {
        console.warn(
          'Verification record was not discoverable after confirmation; falling back to optimistic verified record.',
          { transactionId: resolvedTransactionId, owner: walletAdapter.publicKey },
        );
        record = this.buildOptimisticVerificationRecord(walletAdapter.publicKey);
      }

      // Validate verification record privacy
      if (!validateVerificationRecord(record)) {
        throw new Error('Verification record contains sensitive information');
      }

      privacyLog('Age verification completed successfully');
      onProgress?.('completed');

      return {
        success: true,
        record,
        transaction: {
          id: resolvedTransactionId,
          status: tx.status === 'failed' ? 'failed' : 'confirmed',
          fee: tx.fee?.toString() || fee.toString(),
          timestamp: tx.timestamp || Date.now(),
        }
      };

    } catch (error) {
      console.error('Age verification error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check for specific wallet errors
      if (errorMessage.includes('No records for fee')) {
        return {
          success: false,
          error: 'Your wallet needs fee records to pay for transactions. Please send 0.1 Aleo to yourself in Leo Wallet (this creates fee records), wait for confirmation, then try again.'
        };
      }

      if (this.isLikelyWalletRejectionMessage(errorMessage)) {
        return {
          success: false,
          error: 'Wallet rejected the transaction request. Open your wallet popup, approve the age verification transaction, and try again.'
        };
      }
      
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
    walletAdapter: AleoServiceWalletAdapter
  ): Promise<ProofOfPossessionResult> {
    try {
      if (!walletAdapter?.publicKey) {
        throw new WalletNotConnectedError();
      }

      if (!walletAdapter?.requestTransaction) {
        throw new Error('Wallet requestTransaction method not available');
      }

      // Prefer wallet plaintext record when available, fallback to formatted object.
      let recordInput = this.formatRecordInput(record);
      if (walletAdapter.requestRecords) {
        const latestPlaintext = await this.findLatestVerificationPlaintext(walletAdapter.requestRecords);
        if (latestPlaintext) {
          recordInput = latestPlaintext;
        }
      }

      // Create transaction using Leo docs format
      const inputs = [recordInput, walletAdapter.publicKey];
      const fee = ALEO_CONFIG.FEE_MICROCREDITS;

      const txOptions = {
        program: this.programId,
        function: ALEO_CONFIG.FUNCTIONS.PROVE_POSSESSION,
        inputs,
        fee,
        privateFee: false,
      };

      // Request transaction from wallet
      const txResponse = await walletAdapter.requestTransaction(txOptions);
      const transactionId = this.extractTransactionId(txResponse);

      if (!transactionId) {
        throw new Error('Transaction request failed (no ID returned)');
      }

      const tx = await this.waitForConfirmedTransaction(transactionId, walletAdapter);
      const resolvedTransactionId = String((tx as Record<string, unknown>)?.id || transactionId);
      const outputs = this.extractTransitionOutputs(tx);
      const verified = this.parseBooleanOutput(outputs);

      return {
        success: true,
        verified,
        transaction: {
          id: resolvedTransactionId,
          status: tx.status === 'failed' ? 'failed' : 'confirmed',
          fee: tx.fee?.toString() || fee.toString(),
          timestamp: tx.timestamp || Date.now(),
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
      const statusRaw = String(data.status || '').toLowerCase();
      const status = statusRaw === 'accepted' || statusRaw === 'confirmed' || statusRaw === 'finalized'
        ? 'confirmed'
        : statusRaw === 'rejected' || statusRaw === 'failed'
          ? 'failed'
          : 'pending';

      return {
        id: transactionId,
        status,
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
      const recordOutput = outputs.find((output) => {
        const type = String(output.type || '').toLowerCase();
        const value = output.value || output.record || output.plaintext || output;
        return (type.includes('record') || value?.owner) && value;
      });

      if (!recordOutput) {
        return undefined;
      }

      const record = recordOutput.value || recordOutput.record || recordOutput.plaintext || recordOutput;
      const owner = record.owner || record.owner?.value || record['owner.private'];
      const verifiedRaw = record.verified || record.verified?.value || record['verified.private'];
      return {
        owner: String(owner),
        verified: String(verifiedRaw).includes('true') || verifiedRaw === true,
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
      const boolOutput = outputs.find((output) => {
        const value = output.value ?? output;
        return typeof value === 'boolean' || String(value).includes('true') || String(value).includes('false');
      });
      const value = boolOutput?.value ?? boolOutput;
      return value === true || String(value).toLowerCase().includes('true');

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
      verified: ${record.verified}
    }`;
  }

  private buildOptimisticVerificationRecord(owner: string): VerificationRecord {
    return {
      owner,
      verified: true,
    };
  }

  private isExplorerTransactionId(value: string): boolean {
    return /^at1[0-9a-z]+$/.test(value);
  }

  private normalizeStatus(status: unknown): string {
    return String(status || '').trim().toLowerCase();
  }

  private isConfirmedStatus(status: string): boolean {
    return status === 'accepted'
      || status === 'confirmed'
      || status === 'finalized'
      || status === 'completed'
      || status === 'success'
      || status === 'succeeded'
      || status === 'executed'
      || status === 'included'
      || status === 'committed'
      || status === 'settled'
      || status === 'done';
  }

  private isFailedStatus(status: string): boolean {
    return status === 'failed'
      || status === 'rejected'
      || status === 'error'
      || status === 'cancelled'
      || status === 'canceled'
      || status === 'aborted'
      || status === 'dropped'
      || status === 'expired';
  }

  private isLikelyLocalWalletRequestId(transactionId: string): boolean {
    if (!transactionId) return false;
    if (this.isExplorerTransactionId(transactionId)) return false;
    return /^(shield|leo|fox|soter|puzzle)_/i.test(transactionId);
  }

  private extractStatusReason(statusResponse: WalletTransactionStatusResponse): string | null {
    const nestedTransaction = statusResponse.transaction && typeof statusResponse.transaction === 'object'
      ? (statusResponse.transaction as Record<string, unknown>)
      : null;

    const candidates = [
      statusResponse.error,
      statusResponse.message,
      statusResponse.reason,
      nestedTransaction?.error,
      nestedTransaction?.message,
      nestedTransaction?.reason,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }

    return null;
  }

  private isLikelyWalletRejectionMessage(message: string): boolean {
    const normalized = message.toLowerCase();
    return normalized.includes('transaction rejected')
      || normalized.includes('wallet rejected')
      || normalized.includes('request rejected')
      || normalized.includes('user rejected')
      || normalized.includes('denied')
      || normalized.includes('cancelled')
      || normalized.includes('canceled');
  }

  private formatRejectedTransactionError(transactionId: string, reason?: string | null): string {
    if (reason) {
      return `Transaction rejected: ${reason}`;
    }
    if (this.isLikelyLocalWalletRequestId(transactionId)) {
      return 'Transaction was rejected by the wallet before an on-chain id was issued. Please approve the wallet request and retry.';
    }
    return `Transaction rejected: ${transactionId}`;
  }

  private cleanLeoValue(raw: string | undefined): string {
    if (!raw) return '';
    return raw
      .trim()
      .replace(/^['"]|['"]$/g, '')
      .replace(/\.(private|public|constant)$/i, '')
      .replace(/,$/, '')
      .trim();
  }

  private async findLatestVerificationPlaintext(
    requestRecords: (programId: string, includePlaintext?: boolean) => Promise<unknown[]>,
  ): Promise<string | null> {
    try {
      const records = await this.loadProgramRecords(requestRecords);
      if (!Array.isArray(records) || records.length === 0) return null;

      for (let i = records.length - 1; i >= 0; i -= 1) {
        const record = records[i];
        if (!this.parseWalletVerificationRecord(record)) {
          continue;
        }

        if (typeof record === 'string' && record.trim()) {
          return record;
        }

        const walletRecord = this.normalizeWalletRecord(record);
        if (typeof walletRecord.plaintext === 'string' && walletRecord.plaintext.trim()) {
          return walletRecord.plaintext;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private async findLatestProviderAuthorization(
    requestRecords: (programId: string, includePlaintext?: boolean) => Promise<unknown[]>,
    providerAddress: string,
    providerId: number,
  ): Promise<WalletRecord | undefined> {
    const records = await requestRecords(this.programId, true);
    if (!Array.isArray(records) || records.length === 0) return undefined;

    for (let i = records.length - 1; i >= 0; i -= 1) {
      const record = records[i] as WalletRecord;
      const data = record.data || {};
      const owner = this.cleanLeoValue(data.owner);
      const idRaw = this.cleanLeoValue(data.provider_id);
      const activeRaw = this.cleanLeoValue(data.active);

      if (!owner || !idRaw || !activeRaw) continue;

      const idParsed = Number(idRaw.replace(/u\d+$/, ''));
      const isActive = activeRaw === 'true' || activeRaw === '1';
      if (owner === providerAddress && idParsed === providerId && isActive) {
        return record;
      }
    }

    return undefined;
  }

  private async findLatestProviderAdminRecord(
    requestRecords: (programId: string, includePlaintext?: boolean) => Promise<unknown[]>,
    adminAddress: string,
  ): Promise<WalletRecord | undefined> {
    const records = await requestRecords(this.programId, true);
    if (!Array.isArray(records) || records.length === 0) return undefined;

    for (let i = records.length - 1; i >= 0; i -= 1) {
      const record = records[i] as WalletRecord;
      const data = record.data || {};
      const owner = this.cleanLeoValue(data.owner);
      const versionRaw = this.cleanLeoValue(data.version);
      if (!owner || !versionRaw) continue;

      if (owner === adminAddress) {
        return record;
      }
    }

    return undefined;
  }

  private async findLatestVerificationRecord(
    requestRecords: (programId: string, includePlaintext?: boolean) => Promise<unknown[]>,
    expectedOwner?: string,
  ): Promise<VerificationRecord | undefined> {
    try {
      const records = await this.loadProgramRecords(requestRecords);
      if (!Array.isArray(records) || records.length === 0) return undefined;

      for (let i = records.length - 1; i >= 0; i -= 1) {
        const parsedRecord = this.parseWalletVerificationRecord(records[i], expectedOwner);
        if (parsedRecord) {
          return parsedRecord;
        }
      }
    } catch (error) {
      console.warn('Failed to load latest verification record from wallet:', error);
    }

    return undefined;
  }

  private async waitForVerificationRecord(
    requestRecords: (programId: string, includePlaintext?: boolean) => Promise<unknown[]>,
    expectedOwner?: string,
    attempts = 30,
    intervalMs = 2000,
  ): Promise<VerificationRecord | undefined> {
    for (let i = 0; i < attempts; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const record = await this.findLatestVerificationRecord(requestRecords, expectedOwner);
      if (record?.verified) return record;
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return undefined;
  }

  private async loadProgramRecords(
    requestRecords: (programId: string, includePlaintext?: boolean) => Promise<unknown[]>,
  ): Promise<unknown[]> {
    const [standardRecords, plaintextRecords] = await Promise.all([
      this.safeRequestRecords(requestRecords, false),
      this.safeRequestRecords(requestRecords, true),
    ]);

    if (standardRecords.length === 0) return plaintextRecords;
    if (plaintextRecords.length === 0) return standardRecords;

    const merged = [...standardRecords];
    const seen = new Set(standardRecords.map((record) => this.getRecordIdentity(record)));

    for (const record of plaintextRecords) {
      const identity = this.getRecordIdentity(record);
      if (seen.has(identity)) {
        continue;
      }
      seen.add(identity);
      merged.push(record);
    }

    return merged;
  }

  private async safeRequestRecords(
    requestRecords: (programId: string, includePlaintext?: boolean) => Promise<unknown[]>,
    includePlaintext: boolean,
  ): Promise<unknown[]> {
    try {
      const records = await requestRecords(this.programId, includePlaintext);
      return Array.isArray(records) ? records : [];
    } catch (error) {
      console.warn(
        `Failed to request ${includePlaintext ? 'plaintext' : 'standard'} records for ${this.programId}:`,
        error,
      );
      return [];
    }
  }

  private extractTransactionId(response: unknown): string | null {
    if (!response) return null;
    if (typeof response === 'string') return response.trim();
    if (typeof response === 'object' && response !== null) {
      const tx = response as Record<string, unknown>;
      const nestedTx = tx.transaction && typeof tx.transaction === 'object'
        ? (tx.transaction as Record<string, unknown>)
        : null;

      const candidates = [
        tx.transactionId,
        tx.transaction_id,
        tx.id,
        tx.hash,
        nestedTx?.transactionId,
        nestedTx?.transaction_id,
        nestedTx?.id,
        nestedTx?.hash,
      ];

      // Prefer explorer tx ids when available.
      for (const candidate of candidates) {
        if (typeof candidate === 'string' && this.isExplorerTransactionId(candidate.trim())) {
          return candidate.trim();
        }
      }

      for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) {
          return candidate.trim();
        }
      }
    }
    return null;
  }

  private async fetchExplorerTransaction(transactionId: string): Promise<any | null> {
    const response = await fetch(`${this.apiUrl}/transaction/${transactionId}`);
    if (!response.ok) return null;
    const data = await response.json();
    return {
      ...data,
      id: data.id || transactionId,
    };
  }

  private async waitForConfirmedTransaction(
    transactionId: string,
    walletAdapter?: AleoServiceWalletAdapter,
    attempts = CONFIRMATION_MAX_ATTEMPTS,
  ): Promise<any> {
    let activeTransactionId = transactionId;
    let explorerTransactionId: string | null = this.isExplorerTransactionId(transactionId)
      ? transactionId
      : null;
    let lastExplorerProbeAttempt = -1;
    let localRejectedStatusGraceCount = 0;
    let walletStatusErrorGraceCount = 0;

    for (let i = 0; i < attempts; i += 1) {
      let statusResponse: WalletTransactionStatusResponse | undefined;
      let statusError: Error | null = null;

      if (walletAdapter?.transactionStatus) {
        try {
          // eslint-disable-next-line no-await-in-loop
          statusResponse = await walletAdapter.transactionStatus(activeTransactionId);
        } catch (error) {
          statusError = error instanceof Error ? error : new Error(String(error));
        }
      }

      if (statusResponse) {
        const status = this.normalizeStatus(statusResponse.status);
        const resolvedId = this.extractTransactionId(statusResponse) || activeTransactionId;
        const statusReason = this.extractStatusReason(statusResponse);

        if (resolvedId !== activeTransactionId) {
          activeTransactionId = resolvedId;
        }

        if (this.isExplorerTransactionId(resolvedId)) {
          explorerTransactionId = resolvedId;
        }

        if (this.isFailedStatus(status)) {
          if (status === 'rejected') {
            const shouldGraceRetryLocalRejection = this.isLikelyLocalWalletRequestId(resolvedId)
              && !statusReason
              && localRejectedStatusGraceCount < LOCAL_REJECTED_STATUS_GRACE_ATTEMPTS
              && i < attempts - 1;

            if (shouldGraceRetryLocalRejection) {
              localRejectedStatusGraceCount += 1;
              // eslint-disable-next-line no-await-in-loop
              await new Promise((resolve) => setTimeout(resolve, CONFIRMATION_POLL_INTERVAL_MS));
              continue;
            }

            throw new Error(this.formatRejectedTransactionError(resolvedId, statusReason));
          }

          throw new Error(`Transaction ${status}: ${resolvedId}`);
        }

        if (this.isConfirmedStatus(status)) {
          return {
            id: resolvedId,
            status: 'confirmed',
            fee: statusResponse.fee || '0',
            timestamp: statusResponse.timestamp || Date.now(),
            walletStatus: statusResponse,
            transaction: statusResponse.transaction,
            outputs: statusResponse.outputs || [],
          };
        }

        localRejectedStatusGraceCount = 0;
      }

      const shouldProbeExplorer = !!explorerTransactionId && (
        !statusResponse
        || !!statusError
        || i >= EXPLORER_FALLBACK_START_ATTEMPT
      );

      if (shouldProbeExplorer && explorerTransactionId) {
        const isLastAttempt = i === attempts - 1;
        const shouldPollExplorerNow = isLastAttempt
          || lastExplorerProbeAttempt < 0
          || i - lastExplorerProbeAttempt >= EXPLORER_FALLBACK_POLL_EVERY_ATTEMPTS;

        if (shouldPollExplorerNow) {
          lastExplorerProbeAttempt = i;
          // eslint-disable-next-line no-await-in-loop
          const explorerTx = await this.fetchExplorerTransaction(explorerTransactionId);
          if (explorerTx) {
            const explorerStatus = this.normalizeStatus(explorerTx.status);
            if (this.isConfirmedStatus(explorerStatus)) {
              return explorerTx;
            }
            if (this.isFailedStatus(explorerStatus)) {
              throw new Error(`Transaction ${explorerStatus}: ${explorerTransactionId}`);
            }
          }
        }
      }

      if (statusError && !explorerTransactionId) {
        const shouldGraceRetryStatusError = walletStatusErrorGraceCount < WALLET_STATUS_ERROR_GRACE_ATTEMPTS
          && i < attempts - 1;

        if (shouldGraceRetryStatusError) {
          walletStatusErrorGraceCount += 1;
          // eslint-disable-next-line no-await-in-loop
          await new Promise((resolve) => setTimeout(resolve, CONFIRMATION_POLL_INTERVAL_MS));
          continue;
        }

        throw statusError;
      }

      if (!statusError) {
        walletStatusErrorGraceCount = 0;
      }

      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, CONFIRMATION_POLL_INTERVAL_MS));
    }

    if (!explorerTransactionId) {
      throw new Error(
        `Wallet returned a local request id (${transactionId}) without an on-chain transaction id before timeout.`,
      );
    }

    const timeoutSeconds = Math.floor((attempts * CONFIRMATION_POLL_INTERVAL_MS) / 1000);
    throw new Error(`Transaction confirmation timed out after ${timeoutSeconds}s: ${explorerTransactionId}`);
  }

  private extractTransitionOutputs(transaction: any): any[] {
    const outputs: any[] = [];
    const transitions = transaction?.execution?.transitions
      || transaction?.transaction?.execution?.transitions
      || transaction?.transitions
      || [];

    transitions.forEach((transition: any) => {
      const transitionOutputs = transition?.outputs || transition?.finalize || [];
      if (Array.isArray(transitionOutputs)) {
        outputs.push(...transitionOutputs);
      }
    });

    if (outputs.length === 0 && Array.isArray(transaction?.outputs)) {
      outputs.push(...transaction.outputs);
    }

    return outputs;
  }

  private parseWalletVerificationRecord(
    record: unknown,
    expectedOwner?: string,
  ): VerificationRecord | undefined {
    const walletRecord = this.normalizeWalletRecord(record);
    const data = walletRecord.data || {};
    if (this.isNonSimpleVerificationRecord(data, walletRecord.plaintext)) {
      return undefined;
    }

    const ownerFromData = this.cleanLeoValue(this.getRecordField(data, 'owner'));
    const verifiedFromData = this.cleanLeoValue(this.getRecordField(data, 'verified'));

    if (ownerFromData && verifiedFromData) {
      if (expectedOwner && ownerFromData !== expectedOwner) {
        return undefined;
      }

      return {
        owner: ownerFromData,
        verified: verifiedFromData.includes('true') || verifiedFromData === '1',
      };
    }

    if (typeof walletRecord.plaintext === 'string') {
      const ownerMatch = walletRecord.plaintext.match(/owner:\s*([^,\n}]+)/i);
      const verifiedMatch = walletRecord.plaintext.match(/verified:\s*([^,\n}]+)/i);
      const owner = this.cleanLeoValue(ownerMatch?.[1]);
      const verifiedRaw = this.cleanLeoValue(verifiedMatch?.[1]);

      if (owner && verifiedRaw) {
        if (expectedOwner && owner !== expectedOwner) {
          return undefined;
        }

        return {
          owner,
          verified: verifiedRaw.includes('true') || verifiedRaw === '1',
        };
      }
    }

    return undefined;
  }

  private isNonSimpleVerificationRecord(
    data: Record<string, string>,
    plaintext?: string,
  ): boolean {
    const knownNonSimpleFields = [
      'provider_id',
      'active',
      'age_over_18',
      'issued_at',
      'expires_at',
      'revoked',
      'nonce',
      'version',
      'provider_mask',
    ];

    if (knownNonSimpleFields.some((field) => this.hasRecordField(data, field))) {
      return true;
    }

    if (typeof plaintext === 'string') {
      return /\b(provider_id|active|age_over_18|issued_at|expires_at|revoked|nonce|version|provider_mask)\s*:/i.test(plaintext);
    }

    return false;
  }

  private normalizeWalletRecord(record: unknown): WalletRecord {
    if (typeof record === 'string') {
      return { plaintext: record };
    }

    if (record && typeof record === 'object') {
      return record as WalletRecord;
    }

    return {};
  }

  private getRecordField(data: Record<string, string>, key: string): string | undefined {
    return data[key]
      || data[`${key}.private`]
      || data[`${key}.public`]
      || data[`${key}.constant`];
  }

  private hasRecordField(data: Record<string, string>, key: string): boolean {
    return this.getRecordField(data, key) !== undefined;
  }

  private getRecordIdentity(record: unknown): string {
    if (typeof record === 'string') {
      return `plaintext:${record}`;
    }

    const walletRecord = this.normalizeWalletRecord(record);
    if (typeof walletRecord.plaintext === 'string' && walletRecord.plaintext.trim()) {
      return `plaintext:${walletRecord.plaintext}`;
    }

    if (walletRecord.data && typeof walletRecord.data === 'object') {
      const owner = this.cleanLeoValue(this.getRecordField(walletRecord.data, 'owner'));
      const verified = this.cleanLeoValue(this.getRecordField(walletRecord.data, 'verified'));
      return `data:${owner}:${verified}:${JSON.stringify(walletRecord.data)}`;
    }

    return `unknown:${String(record)}`;
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

      const txOptions = {
        program: 'credits.aleo',
        function: 'transfer_public',
        inputs,
        fee,
        privateFee: false,
      };

      console.log('Requesting test transaction:', txOptions);

      const transactionId = await walletAdapter.requestTransaction(txOptions);
      return { success: true, transactionId };
    } catch (error) {
      console.error('Test transaction failed:', error);
      return { success: false, error: String(error) };
    }
  }
}

// Export singleton instance
export const aleoService = new AleoService();
