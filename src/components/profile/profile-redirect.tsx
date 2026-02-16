'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useRouter, usePathname } from 'next/navigation';
import { getProfile } from '@/lib/supabase/profile';

/**
 * ProfileRedirect Component
 * 
 * Checks if connected wallet has an existing profile and redirects accordingly:
 * - If profile exists: redirect to /discovery
 * - If no profile: redirect to /onboarding (from landing page only)
 * Runs on all pages except target pages to prevent loops
 */
export function ProfileRedirect() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    async function checkAndRedirect() {
      // Don't redirect if already on profile or discovery page
      if (pathname === '/profile' || pathname === '/discovery') {
        return;
      }

      // Only check if wallet is connected (but allow access to discovery without wallet)
      if (!connected || !publicKey) {
        return;
      }

      // Prevent multiple simultaneous checks
      if (isChecking) {
        return;
      }

      setIsChecking(true);

      try {
        const profile = await getProfile(publicKey);
        
        if (profile) {
          // Profile exists, redirect to discovery feed (but only from landing/onboarding)
          if (pathname === '/' || pathname === '/onboarding') {
            console.log('✅ Profile found, redirecting to /discovery');
            router.push('/discovery');
          }
        } else {
          // No profile exists
          console.log('❌ No profile found');
          
          // If on landing page, redirect to onboarding
          if (pathname === '/') {
            console.log('🔄 Redirecting to onboarding...');
            router.push('/onboarding');
          }
          // If already on onboarding, let them continue
        }
      } catch (err) {
        // Silently fail - user can still navigate manually
        console.error('Profile check failed:', err);
      } finally {
        setIsChecking(false);
      }
    }

    checkAndRedirect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey, pathname]);

  // This component doesn't render anything
  return null;
}
