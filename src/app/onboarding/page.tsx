'use client';

import React from 'react';
import { AleoWalletProvider } from '@/lib/aleo/wallet-provider';
import { OnboardingPage } from '@/components/onboarding/onboarding-page';

export default function OnboardingRoute() {
  return (
    <AleoWalletProvider>
      <OnboardingPage />
    </AleoWalletProvider>
  );
}
