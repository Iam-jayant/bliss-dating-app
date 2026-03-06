'use client';

import React, { useMemo } from 'react';
import { AleoWalletProvider as ProvableWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';
import { FoxWalletAdapter } from '@provablehq/aleo-wallet-adaptor-fox';
import { SoterWalletAdapter } from '@provablehq/aleo-wallet-adaptor-soter';
import { Network } from '@provablehq/aleo-types';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';

import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';

interface AleoWalletProviderProps {
  children: React.ReactNode;
}

export function AleoWalletProvider({ children }: AleoWalletProviderProps) {
  const wallets = useMemo(
    () => [
      new ShieldWalletAdapter(),   // Shield is the preferred wallet for Bliss
      new PuzzleWalletAdapter(),
      new LeoWalletAdapter(),
      new FoxWalletAdapter(),
      new SoterWalletAdapter(),
    ],
    []
  );

  return (
    <ProvableWalletProvider
      wallets={wallets}
      network={Network.TESTNET}
      decryptPermission={DecryptPermission.UponRequest}
      autoConnect={true}
      onError={(error) => console.error('Wallet error:', error)}
    >
      <WalletModalProvider>
        {children}
      </WalletModalProvider>
    </ProvableWalletProvider>
  );
}