'use client';

import React, { useMemo } from 'react';
import { WalletProvider } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletModalProvider } from '@demox-labs/aleo-wallet-adapter-reactui';
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import {
  DecryptPermission,
  WalletAdapterNetwork,
} from '@demox-labs/aleo-wallet-adapter-base';

// Import wallet adapter CSS
import '@demox-labs/aleo-wallet-adapter-reactui/styles.css';

interface AleoWalletProviderProps {
  children: React.ReactNode;
}

export function AleoWalletProvider({ children }: AleoWalletProviderProps) {
  const wallets = useMemo(
    () => [
      new LeoWalletAdapter({
        appName: 'Bliss Age Verification',
      }),
    ],
    []
  );

  return (
    <WalletProvider
      wallets={wallets}
      decryptPermission={DecryptPermission.UponRequest}
      network={WalletAdapterNetwork.TestnetBeta}
      autoConnect={true} // Automatically reconnect wallet on page load/navigation
    >
      <WalletModalProvider>
        {children}
      </WalletModalProvider>
    </WalletProvider>
  );
}