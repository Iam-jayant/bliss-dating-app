'use client';

import React from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';

export function WalletDebug() {
  const wallet = useWallet();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h4 className="font-bold mb-2">Wallet Debug Info:</h4>
      <div className="space-y-1">
        <div>Connected: {wallet.connected ? '✅' : '❌'}</div>
        <div>Connecting: {wallet.connecting ? '⏳' : '❌'}</div>
        <div>PublicKey: {wallet.publicKey ? `${wallet.publicKey.slice(0, 10)}...` : 'None'}</div>
        <div>Wallet: {wallet.wallet?.adapter?.name || 'None'}</div>
        <div>Wallets Available: {wallet.wallets?.length || 0}</div>
        <div>Auto Connect: {wallet.autoConnect ? '✅' : '❌'}</div>
      </div>
      
      {wallet.wallets && wallet.wallets.length > 0 && (
        <div className="mt-2">
          <div className="font-semibold">Available Wallets:</div>
          {wallet.wallets.map((w, i) => (
            <div key={i} className="text-xs">
              • {w.adapter.name} - {w.adapter.connected ? 'Connected' : 'Disconnected'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}