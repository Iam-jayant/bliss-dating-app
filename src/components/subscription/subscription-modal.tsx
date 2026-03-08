'use client';

import { useState } from 'react';
import { Check, Crown, Sparkles, Zap, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import {
  purchaseSubscription,
  saveSubscriptionToCache,
  SUBSCRIPTION_TIERS,
} from '@/lib/payment/payment-service';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type FlowState = 'select' | 'processing' | 'success' | 'error';

export function SubscriptionModal({ isOpen, onClose, onSuccess }: SubscriptionModalProps) {
  const { address: publicKey, executeTransaction, transactionStatus } = useWallet();
  const [selectedTier, setSelectedTier] = useState<'premium' | 'plus'>('premium');
  const [flowState, setFlowState] = useState<FlowState>('select');
  const [txHash, setTxHash] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const tier = SUBSCRIPTION_TIERS[selectedTier];

  const handlePurchase = async () => {
    if (!publicKey || !executeTransaction || !transactionStatus) return;

    setFlowState('processing');
    setErrorMessage('');

    try {
      const executeAdapter = async (opts: { program: string; function: string; inputs: string[]; fee: number; privateFee: boolean }) => {
        const result = await executeTransaction(opts);
        if (!result) throw new Error('Transaction was rejected');
        return { transactionId: result.transactionId };
      };

      const statusAdapter = async (id: string) => {
        const s = await transactionStatus(id);
        return { status: s.status, transactionId: s.transactionId || id };
      };

      const result = await purchaseSubscription(selectedTier, executeAdapter, statusAdapter);

      saveSubscriptionToCache(publicKey, selectedTier, result.txHash);
      setTxHash(result.txHash);
      setFlowState('success');
      onSuccess?.();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Transaction failed');
      setFlowState('error');
    }
  };

  const handleClose = () => {
    setFlowState('select');
    setTxHash('');
    setErrorMessage('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {flowState === 'processing' && (
          <div className="flex flex-col items-center justify-center py-16 gap-6">
            <Loader2 className="w-12 h-12 text-pink-500 animate-spin" />
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-2">Processing payment...</h3>
              <p className="text-muted-foreground">
                Please confirm the transaction in your wallet and wait for on-chain confirmation.
              </p>
            </div>
          </div>
        )}

        {flowState === 'success' && (
          <div className="flex flex-col items-center justify-center py-16 gap-6">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-2">Welcome to {tier.name}!</h3>
              <p className="text-muted-foreground mb-4">
                Your subscription is now active. Enjoy unlimited access.
              </p>
              {txHash && (
                <a
                  href={`https://explorer.provable.com/transaction/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-pink-500 hover:text-pink-400 transition-colors"
                >
                  View on Explorer <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <Button
              onClick={handleClose}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            >
              Start Exploring
            </Button>
          </div>
        )}

        {flowState === 'error' && (
          <div className="flex flex-col items-center justify-center py-16 gap-6">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-2">Payment Failed</h3>
              <p className="text-muted-foreground mb-4">{errorMessage}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setFlowState('select')}>
                Go Back
              </Button>
              <Button
                onClick={handlePurchase}
                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {flowState === 'select' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-3xl text-center bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Upgrade Your Experience
              </DialogTitle>
              <p className="text-center text-muted-foreground">
                One-time purchase — no recurring charges
              </p>
            </DialogHeader>

            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <Card
                className={`p-6 cursor-pointer transition-all ${
                  selectedTier === 'premium'
                    ? 'border-2 border-pink-500 shadow-lg'
                    : 'border hover:border-pink-300'
                }`}
                onClick={() => setSelectedTier('premium')}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-pink-500" />
                    <h3 className="text-2xl font-bold">Premium</h3>
                  </div>
                  {selectedTier === 'premium' && (
                    <Badge className="bg-pink-500">Selected</Badge>
                  )}
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">10</span>
                    <span className="text-muted-foreground">Aleo credits</span>
                  </div>
                  <div className="text-sm text-muted-foreground">≈ ${SUBSCRIPTION_TIERS.premium.usdPrice}</div>
                </div>

                <ul className="space-y-2">
                  {SUBSCRIPTION_TIERS.premium.features.map((feature: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card
                className={`p-6 cursor-pointer transition-all relative overflow-hidden ${
                  selectedTier === 'plus'
                    ? 'border-2 border-purple-500 shadow-lg'
                    : 'border hover:border-purple-300'
                }`}
                onClick={() => setSelectedTier('plus')}
              >
                <div className="absolute top-0 right-0 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-1 text-xs font-bold">
                  BEST VALUE
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Crown className="w-6 h-6 text-purple-500" />
                    <h3 className="text-2xl font-bold">Plus</h3>
                  </div>
                  {selectedTier === 'plus' && (
                    <Badge className="bg-purple-500">Selected</Badge>
                  )}
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">20</span>
                    <span className="text-muted-foreground">Aleo credits</span>
                  </div>
                  <div className="text-sm text-muted-foreground">≈ ${SUBSCRIPTION_TIERS.plus.usdPrice}</div>
                </div>

                <ul className="space-y-2">
                  {SUBSCRIPTION_TIERS.plus.features.map((feature: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            <Card className="p-4 bg-gradient-to-r from-pink-50/10 to-purple-50/10 mt-6">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-purple-400">
                  {tier.price / 1_000_000} Aleo credits (≈ ${tier.usdPrice})
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                One-time payment via Aleo blockchain • No auto-renewals
              </p>
            </Card>

            <Button
              className="w-full mt-6 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-lg py-6"
              onClick={handlePurchase}
              disabled={!publicKey}
            >
              <Zap className="w-5 h-5 mr-2" />
              {!publicKey ? 'Connect Wallet' : `Purchase ${tier.name}`}
            </Button>

            <div className="text-center text-xs text-muted-foreground mt-4 space-y-1">
              <p>🔒 Payments processed securely on the Aleo blockchain.</p>
              <p className="text-muted-foreground/60">
                Prefer not to subscribe? Pay-per-use via x402 — coming soon.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
