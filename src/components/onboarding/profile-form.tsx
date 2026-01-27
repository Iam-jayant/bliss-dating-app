'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, X } from 'lucide-react';
import { createProfile, uploadProfileImage } from '@/lib/supabase/profile';
import type { BioPromptType, DatingIntent } from '@/lib/supabase/types';
import { ProfilePreview } from './profile-preview';

interface ProfileFormProps {
  walletAddress: string;
  onSuccess: () => void;
}

export function ProfileForm({ walletAddress, onSuccess }: ProfileFormProps) {
  // Form state
  const [name, setName] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [bio, setBio] = useState('');
  const [bioPrompt, setBioPrompt] = useState<BioPromptType>('Two truths and a lie');
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState('');
  const [datingIntent, setDatingIntent] = useState<DatingIntent | ''>('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Image upload handler
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB');
      return;
    }

    // Validate format
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please upload a jpg, png, or webp image');
      return;
    }

    setProfileImage(file);
    setImagePreview(URL.createObjectURL(file));
    setError('');
  };

  // Interest management
  const addInterest = () => {
    if (interests.length >= 4) {
      setError('Maximum 4 interests allowed');
      return;
    }
    if (interestInput.trim() && !interests.includes(interestInput.trim())) {
      setInterests([...interests, interestInput.trim()]);
      setInterestInput('');
      setError('');
    }
  };

  const removeInterest = (interest: string) => {
    setInterests(interests.filter(i => i !== interest));
    setError('');
  };

  // Form submission
  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (name.length > 50) {
      setError('Name must be under 50 characters');
      return;
    }
    if (!profileImage) {
      setError('Profile picture is required');
      return;
    }
    if (!bio.trim()) {
      setError('Bio is required');
      return;
    }
    if (bio.length > 200) {
      setError('Bio must be under 200 characters');
      return;
    }
    if (interests.length === 0) {
      setError('At least 1 interest is required');
      return;
    }
    if (!datingIntent) {
      setError('Dating intent is required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Upload image first
      const imagePath = await uploadProfileImage(profileImage, walletAddress);

      // Create profile
      await createProfile(walletAddress, {
        name: name.trim(),
        profile_image_path: imagePath,
        bio: bio.trim(),
        bio_prompt_type: bioPrompt,
        interests,
        dating_intent: datingIntent,
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Form Column */}
      <div className="space-y-6">
        {/* Name Input with Verified Badge */}
        <div>
          <Label htmlFor="name" className="text-sm text-muted-foreground">
            Name
          </Label>
          <div className="relative mt-1">
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder="Your name"
              className="bg-background/50 border-white/10 pr-10"
            />
            <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
          </div>
        </div>

        {/* Profile Picture Upload */}
        <div>
          <Label htmlFor="image" className="text-sm text-muted-foreground">
            Profile Picture
          </Label>
          <input
            id="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageSelect}
            className="mt-1 block w-full text-sm text-muted-foreground
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-medium
              file:bg-primary/20 file:text-primary
              hover:file:bg-primary/30 cursor-pointer"
          />
          {imagePreview && (
            <div className="mt-2">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-24 h-24 rounded-full object-cover border-2 border-white/10"
              />
            </div>
          )}
        </div>

        {/* Bio Prompt Selection */}
        <div>
          <Label htmlFor="bioPrompt" className="text-sm text-muted-foreground">
            Bio Prompt
          </Label>
          <Select value={bioPrompt} onValueChange={(value) => setBioPrompt(value as BioPromptType)}>
            <SelectTrigger id="bioPrompt" className="mt-1 bg-background/50 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Two truths and a lie">Two truths and a lie</SelectItem>
              <SelectItem value="The one thing people get wrong about me">
                The one thing people get wrong about me
              </SelectItem>
              <SelectItem value="My perfect Sunday">My perfect Sunday</SelectItem>
              <SelectItem value="What makes me unique">What makes me unique</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bio Textarea */}
        <div>
          <Label htmlFor="bio" className="text-sm text-muted-foreground">
            Bio
          </Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={200}
            rows={4}
            placeholder="Your response..."
            className="mt-1 bg-background/50 border-white/10 resize-none"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {bio.length}/200 characters
          </p>
        </div>

        {/* Interests */}
        <div>
          <Label htmlFor="interests" className="text-sm text-muted-foreground">
            Interests (Max 4)
          </Label>
          <div className="flex gap-2 mt-1 mb-2">
            <Input
              id="interests"
              value={interestInput}
              onChange={(e) => setInterestInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addInterest();
                }
              }}
              placeholder="Add an interest"
              className="bg-background/50 border-white/10"
            />
            <Button
              type="button"
              onClick={addInterest}
              disabled={interests.length >= 4}
              className="bg-primary/20 hover:bg-primary/30 text-primary"
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {interests.map((interest) => (
              <Badge key={interest} variant="secondary" className="px-3 py-1">
                {interest}
                <X
                  className="ml-1 w-3 h-3 cursor-pointer"
                  onClick={() => removeInterest(interest)}
                />
              </Badge>
            ))}
          </div>
        </div>

        {/* Dating Intent */}
        <div>
          <Label className="text-sm text-muted-foreground">
            Dating Intent
          </Label>
          <RadioGroup
            value={datingIntent}
            onValueChange={(value) => setDatingIntent(value as DatingIntent)}
            className="mt-2 space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Long-term" id="long-term" />
              <Label htmlFor="long-term" className="font-normal cursor-pointer">
                Long-term
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Short-term" id="short-term" />
              <Label htmlFor="short-term" className="font-normal cursor-pointer">
                Short-term
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Friends" id="friends" />
              <Label htmlFor="friends" className="font-normal cursor-pointer">
                Friends
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Open to explore" id="open" />
              <Label htmlFor="open" className="font-normal cursor-pointer">
                Open to explore
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {loading ? 'Creating Profile...' : 'Create Profile'}
        </Button>
      </div>

      {/* Preview Column */}
      <ProfilePreview
        name={name}
        imagePreview={imagePreview}
        bio={bio}
        bioPrompt={bioPrompt}
        interests={interests}
        datingIntent={datingIntent}
      />
    </div>
  );
}
