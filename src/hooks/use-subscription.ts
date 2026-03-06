'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import {
  SUBSCRIPTION_TIERS,
  getSubscriptionFromCache,
  getDailySwipesUsed,
  getDailySuperLikesUsed,
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
  refresh: () => void;
}

export function useSubscription(): SubscriptionState {
  const { address } = useWallet();
  const [tier, setTier] = useState<SubscriptionTier>(SUBSCRIPTION_TIERS.free);
  const [swipesUsed, setSwipesUsed] = useState(0);
  const [superLikesUsed, setSuperLikesUsed] = useState(0);

  const refresh = useCallback(() => {
    if (!address) {
      setTier(SUBSCRIPTION_TIERS.free);
      setSwipesUsed(0);
      setSuperLikesUsed(0);
      return;
    }
    setTier(getSubscriptionFromCache(address));
    setSwipesUsed(getDailySwipesUsed(address));
    setSuperLikesUsed(getDailySuperLikesUsed(address));
  }, [address]);

  useEffect(() => {
    refresh();
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
    canChat: tier.limits.activeChats === 0,
    canSeeLikes: tier.limits.canSeeLikes,
    canSuperLike: remainingSuperLikes === -1 || remainingSuperLikes > 0,
    canBoost: tier.limits.canBoost,
    remainingSwipes,
    remainingSuperLikes,
    refresh,
  };
}
