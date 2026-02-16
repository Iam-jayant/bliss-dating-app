/**
 * Match Modal - Beautiful animation when users match
 */

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchName: string;
  matchImage?: string;
  userImage?: string;
  userName?: string;
}

export function MatchModal({
  isOpen,
  onClose,
  matchName,
  matchImage,
  userImage,
  userName = 'You',
}: MatchModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 100 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg"
            >
              {/* Confetti Background Effect */}
              {showConfetti && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {[...Array(30)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 rounded-full"
                      style={{
                        background: `hsl(${Math.random() * 360}, 70%, 60%)`,
                        left: `${Math.random() * 100}%`,
                        top: '-10%',
                      }}
                      animate={{
                        y: ['0vh', '110vh'],
                        rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
                        opacity: [1, 0],
                      }}
                      transition={{
                        duration: 2 + Math.random() * 2,
                        ease: 'linear',
                        delay: Math.random() * 0.5,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="absolute -top-12 right-0 text-white hover:bg-white/20 rounded-full z-10"
              >
                <X className="w-6 h-6" />
              </Button>

              {/* Card Content */}
              <div className="bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 rounded-3xl shadow-2xl overflow-hidden">
                <div className="p-8 text-center text-white">
                  {/* Title with Animation */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="mb-6"
                  >
                    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-6 py-3">
                      <Sparkles className="w-5 h-5" />
                      <h2 className="text-2xl font-bold">It's a Match!</h2>
                      <Sparkles className="w-5 h-5" />
                    </div>
                  </motion.div>

                  {/* Profile Images */}
                  <div className="relative h-40 mb-8">
                    {/* User Avatar */}
                    <motion.div
                      initial={{ x: -100, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.3, type: "spring" }}
                      className="absolute left-1/2 top-1/2 -translate-x-full -translate-y-1/2 -ml-6"
                    >
                      <div className="relative">
                        <Avatar className="w-32 h-32 border-4 border-white shadow-2xl">
                          <AvatarImage src={userImage} alt={userName} />
                          <AvatarFallback className="text-3xl bg-gradient-to-br from-pink-400 to-purple-400 text-white">
                            {userName[0]}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </motion.div>

                    {/* Match Avatar */}
                    <motion.div
                      initial={{ x: 100, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.3, type: "spring" }}
                      className="absolute left-1/2 top-1/2 -translate-y-1/2 ml-6"
                    >
                      <div className="relative">
                        <Avatar className="w-32 h-32 border-4 border-white shadow-2xl">
                          <AvatarImage src={matchImage} alt={matchName} />
                          <AvatarFallback className="text-3xl bg-gradient-to-br from-indigo-400 to-pink-400 text-white">
                            {matchName[0]}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </motion.div>

                    {/* Heart Icon in Center */}
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
                    >
                      <div className="w-16 h-16 rounded-full bg-white shadow-2xl flex items-center justify-center">
                        <Heart className="w-8 h-8 text-pink-500 fill-pink-500" />
                      </div>
                    </motion.div>
                  </div>

                  {/* Message */}
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="text-lg mb-8 text-white/90"
                  >
                    You and <span className="font-bold">{matchName}</span> liked each other!
                  </motion.p>

                  {/* Action Buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="space-y-3"
                  >
                    <Button
                      size="lg"
                      className="w-full h-14 text-base font-semibold bg-white text-purple-600 hover:bg-gray-100 shadow-lg"
                      onClick={() => {
                        // Navigate to messages
                        window.location.href = '/messages';
                      }}
                    >
                      <MessageCircle className="w-5 h-5 mr-2" />
                      Send a Message
                    </Button>
                    
                    <Button
                      size="lg"
                      variant="ghost"
                      className="w-full text-white hover:bg-white/20"
                      onClick={onClose}
                    >
                      Keep Swiping
                    </Button>
                  </motion.div>
                </div>
              </div>

              {/* Floating Hearts Animation */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={`heart-${i}`}
                    className="absolute"
                    style={{
                      left: `${10 + i * 12}%`,
                      bottom: '-10%',
                    }}
                    animate={{
                      y: [0, -400],
                      opacity: [0, 1, 0],
                      scale: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 3,
                      delay: i * 0.2,
                      repeat: Infinity,
                      ease: 'easeOut',
                    }}
                  >
                    <Heart className="w-6 h-6 text-pink-400 fill-pink-400" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
