'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, MapPin, Calendar, Sparkles, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletMultiButton } from '@demox-labs/aleo-wallet-adapter-reactui';
import { useRouter } from 'next/navigation';
import { getProfile, getProfileByHash, getProfileImageUrl } from '@/lib/storage/profile';
import { getMutualMatches } from '@/lib/matching/compatibility-service';
import type { ProfileData } from '@/lib/storage/types';

interface Match {
  walletAddress: string;
  name: string;
  bio: string;
  interests: string[];
  imageCid: string;
  matchedAt: number;
  compatibilityScore: number;
  distance: number;
}

export default function MatchesPage() {
  const { publicKey } = useWallet();
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  useEffect(() => {
    if (publicKey) {
      loadMatches();
    } else {
      setLoading(false);
    }
  }, [publicKey]);

  const loadMatches = async () => {
    if (!publicKey) return;
    
    setLoading(true);
    try {
      // Get current user profile
      const userProfile = await getProfile(publicKey);
      if (!userProfile) {
        setLoading(false);
        return;
      }

      // Get mutual matches from compatibility service
      const mutualMatchWallets = getMutualMatches(userProfile.wallet_hash);
      
      // Load full profile data for each match
      const matchPromises = mutualMatchWallets.map(async (walletHash: string) => {
        try {
          const matchProfile = await getProfileByHash(walletHash);
          if (!matchProfile) return null;

          // Get match timestamp from localStorage
          const matchKey = `bliss_match_${userProfile.wallet_hash}_${walletHash}`;
          const matchData = localStorage.getItem(matchKey);
          const matchedAt = matchData ? JSON.parse(matchData).timestamp : Date.now();

          // Get compatibility score
          const scoreKey = `bliss_compat_${userProfile.wallet_hash}_${walletHash}`;
          const scoreData = localStorage.getItem(scoreKey);
          const compatibilityScore = scoreData ? JSON.parse(scoreData).score : 0;

          return {
            walletAddress: walletHash,
            name: matchProfile.name,
            bio: matchProfile.bio || '',
            interests: matchProfile.interests || [],
            imageCid: matchProfile.profile_image_path || '',
            matchedAt,
            compatibilityScore,
            distance: 0, // Can be calculated from geohash if needed
          };
        } catch (error) {
          console.error('Failed to load match profile:', walletHash, error);
          return null;
        }
      });

      const matchResults = await Promise.all(matchPromises);
      const loadedMatches: Match[] = matchResults.filter(
        (m): m is NonNullable<typeof m> => m !== null
      ) as Match[];

      // Sort by match date (newest first)
      loadedMatches.sort((a, b) => b.matchedAt - a.matchedAt);
      
      setMatches(loadedMatches);
    } catch (error) {
      console.error('Failed to load matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageMatch = (match: Match) => {
    router.push(`/messages?chat=${match.walletAddress}`);
  };

  const formatMatchDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden pl-20 flex items-center justify-center">
        <div className="fixed inset-0 -z-10 bg-background" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // Not Connected State
  if (!publicKey) {
    return (
      <div className="min-h-screen relative overflow-hidden pl-20 flex items-center justify-center p-4">
        <div className="fixed inset-0 -z-10 bg-background" />
        
        <Card className="max-w-md w-full p-8 text-center border border-primary/20 shadow-2xl backdrop-blur-sm bg-card/90">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary flex items-center justify-center">
            <Heart className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-6">
            Connect your Aleo wallet to view your matches
          </p>
          <WalletMultiButton className="!w-full !justify-center !py-3 !bg-primary hover:!bg-primary/90 !text-primary-foreground" />
        </Card>
      </div>
    );
  }

  // Empty State
  if (matches.length === 0) {
    return (
      <div className="min-h-screen relative overflow-hidden pl-20 flex items-center justify-center p-4">
        <div className="fixed inset-0 -z-10 bg-background">
        </div>

        <Card className="max-w-md w-full p-8 text-center border border-primary/20 shadow-2xl backdrop-blur-sm bg-card/90">
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
            className="text-6xl mb-4"
          >
            💫
          </motion.div>
          <h2 className="text-2xl font-headline italic mb-3 text-primary">
            No Matches Yet
          </h2>
          <p className="text-muted-foreground mb-6">
            Keep swiping to find your perfect match! Your mutual likes will appear here.
          </p>
          <Button
            onClick={() => router.push('/discovery')}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Start Discovering
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden pl-20">
      {/* Background */}
      <div className="fixed inset-0 -z-10 bg-background">
      </div>

      <div className="relative z-10 p-6 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-headline italic mb-2 text-primary">
                Your Matches
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Zero-knowledge verified • End-to-end encrypted
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-foreground">{matches.length}</div>
              <div className="text-sm text-muted-foreground">Mutual Matches</div>
            </div>
          </div>
        </motion.div>

        {/* Matches Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence>
            {matches.map((match, index) => (
              <motion.div
                key={match.walletAddress}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <Card className="overflow-hidden border border-primary/20 shadow-lg hover:shadow-2xl transition-all duration-300 backdrop-blur-sm bg-card/90">
                  {/* Profile Image */}
                  <div className="relative aspect-[4/5] bg-secondary">
                    <img
                      src={
                        !match.imageCid || match.imageCid.startsWith('mock_image_')
                          ? `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(match.name)}&backgroundColor=c0aede`
                          : getProfileImageUrl(match.imageCid)
                      }
                      alt={match.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(match.name)}&backgroundColor=c0aede`;
                      }}
                    />
                    
                    {/* Compatibility Badge */}
                    <div className="absolute top-3 right-3 bg-card/95 backdrop-blur-sm rounded-full px-3 py-1 shadow-lg border border-primary/20">
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-sm font-bold text-primary">
                          {match.compatibilityScore}%
                        </span>
                      </div>
                    </div>

                    {/* Match Date */}
                    <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1">
                      <div className="flex items-center gap-1 text-white text-xs">
                        <Calendar className="w-3 h-3" />
                        <span>{formatMatchDate(match.matchedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Profile Info */}
                  <div className="p-4">
                    <h3 className="text-xl font-bold mb-2 text-foreground">
                      {match.name}
                    </h3>
                    
                    {match.bio && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {match.bio}
                      </p>
                    )}

                    {/* Interests */}
                    {match.interests.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {match.interests.slice(0, 3).map((interest) => (
                          <Badge
                            key={interest}
                            variant="secondary"
                            className="text-xs bg-secondary text-foreground"
                          >
                            {interest}
                          </Badge>
                        ))}
                        {match.interests.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{match.interests.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Action Button */}
                    <Button
                      onClick={() => handleMessageMatch(match)}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Send Message
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Privacy Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground backdrop-blur-sm bg-card/60 rounded-full px-4 py-2 border border-primary/10">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span>All matches verified on Aleo blockchain • IPFS encrypted storage</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
