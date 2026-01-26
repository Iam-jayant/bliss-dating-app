'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletMultiButton } from '@demox-labs/aleo-wallet-adapter-reactui';
import { DecryptPermission, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { aleoService } from '@/lib/aleo/service';
import { createSupabaseProfile, updateProfile } from '@/lib/supabase/profile';
import { CheckCircle2, Wallet, Shield, User, Sparkles } from 'lucide-react';
import { WalletSelectionModal } from './wallet-selection-modal';

interface OnboardingPageProps {
    onComplete?: () => void;
}

type Step = 1 | 2 | 3 | 4;

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
    const { connected, connecting, publicKey, connect, disconnect, wallets, select } = useWallet();

    // State management
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [walletAddress, setWalletAddress] = useState<string>('');
    const [age, setAge] = useState<string>('');
    const [bio, setBio] = useState<string>('');
    const [interests, setInterests] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [verificationTxId, setVerificationTxId] = useState<string>('');
    const [showWalletModal, setShowWalletModal] = useState(false);

    // Handle wallet connection
    useEffect(() => {
        if (connected && publicKey && currentStep === 1) {
            setWalletAddress(publicKey);
            setCurrentStep(2);
            setLoading(false); // Clear loading state after successful connection
        }
    }, [connected, publicKey, currentStep]);

    const handleConnectWallet = async () => {
        try {
            setLoading(true);
            setError('');

            // Find Leo Wallet
            const leoWallet = wallets?.find(w => w.adapter.name === 'Leo Wallet');
            if (!leoWallet) {
                setError('Leo Wallet not found. Please install Leo Wallet extension.');
                setLoading(false);
                return;
            }

            // IMPORTANT: Must select wallet BEFORE calling connect
            select(leoWallet.adapter.name as any);

            // Small delay to ensure selection is processed
            await new Promise(resolve => setTimeout(resolve, 100));

            // Now connect with the selected wallet
            await connect(DecryptPermission.UponRequest, WalletAdapterNetwork.Testnet);

        } catch (err) {
            setError('Failed to connect wallet. Please try again.');
            console.error('Wallet connection error:', err);
            setLoading(false);
        }
    };

    const handleAgeVerification = async () => {
        try {
            setLoading(true);
            setError('');

            const ageNum = parseInt(age);
            if (isNaN(ageNum) || ageNum < 18) {
                setError('You must be 18 or older to use Bliss.');
                return;
            }

            // Get the connected wallet adapter
            const wallet = wallets?.find(w => w.adapter.name === 'Leo Wallet');
            if (!wallet) {
                setError('Leo Wallet not found. Please install Leo Wallet extension.');
                return;
            }

            // Call Aleo contract for age verification
            const result = await aleoService.verifyAge(ageNum, {
                publicKey: walletAddress,
                requestTransaction: (wallet.adapter as any).requestTransaction?.bind(wallet.adapter)
            });

            if (!result.success) {
                setError(result.error || 'Age verification failed. Please try again.');
                return;
            }

            setVerificationTxId(result.transaction?.id || '');

            // Create user in Supabase after successful verification
            await createSupabaseProfile({
                wallet_address: walletAddress,
                created_at: new Date().toISOString(),
                onboarding_completed: false,
            });

            setCurrentStep(3);
        } catch (err: any) {
            console.error('Age verification error:', err);

            // Handle specific wallet errors
            const errorMessage = err?.message || String(err);

            if (errorMessage.includes('No records for fee')) {
                setError(
                    <span>
                        Wallet has balance but no spendable fee records. <br />
                        <b>Fix:</b> Open Leo Wallet, send <b>1 Aleo</b> to yourself, then try again.
                    </span> as any
                );
            } else {
                setError('Verification failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleProfileCreation = async () => {
        try {
            setLoading(true);
            setError('');

            if (!bio.trim()) {
                setError('Please add a short bio.');
                return;
            }

            const interestsArray = interests
                .split(',')
                .map(i => i.trim())
                .filter(i => i.length > 0);

            if (interestsArray.length === 0) {
                setError('Please add at least one interest.');
                return;
            }

            // Update profile in Supabase
            await updateProfile(walletAddress, {
                bio: bio.trim(),
                interests: interestsArray,
                onboarding_completed: true,
            });

            setCurrentStep(4);
        } catch (err) {
            setError('Failed to create profile. Please try again.');
            console.error('Profile creation error:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStepStatus = (step: Step): 'inactive' | 'active' | 'completed' => {
        if (step < currentStep) return 'completed';
        if (step === currentStep) return 'active';
        return 'inactive';
    };

    const shortenAddress = (address: string) => {
        if (!address) return '';
        return `${address.slice(0, 10)}...${address.slice(-8)}`;
    };

    return (
        <div className="min-h-screen bg-background text-foreground relative">
            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-card/10 border-b border-white/10">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                            <span className="font-headline text-primary text-lg italic">B</span>
                        </div>
                        <span className="font-headline text-xl italic">Bliss</span>
                    </div>

                    {currentStep === 1 && (
                        <Button
                            onClick={() => setShowWalletModal(true)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                            Connect Wallet
                        </Button>
                    )}

                    {currentStep > 1 && walletAddress && (
                        <div className="text-sm text-muted-foreground font-code">
                            {shortenAddress(walletAddress)}
                        </div>
                    )}
                </div>
            </nav>

            {/* Main Content */}
            <main className="pt-24 pb-16 px-6">
                <div className="container mx-auto max-w-5xl">
                    {/* Header */}
                    <div className="mb-12">
                        <h1 className="font-headline text-5xl md:text-6xl italic mb-3 text-left">
                            Welcome to Bliss
                        </h1>
                        <p className="text-lg text-muted-foreground text-left max-w-xl">
                            Privacy-first onboarding. Verify once, connect freely.
                        </p>
                    </div>

                    {/* Step Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
                        {/* Step 1 */}
                        <StepCard
                            number={1}
                            title="Connect Wallet"
                            icon={Wallet}
                            status={getStepStatus(1)}
                        />

                        {/* Step 2 */}
                        <StepCard
                            number={2}
                            title="Verify Age"
                            icon={Shield}
                            status={getStepStatus(2)}
                        />

                        {/* Step 3 */}
                        <StepCard
                            number={3}
                            title="Create Profile"
                            icon={User}
                            status={getStepStatus(3)}
                        />

                        {/* Step 4 */}
                        <StepCard
                            number={4}
                            title="You're Ready"
                            icon={Sparkles}
                            status={getStepStatus(4)}
                        />
                    </div>

                    {/* Active Step Content */}
                    <div className="backdrop-blur-xl bg-card/10 border border-white/10 rounded-2xl p-8 md:p-12">
                        {error && (
                            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                                {error}
                            </div>
                        )}

                        {/* Step 1: Connect Wallet */}
                        {currentStep === 1 && (
                            <div className="text-center space-y-6">
                                <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                                    <Wallet className="w-8 h-8 text-primary" />
                                </div>
                                <h2 className="font-headline text-3xl italic">Connect Your Aleo Wallet</h2>
                                <p className="text-muted-foreground max-w-md mx-auto">
                                    Connect your Leo Wallet to begin. No email, no passwords.
                                </p>
                                <Button
                                    onClick={() => setShowWalletModal(true)}
                                    size="lg"
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
                                >
                                    Connect Leo Wallet
                                </Button>
                            </div>
                        )}

                        {/* Step 2: Age Verification */}
                        {currentStep === 2 && (
                            <div className="space-y-6 max-w-md mx-auto">
                                <div className="text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                                        <Shield className="w-8 h-8 text-primary" />
                                    </div>
                                    <h2 className="font-headline text-3xl italic mb-2">Age Verification</h2>
                                    <p className="text-muted-foreground">
                                        Prove you're 18+ using zero-knowledge proof. Your age stays private.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="age" className="text-sm text-muted-foreground">
                                            Your Age
                                        </Label>
                                        <Input
                                            id="age"
                                            type="number"
                                            min="18"
                                            max="120"
                                            value={age}
                                            onChange={(e) => setAge(e.target.value)}
                                            placeholder="Enter your age"
                                            className="mt-1 bg-background/50 border-white/10"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            This will be verified on-chain but never stored or revealed.
                                        </p>
                                    </div>

                                    <Button
                                        onClick={handleAgeVerification}
                                        disabled={loading || !age}
                                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                                    >
                                        {loading ? 'Verifying...' : 'Verify Age'}
                                    </Button>

                                </div>
                            </div>
                        )}

                        {/* Step 3: Profile Creation */}
                        {currentStep === 3 && (
                            <div className="space-y-6 max-w-md mx-auto">
                                <div className="text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                                        <User className="w-8 h-8 text-primary" />
                                    </div>
                                    <h2 className="font-headline text-3xl italic mb-2">Create Your Profile</h2>
                                    <p className="text-muted-foreground">
                                        Tell us a bit about yourself. Keep it authentic.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="bio" className="text-sm text-muted-foreground">
                                            Bio
                                        </Label>
                                        <Textarea
                                            id="bio"
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            placeholder="A short bio about yourself..."
                                            maxLength={200}
                                            rows={4}
                                            className="mt-1 bg-background/50 border-white/10 resize-none"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {bio.length}/200 characters
                                        </p>
                                    </div>

                                    <div>
                                        <Label htmlFor="interests" className="text-sm text-muted-foreground">
                                            Interests
                                        </Label>
                                        <Input
                                            id="interests"
                                            value={interests}
                                            onChange={(e) => setInterests(e.target.value)}
                                            placeholder="Privacy, ZK proofs, tech, art..."
                                            className="mt-1 bg-background/50 border-white/10"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Separate with commas
                                        </p>
                                    </div>

                                    <Button
                                        onClick={handleProfileCreation}
                                        disabled={loading || !bio.trim() || !interests.trim()}
                                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                                    >
                                        {loading ? 'Creating Profile...' : 'Create Profile'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Profile Summary */}
                        {currentStep === 4 && (
                            <div className="space-y-6 max-w-md mx-auto text-center">
                                <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                                    <CheckCircle2 className="w-8 h-8 text-primary" />
                                </div>

                                <div>
                                    <h2 className="font-headline text-4xl italic mb-2">You're Verified</h2>
                                    <p className="text-muted-foreground">
                                        Welcome to Bliss. Your privacy-first profile is ready.
                                    </p>
                                </div>

                                <div className="backdrop-blur-xl bg-background/30 border border-white/10 rounded-xl p-6 text-left space-y-4">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Wallet Address</p>
                                        <p className="font-code text-sm">{shortenAddress(walletAddress)}</p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Bio</p>
                                        <p className="text-sm">{bio}</p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-muted-foreground mb-2">Interests</p>
                                        <div className="flex flex-wrap gap-2">
                                            {interests.split(',').map((interest, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-3 py-1 bg-primary/20 text-primary text-xs rounded-full"
                                                >
                                                    {interest.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <p className="text-sm text-muted-foreground italic">
                                        Wave 1 Complete. More features coming soon.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Wallet Selection Modal */}
            <WalletSelectionModal
                open={showWalletModal}
                onClose={() => setShowWalletModal(false)}
            />
        </div>
    );
}

// Step Card Component
interface StepCardProps {
    number: number;
    title: string;
    icon: React.ElementType;
    status: 'inactive' | 'active' | 'completed';
}

function StepCard({ number, title, icon: Icon, status }: StepCardProps) {
    return (
        <div
            className={`
        relative p-4 rounded-xl border transition-all duration-300
        ${status === 'completed'
                    ? 'bg-primary/10 border-primary/30'
                    : status === 'active'
                        ? 'bg-card/20 border-primary/50 backdrop-blur-xl'
                        : 'bg-card/5 border-white/5'
                }
      `}
        >
            <div className="flex items-center space-x-3">
                <div
                    className={`
            w-10 h-10 rounded-full flex items-center justify-center transition-all
            ${status === 'completed'
                            ? 'bg-primary/20'
                            : status === 'active'
                                ? 'bg-primary/30'
                                : 'bg-white/5'
                        }
          `}
                >
                    {status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                    ) : (
                        <Icon
                            className={`w-5 h-5 ${status === 'active' ? 'text-primary' : 'text-muted-foreground'
                                }`}
                        />
                    )}
                </div>
                <div className="flex-1">
                    <div className="text-xs text-muted-foreground">Step {number}</div>
                    <div
                        className={`text-sm font-medium ${status === 'active' ? 'text-foreground' : 'text-muted-foreground'
                            }`}
                    >
                        {title}
                    </div>
                </div>
            </div>
        </div>
    );
}
