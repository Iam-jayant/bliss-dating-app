'use client';

import React from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletMultiButton } from '@demox-labs/aleo-wallet-adapter-reactui';
import { Button } from '@/components/ui/button';
import { Wallet, WalletIcon } from 'lucide-react';

interface WalletConnectButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
}

export function WalletConnectButton({ 
  className = '', 
  variant = 'default' 
}: WalletConnectButtonProps) {
  const { wallet, connected, connecting, publicKey } = useWallet();

  if (connected && publicKey) {
    return (
      <Button variant={variant} className={className}>
        <WalletIcon className="w-4 h-4 mr-2" />
        {`${publicKey.slice(0, 8)}...${publicKey.slice(-4)}`}
      </Button>
    );
  }

  if (connecting) {
    return (
      <Button variant={variant} disabled className={className}>
        <Wallet className="w-4 h-4 mr-2 animate-spin" />
        Connecting...
      </Button>
    );
  }

  return (
    <div className={className}>
      <WalletMultiButton />
    </div>
  );
}

/**
 * Custom wallet connection button with more control
 */
export function CustomWalletButton({ 
  className = '', 
  variant = 'default' 
}: WalletConnectButtonProps) {
  const { wallet, connected, connecting, publicKey } = useWallet();

  const getButtonText = () => {
    if (connecting) return 'Connecting...';
    if (connected && publicKey) {
      return `${publicKey.slice(0, 8)}...${publicKey.slice(-4)}`;
    }
    return 'Connect Wallet';
  };

  const getIcon = () => {
    if (connecting) {
      return <Wallet className="w-4 h-4 mr-2 animate-spin" />;
    }
    return <WalletIcon className="w-4 h-4 mr-2" />;
  };

  return (
    <Button
      variant={variant}
      disabled={connecting || !wallet}
      className={className}
    >
      {getIcon()}
      {getButtonText()}
    </Button>
  );
}