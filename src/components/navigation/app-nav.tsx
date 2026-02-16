'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, User, LogOut, MessageCircle, Sparkles, Settings, HeartHandshake, Shield } from 'lucide-react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { cn } from '@/lib/utils';

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { disconnect } = useWallet();
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't show navigation on landing or onboarding pages
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
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <motion.nav
      initial={false}
      animate={{ width: isExpanded ? 192 : 80 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className="fixed left-0 top-0 bottom-0 z-50 flex flex-col items-start py-6 bg-card/80 backdrop-blur-xl border-r border-primary/20 overflow-hidden"
    >
      {/* Logo */}
      <button
        onClick={() => router.push('/discovery')}
        className="mb-8 ml-4 hover:opacity-80 transition-opacity"
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
      <div className="flex-1 flex flex-col gap-4 w-full px-4">
        {navItems.map(({ icon: Icon, label, path }) => (
          <motion.button
            key={path}
            onClick={() => router.push(path)}
            className={cn(
              'flex items-center gap-3 rounded-xl h-12 px-3 transition-all relative overflow-hidden',
              pathname === path
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-foreground'
            )}
            whileTap={{ scale: 0.95 }}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <AnimatePresence>
              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm font-medium whitespace-nowrap"
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>

      {/* Logout Button at Bottom */}
      <motion.button
        onClick={handleDisconnect}
        className="flex items-center gap-3 rounded-xl h-12 px-3 mx-4 text-destructive hover:bg-destructive/10 transition-all overflow-hidden"
        whileTap={{ scale: 0.95 }}
      >
        <LogOut className="w-5 h-5 flex-shrink-0" />
        <AnimatePresence>
          {isExpanded && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="text-sm font-medium whitespace-nowrap"
            >
              Logout
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.nav>
  );
}

