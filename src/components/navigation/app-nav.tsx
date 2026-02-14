'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Heart, User, LogOut } from 'lucide-react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { cn } from '@/lib/utils';

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { disconnect } = useWallet();

  // Don't show navigation on landing or onboarding pages
  if (pathname === '/' || pathname === '/onboarding' || pathname === '/app') {
    return null;
  }

  const handleDisconnect = async () => {
    await disconnect();
    router.push('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => router.push('/discovery')}
            className="font-headline text-2xl italic text-primary hover:text-primary/80 transition-colors"
          >
            Bliss
          </button>

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            <Button
              variant={pathname === '/discovery' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => router.push('/discovery')}
              className={cn(
                'gap-2',
                pathname === '/discovery' && 'bg-primary text-primary-foreground'
              )}
            >
              <Heart className="w-4 h-4" />
              <span className="hidden sm:inline">Discover</span>
            </Button>

            <Button
              variant={pathname === '/profile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => router.push('/profile')}
              className={cn(
                'gap-2',
                pathname === '/profile' && 'bg-primary text-primary-foreground'
              )}
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
