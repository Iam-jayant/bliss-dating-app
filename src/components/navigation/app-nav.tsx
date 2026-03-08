'use client';

import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Heart, User, LogOut, MessageCircle, Sparkles, Settings, HeartHandshake, Shield, Crown } from 'lucide-react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { disconnect } = useWallet();

  if (pathname === '/' || pathname === '/onboarding' || pathname === '/app') {
    return null;
  }

  const handleDisconnect = async () => {
    await disconnect();
    router.push('/');
  };

  const navItems = [
    { icon: Heart, label: 'Discover', path: '/discovery' },
    { icon: Sparkles, label: 'Matches', path: '/matches' },
    { icon: HeartHandshake, label: 'Likes', path: '/likes' },
    { icon: MessageCircle, label: 'Messages', path: '/messages' },
    { icon: Shield, label: 'Safety', path: '/safety' },
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Crown, label: 'Subscription', path: '/subscription' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <nav className="fixed left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-1 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl py-4 px-2">

        {/* Logo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => router.push('/discovery')}
              className="mb-2 p-1.5 rounded-2xl hover:bg-white/5 transition-colors"
            >
              <Image
                src="/bliss-logo.png"
                alt="Bliss"
                width={32}
                height={32}
                className="rounded-lg"
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-black/80 backdrop-blur-md border-white/10 text-white">
            Home
          </TooltipContent>
        </Tooltip>

        <div className="w-6 h-px bg-white/10 my-1" />

        {/* Nav Items */}
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = pathname === path;
          return (
            <Tooltip key={path}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => router.push(path)}
                  className={cn(
                    'relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ease-out',
                    isActive
                      ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/20'
                      : 'text-white/60 hover:text-white hover:bg-white/10 hover:scale-125'
                  )}
                >
                  <Icon className="w-[18px] h-[18px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-black/80 backdrop-blur-md border-white/10 text-white">
                {label}
              </TooltipContent>
            </Tooltip>
          );
        })}

        <div className="w-6 h-px bg-white/10 my-1" />

        {/* Logout */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleDisconnect}
              className="flex items-center justify-center w-10 h-10 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 hover:scale-125 transition-all duration-200 ease-out"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-black/80 backdrop-blur-md border-white/10 text-white">
            Logout
          </TooltipContent>
        </Tooltip>
      </nav>
    </TooltipProvider>
  );
}

