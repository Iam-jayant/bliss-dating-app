export interface SubscriptionTier {
  id: 'free' | 'premium' | 'plus';
  name: string;
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
    price: 10_000_000,
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
    price: 20_000_000,
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

const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_BLISS_TREASURY_ADDRESS!;
const SUBSCRIPTION_CONTRACT = process.env.NEXT_PUBLIC_SUBSCRIPTION_ACCESS_PROGRAM || 'bliss_subscription_access.aleo';

export interface TransactionOptions {
  program: string;
  function: string;
  inputs: string[];
  fee: number;
  privateFee: boolean;
}

export type ExecuteTransaction = (opts: TransactionOptions) => Promise<{ transactionId: string }>;
export type TransactionStatus = (id: string) => Promise<{ status: string; transactionId?: string }>;

export async function purchaseSubscription(
  tier: 'premium' | 'plus',
  executeTransaction: ExecuteTransaction,
  transactionStatus: TransactionStatus,
): Promise<{ txHash: string; tier: string }> {
  const paymentTx: TransactionOptions = {
    program: 'credits.aleo',
    function: 'transfer_public',
    inputs: [TREASURY_ADDRESS, `${SUBSCRIPTION_TIERS[tier].price}u64`],
    fee: 500_000,
    privateFee: false,
  };

  const result = await executeTransaction(paymentTx);

  let status = 'pending';
  while (status === 'pending') {
    await new Promise(r => setTimeout(r, 2000));
    const s = await transactionStatus(result.transactionId);
    status = s.status.toLowerCase();
    if (status === 'failed' || status === 'rejected') {
      throw new Error(`Payment transaction ${status}`);
    }
  }

  const subTx: TransactionOptions = {
    program: SUBSCRIPTION_CONTRACT,
    function: tier === 'premium' ? 'create_subscription' : 'upgrade_subscription',
    inputs: [tier === 'premium' ? '1u8' : '2u8'],
    fee: 500_000,
    privateFee: false,
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
