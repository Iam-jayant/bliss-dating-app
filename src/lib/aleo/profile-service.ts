import { ALEO_CONFIG } from './config';

const PROFILE_PROGRAM = process.env.NEXT_PUBLIC_PROFILE_VERIFICATION_PROGRAM || 'bliss_profile_verification_v4.aleo';
const MATCHING_PROGRAM = process.env.NEXT_PUBLIC_COMPATIBILITY_MATCHING_PROGRAM || 'bliss_compatibility_matching_v2.aleo';
const SUBSCRIPTION_PROGRAM = process.env.NEXT_PUBLIC_SUBSCRIPTION_ACCESS_PROGRAM || 'bliss_subscription_access_v2.aleo';
const AGE_PROGRAM = process.env.NEXT_PUBLIC_AGE_VERIFICATION_PROGRAM || 'bliss_age_verification_v4.aleo';

type WalletTransactionResult = string | { transactionId?: string; transaction_id?: string; id?: string };

export interface WalletExecutionAdapter {
  publicKey?: string;
  requestTransaction?: (tx: {
    program: string;
    function: string;
    inputs: string[];
    fee: number;
    privateFee: boolean;
  }) => Promise<WalletTransactionResult>;
  requestRecords?: (programId: string) => Promise<Array<{ plaintext: string; data?: Record<string, string> }>>;
}

function extractTransactionId(result: WalletTransactionResult): string {
  if (typeof result === 'string') return result;
  return result.transactionId || result.transaction_id || result.id || '';
}

function toU32Timestamp(value = Date.now()): number {
  return Math.floor(value / 1000);
}

