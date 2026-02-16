'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { getUserCount, getAllProfiles } from '@/lib/supabase/profile';
import { Card } from '@/components/ui/card';

/**
 * Debug info panel - shows connection and profile status
 * Only visible in development mode
 */
export function DebugPanel() {
  const { connected, publicKey } = useWallet();
  const [profileCount, setProfileCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const updateCount = () => {
      const count = getUserCount();
      setProfileCount(count);
    };

    updateCount();
    
    // Update every 2 seconds
    const interval = setInterval(updateCount, 2000);
    return () => clearInterval(interval);
  }, [mounted]);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (!mounted) {
    return null;
  }

  return (
    <Card className="fixed top-20 left-4 z-40 p-3 bg-card/90 backdrop-blur-sm border text-xs max-w-xs">
      <div className="font-bold mb-2">🐛 Debug Info</div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Wallet:</span>
          <span className={connected ? 'text-green-500' : 'text-red-500'}>
            {connected ? '✓ Connected' : '✗ Not Connected'}
          </span>
        </div>
        {publicKey && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Address:</span>
            <span className="font-mono text-xs">
              {publicKey.slice(0, 8)}...{publicKey.slice(-4)}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Profiles:</span>
          <span className="font-bold">{profileCount}</span>
        </div>
        <div className="mt-2 pt-2 border-t text-[10px] text-muted-foreground">
          Open console: blissAdmin.help()
        </div>
      </div>
    </Card>
  );
}
