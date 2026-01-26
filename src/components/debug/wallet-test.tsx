'use client';

import React from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { DecryptPermission, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';
import { Button } from '@/components/ui/button';

export function WalletTest() {
  const { connect, disconnect, connected, connecting, wallets, select } = useWallet();

  const handleConnect = async () => {
    try {
      console.log('Available wallets:', wallets);
      
      if (wallets && wallets.length > 0) {
        const leoWallet = wallets.find(w => w.adapter.name === 'Leo Wallet');
        if (leoWallet) {
          console.log('Selecting Leo Wallet:', leoWallet);
          select(leoWallet.adapter.name);
          await connect(DecryptPermission.UponRequest, WalletAdapterNetwork.Testnet);
        } else {
          console.log('Leo Wallet not found in available wallets');
        }
      } else {
        console.log('No wallets available');
      }
    } catch (error) {
      console.error('Connection error:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Disconnection error:', error);
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h4 className="font-bold mb-2">Wallet Test:</h4>
      <div className="space-y-2">
        <Button 
          onClick={handleConnect} 
          disabled={connected || connecting}
          size="sm"
          className="w-full"
        >
          {connecting ? 'Connecting...' : 'Test Connect'}
        </Button>
        
        <Button 
          onClick={handleDisconnect} 
          disabled={!connected}
          size="sm"
          variant="outline"
          className="w-full"
        >
          Disconnect
        </Button>
        
        <div className="text-xs">
          Status: {connected ? 'Connected' : connecting ? 'Connecting' : 'Disconnected'}
        </div>
      </div>
    </div>
  );
}