function parseU8(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/u\d+(\.\w+)?$/, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseU16(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/u\d+(\.\w+)?$/, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseU32(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/u\d+(\.\w+)?$/, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseField(raw: string | undefined): string | null {
  if (!raw) return null;
  return raw.replace(/field(\.\w+)?$/, 'field');
}

function parseLeoBool(raw: string | undefined): boolean {
  if (!raw) return false;
  const cleaned = raw.replace(/\.(private|public|constant)$/i, '');
  return cleaned === 'true' || cleaned === '1';
}

function parseU64(raw: string | undefined): bigint {
  if (!raw) return 0n;
  const cleaned = raw.replace(/u\d+(\.\w+)?$/, '');
  try {
    return BigInt(cleaned);
  } catch {
    return 0n;
  }
}

export class AleoProfileService {
  async createProfileOnChain(
    walletAdapter: WalletExecutionAdapter,
    interestsBitfield: number,
    datingIntent: number,
    locationGeohash: number,
    profileDataCidField: bigint,
  ): Promise<string> {
    if (!walletAdapter.publicKey || !walletAdapter.requestTransaction || !walletAdapter.requestRecords) {
      throw new Error('Wallet not connected');
    }

    const quorumBridge = await this.getLatestValidQuorumBridgePayload(
      walletAdapter.requestRecords,
      walletAdapter.publicKey,
    );
    if (!quorumBridge) {
      throw new Error('Valid age credential is required before creating profile.');
    }

    const currentTime = toU32Timestamp();
    let tx: WalletTransactionResult;

    try {
      tx = await walletAdapter.requestTransaction({
        program: PROFILE_PROGRAM,
        function: 'create_profile_with_age_bridge',
        inputs: [
          `${interestsBitfield}u8`,
          `${datingIntent}u8`,
          `${locationGeohash}u32`,
          `${quorumBridge.providerMask}u8`,
          `${quorumBridge.issuedAt}u32`,
          `${quorumBridge.expiresAt}u32`,
          `${quorumBridge.nonce.toString()}u64`,
          `${quorumBridge.version}u16`,
          `${profileDataCidField.toString()}field`,
          `${currentTime}u32`,
          walletAdapter.publicKey,
        ],
        fee: ALEO_CONFIG.FEE_MICROCREDITS,
        privateFee: false,
      });
    } catch (error) {
      const allowLegacy = process.env.NEXT_PUBLIC_PROFILE_ALLOW_LEGACY_AGE_BOOL === 'true';
      if (!allowLegacy) {
        throw error;
      }

      tx = await walletAdapter.requestTransaction({
        program: PROFILE_PROGRAM,
        function: 'create_profile',
        inputs: [
          `${interestsBitfield}u8`,
          `${datingIntent}u8`,
          `${locationGeohash}u32`,
          'true',
          `${profileDataCidField.toString()}field`,
          walletAdapter.publicKey,
        ],
        fee: ALEO_CONFIG.FEE_MICROCREDITS,
        privateFee: false,
      });
    }

    const txId = extractTransactionId(tx);
    if (!txId) throw new Error('Failed to submit profile creation transaction');
    return txId;
  }

  async updateProfileOnChain(
    walletAdapter: WalletExecutionAdapter,
    interestsBitfield: number,
    datingIntent: number,
    locationGeohash: number,
    profileDataCidField: bigint,
  ): Promise<string> {
    if (!walletAdapter.publicKey || !walletAdapter.requestTransaction || !walletAdapter.requestRecords) {
      throw new Error('Wallet does not support record access for profile updates');
    }

    const profileRecord = await this.findLatestProfileRecord(walletAdapter);
    if (!profileRecord) {
      throw new Error('No existing profile record found to update');
    }

    const tx = await walletAdapter.requestTransaction({
      program: PROFILE_PROGRAM,
      function: 'update_profile',
      inputs: [
        profileRecord.plaintext,
        walletAdapter.publicKey,
        `${interestsBitfield}u8`,
        `${datingIntent}u8`,
        `${locationGeohash}u32`,
        `${profileDataCidField.toString()}field`,
      ],
      fee: ALEO_CONFIG.FEE_MICROCREDITS,
      privateFee: false,
    });

    const txId = extractTransactionId(tx);
    if (!txId) throw new Error('Failed to submit profile update transaction');
    return txId;
  }

  async recordAction(
    walletAdapter: WalletExecutionAdapter,
    targetWallet: string,
    actionType: 'pass' | 'like' | 'superlike',
  ): Promise<string> {
    if (!walletAdapter.publicKey || !walletAdapter.requestTransaction || !walletAdapter.requestRecords) {
      throw new Error('Wallet not connected or record access unavailable');
    }

    const action = actionType === 'pass' ? '0u8' : actionType === 'like' ? '1u8' : '2u8';
    const issuedAt = toU32Timestamp();
    const expiresAt = issuedAt + 120;
    const nonce = BigInt(Date.now());

    const ticketTx = await walletAdapter.requestTransaction({
      program: MATCHING_PROGRAM,
      function: 'issue_action_ticket',
      inputs: [
        walletAdapter.publicKey,
        targetWallet,
        action,
        `${issuedAt}u32`,
        `${expiresAt}u32`,
        `${nonce.toString()}u64`,
      ],
      fee: ALEO_CONFIG.FEE_MICROCREDITS,
      privateFee: false,
    });

    const ticketTxId = extractTransactionId(ticketTx);
    if (!ticketTxId) throw new Error('Failed to submit action ticket transaction');

    const actionTicket = await this.findLatestActionTicketRecord(
      walletAdapter,
      targetWallet,
      action,
      nonce,
    );
    if (!actionTicket) {
      throw new Error('Action ticket record not found after ticket issuance');
    }

    const tx = await walletAdapter.requestTransaction({
      program: MATCHING_PROGRAM,
      function: 'record_action',
      inputs: [
        actionTicket.plaintext,
        `${toU32Timestamp()}u32`,
      ],
      fee: ALEO_CONFIG.FEE_MICROCREDITS,
      privateFee: false,
    });

    const txId = extractTransactionId(tx);
    if (!txId) throw new Error('Failed to submit match action transaction');
    return txId;
  }

  async getOnChainSubscriptionTier(walletAdapter: WalletExecutionAdapter): Promise<0 | 1 | 2> {
    if (!walletAdapter.requestRecords) return 0;
    const records = await walletAdapter.requestRecords(SUBSCRIPTION_PROGRAM);
    if (!records.length) return 0;
    const now = Math.floor(Date.now() / 1000);

    const activeTier = records
      .filter((record) => {
        const tier = parseU8(record.data?.tier);
        const expiresAt = parseU32(record.data?.expires_at);
        return tier === 0 || expiresAt === 0 || expiresAt > now;
      })
      .map((record) => parseU8(record.data?.tier))
      .sort((a, b) => b - a)[0];

    if (activeTier >= 2) return 2;
    if (activeTier >= 1) return 1;
    return 0;
  }

  async getProfileCidField(walletAdapter: WalletExecutionAdapter): Promise<string | null> {
    const profileRecord = await this.findLatestProfileRecord(walletAdapter);
    if (!profileRecord) return null;
    return parseField(profileRecord.data?.profile_data_cid);
  }

  private async findLatestProfileRecord(
    walletAdapter: WalletExecutionAdapter,
  ): Promise<{ plaintext: string; data?: Record<string, string> } | null> {
    if (!walletAdapter.requestRecords) return null;
    const records = await walletAdapter.requestRecords(PROFILE_PROGRAM);
    if (!records.length) return null;
    return records[records.length - 1];
  }

  private async getLatestValidQuorumBridgePayload(
    requestRecords: NonNullable<WalletExecutionAdapter['requestRecords']>,
    ownerAddress: string,
  ): Promise<{
    providerMask: number;
    issuedAt: number;
    expiresAt: number;
    nonce: bigint;
    version: number;
  } | null> {
    const records = await requestRecords(AGE_PROGRAM);
    if (!records.length) return null;

    const now = Math.floor(Date.now() / 1000);

    for (let i = records.length - 1; i >= 0; i -= 1) {
      const record = records[i];
      const owner = record.data?.owner?.replace(/\.private$/, '');
      if (owner !== ownerAddress) continue;

      const verified = parseLeoBool(record.data?.verified);
      if (!verified) continue;

      const isRevoked = parseLeoBool(record.data?.revoked);
      if (isRevoked) continue;

      const providerMask = parseU8(record.data?.provider_mask);
      if (providerMask <= 0) continue;

      const issuedAt = parseU32(record.data?.issued_at);
      const expiresAt = parseU32(record.data?.expires_at);
      const nonce = parseU64(record.data?.nonce);
      const version = parseU16(record.data?.version);

      if (issuedAt <= 0 || expiresAt <= 0) continue;
      if (version <= 0 || nonce <= 0n) continue;
      if (issuedAt > now || expiresAt < now) continue;

      return {
        providerMask,
        issuedAt,
        expiresAt,
        nonce,
        version,
      };
    }

    return null;
  }

  private async findLatestActionTicketRecord(
    walletAdapter: WalletExecutionAdapter,
    targetWallet: string,
    action: string,
    nonce: bigint,
  ): Promise<{ plaintext: string; data?: Record<string, string> } | null> {
    if (!walletAdapter.requestRecords || !walletAdapter.publicKey) return null;
    const records = await walletAdapter.requestRecords(MATCHING_PROGRAM);
    const actionAsNumber = parseInt(action, 10);

    for (let i = records.length - 1; i >= 0; i -= 1) {
      const record = records[i];
      const owner = record.data?.owner?.replace(/\.private$/, '');
      const target = record.data?.target?.replace(/\.private$/, '');
      const recordAction = parseU8(record.data?.action);
      const recordNonce = parseU64(record.data?.nonce);

      if (
        owner === walletAdapter.publicKey
        && target === targetWallet
        && recordAction === actionAsNumber
        && recordNonce === nonce
      ) {
        return record;
      }
    }

    return null;
  }
}

export const aleoProfileService = new AleoProfileService();

