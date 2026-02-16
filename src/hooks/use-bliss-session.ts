'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { getProfile } from '@/lib/supabase/profile';
import type { VerificationRecord } from '@/lib/aleo/types';

interface BlissSession {
  isConnected: boolean;
  address: string | null;
  verificationRecord: VerificationRecord | null;
  isVerified: boolean;
  sessionId: string | null;
  hasProfile: boolean;
}

const STORAGE_KEY = 'bliss-session';

/**
 * Hook for managing Bliss app session state
 */
export function useBlissSession() {
  const { connected, publicKey, disconnect } = useWallet();
  
  const [session, setSession] = useState<BlissSession>({
    isConnected: false,
    address: null,
    verificationRecord: null,
    isVerified: false,
    sessionId: null,
    hasProfile: false,
  });

  // Load session from localStorage on mount
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem(STORAGE_KEY);
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        // Only restore if wallet is still connected and addresses match
        if (connected && publicKey && parsed.address === publicKey) {
          setSession(prev => ({
            ...prev,
            ...parsed,
            isConnected: connected,
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  }, [connected, publicKey]);

  // Update session when wallet connection changes and check for existing profile
  useEffect(() => {
    async function checkProfile() {
      if (connected && publicKey) {
        try {
          const profile = await getProfile(publicKey);
          
          if (profile) {
            // Profile exists - mark as verified
            console.log('✅ Existing profile found, auto-verifying session');
            setSession(prev => ({
              ...prev,
              isConnected: connected,
              address: publicKey,
              hasProfile: true,
              isVerified: true,
              sessionId: prev.sessionId || `bliss-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            }));
          } else {
            // No profile yet
            console.log('❌ No profile found');
            setSession(prev => ({
              ...prev,
              isConnected: connected,
              address: publicKey,
              hasProfile: false,
            }));
          }
        } catch (err) {
          console.error('Profile check failed:', err);
          setSession(prev => ({
            ...prev,
            isConnected: connected,
            address: publicKey,
            hasProfile: false,
          }));
        }
      } else {
        // Wallet disconnected - clear session
        setSession(prev => ({
          ...prev,
          isConnected: false,
          address: null,
          verificationRecord: null,
          isVerified: false,
          sessionId: null,
          hasProfile: false,
        }));
      }
    }
    
    checkProfile();
  }, [connected, publicKey]);

  // Save session to localStorage whenever it changes
  useEffect(() => {
    if (session.address) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } catch (error) {
        console.error('Failed to save session:', error);
      }
    }
  }, [session]);

  /**
   * Set verification record and mark user as verified
   */
  const setVerificationRecord = useCallback((record: VerificationRecord) => {
    const sessionId = `bliss-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setSession(prev => ({
      ...prev,
      verificationRecord: record,
      isVerified: true,
      sessionId,
    }));
  }, []);

  /**
   * Clear verification record
   */
  const clearVerification = useCallback(() => {
    setSession(prev => ({
      ...prev,
      verificationRecord: null,
      isVerified: false,
      sessionId: null,
    }));
  }, []);

  /**
   * Clear entire session
   */
  const clearSession = useCallback(async () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setSession({
        isConnected: false,
        address: null,
        verificationRecord: null,
        isVerified: false,
        sessionId: null,
        hasProfile: false,
      });
      
      // Disconnect wallet if connected
      if (connected) {
        await disconnect();
      }
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }, [connected, disconnect]);

  /**
   * Check if user can access protected content
   */
  const canAccessProtected = useCallback(() => {
    return session.isConnected && session.isVerified && session.verificationRecord !== null;
  }, [session]);

  /**
   * Get session summary for debugging
   */
  const getSessionSummary = useCallback(() => {
    return {
      connected: session.isConnected,
      address: session.address ? `${session.address.slice(0, 8)}...${session.address.slice(-4)}` : null,
      verified: session.isVerified,
      hasRecord: !!session.verificationRecord,
      sessionId: session.sessionId,
      canAccess: canAccessProtected(),
    };
  }, [session, canAccessProtected]);

  return {
    // Session state
    session,
    isConnected: session.isConnected,
    address: session.address,
    verificationRecord: session.verificationRecord,
    isVerified: session.isVerified,
    sessionId: session.sessionId,
    hasProfile: session.hasProfile,

    // Actions
    setVerificationRecord,
    clearVerification,
    clearSession,

    // Computed
    canAccessProtected: canAccessProtected(),
    sessionSummary: getSessionSummary(),
  };
}