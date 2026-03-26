'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import {
  SUBSCRIPTION_TIERS,
  getDailySuperLikesUsed,
  getDailySwipesUsed,
  getOnChainSubscriptionState,
  getSubscriptionFromCache,
  type SubscriptionTier,
} from '@/lib/payment/payment-service';

interface SubscriptionState {
  tier: SubscriptionTier;
  canSwipe: boolean;
  canChat: boolean;
  canSeeLikes: boolean;
  canSuperLike: boolean;
  canBoost: boolean;
  remainingSwipes: number;
  remainingSuperLikes: number;
  refresh: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const { address, requestRecords } = useWallet();
  const [tier, setTier] = useState<SubscriptionTier>(SUBSCRIPTION_TIERS.free);
  const [swipesUsed, setSwipesUsed] = useState(0);
  const [superLikesUsed, setSuperLikesUsed] = useState(0);

  const refresh = useCallback(async () => {
    if (!address) {
      setTier(SUBSCRIPTION_TIERS.free);
      setSwipesUsed(0);
      setSuperLikesUsed(0);
      return;
    }

    try {
      const localSwipesUsed = getDailySwipesUsed(address);
      if (requestRecords) {
        const onChain = await getOnChainSubscriptionState(async (programId: string) => {
          const records = await requestRecords(programId);
          return records as any[];
        });
        const nextTier = SUBSCRIPTION_TIERS[onChain.tier];
        setTier(onChain.isActive ? nextTier : SUBSCRIPTION_TIERS.free);
        // Keep UI and gating in sync with local swipe actions while still respecting on-chain usage when present.
        setSwipesUsed(Math.max(onChain.swipesUsedToday, localSwipesUsed));
      } else {
        setTier(getSubscriptionFromCache(address));
        setSwipesUsed(localSwipesUsed);
      }
    } catch {
      setTier(getSubscriptionFromCache(address));
      setSwipesUsed(getDailySwipesUsed(address));
    }

    setSuperLikesUsed(getDailySuperLikesUsed(address));
  }, [address, requestRecords]);

  useEffect(() => {
    refresh().catch((error) => {
      console.warn('Failed to refresh subscription state:', error);
    });
  }, [refresh]);

  const remainingSwipes = tier.limits.dailySwipes === 0
    ? -1
    : Math.max(0, tier.limits.dailySwipes - swipesUsed);

  const remainingSuperLikes = tier.limits.superLikesPerDay === -1
    ? -1
    : tier.limits.superLikesPerDay === 0
      ? 0
      : Math.max(0, tier.limits.superLikesPerDay - superLikesUsed);

  return {
    tier,
    canSwipe: remainingSwipes === -1 || remainingSwipes > 0,
    canChat: tier.limits.activeChats === 0 || tier.limits.activeChats > 0,
    canSeeLikes: tier.limits.canSeeLikes,
    canSuperLike: remainingSuperLikes === -1 || remainingSuperLikes > 0,
    canBoost: tier.limits.canBoost,
    remainingSwipes,
    remainingSuperLikes,
    refresh,
  };
}
