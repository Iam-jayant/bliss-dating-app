/**
 * Discovery Page — Full-viewport card-based profile browsing
 * Inspired by Tinder/Bumble/Hinge: immersive photo cards, floating actions
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Heart, X, Star, RotateCcw, ChevronDown, ChevronUp, SlidersHorizontal, Flag } from 'lucide-react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { getAllProfiles, getProfile, getProfileByHash, getProfileImageUrl } from '@/lib/storage/profile';
import type { ProfileData } from '@/lib/storage/types';
import {
  calculateEnhancedCompatibility,
  recordLike,
  recordPass,
  checkMutualMatch,
  hasActedOn
} from '@/lib/matching/compatibility-service';
import { useSubscription } from '@/hooks/use-subscription';
import {
  decrementDailySwipes,
  flushPendingSwipeSettlements,
  getPendingSwipeSettlementCount,
  getPendingSwipeSettlements,
  incrementDailySwipes,
  incrementDailySuperLikes,
  popLastPendingSwipeSettlement,
  queuePendingSwipeSettlement,
  recordSwipeOnChain,
} from '@/lib/payment/payment-service';
import { MatchModal } from './match-modal';
import { DiscoveryFilters, type FilterState } from './discovery-filters';
import { ReportModal } from '@/components/safety/report-modal';
import { SubscriptionModal } from '@/components/subscription/subscription-modal';
import { BLISS_V3_KEYS } from '@/lib/storage/schema';
import { PROFILES_UPDATED_EVENT, syncProfilesFromNetwork } from '@/lib/storage/gun-storage';
import Image from 'next/image';
import { aleoProfileService } from '@/lib/aleo/profile-service';

interface DiscoveryProfile {
  walletAddress: string;
  name: string;
  bio: string;
  bioPrompt: string;
  interests: string[];
  datingIntent: string;
  imageCid: string;
  distance: number;
  compatibilityScore?: number;
}

const SWIPE_THRESHOLD = 100;
const SWIPE_SETTLEMENT_MODE = process.env.NEXT_PUBLIC_SWIPE_SETTLEMENT_MODE || 'deferred';
const PENDING_SWIPE_SETTLEMENT_THRESHOLD = Number(process.env.NEXT_PUBLIC_SWIPE_SETTLEMENT_THRESHOLD || 5);
const PENDING_SWIPE_SETTLEMENT_RETRY_MS = 30_000;
const ACTION_RECEIPT_MODE = process.env.NEXT_PUBLIC_SWIPE_RECEIPT_MODE || 'deferred';
const PENDING_ACTION_RECEIPTS_KEY = 'bliss_v3_pending_action_receipts';
const DEFERRED_SETTLEMENT_THRESHOLD = Number(process.env.NEXT_PUBLIC_SWIPE_SETTLEMENT_THRESHOLD || 10);
const DEFERRED_SETTLEMENT_RETRY_MS = 30_000;
const BACKGROUND_SETTLEMENT_INTERVAL_MS = Number(process.env.NEXT_PUBLIC_BACKGROUND_SETTLEMENT_INTERVAL_MS || 45_000);
const BACKGROUND_SETTLEMENT_IDLE_MS = Number(process.env.NEXT_PUBLIC_BACKGROUND_SETTLEMENT_IDLE_MS || 20_000);
const BACKGROUND_SETTLEMENT_STALE_MS = Number(process.env.NEXT_PUBLIC_BACKGROUND_SETTLEMENT_STALE_MS || 300_000);
const BACKGROUND_SETTLEMENT_COOLDOWN_MS = Number(process.env.NEXT_PUBLIC_BACKGROUND_SETTLEMENT_COOLDOWN_MS || 90_000);
const AUTO_SWIPE_SETTLEMENT_BATCH_SIZE = 1;
const AUTO_ACTION_RECEIPT_BATCH_SIZE = 1;
const PROFILE_SYNC_RETRY_DELAYS_MS = [0, 350, 1200] as const;
const GLOBAL_DISCOVERY_MODE = true;

interface PendingActionReceipt {
  id: string;
  targetWalletAddress: string;
  actionType: 'pass' | 'like' | 'superlike';
  createdAt: number;
  attempts?: number;
  lastAttemptAt?: number;
}

/** Resolve any image source to a displayable URL */
function getDisplayImageUrl(imageCid: string, profileName: string): string {
  if (!imageCid) {
    return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(profileName)}&backgroundColor=c0aede`;
  }
  if (imageCid.startsWith('local:') || imageCid.startsWith('data:')) return imageCid.startsWith('data:') ? imageCid : getProfileImageUrl(imageCid);
  return getProfileImageUrl(imageCid);
}

/** Format dating intent to a human-friendly label */
function formatIntent(intent: string): string {
  const map: Record<string, string> = {
    long_term: 'Long-term',
    short_term: 'Something casual',
    casual: 'Casual',
    friendship: 'Friendship',
    not_sure: 'Open to explore',
  };
  return map[intent] || intent;
}

function normalizeIntent(intent: string): string {
  const cleaned = intent.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  if (cleaned === 'long_term') return 'long_term';
  if (cleaned === 'short_term') return 'short_term';
  if (cleaned === 'casual') return 'casual';
  if (cleaned === 'friends' || cleaned === 'friendship') return 'friendship';
  return 'not_sure';
}

function normalizeInterests(interests: unknown): string[] {
  if (!Array.isArray(interests)) return [];
  return interests.filter((interest): interest is string => typeof interest === 'string');
}

function loadDeferredActionReceipts(): PendingActionReceipt[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(PENDING_ACTION_RECEIPTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item, idx) => {
      const targetWalletAddress = typeof item?.targetWalletAddress === 'string' ? item.targetWalletAddress : '';
      const actionType = item?.actionType === 'pass' || item?.actionType === 'superlike' ? item.actionType : 'like';
      const createdAt = typeof item?.createdAt === 'number' ? item.createdAt : Date.now();
      return {
        id: typeof item?.id === 'string'
          ? item.id
          : `${createdAt}_${actionType}_${targetWalletAddress}_${idx}`,
        targetWalletAddress,
        actionType,
        createdAt,
        attempts: typeof item?.attempts === 'number' ? item.attempts : 0,
        lastAttemptAt: typeof item?.lastAttemptAt === 'number' ? item.lastAttemptAt : undefined,
      } satisfies PendingActionReceipt;
    });
  } catch {
    return [];
  }
}

function saveDeferredActionReceipts(receipts: PendingActionReceipt[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PENDING_ACTION_RECEIPTS_KEY, JSON.stringify(receipts));
}

function queueDeferredActionReceipt(receipt: Omit<PendingActionReceipt, 'id'>): number {
  if (typeof window === 'undefined') return 0;
  const current = loadDeferredActionReceipts();
  current.push({
    ...receipt,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 12)}`,
  });
  saveDeferredActionReceipts(current);
  return current.length;
}

