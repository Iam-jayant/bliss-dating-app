"use client";

import { useState } from 'react';
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
import { ShieldCheck } from 'lucide-react';

const formSchema = z.object({
  birthYear: z.coerce
    .number({ invalid_type_error: 'Please enter a valid year.' })
    .min(1900, 'Please enter a valid year.')
    .max(new Date().getFullYear(), 'Year cannot be in the future.')
    .refine(
      (year) => new Date().getFullYear() - year >= 18,
      'You must be at least 18 years old.'
    ),
});

type VerificationStatus = 'idle' | 'verifying' | 'verified' | 'failed';

export function AgeVerification() {
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [showGreenFlash, setShowGreenFlash] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      birthYear: undefined,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setStatus('verifying');
    // Simulate ZK-proof verification
    await new Promise((resolve) => setTimeout(resolve, 2500));
    setStatus('verified');
    setShowGreenFlash(true);
    setTimeout(() => setShowGreenFlash(false), 150);
  }

  return (
    <div className="relative flex w-full flex-col items-center justify-center rounded-2xl border bg-card/50 p-8 shadow-lg backdrop-blur-sm">
      {showGreenFlash && (
        <div className="pointer-events-none absolute inset-0 z-50 bg-green-400/30" />
      )}
      {status === 'verified' && <Confetti />}

      {status === 'verifying' && <VerificationAnimation />}

      {status === 'idle' && (
        <>
          <h2 className="text-lg font-medium">Verify Your Age</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your birth year to confirm you are 18 or older.
          </p>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-6 flex w-full items-start space-x-2"
            >
              <FormField
                control={form.control}
                name="birthYear"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormControl>
                      <ScramblingInput {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="lg" className="h-14">
                Verify
              </Button>
            </form>
          </Form>
        </>
      )}

      {status === 'verified' && (
        <div className="flex flex-col items-center text-center">
          <ShieldCheck className="h-16 w-16 text-green-500" />
          <h2 className="mt-4 text-2xl font-semibold">Verification Successful</h2>
          <p className="mt-2 text-muted-foreground">
            Welcome! Your privacy is protected.
          </p>
        </div>
      )}
    </div>
  );
}
