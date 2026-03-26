'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, Check, Crown, ExternalLink, Loader2, Sparkles, Zap } from 'lucide-react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  type SubscriptionTermMonths,
  getSelectionPricing,
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
  const { address: publicKey, executeTransaction, transactionStatus, requestRecords } = useWallet();

  const [selectedTier, setSelectedTier] = useState<'premium' | 'plus'>('premium');
  const [selectedTerm, setSelectedTerm] = useState<SubscriptionTermMonths>(1);
  const [flowState, setFlowState] = useState<FlowState>('select');
  const [txHash, setTxHash] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const tier = useMemo(() => SUBSCRIPTION_TIERS[selectedTier], [selectedTier]);
  const selection = useMemo(() => getSelectionPricing(selectedTier, selectedTerm), [selectedTier, selectedTerm]);

  const resetModalState = () => {
    setFlowState('select');
    setTxHash('');
    setErrorMessage('');
  };

  const handleClose = () => {
    resetModalState();
    onClose();
  };

  const handlePurchase = async () => {
    if (!publicKey || !executeTransaction || !transactionStatus || !requestRecords) return;

    setFlowState('processing');
    setErrorMessage('');

    try {
      const executeAdapter = async (opts: {
        program: string;
        function: string;
        inputs: string[];
        fee: number;
        privateFee: boolean;
      }) => {
        const result = await executeTransaction(opts);
        if (!result?.transactionId) {
          throw new Error('Transaction was rejected by the wallet.');
        }
        return { transactionId: result.transactionId };
      };

      const statusAdapter = async (id: string) => {
        const status = await transactionStatus(id);
        return { status: status.status, transactionId: status.transactionId || id };
      };

      const recordsAdapter = async (programId: string) => {
        const records = await requestRecords(programId);
        return records as any[];
      };

      const result = await purchaseSubscription(
        publicKey,
        selectedTier,
        selectedTerm,
        executeAdapter,
        statusAdapter,
        recordsAdapter,
      );

      saveSubscriptionToCache(publicKey, selectedTier, selectedTerm, result.txHash, result.expiresAt);
      setTxHash(result.txHash);
      setFlowState('success');
      onSuccess?.();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Subscription purchase failed');
      setFlowState('error');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {flowState === 'processing' && (
          <div className="flex flex-col items-center justify-center py-16 gap-6">
            <Loader2 className="w-12 h-12 text-pink-500 animate-spin" />
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-2">Processing subscription</h3>
              <p className="text-muted-foreground">
                Confirm the private credits transfer in your wallet, then wait for on-chain confirmation.
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
              <h3 className="text-2xl font-bold mb-2">{tier.name} activated</h3>
              <p className="text-muted-foreground mb-4">Your subscription entitlements are now active on Aleo.</p>
              {txHash && (
                <a
                  href={`https://explorer.provable.com/transaction/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-pink-500 hover:text-pink-400 transition-colors"
                >
                  View transaction <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <Button
              onClick={handleClose}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            >
              Continue
            </Button>
          </div>
        )}

        {flowState === 'error' && (
          <div className="flex flex-col items-center justify-center py-16 gap-6">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-2">Purchase failed</h3>
              <p className="text-muted-foreground mb-4">{errorMessage}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setFlowState('select')}>
                Back
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
                Upgrade Your Access
              </DialogTitle>
              <p className="text-center text-muted-foreground">Private payments via `credits.aleo` on Aleo testnet</p>
            </DialogHeader>

            <Card className="mt-5 p-4 bg-card/50 border-primary/20">
              <p className="text-sm font-semibold mb-3">Select term</p>
              <div className="grid grid-cols-3 gap-2">
                {[1, 3, 12].map((term) => (
                  <button
                    key={term}
                    onClick={() => setSelectedTerm(term as SubscriptionTermMonths)}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                      selectedTerm === term
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    {term} month{term > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            </Card>

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
                  {selectedTier === 'premium' && <Badge className="bg-pink-500">Selected</Badge>}
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">{SUBSCRIPTION_TIERS.premium.creditPricing[selectedTerm]}</span>
                    <span className="text-muted-foreground">credits</span>
                  </div>
                  <div className="text-sm text-muted-foreground">Base value ${SUBSCRIPTION_TIERS.premium.usdMonthlyPrice}/month</div>
                </div>

                <ul className="space-y-2">
                  {SUBSCRIPTION_TIERS.premium.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
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
                  {selectedTier === 'plus' && <Badge className="bg-purple-500">Selected</Badge>}
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">{SUBSCRIPTION_TIERS.plus.creditPricing[selectedTerm]}</span>
                    <span className="text-muted-foreground">credits</span>
                  </div>
                  <div className="text-sm text-muted-foreground">Base value ${SUBSCRIPTION_TIERS.plus.usdMonthlyPrice}/month</div>
                </div>

                <ul className="space-y-2">
                  {SUBSCRIPTION_TIERS.plus.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
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
                  {selection.credits} credits ({selectedTerm} month{selectedTerm > 1 ? 's' : ''})
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Private transfer + on-chain entitlement update
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
