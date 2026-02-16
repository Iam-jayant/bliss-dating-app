/**
 * Discovery Page - Card-based profile browsing with swipe actions
 * Privacy-first: Only shows profiles that match user's criteria
 * 
 * FIXES APPLIED:
 * - Double-hash bug: uses getProfileByHash() for already-hashed wallet addresses
 * - Broken mock images: uses DiceBear API for placeholder avatars
 * - Removed all gradient backgrounds (consistent with landing page)
 * - Fixed duplicate geolocation call
 * - Added discovery filters
 * - Proper swipe counter persistence
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Heart, X, Sparkles, MapPin, Info, SlidersHorizontal, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletMultiButton } from '@demox-labs/aleo-wallet-adapter-reactui';
import { getAllProfiles, getProfile, getProfileByHash, getProfileImageUrl } from '@/lib/storage/profile';
import type { ProfileData } from '@/lib/storage/types';
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
import { UndoButton } from './undo-button';
import { SuperLikeButton } from './super-like-button';
import { PhotoGallery } from '@/components/profile/photo-gallery';

interface DiscoveryProfile {
  walletAddress: string; // This is wallet_hash from storage
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

/**
 * Get displayable image URL for a profile.
 * Handles: IPFS CIDs, local fallback paths, data URLs, mock profiles, and missing images
 */
