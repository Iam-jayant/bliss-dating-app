/**
 * Subscription Upgrade Modal
 * Shows pricing tiers and handles payments via Shield Wallet
 */

'use client';

import { useState } from 'react';
import { Check, Crown, Sparkles, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { paymentService, SUBSCRIPTION_TIERS, type SubscriptionTier } from '@/lib/payment/payment-service';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SubscriptionModal({ isOpen, onClose, onSuccess }: SubscriptionModalProps) {
  const { publicKey, requestTransaction } = useWallet();
  const [selectedTier, setSelectedTier] = useState<'premium' | 'plus'>('premium');
  const [selectedDuration, setSelectedDuration] = useState<1 | 3 | 12>(1);
  const [paymentMethod, setPaymentMethod] = useState<'aleo' | 'usdc'>('aleo');
  const [processing, setProcessing] = useState(false);

  const tier = SUBSCRIPTION_TIERS[selectedTier];
  const discount = selectedDuration === 3 ? 0.1 : selectedDuration === 12 ? 0.2 : 0;
  const totalPrice = tier.usdPrice * selectedDuration * (1 - discount);

  const handlePurchase = async () => {
    if (!publicKey || !requestTransaction) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setProcessing(true);

      let txId: string;

      if (paymentMethod === 'usdc') {
        txId = await paymentService.purchaseWithUSDC(publicKey, requestTransaction, selectedTier, selectedDuration);
      } else {
        txId = await paymentService.purchaseSubscription(publicKey, requestTransaction, selectedTier, selectedDuration);
      }

      alert(`Subscription purchased! Transaction ID: ${txId.slice(0, 20)}...`);
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Purchase failed:', error);
      alert('Purchase failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const durationOptions = [
    { value: 1, label: '1 Month', discount: 0 },
    { value: 3, label: '3 Months', discount: 10 },
    { value: 12, label: '12 Months', discount: 20 },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl text-center bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            Upgrade to Premium
          </DialogTitle>
          <p className="text-center text-gray-600">
            Choose the plan that's right for you
          </p>
        </DialogHeader>

        {/* Tier Selection */}
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          {/* Premium Tier */}
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
              <div className="text-4xl font-bold">${SUBSCRIPTION_TIERS.premium.usdPrice}</div>
              <div className="text-gray-600">per month</div>
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

          {/* Plus Tier */}
          <Card
            className={`p-6 cursor-pointer transition-all relative overflow-hidden ${
              selectedTier === 'plus'
                ? 'border-2 border-purple-500 shadow-lg'
                : 'border hover:border-purple-300'
            }`}
            onClick={() => setSelectedTier('plus')}
          >
            {/* Popular badge */}
            <div className="absolute top-0 right-0 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-1 text-xs font-bold">
              MOST POPULAR
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
              <div className="text-4xl font-bold">${SUBSCRIPTION_TIERS.plus.usdPrice}</div>
              <div className="text-gray-600">per month</div>
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

        {/* Duration Selection */}
        <div className="mt-6">
          <Label className="text-lg font-semibold mb-3 block">Select Duration</Label>
          <div className="grid grid-cols-3 gap-3">
            {durationOptions.map((option) => (
              <Card
                key={option.value}
                className={`p-4 cursor-pointer transition-all ${
                  selectedDuration === option.value
                    ? 'border-2 border-purple-500 bg-purple-50'
                    : 'border hover:border-purple-300'
                }`}
                onClick={() => setSelectedDuration(option.value as 1 | 3 | 12)}
              >
                <div className="text-center">
                  <div className="font-semibold">{option.label}</div>
                  {option.discount > 0 && (
                    <Badge variant="secondary" className="mt-1 bg-green-100 text-green-700">
                      Save {option.discount}%
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Payment Method */}
        <div className="mt-6">
          <Label className="text-lg font-semibold mb-3 block">Payment Method</Label>
          <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'aleo' | 'usdc')}>
            <div className="flex items-center space-x-2 mb-2">
              <RadioGroupItem value="aleo" id="aleo" />
              <Label htmlFor="aleo" className="cursor-pointer flex-1 flex items-center justify-between">
                <span>Aleo Credits</span>
                <Badge variant="outline">Recommended</Badge>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="usdc" id="usdc" />
              <Label htmlFor="usdc" className="cursor-pointer flex-1">
                USDC (via Shield Wallet)
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Price Summary */}
        <Card className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 mt-6">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">
              {tier.name} × {selectedDuration} month{selectedDuration > 1 ? 's' : ''}
            </span>
            <span className="font-semibold">
              ${(tier.usdPrice * selectedDuration).toFixed(2)}
            </span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between mb-2 text-green-600">
              <span>Discount ({discount * 100}%)</span>
              <span>-${(tier.usdPrice * selectedDuration * discount).toFixed(2)}</span>
            </div>
          )}
          <div className="border-t pt-2 mt-2 flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-purple-600">${totalPrice.toFixed(2)}</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Paid securely via Aleo blockchain with Shield Wallet
          </p>
        </Card>

        {/* Purchase Button */}
        <Button
          className="w-full mt-6 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-lg py-6"
          onClick={handlePurchase}
          disabled={processing || !publicKey}
        >
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
              Processing...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5 mr-2" />
              {!publicKey ? 'Connect Wallet' : `Purchase ${tier.name}`}
            </>
          )}
        </Button>

        {/* Privacy Note */}
        <div className="text-center text-xs text-gray-500 mt-4">
          🔒 Payments are processed securely on the Aleo blockchain.
          <br />
          Your subscription status is private and stored as an encrypted record.
        </div>
      </DialogContent>
    </Dialog>
  );
}
