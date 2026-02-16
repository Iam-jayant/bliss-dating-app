/**
 * "Who Liked You" Grid - Premium Feature
 * Shows users who have liked your profile
 * Blurred for free tier, unlocked for premium
 */

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Lock, Sparkles } from 'lucide-react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { getProfileByHash } from '@/lib/storage/profile';
import { getLikesReceived } from '@/lib/matching/compatibility-service';
import type { ProfileData } from '@/lib/storage/types';
import Image from 'next/image';

interface LikeWithProfile {
  walletHash: string;
  profile: ProfileData | null;
  timestamp: number;
}

export function LikesGrid() {
  const { publicKey } = useWallet();
  const [likes, setLikes] = useState<LikeWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    loadLikes();
    checkPremiumStatus();
  }, [publicKey]);

  const loadLikes = async () => {
    if (!publicKey) return;

    try {
      const receivedLikes = await getLikesReceived(publicKey);
      
      // Load profiles for each like
      const likesWithProfiles = await Promise.all(
        receivedLikes.map(async (like) => {
          const profile = await getProfileByHash(like.from);
          return {
            walletHash: like.from,
            profile,
            timestamp: like.timestamp,
          };
        })
      );

      setLikes(likesWithProfiles);
    } catch (err) {
      console.error('Failed to load likes:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkPremiumStatus = () => {
    // Check subscription status from localStorage or on-chain
    const subscription = localStorage.getItem('bliss_subscription');
    if (subscription) {
      const sub = JSON.parse(subscription);
      setIsPremium(sub.tier === 'premium' || sub.tier === 'plus');
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="aspect-[3/4] animate-pulse bg-muted" />
        ))}
      </div>
    );
  }

  if (likes.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No likes yet</h3>
        <p className="text-sm text-muted-foreground">
          Keep swiping! When someone likes you, they'll appear here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">People Who Like You</h2>
          <p className="text-sm text-muted-foreground">
            {likes.length} {likes.length === 1 ? 'person has' : 'people have'} liked your profile
          </p>
        </div>
        {!isPremium && (
          <Button onClick={() => setShowUpgrade(true)} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Upgrade to See
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {likes.map((like, index) => (
          <Card
            key={like.walletHash}
            className="relative aspect-[3/4] overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow"
          >
            {/* Profile Image */}
            <div className="absolute inset-0">
              {like.profile?.profile_image_path ? (
                <Image
                  src={like.profile.profile_image_path}
                  alt={like.profile.name || 'User'}
                  fill
                  className={`object-cover ${!isPremium ? 'blur-lg' : ''}`}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400" />
              )}
            </div>

            {/* Overlay for free tier */}
            {!isPremium && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="text-center px-4">
                  <Lock className="h-8 w-8 text-white mx-auto mb-2" />
                  <p className="text-white text-sm font-medium">
                    Upgrade to Premium
                  </p>
                </div>
              </div>
            )}

            {/* Profile Info (visible for premium) */}
            {isPremium && like.profile && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <h3 className="text-white font-semibold text-lg">
                  {like.profile.name}
                </h3>
                {like.profile.bio && (
                  <p className="text-white/80 text-sm line-clamp-1">
                    {like.profile.bio}
                  </p>
                )}
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    <Heart className="h-3 w-3 mr-1 fill-current" />
                    Likes you
                  </Badge>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Upgrade Modal would go here */}
      {showUpgrade && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 space-y-4">
            <div className="text-center">
              <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">See Who Likes You</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upgrade to Premium to see all {likes.length} people who liked your profile
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>See everyone who likes you</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Unlimited swipes</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Advanced filters</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowUpgrade(false)} className="flex-1">
                Maybe Later
              </Button>
              <Button onClick={() => {/* Navigate to subscription */}} className="flex-1">
                Upgrade Now
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
