'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * Mock Profile Overlay - Shows when there are no real profiles available
 * Provides a preview of how profiles will look once users join
 */

interface MockProfile {
  id: number;
  name: string;
  age: number;
  bio: string;
  interests: string[];
  distance: string;
  color: string;
}

const MOCK_PROFILES: MockProfile[] = [
  {
    id: 1,
    name: 'Alex',
    age: 25,
    bio: 'Adventure seeker and coffee enthusiast. Love hiking trails and indie concerts. Looking for someone to explore new places with! 🌄',
    interests: ['Hiking', 'Music', 'Coffee', 'Travel'],
    distance: '2.3 km away',
    color: 'from-pink-500 to-rose-500',
  },
  {
    id: 2,
    name: 'Jordan',
    age: 28,
    bio: 'Tech enthusiast by day, stargazer by night. Building cool things and looking for someone who appreciates both science and art. ✨',
    interests: ['Tech', 'Astronomy', 'Art', 'Cooking'],
    distance: '3.7 km away',
    color: 'from-purple-500 to-indigo-500',
  },
  {
    id: 3,
    name: 'Sam',
    age: 26,
    bio: 'Yoga instructor and plant parent. Believe in good vibes and even better conversations. Let\'s grab some matcha! 🍵',
    interests: ['Yoga', 'Plants', 'Meditation', 'Reading'],
    distance: '1.5 km away',
    color: 'from-emerald-500 to-teal-500',
  },
];

export function MockProfileOverlay() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const currentProfile = MOCK_PROFILES[currentIndex];

  const handleNext = () => {
    if (currentIndex < MOCK_PROFILES.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    // Wait for animation to complete before removing from DOM
    setTimeout(() => {
      const element = document.getElementById('mock-profile-overlay');
      if (element) element.remove();
    }, 200);
  };

  return (
    <AnimatePresence>
      <motion.div
        id="mock-profile-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      >
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="absolute top-4 right-4 text-white hover:bg-white/20"
        >
          <X className="w-6 h-6" />
        </Button>

        {/* Content Container */}
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="max-w-md w-full"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 mb-4"
            >
              <Users className="w-8 h-8 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-2">Preview Profiles</h2>
            <p className="text-gray-300 text-sm">
              Here's what profiles look like on Bliss
            </p>
          </div>

          {/* Mock Profile Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentProfile.id}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-3xl p-6 shadow-2xl"
            >
              {/* Avatar Placeholder */}
              <div className={`w-full aspect-[3/4] rounded-2xl bg-gradient-to-br ${currentProfile.color} mb-4 flex items-center justify-center`}>
                <div className="text-white text-6xl font-bold">
                  {currentProfile.name[0]}
                </div>
              </div>

              {/* Profile Info */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {currentProfile.name}, {currentProfile.age}
                  </h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    {currentProfile.distance}
                  </p>
                </div>

                <p className="text-gray-700 leading-relaxed">
                  {currentProfile.bio}
                </p>

                <div className="flex flex-wrap gap-2">
                  {currentProfile.interests.map((interest) => (
                    <Badge
                      key={interest}
                      variant="secondary"
                      className="bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <div className="flex gap-2">
              {MOCK_PROFILES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? 'bg-white w-8'
                      : 'bg-white/40 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>

            <Button
              onClick={handleNext}
              size="sm"
              className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600"
            >
              Next Profile
              <Plus className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Call to Action */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-center"
          >
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="flex items-center justify-center gap-2 text-white mb-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <span className="font-semibold">Real profiles coming soon!</span>
              </div>
              <p className="text-sm text-gray-300">
                Connect your wallet and create your profile to start matching
              </p>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
