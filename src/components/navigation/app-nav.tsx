'use client';

import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Heart, User, LogOut, MessageCircle, Sparkles, Settings } from 'lucide-react';
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
    <nav className="fixed left-0 top-0 bottom-0 z-50 w-20 flex flex-col items-center py-6 bg-card/80 backdrop-blur-xl border-r border-primary/20">
      {/* Logo */}
      <button
        onClick={() => router.push('/discovery')}
        className="mb-8 hover:opacity-80 transition-opacity"
      >
        <Image 
          src="/bliss-logo.png" 
          alt="Bliss" 
          width={48} 
          height={48}
          className="rounded-xl"
        />
      </button>

      {/* Navigation Links */}
      <div className="flex-1 flex flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/discovery')}
          className={cn(
            'rounded-xl h-12 w-12 p-0 transition-all',
            pathname === '/discovery' 
              ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
              : 'hover:bg-muted'
          )}
          title="Discover"
        >
          <Heart className="w-5 h-5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/matches')}
          className={cn(
            'rounded-xl h-12 w-12 p-0 transition-all',
            pathname === '/matches' 
              ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
              : 'hover:bg-muted'
          )}
          title="Matches"
        >
          <Sparkles className="w-5 h-5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/messages')}
          className={cn(
            'rounded-xl h-12 w-12 p-0 transition-all',
            pathname === '/messages' 
              ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
              : 'hover:bg-muted'
          )}
          title="Messages"
        >
          <MessageCircle className="w-5 h-5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/profile')}
          className={cn(
            'rounded-xl h-12 w-12 p-0 transition-all',
            pathname === '/profile' 
              ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
              : 'hover:bg-muted'
          )}
          title="Profile"
        >
          <User className="w-5 h-5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/settings')}
          className={cn(
            'rounded-xl h-12 w-12 p-0 transition-all',
            pathname === '/settings' 
              ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
              : 'hover:bg-muted'
          )}
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {/* Logout Button at Bottom */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDisconnect}
        className="rounded-xl h-12 w-12 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
        title="Logout"
      >
        <LogOut className="w-5 h-5" />
      </Button>
    </nav>
  );
}

