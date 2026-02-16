'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { seedMockProfiles, clearMockProfiles, getMockProfiles } from '@/lib/supabase/mock-profiles';
import { getUserCount } from '@/lib/supabase/profile';
import { Users, RefreshCw, Trash2 } from 'lucide-react';

/**
 * Auto-seed profiles on first visit for better UX
 * Also provides admin controls in development
 */
export function ProfileSeeder() {
  const [profileCount, setProfileCount] = useState(0);
  const [mockCount, setMockCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    // Check if profiles exist
    const count = getUserCount();
    setProfileCount(count);

    // Auto-seed if no profiles exist (first time user)
    if (count === 0) {
      console.log('📝 No profiles found. Auto-seeding 15 mock profiles...');
      seedMockProfiles(15);
      setProfileCount(15);
      setMockCount(15);
    } else {
      const mocks = getMockProfiles();
      setMockCount(mocks.length);
    }
  }, [mounted]);

  const handleAddMore = () => {
    setLoading(true);
    seedMockProfiles(10);
    setProfileCount(getUserCount());
    setMockCount(getMockProfiles().length);
    setLoading(false);
  };

  const handleClearMocks = () => {
    if (confirm('Remove all mock profiles? This will keep real user profiles.')) {
      setLoading(true);
      clearMockProfiles();
      setProfileCount(getUserCount());
      setMockCount(0);
      setLoading(false);
    }
  };

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  // Don't render until mounted (prevents SSR hydration issues)
  if (!mounted) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-card border border-border rounded-lg p-4 shadow-lg max-w-xs">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Profile Manager</span>
      </div>
      
      <div className="space-y-2 mb-3">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Total Profiles:</span>
          <span className="font-medium">{profileCount}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Mock Profiles:</span>
          <span className="font-medium">{mockCount}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="default"
          onClick={handleAddMore}
          disabled={loading}
          className="flex-1"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Add 10
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleClearMocks}
          disabled={loading || mockCount === 0}
          className="flex-1"
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Clear
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        Dev mode only. Use console: <code className="bg-muted px-1 rounded">blissAdmin.help()</code>
      </p>
    </div>
  );
}