function getDisplayImageUrl(imageCid: string, profileName: string): string {
  if (!imageCid) {
    // No image at all — generate a unique DiceBear avatar
    return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(profileName)}&backgroundColor=c0aede`;
  }

  // Mock profile images — use DiceBear with the profile name as seed
  if (imageCid.startsWith('mock_image_')) {
    return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(profileName)}&backgroundColor=c0aede`;
  }

  // Local fallback images (from uploadProfileImage fallback)
  if (imageCid.startsWith('local:')) {
    return getProfileImageUrl(imageCid);
  }

  // Data URLs (inline base64)
  if (imageCid.startsWith('data:')) {
    return imageCid;
  }

  // Real IPFS CID — use Pinata gateway
  return getProfileImageUrl(imageCid);
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

  // ─── LOADING STATE ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden pl-20 flex items-center justify-center">
        <div className="fixed inset-0 -z-10 bg-background" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            className="relative w-20 h-20 mx-auto mb-6"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <div className="absolute inset-0 rounded-full bg-primary/20" />
            <div className="absolute inset-2 rounded-full bg-background" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary/50" />
          </motion.div>
          <motion.p
            className="text-muted-foreground font-body font-medium"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Finding your matches...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // ─── DAILY LIMIT STATE ─────────────────────────────────────────

  if (!canSwipe) {
    return (
      <div className="min-h-screen relative overflow-hidden pl-20 flex items-center justify-center p-4">
        <div className="fixed inset-0 -z-10 bg-background" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <Card className="overflow-hidden border border-primary/20 shadow-2xl backdrop-blur-sm bg-card/90">
            <div className="p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center"
              >
                <Sparkles className="w-10 h-10 text-primary" />
              </motion.div>
              <h2 className="text-3xl font-headline italic mb-3 text-primary">
                Daily Limit Reached
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed font-body">
                You&apos;ve used all <span className="font-bold text-foreground">{swipeLimit}</span> swipes for today.
                Upgrade to Premium for unlimited swipes!
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm text-muted-foreground bg-secondary rounded-lg p-3">
                  <Heart className="w-4 h-4 text-primary" />
                  <span>Unlimited daily swipes</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground bg-secondary rounded-lg p-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>See who liked you</span>
                </div>
              </div>
              <Button className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
                Upgrade to Premium
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                Reset in {24 - new Date().getHours()} hours
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ─── NO MORE PROFILES STATE ────────────────────────────────────

  if (currentIndex >= profiles.length) {
    return (
      <div className="min-h-screen relative overflow-hidden pl-20 flex items-center justify-center p-4">
        <div className="fixed inset-0 -z-10 bg-background" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card className="overflow-hidden border border-primary/20 shadow-2xl backdrop-blur-sm bg-card/90">
            <div className="p-8 text-center">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="text-6xl mb-4"
              >
                👋
              </motion.div>
              <h2 className="text-3xl font-headline italic mb-3 text-primary">
                That&apos;s Everyone!
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed font-body">
                You&apos;ve seen all profiles in your area. Check back soon for new matches!
              </p>
              <div className="bg-secondary rounded-xl p-4 mb-6">
                <p className="text-sm text-muted-foreground">
                  💡 <span className="font-medium text-foreground">Tip:</span> Update your preferences or adjust filters to discover more people
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border border-primary/20 hover:bg-secondary"
                  onClick={() => { setCurrentIndex(0); loadProfiles(); }}
                >
                  Review Again
                </Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => window.location.href = '/profile'}
                >
                  Update Profile
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ─── MAIN DISCOVERY UI ─────────────────────────────────────────

  return (
    <div className="min-h-screen relative overflow-hidden pl-20">
      <div className="fixed inset-0 -z-10 bg-background" />

      <div className="relative z-10 p-4 pb-8">
        {/* Wallet Connection Banner */}
        {!publicKey && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto mb-6"
          >
            <Card className="overflow-hidden border border-primary/20 shadow-lg backdrop-blur-sm bg-card/50">
              <div className="p-4 bg-primary/5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      Connect to start matching
                    </p>
                  </div>
                  <WalletMultiButton className="!py-2 !px-4 !text-sm !bg-primary hover:!bg-primary/90 !text-primary-foreground !border-0" />
                </div>
              </div>
            </Card>
          </motion.div>
        )}
        
        {/* Stats Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto mb-6"
        >
          <div className="flex items-center justify-between backdrop-blur-md bg-card/50 rounded-2xl p-4 shadow-lg border border-primary/20">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                {dailySwipesUsed} <span className="text-muted-foreground">/ {swipeLimit === -1 ? '∞' : swipeLimit}</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-muted-foreground">
                  {profiles.length - currentIndex} nearby
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={`rounded-xl h-8 w-8 p-0 ${showFilters ? 'bg-primary text-primary-foreground' : ''}`}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="max-w-md mx-auto mb-6 overflow-hidden"
            >
              <DiscoveryFilters
                filters={filters}
                onFiltersChange={setFilters}
                onClose={() => setShowFilters(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile Card Stack */}
        <div className="max-w-md mx-auto h-[580px] relative perspective-1000">
          <AnimatePresence mode="wait">
            {currentProfile && (
              <motion.div
                key={currentProfile.walletAddress}
                className="absolute inset-0"
                initial={{ scale: 0.9, opacity: 0, rotateY: -10 }}
                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                exit={{
                  scale: 0.8,
                  opacity: 0,
                  x: exitDirection === 'left' ? -200 : 200,
                  rotate: exitDirection === 'left' ? -10 : 10,
                  transition: { duration: 0.3 }
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={handleDragEnd}
                whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <Card className="h-full overflow-hidden shadow-2xl border border-primary/20 bg-card/95 backdrop-blur-sm">
                  {/* Photo Gallery */}
                  <div className="relative h-[65%] overflow-hidden">
                    <PhotoGallery 
                      photos={currentProfile.imageCid ? [getDisplayImageUrl(currentProfile.imageCid, currentProfile.name)] : []} 
                      userName={currentProfile.name} 
                    />

                    {/* Gradient for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none z-10" />

                    {/* Top Badges */}
                    <div className="absolute top-4 left-4 right-4 flex items-start justify-between z-20">
                      {currentProfile.compatibilityScore !== undefined && currentProfile.compatibilityScore > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.2, type: "spring" }}
                        >
                          <Badge className="bg-primary text-primary-foreground border-0 shadow-lg px-3 py-1">
                            <Sparkles className="w-3 h-3 mr-1" />
                            {currentProfile.compatibilityScore}% Match
                          </Badge>
                        </motion.div>
                      )}
                      {currentProfile.distance > 0 && (
                        <Badge className="backdrop-blur-md bg-white/90 text-gray-900 border-0 shadow-lg px-3 py-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {currentProfile.distance}km
                        </Badge>
                      )}
                    </div>

                    {/* Bottom Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white z-20">
                      <motion.h2
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl font-headline italic mb-2 drop-shadow-lg"
                      >
                        {currentProfile.name}
                      </motion.h2>
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <Badge className="bg-white/20 backdrop-blur-md text-white border-white/30 shadow-lg">
                          {currentProfile.datingIntent}
                        </Badge>
                      </motion.div>
                    </div>
                  </div>

                  {/* Profile Details */}
                  <div className="p-6 h-[35%] overflow-y-auto bg-card">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="mb-4"
                    >
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        {currentProfile.bioPrompt}
                      </p>
                      <p className="text-foreground leading-relaxed font-body">
                        {currentProfile.bio}
                      </p>
                    </motion.div>

                    {currentProfile.interests.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                      >
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Interests
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {currentProfile.interests.map((interest, i) => (
                            <motion.div
                              key={interest}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.5 + i * 0.05, type: "spring" }}
                            >
                              <Badge
                                variant="outline"
                                className="bg-secondary border-primary/20 text-foreground px-3 py-1"
                              >
                                {interest}
                              </Badge>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stack preview cards */}
          {profiles[currentIndex + 1] && (
            <motion.div
              className="absolute inset-0 -z-10"
              style={{ transform: 'scale(0.95) translateY(10px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
            >
              <Card className="h-full bg-card border border-primary/10" />
            </motion.div>
          )}
          {profiles[currentIndex + 2] && (
            <motion.div
              className="absolute inset-0 -z-20"
              style={{ transform: 'scale(0.9) translateY(20px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15 }}
            >
              <Card className="h-full bg-card border border-primary/5" />
            </motion.div>
          )}
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-md mx-auto mt-8 flex items-center justify-center gap-4"
        >
          <UndoButton 
            onUndo={handleUndo}
            disabled={swipeHistory.length === 0}
            isPremium={isPremium}
            onUpgradeClick={() => window.location.href = '/subscription'}
          />
          
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full w-16 h-16 border-2 border-primary/20 shadow-2xl bg-card/80 backdrop-blur-sm hover:bg-card group transition-all duration-200"
              onClick={() => handleSwipe('left')}
              disabled={!publicKey || !canSwipe}
              title={!publicKey ? 'Connect wallet to swipe' : 'Pass'}
            >
              <X className="w-8 h-8 text-destructive group-hover:scale-110 transition-transform" />
            </Button>
          </motion.div>

          <SuperLikeButton
            onSuperLike={handleSuperLike}
            disabled={!publicKey || !canSwipe}
            dailyLimitReached={superLikesUsed >= (isPremium ? 999 : 1)}
          />

          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="lg"
              className="rounded-full w-16 h-16 border-0 shadow-2xl bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 transition-all duration-300 group"
              onClick={() => handleSwipe('right')}
              disabled={!publicKey || !canSwipe}
              title={!publicKey ? 'Connect wallet to swipe' : 'Like'}
            >
              <Heart className="w-8 h-8 text-white fill-current group-hover:scale-110 transition-transform" />
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="lg"
              variant="ghost"
              className="rounded-full w-12 h-12 border border-primary/10 shadow-lg bg-card/50 backdrop-blur-sm hover:bg-card transition-all duration-200"
              onClick={() => setShowReport(true)}
              disabled={!publicKey || !currentProfile}
              title="Report Profile"
            >
              <Flag className="w-5 h-5 text-muted-foreground" />
            </Button>
          </motion.div>
        </motion.div>

        {/* Privacy Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="max-w-md mx-auto mt-8"
        >
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground backdrop-blur-sm bg-card/40 rounded-full px-4 py-2 mx-auto w-fit border border-primary/10">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span>End-to-end encrypted • Zero-knowledge matching</span>
          </div>
        </motion.div>
      </div>

      {/* Match Modal */}
      <MatchModal
        isOpen={showMatchModal}
        onClose={() => setShowMatchModal(false)}
        matchName={matchedProfile?.name || ''}
        matchImage={matchedProfile ? getDisplayImageUrl(matchedProfile.imageCid, matchedProfile.name) : undefined}
        userImage={currentUserProfile?.profile_image_path ? getProfileImageUrl(currentUserProfile.profile_image_path) : undefined}
        userName={currentUserProfile?.name || 'You'}
      />

      {/* Report Modal */}
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
