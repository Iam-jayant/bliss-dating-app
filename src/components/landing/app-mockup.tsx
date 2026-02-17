'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Heart, X, Star } from 'lucide-react';

const demoProfiles = [
  {
    name: 'Sarah',
    age: 26,
    image: 'https://api.dicebear.com/9.x/notionists/svg?seed=Sarah&backgroundColor=c0aede',
    interest: 'Long-term'
  },
  {
    name: 'Alex',
    age: 29,
    image: 'https://api.dicebear.com/9.x/notionists/svg?seed=Alex&backgroundColor=c0aede',
    interest: 'Something casual'
  },
  {
    name: 'Jordan',
    age: 27,
    image: 'https://api.dicebear.com/9.x/notionists/svg?seed=Jordan&backgroundColor=c0aede',
    interest: 'Open to explore'
  }
];

export function AppMockup() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  useEffect(() => {
    const interval = setInterval(() => {
      setDirection(Math.random() > 0.5 ? 'right' : 'left');
      setCurrentIndex((prev) => (prev + 1) % demoProfiles.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const currentProfile = demoProfiles[currentIndex];

  return (
    <div className="relative py-8">
      {/* Floating badges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="absolute -top-4 -left-4 z-20"
      >
        <div className="bg-card border border-primary/20 rounded-full px-3 py-1.5 shadow-lg">
          <p className="text-[10px] font-semibold text-primary flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>
            End-to-End Encrypted
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.6 }}
        className="absolute -bottom-4 -right-4 z-20"
      >
        <div className="bg-card border border-primary/20 rounded-full px-3 py-1.5 shadow-lg">
          <p className="text-[10px] font-semibold text-primary flex items-center gap-1.5">
            <Star className="w-3 h-3 fill-primary" />
            Zero-Knowledge
          </p>
        </div>
      </motion.div>

      {/* Phone frame */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        className="relative mx-auto w-[260px] md:w-[300px] h-[520px] md:h-[600px]"
      >
        {/* Phone bezel */}
        <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-gray-900 to-gray-800 shadow-2xl p-3">
          {/* Screen */}
          <div className="relative w-full h-full rounded-[2.5rem] bg-background overflow-hidden">
            
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 z-30 pt-4 px-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-headline italic text-primary">Discover</span>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary"/>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile card stack */}
            <div className="absolute inset-0 pt-16 pb-24 px-4 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ 
                    scale: 0.9, 
                    opacity: 0,
                    x: direction === 'right' ? 100 : -100,
                    rotate: direction === 'right' ? 10 : -10
                  }}
                  animate={{ 
                    scale: 1, 
                    opacity: 1,
                    x: 0,
                    rotate: 0
                  }}
                  exit={{ 
                    x: direction === 'right' ? -100 : 100,
                    opacity: 0,
                    rotate: direction === 'right' ? -10 : 10,
                    transition: { duration: 0.3 }
                  }}
                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  className="relative w-full h-full rounded-2xl overflow-hidden shadow-xl"
                >
                  {/* Profile image */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20">
                    <Image
                      src={currentProfile.image}
                      alt={currentProfile.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {/* Profile info */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <h3 className="text-xl font-semibold">{currentProfile.name}, {currentProfile.age}</h3>
                    <p className="text-sm text-white/70 mt-1">{currentProfile.interest}</p>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Stack preview */}
              <div className="absolute inset-0 pt-16 pb-24 px-4 -z-10" style={{ transform: 'scale(0.95) translateY(8px)' }}>
                <div className="w-full h-full rounded-2xl bg-secondary/60 border border-border" />
              </div>
            </div>

            {/* Action buttons */}
            <div className="absolute bottom-6 left-0 right-0 z-30 flex items-center justify-center gap-3 px-4">
              <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center">
                <X className="w-5 h-5 text-gray-900 dark:text-white" strokeWidth={2.5} />
              </div>
              <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center">
                <Star className="w-4 h-4 text-gray-900 dark:text-white" strokeWidth={2.5} />
              </div>
              <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-gray-900 dark:text-white fill-gray-900 dark:fill-white" strokeWidth={2.5} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
