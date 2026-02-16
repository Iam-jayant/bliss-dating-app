'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, Edit, Loader2, Save, X, Camera, Shield, LogOut } from 'lucide-react';
import { getProfile, getProfileImageUrl, updateProfile, uploadProfileImage } from '@/lib/supabase/profile';
import type { ProfileData, BioPromptType, DatingIntent } from '@/lib/supabase/types';

function getDisplayImage(imagePath: string | undefined, name: string): string {
  if (!imagePath || imagePath.startsWith('mock_image_')) {
    return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundColor=c0aede`;
  }
  return getProfileImageUrl(imagePath);
}

export function ProfilePage() {
  const { connected, publicKey, disconnect } = useWallet();
  const router = useRouter();
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Edit mode
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editBioPrompt, setEditBioPrompt] = useState<BioPromptType>('Two truths and a lie');
  const [editInterests, setEditInterests] = useState<string[]>([]);
  const [editInterestInput, setEditInterestInput] = useState('');
  const [editIntent, setEditIntent] = useState<DatingIntent>('Open to explore');
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!connected || !publicKey) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const profileData = await getProfile(publicKey);
        if (!profileData) {
          router.push('/onboarding');
          return;
        }
        setProfile(profileData);
      } catch (err) {
        console.error('Failed to load profile:', err);
        setError("Couldn't load profile. Please refresh.");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [connected, publicKey, router]);

  const startEditing = () => {
    if (!profile) return;
    setEditName(profile.name);
    setEditBio(profile.bio);
    setEditBioPrompt(profile.bio_prompt_type);
    setEditInterests([...profile.interests]);
    setEditIntent(profile.dating_intent);
    setEditImage(null);
    setEditImagePreview('');
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setError('');
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Please upload a jpg, png, or webp image'); return; }
    setEditImage(file);
    setEditImagePreview(URL.createObjectURL(file));
    setError('');
  };

  const addInterest = () => {
    if (editInterests.length >= 4) { setError('Maximum 4 interests'); return; }
    if (editInterestInput.trim() && !editInterests.includes(editInterestInput.trim())) {
      setEditInterests([...editInterests, editInterestInput.trim()]);
      setEditInterestInput('');
      setError('');
    }
  };

  const saveChanges = async () => {
    if (!publicKey || !profile) return;
    if (!editName.trim()) { setError('Name is required'); return; }
    if (!editBio.trim()) { setError('Bio is required'); return; }
    if (editInterests.length === 0) { setError('At least 1 interest required'); return; }

    try {
      setSaving(true);
      setError('');

      let imagePath = profile.profile_image_path;
      if (editImage) {
        imagePath = await uploadProfileImage(editImage, publicKey);
      }

      await updateProfile(publicKey, {
        name: editName.trim(),
        bio: editBio.trim(),
        bio_prompt_type: editBioPrompt,
        interests: editInterests,
        dating_intent: editIntent,
        profile_image_path: imagePath,
      });

      // Reload profile
      const updated = await getProfile(publicKey);
      if (updated) setProfile(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await disconnect();
      router.push('/');
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center pl-20">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Not connected state
  if (!connected) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center pl-20">
        <div className="text-center space-y-4 max-w-md px-6">
          <h2 className="font-headline text-3xl italic text-primary">Connect Your Wallet</h2>
          <p className="text-muted-foreground">Connect your wallet to view your profile</p>
          <Button onClick={() => router.push('/onboarding')} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  // Error state (no profile)
  if (!profile && error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center pl-20">
        <div className="text-center space-y-4 max-w-md px-6">
          <h2 className="font-headline text-3xl italic text-destructive">Oops!</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center pl-20">
        <div className="text-center space-y-4 max-w-md px-6">
          <h2 className="font-headline text-3xl italic text-primary">No Profile Found</h2>
          <p className="text-muted-foreground">You haven&apos;t created a profile yet</p>
          <Button onClick={() => router.push('/onboarding')} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Create Profile
          </Button>
        </div>
      </div>
    );
  }

  const profileImageUrl = getDisplayImage(profile.profile_image_path, profile.name);

  return (
    <div className="min-h-screen bg-background text-foreground pl-20">
      <main className="pt-12 pb-16 px-6">
        <div className="container mx-auto max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-headline italic text-primary">Your Profile</h1>
            <div className="flex items-center gap-2">
              {!editing ? (
                <>
                  <Button variant="outline" size="sm" onClick={startEditing} className="border-primary/20">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={cancelEditing} disabled={saving}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveChanges} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Profile Card */}
          <div className="backdrop-blur-xl bg-card border border-primary/20 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-8 space-y-6">
              {/* Profile Image and Name */}
              <div className="flex items-start gap-5">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-muted border-2 border-primary/20">
                    <img
                      src={editing && editImagePreview ? editImagePreview : profileImageUrl}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(profile.name)}&backgroundColor=c0aede`;
                      }}
                    />
                  </div>
                  {editing && (
                    <>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Camera className="w-6 h-6 text-white" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </>
                  )}
                </div>

                <div className="flex-1">
                  {editing ? (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Name</Label>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        maxLength={50}
                        className="border-primary/20"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="font-headline text-3xl italic text-foreground">{profile.name}</h2>
                        {profile.is_verified && <CheckCircle2 className="w-6 h-6 text-primary" />}
                      </div>
                      <p className="text-sm text-muted-foreground">Looking for {profile.dating_intent}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Dating Intent (edit mode) */}
              {editing && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Dating Intent</Label>
                  <RadioGroup
                    value={editIntent}
                    onValueChange={(v) => setEditIntent(v as DatingIntent)}
                    className="flex flex-wrap gap-3"
                  >
                    {['Long-term', 'Short-term', 'Friends', 'Open to explore'].map((intent) => (
                      <div key={intent} className="flex items-center space-x-2">
                        <RadioGroupItem value={intent} id={`edit-${intent}`} />
                        <Label htmlFor={`edit-${intent}`} className="font-normal cursor-pointer text-sm">{intent}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {/* Bio Section */}
              <div className="space-y-2">
                {editing ? (
                  <>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Bio Prompt</Label>
                    <Select value={editBioPrompt} onValueChange={(v) => setEditBioPrompt(v as BioPromptType)}>
                      <SelectTrigger className="border-primary/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Two truths and a lie">Two truths and a lie</SelectItem>
                        <SelectItem value="The one thing people get wrong about me">The one thing people get wrong about me</SelectItem>
                        <SelectItem value="My perfect Sunday">My perfect Sunday</SelectItem>
                        <SelectItem value="What makes me unique">What makes me unique</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      maxLength={200}
                      rows={3}
                      className="border-primary/20 resize-none"
                    />
                    <p className="text-xs text-muted-foreground">{editBio.length}/200</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{profile.bio_prompt_type}</p>
                    <p className="text-base leading-relaxed text-foreground">{profile.bio}</p>
                  </>
                )}
              </div>

              {/* Interests Section */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Interests</p>
                {editing ? (
                  <>
                    <div className="flex gap-2">
                      <Input
                        value={editInterestInput}
                        onChange={(e) => setEditInterestInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInterest(); } }}
                        placeholder="Add an interest"
                        className="border-primary/20"
                      />
                      <Button type="button" onClick={addInterest} disabled={editInterests.length >= 4} variant="outline" className="border-primary/20">
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editInterests.map((interest) => (
                        <Badge key={interest} variant="secondary" className="px-3 py-1 text-sm">
                          {interest}
                          <X className="ml-1 w-3 h-3 cursor-pointer" onClick={() => setEditInterests(editInterests.filter(i => i !== interest))} />
                        </Badge>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest) => (
                      <Badge key={interest} variant="secondary" className="px-3 py-1 text-sm">{interest}</Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-4 bg-secondary/50 border-t border-primary/10">
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-3 h-3" />
                <span>ZK verified on Aleo • Encrypted on IPFS • P2P synced</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
