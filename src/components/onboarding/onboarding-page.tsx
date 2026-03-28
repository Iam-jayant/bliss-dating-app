'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { aleoService } from '@/lib/aleo/service';
import { getProfile } from '@/lib/storage/profile';
import { BLISS_V3_KEYS } from '@/lib/storage/schema';
import { CheckCircle2, Wallet, Shield, User, Sparkles, Loader2 } from 'lucide-react';
import { WalletSelectionModal } from './wallet-selection-modal';
import { ProfileForm } from './profile-form';
import Image from 'next/image';

interface OnboardingPageProps {
    onComplete?: () => void;
}

type Step = 1 | 2 | 3 | 4;
type VerificationPhase = 'idle' | 'submitting' | 'confirming' | 'record' | 'possession';
type AgeVerificationState = 'required' | 'running' | 'succeeded' | 'failed';

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
    const {
        connected,
        address: publicKey,
        executeTransaction,
        transactionStatus,
        requestRecords,
    } = useWallet();
    const router = useRouter();

    // State management
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [walletAddress, setWalletAddress] = useState<string>('');
    const [age, setAge] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [verificationPhase, setVerificationPhase] = useState<VerificationPhase>('idle');
    const [ageVerificationState, setAgeVerificationState] = useState<AgeVerificationState>('required');

    // Handle wallet connection and check for existing profile
    useEffect(() => {
        async function checkProfile() {
            if (connected && publicKey) {
                setWalletAddress(publicKey);
                let hasVerifiedAge = false;
                
                // Check if profile already exists (regardless of current step)
                try {
                    const { hashWalletAddress } = await import('@/lib/wallet-hash');
                    const walletHash = await hashWalletAddress(publicKey);
                    const verificationRaw = localStorage.getItem(`${BLISS_V3_KEYS.ageVerificationPrefix}${walletHash}`);
                    if (verificationRaw) {
                        const verificationCache = JSON.parse(verificationRaw) as { verified?: boolean; owner?: string };
                        hasVerifiedAge = verificationCache?.verified === true && verificationCache?.owner === publicKey;
                    }

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
                    setAgeVerificationState(hasVerifiedAge ? 'succeeded' : 'required');
                    setCurrentStep(hasVerifiedAge ? 3 : 2);
                } else if (hasVerifiedAge) {
                    setAgeVerificationState('succeeded');
                }
            }
        }
        
        checkProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connected, publicKey]);

    const handleAgeVerification = async () => {
        if (ageVerificationState === 'running') return;

        const ageNum = parseInt(age, 10);
        if (isNaN(ageNum) || ageNum < 18) {
            setError('You must be 18 or older to use Bliss.');
            return;
        }

        if (!connected || !walletAddress) {
            setError('Wallet not connected. Please connect your wallet first.');
            return;
        }

        // Move forward immediately; keep proving in the background.
        if (currentStep < 3) {
            setCurrentStep(3);
        }

        try {
            setLoading(true);
            setError('');
            setAgeVerificationState('running');
            setVerificationPhase('submitting');

            const result = await aleoService.verifyAge(ageNum, {
                publicKey: walletAddress,
                requestTransaction: executeTransaction,
                transactionStatus,
                requestRecords,
            }, (progress) => {
                if (progress === 'submitting-transaction') {
                    setVerificationPhase('submitting');
                    return;
                }
                if (progress === 'waiting-for-confirmation') {
                    setVerificationPhase('confirming');
                    return;
                }
                if (progress === 'waiting-for-record') {
                    setVerificationPhase('record');
                    return;
                }
                if (progress === 'completed') {
                    setVerificationPhase('possession');
                }
            });

            if (!result.success) {
                throw new Error(result.error || 'Age verification failed. Please try again.');
            }

            if (!result.record) {
                throw new Error('Verification succeeded but no verification record was returned.');
            }

            let possessionTxId: string | null = null;
            const shouldAttemptPossession = result.recordSource !== 'optimistic';
            if (shouldAttemptPossession) {
                try {
                    setVerificationPhase('possession');
                    const possession = await aleoService.proveVerificationRecord(result.record, {
                        publicKey: walletAddress,
                        requestTransaction: executeTransaction,
                        transactionStatus,
                        requestRecords,
                    });

                    if (possession.success && possession.verified) {
                        possessionTxId = possession.transaction?.id || null;
                    } else {
                        console.warn('Possession check did not complete, continuing with verified credential fallback:', possession.error);
                    }
                } catch (possessionError) {
                    console.warn('Possession check failed, continuing with verified credential fallback:', possessionError);
                }
            } else {
                console.info('Skipping possession check because wallet verification record was not discoverable yet.');
            }

            const { hashWalletAddress } = await import('@/lib/wallet-hash');
            const walletHash = await hashWalletAddress(walletAddress);
            localStorage.setItem(
                `${BLISS_V3_KEYS.ageVerificationPrefix}${walletHash}`,
                JSON.stringify({
                    verified: true,
                    verifiedAt: Date.now(),
                    verifyTxId: result.transaction?.id || null,
                    possessionTxId,
                    owner: result.record.owner,
                }),
            );

            setAgeVerificationState('succeeded');
        } catch (err: any) {
            console.error('Age verification error:', err);
            setAgeVerificationState('failed');

            const errorMessage = err?.message || String(err);
            if (errorMessage.includes('No records for fee')) {
                setError(
                    <span>
                        Wallet has balance but no spendable fee records. <br />
                        <b>Fix:</b> Open Leo Wallet, send <b>1 Aleo</b> to yourself, then try again.
                    </span> as any
                );
            } else if (/\/verify_age.*expects \d+ inputs?/i.test(errorMessage)) {
                setError(errorMessage);
            } else if (
                /wallet rejected|request rejected|user rejected|denied|cancelled|canceled|rejected by the wallet before an on-chain id was issued/i.test(errorMessage)
            ) {
                setError('Wallet rejected the request. Re-open the wallet popup, approve the transaction, and retry verification.');
            } else {
                setError(errorMessage || 'Verification failed. Please try again.');
            }
        } finally {
            setLoading(false);
            setVerificationPhase('idle');
        }
    };

    const phaseLabel = (() => {
        if (verificationPhase === 'submitting') return 'Preparing private zk transaction...';
        if (verificationPhase === 'confirming') return 'Waiting for chain confirmation...';
        if (verificationPhase === 'record') return 'Generating your verification proof record...';
        if (verificationPhase === 'possession') return 'Finalizing proof possession check...';
        return 'Verifying...';
    })();

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
                                    Connect your Aleo wallet to begin. No email, no passwords.
                                </p>
                                <Button
                                    onClick={() => setShowWalletModal(true)}
                                    size="lg"
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-7 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                                >
                                    Connect Wallet
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
                                            onChange={(e) => {
                                                setAge(e.target.value);
                                                if (ageVerificationState === 'failed') {
                                                    setAgeVerificationState('required');
                                                }
                                            }}
                                            placeholder="Enter your age"
                                            className="bg-background/50 border-border text-base py-6"
                                        />
                                        <p className="text-xs text-muted-foreground mt-2">
                                            This will be verified on-chain but never stored or revealed.
                                        </p>
                                    </div>

                                    <Button
                                        onClick={handleAgeVerification}
                                        disabled={loading || !age || ageVerificationState === 'running'}
                                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-7 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                                    >
                                        {loading ? 'Starting verification...' : 'Verify In Background & Continue'}
                                    </Button>

                                    {loading && (
                                        <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
                                            <div className="flex items-center gap-3 text-sm text-primary font-medium">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>{phaseLabel}</span>
                                            </div>
                                            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-primary/20">
                                                <div className="h-full w-1/3 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
                                            </div>
                                        </div>
                                    )}

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

                                <div className="mb-8 rounded-xl border border-border/60 bg-background/40 p-4">
                                    {ageVerificationState === 'running' && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 text-sm text-primary font-medium">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>{phaseLabel}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Age proof is generating in the background. You can fill your profile now.
                                            </p>
                                        </div>
                                    )}
                                    {ageVerificationState === 'succeeded' && (
                                        <div className="flex items-center gap-3 text-sm text-green-600 font-medium">
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span>Age verification completed. You can submit your profile.</span>
                                        </div>
                                    )}
                                    {ageVerificationState === 'failed' && (
                                        <div className="space-y-3">
                                            <p className="text-sm text-destructive font-medium">
                                                Age verification failed. Please retry to unlock profile submission.
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setCurrentStep(2)}
                                                >
                                                    Edit Age
                                                </Button>
                                                <Button
                                                    type="button"
                                                    onClick={handleAgeVerification}
                                                    disabled={loading || !age}
                                                >
                                                    {loading ? 'Retrying...' : 'Retry Verification'}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                    {ageVerificationState === 'required' && (
                                        <div className="space-y-3">
                                            <p className="text-sm text-muted-foreground">
                                                Age verification is required before profile submission.
                                            </p>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setCurrentStep(2)}
                                            >
                                                Go To Age Verification
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                <ProfileForm
                                    walletAddress={walletAddress}
                                    onSuccess={() => setCurrentStep(4)}
                                    canSubmit={ageVerificationState === 'succeeded'}
                                    submitDisabledReason={
                                        ageVerificationState === 'running'
                                            ? 'Waiting for age verification to complete...'
                                            : ageVerificationState === 'failed'
                                                ? 'Retry age verification first'
                                                : 'Age verification required'
                                    }
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
