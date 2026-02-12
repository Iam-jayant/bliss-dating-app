/**
 * Payment Service for Subscriptions
 * Uses Aleo wallet adapter Transaction for on-chain payments
 */

import {
  Transaction,
  WalletAdapterNetwork,
} from '@demox-labs/aleo-wallet-adapter-base';

export interface SubscriptionTier {
  id: 'free' | 'premium' | 'plus';
  name: string;
  price: number; // In Aleo microcredits
  usdPrice: number; // In USD
  features: string[];
  limits: {
    dailySwipes: number; // 0 = unlimited
    activeChats: number; // 0 = unlimited
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
    },
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 10_000_000, // 10 Aleo credits
    usdPrice: 9.99,
    features: [
      'Unlimited swipes',
      'Unlimited chats',
      'Advanced filters',
      'See who liked you',
      'Priority support',
    ],
    limits: {
      dailySwipes: 0,
      activeChats: 0,
    },
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    price: 20_000_000, // 20 Aleo credits
    usdPrice: 19.99,
    features: [
      'All Premium features',
      'Priority profile visibility',
      'Read receipts',
      'Unlimited rewinds',
      'Advanced analytics',
      'VIP badge',
    ],
    limits: {
      dailySwipes: 0,
      activeChats: 0,
    },
  },
};

const SUBSCRIPTION_CONTRACT = process.env.NEXT_PUBLIC_SUBSCRIPTION_ACCESS_PROGRAM || 'bliss_subscription_access.aleo';

/**
 * Payment Service
 * Uses the Aleo wallet adapter's Transaction class (not @provablehq/sdk)
 */
export class PaymentService {

  /**
   * Purchase subscription using Aleo credits
   */
  async purchaseSubscription(
    walletPublicKey: string,
    requestTransaction: (tx: any) => Promise<string>,
    tier: 'premium' | 'plus',
    durationMonths: number = 1
  ): Promise<string> {
    const subscriptionTier = SUBSCRIPTION_TIERS[tier];
    const totalPrice = subscriptionTier.price * durationMonths;
    const currentTime = Math.floor(Date.now() / 1000);

    const functionName = tier === 'premium' ? 'upgrade_to_premium' : 'upgrade_to_plus';

    const inputs = [
      `${totalPrice}u64`,
      `${durationMonths}u32`,
      `${currentTime}u32`,
    ];

    const aleoTransaction = Transaction.createTransaction(
      walletPublicKey,
      WalletAdapterNetwork.TestnetBeta,
      SUBSCRIPTION_CONTRACT,
      functionName,
      inputs,
      totalPrice,
      false
    );

    // Clean serialize for wallet extension compatibility
    const plainTransaction = JSON.parse(JSON.stringify(aleoTransaction));
    const txId = await requestTransaction(plainTransaction);

    return txId;
  }

  /**
   * Purchase subscription using USDC (placeholder for Shield Wallet integration)
   */
  async purchaseWithUSDC(
    walletPublicKey: string,
    requestTransaction: (tx: any) => Promise<string>,
    tier: 'premium' | 'plus',
    durationMonths: number = 1
  ): Promise<string> {
    // For MVP, USDC payments go through the same flow
    // In production, this would interact with a USDC token contract
    return this.purchaseSubscription(walletPublicKey, requestTransaction, tier, durationMonths);
  }

  /**
   * Check current subscription status
   */
  async getSubscriptionStatus(walletAddress: string): Promise<SubscriptionTier> {
    try {
      // Check local cache for demo
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(`bliss_sub_${walletAddress}`);
        if (cached) {
          const data = JSON.parse(cached);
          if (data.expiresAt > Date.now()) {
            return SUBSCRIPTION_TIERS[data.tier] || SUBSCRIPTION_TIERS.free;
          }
        }
      }
      return SUBSCRIPTION_TIERS.free;
    } catch {
      return SUBSCRIPTION_TIERS.free;
    }
  }

  /**
   * Check if subscription is active
   */
  async isSubscriptionActive(walletAddress: string): Promise<boolean> {
    const status = await this.getSubscriptionStatus(walletAddress);
    return status.id !== 'free';
  }

  /**
   * Get remaining swipes for today
   */
  async getRemainingSwipes(walletAddress: string): Promise<number> {
    const subscription = await this.getSubscriptionStatus(walletAddress);
    if (subscription.limits.dailySwipes === 0) {
      return -1; // Unlimited
    }
    // Check today's usage from local storage
    if (typeof window !== 'undefined') {
      const today = new Date().toISOString().split('T')[0];
      const key = `bliss_swipes_${walletAddress}_${today}`;
      const used = parseInt(localStorage.getItem(key) || '0', 10);
      return Math.max(0, subscription.limits.dailySwipes - used);
    }
    return subscription.limits.dailySwipes;
  }

  /**
   * Calculate subscription expiration date
   */
  getExpirationDate(durationMonths: number): Date {
    const now = new Date();
    const expiration = new Date(now.getTime());
    expiration.setMonth(expiration.getMonth() + durationMonths);
    return expiration;
  }

  /**
   * Format price for display
   */
  formatPrice(tier: SubscriptionTier, durationMonths: number = 1): string {
    const totalUSD = tier.usdPrice * durationMonths;
    const totalAleo = (tier.price * durationMonths) / 1_000_000;
    return `$${totalUSD.toFixed(2)} (${totalAleo} Aleo)`;
  }
}

// Export singleton
export const paymentService = new PaymentService();
