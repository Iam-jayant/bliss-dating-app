import { BLISS_V3_KEYS } from '@/lib/storage/schema';

export type SubscriptionTermMonths = 1 | 3 | 12;
export type PaidTier = 'premium' | 'plus';

export interface SubscriptionTier {
  id: 'free' | PaidTier;
  name: string;
  usdMonthlyPrice: number;
  creditPricing: {
    1: number;
    3: number;
    12: number;
  };
  features: string[];
  limits: {
    dailySwipes: number;
    activeChats: number;
    superLikesPerDay: number;
    canSeeLikes: boolean;
    canBoost: boolean;
  };
}

export interface SubscriptionSelection {
  tier: PaidTier;
  termMonths: SubscriptionTermMonths;
  credits: number;
  microcredits: bigint;
}

export interface OnChainSubscriptionState {
  tier: SubscriptionTier['id'];
  expiresAt: number;
  dailySwipeLimit: number;
  maxActiveChats: number;
  swipesUsedToday: number;
  usageDate: number;
  isActive: boolean;
}

const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_BLISS_TREASURY_ADDRESS || '';
const SUBSCRIPTION_CONTRACT = process.env.NEXT_PUBLIC_SUBSCRIPTION_ACCESS_PROGRAM || 'bliss_subscription_access_v2.aleo';
const NETWORK_FEE = Number(process.env.NEXT_PUBLIC_ALEO_FEE_MICROCREDITS || 1_000_000);
const MAX_POLL_ATTEMPTS = 60;
const POLL_INTERVAL_MS = 2_000;
const MICROCREDITS_PER_CREDIT = 1_000_000;

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier['id'], SubscriptionTier> = {
  free: {
    id: 'free',
    name: 'Free',
    usdMonthlyPrice: 0,
    creditPricing: { 1: 0, 3: 0, 12: 0 },
    features: ['10 swipes/day', 'Up to 3 active chats', 'Basic matching'],
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
    usdMonthlyPrice: 9.99,
    creditPricing: { 1: 10, 3: 27, 12: 96 },
    features: ['Unlimited swipes', 'Unlimited chats', 'See who liked you', '5 Super Likes/day', 'Advanced filters'],
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
    usdMonthlyPrice: 19.99,
    creditPricing: { 1: 20, 3: 54, 12: 192 },
    features: ['All Premium features', 'Unlimited Super Likes', 'Profile boost', 'Read receipts', 'VIP badge'],
    limits: {
      dailySwipes: 0,
      activeChats: 0,
      superLikesPerDay: -1,
      canSeeLikes: true,
      canBoost: true,
    },
  },
};

export interface TransactionOptions {
  program: string;
  function: string;
  inputs: string[];
  fee: number;
  privateFee: boolean;
}

export interface AleoRecord {
  owner?: string;
  data: Record<string, string>;
  plaintext: string;
  programId?: string;
}

export type RequestRecords = (programId: string) => Promise<AleoRecord[]>;
export type ExecuteTransaction = (opts: TransactionOptions) => Promise<{ transactionId: string }>;
export type TransactionStatus = (id: string) => Promise<{ status: string; transactionId?: string }>;

function isSubscriptionRecord(record: AleoRecord): boolean {
  return typeof record.data?.tier === 'string'
    && typeof record.data?.daily_swipe_limit === 'string'
    && typeof record.data?.max_active_chats === 'string';
}

function isUsageRecord(record: AleoRecord): boolean {
  return typeof record.data?.date === 'string'
    && typeof record.data?.swipes_used === 'string';
}

