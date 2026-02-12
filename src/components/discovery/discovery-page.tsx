/**
 * Discovery Page - Card-based profile browsing with swipe actions
 * Privacy-first: Only shows profiles that match user's criteria
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Heart, X, Sparkles, MapPin, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { profileService } from '@/lib/storage/profile-service';
import { pinataStorage } from '@/lib/storage/pinata-storage';

interface DiscoveryProfile {
  walletAddress: string;
  name: string;
  bio: string;
  bioPrompt: string;
  interests: string[];
  datingIntent: string;
  imageCid: string;
  distance: number;
  compatibilityScore?: number; // 0-100
}

const SWIPE_THRESHOLD = 100;
const SWIPE_POWER = 200;

export default function DiscoveryPage() {
  const { publicKey } = useWallet();
  const [profiles, setProfiles] = useState<DiscoveryProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dailySwipesUsed, setDailySwipesUsed] = useState(0);
  const [swipeLimit, setSwipeLimit] = useState(10); // Free tier limit
  const [matches, setMatches] = useState<string[]>([]);

  const currentProfile = profiles[currentIndex];
  const canSwipe = dailySwipesUsed < swipeLimit;

  const getUserLocation = async (): Promise<number> => {
    // TODO: Get user's location and convert to geohash
    // For now, return mock geohash
    return 12345;
  };

  const getWalletSignature = async (): Promise<string> => {
    // TODO: Request wallet signature for decryption
    // This should be cached and reused
    return 'mock-signature';
  };

  useEffect(() => {
    if (publicKey) {
      loadProfiles();
      loadUserLimits();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey]);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      
      // Get user's location geohash for proximity matching
      const userLocation = await getUserLocation();
      
      // Discover nearby profiles via on-chain query
      const nearbyWallets = await profileService.discoverNearbyProfiles(
        userLocation,
        50000 // 50km radius
      );

      // Fetch profile data from IPFS
      const profilePromises = nearbyWallets.map(async (wallet) => {
        try {
          const walletSig = await getWalletSignature(); // Get signature for decryption
          const profileData = await profileService.getProfile(wallet, walletSig);
          
          if (!profileData) return null;

          return {
            walletAddress: wallet,
            name: profileData.name,
            bio: profileData.bio,
            bioPrompt: profileData.bioPromptType,
            interests: profileData.interests,
            datingIntent: profileData.datingIntent,
            imageCid: profileData.profileImageCid || '',
            distance: Math.floor(Math.random() * 50) + 1, // Calculated from geohash
          };
        } catch (error) {
          console.error('Failed to load profile:', wallet, error);
          return null;
        }
      });

      const loadedProfiles = (await Promise.all(profilePromises)).filter(
        (p): p is DiscoveryProfile => p !== null
      );

      setProfiles(loadedProfiles);
    } catch (error) {
      console.error('Failed to load profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserLimits = async () => {
    // TODO: Query on-chain subscription record
    // For now, use default free tier limits
    setSwipeLimit(10);
    setDailySwipesUsed(0);
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!canSwipe || !currentProfile) return;

    setDailySwipesUsed(prev => prev + 1);

    if (direction === 'right') {
      // Like action
      await handleLike(currentProfile.walletAddress);
    } else {
      // Pass action
      await handlePass(currentProfile.walletAddress);
    }

    // Move to next profile
    setCurrentIndex(prev => prev + 1);
  };

  const handleLike = async (targetWallet: string) => {
    try {
      // Record like action on-chain via compatibility_matching contract
      // TODO: Implement aleo service method
      console.log('Liked:', targetWallet);

      // Check for mutual match
      const isMutualMatch = await checkMutualMatch(targetWallet);
      
      if (isMutualMatch) {
        setMatches(prev => [...prev, targetWallet]);
        showMatchAnimation();
      }
    } catch (error) {
      console.error('Failed to record like:', error);
    }
  };

  const handlePass = async (targetWallet: string) => {
    try {
      // Record pass action (optional, for analytics)
      console.log('Passed:', targetWallet);
    } catch (error) {
      console.error('Failed to record pass:', error);
    }
  };

  const checkMutualMatch = async (targetWallet: string): Promise<boolean> => {
    // TODO: Check on-chain mutual_matches mapping
    // For now, simulate 20% match rate
    return Math.random() < 0.2;
  };

  const showMatchAnimation = () => {
    // TODO: Show confetti and match modal
    alert("It's a match! 🎉");
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = SWIPE_THRESHOLD;
    
    if (info.offset.x > swipeThreshold) {
      handleSwipe('right');
    } else if (info.offset.x < -swipeThreshold) {
      handleSwipe('left');
    }
  };

  if (!publicKey) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 max-w-md text-center">
          <p className="text-lg mb-4">Connect your wallet to start discovering</p>
          <Button>Connect Wallet</Button>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500" />
      </div>
    );
  }

  if (!canSwipe) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="p-8 max-w-md text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-pink-500" />
          <h2 className="text-2xl font-bold mb-2">Daily Limit Reached</h2>
          <p className="text-gray-600 mb-6">
            You've used all {swipeLimit} swipes for today. Upgrade to Premium for unlimited swipes!
          </p>
          <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-500">
            Upgrade to Premium
          </Button>
        </Card>
      </div>
    );
  }

  if (currentIndex >= profiles.length) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold mb-2">No More Profiles</h2>
          <p className="text-gray-600 mb-6">
            Check back later for more matches in your area!
          </p>
          <Button onClick={() => setCurrentIndex(0)}>Start Over</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 p-4 pt-20">
      {/* Header */}
      <div className="max-w-md mx-auto mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              Swipes: {dailySwipesUsed}/{swipeLimit}
            </p>
          </div>
          <div>
            <Badge variant="outline" className="bg-white">
              {profiles.length - currentIndex} profiles left
            </Badge>
          </div>
        </div>
      </div>

      {/* Profile Card Stack */}
      <div className="max-w-md mx-auto h-[600px] relative">
        <AnimatePresence>
          {currentProfile && (
            <motion.div
              key={currentProfile.walletAddress}
              className="absolute inset-0"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.8}
              onDragEnd={handleDragEnd}
              whileDrag={{ scale: 1.05 }}
            >
              <Card className="h-full overflow-hidden shadow-2xl">
                {/* Profile Image */}
                <div className="relative h-3/5 bg-gradient-to-br from-pink-200 to-purple-200">
                  <Avatar className="w-full h-full rounded-none">
                    <AvatarImage
                      src={pinataStorage.getImageUrl(currentProfile.imageCid)}
                      alt={currentProfile.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-6xl rounded-none">
                      {currentProfile.name[0]}
                    </AvatarFallback>
                  </Avatar>

                  {/* Distance Badge */}
                  {currentProfile.distance && (
                    <Badge className="absolute top-4 right-4 bg-white/90 text-gray-900">
                      <MapPin className="w-3 h-3 mr-1" />
                      {currentProfile.distance}km away
                    </Badge>
                  )}
                </div>

                {/* Profile Info */}
                <div className="p-6 h-2/5 overflow-y-auto">
                  <h2 className="text-3xl font-bold mb-2">{currentProfile.name}</h2>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="secondary">{currentProfile.datingIntent}</Badge>
                    {currentProfile.compatibilityScore && (
                      <Badge variant="outline" className="bg-green-50">
                        {currentProfile.compatibilityScore}% match
                      </Badge>
                    )}
                  </div>

                  {/* Bio */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-1">{currentProfile.bioPrompt}</p>
                    <p className="text-gray-700">{currentProfile.bio}</p>
                  </div>

                  {/* Interests */}
                  <div className="flex flex-wrap gap-2">
                    {currentProfile.interests.map((interest, i) => (
                      <Badge key={i} variant="outline" className="bg-pink-50">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Next Profile Preview */}
        {profiles[currentIndex + 1] && (
          <div className="absolute inset-0 -z-10 scale-95 opacity-50">
            <Card className="h-full bg-gradient-to-br from-gray-100 to-gray-200" />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="max-w-md mx-auto mt-6 flex items-center justify-center gap-6">
        <Button
          size="lg"
          variant="outline"
          className="rounded-full w-16 h-16 border-2 border-red-500 hover:bg-red-50"
          onClick={() => handleSwipe('left')}
          disabled={!canSwipe}
        >
          <X className="w-8 h-8 text-red-500" />
        </Button>

        <Button
          size="lg"
          variant="outline"
          className="rounded-full w-12 h-12"
          disabled
        >
          <Info className="w-5 h-5" />
        </Button>

        <Button
          size="lg"
          className="rounded-full w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
          onClick={() => handleSwipe('right')}
          disabled={!canSwipe}
        >
          <Heart className="w-8 h-8" />
        </Button>
      </div>

      {/* Privacy Notice */}
      <div className="max-w-md mx-auto mt-8 text-center">
        <p className="text-xs text-gray-500">
          🔒 Your swipes are private. Matches are revealed only when mutual.
        </p>
      </div>
    </div>
  );
}
