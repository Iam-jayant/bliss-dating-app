'use client';

import { useEffect } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useRouter, usePathname } from 'next/navigation';
import { getProfile } from '@/lib/supabase/profile';

/**
 * ProfileRedirect Component
 * 
 * Checks if connected wallet has an existing profile and redirects to /profile
 * Only runs on landing page and onboarding page
 * Prevents redirect loops by checking current path
 */
export function ProfileRedirect() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function checkAndRedirect() {
      // Don't redirect if already on profile or discovery page
      if (pathname === '/profile' || pathname === '/discovery') {
        return;
      }

      // Only check on landing page or onboarding page
      if (pathname !== '/' && pathname !== '/onboarding') {
        return;
      }

      // Only check if wallet is connected
      if (!connected || !publicKey) {
        return;
      }

      try {
        const profile = await getProfile(publicKey);
        
        if (profile) {
          // Profile exists, redirect to discovery feed
          console.log('Profile found, redirecting to /discovery');
          router.push('/discovery');
        }
      } catch (err) {
        // Silently fail - user can still navigate manually
        console.error('Profile check failed:', err);
      }
    }

    checkAndRedirect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey, pathname]);

  // This component doesn't render anything
  return null;
}
