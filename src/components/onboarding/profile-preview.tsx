'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, User } from 'lucide-react';
import type { BioPromptType, DatingIntent } from '@/lib/storage/types';

interface ProfilePreviewProps {
  name: string;
  imagePreview: string;
  bio: string;
  bioPrompt: BioPromptType;
  interests: string[];
  datingIntent: DatingIntent | '';
}

export function ProfilePreview({
  name,
  imagePreview,
  bio,
  bioPrompt,
  interests,
  datingIntent,
}: ProfilePreviewProps) {
  return (
    <div className="sticky top-8">
      <h3 className="text-lg font-semibold mb-4">Preview</h3>
      <div className="backdrop-blur-xl bg-card/10 border border-white/10 rounded-2xl p-6 space-y-4">
        {/* Profile Image */}
        <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-muted">
          {imagePreview ? (
            <img
              src={imagePreview}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <User className="w-12 h-12" />
            </div>
          )}
        </div>

        {/* Name with Verified Badge */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <h4 className="text-xl font-semibold">
              {name || 'Your Name'}
            </h4>
            <CheckCircle2 className="w-5 h-5 text-blue-500" />
          </div>
        </div>

        {/* Bio */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">{bioPrompt}</p>
          <p className="text-sm">
            {bio || 'Your bio will appear here...'}
          </p>
        </div>

        {/* Interests */}
        {interests.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Interests</p>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => (
                <Badge key={interest} variant="secondary">
                  {interest}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Dating Intent */}
        {datingIntent && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Looking for</p>
            <p className="text-sm">{datingIntent}</p>
          </div>
        )}
      </div>
    </div>
  );
}
