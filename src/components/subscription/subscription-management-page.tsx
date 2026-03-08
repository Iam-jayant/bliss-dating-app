'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, ExternalLink, RefreshCw, ChevronRight, Lock, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import {
  SUBSCRIPTION_TIERS,
  getSubscriptionDetails,
  getDailySwipesUsed,
  getDailySuperLikesUsed,
  type SubscriptionDetails,
} from '@/lib/payment/payment-service';
import { SubscriptionModal } from '@/components/subscription/subscription-modal';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function SubscriptionManagementPage() {
  const { address: publicKey } = useWallet();
  const [details, setDetails] = useState<SubscriptionDetails | null>(null);
  const [swipesUsed, setSwipesUsed] = useState(0);
  const [superLikesUsed, setSuperLikesUsed] = useState(0);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const refresh = useCallback(() => {
    if (!publicKey) { setDetails(null); return; }
    setDetails(getSubscriptionDetails(publicKey));
    setSwipesUsed(getDailySwipesUsed(publicKey));
    setSuperLikesUsed(getDailySuperLikesUsed(publicKey));
  }, [publicKey]);

  useEffect(() => { refresh(); }, [refresh]);

  if (!publicKey) {
    return (
      <div className="min-h-screen relative overflow-hidden pl-20 flex items-center justify-center p-4">
        <div className="fixed inset-0 -z-10 bg-background" />
        <Card className="max-w-md w-full p-8 text-center border border-primary/20 shadow-2xl backdrop-blur-sm bg-card/90">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary flex items-center justify-center">
            <CreditCard className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-headline italic text-primary mb-3">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-6 font-body">Connect your Aleo wallet to view your subscription</p>
          <WalletMultiButton className="!w-full !justify-center !py-3 !bg-primary hover:!bg-primary/90 !text-primary-foreground" />
        </Card>
      </div>
    );
  }

  const tier = details?.tier ?? SUBSCRIPTION_TIERS.free;
  const isFree = tier.id === 'free';
  const isPremium = tier.id === 'premium';

  const dailySwipeLimit = tier.limits.dailySwipes;
  const dailySuperLikeLimit = tier.limits.superLikesPerDay;
  const swipesRemaining = dailySwipeLimit === 0 ? -1 : Math.max(0, dailySwipeLimit - swipesUsed);
  const superLikesRemaining =
    dailySuperLikeLimit === -1 ? -1 : dailySuperLikeLimit === 0 ? 0 : Math.max(0, dailySuperLikeLimit - superLikesUsed);

  return (
    <div className="min-h-screen relative overflow-hidden pl-20">
      <div className="fixed inset-0 -z-10 bg-background" />

      <div className="relative z-10 p-6 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-headline italic text-primary">Subscription</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            All settings stored locally — never on servers
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"
        >
          {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Current Plan */}
            <Card className="border border-primary/20 bg-card/90 backdrop-blur-sm p-6">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-primary" />
                Current Plan
              </h2>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground font-medium">Bliss {tier.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {isFree ? 'No payment required' : `$${tier.usdPrice} one-time purchase`}
                  </p>
                </div>
                <Badge variant="outline" className="border-primary/30 text-primary text-xs">Active</Badge>
              </div>

              {!isFree && (details?.activatedAt || details?.txHash) && (
                <>
                  <Separator className="bg-primary/10 my-4" />
                  <div className="space-y-3">
                    {details.activatedAt && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Activated</span>
                        <span className="text-foreground">{formatDate(details.activatedAt)}</span>
                      </div>
                    )}
                    {details.txHash && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Transaction</span>
                        <a
                          href={`https://explorer.provable.com/transaction/${details.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors font-mono text-xs"
                        >
                          {details.txHash.slice(0, 10)}…{details.txHash.slice(-6)}
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
                {tier.features.map((f, i) => (
                  <li key={i} className="text-sm text-muted-foreground">• {f}</li>
                ))}
              </ul>
            </Card>

            {/* Privacy & Payment */}
            <Card className="border border-primary/20 bg-card/90 backdrop-blur-sm p-6">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                <Lock className="w-5 h-5 text-primary" />
                Privacy &amp; Payment
              </h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>All payments use private ARC-20 USDC transfers — never visible on the public ledger.</p>
                <Separator className="bg-primary/10" />
                <p>Subscription status stored locally and verified via on-chain ZK records.</p>
                <Separator className="bg-primary/10" />
                <p>One-time purchase — no recurring charges or auto-renewals.</p>
                <Separator className="bg-primary/10" />
                <p>Pay-per-use micro-transactions (x402) available for individual premium actions.</p>
              </div>
            </Card>
          </div>

          {/* ── RIGHT COLUMN ────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Daily Usage */}
            <Card className="border border-primary/20 bg-card/90 backdrop-blur-sm p-6">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                <RefreshCw className="w-5 h-5 text-primary" />
                Daily Usage
                <button onClick={refresh} className="ml-auto text-muted-foreground hover:text-foreground transition-colors" title="Refresh">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </h2>

              <div className="space-y-4">
                {/* Swipes */}
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

                {/* Super Likes */}
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

                {/* Feature access rows */}
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

            {/* Upgrade */}
            {(isFree || isPremium) && (
              <Card className="border border-primary/20 bg-card/90 backdrop-blur-sm p-6">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                  <ArrowUpRight className="w-5 h-5 text-primary" />
                  {isFree ? 'Upgrade' : 'Upgrade to Plus'}
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {isFree
                    ? 'Unlock unlimited swipes, see who likes you, Super Likes, and more.'
                    : 'Get unlimited Super Likes, profile boost, read receipts, and priority matching.'}
                </p>

                {isFree && (
                  <div className="space-y-3 mb-4">
                    <button
                      className="w-full rounded-lg border border-primary/20 p-3 text-left hover:bg-muted/50 transition-colors"
                      onClick={() => setShowUpgrade(true)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">Premium</span>
                        <span className="text-sm text-muted-foreground">${SUBSCRIPTION_TIERS.premium.usdPrice}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Unlimited swipes, see likes, 5 Super Likes/day</p>
                    </button>
                    <button
                      className="w-full rounded-lg border border-primary/20 p-3 text-left hover:bg-muted/50 transition-colors"
                      onClick={() => setShowUpgrade(true)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">Plus</span>
                        <span className="text-sm text-muted-foreground">${SUBSCRIPTION_TIERS.plus.usdPrice}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Everything in Premium + boost, unlimited Super Likes, VIP</p>
                    </button>
                  </div>
                )}

                {isPremium && (
                  <div className="rounded-lg border border-primary/20 p-3 mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">Plus</span>
                      <span className="text-sm text-muted-foreground">${SUBSCRIPTION_TIERS.plus.usdPrice}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Unlimited Super Likes, profile boost, read receipts, VIP badge</p>
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full justify-between border-primary/20"
                  onClick={() => setShowUpgrade(true)}
                >
                  <span>{isFree ? 'Choose a plan' : 'Upgrade now'}</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  Paid privately with USDC via Aleo — no payment history on the public ledger.
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
