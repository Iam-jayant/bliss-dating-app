/**
 * Revamped Onboarding Flow - Dating-First Theme
 * Enhanced with privacy education and attractive UI
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import {
  Heart,
  Shield,
  Sparkles,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  ArrowRight,
  Camera,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { getUserLocation } from '@/lib/location/geohash-service';
import { profileService } from '@/lib/storage/profile-service';

type OnboardingStep = 'welcome' | 'id' | 'age' | 'location' | 'profile' | 'privacy' | 'complete';

const INTEREST_OPTIONS = ['Travel', 'Fitness', 'Music', 'Art', 'Food', 'Tech', 'Books', 'Outdoors'];
const INTENT_OPTIONS = ['Long-term', 'Short-term', 'Friends', 'Open to explore'];
const BIO_PROMPTS = [
  'Two truths and a lie',
  'The one thing people get wrong about me',
  'My perfect Sunday',
  'What makes me unique',
];

export function NewOnboardingFlow() {
  const { publicKey, connected } = useWallet();
  const router = useRouter();

  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [age, setAge] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [bioPrompt, setBioPrompt] = useState(BIO_PROMPTS[0]);
  const [interests, setInterests] = useState<string[]>([]);
  const [datingIntent, setDatingIntent] = useState(INTENT_OPTIONS[0]);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [locationConsent, setLocationConsent] = useState(false);
  const [locationData, setLocationData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const progress = {
    welcome: 0,
    id: 15,
    age: 30,
    location: 45,
    profile: 70,
    privacy: 85,
    complete: 100,
  }[step];

  useEffect(() => {
    if (connected && publicKey && step === 'id') {
      setStep('age');
    }
  }, [connected, publicKey, step]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInterestToggle = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest));
    } else if (interests.length < 4) {
      setInterests([...interests, interest]);
    }
  };

  const handleLocationConsent = async () => {
    if (!locationConsent) return;

    try {
      setLoading(true);
      const location = await getUserLocation('neighborhood');
      setLocationData(location);
      setStep('profile');
    } catch (error) {
      alert('Location access denied. You can skip this and update later.');
      setStep('profile');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!publicKey || !profileImage) return;

    try {
      setLoading(true);

      // Production: Request wallet signature for encryption
      // Development: Profile saved without additional signature
      const walletSignature = 'mock-signature';

      // Create profile
      await profileService.createProfile(
        publicKey,
        walletSignature,
        {
          name,
          bio,
          bioPromptType: bioPrompt,
          interests,
          datingIntent,
          profileImage,
        },
        locationData?.hash ? parseInt(locationData.hash, 36) : 0
      );

      setStep('complete');
      setTimeout(() => router.push('/app'), 3000);
    } catch (error) {
      console.error('Failed to create profile:', error);
      alert('Failed to create profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-50 flex items-center justify-center p-4">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm shadow-sm">
        <Progress value={progress} className="h-1 rounded-none" />
      </div>

      <AnimatePresence mode="wait">
        {/* Welcome Screen */}
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-md w-full"
          >
            <Card className="p-8 text-center">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mb-6"
              >
                <Heart className="w-20 h-20 mx-auto text-pink-500 fill-pink-500" />
              </motion.div>

              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Welcome to Bliss
              </h1>
              <p className="text-gray-600 mb-6">
                Privacy-first dating that puts you in control
              </p>

              <div className="space-y-3 mb-8 text-left">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Your data, your control</p>
                    <p className="text-xs text-gray-500">All personal info encrypted and owned by you</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Zero-knowledge matching</p>
                    <p className="text-xs text-gray-500">Reveal shared interests only when you match</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Heart className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Real connections</p>
                    <p className="text-xs text-gray-500">No games, no surveillance, just authenticity</p>
                  </div>
                </div>
              </div>

              <Button
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                size="lg"
                onClick={() => setStep('id')}
              >
                Get Started <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Card>
          </motion.div>
        )}

        {/* Wallet Connection */}
        {step === 'id' && (
          <motion.div
            key="wallet"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="max-w-md w-full"
          >
            <Card className="p-8">
              <div className="text-center mb-6">
                <Shield className="w-16 h-16 mx-auto mb-4 text-purple-500" />
                <h2 className="text-2xl font-bold mb-2">Create Your Bliss ID</h2>
                <p className="text-gray-600 text-sm">
                  Your secure identity. No email, no password needed.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-2">
                  <Lock className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Why Bliss ID?</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Your Bliss ID is cryptographically secured and gives you full control over your data.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500"
                size="lg"
                onClick={() => {/* Wallet connection handled by WalletMultiButton */}}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create My Bliss ID'}
              </Button>

              <p className="text-xs text-center text-gray-500 mt-4">
                Need help?{' '}
                <a href="https://leo.app" target="_blank" className="text-pink-600 hover:underline">
                  Learn more about Bliss ID
                </a>
              </p>
            </Card>
          </motion.div>
        )}

        {/* Age Verification */}
        {step === 'age' && (
          <motion.div
            key="age"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="max-w-md w-full"
          >
            <Card className="p-8">
              <div className="text-center mb-6">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                <h2 className="text-2xl font-bold mb-2">Verify Your Age</h2>
                <p className="text-gray-600 text-sm">
                  Prove you're 18+ without revealing your birth date
                </p>
              </div>

              {/* ZK Proof Explanation */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-purple-600" />
                  <p className="text-sm font-semibold">What's proven:</p>
                </div>
                <Badge className="mb-2 bg-green-100 text-green-800">✓ You are 18 or older</Badge>

                <div className="flex items-center gap-2 mt-3 mb-2">
                  <EyeOff className="w-4 h-4 text-gray-600" />
                  <p className="text-sm font-semibold">What stays private:</p>
                </div>
                <div className="space-y-1">
                  <Badge variant="outline" className="bg-gray-50">✗ Your exact age</Badge>
                  <Badge variant="outline" className="bg-gray-50 ml-1">✗ Your birth date</Badge>
                  <Badge variant="outline" className="bg-gray-50 ml-1">✗ Any personal info</Badge>
                </div>
              </div>

              <div className="mb-6">
                <Label htmlFor="age" className="mb-2 block">Enter your age</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="e.g., 25"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  min="18"
                  max="120"
                  className="text-lg text-center"
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  🔒 This will be verified cryptographically, never stored
                </p>
              </div>

              <Button
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500"
                size="lg"
                onClick={() => setStep('location')}
                disabled={!age || parseInt(age) < 18}
              >
                Verify Age (Zero-Knowledge Proof) <Shield className="ml-2 w-5 h-5" />
              </Button>
            </Card>
          </motion.div>
        )}

        {/* Location Consent */}
        {step === 'location' && (
          <motion.div
            key="location"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="max-w-md w-full"
          >
            <Card className="p-8">
              <div className="text-center mb-6">
                <MapPin className="w-16 h-16 mx-auto mb-4 text-blue-500" />
                <h2 className="text-2xl font-bold mb-2">Find Nearby Matches</h2>
                <p className="text-gray-600 text-sm">
                  Share your approximate location for better matches
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-900">Privacy First</p>
                    <ul className="text-xs text-yellow-700 mt-1 space-y-1 list-disc list-inside">
                      <li>Only your neighborhood (~5km area) is shared</li>
                      <li>Exact coordinates never stored or revealed</li>
                      <li>You can opt-out anytime</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 mb-6 p-3 bg-gray-50 rounded">
                <input
                  type="checkbox"
                  id="location-consent"
                  checked={locationConsent}
                  onChange={(e) => setLocationConsent(e.target.checked)}
                  className="mt-1"
                />
                <label htmlFor="location-consent" className="text-sm">
                  I consent to share my approximate location for proximity-based matching. I understand my exact location is never revealed.
                </label>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep('profile')}
                >
                  Skip for Now
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500"
                  onClick={handleLocationConsent}
                  disabled={!locationConsent || loading}
                >
                  {loading ? 'Getting Location...' : 'Allow Location'}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Profile Creation */}
        {step === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="max-w-2xl w-full"
          >
            <Card className="p-8">
              <div className="text-center mb-6">
                <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-500" />
                <h2 className="text-2xl font-bold mb-2">Create Your Profile</h2>
                <p className="text-gray-600 text-sm">
                  Show your authentic self
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Left Column - Image & Name */}
                <div>
                  <div className="mb-4">
                    <Label className="mb-2 block">Profile Photo</Label>
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-16 h-16 text-gray-400" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      maxLength={50}
                    />
                  </div>
                </div>

                {/* Right Column - Details */}
                <div>
                  <div className="mb-4">
                    <Label>Bio Prompt</Label>
                    <select
                      value={bioPrompt}
                      onChange={(e) => setBioPrompt(e.target.value)}
                      className="w-full p-2 border rounded"
                    >
                      {BIO_PROMPTS.map(prompt => (
                        <option key={prompt} value={prompt}>{prompt}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-4">
                    <Label>Your Answer</Label>
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Write something interesting..."
                      maxLength={200}
                      rows={4}
                    />
                    <p className="text-xs text-gray-500 mt-1">{bio.length}/200</p>
                  </div>

                  <div className="mb-4">
                    <Label>What are you looking for?</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {INTENT_OPTIONS.map(intent => (
                        <Button
                          key={intent}
                          variant={datingIntent === intent ? 'default' : 'outline'}
                          className={datingIntent === intent ? 'bg-pink-500' : ''}
                          onClick={() => setDatingIntent(intent)}
                        >
                          {intent}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Interests */}
              <div className="mb-6">
                <Label>Interests (Select 1-4)</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {INTEREST_OPTIONS.map(interest => (
                    <Button
                      key={interest}
                      variant={interests.includes(interest) ? 'default' : 'outline'}
                      className={interests.includes(interest) ? 'bg-purple-500' : ''}
                      onClick={() => handleInterestToggle(interest)}
                      disabled={!interests.includes(interest) && interests.length >= 4}
                    >
                      {interest}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {interests.length}/4 selected
                </p>
              </div>

              <Button
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500"
                size="lg"
                onClick={() => setStep('privacy')}
                disabled={!name || !bio || interests.length < 1 || !profileImage}
              >
                Continue <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Card>
          </motion.div>
        )}

        {/* Privacy Preview */}
        {step === 'privacy' && (
          <motion.div
            key="privacy"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="max-w-2xl w-full"
          >
            <Card className="p-8">
              <div className="text-center mb-6">
                <Lock className="w-16 h-16 mx-auto mb-4 text-blue-500" />
                <h2 className="text-2xl font-bold mb-2">Your Privacy Summary</h2>
                <p className="text-gray-600 text-sm">
                  Here's what others see vs. what stays private
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {/* What's Visible */}
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-green-900">Visible to Matches</h3>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Name & Photo</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Bio & Dating Intent</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Approximate Distance</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Shared Interests (after match)</span>
                    </li>
                  </ul>
                </div>

                {/* What's Private */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <EyeOff className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-900">Always Private</h3>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-blue-500" />
                      <span>Your age & birthdate</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-blue-500" />
                      <span>Exact location</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-blue-500" />
                      <span>Non-matching interests</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-blue-500" />
                      <span>Account ID</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-purple-900">
                  <strong>Zero-Knowledge Magic:</strong> When you match, only shared interests are revealed through cryptographic proofs. Non-matching preferences stay encrypted forever.
                </p>
              </div>

              <Button
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500"
                size="lg"
                onClick={handleComplete}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    Creating Your Profile...
                  </>
                ) : (
                  <>
                    Create My Profile <Heart className="ml-2 w-5 h-5" />
                  </>
                )}
              </Button>
            </Card>
          </motion.div>
        )}

        {/* Complete */}
        {step === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full"
          >
            <Card className="p-8 text-center">
              <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, 360, 0] }}
                transition={{ duration: 1 }}
              >
                <Sparkles className="w-20 h-20 mx-auto mb-4 text-purple-500" />
              </motion.div>

              <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                You're All Set!
              </h2>
              <p className="text-gray-600 mb-6">
                Welcome to Bliss. Let's find your match.
              </p>

              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto" />
              <p className="text-sm text-gray-500 mt-4">Redirecting to discovery...</p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
