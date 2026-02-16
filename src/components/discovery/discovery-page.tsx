/**
 * Discovery Page — Full-viewport card-based profile browsing
 * Inspired by Tinder/Bumble/Hinge: immersive photo cards, floating actions
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Heart, X, Star, RotateCcw, ChevronDown, ChevronUp, SlidersHorizontal, Flag } from 'lucide-react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletMultiButton } from '@demox-labs/aleo-wallet-adapter-reactui';
import { getAllProfiles, getProfile, getProfileByHash, getProfileImageUrl } from '@/lib/storage/profile';
import type { ProfileData } from '@/lib/storage/types';
import { seedDemoData } from '@/lib/seed-profiles';
import {
  calculateEnhancedCompatibility,
  recordLike,
  recordPass,
  checkMutualMatch,
  hasActedOn
} from '@/lib/matching/compatibility-service';
import { MatchModal } from './match-modal';
import { DiscoveryFilters, type FilterState } from './discovery-filters';
import { ReportModal } from '@/components/safety/report-modal';
import Image from 'next/image';

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

/** Resolve any image source to a displayable URL */
function getDisplayImageUrl(imageCid: string, profileName: string): string {
  if (!imageCid || imageCid.startsWith('mock_image_')) {
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

export default function DiscoveryPage() {
  const { publicKey } = useWallet();
  const [profiles, setProfiles] = useState<DiscoveryProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dailySwipesUsed, setDailySwipesUsed] = useState(0);
  const [swipeLimit, setSwipeLimit] = useState(10);
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
  const [superLikesUsed, setSuperLikesUsed] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [swipeIndicator, setSwipeIndicator] = useState<'like' | 'nope' | null>(null);

  const currentProfile = profiles[currentIndex];
  const canSwipe = swipeLimit === -1 || dailySwipesUsed < swipeLimit;

  const loadCurrentUserProfile = useCallback(async () => {
    if (publicKey) {
      const profile = await getProfile(publicKey);
      setCurrentUserProfile(profile);
    }
  }, [publicKey]);

  const loadProfiles = useCallback(async () => {
    try {
      setLoading(true);

      // Seed demo profiles on first visit (idempotent)
      if (currentUserProfile?.wallet_hash) {
        seedDemoData(currentUserProfile.wallet_hash);
      } else {
        seedDemoData();
      }
      
      const localProfiles = await getAllProfiles();
      
      if (localProfiles.length > 0) {
        let currentUserHash: string | undefined;
        let userProfile: ProfileData | null = null;
        
        if (publicKey) {
          userProfile = await getProfile(publicKey);
          currentUserHash = userProfile?.wallet_hash;
        }
        
        // Convert ProfileData → DiscoveryProfile
        let discoveryProfiles: DiscoveryProfile[] = localProfiles
          .filter(p => {
            if (currentUserHash && p.wallet_hash === currentUserHash) return false;
            if (currentUserHash && hasActedOn(currentUserHash, p.wallet_hash)) return false;
            return true;
          })
          .map(profile => {
            let compatibilityScore: number | undefined;
            if (userProfile) {
              const compat = calculateEnhancedCompatibility(userProfile, profile);
              compatibilityScore = compat.score;
            }
            return {
              walletAddress: profile.wallet_hash,
              name: profile.name,
              bio: profile.bio,
              bioPrompt: profile.bio_prompt_type,
              interests: profile.interests,
              datingIntent: profile.dating_intent,
              imageCid: profile.profile_image_path || '',
              distance: 0,
              compatibilityScore,
            };
          });

        // Apply user filters
        if (filters.intents.length > 0) {
          discoveryProfiles = discoveryProfiles.filter(p => 
            filters.intents.includes(p.datingIntent)
          );
        }
        if (filters.interests.length > 0) {
          discoveryProfiles = discoveryProfiles.filter(p =>
            p.interests.some(i => filters.interests.includes(i))
          );
        }
        if (filters.minCompatibility > 0) {
          discoveryProfiles = discoveryProfiles.filter(p =>
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

  const loadUserLimits = useCallback(async () => {
    if (!publicKey) {
      setSwipeLimit(10);
      setDailySwipesUsed(0);
      return;
    }
    try {
      const cached = localStorage.getItem(`bliss_sub_${publicKey}`);
      if (cached) {
        const data = JSON.parse(cached);
        if (data.expiresAt > Date.now()) {
          setSwipeLimit(-1);
          setDailySwipesUsed(0);
          return;
        }
      }
      setSwipeLimit(10);
      const today = new Date().toISOString().split('T')[0];
      const usageKey = `bliss_swipes_${publicKey}_${today}`;
      const used = parseInt(localStorage.getItem(usageKey) || '0', 10);
      setDailySwipesUsed(used);
    } catch (error) {
      console.error('Failed to load user limits:', error);
      setSwipeLimit(10);
      setDailySwipesUsed(0);
    }
  }, [publicKey]);

  useEffect(() => {
    loadProfiles();
    loadUserLimits();
    loadCurrentUserProfile();
  }, [loadProfiles, loadUserLimits, loadCurrentUserProfile]);

  useEffect(() => {
    const checkPremium = () => {
      const sub = localStorage.getItem('bliss_subscription');
      if (sub) {
        const subscription = JSON.parse(sub);
        setIsPremium(subscription.tier === 'premium' || subscription.tier === 'plus');
      }
    };
    checkPremium();
  }, []);

  // ─── SWIPE HANDLERS ────────────────────────────────────────────

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!publicKey) {
      alert('Please connect your wallet to swipe on profiles');
      return;
    }
    if (!canSwipe || !currentProfile) return;

    setExitDirection(direction);
    setDailySwipesUsed(prev => prev + 1);

    // Persist swipe count
    const today = new Date().toISOString().split('T')[0];
    const usageKey = `bliss_swipes_${publicKey}_${today}`;
    const currentUsed = parseInt(localStorage.getItem(usageKey) || '0', 10);
    localStorage.setItem(usageKey, String(currentUsed + 1));

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
      // Get current user's profile (hashes raw publicKey → correct)
      const myProfile = await getProfile(publicKey);
      // Get target profile by hash directly (NO double-hashing!)
      const targetProfile = await getProfileByHash(targetWalletHash);
      
      if (!myProfile || !targetProfile) {
        console.warn('Profile lookup failed — recording like with hashes only');
        const { hashWalletAddress } = await import('@/lib/wallet-hash');
        const myHash = await hashWalletAddress(publicKey);
        recordLike(myHash, targetWalletHash);
        return;
      }
      
      recordLike(myProfile.wallet_hash, targetWalletHash);
      console.log('❤️ Liked:', targetProfile.name);

      const isMutualMatch = checkMutualMatch(
        myProfile.wallet_hash,
        targetWalletHash,
        myProfile,
        targetProfile
      );
      
      if (isMutualMatch) {
        const matchedData = profiles.find(p => p.walletAddress === targetWalletHash);
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
        recordPass(myHash, targetWalletHash);
        return;
      }
      
      recordPass(myProfile.wallet_hash, targetWalletHash);
      const targetProfile = await getProfileByHash(targetWalletHash);
      if (targetProfile) {
        console.log('👎 Passed:', targetProfile.name);
      }
    } catch (error) {
      console.error('Failed to record pass:', error);
    }
  };

  const handleUndo = () => {
    if (swipeHistory.length === 0) return;
    
    const lastUserHash = swipeHistory[swipeHistory.length - 1];
    setSwipeHistory(prev => prev.slice(0, -1));
    
    // Remove from likes/passes storage
    const likes = JSON.parse(localStorage.getItem('bliss_likes_v2') || '[]');
    const passes = JSON.parse(localStorage.getItem('bliss_passes_v2') || '[]');
    
    const filteredLikes = likes.filter((l: any) => l.to !== lastUserHash);
    const filteredPasses = passes.filter((p: any) => p.to !== lastUserHash);
    
    localStorage.setItem('bliss_likes_v2', JSON.stringify(filteredLikes));
    localStorage.setItem('bliss_passes_v2', JSON.stringify(filteredPasses));
    
    // Decrease swipe count
    if (dailySwipesUsed > 0) {
      setDailySwipesUsed(prev => prev - 1);
      const today = new Date().toISOString().split('T')[0];
      const usageKey = `bliss_swipes_${publicKey}_${today}`;
      const currentUsed = parseInt(localStorage.getItem(usageKey) || '0', 10);
      if (currentUsed > 0) {
        localStorage.setItem(usageKey, String(currentUsed - 1));
      }
    }
    
    // Move back one profile
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSuperLike = async () => {
    if (!currentProfile || !publicKey) return;
    if (!canSwipe) return;
    
    setExitDirection('right');
    setDailySwipesUsed(prev => prev + 1);
    setSuperLikesUsed(prev => prev + 1);
    
    // Persist swipe count
    const today = new Date().toISOString().split('T')[0];
    const usageKey = `bliss_swipes_${publicKey}_${today}`;
    const currentUsed = parseInt(localStorage.getItem(usageKey) || '0', 10);
    localStorage.setItem(usageKey, String(currentUsed + 1));
    
    // Track in history
    setSwipeHistory(prev => [...prev, currentProfile.walletAddress].slice(-5));
    
    // Track as super like
    try {
      const myProfile = await getProfile(publicKey);
      const targetProfile = await getProfileByHash(currentProfile.walletAddress);
      
      if (myProfile && targetProfile) {
        recordLike(myProfile.wallet_hash, currentProfile.walletAddress, true);
        console.log('⭐ Super Liked:', targetProfile.name);
        
        // Check for mutual match
        const isMutualMatch = checkMutualMatch(
          myProfile.wallet_hash,
          currentProfile.walletAddress,
          myProfile,
          targetProfile
        );
        
        if (isMutualMatch) {
          setMatchedProfile(currentProfile);
          setShowMatchModal(true);
        }
      }
    } catch (error) {
      console.error('Failed to record super like:', error);
    }
    
    setCurrentIndex(prev => prev + 1);
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
            You&apos;ve used all {swipeLimit} likes for today. Come back tomorrow or go unlimited.
          </p>
          <button
            className="w-full py-3.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold text-sm tracking-wide hover:shadow-lg hover:shadow-pink-500/25 transition-all"
            onClick={() => window.location.href = '/subscription'}
          >
            Get Unlimited
          </button>
          <p className="text-xs text-muted-foreground mt-4">
            Resets in {24 - new Date().getHours()} hours
          </p>
        </motion.div>
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
          disabled={!publicKey || !canSwipe || superLikesUsed >= (isPremium ? 999 : 1)}
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
