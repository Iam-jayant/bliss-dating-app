// ---------------------------------------------------------------------------
// ARC-20 Private USDC Payment Service for Bliss
// All payments use transfer_private to preserve user privacy on-chain.
// ---------------------------------------------------------------------------

export interface SubscriptionTier {
  id: 'free' | 'premium' | 'plus';
  name: string;
  /** Price in the smallest token unit (micro-USDC, 6 decimals). */
  price: number;
  usdPrice: number;
  features: string[];
  limits: {
    dailySwipes: number;
    activeChats: number;
    superLikesPerDay: number;
    canSeeLikes: boolean;
    canBoost: boolean;
  };
}

/** ARC-20 token configuration for private USDC on Aleo. */
export const ARC20_CONFIG = {
  /** The deployed ARC-20 token program on Aleo testnet. */
  TOKEN_PROGRAM: process.env.NEXT_PUBLIC_ARC20_TOKEN_PROGRAM || 'token_registry.aleo',
  /** Field element identifying the USDC token inside the registry. */
  TOKEN_ID: process.env.NEXT_PUBLIC_ARC20_USDC_TOKEN_ID || '3443843282313283355522573239085696902919850365217539366784739393210722344986field',
  /** Number of decimal places for the token (USDC = 6). */
  DECIMALS: 6,
  /** Fee in microcredits charged by the network for executing the tx. */
  NETWORK_FEE: 500_000,
} as const;

/**
 * Convert a USD amount (e.g. 9.99) to the integer micro-token representation.
 * Uses integer math to avoid floating-point drift.
 */
export function usdToMicroToken(usd: number): bigint {
  // Multiply in cents first, then scale to micro-units to avoid float issues.
  const cents = Math.round(usd * 100);
  const scale = 10 ** (ARC20_CONFIG.DECIMALS - 2); // 6-2 = 10_000
  return BigInt(cents) * BigInt(scale);
}

export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    usdPrice: 0,
    features: ['10 swipes per day', 'Up to 3 active chats', 'Basic matching'],
    limits: {
      dailySwipes: 10,
      activeChats: 3,
      superLikesPerDay: 0,
      canSeeLikes: false,
      canBoost: false,
    },
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 9_990_000, // $9.99 in micro-USDC
    usdPrice: 9.99,
    features: [
      'Unlimited swipes',
      'Unlimited chats',
      'See who liked you',
      '5 Super Likes per day',
      'Advanced filters',
    ],
    limits: {
      dailySwipes: 0,
      activeChats: 0,
      superLikesPerDay: 5,
      canSeeLikes: true,
      canBoost: false,
    },
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    price: 19_990_000, // $19.99 in micro-USDC
    usdPrice: 19.99,
    features: [
      'All Premium features',
      'Unlimited Super Likes',
      'Profile boost',
      'Read receipts',
      'VIP badge',
      'Priority matching',
    ],
    limits: {
      dailySwipes: 0,
      activeChats: 0,
      superLikesPerDay: -1,
      canSeeLikes: true,
      canBoost: true,
    },
  },
};

// ---------------------------------------------------------------------------
// Wallet adapter types
// ---------------------------------------------------------------------------

const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_BLISS_TREASURY_ADDRESS!;
const SUBSCRIPTION_CONTRACT =
  process.env.NEXT_PUBLIC_SUBSCRIPTION_ACCESS_PROGRAM || 'bliss_subscription_access.aleo';

export interface TransactionOptions {
  program: string;
  function: string;
  inputs: string[];
  fee: number;
  privateFee: boolean;
}

/** Shape returned by the Provable wallet adapter for a single on-chain record. */
export interface AleoRecord {
  owner: string;
  data: Record<string, string>;
  nonce: string;
  /** The plaintext serialisation required as a transaction input. */
  plaintext: string;
  /** Program that owns the record. */
  programId: string;
}

export type RequestRecords = (programId: string) => Promise<AleoRecord[]>;
export type ExecuteTransaction = (opts: TransactionOptions) => Promise<{ transactionId: string }>;
export type TransactionStatus = (id: string) => Promise<{ status: string; transactionId?: string }>;