export default function DiscoveryPage() {
  const {
    address: publicKey,
    executeTransaction,
    transactionStatus,
    requestRecords,
  } = useWallet();
  const { canSwipe, canSuperLike, tier, refresh: refreshSubscription } = useSubscription();
  const [profiles, setProfiles] = useState<DiscoveryProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<DiscoveryProfile | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<ProfileData | null>(null);
  const [exitDirection, setExitDirection] = useState<'left' | 'right'>('right');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    intents: [],
    interests: [],
    minCompatibility: 0,
  });
  const [showReport, setShowReport] = useState(false);
  const [swipeHistory, setSwipeHistory] = useState<string[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const [swipeIndicator, setSwipeIndicator] = useState<'like' | 'nope' | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const flushInProgressRef = useRef(false);
  const swipeFlushInProgressRef = useRef(false);
  const lastSwipeInteractionAtRef = useRef(0);
  const lastSwipeAutoFlushAtRef = useRef(0);
  const lastActionAutoFlushAtRef = useRef(0);

  const currentProfile = profiles[currentIndex];

  const flushDeferredSwipeSettlements = useCallback(async (maxItems = 1) => {
    if (SWIPE_SETTLEMENT_MODE !== 'deferred' || !publicKey) return;
    if (swipeFlushInProgressRef.current) return;
    if (!executeTransaction || !transactionStatus || !requestRecords) return;
    if (getPendingSwipeSettlementCount(publicKey) === 0) return;

    swipeFlushInProgressRef.current = true;
    try {
      await flushPendingSwipeSettlements(
        publicKey,
        async (opts) => {
          const result = await executeTransaction(opts);
          if (!result?.transactionId) {
            throw new Error('Swipe settlement transaction was rejected by the wallet.');
          }
          return { transactionId: result.transactionId };
        },
        async (transactionId) => {
          const status = await transactionStatus(transactionId);
          return {
            status: String(status.status || 'pending'),
            transactionId: status.transactionId || transactionId,
          };
        },
        async (programId) => {
          const records = await requestRecords(programId);
          return records as Array<{
            owner?: string;
            data: Record<string, string>;
            plaintext: string;
            programId?: string;
          }>;
        },
        {
          maxItems,
          minRetryIntervalMs: PENDING_SWIPE_SETTLEMENT_RETRY_MS,
        },
      );
      await refreshSubscription();
    } catch {
      // Queue is preserved for later retries.
    } finally {
      swipeFlushInProgressRef.current = false;
    }
  }, [executeTransaction, publicKey, refreshSubscription, requestRecords, transactionStatus]);

  const triggerBackgroundSwipeSettlement = useCallback((force = false) => {
    if (SWIPE_SETTLEMENT_MODE !== 'deferred' || !publicKey) return;
    const queue = getPendingSwipeSettlements(publicKey);
    if (!queue.length) return;

    const now = Date.now();
    const oldestAgeMs = now - queue[0].createdAt;
    const shouldFlushByQueueState = queue.length >= PENDING_SWIPE_SETTLEMENT_THRESHOLD || oldestAgeMs >= BACKGROUND_SETTLEMENT_STALE_MS;
    if (!force && !shouldFlushByQueueState) return;
    if (!force && now - lastSwipeInteractionAtRef.current < BACKGROUND_SETTLEMENT_IDLE_MS) return;
    if (!force && now - lastSwipeAutoFlushAtRef.current < BACKGROUND_SETTLEMENT_COOLDOWN_MS) return;

    lastSwipeAutoFlushAtRef.current = now;
    void flushDeferredSwipeSettlements(AUTO_SWIPE_SETTLEMENT_BATCH_SIZE);
  }, [flushDeferredSwipeSettlements, publicKey]);

  const consumeSwipeEntitlement = useCallback(async (): Promise<boolean> => {
    if (!publicKey) return false;

    if (SWIPE_SETTLEMENT_MODE === 'deferred') {
      incrementDailySwipes(publicKey);
      queuePendingSwipeSettlement(publicKey);
      await refreshSubscription();
      triggerBackgroundSwipeSettlement(false);
      return true;
    }

    if (!executeTransaction || !transactionStatus || !requestRecords) {
      // If adapter capabilities are unavailable, block swipes to avoid client-only bypass.
      setShowSubscriptionModal(true);
      return false;
    }

    try {
      await recordSwipeOnChain(
        publicKey,
        async (opts) => {
          const result = await executeTransaction(opts);
          if (!result?.transactionId) {
            throw new Error('Swipe entitlement transaction was rejected by the wallet.');
          }
          return { transactionId: result.transactionId };
        },
        async (transactionId) => {
          const status = await transactionStatus(transactionId);
          return {
            status: String(status.status || 'pending'),
            transactionId: status.transactionId || transactionId,
          };
        },
        async (programId) => {
          const records = await requestRecords(programId);
          return records as Array<{
            owner?: string;
            data: Record<string, string>;
            plaintext: string;
            programId?: string;
          }>;
        },
      );
      await refreshSubscription();
      return true;
    } catch (error) {
      console.warn('On-chain swipe entitlement failed:', error);
      await refreshSubscription();
      setShowSubscriptionModal(true);
      return false;
    }
  }, [executeTransaction, publicKey, refreshSubscription, requestRecords, transactionStatus, triggerBackgroundSwipeSettlement]);

  const recordActionReceipt = useCallback(async (
    targetWalletAddress: string,
    actionType: 'pass' | 'like' | 'superlike',
  ): Promise<string | undefined> => {
    if (!publicKey || !executeTransaction) return undefined;
    const requestTransaction = async (opts: {
      program: string;
      function: string;
      inputs: string[];
      fee: number;
      privateFee: boolean;
    }) => {
      const result = await executeTransaction(opts);
      if (!result?.transactionId) {
        throw new Error('Wallet transaction was rejected.');
      }
      return { transactionId: result.transactionId };
    };

    return aleoProfileService.recordAction(
      {
        publicKey,
        requestTransaction,
        requestRecords: async (programId: string) => {
          if (!requestRecords) return [];
          const records = await requestRecords(programId);
          return records as Array<{ plaintext: string; data?: Record<string, string> }>;
        },
      },
      targetWalletAddress,
      actionType,
    );
  }, [executeTransaction, publicKey, requestRecords]);

  const loadCurrentUserProfile = useCallback(async () => {
    if (publicKey) {
      const profile = await getProfile(publicKey);
      setCurrentUserProfile(profile);
    }
  }, [publicKey]);

  const flushDeferredActionReceipts = useCallback(async (maxItems = 1) => {
    if (ACTION_RECEIPT_MODE === 'immediate' || !publicKey) return;
    if (flushInProgressRef.current) return;

    const queue = loadDeferredActionReceipts();
    if (!queue.length) return;

    flushInProgressRef.current = true;
    try {
      const now = Date.now();
      const processing = queue.slice(0, maxItems);
      const processingIds = new Set(processing.map((item) => item.id));
      const retryById = new Map<string, PendingActionReceipt>();

      for (const item of processing) {
        if (item.lastAttemptAt && now - item.lastAttemptAt < DEFERRED_SETTLEMENT_RETRY_MS) {
          retryById.set(item.id, item);
          continue;
        }

        try {
          // eslint-disable-next-line no-await-in-loop
          await recordActionReceipt(item.targetWalletAddress, item.actionType);
        } catch {
          retryById.set(item.id, {
            ...item,
            attempts: (item.attempts || 0) + 1,
            lastAttemptAt: now,
          });
        }
      }

      const latestQueue = loadDeferredActionReceipts();
      const latestIds = new Set(latestQueue.map((item) => item.id));
      const retryItems = Array.from(retryById.values()).filter((item) => latestIds.has(item.id));
      const remainingLatest = latestQueue.filter((item) => !processingIds.has(item.id));
      saveDeferredActionReceipts([...retryItems, ...remainingLatest]);
    } finally {
      flushInProgressRef.current = false;
    }
  }, [publicKey, recordActionReceipt]);

  const triggerBackgroundActionReceiptFlush = useCallback((force = false) => {
    if (ACTION_RECEIPT_MODE === 'immediate' || !publicKey) return;
    const queue = loadDeferredActionReceipts();
    if (!queue.length) return;

    const now = Date.now();
    const oldestAgeMs = now - queue[0].createdAt;
    const shouldFlushByQueueState = queue.length >= DEFERRED_SETTLEMENT_THRESHOLD || oldestAgeMs >= BACKGROUND_SETTLEMENT_STALE_MS;
    if (!force && !shouldFlushByQueueState) return;
    if (!force && now - lastSwipeInteractionAtRef.current < BACKGROUND_SETTLEMENT_IDLE_MS) return;
    if (!force && now - lastActionAutoFlushAtRef.current < BACKGROUND_SETTLEMENT_COOLDOWN_MS) return;

    lastActionAutoFlushAtRef.current = now;
    void flushDeferredActionReceipts(AUTO_ACTION_RECEIPT_BATCH_SIZE);
  }, [flushDeferredActionReceipts, publicKey]);

  const loadProfiles = useCallback(async () => {
    try {
      setLoading(true);

      // Gun profile sync is async/event-driven, so retry a couple times
      // before deciding the discovery feed is empty.
      void syncProfilesFromNetwork();
      let localProfiles: ProfileData[] = [];
      for (const delayMs of PROFILE_SYNC_RETRY_DELAYS_MS) {
        if (delayMs > 0) {
          // eslint-disable-next-line no-await-in-loop
          await new Promise((resolve) => window.setTimeout(resolve, delayMs));
        }
        // eslint-disable-next-line no-await-in-loop
        localProfiles = await getAllProfiles();
        if (localProfiles.length > 0) break;
      }

      if (localProfiles.length > 0) {
        let currentUserHash: string | undefined;
        let userProfile: ProfileData | null = null;

        if (publicKey) {
          userProfile = await getProfile(publicKey);
          currentUserHash = userProfile?.wallet_hash;
        }

        const normalizedFilterIntents = filters.intents.map(normalizeIntent);
        const normalizedFilterInterests = filters.interests.map((interest) => interest.trim().toLowerCase());

        // Convert ProfileData -> DiscoveryProfile
        let discoveryProfiles: DiscoveryProfile[] = localProfiles
          .filter((p) => {
            if (!p?.wallet_hash) return false;
            if (currentUserHash && p.wallet_hash === currentUserHash) return false;
            if (!GLOBAL_DISCOVERY_MODE && currentUserHash && hasActedOn(currentUserHash, p.wallet_hash)) return false;
            return true;
          })
          .map((profile) => {
            const safeInterests = normalizeInterests(profile.interests);
            const safeIntent = normalizeIntent(profile.dating_intent || 'not_sure');
            let compatibilityScore: number | undefined;
            if (userProfile) {
              try {
                const compat = calculateEnhancedCompatibility(
                  {
                    ...userProfile,
                    interests: normalizeInterests(userProfile.interests),
                    dating_intent: normalizeIntent(userProfile.dating_intent || 'not_sure') as ProfileData['dating_intent'],
                  },
                  {
                    ...profile,
                    interests: safeInterests,
                    dating_intent: safeIntent as ProfileData['dating_intent'],
                  },
                );
                compatibilityScore = compat.score;
              } catch {
                compatibilityScore = undefined;
              }
            }
            return {
              walletAddress: profile.wallet_hash,
              name: profile.name || 'Anonymous',
              bio: profile.bio || '',
              bioPrompt: profile.bio_prompt_type || 'interests',
              interests: safeInterests,
              datingIntent: safeIntent,
              imageCid: profile.profile_image_path || '',
              distance: 0,
              compatibilityScore,
            };
          });

        // Apply user filters
        if (!GLOBAL_DISCOVERY_MODE && normalizedFilterIntents.length > 0) {
          discoveryProfiles = discoveryProfiles.filter((p) =>
            normalizedFilterIntents.includes(normalizeIntent(p.datingIntent))
          );
        }
        if (!GLOBAL_DISCOVERY_MODE && normalizedFilterInterests.length > 0) {
          discoveryProfiles = discoveryProfiles.filter((p) =>
            p.interests.some((interest) => normalizedFilterInterests.includes(interest.trim().toLowerCase()))
          );
        }
        if (!GLOBAL_DISCOVERY_MODE && filters.minCompatibility > 0) {
          discoveryProfiles = discoveryProfiles.filter((p) =>
            (p.compatibilityScore || 0) >= filters.minCompatibility
          );
        }

        // Sort by compatibility (highest first)
        const sorted = discoveryProfiles.sort((a, b) => {
          if (a.compatibilityScore !== undefined && b.compatibilityScore === undefined) return -1;
          if (a.compatibilityScore === undefined && b.compatibilityScore !== undefined) return 1;
          if (a.compatibilityScore !== undefined && b.compatibilityScore !== undefined) {
            if (b.compatibilityScore !== a.compatibilityScore) {
              return b.compatibilityScore - a.compatibilityScore;
            }
          }
          return a.distance - b.distance;
        });

        setProfiles(sorted);
        setCurrentIndex(0);
        setLoading(false);
        return;
      }

      setProfiles([]);
    } catch (error) {
      console.error('Failed to load profiles:', error);
    } finally {
      setLoading(false);
    }
  }, [publicKey, filters]);

  useEffect(() => {
    loadProfiles();
    loadCurrentUserProfile();
  }, [loadProfiles, loadCurrentUserProfile]);

  useEffect(() => {
    const handleFocus = () => {
      void loadProfiles();
      void loadCurrentUserProfile();
    };
    const handleProfilesUpdated = () => {
      void loadProfiles();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadProfiles();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener(PROFILES_UPDATED_EVENT, handleProfilesUpdated);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener(PROFILES_UPDATED_EVENT, handleProfilesUpdated);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadCurrentUserProfile, loadProfiles]);

  useEffect(() => {
    if (ACTION_RECEIPT_MODE === 'immediate') return;

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        triggerBackgroundActionReceiptFlush(true);
      }
    };

    const intervalId = window.setInterval(() => {
      triggerBackgroundActionReceiptFlush(false);
    }, BACKGROUND_SETTLEMENT_INTERVAL_MS);

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [triggerBackgroundActionReceiptFlush]);

  useEffect(() => {
    if (SWIPE_SETTLEMENT_MODE !== 'deferred') return;

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        triggerBackgroundSwipeSettlement(true);
      }
    };

    const intervalId = window.setInterval(() => {
      triggerBackgroundSwipeSettlement(false);
    }, BACKGROUND_SETTLEMENT_INTERVAL_MS);

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [triggerBackgroundSwipeSettlement]);

  // ─── SWIPE HANDLERS ────────────────────────────────────────────

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!publicKey) {
      alert('Please connect your wallet to swipe on profiles');
      return;
    }
    if (!canSwipe || !currentProfile) return;

    lastSwipeInteractionAtRef.current = Date.now();
    const entitlementOk = await consumeSwipeEntitlement();
    if (!entitlementOk) return;

    setExitDirection(direction);

    // Track in history
    setSwipeHistory(prev => [...prev, currentProfile.walletAddress].slice(-5));

    if (direction === 'right') {
      await handleLike(currentProfile.walletAddress);
    } else {
      await handlePass(currentProfile.walletAddress);
    }

    setCurrentIndex(prev => prev + 1);
  };

  const handleLike = async (targetWalletHash: string) => {
    if (!publicKey) return;

    try {
      const myProfile = await getProfile(publicKey);
      const targetProfile = await getProfileByHash(targetWalletHash);

      if (!myProfile || !targetProfile) {
        console.warn('Profile lookup failed; recording like with hashes only');
        const { hashWalletAddress } = await import('@/lib/wallet-hash');
        const myHash = await hashWalletAddress(publicKey);
        await recordLike(myHash, targetWalletHash);
        return;
      }

      const onChainReceiptTxId = ACTION_RECEIPT_MODE === 'immediate'
        ? await recordActionReceipt(targetProfile.wallet_address, 'like')
        : undefined;
      if (ACTION_RECEIPT_MODE !== 'immediate') {
        queueDeferredActionReceipt({
          targetWalletAddress: targetProfile.wallet_address,
          actionType: 'like',
          createdAt: Date.now(),
        });
        triggerBackgroundActionReceiptFlush(false);
      }
      await recordLike(myProfile.wallet_hash, targetWalletHash, false, onChainReceiptTxId);

      const isMutualMatch = await checkMutualMatch(
        myProfile.wallet_hash,
        targetWalletHash,
        myProfile,
        targetProfile,
      );

      if (isMutualMatch) {
        const matchedData = profiles.find((p) => p.walletAddress === targetWalletHash);
        if (matchedData) {
          setMatchedProfile(matchedData);
          setShowMatchModal(true);
        }
      }
    } catch (error) {
      console.error('Failed to record like:', error);
    }
  };

  const handlePass = async (targetWalletHash: string) => {
    if (!publicKey) return;

    try {
      const myProfile = await getProfile(publicKey);

      if (!myProfile) {
        const { hashWalletAddress } = await import('@/lib/wallet-hash');
        const myHash = await hashWalletAddress(publicKey);
        await recordPass(myHash, targetWalletHash);
        return;
      }

      const targetProfile = await getProfileByHash(targetWalletHash);
      const onChainReceiptTxId = targetProfile && ACTION_RECEIPT_MODE === 'immediate'
        ? await recordActionReceipt(targetProfile.wallet_address, 'pass')
        : undefined;

      if (targetProfile && ACTION_RECEIPT_MODE !== 'immediate') {
        queueDeferredActionReceipt({
          targetWalletAddress: targetProfile.wallet_address,
          actionType: 'pass',
          createdAt: Date.now(),
        });
        triggerBackgroundActionReceiptFlush(false);
      }

      await recordPass(myProfile.wallet_hash, targetWalletHash, onChainReceiptTxId);
    } catch (error) {
      console.error('Failed to record pass:', error);
    }
  };

  const handleUndo = () => {
    if (swipeHistory.length === 0) return;
    
    const lastUserHash = swipeHistory[swipeHistory.length - 1];
    setSwipeHistory(prev => prev.slice(0, -1));
    
    const likes = JSON.parse(localStorage.getItem(BLISS_V3_KEYS.likes) || '[]');
    const passes = JSON.parse(localStorage.getItem(BLISS_V3_KEYS.passes) || '[]');
    
    const filteredLikes = likes.filter((l: any) => l.to !== lastUserHash);
    const filteredPasses = passes.filter((p: any) => p.to !== lastUserHash);
    
    localStorage.setItem(BLISS_V3_KEYS.likes, JSON.stringify(filteredLikes));
    localStorage.setItem(BLISS_V3_KEYS.passes, JSON.stringify(filteredPasses));
    
    if (publicKey) {
      if (SWIPE_SETTLEMENT_MODE === 'deferred') {
        const removedPending = popLastPendingSwipeSettlement(publicKey);
        if (removedPending) {
          decrementDailySwipes(publicKey);
        }
      }
      void refreshSubscription();
    }
    
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSuperLike = async () => {
    if (!currentProfile || !publicKey) return;
    if (!canSwipe || !canSuperLike) return;

    lastSwipeInteractionAtRef.current = Date.now();
    const entitlementOk = await consumeSwipeEntitlement();
    if (!entitlementOk) return;

    setExitDirection('right');
    incrementDailySuperLikes(publicKey);
    await refreshSubscription();

    setSwipeHistory((prev) => [...prev, currentProfile.walletAddress].slice(-5));

    try {
      const myProfile = await getProfile(publicKey);
      const targetProfile = await getProfileByHash(currentProfile.walletAddress);

      if (myProfile && targetProfile) {
        const onChainReceiptTxId = ACTION_RECEIPT_MODE === 'immediate'
          ? await recordActionReceipt(targetProfile.wallet_address, 'superlike')
          : undefined;
        if (ACTION_RECEIPT_MODE !== 'immediate') {
          queueDeferredActionReceipt({
            targetWalletAddress: targetProfile.wallet_address,
            actionType: 'superlike',
            createdAt: Date.now(),
          });
          triggerBackgroundActionReceiptFlush(false);
        }
        await recordLike(myProfile.wallet_hash, currentProfile.walletAddress, true, onChainReceiptTxId);

        const isMutualMatch = await checkMutualMatch(
          myProfile.wallet_hash,
          currentProfile.walletAddress,
          myProfile,
          targetProfile,
        );

        if (isMutualMatch) {
          setMatchedProfile(currentProfile);
          setShowMatchModal(true);
        }
      }
    } catch (error) {
      console.error('Failed to record super like:', error);
    }

    setCurrentIndex((prev) => prev + 1);
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      handleSwipe('right');
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      handleSwipe('left');
    }
  };

  // ─── LOADING ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="fixed inset-0 pl-20 flex items-center justify-center bg-background">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <div className="relative w-14 h-14">
            <motion.div
              className="absolute inset-0 rounded-full border-[3px] border-primary/20"
              style={{ borderTopColor: 'hsl(var(--primary))' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
          </div>
          <p className="text-sm text-muted-foreground tracking-wide">Finding people near you...</p>
        </motion.div>
      </div>
    );
  }

  // ─── DAILY LIMIT ───────────────────────────────────────────

  if (!canSwipe) {
    return (
      <div className="fixed inset-0 pl-20 flex items-center justify-center bg-background p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full text-center"
        >
          <div className="text-5xl mb-5">✨</div>
          <h2 className="text-2xl font-headline italic text-foreground mb-2">You&apos;re out of likes</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            You&apos;ve used all {tier.limits.dailySwipes} likes for today. Come back tomorrow or go unlimited.
          </p>
          <button
            className="w-full py-3.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold text-sm tracking-wide hover:shadow-lg hover:shadow-pink-500/25 transition-all"
            onClick={() => setShowSubscriptionModal(true)}
          >
            Get Unlimited
          </button>
          <p className="text-xs text-muted-foreground mt-4">
            Resets in {24 - new Date().getHours()} hours
          </p>
        </motion.div>
        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          onSuccess={refreshSubscription}
        />
      </div>
    );
  }

  // ─── NO MORE PROFILES ──────────────────────────────────────

  if (currentIndex >= profiles.length) {
    return (
      <div className="fixed inset-0 pl-20 flex items-center justify-center bg-background p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full text-center"
        >
          <div className="text-5xl mb-5">🫧</div>
          <h2 className="text-2xl font-headline italic text-foreground mb-2">That&apos;s everyone</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            You&apos;ve seen all profiles nearby. Check back soon for new people!
          </p>
          <div className="flex gap-3">
            <button
              className="flex-1 py-3 rounded-full border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              onClick={() => { setCurrentIndex(0); loadProfiles(); }}
            >
              Start Over
            </button>
            <button
              className="flex-1 py-3 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              onClick={() => window.location.href = '/profile'}
            >
              Edit Profile
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── MAIN DISCOVERY ────────────────────────────────────────

  return (
    <div className="fixed inset-0 pl-20 flex items-center justify-center bg-background overflow-hidden select-none">
      {/* Mobile-width container */}
      <div className="relative w-full max-w-[420px] h-full max-h-[860px] flex flex-col">

      {/* ── Top Bar ──────────────────────────────────────── */}
      <div className="relative z-30 flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg font-headline italic text-primary tracking-tight">Discover</span>
          {profiles.length - currentIndex > 0 && (
            <span className="text-[11px] tabular-nums text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {profiles.length - currentIndex}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!publicKey && (
            <WalletMultiButton className="!py-1.5 !px-4 !text-xs !bg-primary hover:!bg-primary/90 !text-primary-foreground !border-0 !rounded-full !h-8" />
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              showFilters ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Filters (collapsible) ────────────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="relative z-30 px-5 overflow-hidden"
          >
            <DiscoveryFilters
              filters={filters}
              onFiltersChange={setFilters}
              onClose={() => setShowFilters(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Card Area ────────────────────────────────────── */}
      <div className="flex-1 relative px-3 pt-2 pb-2 min-h-0">
        <AnimatePresence mode="wait">
          {currentProfile && (
            <motion.div
              key={currentProfile.walletAddress}
              className="absolute inset-0 mx-1 mt-0 mb-2"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{
                x: exitDirection === 'left' ? -400 : 400,
                rotate: exitDirection === 'left' ? -18 : 18,
                opacity: 0,
                transition: { duration: 0.35, ease: [0.32, 0, 0.67, 0] },
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.9}
              style={{ touchAction: 'none' }}
              onDrag={(_e, info) => {
                if (info.offset.x > 50) setSwipeIndicator('like');
                else if (info.offset.x < -50) setSwipeIndicator('nope');
                else setSwipeIndicator(null);
              }}
              onDragEnd={(_e, info) => {
                setSwipeIndicator(null);
                handleDragEnd(_e, info);
              }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            >
              {/* Card Container */}
              <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-xl">

                {/* Full-bleed image */}
                <Image
                  src={getDisplayImageUrl(currentProfile.imageCid, currentProfile.name)}
                  alt={currentProfile.name}
                  fill
                  className="object-cover pointer-events-none select-none"
                  draggable={false}
                  priority
                />

                {/* Swipe indicator stamps */}
                <AnimatePresence>
                  {swipeIndicator === 'like' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
                      animate={{ opacity: 1, scale: 1, rotate: -15 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="absolute top-8 left-6 z-30 border-[3px] border-green-400 rounded-lg px-4 py-1"
                    >
                      <span className="text-green-400 text-3xl font-black tracking-wider">LIKE</span>
                    </motion.div>
                  )}
                  {swipeIndicator === 'nope' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5, rotate: 15 }}
                      animate={{ opacity: 1, scale: 1, rotate: 15 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="absolute top-8 right-6 z-30 border-[3px] border-red-400 rounded-lg px-4 py-1"
                    >
                      <span className="text-red-400 text-3xl font-black tracking-wider">NOPE</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Compatibility Badge */}
                {currentProfile.compatibilityScore !== undefined && currentProfile.compatibilityScore > 0 && (
                  <div className="absolute top-5 left-5 z-20">
                    <div className="backdrop-blur-xl bg-black/40 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-white text-xs font-semibold">{currentProfile.compatibilityScore}% match</span>
                    </div>
                  </div>
                )}

                {/* Bottom gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none select-none z-10" />

                {/* ── Profile Info Overlay ──────────────────── */}
                <div className="absolute bottom-0 left-0 right-0 z-20 px-5">

                  {/* Name + Age Row */}
                  <div className="flex items-end justify-between mb-1">
                    <div>
                      <h2 className="text-white text-[28px] font-semibold leading-tight tracking-tight drop-shadow-md">
                        {currentProfile.name}
                      </h2>
                      <p className="text-white/70 text-sm mt-0.5">{formatIntent(currentProfile.datingIntent)}</p>
                    </div>
                    <button
                      onClick={() => setShowInfo(!showInfo)}
                      className="w-8 h-8 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center hover:bg-white/25 transition-colors mb-1"
                    >
                      {showInfo ? (
                        <ChevronDown className="w-4 h-4 text-white" />
                      ) : (
                        <ChevronUp className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </div>

                  {/* Interests pills */}
                  {currentProfile.interests.length > 0 && !showInfo && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-wrap gap-1.5 mb-4"
                    >
                      {currentProfile.interests.slice(0, 4).map((interest) => (
                        <span
                          key={interest}
                          className="text-[11px] font-medium text-white bg-white/15 backdrop-blur-sm rounded-full px-3 py-1"
                        >
                          {interest}
                        </span>
                      ))}
                    </motion.div>
                  )}

                  {/* Expanded bio panel */}
                  <AnimatePresence>
                    {showInfo && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mb-4"
                      >
                        <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-4 mt-2 border border-white/10">
                          <p className="text-white/60 text-[10px] uppercase tracking-widest font-semibold mb-1.5">
                            {currentProfile.bioPrompt}
                          </p>
                          <p className="text-white text-sm leading-relaxed">
                            {currentProfile.bio}
                          </p>
                          {currentProfile.interests.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-white/10">
                              {currentProfile.interests.map((interest) => (
                                <span
                                  key={interest}
                                  className="text-[11px] font-medium text-white bg-white/15 rounded-full px-3 py-1"
                                >
                                  {interest}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stack peek cards */}
        {profiles[currentIndex + 1] && (
          <div className="absolute inset-0 mx-1 mt-0 mb-2 -z-10" style={{ transform: 'scale(0.96) translateY(8px)' }}>
            <div className="w-full h-full rounded-3xl bg-secondary/80 border border-border" />
          </div>
        )}
      </div>

      {/* ── Action Buttons ───────────────────────────────── */}
      <div className="relative z-30 flex items-center justify-center gap-3.5 px-5 pb-5 pt-3">
        {/* Undo */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleUndo}
          disabled={swipeHistory.length === 0}
          className="w-14 h-14 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          <RotateCcw className="w-5 h-5 text-gray-900 dark:text-white" strokeWidth={2.5} />
        </motion.button>

        {/* Nope */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => handleSwipe('left')}
          disabled={!publicKey || !canSwipe}
          className="w-14 h-14 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          <X className="w-5 h-5 text-gray-900 dark:text-white" strokeWidth={2.5} />
        </motion.button>

        {/* Super Like */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleSuperLike}
          disabled={!publicKey || !canSwipe || !canSuperLike}
          className="w-14 h-14 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          <Star className="w-5 h-5 text-gray-900 dark:text-white fill-gray-900 dark:fill-white" strokeWidth={2.5} />
        </motion.button>

        {/* Like */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => handleSwipe('right')}
          disabled={!publicKey || !canSwipe}
          className="w-14 h-14 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          <Heart className="w-5 h-5 text-gray-900 dark:text-white fill-gray-900 dark:fill-white" strokeWidth={2.5} />
        </motion.button>

        {/* Report */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => setShowReport(true)}
          disabled={!publicKey || !currentProfile}
          className="w-14 h-14 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          <Flag className="w-5 h-5 text-gray-900 dark:text-white" strokeWidth={2.5} />
        </motion.button>
      </div>

      {/* ── Bottom Safety Badge ──────────────────────────── */}
      <div className="relative z-30 flex justify-center pb-3">
        <span className="text-[10px] text-muted-foreground/60 tracking-widest uppercase">
          Zero-knowledge verified
        </span>
      </div>

      </div>{/* end mobile container */}

      {/* ── Modals ───────────────────────────────────────── */}
      <MatchModal
        isOpen={showMatchModal}
        onClose={() => setShowMatchModal(false)}
        matchName={matchedProfile?.name || ''}
        matchImage={matchedProfile ? getDisplayImageUrl(matchedProfile.imageCid, matchedProfile.name) : undefined}
        userImage={currentUserProfile?.profile_image_path ? getProfileImageUrl(currentUserProfile.profile_image_path) : undefined}
        userName={currentUserProfile?.name || 'You'}
      />

      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        reportedUserAddress={currentProfile?.walletAddress || ''}
        reportedUserName={currentProfile?.name || ''}
        context="profile"
      />
    </div>
  );
}






