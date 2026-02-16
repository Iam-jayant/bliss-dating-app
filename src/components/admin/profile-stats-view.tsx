'use client';

import { useEffect, useState } from 'react';
import { getAllProfiles, getProfileStats } from '@/lib/supabase/profile';
import type { ProfileData } from '@/lib/supabase/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle, Image as ImageIcon, Calendar } from 'lucide-react';

export function ProfileStatsView() {
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = () => {
    const allProfiles = getAllProfiles();
    const profileStats = getProfileStats();
    setProfiles(allProfiles);
    setStats(profileStats);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profile Management</h1>
          <p className="text-muted-foreground">View all registered users</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verified Users</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.verifiedUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">With Images</CardTitle>
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.usersWithImages}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent (7d)</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentUsers}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Storage Info */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Storage Information</CardTitle>
            <CardDescription>Where profile data is stored</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Primary Storage:</span>
                <span className="text-sm">{stats.storageLocation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">LocalStorage Key:</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">{stats.storageKey}</code>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile List */}
      <Card>
        <CardHeader>
          <CardTitle>All Profiles ({profiles.length})</CardTitle>
          <CardDescription>Complete list of registered users</CardDescription>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No profiles found. Create your first profile to get started!
            </div>
          ) : (
            <div className="space-y-4">
              {profiles.map((profile, index) => (
                <div
                  key={profile.wallet_hash}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{profile.name}</h3>
                        {profile.is_verified && (
                          <Badge variant="default" className="text-xs">
                            ✓ Verified
                          </Badge>
                        )}
                        {profile.profile_image_path && (
                          <Badge variant="secondary" className="text-xs">
                            📷 Image
                          </Badge>
                        )}
                      </div>

                      {profile.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {profile.bio}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {profile.interests?.map((interest) => (
                          <Badge key={interest} variant="outline" className="text-xs">
                            {interest}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex gap-4 text-xs text-muted-foreground">
                        {profile.dating_intent && (
                          <span>Intent: {profile.dating_intent}</span>
                        )}
                        {profile.created_at && (
                          <span>Created: {new Date(profile.created_at).toLocaleDateString()}</span>
                        )}
                        <span>Wallet: {profile.wallet_hash.substring(0, 12)}...</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Console Commands */}
      <Card>
        <CardHeader>
          <CardTitle>Developer Console Commands</CardTitle>
          <CardDescription>Access profile data from browser console</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 font-mono text-sm">
            <div>
              <code className="block bg-muted p-2 rounded">
                localStorage.getItem('bliss_profiles_v2')
              </code>
              <p className="text-xs text-muted-foreground mt-1">View raw profile data</p>
            </div>
            <div>
              <code className="block bg-muted p-2 rounded">
                blissAdmin.listAllProfiles()
              </code>
              <p className="text-xs text-muted-foreground mt-1">List all profiles (dev mode)</p>
            </div>
            <div>
              <code className="block bg-muted p-2 rounded">
                blissAdmin.showProfileStats()
              </code>
              <p className="text-xs text-muted-foreground mt-1">Show statistics (dev mode)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
