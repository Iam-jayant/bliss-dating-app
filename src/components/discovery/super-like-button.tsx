/**
 * Super Like Button Component
 * Premium action that notifies the user they're really interested
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Star, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface SuperLikeButtonProps {
  onSuperLike: () => void;
  disabled: boolean;
  dailyLimitReached: boolean;
}

export function SuperLikeButton({ onSuperLike, disabled, dailyLimitReached }: SuperLikeButtonProps) {
  const [showBurst, setShowBurst] = useState(false);

  const handleClick = () => {
    if (disabled || dailyLimitReached) return;
    
    setShowBurst(true);
    setTimeout(() => setShowBurst(false), 1000);
    onSuperLike();
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="icon"
        onClick={handleClick}
        disabled={disabled || dailyLimitReached}
        className="rounded-full h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600 text-white border-0 hover:scale-110 transition-transform disabled:opacity-50"
      >
        <Star className="h-7 w-7 fill-current" />
      </Button>

      {/* Burst Animation */}
      {showBurst && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, x: 0, y: 0 }}
              animate={{
                scale: [0, 1, 0],
                x: Math.cos((i * Math.PI * 2) / 8) * 50,
                y: Math.sin((i * Math.PI * 2) / 8) * 50,
              }}
              transition={{ duration: 0.6 }}
              className="absolute top-1/2 left-1/2"
            >
              <Sparkles className="h-4 w-4 text-yellow-400" />
            </motion.div>
          ))}
        </div>
      )}

      {dailyLimitReached && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap">
          1 per day
        </div>
      )}
    </div>
  );
}
