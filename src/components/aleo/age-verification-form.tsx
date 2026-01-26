'use client';

import React, { useState } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, CheckCircle, XCircle } from 'lucide-react';
import { aleoService } from '@/lib/aleo/service';
import type { VerificationRecord } from '@/lib/aleo/types';

interface AgeVerificationFormProps {
  onVerificationComplete?: (record: VerificationRecord) => void;
  className?: string;
}

export function AgeVerificationForm({ 
  onVerificationComplete,
  className = '' 
}: AgeVerificationFormProps) {
  const { connected, publicKey, requestTransaction } = useWallet();
  const [age, setAge] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    record?: VerificationRecord;
    error?: string;
  } | null>(null);

  const handleVerifyAge = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!connected || !publicKey) {
      setVerificationResult({
        success: false,
        error: 'Please connect your wallet first'
      });
      return;
    }

    const ageNumber = parseInt(age);
    if (isNaN(ageNumber) || ageNumber < 1 || ageNumber > 150) {
      setVerificationResult({
        success: false,
        error: 'Please enter a valid age between 1 and 150'
      });
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const result = await aleoService.verifyAge(ageNumber, { 
        publicKey, 
        requestTransaction 
      });
      setVerificationResult(result);

      if (result.success && result.record && onVerificationComplete) {
        onVerificationComplete(result.record);
      }

      // Clear age input for privacy
      setAge('');

    } catch (error) {
      setVerificationResult({
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const resetForm = () => {
    setAge('');
    setVerificationResult(null);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Zero-Knowledge Age Verification
        </CardTitle>
        <CardDescription>
          Prove you're 18+ without revealing your actual age. Your age is processed privately using zero-knowledge proofs.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!connected && (
          <Alert>
            <AlertDescription>
              Please connect your Aleo wallet to proceed with age verification.
            </AlertDescription>
          </Alert>
        )}

        {connected && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Connected: {publicKey?.slice(0, 8)}...{publicKey?.slice(-4)}
            </div>

            <form onSubmit={handleVerifyAge} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="age">Your Age</Label>
                <Input
                  id="age"
                  type="number"
                  min="1"
                  max="150"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Enter your age"
                  disabled={isVerifying}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Your age will be processed privately and not stored anywhere.
                </p>
              </div>

              <Button 
                type="submit" 
                disabled={!age || isVerifying}
                className="w-full"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying Age...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Verify Age (18+)
                  </>
                )}
              </Button>
            </form>

            {verificationResult && (
              <Alert className={verificationResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <div className="flex items-center gap-2">
                  {verificationResult.success ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <AlertDescription className={verificationResult.success ? 'text-green-800' : 'text-red-800'}>
                    {verificationResult.success ? (
                      <>
                        <strong>Verification Successful!</strong>
                        <br />
                        You have been verified as an adult. Your private credential has been issued.
                      </>
                    ) : (
                      <>
                        <strong>Verification Failed</strong>
                        <br />
                        {verificationResult.error}
                      </>
                    )}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            {verificationResult && (
              <Button 
                variant="outline" 
                onClick={resetForm}
                className="w-full"
              >
                Verify Another Age
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}