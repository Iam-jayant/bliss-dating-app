'use client';

import { useState } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';
import { SubscriptionModal } from '@/components/subscription/subscription-modal';

interface GatedFeatureProps {
  requiredTier: 'premium' | 'plus';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function GatedFeature({ requiredTier, children, fallback }: GatedFeatureProps) {
  const { tier } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const tierRank = { free: 0, premium: 1, plus: 2 };
  const hasAccess = tierRank[tier.id] >= tierRank[requiredTier];

  if (hasAccess) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <>
      <button
        onClick={() => setShowUpgrade(true)}
        className="relative group cursor-pointer"
      >
        <div className="opacity-40 pointer-events-none blur-[2px]">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl backdrop-blur-sm">
          <div className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
            <Lock className="w-4 h-4" />
            <span>Upgrade to {requiredTier === 'plus' ? 'Plus' : 'Premium'}</span>
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      </button>

      <SubscriptionModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
      />
    </>
  );
}
