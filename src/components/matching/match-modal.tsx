/**
 * Match Modal - Celebrates mutual matches with privacy details
 */

'use client';

import { motion } from 'framer-motion';
import { Heart, MessageCircle, X, Shield } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Confetti } from '@/components/landing/confetti';

interface MatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchProfile: {
    name: string;
    imageCid: string;
    sharedInterests: string[]; // Only shared interests revealed
    compatibilityScore: number;
  };
  onSendMessage: () => void;
}

export function MatchModal({ isOpen, onClose, matchProfile, onSendMessage }: MatchModalProps) {
  return (
    <>
      {isOpen && <Confetti />}
      
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="relative">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 z-10"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>

            {/* Match animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.6 }}
              className="text-center py-8"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  repeatDelay: 0.5,
                }}
              >
                <Heart className="w-20 h-20 mx-auto text-pink-500 fill-pink-500" />
              </motion.div>

              <h1 className="text-4xl font-bold mt-6 mb-2 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                It's a Match!
              </h1>
              <p className="text-gray-600">
                You and {matchProfile.name} liked each other
              </p>
            </motion.div>

            {/* Profile Preview */}
            <div className="flex justify-center mb-6">
              <Avatar className="w-32 h-32 border-4 border-pink-200">
                <AvatarImage src={`https://w3s.link/ipfs/${matchProfile.imageCid}`} />
                <AvatarFallback className="text-4xl">
                  {matchProfile.name[0]}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Compatibility Score */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-50 to-purple-50 px-4 py-2 rounded-full">
                <Shield className="w-4 h-4 text-pink-600" />
                <span className="font-semibold text-pink-600">
                  {matchProfile.compatibilityScore}% Compatible
                </span>
              </div>
            </div>

            {/* Shared Interests (ZK Revealed) */}
            <div className="bg-pink-50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-pink-600" />
                <h3 className="font-semibold text-sm">Shared Interests (ZK Revealed)</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {matchProfile.sharedInterests.map((interest, i) => (
                  <Badge key={i} className="bg-gradient-to-r from-pink-500 to-purple-500">
                    {interest}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                🔒 Your other interests remain private
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                size="lg"
                onClick={onSendMessage}
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Send Message
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={onClose}
              >
                Keep Swiping
              </Button>
            </div>

            {/* Privacy Note */}
            <div className="mt-6 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-900">
                <strong>Privacy Note:</strong> Messages are end-to-end encrypted. Only shared interests are revealed through zero-knowledge proofs.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
