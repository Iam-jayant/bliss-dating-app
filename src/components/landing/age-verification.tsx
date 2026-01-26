"use client";

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { ScramblingInput } from './scrambling-input';
import { VerificationAnimation } from './verification-animation';
import { Confetti } from './confetti';
import { ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

const formSchema = z.object({
  birthYear: z.preprocess(
    (val) => {
      // Convert empty string or undefined to undefined for validation
      if (val === '' || val === undefined || val === null) return undefined;
      // Convert string numbers to numbers
      if (typeof val === 'string') {
        const num = parseInt(val, 10);
        return isNaN(num) ? undefined : num;
      }
      return val;
    },
    z.number({ 
      required_error: 'Please enter your birth year.',
      invalid_type_error: 'Please enter a valid year.' 
    })
    .min(1900, 'Please enter a valid year.')
    .max(new Date().getFullYear(), 'Year cannot be in the future.')
    .refine(
      (year) => new Date().getFullYear() - year >= 18,
      'You must be at least 18 years old.'
    )
  ),
});

type VerificationStatus = 'idle' | 'verifying' | 'verified' | 'failed';

export function AgeVerification() {
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [showGreenFlash, setShowGreenFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      birthYear: undefined,
    },
    mode: 'onChange',
  });

  // Remove blur effect when verification is successful
  useEffect(() => {
    if (status === 'verified') {
      // Add a class to body to remove blur effect
      document.body.classList.add('verification-success');
    } else {
      document.body.classList.remove('verification-success');
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('verification-success');
    };
  }, [status]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setError(null);
      setStatus('verifying');
      
      // Simulate ZK-proof verification (back to simulation mode)
      await new Promise((resolve) => setTimeout(resolve, 2500));
      
      setStatus('verified');
      setShowGreenFlash(true);
      setTimeout(() => setShowGreenFlash(false), 150);
      
      // Privacy preservation: Clear sensitive input data immediately after processing
      setTimeout(() => {
        form.reset();
        // Clear any cached form values
        form.setValue('birthYear', 0);
      }, 100);
      
    } catch (error) {
      console.error('Age verification error:', error);
      setStatus('failed');
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  }

  return (
    <div className="relative flex w-full flex-col items-center justify-center rounded-2xl border bg-card/50 p-4 md:p-6 shadow-lg backdrop-blur-sm">
      {showGreenFlash && (
        <div className="pointer-events-none absolute inset-0 z-50 bg-green-400/30" />
      )}
      {status === 'verified' && <Confetti />}

      {status === 'verifying' && <VerificationAnimation />}

      {status === 'idle' && (
        <>
          <h2 className="text-base md:text-lg font-medium">ZK Age Verification Demo</h2>
          <p className="mt-1 text-xs md:text-sm text-muted-foreground text-center px-2">
            Experience zero-knowledge proof generation (demo only)
          </p>
          {error && (
            <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-3 md:mt-4 flex w-full items-start space-x-2"
            >
              <FormField
                control={form.control}
                name="birthYear"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormControl>
                      <ScramblingInput 
                        onValueChange={(value) => field.onChange(value)}
                        value={field.value}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="lg" className="h-14 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-300 px-4 md:px-6 text-sm md:text-base">
                Generate
              </Button>
            </form>
          </Form>
        </>
      )}

      {status === 'failed' && (
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldCheck className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-lg font-medium">Verification Failed</h2>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button 
            onClick={() => {
              setStatus('idle');
              setError(null);
              form.reset();
            }}
            variant="outline"
          >
            Try Again
          </Button>
        </div>
      )}

      {status === 'verified' && (
        <div className="flex flex-col items-center text-center space-y-3 md:space-y-4">
          <ShieldCheck className="h-10 w-10 md:h-12 md:w-12 text-green-500" />
          <h2 className="text-lg md:text-xl font-semibold">ZK Proof Generated!</h2>
          <p className="text-muted-foreground text-xs md:text-sm px-2">
            Demo complete. Your privacy would be protected in the real app.
          </p>
          
          {/* Try Bliss Button */}
          <div className="pt-1 md:pt-2 verification-success-enter">
            <Button
              asChild
              className="enter-bliss-button group relative overflow-hidden text-primary-foreground px-3 py-2 md:px-4 md:py-2 text-xs md:text-sm font-semibold border-0 h-auto"
            >
              <a href="/app">
                <Sparkles className="w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2 transition-transform group-hover:rotate-12" />
                Try Bliss
                <ArrowRight className="w-3 h-3 md:w-4 md:h-4 ml-1.5 md:ml-2 transition-transform group-hover:translate-x-1" />
              </a>
            </Button>
            <p className="mt-1.5 md:mt-2 text-xs text-muted-foreground px-2">
              This is a demonstration of zero-knowledge proof generation
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
