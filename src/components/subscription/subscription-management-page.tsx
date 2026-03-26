'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ChevronRight, CreditCard, ExternalLink, Lock, RefreshCw } from 'lucide-react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { SubscriptionModal } from '@/components/subscription/subscription-modal';
import {
  getDailySuperLikesUsed,
  getDailySwipesUsed,
  getOnChainSubscriptionState,
  getSubscriptionDetails,
  SUBSCRIPTION_TIERS,
  type OnChainSubscriptionState,
  type SubscriptionDetails,
} from '@/lib/payment/payment-service';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function SubscriptionManagementPage() {
  const { address: publicKey, executeTransaction, transactionStatus, requestRecords } = useWallet();

  const [details, setDetails] = useState<SubscriptionDetails | null>(null);
  const [onChainState, setOnChainState] = useState<OnChainSubscriptionState | null>(null);
  const [swipesUsed, setSwipesUsed] = useState(0);
  const [superLikesUsed, setSuperLikesUsed] = useState(0);
  const [pendingSwipeSettlements, setPendingSwipeSettlements] = useState(0);
  const [reconcilingSwipes, setReconcilingSwipes] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const refresh = useCallback(async () => {
    if (!publicKey) {
      setDetails(null);
      setOnChainState(null);
      setSwipesUsed(0);
      setSuperLikesUsed(0);
      setPendingSwipeSettlements(0);
      return;
    }

    setDetails(getSubscriptionDetails(publicKey));

    if (requestRecords) {
      try {
        const state = await getOnChainSubscriptionState(async (programId: string) => {
          const records = await requestRecords(programId);
          return records as any[];
        });
        const localSwipes = getDailySwipesUsed(publicKey);
        setOnChainState(state);
        setSwipesUsed(Math.max(state.swipesUsedToday, localSwipes));
      } catch {
        setOnChainState(null);
        setSwipesUsed(getDailySwipesUsed(publicKey));
      }
    } else {
      setOnChainState(null);
      setSwipesUsed(getDailySwipesUsed(publicKey));
    }

    setSuperLikesUsed(getDailySuperLikesUsed(publicKey));

    const { getPendingSwipeSettlementCount } = await import('@/lib/payment/payment-service');
    setPendingSwipeSettlements(getPendingSwipeSettlementCount(publicKey));
  }, [publicKey, requestRecords]);

  const reconcileSwipeSettlements = useCallback(async () => {
    if (!publicKey || !executeTransaction || !transactionStatus || !requestRecords) return;
    setReconcilingSwipes(true);
    try {
      const { flushPendingSwipeSettlements } = await import('@/lib/payment/payment-service');
      await flushPendingSwipeSettlements(
        publicKey,
        async (opts) => {
          const result = await executeTransaction(opts);
          if (!result?.transactionId) {
            throw new Error('Swipe settlement transaction was rejected by wallet.');
          }
          return { transactionId: result.transactionId };
        },
        async (transactionId) => {
          const status = await transactionStatus(transactionId);
          return {
            status: String(status.status || 'pending'),
            transactionId: status.transactionId || transactionId,
          };
        },
        async (programId) => {
          const records = await requestRecords(programId);
          return records as Array<{
            owner?: string;
            data: Record<string, string>;
            plaintext: string;
            programId?: string;
          }>;
        },
        {
          maxItems: 5,
          minRetryIntervalMs: 30_000,
        },
      );
    } finally {
      setReconcilingSwipes(false);
      await refresh();
    }
  }, [executeTransaction, publicKey, refresh, requestRecords, transactionStatus]);

  useEffect(() => {
    refresh().catch((error) => {
      console.warn('Failed to refresh subscription page:', error);
    });
  }, [refresh]);

  const tier = useMemo(() => {
    if (onChainState) {
      const onChainTier = onChainState.isActive ? onChainState.tier : 'free';
      return SUBSCRIPTION_TIERS[onChainTier];
    }
    return details?.tier || SUBSCRIPTION_TIERS.free;
  }, [details?.tier, onChainState]);

  const isFree = tier.id === 'free';
  const isPremium = tier.id === 'premium';

  const dailySwipeLimit = onChainState?.dailySwipeLimit ?? tier.limits.dailySwipes;
  const dailySuperLikeLimit = tier.limits.superLikesPerDay;

  const swipesRemaining = dailySwipeLimit === 0 ? -1 : Math.max(0, dailySwipeLimit - swipesUsed);
  const superLikesRemaining = dailySuperLikeLimit === -1
    ? -1
    : dailySuperLikeLimit === 0
      ? 0
      : Math.max(0, dailySuperLikeLimit - superLikesUsed);

  if (!publicKey) {
    return (
      <div className="min-h-screen relative overflow-hidden pl-20 flex items-center justify-center p-4">
        <div className="fixed inset-0 -z-10 bg-background" />
        <Card className="max-w-md w-full p-8 text-center border border-primary/20 shadow-2xl backdrop-blur-sm bg-card/90">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary flex items-center justify-center">
            <CreditCard className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-headline italic text-primary mb-3">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-6 font-body">Connect your Aleo wallet to view subscriptions</p>
          <WalletMultiButton className="!w-full !justify-center !py-3 !bg-primary hover:!bg-primary/90 !text-primary-foreground" />
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden pl-20">
      <div className="fixed inset-0 -z-10 bg-background" />

      <div className="relative z-10 p-6 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-headline italic text-primary">Subscription</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Entitlements verified from on-chain records and private credits payments
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"
        >
          <div className="space-y-6">
            <Card className="border border-primary/20 bg-card/90 backdrop-blur-sm p-6">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-primary" />
                Current Plan
              </h2>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground font-medium">Bliss {tier.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {isFree ? 'No payment required' : `${details?.termMonths || 1} month term`}
                  </p>
                </div>
                <Badge variant="outline" className="border-primary/30 text-primary text-xs">Active</Badge>
              </div>

              {!isFree && (
                <>
                  <Separator className="bg-primary/10 my-4" />
                  <div className="space-y-3">
                    {details?.activatedAt && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Activated</span>
                        <span className="text-foreground">{formatDate(details.activatedAt)}</span>
                      </div>
                    )}

                    {(details?.expiresAt || onChainState?.expiresAt) && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Expires</span>
                        <span className="text-foreground">{formatDate((details?.expiresAt || onChainState?.expiresAt || 0) * 1000)}</span>
                      </div>
                    )}

                    {details?.txHash && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Last Upgrade Tx</span>
                        <a
                          href={`https://explorer.provable.com/transaction/${details.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors font-mono text-xs"
                        >
                          {details.txHash.slice(0, 10)}...{details.txHash.slice(-6)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </>
              )}

              <Separator className="bg-primary/10 my-4" />

              <p className="text-sm text-foreground mb-2">Included features</p>
              <ul className="space-y-2">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">- {feature}</li>
                ))}
              </ul>
            </Card>

            <Card className="border border-primary/20 bg-card/90 backdrop-blur-sm p-6">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                <Lock className="w-5 h-5 text-primary" />
                Payment and Privacy
              </h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>All subscriptions are paid with private `credits.aleo` transfers to the treasury address.</p>
                <Separator className="bg-primary/10" />
                <p>Tier access is enforced by subscription records from `bliss_subscription_access_v2.aleo`.</p>
                <Separator className="bg-primary/10" />
                <p>Available terms and prices:</p>
                <p>Premium: 10 / 27 / 96 credits for 1 / 3 / 12 months.</p>
                <p>Plus: 20 / 54 / 192 credits for 1 / 3 / 12 months.</p>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border border-primary/20 bg-card/90 backdrop-blur-sm p-6">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                <RefreshCw className="w-5 h-5 text-primary" />
                Daily Usage
                <button
                  onClick={() => { refresh().catch(() => {}); }}
                  className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </h2>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-foreground">Swipes</span>
                    <span className="text-sm text-muted-foreground">
                      {swipesRemaining === -1 ? 'Unlimited' : `${swipesRemaining} / ${dailySwipeLimit}`}
                    </span>
                  </div>
                  {swipesRemaining === -1
                    ? <Progress value={100} className="h-1.5" />
                    : <Progress value={dailySwipeLimit > 0 ? ((dailySwipeLimit - swipesRemaining) / dailySwipeLimit) * 100 : 0} className="h-1.5" />}
                </div>

                <Separator className="bg-primary/10" />

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-foreground">Super Likes</span>
                    <span className="text-sm text-muted-foreground">
                      {dailySuperLikeLimit === 0
                        ? 'Not available'
                        : superLikesRemaining === -1
                          ? 'Unlimited'
                          : `${superLikesRemaining} / ${dailySuperLikeLimit}`}
                    </span>
                  </div>
                  {dailySuperLikeLimit === 0
                    ? <Progress value={0} className="h-1.5" />
                    : superLikesRemaining === -1
                      ? <Progress value={100} className="h-1.5" />
                      : <Progress value={dailySuperLikeLimit > 0 ? ((dailySuperLikeLimit - superLikesRemaining) / dailySuperLikeLimit) * 100 : 0} className="h-1.5" />}
                </div>

                <Separator className="bg-primary/10" />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-foreground">Pending swipe settlements</span>
                    <span className="text-sm text-muted-foreground">{pendingSwipeSettlements}</span>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-primary/20"
                    disabled={pendingSwipeSettlements === 0 || reconcilingSwipes}
                    onClick={() => { reconcileSwipeSettlements().catch(() => {}); }}
                  >
                    {reconcilingSwipes ? 'Reconciling...' : 'Reconcile now'}
                  </Button>
                </div>

                <Separator className="bg-primary/10" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">See who likes you</span>
                    <span className="text-sm text-muted-foreground">{tier.limits.canSeeLikes ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Profile boost</span>
                    <span className="text-sm text-muted-foreground">{tier.limits.canBoost ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Active chats</span>
                    <span className="text-sm text-muted-foreground">{tier.limits.activeChats === 0 ? 'Unlimited' : tier.limits.activeChats}</span>
                  </div>
                </div>
              </div>
            </Card>

            {(isFree || isPremium) && (
              <Card className="border border-primary/20 bg-card/90 backdrop-blur-sm p-6">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                  <ArrowUpRight className="w-5 h-5 text-primary" />
                  {isFree ? 'Upgrade Plan' : 'Upgrade to Plus'}
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {isFree
                    ? 'Unlock unlimited swipes, likes visibility, and daily Super Likes.'
                    : 'Get Plus features including unlimited Super Likes and profile boosts.'}
                </p>

                <Button
                  variant="outline"
                  className="w-full justify-between border-primary/20"
                  onClick={() => setShowUpgrade(true)}
                >
                  <span>{isFree ? 'Choose a plan' : 'Upgrade now'}</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  Payment is private on-chain through `credits.aleo`.
                </p>
              </Card>
            )}
          </div>
        </motion.div>
      </div>

      <SubscriptionModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} onSuccess={refresh} />
    </div>
  );
}

