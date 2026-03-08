'use client';

import { useState } from 'react';
import {
  Crown,
  Zap,
  Shield,
  History,
  CheckCircle2,
  Lock,
  CreditCard,
  ExternalLink,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SUBSCRIPTION_TIERS } from '@/lib/payment/payment-service';

// ── Mock state — replace with live wallet hooks when ready ────────────────
const MOCK = {
  activeTier: 'plus' as const,
  x402Balance: 14.72,
  x402Limit: 25.0,
  activatedAt: Date.now() - 12 * 24 * 60 * 60 * 1000,
  txHash: 'at1qz7k9m3v4x8c2n1b5j0w6d9f3h7g4l2s8p0y6a3e5r1t7u9i0o4qmp3x2',
};

export default function SubscriptionDashboard() {
  const [showHistory] = useState(false);

  const tier = SUBSCRIPTION_TIERS[MOCK.activeTier];
  const balancePct = (MOCK.x402Balance / MOCK.x402Limit) * 100;
  const activatedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(MOCK.activatedAt);

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden pl-20">
      {/* ── Atmospheric glow blobs ─────────────────────────────────── */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-pink-600/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-purple-600/20 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-purple-600/10 blur-[160px]" />

      {/* ── Content ────────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto max-w-5xl px-6 py-12">

        {/* Header */}
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-headline italic bg-gradient-to-r from-pink-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              Access &amp; Billing
            </h1>
            <p className="mt-2 text-sm text-white/50 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              Zero-Knowledge Privacy &bull; Secured on Aleo
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-fit border border-white/10 text-white/60 hover:text-white hover:bg-white/5"
          >
            <History className="mr-2 h-4 w-4" />
            Transaction History
          </Button>
        </div>

        {/* ── Two-column grid ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* ── LEFT: Active Plan ──────────────────────────────────── */}
          <Card className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 shadow-2xl">
            {/* Status row */}
            <div className="mb-5 flex items-center gap-3">
              <Badge className="gap-1.5 rounded-full border-0 bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Active Plan
              </Badge>
            </div>

            {/* Tier name */}
            <div className="mb-1 flex items-center gap-2">
              <Crown className="h-5 w-5 text-purple-400" />
              <h2 className="text-2xl font-bold tracking-tight">Bliss {tier.name}</h2>
            </div>
            <p className="mb-5 text-sm text-white/40">
              ${tier.usdPrice} &middot; one-time purchase &middot; activated {activatedDate}
            </p>

            {/* Features */}
            <div className="mb-6 space-y-2.5">
              {tier.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm text-white/70">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                  {f}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-lg border border-white/10 text-white/60 hover:text-white hover:bg-white/5"
              >
                Manage Plan
              </Button>
              {MOCK.txHash && (
                <a
                  href={`https://explorer.provable.com/transaction/${MOCK.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors font-mono"
                >
                  {MOCK.txHash.slice(0, 12)}…{MOCK.txHash.slice(-6)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </Card>

          {/* ── RIGHT: X-402 Balance ───────────────────────────────── */}
          <Card className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 shadow-2xl">
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-pink-400" />
                <h2 className="text-lg font-semibold tracking-tight">X-402 Balance</h2>
              </div>
              <Badge className="rounded-full border-0 bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                <CreditCard className="mr-1.5 h-3 w-3" /> USDC
              </Badge>
            </div>

            {/* Balance display */}
            <div className="mb-1">
              <span className="text-4xl font-bold tabular-nums tracking-tight">
                ${MOCK.x402Balance.toFixed(2)}
              </span>
              <span className="ml-1.5 text-sm text-white/40">/ ${MOCK.x402Limit.toFixed(2)}</span>
            </div>
            <p className="mb-5 text-xs text-white/40 leading-relaxed max-w-xs">
              Pre-approved private USDC for micro-transactions — Super Likes, priority messages, and DM unlocks. Refills automatically when balance drops below $5.
            </p>

            {/* Progress bar */}
            <div className="mb-6">
              <div className="mb-1.5 flex justify-between text-xs text-white/40">
                <span>Balance</span>
                <span>Auto-refill at $5.00</span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${balancePct}%` }}
                />
              </div>
            </div>

            {/* Top-up button */}
            <Button className="w-full rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700 shadow-lg shadow-pink-500/10">
              <ArrowUpRight className="mr-2 h-4 w-4" />
              Top Up Balance
            </Button>
          </Card>
        </div>

        {/* ── ZK Privacy Trust Banner ──────────────────────────────── */}
        <div className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-5 w-5 flex-shrink-0 text-purple-400/80" />
              <div>
                <p className="text-sm font-medium text-white/70">
                  Your payment history and subscription tier are never publicly visible.
                </p>
                <p className="mt-0.5 text-xs text-white/35 leading-relaxed max-w-xl">
                  All billing uses private ARC-20 USDC transfers verified by ZK-SNARKs on Aleo. Your tier status is mathematically proven on-chain without revealing any transaction details to the public ledger.
                </p>
              </div>
            </div>
            <a
              href="https://explorer.provable.com/program/bliss_subscription_access.aleo"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-white/10 px-4 py-2 text-xs font-medium text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
            >
              <Shield className="h-3.5 w-3.5" />
              View Smart Contract
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