// ---------------------------------------------------------------------------
// Record helpers
// ---------------------------------------------------------------------------

/**
 * Locate a private ARC-20 token record with sufficient balance.
 *
 * The record's `data` map is expected to contain at least:
 *   - `token_id`  – must match the configured USDC token id
 *   - `amount`    – encoded as `"<value>u64.private"` or `"<value>u64"`
 *
 * Never falls back to public records. If no suitable private record is found
 * we throw a descriptive error so the UI can guide the user.
 */
export async function findPrivateTokenRecord(
  requestRecords: RequestRecords,
  requiredAmount: bigint,
): Promise<AleoRecord> {
  let records: AleoRecord[];
  try {
    records = await requestRecords(ARC20_CONFIG.TOKEN_PROGRAM);
  } catch {
    throw new Error(
      'Unable to fetch token records from your wallet. ' +
      'Make sure you have private USDC and that your wallet is unlocked.',
    );
  }

  if (!records || records.length === 0) {
    throw new Error(
      'No private USDC records found in your wallet. ' +
      'Please deposit USDC into your Aleo wallet using a private transfer before purchasing.',
    );
  }

  // Parse the amount out of the record data, handling the
  // `"12345u64.private"` encoding that Shield / Leo wallets use.
  const parseAmount = (raw: string | undefined): bigint => {
    if (!raw) return 0n;
    const cleaned = raw.replace(/u\d+(\.\w+)?$/, '');
    try { return BigInt(cleaned); } catch { return 0n; }
  };

  const configuredTokenId = ARC20_CONFIG.TOKEN_ID;

  // Filter to USDC records and sort descending by amount so we pick the
  // best-fit record (largest first, simplest approach).
  const suitable = records
    .filter((r) => {
      const tid = r.data?.['token_id'];
      if (!tid) return false;
      const tidCleaned = tid.replace(/field(\.\w+)?$/, 'field');
      return tidCleaned === configuredTokenId;
    })
    .map((r) => ({ record: r, amount: parseAmount(r.data?.['amount']) }))
    .filter((r) => r.amount >= requiredAmount)
    .sort((a, b) => (a.amount > b.amount ? -1 : 1));

  if (suitable.length === 0) {
    throw new Error(
      `Insufficient private USDC balance. ` +
      `You need at least ${requiredAmount.toString()} micro-USDC. ` +
      `Please top up your wallet with a private transfer and try again.`,
    );
  }

  return suitable[0].record;
}

// ---------------------------------------------------------------------------
// Purchase subscription (private ARC-20 transfer)
// ---------------------------------------------------------------------------

const MAX_POLL_ATTEMPTS = 60; // ~2 minutes at 2 s intervals

export async function purchaseSubscription(
  tier: 'premium' | 'plus',
  executeTransaction: ExecuteTransaction,
  transactionStatus: TransactionStatus,
  requestRecords: RequestRecords,
): Promise<{ txHash: string; tier: string }> {
  const requiredAmount = BigInt(SUBSCRIPTION_TIERS[tier].price);

  // 1. Find a private USDC record with enough balance.
  const tokenRecord = await findPrivateTokenRecord(requestRecords, requiredAmount);

  // 2. Build the private transfer transaction.
  //    transfer_private(token: record, to: address, amount: u64)
  const paymentTx: TransactionOptions = {
    program: ARC20_CONFIG.TOKEN_PROGRAM,
    function: 'transfer_private',
    inputs: [
      tokenRecord.plaintext,              // The private token record
      TREASURY_ADDRESS,                    // Recipient (Bliss treasury)
      `${requiredAmount.toString()}u64`,   // Amount in micro-USDC
    ],
    fee: ARC20_CONFIG.NETWORK_FEE,
    privateFee: true, // Pay the network fee privately as well
  };

  const result = await executeTransaction(paymentTx);

  // 3. Poll until the payment is confirmed (or fails).
  let status = 'pending';
  let attempts = 0;
  while (status === 'pending') {
    if (++attempts > MAX_POLL_ATTEMPTS) {
      throw new Error(
        'Transaction confirmation timed out. Your payment may still be processing — ' +
        'check the transaction on the Aleo explorer and contact support if needed.',
      );
    }
    await new Promise((r) => setTimeout(r, 2000));
    const s = await transactionStatus(result.transactionId);
    status = s.status.toLowerCase();
    if (status === 'failed' || status === 'rejected') {
      throw new Error(`Payment transaction ${status}. No funds were deducted.`);
    }
  }

  // 4. Activate the subscription on-chain.
  const subTx: TransactionOptions = {
    program: SUBSCRIPTION_CONTRACT,
    function: tier === 'premium' ? 'create_subscription' : 'upgrade_subscription',
    inputs: [tier === 'premium' ? '1u8' : '2u8'],
    fee: ARC20_CONFIG.NETWORK_FEE,
    privateFee: true,
  };

  const subResult = await executeTransaction(subTx);
  return { txHash: subResult.transactionId, tier };
}

