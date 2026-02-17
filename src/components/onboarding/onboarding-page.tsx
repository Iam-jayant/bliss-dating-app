'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletMultiButton } from '@demox-labs/aleo-wallet-adapter-reactui';
import { DecryptPermission, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { aleoService } from '@/lib/aleo/service';
import { createSupabaseProfile, getProfile } from '@/lib/storage/profile';
import { CheckCircle2, Wallet, Shield, User, Sparkles } from 'lucide-react';
import { WalletSelectionModal } from './wallet-selection-modal';
import { ProfileForm } from './profile-form';
import Image from 'next/image';

interface OnboardingPageProps {
    onComplete?: () => void;
}

type Step = 1 | 2 | 3 | 4;

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
    const { connected, publicKey, connect, wallets, select } = useWallet();
    const router = useRouter();

    // State management
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [walletAddress, setWalletAddress] = useState<string>('');
    const [age, setAge] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [showWalletModal, setShowWalletModal] = useState(false);

    // Handle wallet connection and check for existing profile
    useEffect(() => {
        async function checkProfile() {
            if (connected && publicKey) {
                setWalletAddress(publicKey);
                
                // Check if profile already exists (regardless of current step)
                try {
                    const existingProfile = await getProfile(publicKey);
                    if (existingProfile) {
                        // Profile exists, redirect to discovery immediately
                        console.log('✅ Profile exists, redirecting to discovery');
                        router.push('/discovery');
                        return;
                    }
                } catch (err) {
                    console.error('Error checking profile:', err);
                }
                
                // No profile exists - continue with onboarding
                if (currentStep === 1) {
                    setLoading(false);
                    setCurrentStep(2);
                }
            }
        }
        
        checkProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connected, publicKey]);

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

            // Create user in Supabase after successful verification (legacy compatibility)
            await createSupabaseProfile(walletAddress, {
                created_at: new Date().toISOString(),
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

    const getStepStatus = (step: Step): 'inactive' | 'active' | 'completed' => {
        if (step < currentStep) return 'completed';
        if (step === currentStep) return 'active';
        return 'inactive';
    };

    return (
        <div className="min-h-screen bg-background text-foreground relative">
            {/* Background gradient with blur decorations (matching hero) */}
            <div className="fixed inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10 -z-10" />
            <div className="fixed inset-0 opacity-20 -z-10">
                <div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full blur-3xl" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent rounded-full blur-3xl" />
            </div>

            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-card/30 border-b border-border/50">
                <div className="container mx-auto px-6 md:px-10 lg:px-16 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                        <div className="w-10 h-10 relative flex items-center -mr-1">
                            <Image
                                src="/bliss-logo.png"
                                alt="Bliss"
                                width={40}
                                height={40}
                                className="object-contain"
                            />
                        </div>
                        <span className="font-headline text-xl">Bliss</span>
                    </div>

                    {currentStep === 1 && (
                        <Button
                            onClick={() => setShowWalletModal(true)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6 py-2 font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                        >
                            Connect Wallet
                        </Button>
                    )}
                </div>
            </nav>

            {/* Main Content */}
            <main className="pt-32 pb-20 px-6 md:px-10 lg:px-16">
                <div className="container mx-auto max-w-6xl">
                    {/* Header */}
                    <div className="mb-12 text-center lg:text-left">
                        <h1 className="font-headline text-5xl md:text-6xl lg:text-7xl italic mb-4 leading-tight">
                            Welcome to <span className="text-primary">Bliss</span>
                        </h1>
                        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed">
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
                    <div className="backdrop-blur-md bg-card/50 border border-border/50 rounded-2xl p-8 md:p-12 shadow-xl">
                        {error && (
                            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                                {error}
                            </div>
                        )}

                        {/* Step 1: Connect Wallet */}
                        {currentStep === 1 && (
                            <div className="text-center space-y-8 py-8">
                                <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                                    <Wallet className="w-10 h-10 text-primary" />
                                </div>
                                <h2 className="font-headline text-3xl md:text-4xl italic">Connect Your Aleo Wallet</h2>
                                <p className="text-muted-foreground max-w-md mx-auto text-lg">
                                    Connect your Leo Wallet to begin. No email, no passwords.
                                </p>
                                <Button
                                    onClick={() => setShowWalletModal(true)}
                                    size="lg"
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-7 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                                >
                                    Connect Leo Wallet
                                </Button>
                            </div>
                        )}

                        {/* Step 2: Age Verification */}
                        {currentStep === 2 && (
                            <div className="space-y-8 max-w-md mx-auto py-8">
                                <div className="text-center">
                                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Shield className="w-10 h-10 text-primary" />
                                    </div>
                                    <h2 className="font-headline text-3xl md:text-4xl italic mb-3">Age Verification</h2>
                                    <p className="text-muted-foreground text-lg">
                                        Prove you're 18+ using zero-knowledge proof. Your age stays private.
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <Label htmlFor="age" className="text-sm font-medium text-foreground mb-2 block">
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
                                            className="bg-background/50 border-border text-base py-6"
                                        />
                                        <p className="text-xs text-muted-foreground mt-2">
                                            This will be verified on-chain but never stored or revealed.
                                        </p>
                                    </div>

                                    <Button
                                        onClick={handleAgeVerification}
                                        disabled={loading || !age}
                                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-7 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                                    >
                                        {loading ? 'Verifying...' : 'Verify Age'}
                                    </Button>

                                </div>
                            </div>
                        )}

                        {/* Step 3: Profile Creation */}
                        {currentStep === 3 && (
                            <div className="py-4">
                                <div className="text-center mb-8">
                                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                                        <User className="w-10 h-10 text-primary" />
                                    </div>
                                    <h2 className="font-headline text-3xl md:text-4xl italic mb-3">Create Your Profile</h2>
                                    <p className="text-muted-foreground text-lg">
                                        Tell us about yourself. Keep it authentic.
                                    </p>
                                </div>

                                <ProfileForm
                                    walletAddress={walletAddress}
                                    onSuccess={() => setCurrentStep(4)}
                                />
                            </div>
                        )}

                        {/* Step 4: Profile Summary */}
                        {currentStep === 4 && (
                            <div className="space-y-8 max-w-md mx-auto text-center py-8">
                                <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                                    <CheckCircle2 className="w-10 h-10 text-primary" />
                                </div>

                                <div>
                                    <h2 className="font-headline text-4xl md:text-5xl italic mb-4">You're All Set!</h2>
                                    <p className="text-muted-foreground text-lg">
                                        Welcome to Bliss. Your privacy-first profile is ready.
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <Button
                                        onClick={() => router.push('/discovery')}
                                        size="lg"
                                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-7 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                                    >
                                        Start Discovering
                                    </Button>

                                    <Button
                                        onClick={() => router.push('/profile')}
                                        size="lg"
                                        variant="outline"
                                        className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground px-10 py-7 rounded-full font-semibold transition-all hover:scale-105"
                                    >
                                        View My Profile
                                    </Button>
                                </div>

                                <div className="pt-4">
                                    <p className="text-sm text-muted-foreground">
                                        ✨ Swipe to find your match!
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
        relative p-5 rounded-xl border transition-all duration-300
        ${status === 'completed'
                    ? 'bg-primary/10 border-primary/30 shadow-lg'
                    : status === 'active'
                        ? 'bg-card/30 border-primary/50 backdrop-blur-md shadow-xl scale-105'
                        : 'bg-card/10 border-border/30'
                }
      `}
        >
            <div className="flex items-center space-x-3">
                <div
                    className={`
            w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md
            ${status === 'completed'
                            ? 'bg-primary/20'
                            : status === 'active'
                                ? 'bg-primary/30'
                                : 'bg-card/20'
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