function parseNumeric(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/u\d+(\.\w+)?$/, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseBigInt(raw: string | undefined): bigint {
  if (!raw) return 0n;
  const cleaned = raw.replace(/u\d+(\.\w+)?$/, '');
  try {
    return BigInt(cleaned);
  } catch {
    return 0n;
  }
}

function currentDateInt(date = new Date()): number {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${date.getUTCDate()}`.padStart(2, '0');
  return Number(`${year}${month}${day}`);
}

function extractTransactionId(result: { transactionId?: string; transaction_id?: string; id?: string }): string {
  return result.transactionId || result.transaction_id || result.id || '';
}

async function pollUntilConfirmed(
  transactionId: string,
  transactionStatus: TransactionStatus,
): Promise<void> {
  let attempts = 0;
  let status = 'pending';
  while (status === 'pending') {
    if (++attempts > MAX_POLL_ATTEMPTS) {
      throw new Error('Transaction confirmation timed out. Please check the Aleo explorer and retry.');
    }

    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    // eslint-disable-next-line no-await-in-loop
    const response = await transactionStatus(transactionId);
    status = String(response.status || 'pending').toLowerCase();
    if (status === 'failed' || status === 'rejected') {
      throw new Error(`Transaction ${status}.`);
    }
  }
}

function toMicrocredits(credits: number): bigint {
  return BigInt(credits) * BigInt(MICROCREDITS_PER_CREDIT);
}

function getSelection(tier: PaidTier, termMonths: SubscriptionTermMonths): SubscriptionSelection {
  const credits = SUBSCRIPTION_TIERS[tier].creditPricing[termMonths];
  return {
    tier,
    termMonths,
    credits,
    microcredits: toMicrocredits(credits),
  };
}

async function findLatestSubscriptionRecord(requestRecords: RequestRecords): Promise<AleoRecord | null> {
  const records = await requestRecords(SUBSCRIPTION_CONTRACT);
  const subscriptions = records.filter(isSubscriptionRecord);
  if (!subscriptions.length) return null;
  const sorted = [...subscriptions].sort((a, b) => parseNumeric(b.data?.expires_at) - parseNumeric(a.data?.expires_at));
  return sorted[0];
}

async function findLatestUsageRecord(requestRecords: RequestRecords): Promise<AleoRecord | null> {
  const records = await requestRecords(SUBSCRIPTION_CONTRACT);
  if (!records.length) return null;
  const usage = records.filter(isUsageRecord);
  if (!usage.length) return null;
  const sorted = usage.sort((a, b) => parseNumeric(b.data.date) - parseNumeric(a.data.date));
  return sorted[0];
}

async function findLatestOperationTicketRecord(
  ownerAddress: string,
  opType: 1 | 2 | 3,
  nonce: bigint,
  requestRecords: RequestRecords,
): Promise<AleoRecord | null> {
  const records = await requestRecords(SUBSCRIPTION_CONTRACT);
  for (let i = records.length - 1; i >= 0; i -= 1) {
    const record = records[i];
    const owner = record.data?.owner?.replace(/\.private$/, '');
    const recordOpType = parseNumeric(record.data?.op_type);
    const recordNonce = parseBigInt(record.data?.nonce);
    if (owner === ownerAddress && recordOpType === opType && recordNonce === nonce) {
      return record;
    }
  }
  return null;
}

async function ensureFreeSubscriptionRecord(
  ownerAddress: string,
  executeTransaction: ExecuteTransaction,
  transactionStatus: TransactionStatus,
  requestRecords: RequestRecords,
): Promise<AleoRecord> {
  const existing = await findLatestSubscriptionRecord(requestRecords);
  if (existing) return existing;

  const created = await executeTransaction({
    program: SUBSCRIPTION_CONTRACT,
    function: 'create_free_subscription',
    inputs: [ownerAddress],
    fee: NETWORK_FEE,
    privateFee: false,
  });

  await pollUntilConfirmed(created.transactionId, transactionStatus);
  const postCreate = await findLatestSubscriptionRecord(requestRecords);
  if (!postCreate) throw new Error('Failed to obtain subscription record after free subscription creation.');
  return postCreate;
}

export async function getOnChainSubscriptionState(
  requestRecords: RequestRecords,
): Promise<OnChainSubscriptionState> {
  const subRecord = await findLatestSubscriptionRecord(requestRecords);
  const usageRecord = await findLatestUsageRecord(requestRecords);
  const now = Math.floor(Date.now() / 1000);

  if (!subRecord) {
    return {
      tier: 'free',
      expiresAt: 0,
      dailySwipeLimit: SUBSCRIPTION_TIERS.free.limits.dailySwipes,
      maxActiveChats: SUBSCRIPTION_TIERS.free.limits.activeChats,
      swipesUsedToday: 0,
      usageDate: currentDateInt(),
      isActive: true,
    };
  }

  const tierRaw = parseNumeric(subRecord.data?.tier);
  const tier: SubscriptionTier['id'] = tierRaw >= 2 ? 'plus' : tierRaw >= 1 ? 'premium' : 'free';
  const expiresAt = parseNumeric(subRecord.data?.expires_at);
  const isActive = tier === 'free' || expiresAt === 0 || expiresAt > now;
  const usageDate = parseNumeric(usageRecord?.data?.date);
  const swipesUsedToday = parseNumeric(usageRecord?.data?.swipes_used);

  return {
    tier,
    expiresAt,
    dailySwipeLimit: parseNumeric(subRecord.data?.daily_swipe_limit),
    maxActiveChats: parseNumeric(subRecord.data?.max_active_chats),
    swipesUsedToday: usageDate === currentDateInt() ? swipesUsedToday : 0,
    usageDate,
    isActive,
  };
}

export async function purchaseSubscription(
  ownerAddress: string,
  tier: PaidTier,
  termMonths: SubscriptionTermMonths,
  executeTransaction: ExecuteTransaction,
  transactionStatus: TransactionStatus,
  requestRecords: RequestRecords,
): Promise<{ txHash: string; tier: PaidTier; termMonths: SubscriptionTermMonths; expiresAt: number }> {
  if (!TREASURY_ADDRESS) {
    throw new Error('NEXT_PUBLIC_BLISS_TREASURY_ADDRESS is not configured.');
  }

  const selection = getSelection(tier, termMonths);

  // 1) Private credits transfer to treasury.
  const paymentResult = await executeTransaction({
    program: 'credits.aleo',
    function: 'transfer_private',
    inputs: [TREASURY_ADDRESS, `${selection.microcredits.toString()}u64`],
    fee: NETWORK_FEE,
    privateFee: true,
  });
  const paymentTxId = extractTransactionId(paymentResult);
  if (!paymentTxId) throw new Error('Wallet returned no transaction ID for payment.');
  await pollUntilConfirmed(paymentTxId, transactionStatus);

  // 2) Upgrade subscription record.
  const currentRecord = await ensureFreeSubscriptionRecord(ownerAddress, executeTransaction, transactionStatus, requestRecords);
  const opType: 1 | 2 = tier === 'premium' ? 1 : 2;
  const issuedAt = Math.floor(Date.now() / 1000);
  const ticketExpiresAt = issuedAt + 120;
  const operationNonce = BigInt(Date.now());

  const ticketResult = await executeTransaction({
    program: SUBSCRIPTION_CONTRACT,
    function: 'issue_operation_ticket',
    inputs: [
      ownerAddress,
      `${opType}u8`,
      `${issuedAt}u32`,
      `${ticketExpiresAt}u32`,
      `${operationNonce.toString()}u64`,
    ],
    fee: NETWORK_FEE,
    privateFee: false,
  });
  const ticketTxId = extractTransactionId(ticketResult);
  if (!ticketTxId) throw new Error('Wallet returned no transaction ID for operation ticket issuance.');
  await pollUntilConfirmed(ticketTxId, transactionStatus);

  const operationTicket = await findLatestOperationTicketRecord(ownerAddress, opType, operationNonce, requestRecords);
  if (!operationTicket) throw new Error('Operation ticket record not found after issuance.');

  const currentTime = Math.floor(Date.now() / 1000);
  const expiresAt = Math.floor(Date.now() / 1000) + (termMonths * 30 * 24 * 60 * 60);

  const upgradeResult = await executeTransaction({
    program: SUBSCRIPTION_CONTRACT,
    function: tier === 'premium' ? 'upgrade_to_premium' : 'upgrade_to_plus',
    inputs: [currentRecord.plaintext, operationTicket.plaintext, ownerAddress, `${expiresAt}u32`, `${currentTime}u32`],
    fee: NETWORK_FEE,
    privateFee: false,
  });
  const upgradeTxId = extractTransactionId(upgradeResult);
  if (!upgradeTxId) throw new Error('Wallet returned no transaction ID for subscription activation.');
  await pollUntilConfirmed(upgradeTxId, transactionStatus);

  return {
    txHash: upgradeTxId,
    tier,
    termMonths,
    expiresAt,
  };
}

export async function recordSwipeOnChain(
  ownerAddress: string,
  executeTransaction: ExecuteTransaction,
  transactionStatus: TransactionStatus,
  requestRecords: RequestRecords,
): Promise<void> {
  const subscriptionRecord = await ensureFreeSubscriptionRecord(ownerAddress, executeTransaction, transactionStatus, requestRecords);
  const today = currentDateInt();

  let usageRecord = await findLatestUsageRecord(requestRecords);
  if (!usageRecord) {
    const created = await executeTransaction({
      program: SUBSCRIPTION_CONTRACT,
      function: 'create_usage_tracker',
      inputs: [ownerAddress, `${today}u32`],
      fee: NETWORK_FEE,
      privateFee: false,
    });
    await pollUntilConfirmed(created.transactionId, transactionStatus);
    usageRecord = await findLatestUsageRecord(requestRecords);
  }

  if (!usageRecord) {
    throw new Error('Unable to create usage tracker record.');
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const ticketExpiresAt = issuedAt + 120;
  const operationNonce = BigInt(Date.now());

  const ticketResult = await executeTransaction({
    program: SUBSCRIPTION_CONTRACT,
    function: 'issue_operation_ticket',
    inputs: [
      ownerAddress,
      '3u8',
      `${issuedAt}u32`,
      `${ticketExpiresAt}u32`,
      `${operationNonce.toString()}u64`,
    ],
    fee: NETWORK_FEE,
    privateFee: false,
  });
  const ticketTxId = extractTransactionId(ticketResult);
  if (!ticketTxId) throw new Error('Wallet returned no transaction ID for swipe operation ticket issuance.');
  await pollUntilConfirmed(ticketTxId, transactionStatus);

  const operationTicket = await findLatestOperationTicketRecord(ownerAddress, 3, operationNonce, requestRecords);
  if (!operationTicket) throw new Error('Swipe operation ticket record not found after issuance.');

  const currentTime = Math.floor(Date.now() / 1000);

  const result = await executeTransaction({
    program: SUBSCRIPTION_CONTRACT,
    function: 'record_swipe',
    inputs: [subscriptionRecord.plaintext, usageRecord.plaintext, operationTicket.plaintext, ownerAddress, `${today}u32`, `${currentTime}u32`],
    fee: NETWORK_FEE,
    privateFee: false,
  });
  await pollUntilConfirmed(result.transactionId, transactionStatus);
}

export interface SubscriptionDetails {
  tier: SubscriptionTier;
  termMonths: SubscriptionTermMonths | null;
  txHash: string | null;
  activatedAt: number | null;
  expiresAt: number | null;
}

function cacheKey(walletAddress: string): string {
  return `${BLISS_V3_KEYS.subscriptionPrefix}${walletAddress}`;
}

export function saveSubscriptionToCache(
  walletAddress: string,
  tier: PaidTier,
  termMonths: SubscriptionTermMonths,
  txHash: string,
  expiresAt: number,
): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(cacheKey(walletAddress), JSON.stringify({
    tier,
    termMonths,
    txHash,
    activatedAt: Date.now(),
    expiresAt,
  }));
}

export function getSubscriptionDetails(walletAddress: string): SubscriptionDetails {
  if (typeof window === 'undefined') {
    return { tier: SUBSCRIPTION_TIERS.free, termMonths: null, txHash: null, activatedAt: null, expiresAt: null };
  }

  const raw = localStorage.getItem(cacheKey(walletAddress));
  if (!raw) return { tier: SUBSCRIPTION_TIERS.free, termMonths: null, txHash: null, activatedAt: null, expiresAt: null };

  try {
    const parsed = JSON.parse(raw) as {
      tier?: SubscriptionTier['id'];
      termMonths?: SubscriptionTermMonths;
      txHash?: string;
      activatedAt?: number;
      expiresAt?: number;
    };
    const tier = parsed.tier && SUBSCRIPTION_TIERS[parsed.tier] ? SUBSCRIPTION_TIERS[parsed.tier] : SUBSCRIPTION_TIERS.free;
    return {
      tier,
      termMonths: parsed.termMonths || null,
      txHash: parsed.txHash || null,
      activatedAt: parsed.activatedAt || null,
      expiresAt: parsed.expiresAt || null,
    };
  } catch {
    return { tier: SUBSCRIPTION_TIERS.free, termMonths: null, txHash: null, activatedAt: null, expiresAt: null };
  }
}

export function getSubscriptionFromCache(walletAddress: string): SubscriptionTier {
  const details = getSubscriptionDetails(walletAddress);
  if (details.tier.id === 'free') return SUBSCRIPTION_TIERS.free;
  if (details.expiresAt && details.expiresAt < Math.floor(Date.now() / 1000)) return SUBSCRIPTION_TIERS.free;
  return details.tier;
}

function dailyUsageKey(prefix: string, walletAddress: string): string {
  const today = new Date().toISOString().split('T')[0];
  return `${prefix}${walletAddress}_${today}`;
}

export function getDailySwipesUsed(walletAddress: string): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(dailyUsageKey(BLISS_V3_KEYS.swipeUsagePrefix, walletAddress)) || '0', 10);
}

export function incrementDailySwipes(walletAddress: string): void {
  if (typeof window === 'undefined') return;
  const key = dailyUsageKey(BLISS_V3_KEYS.swipeUsagePrefix, walletAddress);
  const current = parseInt(localStorage.getItem(key) || '0', 10);
  localStorage.setItem(key, String(current + 1));
}

export function decrementDailySwipes(walletAddress: string): void {
  if (typeof window === 'undefined') return;
  const key = dailyUsageKey(BLISS_V3_KEYS.swipeUsagePrefix, walletAddress);
  const current = parseInt(localStorage.getItem(key) || '0', 10);
  if (current > 0) localStorage.setItem(key, String(current - 1));
}

export interface PendingSwipeSettlement {
  id: string;
  walletAddress: string;
  createdAt: number;
  attempts: number;
  lastAttemptAt: number | null;
}

interface FlushPendingSwipeSettlementOptions {
  maxItems?: number;
  minRetryIntervalMs?: number;
}

function pendingSwipeSettlementKey(walletAddress: string): string {
  return `${BLISS_V3_KEYS.pendingSwipeSettlementPrefix}${walletAddress}`;
}

function readPendingSwipeSettlements(walletAddress: string): PendingSwipeSettlement[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(pendingSwipeSettlementKey(walletAddress));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as PendingSwipeSettlement[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writePendingSwipeSettlements(walletAddress: string, items: PendingSwipeSettlement[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(pendingSwipeSettlementKey(walletAddress), JSON.stringify(items));
}

export function getPendingSwipeSettlements(walletAddress: string): PendingSwipeSettlement[] {
  return readPendingSwipeSettlements(walletAddress);
}

export function getPendingSwipeSettlementCount(walletAddress: string): number {
  return readPendingSwipeSettlements(walletAddress).length;
}

export function queuePendingSwipeSettlement(walletAddress: string): PendingSwipeSettlement {
  const current = readPendingSwipeSettlements(walletAddress);
  const settlement: PendingSwipeSettlement = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 12)}`,
    walletAddress,
    createdAt: Date.now(),
    attempts: 0,
    lastAttemptAt: null,
  };
  current.push(settlement);
  writePendingSwipeSettlements(walletAddress, current);
  return settlement;
}