export function getSubscriptionFromCache(walletAddress: string): SubscriptionTier {
  if (typeof window === 'undefined') return SUBSCRIPTION_TIERS.free;
  try {
    const cached = localStorage.getItem(`bliss_sub_${walletAddress}`);
    if (cached) {
      const data = JSON.parse(cached);
      if (data.tier && SUBSCRIPTION_TIERS[data.tier]) {
        return SUBSCRIPTION_TIERS[data.tier];
      }
    }
  } catch { /* ignore */ }
  return SUBSCRIPTION_TIERS.free;
}

export interface SubscriptionDetails {
  tier: SubscriptionTier;
  txHash: string | null;
  activatedAt: number | null;
}

export function getSubscriptionDetails(walletAddress: string): SubscriptionDetails {
  if (typeof window === 'undefined') return { tier: SUBSCRIPTION_TIERS.free, txHash: null, activatedAt: null };
  try {
    const cached = localStorage.getItem(`bliss_sub_${walletAddress}`);
    if (cached) {
      const data = JSON.parse(cached);
      if (data.tier && SUBSCRIPTION_TIERS[data.tier]) {
        return {
          tier: SUBSCRIPTION_TIERS[data.tier],
          txHash: data.txHash ?? null,
          activatedAt: data.activatedAt ?? null,
        };
      }
    }
  } catch { /* ignore */ }
  return { tier: SUBSCRIPTION_TIERS.free, txHash: null, activatedAt: null };
}

export function saveSubscriptionToCache(walletAddress: string, tier: 'premium' | 'plus', txHash: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`bliss_sub_${walletAddress}`, JSON.stringify({
    tier,
    txHash,
    activatedAt: Date.now(),
  }));
}

export function getDailySwipesUsed(walletAddress: string): number {
  if (typeof window === 'undefined') return 0;
  const today = new Date().toISOString().split('T')[0];
  const key = `bliss_swipes_${walletAddress}_${today}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}

export function incrementDailySwipes(walletAddress: string): void {
  if (typeof window === 'undefined') return;
  const today = new Date().toISOString().split('T')[0];
  const key = `bliss_swipes_${walletAddress}_${today}`;
  const current = parseInt(localStorage.getItem(key) || '0', 10);
  localStorage.setItem(key, String(current + 1));
}

export function decrementDailySwipes(walletAddress: string): void {
  if (typeof window === 'undefined') return;
  const today = new Date().toISOString().split('T')[0];
  const key = `bliss_swipes_${walletAddress}_${today}`;
  const current = parseInt(localStorage.getItem(key) || '0', 10);
  if (current > 0) localStorage.setItem(key, String(current - 1));
}

export function getDailySuperLikesUsed(walletAddress: string): number {
  if (typeof window === 'undefined') return 0;
  const today = new Date().toISOString().split('T')[0];
  const key = `bliss_superlikes_${walletAddress}_${today}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}

export function incrementDailySuperLikes(walletAddress: string): void {
  if (typeof window === 'undefined') return;
  const today = new Date().toISOString().split('T')[0];
  const key = `bliss_superlikes_${walletAddress}_${today}`;
  const current = parseInt(localStorage.getItem(key) || '0', 10);
  localStorage.setItem(key, String(current + 1));
}
