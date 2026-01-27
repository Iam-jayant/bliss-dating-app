'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Edit, Loader2 } from 'lucide-react';
import { getProfile, getProfileImageUrl } from '@/lib/supabase/profile';
import type { ProfileData } from '@/lib/supabase/types';
import Image from 'next/image';

export function ProfilePage() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProfile() {
      // Check if wallet is connected
      if (!connected || !publicKey) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        
        const profileData = await getProfile(publicKey);
        
        if (!profileData) {
          // No profile found, redirect to onboarding
          router.push('/onboarding');
          return;
        }
        
        setProfile(profileData);
      } catch (err) {
        console.error('Failed to load profile:', err);
        setError('Couldn\'t load profile. Please refresh.');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [connected, publicKey, router]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Not connected state
  if (!connected) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-6">
          <h2 className="font-headline text-3xl italic">Connect Your Wallet</h2>
          <p className="text-muted-foreground">
            Connect your wallet to view your profile
          </p>
          <Button
            onClick={() => router.push('/onboarding')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-6">
          <h2 className="font-headline text-3xl italic text-destructive">Oops!</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  // No profile state (shouldn't happen due to redirect, but just in case)
  if (!profile) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-6">
          <h2 className="font-headline text-3xl italic">No Profile Found</h2>
          <p className="text-muted-foreground">
            You haven't created a profile yet
          </p>
          <Button
            onClick={() => router.push('/onboarding')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Create Profile
          </Button>
        </div>
      </div>
    );
  }

  // Get profile image URL
  const profileImageUrl = profile.profile_image_path 
    ? getProfileImageUrl(profile.profile_image_path)
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-card/10 border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 relative flex items-center -mr-1">
              <Image
                src="/bliss-logo.png"
                alt="Bliss"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <span className="font-headline text-xl">Bliss</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-16 px-6">
        <div className="container mx-auto max-w-2xl">
          {/* Profile Card */}
          <div className="backdrop-blur-xl bg-card/10 border border-white/10 rounded-2xl overflow-hidden">
            {/* Profile Header */}
            <div className="p-8 space-y-6">
              {/* Profile Image and Name */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  {/* Profile Image */}
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-muted border-2 border-white/10">
                    {profileImageUrl ? (
                      <img
                        src={profileImageUrl}
                        alt={profile.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <span className="text-3xl">{profile.name.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                  </div>

                  {/* Name and Intent */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="font-headline text-3xl italic">{profile.name}</h1>
                      {profile.is_verified && (
                        <CheckCircle2 className="w-6 h-6 text-blue-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Looking for {profile.dating_intent}
                    </p>
                  </div>
                </div>

                {/* Edit Button (placeholder for future) */}
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/10 hover:bg-white/5"
                  disabled
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>

              {/* Bio Section */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {profile.bio_prompt_type}
                </p>
                <p className="text-base leading-relaxed">
                  {profile.bio}
                </p>
              </div>

              {/* Interests Section */}
              {profile.interests && profile.interests.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Interests
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest) => (
                      <Badge
                        key={interest}
                        variant="secondary"
                        className="px-3 py-1 text-sm"
                      >
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Info */}
            <div className="px-8 py-4 bg-card/5 border-t border-white/5">
              <p className="text-xs text-muted-foreground text-center">
                Wave 1 Complete • More features coming soon
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