export function popLastPendingSwipeSettlement(walletAddress: string): boolean {
  const current = readPendingSwipeSettlements(walletAddress);
  if (!current.length) return false;
  current.pop();
  writePendingSwipeSettlements(walletAddress, current);
  return true;
}

export async function flushPendingSwipeSettlements(
  walletAddress: string,
  executeTransaction: ExecuteTransaction,
  transactionStatus: TransactionStatus,
  requestRecords: RequestRecords,
  options?: FlushPendingSwipeSettlementOptions,
): Promise<{ settled: number; remaining: number; failed: number }> {
  const maxItems = options?.maxItems ?? 1;
  const minRetryIntervalMs = options?.minRetryIntervalMs ?? 30_000;

  const initialQueue = readPendingSwipeSettlements(walletAddress);
  if (!initialQueue.length) {
    return { settled: 0, remaining: 0, failed: 0 };
  }

  const now = Date.now();
  const processing = initialQueue.slice(0, maxItems);
  const processingIds = new Set(processing.map((item) => item.id));
  const retryById = new Map<string, PendingSwipeSettlement>();
  let settled = 0;
  let failed = 0;

  for (const item of processing) {
    if (item.lastAttemptAt && now - item.lastAttemptAt < minRetryIntervalMs) {
      retryById.set(item.id, item);
      continue;
    }

    try {
      // eslint-disable-next-line no-await-in-loop
      await recordSwipeOnChain(walletAddress, executeTransaction, transactionStatus, requestRecords);
      settled += 1;
      decrementDailySwipes(walletAddress);
    } catch {
      failed += 1;
      retryById.set(item.id, {
        ...item,
        attempts: item.attempts + 1,
        lastAttemptAt: now,
      });
    }
  }

  // Re-read latest queue so we do not overwrite items queued while this flush was running.
  const latestQueue = readPendingSwipeSettlements(walletAddress);
  const latestIds = new Set(latestQueue.map((item) => item.id));
  const retry = Array.from(retryById.values()).filter((item) => latestIds.has(item.id));
  const remainingLatest = latestQueue.filter((item) => !processingIds.has(item.id));
  const next = [...retry, ...remainingLatest];
  writePendingSwipeSettlements(walletAddress, next);
  return {
    settled,
    remaining: next.length,
    failed,
  };
}

export function getDailySuperLikesUsed(walletAddress: string): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(dailyUsageKey(BLISS_V3_KEYS.superLikeUsagePrefix, walletAddress)) || '0', 10);
}

export function incrementDailySuperLikes(walletAddress: string): void {
  if (typeof window === 'undefined') return;
  const key = dailyUsageKey(BLISS_V3_KEYS.superLikeUsagePrefix, walletAddress);
  const current = parseInt(localStorage.getItem(key) || '0', 10);
  localStorage.setItem(key, String(current + 1));
}

export function getSelectionPricing(tier: PaidTier, termMonths: SubscriptionTermMonths): SubscriptionSelection {
  return getSelection(tier, termMonths);
}
