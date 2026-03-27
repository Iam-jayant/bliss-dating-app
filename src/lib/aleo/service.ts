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
        throw new Error('Verification record is taking longer to index after confirmation. Please retry verification in a few seconds.');
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

  private isExplorerTransactionId(value: string): boolean {
    return /^at1[0-9a-z]+$/.test(value);
  }

  private normalizeStatus(status: unknown): string {
    return String(status || '').toLowerCase();
  }

  private isConfirmedStatus(status: string): boolean {
    return status === 'accepted'
      || status === 'confirmed'
      || status === 'finalized'
      || status === 'completed'
      || status === 'success';
  }

  private isFailedStatus(status: string): boolean {
    return status === 'failed'
      || status === 'rejected'
      || status === 'error'
      || status === 'cancelled'
      || status === 'canceled';
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
      const records = await requestRecords(this.programId, true);
      if (!Array.isArray(records) || records.length === 0) return null;

      for (let i = records.length - 1; i >= 0; i -= 1) {
        const record = records[i] as WalletRecord;
        if (!this.parseWalletVerificationRecord(record)) {
          continue;
        }

        if (typeof record?.plaintext === 'string' && record.plaintext.trim()) {
          return record.plaintext;
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
      const records = await requestRecords(this.programId, true);
      if (!Array.isArray(records) || records.length === 0) return undefined;

      for (let i = records.length - 1; i >= 0; i -= 1) {
        const parsedRecord = this.parseWalletVerificationRecord(records[i] as WalletRecord, expectedOwner);
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
    attempts = 60,
  ): Promise<any> {
    // 1) Preferred path: wallet-native status polling.
    if (walletAdapter?.transactionStatus) {
      for (let i = 0; i < attempts; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const statusResponse = await walletAdapter.transactionStatus(transactionId);
        const status = this.normalizeStatus(statusResponse?.status);
        const resolvedId = this.extractTransactionId(statusResponse) || transactionId;

        if (this.isFailedStatus(status)) {
          throw new Error(`Transaction ${status}: ${resolvedId}`);
        }

        if (this.isConfirmedStatus(status)) {
          // Rely on wallet-native status payload first. Explorer endpoints can lag or be unavailable.
          return {
            id: resolvedId,
            status: 'confirmed',
            fee: statusResponse?.fee || '0',
            timestamp: statusResponse?.timestamp || Date.now(),
            walletStatus: statusResponse,
            transaction: statusResponse?.transaction,
            outputs: statusResponse?.outputs || [],
          };
        }

        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // 2) Fallback: explorer polling only for real explorer tx ids.
    if (this.isExplorerTransactionId(transactionId)) {
      for (let i = 0; i < attempts; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const data = await this.fetchExplorerTransaction(transactionId);
        if (data) {
          const status = this.normalizeStatus(data.status);
          if (this.isConfirmedStatus(status)) return data;
          if (this.isFailedStatus(status)) {
            throw new Error(`Transaction ${status}: ${transactionId}`);
          }
        }
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    if (!this.isExplorerTransactionId(transactionId)) {
      throw new Error(
        `Wallet returned a local request id (${transactionId}) without a confirmed on-chain transaction id.`,
      );
    }

    throw new Error(`Transaction confirmation timed out: ${transactionId}`);
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
    record: WalletRecord,
    expectedOwner?: string,
  ): VerificationRecord | undefined {
    const data = record?.data || {};
    if (this.isNonSimpleVerificationRecord(data, record?.plaintext)) {
      return undefined;
    }

    const ownerFromData = this.cleanLeoValue(data.owner);
    const verifiedFromData = this.cleanLeoValue(data.verified);

    if (ownerFromData && verifiedFromData) {
      if (expectedOwner && ownerFromData !== expectedOwner) {
        return undefined;
      }

      return {
        owner: ownerFromData,
        verified: verifiedFromData.includes('true') || verifiedFromData === '1',
      };
    }

    if (typeof record?.plaintext === 'string') {
      const ownerMatch = record.plaintext.match(/owner:\s*([^,\n}]+)/i);
      const verifiedMatch = record.plaintext.match(/verified:\s*([^,\n}]+)/i);
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

    if (knownNonSimpleFields.some((field) => field in data)) {
      return true;
    }

    if (typeof plaintext === 'string') {
      return /\b(provider_id|active|age_over_18|issued_at|expires_at|revoked|nonce|version|provider_mask)\s*:/i.test(plaintext);
    }

    return false;
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
